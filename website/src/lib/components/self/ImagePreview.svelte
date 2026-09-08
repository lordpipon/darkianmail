<script lang="ts">
	import { Download } from 'lucide-svelte';
	import { Badge } from '../ui/badge';
	import ImageViewer from './ImageViewer.svelte';
	import { downloadFile, getDominantColor } from '$lib/utils';

	let {
		file = null,
		url = null,
		filename = '',
		filesize = 0
	} = $props<{
		file?: File | null;
		url?: string | null;
		filename?: string;
		filesize?: number;
	}>();

	let isLoading = $state(true);
	let previewUrl = $state('');
	let dominantColor = $state('rgb(0, 0, 0)');
	let imgRef: HTMLImageElement | null = $state(null);
	let isDialogOpen = $state(false);

	function formatFileSize(bytes: number) {
		const units = ['B', 'KB', 'MB', 'GB'];
		let size = bytes;
		let unit = 0;
		while (size >= 1024 && unit < units.length - 1) {
			size /= 1024;
			unit++;
		}
		return `${size.toFixed(1)} ${units[unit]}`;
	}

	function getFileType(filename: string): string {
		const ext = filename.split('.').pop()?.toUpperCase() || '';
		if (ext === 'JPEG') return 'JPG';
		return ext;
	}

	function getDisplayName(filename: string): string {
		return filename.replace(/\.[^/.]+$/, '');
	}

	async function updateDominantColor() {
		if (imgRef) {
			dominantColor = await getDominantColor(imgRef);
		}
	}

	$effect(() => {
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				previewUrl = reader.result as string;
				isLoading = false;
			};
			reader.readAsDataURL(file);
			filename = file.name;
			filesize = file.size;
			return () => {
				if (previewUrl) URL.revokeObjectURL(previewUrl);
			};
		} else if (url) {
			previewUrl = url;
		}
	});
	let isDisplayState = $derived(!!url);
</script>

<div class="group relative">
	<button
		type="button"
		class="block w-full text-left"
		onclick={(e) => {
			e.preventDefault();
			isDialogOpen = true;
		}}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				isDialogOpen = true;
			}
		}}
		aria-label={`View ${filename || 'image'}`}
	>
		<div
			class="relative block aspect-square w-full overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-lg"
			style="background-color: {dominantColor};"
		>
			{#if previewUrl}
				<img
					bind:this={imgRef}
					src={previewUrl}
					alt={filename}
					onload={() => {
						isLoading = false;
						updateDominantColor();
					}}
					class="absolute inset-0 h-full w-full rounded-xl object-contain transition-[filter] duration-500"
					class:blur-xl={isLoading}
					crossorigin="anonymous"
				/>
			{/if}

			<div
				class="
                absolute inset-x-0 bottom-0 transition-transform
                duration-200
            "
			>
				<div class="overflow-hidden rounded-xl">
					<div class="ios-gradient pb-3 pt-24 transition-colors">
						<div class="text-primary-foreground space-y-1 px-3">
							<div class="line-clamp-1 break-all text-[13px] font-medium">
								{filename ? getDisplayName(filename) : 'Image'}
							</div>
							<div class="flex items-center justify-between">
								<div class="text-[11px] opacity-75">
									{formatFileSize(filesize)}
								</div>
								<Badge
									class="bg-background/20 hover:bg-background/30 px-1 py-0.5 text-[10px] font-medium backdrop-blur-[2px]"
								>
									{filename ? getFileType(filename) : ''}
								</Badge>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</button>

	{#if isDisplayState}
		<div
			class="absolute right-2 top-2 z-10 translate-y-[-1rem] opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
		>
			<button
				type="button"
				class="bg-popover/50 text-primary-foreground hover:bg-popover/70 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors"
				onclick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					downloadFile(url || previewUrl, filename || 'image');
				}}
				aria-label={`Download ${filename || 'image'}`}
			>
				<Download class="h-4 w-4" />
			</button>
		</div>
	{/if}

	<ImageViewer
		url={url || previewUrl}
		{previewUrl}
		{dominantColor}
		{filename}
		bind:open={isDialogOpen}
	/>
</div>

<style>
	.ios-gradient {
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.9) 0%,
			rgba(0, 0, 0, 0.7) 30%,
			rgba(0, 0, 0, 0.4) 60%,
			rgba(0, 0, 0, 0) 100%
		);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border-radius: inherit;
		mask-image: linear-gradient(to top, black 0%, black 40%, transparent 100%);
		-webkit-mask-image: linear-gradient(to top, black 0%, black 40%, transparent 100%);
	}

	button {
		transition: background-color 0.5s ease-in-out;
	}
</style>
