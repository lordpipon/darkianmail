import { writable } from 'svelte/store';
import type { Email } from '$lib/types/email';

export const searchResults = writable<Email[] | null>(null);
export const searchQuery = writable<string>('');
export const lastSearchedQuery = writable<string>('');

export function clearSearch() {
    searchResults.set(null);
    searchQuery.set('');
    lastSearchedQuery.set('');
}
