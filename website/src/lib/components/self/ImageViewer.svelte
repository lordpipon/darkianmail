<script lang="ts">
	import { Dialog, DialogContent } from '$lib/components/ui/dialog';
	import { downloadFile } from '$lib/utils';
	import { X, Download } from 'lucide-svelte';

	let {
		url,
		previewUrl,
		dominantColor,
		filename,
		open = $bindable()
	} = $props<{
		url: string;
		previewUrl: string;
		dominantColor: string;
		filename: string;
		open?: boolean;
	}>();

	let isFullImageLoading = $state(true);
</script>

<Dialog bind:open>
	<DialogContent
		class="max-w-[min(90vw,900px)] overflow-hidden border-0 bg-transparent p-0 shadow-none"
	>
		<div
			class="relative flex items-center justify-center"
			style="background-color: {dominantColor};"
		>
			<!-- Close button -->
			<button
				type="button"
				onclick={() => (open = false)}
				class="bg-popover/50 text-primary-foreground hover:bg-popover/70 absolute right-2 top-2 z-20 rounded-full p-2 backdrop-blur-sm transition-colors"
				aria-label="Close image viewer"
			>
				<X class="h-4 w-4" />
			</button>

			<!-- Download button -->
			<button
				type="button"
				onclick={() => downloadFile(url, filename)}
				class="bg-popover/50 text-primary-foreground hover:bg-popover/70 absolute right-12 top-2 z-20 rounded-full p-2 backdrop-blur-sm transition-colors"
				aria-label="Download image"
			>
				<Download class="h-4 w-4" />
			</button>

			<!-- Image Container -->
			<div class="relative max-h-[90vh] w-full">
				<div class="relative h-0 pb-[100%]">
					<!-- Preview Image (Blurred) -->
					{#if previewUrl && isFullImageLoading}
						<img
							src={previewUrl}
							alt="Loading preview"
							class="absolute inset-0 h-full w-full scale-105 object-contain blur-md"
							aria-hidden="true"
						/>
					{/if}

					<!-- Full Resolution Image -->
					<img
						src={url}
						alt={filename}
						class="absolute inset-0 h-full w-full object-contain transition-opacity duration-300"
						class:opacity-0={isFullImageLoading}
						onload={() => (isFullImageLoading = false)}
					/>
				</div>
			</div>
		</div>
	</DialogContent>
</Dialog>
