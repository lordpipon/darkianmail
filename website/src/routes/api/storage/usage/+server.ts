import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const [currentUsage] = await sql`
        SELECT calculate_user_storage(${locals.user.id}) as usage
    `;

    return json({
        usage: Number(currentUsage?.usage || 0),
        limit: 1024 * 1024 * 1024 // 1GB
    });
};
