<script lang="ts">
	import { AlarmClock } from 'lucide-svelte';
	import { onDestroy } from 'svelte';

	let props = $props<{
		date: string | Date;
	}>();

	let timeLeft = $state('');

	function updateTimeLeft() {
		const now = new Date();
		const target = new Date(props.date);
		const diff = target.getTime() - now.getTime();

		if (diff <= 0) {
			timeLeft = 'Now';
			return;
		}

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (days > 0) {
			timeLeft = `${days}d ${hours}h`;
		} else if (hours > 0) {
			timeLeft = `${hours}h ${minutes}m`;
		} else {
			timeLeft = `${minutes}m`;
		}
	}

	let interval = setInterval(updateTimeLeft, 60000);
	updateTimeLeft();

	onDestroy(() => {
		clearInterval(interval);
	});
</script>

<div
	class="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
>
	<AlarmClock class="h-3 w-3" />
	<span>Returns in {timeLeft}</span>
</div>
