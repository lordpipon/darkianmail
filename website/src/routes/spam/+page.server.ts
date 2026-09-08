import { redirect } from '@sveltejs/kit';
import { sql } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import type { Email } from '$lib/types/email';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(303, '/login');
    }

    const userEmail = `${locals.user.username}@${locals.user.domain}`;

    const emails: Email[] = await sql`
        SELECT e.*, EXISTS(
            SELECT 1 FROM email_stars es 
            WHERE es.email_id = e.id 
            AND es.user_id = ${locals.user.id}
        ) as starred
        FROM emails e 
        WHERE to_address = ${userEmail}
        AND status = 'spam'
        ORDER BY sent_at DESC
        LIMIT 100
    `;

    return { emails };
};
