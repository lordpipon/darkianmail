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
        SELECT * FROM emails 
        WHERE to_address = ${userEmail}
        AND status = 'sent'
        AND snooze_until > CURRENT_TIMESTAMP
        ORDER BY snooze_until ASC
        LIMIT 100
    `;

    return { emails };
};
