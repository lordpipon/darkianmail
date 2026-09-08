import { redirect } from '@sveltejs/kit';
import { sql } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import type { Draft } from '$lib/types/email';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(303, '/login');
    }

    const drafts: Draft[] = await sql`
        SELECT * FROM email_drafts
        WHERE user_id = ${locals.user.id}
        ORDER BY updated_at DESC
    `;

    return { drafts };
};
