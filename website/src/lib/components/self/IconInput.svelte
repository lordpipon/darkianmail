<script lang="ts">
	import { Input } from '../ui/input';
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		icon: iconProp,
		class: className,
		value = $bindable(''),
		...rest
	} = $props<
		{
			icon?: typeof import('lucide-svelte').Icon;
			class?: string;
			value?: string;
		} & HTMLInputAttributes
	>();

	const Icon = $derived(iconProp);
</script>

<div class="relative">
	{#if Icon}
		<Icon class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
	{/if}
	<Input {...rest} class={`${Icon ? 'pl-9' : ''} ${className ?? ''}`} bind:value />
</div>
