import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/db';

export const load: PageServerLoad = async ({ parent }) => {
    const { user } = await parent();

    if (!user?.is_admin) {
        throw error(403, 'Unauthorized');
    }

    const users = await sql`
        SELECT id, username, domain, is_admin, is_banned, iq, recovery_email, deleted_at, created_at
        FROM users
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
    `;

    const statsRows = await sql`
        SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_banned)::int AS banned,
            COUNT(*) FILTER (WHERE is_admin)::int AS admins
        FROM users
        WHERE deleted_at IS NULL
    `;

    return {
        users,
        stats: statsRows[0],
        activeUserId: user.id
    };
};