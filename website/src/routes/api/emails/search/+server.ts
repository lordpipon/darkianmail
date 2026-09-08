import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { sql } from '$lib/server/db';

export async function GET({ url, locals }: RequestEvent) {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const query = url.searchParams.get('q')?.toLowerCase();
    if (!query) {
        return json([]);
    }

    const results = await sql`
        SELECT * FROM emails
        WHERE (to_address = ${`${locals.user.username}@${locals.user.domain}`}
        OR from_address = ${`${locals.user.username}@${locals.user.domain}`})
        AND (
            LOWER(subject) LIKE ${`%${query}%`}
            OR LOWER(body) LIKE ${`%${query}%`}
            OR LOWER(from_address) LIKE ${`%${query}%`}
            OR LOWER(to_address) LIKE ${`%${query}%`}
        )
        ORDER BY sent_at DESC
        LIMIT 50
    `;

    return json(results);
}
