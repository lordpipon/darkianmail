<script lang="ts">
	import { Inbox, TagsIcon, MessagesSquare, Users, Bell } from 'lucide-svelte';
	import { classificationStore } from '$lib/stores/classificationStore.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { classificationColors } from '$lib/utils/classification-colors';

	const classifications = [
		{ value: 'primary', label: 'Primary', icon: Inbox },
		{ value: 'promotions', label: 'Promotions', icon: TagsIcon },
		{ value: 'social', label: 'Social', icon: Users },
		{ value: 'forums', label: 'Forums', icon: MessagesSquare },
		{ value: 'updates', label: 'Updates', icon: Bell }
	] as const;

	let currentTab = $derived(classificationStore.currentTab);
</script>

<div class="flex md:flex-row flex-col gap-2">
	<div class="md:flex-row flex-col md:p-0 p-2">
		{#each classifications as { value, label, icon: Icon }}
			<Tooltip.Root>
				<Tooltip.Trigger>
					<button
						class="relative flex h-8 w-8 items-center justify-center rounded-md transition-colors
							   {currentTab === value
							? classificationColors[value].bg + '/10 ' + classificationColors[value].text
							: 'text-muted-foreground hover:' + classificationColors[value].bg + '/10'}"
						onclick={() => (classificationStore.currentTab = value)}
					>
						<Icon class="h-4 w-4" />
						<span class="sr-only">{label}</span>
					</button>
				</Tooltip.Trigger>
				<Tooltip.Content side="bottom">
					{label}
				</Tooltip.Content>
			</Tooltip.Root>
		{/each}
	</div>
</div>

<style>
	:global(.dropdown-content .classification-buttons) {
		flex-direction: column;
		padding: 0.5rem;
	}
</style>
