import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import type { Email } from '$lib/types/email';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lastPollTime, isFirstPoll } = await request.json();
    const userEmail = `${locals.user.username}@${locals.user.domain}`;
    const safetyBufferMs = isFirstPoll ? 5 * 60 * 1000 : 60 * 1000;
    const adjustedTime = new Date(lastPollTime - safetyBufferMs);

    try {
        const newEmails: Email[] = await sql`
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
            WHERE e.to_address = ${userEmail}::text
              AND e.status = 'sent'
              AND e.sent_at >= ${adjustedTime}::timestamptz
              AND e.from_address != ${userEmail}::text
            GROUP BY e.id, e.sent_at
            ORDER BY e.sent_at DESC;
        `;

        return json({ emails: newEmails });
    } catch (error) {
        console.error('Poll error:', error);
        return json({ error: 'Failed to fetch new emails' }, { status: 500 });
    }
};
