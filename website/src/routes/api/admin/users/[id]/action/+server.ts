import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';

export const POST: RequestHandler = async ({ params, locals, request }) => {
    if (!locals.user?.is_admin) {
        throw error(403, 'Unauthorized');
    }

    const userId = parseInt(params.id);
    if (isNaN(userId)) {
        throw error(400, 'Invalid user ID');
    }

    let body;
    try {
        body = await request.json();
    } catch {
        throw error(400, 'Invalid JSON body');
    }

    const { action } = body;
    if (!['ban', 'unban', 'set_admin', 'delete'].includes(action)) {
        throw error(400, 'Unknown action');
    }

    const users = await sql`
        SELECT id, username, is_admin, is_banned FROM users WHERE id = ${userId}
    `;
    if (!users.length) {
        throw error(404, 'User not found');
    }
    const target = users[0];

    // Safeguards
    if (target.id === locals.user.id && action === 'delete') {
        throw error(400, 'You cannot delete your own account from the admin panel.');
    }
    if (target.id === locals.user.id && action === 'set_admin' && body.admin === false) {
        throw error(400, 'You cannot remove your own admin access.');
    }

    if (action === 'ban') {
        await sql`UPDATE users SET is_banned = true WHERE id = ${userId}`;
        await sql`DELETE FROM user_secret_codes WHERE user_id = ${userId}`;
    } else if (action === 'unban') {
        await sql`UPDATE users SET is_banned = false WHERE id = ${userId}`;
    } else if (action === 'set_admin') {
        const admin = body.admin === true;
        await sql`UPDATE users SET is_admin = ${admin} WHERE id = ${userId}`;
    } else if (action === 'delete') {
        await sql`
            UPDATE users
            SET password_hash = 'DELETED_ACCOUNT', deleted_at = NOW()
            WHERE id = ${userId}
        `;
        await sql`DELETE FROM user_secret_codes WHERE user_id = ${userId}`;
    }

    return json({ success: true });
};