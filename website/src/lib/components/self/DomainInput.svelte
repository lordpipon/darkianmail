<script lang="ts">
	import { Input } from '../ui/input';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';
	import Separator from '../ui/separator/separator.svelte';

	let {
		domain = 'localhost',
		class: className,
		value = $bindable(''),
		maxlength = 20,
		...rest
	} = $props<
		{
			domain?: string;
			class?: string;
			value?: string;
			maxlength?: number;
		} & HTMLInputAttributes
	>();
</script>

<div class="relative">
	<Input {...rest} {maxlength} class={cn('pr-[140px]', className)} bind:value />
	<div
		class="bg-muted/50 border-l-border pointer-events-none absolute inset-y-0 right-0 flex items-center rounded-r-md border-l"
	>
		<Separator orientation="vertical" class="mr-2" />
		<span class="text-muted-foreground pr-3">@{domain}</span>
	</div>
</div>
