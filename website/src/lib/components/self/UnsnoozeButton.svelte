<script lang="ts">
	import { AlarmClockOff } from 'lucide-svelte';
	import { Button } from '../ui/button';
	import { toast } from 'svelte-sonner';

	let props = $props<{
		selectedEmails: Set<string>;
		onUnsnooze?: (ids: string[]) => void;
	}>();

	async function unsnoozeEmails() {
		const idsToUnsnooze = Array.from(props.selectedEmails);
		try {
			const response = await fetch('/api/emails/unsnooze', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					ids: idsToUnsnooze
				})
			});

			if (response.ok) {
				toast.success('Emails successfully unsnoozed');
				if (props.onUnsnooze) {
					props.onUnsnooze(idsToUnsnooze);
				}
			} else {
				toast.error('Failed to unsnooze emails');
			}
		} catch (error) {
			toast.error('Failed to unsnooze emails');
		}
	}
</script>

<Button
	class="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-2 text-sm font-medium"
	onclick={unsnoozeEmails}
>
	<AlarmClockOff class="h-4 w-4" />
	Unsnooze
</Button>
