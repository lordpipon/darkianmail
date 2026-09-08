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
        SELECT 
            e.*, 
            EXISTS(
                SELECT 1 FROM email_stars es 
                WHERE es.email_id = e.id 
                AND es.user_id = ${locals.user.id}
            ) as starred,
            COALESCE(
                array_agg(
                    json_build_object(
                        'key', a.key,
                        'filename', a.filename,
                        'size', a.size,
                        'type', a.type
                    )
                ) FILTER (WHERE a.key IS NOT NULL),
                ARRAY[]::json[]
            ) as attachments
        FROM emails e
        LEFT JOIN attachments a ON a.email_id = e.id
        WHERE e.from_address = ${userEmail}::text
        GROUP BY e.id, e.sent_at
        ORDER BY e.sent_at DESC 
        LIMIT 100;
    `;

    return { emails };
};
