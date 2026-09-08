<script lang="ts">
	import EmailList from '$lib/components/self/EmailList.svelte';
	import type { Email } from '$lib/types/email';
	import { classificationStore } from '$lib/stores/classificationStore.svelte.js';
	import { searchResults, lastSearchedQuery, clearSearch } from '$lib/stores/searchStore';

	let { data } = $props();
	let classification = $derived(classificationStore.currentTab);

	// Helper function to de-duplicate an array of emails by ID
	function deduplicateEmails(emails: Email[]): Email[] {
		if (!emails) return [];
		const map = new Map<string, Email>();
		for (const email of emails) {
			if (!map.has(email.id)) {
				map.set(email.id, email);
			}
		}
		return Array.from(map.values());
	}

	let displayEmails: Email[] = $derived(
		$searchResults !== null 
			? deduplicateEmails($searchResults) // De-duplicate search results
			: deduplicateEmails(data.emails.filter(email => email.classification === classification)) // De-duplicate filtered initial data
	);
</script>

{#if $searchResults !== null}
	<div class="mb-3 text-sm text-muted-foreground">
		{#if $searchResults.length > 0}
			Found {$searchResults.length} result{$searchResults.length === 1 ? '' : 's'} 
			for "{$lastSearchedQuery}"
		{:else}
			No results found for "{$lastSearchedQuery}"
		{/if}
		<button onclick={clearSearch} class="ml-2 text-primary underline">(Clear Search)</button>
	</div>
{/if}

<EmailList emails={displayEmails} />
