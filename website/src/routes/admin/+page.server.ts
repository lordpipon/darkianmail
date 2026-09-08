import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db';
import type { BannedUser } from '$lib/types/user';

export const load: PageServerLoad = async ({ parent }) => {
    const { user } = await parent();
    
    if (!user?.is_admin) {
        throw error(403, 'Unauthorized');
    }

    const bannedUsers: BannedUser[] = await sql`
        SELECT id, username, domain, iq, created_at 
        FROM users 
        WHERE is_banned = true
        ORDER BY created_at DESC
    `;

    return {
        bannedUsers
    };
};
