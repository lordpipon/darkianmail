import { writable } from 'svelte/store';

export const POLLING_INTERVAL = 20000;
export const lastPollTime = writable(Date.now());
export const isPolling = writable(false);
export const seenEmailIds = writable(new Set<string>());
