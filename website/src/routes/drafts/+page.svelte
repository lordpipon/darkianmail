<script lang="ts">
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Button } from '$lib/components/ui/button';
	import { Trash2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import ComposeEmail from '$lib/components/self/ComposeEmail.svelte';
	import type { Draft } from '$lib/types/email.js';

	let { data } = $props();
	let drafts = $state(data.drafts);
	let isComposeOpen = $state(false);
	let selectedDraft: Draft | null = $state(null);

	async function deleteDraft(id: number) {
		try {
			const response = await fetch('/api/drafts', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});

			if (response.ok) {
				drafts = drafts.filter((d) => d.id !== id);
				toast.success('Draft deleted');
			}
		} catch (error) {
			toast.error('Failed to delete draft');
		}
	}

	function openDraft(draft: Draft) {
		selectedDraft = draft;
		isComposeOpen = true;
	}
</script>

<div class="container mx-auto py-6">
	<h1 class="mb-6 text-3xl font-bold">Drafts</h1>

	<ScrollArea class="h-[calc(100vh-12rem)]">
		<div class="flex flex-col gap-2">
			{#if drafts.length === 0}
				<div class="text-muted-foreground py-8 text-center">No drafts</div>
			{:else}
				{#each drafts as draft}
					<button
						class="hover:bg-accent hover:text-accent-foreground group flex items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors"
						onclick={() => openDraft(draft)}
					>
						<div class="flex-1 space-y-1">
							<div class="flex items-center gap-2">
								<span class="font-medium">{draft.to_address || 'No recipient'}</span>
								<span class="text-muted-foreground text-sm">
									{new Date(draft.updated_at).toLocaleDateString([], {
										month: 'short',
										day: 'numeric',
										hour: '2-digit',
										minute: '2-digit'
									})}
								</span>
							</div>
							<div class="text-muted-foreground">
								<span class="font-medium">{draft.subject || 'No subject'}</span>
								<span class="mx-1">-</span>
								<span>{draft.body?.slice(0, 100) || 'No content'}...</span>
							</div>
						</div>

						<Button
							variant="ghost"
							size="icon"
							class="opacity-0 transition-opacity group-hover:opacity-100"
							onclick={(e) => {
								e.stopPropagation();
								deleteDraft(draft.id);
							}}
						>
							<Trash2 class="text-destructive h-4 w-4" />
						</Button>
					</button>
				{/each}
			{/if}
		</div>
	</ScrollArea>

	<ComposeEmail
		isOpen={isComposeOpen}
		initialDraft={selectedDraft}
		onOpenChange={(open: boolean) => {
			isComposeOpen = open;
			if (!open) selectedDraft = null;
		}}
	/>
</div>
