import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/server/db';
import type { RequestHandler } from './$types';
import type { Email } from '$lib/types/email';

export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const threadIdParam = url.searchParams.get('id');

    if (!threadIdParam) {
        throw error(400, 'Thread ID required');
    }

    const userEmail = `${locals.user.username}@${locals.user.domain}`;

    try {
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
            WHERE 
                (e.thread_id::text = ${threadIdParam} OR e.id::text = ${threadIdParam})
              AND (e.to_address = ${userEmail} OR e.from_address = ${userEmail})
              AND (e.snooze_until IS NULL OR e.snooze_until <= CURRENT_TIMESTAMP)
              AND (
                    e.status = 'sent' 
                    OR 
                    (e.status = 'scheduled' AND e.from_address = ${userEmail})
                  )
            GROUP BY e.id, e.sent_at
            ORDER BY e.sent_at ASC;
        `;

        return json({ emails });
    } catch (dbError) {
        console.error(`Database error fetching thread emails for ID ${threadIdParam}:`, dbError);
        throw error(500, 'Failed to fetch email thread');
    }
};