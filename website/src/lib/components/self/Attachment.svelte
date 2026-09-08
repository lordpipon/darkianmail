<script lang="ts">
	import { X } from 'lucide-svelte';
	import { Input } from '$lib/components/ui/input';
	import ImagePreview from './ImagePreview.svelte';
	import FileAttachment from './FileAttachment.svelte';
	import {
		MAX_FILES,
		ALLOWED_TYPES,
		IMAGE_TYPES,
		type AllowedType,
		type ImageType
	} from '$lib/types/attachment';
	import { nanoid } from 'nanoid';
	import { toast } from 'svelte-sonner';

	const MAX_SIZE = 25 * 1024 * 1024; // 25MB

	type FileUpload = {
		id: string;
		file: File;
		progress: number;
		status: 'pending' | 'uploading' | 'complete' | 'error';
		s3Key?: string;
		error?: string;
	};

	let fileInputElement: HTMLInputElement | null = $state(null);

	let { onFilesChange } = $props<{
		onFilesChange: (
			files: Array<{ id: string; filename: string; size: number; type: string }>
		) => void;
	}>();

	let uploads = $state<FileUpload[]>([]);

	$effect(() => {
		onFilesChange(
			uploads.map((u) => ({
				id: u.id,
				filename: u.file.name,
				size: u.file.size,
				type: u.file.type
			}))
		);
	});

	export function openFileSelect() {
		fileInputElement?.click();
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files?.length) return;

		const currentFiles = uploads.map((u) => u.file);
		const availableSlots = MAX_FILES - uploads.length;
		if (availableSlots <= 0) return;

		const newFiles = Array.from(input.files)
			.filter((file) => {
				if (!ALLOWED_TYPES.includes(file.type as AllowedType)) {
					toast(`File type ${file.type} not allowed`);
					return false;
				}
				if (file.size > MAX_SIZE) {
					toast(`File ${file.name} exceeds 25MB limit`);
					return false;
				}
				if (currentFiles.some((f) => f.name === file.name && f.size === file.size)) {
					toast(`File ${file.name} already added.`);
					return false;
				}
				return true;
			})
			.slice(0, availableSlots);

		const newUploads: FileUpload[] = newFiles.map((file) => ({
			id: nanoid(),
			file,
			progress: 0,
			status: 'pending' as const
		}));

		uploads = [...uploads, ...newUploads];
		input.value = '';
	}

	async function performUpload(
		upload: FileUpload
	): Promise<{ key: string; filename: string; size: number; type: string }> {
		const uploadIndex = uploads.findIndex((u) => u.id === upload.id);
		if (uploadIndex === -1) throw new Error('Upload not found');

		try {
			uploads[uploadIndex].status = 'uploading';
			uploads[uploadIndex].progress = 0;

			const response = await fetch('/api/attachment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					filename: upload.file.name,
					size: upload.file.size,
					type: upload.file.type
				})
			});

			if (!response.ok) throw new Error('Failed to get upload URL');

			const { uploadUrl, key } = await response.json();

			await new Promise((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.upload.onprogress = (event) => {
					if (event.lengthComputable) {
						uploads[uploadIndex].progress = (event.loaded / event.total) * 100;
					}
				};
				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
					else reject(new Error(`Upload failed with status ${xhr.status}`));
				};
				xhr.onerror = () => reject(new Error('Network error during upload'));
				xhr.open('PUT', uploadUrl);
				xhr.setRequestHeader('Content-Type', upload.file.type);
				xhr.send(upload.file);
			});

			uploads[uploadIndex].status = 'complete';
			uploads[uploadIndex].s3Key = key;
			uploads[uploadIndex].progress = 100;

			return { key, filename: upload.file.name, size: upload.file.size, type: upload.file.type };
		} catch (error) {
			console.error('Upload error:', error);
			uploads[uploadIndex].status = 'error';
			uploads[uploadIndex].error = error instanceof Error ? error.message : 'Upload failed';
			throw error;
		}
	}

	export async function uploadAllFiles(): Promise<
		Array<{ key: string; filename: string; size: number; type: string }>
	> {
		const pendingUploads = uploads.filter((u) => u.status === 'pending');
		const uploadPromises = pendingUploads.map((upload) => performUpload(upload));

		const results = await Promise.allSettled(uploadPromises);

		const successfulUploads: Array<{ key: string; filename: string; size: number; type: string }> =
			[];
		let hasErrors = false;

		results.forEach((result, index) => {
			if (result.status === 'fulfilled') {
				successfulUploads.push(result.value);
			} else {
				hasErrors = true;
				console.error(`Failed to upload ${pendingUploads[index].file.name}:`, result.reason);
			}
		});

		if (hasErrors) {
			throw new Error('One or more files failed to upload.');
		}

		return successfulUploads;
	}

	function removeUpload(id: string) {
		uploads = uploads.filter((u) => u.id !== id);
	}

	function isImageFile(file: File): boolean {
		return IMAGE_TYPES.includes(file.type as ImageType);
	}

	let imageUploads = $derived(uploads.filter((u) => isImageFile(u.file)));
	let fileUploads = $derived(uploads.filter((u) => !isImageFile(u.file)));
</script>

{#if uploads.length > 0}
	<div class="flex flex-col gap-3">
		<Input
			bind:ref={fileInputElement}
			type="file"
			class="hidden"
			multiple
			accept={ALLOWED_TYPES.join(',')}
			onchange={handleFileSelect}
		/>

		<div class="space-y-3">
			{#if imageUploads.length > 0}
				<div class="grid grid-cols-[repeat(auto-fill,160px)] gap-3">
					{#each imageUploads as upload (upload.id)}
						<div class="relative aspect-square h-[160px]">
							<ImagePreview file={upload.file} />
							{#if upload.status === 'uploading' || upload.status === 'error'}
								<div
									class="absolute inset-0 flex items-center justify-center rounded-lg {upload.status ===
									'error'
										? 'bg-destructive/70'
										: 'bg-popover/30'} backdrop-blur-[1px]"
								>
									{#if upload.status === 'uploading'}
										<div class="text-primary-foreground text-xs font-medium">
											{Math.round(upload.progress)}%
										</div>
									{:else if upload.status === 'error'}
										<div class="text-primary-foreground p-2 text-center text-xs font-medium">
											Upload Failed
										</div>
									{/if}
								</div>
							{/if}
							{#if upload.status !== 'uploading'}
								<button
									type="button"
									class="bg-popover/50 text-primary-foreground hover:bg-popover/70 absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full backdrop-blur-sm transition-colors"
									onclick={() => removeUpload(upload.id)}
									aria-label="Remove attachment"
								>
									<X class="h-3 w-3" />
								</button>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			{#if fileUploads.length > 0}
				<div class="flex gap-2">
					{#each fileUploads as upload (upload.id)}
						<FileAttachment
							filename={upload.file.name}
							filesize={upload.file.size}
							progress={upload.progress}
							status={upload.status}
							showRemove={upload.status !== 'uploading'}
							onRemove={() => removeUpload(upload.id)}
						/>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{:else}
	<Input
		bind:ref={fileInputElement}
		type="file"
		class="hidden"
		multiple
		accept={ALLOWED_TYPES.join(',')}
		onchange={handleFileSelect}
	/>
{/if}
