import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const { ids } = await request.json();
    const userEmail = `${locals.user.username}@${locals.user.domain}`;

    await sql`
        UPDATE emails 
        SET snooze_until = NULL
        WHERE id = ANY(${ids})
        AND to_address = ${userEmail}
    `;

    return json({ success: true });
};
