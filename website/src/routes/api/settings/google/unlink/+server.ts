import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';

export const POST: RequestHandler = async ({ locals }) => {
    if (!locals.user) throw error(401, 'Unauthorized');

    await sql`
        DELETE FROM google_links WHERE user_id = ${locals.user.id}
    `;

    return json({ success: true });
};