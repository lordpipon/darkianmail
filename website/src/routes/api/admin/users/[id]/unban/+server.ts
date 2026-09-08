import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';

export const POST: RequestHandler = async ({ params, locals }) => {
    if (!locals.user?.is_admin) {
        throw error(403, 'Unauthorized');
    }

    const userId = parseInt(params.id);
    if (isNaN(userId)) {
        throw error(400, 'Invalid user ID');
    }

    const users = await sql`
        SELECT id FROM users WHERE id = ${userId}
    `;

    if (!users.length) {
        throw error(404, 'User not found');
    }

    await sql`
        UPDATE users 
        SET is_banned = false 
        WHERE id = ${userId}
    `;

    return json({ success: true });
};
