import { readable } from 'svelte/store';

const ONE_GB = 1024 * 1024 * 1024;

export const storageUsage = readable({ usage: 0, limit: ONE_GB }, (set) => {
    const updateUsage = async () => {
        try {
            const res = await fetch('/api/storage/usage');
            if (!res.ok) {
                console.error('Failed to fetch storage usage:', await res.text());
                return;
            }
            const data = await res.json();
            set({ usage: data.usage, limit: data.limit });
        } catch (error) {
            console.error('Failed to fetch storage usage:', error);
        }
    };

    // Initial fetch
    updateUsage();

    // Update every 5 minutes
    const interval = setInterval(updateUsage, 5 * 60 * 1000);

    return () => clearInterval(interval);
});