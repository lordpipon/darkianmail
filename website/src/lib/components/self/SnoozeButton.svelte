<script lang="ts">
	import { Clock } from 'lucide-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '../ui/button';
	import { toast } from 'svelte-sonner';

	let props = $props<{
		selectedEmails: Set<string>;
		onSnooze?: (ids: string[]) => void;
	}>();

	async function snoozeEmails(until: Date) {
		const idsToSnooze = Array.from(props.selectedEmails);
		try {
			const response = await fetch('/api/emails/snooze', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					ids: idsToSnooze,
					snoozeUntil: until.toISOString()
				})
			});

			if (response.ok) {
				toast.success('Emails successfully snoozed');
				if (props.onSnooze) {
					props.onSnooze(idsToSnooze);
				}
			} else {
				toast.error('Failed to snooze emails');
			}
		} catch (error) {
			toast.error('Failed to snooze emails');
		}
	}

	const snoozeOptions = [
		{
			label: '1 day',
			time: () => {
				const d = new Date();
				d.setDate(d.getDate() + 1);
				return d;
			}
		},
		{
			label: '3 days',
			time: () => {
				const d = new Date();
				d.setDate(d.getDate() + 3);
				return d;
			}
		},
		{
			label: '1 week',
			time: () => {
				const d = new Date();
				d.setDate(d.getDate() + 7);
				return d;
			}
		},
		{
			label: '2 weeks',
			time: () => {
				const d = new Date();
				d.setDate(d.getDate() + 14);
				return d;
			}
		},
		{
			label: '1 month',
			time: () => {
				const d = new Date();
				d.setDate(d.getDate() + 30);
				return d;
			}
		}
	];
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		<Button class="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-2 text-sm font-medium">
			<Clock class="h-4 w-4" />
			Snooze
		</Button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="w-32 p-2">
		{#each snoozeOptions as option}
			<DropdownMenu.Item onclick={() => snoozeEmails(option.time())} class="cursor-pointer">
				{option.label}
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
