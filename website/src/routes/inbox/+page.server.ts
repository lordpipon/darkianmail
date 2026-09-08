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
        WITH RelevantThreads AS (
            -- identify all thread IDs where the user received at least one email
            SELECT DISTINCT COALESCE(thread_id::text, id::text) as thread_id
            FROM emails
            WHERE to_address = ${userEmail}::text
              AND status = 'sent'
              AND (snooze_until IS NULL OR snooze_until <= CURRENT_TIMESTAMP)
              AND (scheduled_at IS NULL OR scheduled_at <= CURRENT_TIMESTAMP)
        ),
        RankedEmails AS (
            SELECT 
                e.*, 
                EXISTS(
                    SELECT 1 FROM email_stars es 
                    WHERE es.email_id = e.id 
                    AND es.user_id = ${locals.user.id}
                ) as starred,
                COALESCE(e.thread_id::text, e.id::text) as effective_thread_id, 
                ROW_NUMBER() OVER(PARTITION BY COALESCE(e.thread_id::text, e.id::text) ORDER BY e.sent_at DESC) as rn,
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
                (e.to_address = ${userEmail}::text OR e.from_address = ${userEmail}::text) 
                AND e.status = 'sent'
                AND (
                    e.snooze_until IS NULL 
                    OR e.snooze_until <= CURRENT_TIMESTAMP
                )
                AND (
                    e.scheduled_at IS NULL
                    OR e.scheduled_at <= CURRENT_TIMESTAMP
                )
                -- only rank emails belonging to threads where the user received something
                AND COALESCE(e.thread_id::text, e.id::text) IN (SELECT thread_id FROM RelevantThreads)
            GROUP BY e.id, e.sent_at
        )
        SELECT * 
        FROM RankedEmails
        WHERE rn = 1 -- get only the latest email in each relevant thread
        ORDER BY sent_at DESC 
        LIMIT 100;
    `;

    return {
        emails
    };
};