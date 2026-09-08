<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	let { children } = $props();
</script>

<div class="flex flex-col items-center justify-center">
	{@render children()}
</div>

<footer
	class="fixed bottom-0 left-0 right-0 border-t bg-card text-center"
>
	<div class="flex justify-center gap-4">
		<Button variant="link" href="/legal/privacy" class="text-secondary">Privacy Policy</Button>
		<Button variant="link" href="/legal/terms" class="text-secondary">Terms of Service</Button>
	</div>
</footer>
