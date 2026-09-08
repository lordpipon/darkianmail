<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import IconInput from '$lib/components/self/IconInput.svelte';
	import type { Icon } from 'lucide-svelte';

	type Suggestion = {
		label: string;
		value: string;
		tag?: string | null;
	};

	let {
		value = $bindable(''),
		suggestions = [],
		icon,
		placeholder = '',
		id = '',
		onsearch,
		onselect
	} = $props<{
		value: string;
		suggestions: Suggestion[];
		icon?: typeof Icon;
		placeholder?: string;
		id?: string;
		onsearch?: (value: string) => void;
		onselect?: (suggestion: Suggestion) => void;
	}>();

	let showSuggestions = $state(false);
	let selectedIndex = $state(-1);

	function handleKeydown(e: KeyboardEvent) {
		if (!suggestions.length) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % suggestions.length;
			showSuggestions = true;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = selectedIndex <= 0 ? suggestions.length - 1 : selectedIndex - 1;
			showSuggestions = true;
		} else if (e.key === 'Enter' && selectedIndex >= 0) {
			e.preventDefault();
			handleSelect(suggestions[selectedIndex]);
		} else if (e.key === 'Escape') {
			showSuggestions = false;
			selectedIndex = -1;
		}
	}

	function handleSelect(suggestion: Suggestion) {
		value = suggestion.value;
		showSuggestions = false;
		selectedIndex = -1;
		onselect?.(suggestion);
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const newValue = target.value;
		value = newValue; // Update the bindable value
		showSuggestions = true;
		selectedIndex = -1;
		onsearch?.(newValue);
	}

	function handleFocus() {
		if (value && suggestions.length > 0) {
			showSuggestions = true;
		}
	}

	function handleWindowClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.autocomplete-container')) {
			showSuggestions = false;
		}
	}

	$effect(() => {
		if (showSuggestions) {
			window.addEventListener('click', handleWindowClick);
			return () => window.removeEventListener('click', handleWindowClick);
		}
	});

	// Hide suggestions when suggestions array becomes empty
	$effect(() => {
		if (suggestions.length === 0) {
			showSuggestions = false;
		}
	});
</script>

<div class="autocomplete-container relative">
	<IconInput
		{id}
		{icon}
		{placeholder}
		bind:value
		oninput={handleInput}
		onkeydown={handleKeydown}
		onfocus={handleFocus}
	/>

	{#if showSuggestions && suggestions.length > 0}
		<div
			class="bg-card absolute left-0 right-0 top-full z-50 mt-1 max-h-[200px] overflow-y-auto rounded-lg border p-1 shadow-md"
		>
			{#each suggestions as suggestion, i}
				<button
					type="button"
					class="hover:bg-accent flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm"
					class:bg-accent={i === selectedIndex}
					onclick={() => handleSelect(suggestion)}
				>
					<div class="flex-1">
						<div class="font-medium">{suggestion.label}</div>
					</div>
					{#if suggestion.tag}
						<Badge variant="outline" class="ml-auto">
							{suggestion.tag}
						</Badge>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
