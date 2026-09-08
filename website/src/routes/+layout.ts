import type { LayoutLoad } from './$types';
import { USER_DATA } from '$lib/stores/user';
import type { UserSessionData, User } from '$lib/types/user';

export const ssr = false;  

export const load: LayoutLoad = async ({ fetch, data }) => {
    if (data.user) {
        const sessionUser = data.user as UserSessionData;
        const settingsResponse = await fetch('/api/settings');
        const settings = await settingsResponse.json();
        
        const userWithSettings: User = {
            ...sessionUser,
            settings
        };
        
        USER_DATA.set(userWithSettings);
        return { user: userWithSettings };
    }

    USER_DATA.set(null);
    return data;
};
