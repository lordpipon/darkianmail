import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { PUBLIC_DOMAIN } from '$env/static/public';
import { randomUUID } from 'node:crypto';

const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return json({
            status: 'error',
            message: 'Authentication required'
        }, { status: 401 });
    }

    let emailData;
    try {
        emailData = await request.json();
    } catch {
        return json({ status: 'error', message: 'Invalid JSON body' }, { status: 400 });
    }

    const {
        from, to, subject, body,
        content_type = 'text/plain',
        html_body,
        scheduled_at = null,
        reply_to_id = null,
        thread_id = null,
        attachments = [],
        expires_at = null,
        self_destruct = false
    } = emailData;

    const userEmail = `${locals.user.username}@${PUBLIC_DOMAIN}`;

    if (!from || from.toLowerCase() !== userEmail.toLowerCase()) {
        return json({
            status: 'error',
            message: 'You can only send emails from your own address.'
        }, { status: 403 });
    }

    if (!to || !EMAIL_PATTERN.test((to as string).trim())) {
        return json({
            status: 'error',
            message: 'Invalid recipient address.'
        }, { status: 400 });
    }
    const toAddress = to.trim().toLowerCase();
    const toDomain = toAddress.split('@')[1];

    const isBrandedRecipient = toDomain.toLowerCase() === PUBLIC_DOMAIN.toLowerCase();
    if (!isBrandedRecipient && (expires_at || self_destruct)) {
        return json({
            status: 'error',
            message: `Expiration and self-destruct are only available for @${PUBLIC_DOMAIN} recipients.`
        }, { status: 400 });
    }

    if (!subject && !body && !html_body && attachments.length === 0) {
        return json({ status: 'error', message: 'Message is empty.' }, { status: 400 });
    }

    const status = scheduled_at ? 'scheduled' : 'sending';
    const messageId = `<${randomUUID()}@${PUBLIC_DOMAIN}>`;

    try {
        let inReplyTo: string | null = null;
        let references: string | null = null;

        if (reply_to_id) {
            const prior = await sql`
                SELECT message_id, "references", in_reply_to FROM emails WHERE id = ${reply_to_id}
            `;
            if (prior.length > 0) {
                inReplyTo = prior[0].message_id || null;
                references = [prior[0]?.references, prior[0]?.in_reply_to, inReplyTo]
                    .filter(Boolean)
                    .join(' ') || null;
            }
        }

        const [inserted] = await sql`
            INSERT INTO emails (
                from_address, from_domain, to_address, to_domain,
                subject, body, content_type, html_body,
                message_id, in_reply_to, "references",
                scheduled_at, reply_to_id, thread_id,
                expires_at, self_destruct, status
            )
            VALUES (
                ${from}, ${from.split('@')[1]}, ${toAddress}, ${toDomain},
                ${subject ?? null}, ${body ?? null}, ${content_type}, ${html_body ?? null},
                ${messageId}, ${inReplyTo}, ${references},
                ${scheduled_at ? new Date(scheduled_at) : null},
                ${reply_to_id ? reply_to_id : null},
                ${thread_id ? thread_id : null},
                ${expires_at ? new Date(expires_at) : null},
                ${self_destruct ?? false}, ${status}
            )
            RETURNING id
        `;

        const emailId = inserted.id;

        if (Array.isArray(attachments) && attachments.length > 0) {
            const keys = attachments.map((a) => a?.key).filter(Boolean);
            if (keys.length > 0) {
                await sql`
                    UPDATE attachments
                    SET email_id = ${emailId}, status = ${status}
                    WHERE key = ANY(${keys}) AND user_id = ${locals.user.id}
                `;
            }
        }

        return json({
            status: 'success',
            result: { success: true, id: emailId, scheduled: status === 'scheduled' }
        }, { status: 200 });
    } catch (err) {
        console.error('Failed to spool email:', err);
        return json({
            status: 'error',
            message: 'Failed to queue the email.'
        }, { status: 500 });
    }
};