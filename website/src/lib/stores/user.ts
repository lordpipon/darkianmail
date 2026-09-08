import { writable } from 'svelte/store';
import type { UserWithSettings } from '$lib/types/user';

function createPersistedUserStore() {
    // Try to load initial state from localStorage
    const initialValue = typeof localStorage !== 'undefined' 
        ? JSON.parse(localStorage.getItem('userData') || 'null') 
        : null;

    const { subscribe, set, update } = writable<UserWithSettings>(initialValue);

    return {
        subscribe,
        set: (value: UserWithSettings) => {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('userData', JSON.stringify(value));
            }
            set(value);
        },
        update
    };
}

export const USER_DATA = createPersistedUserStore();
