import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { resolveMx, resolve4 } from 'node:dns/promises';
import { env, isRelayConfigured } from './env.js';
import { sql } from './db.js';
import type { ParsedAddress } from './address.js';
import { parseAddress } from './address.js';
import { classifyEmail } from './classify.js';
import { getAttachmentBuffer } from './storage.js';

export interface EmailData {
    from: string;
    to: string;
    subject: string | null;
    body: string | null;
    content_type: 'text/plain' | 'text/html';
    html_body: string | null;
    scheduled_at?: Date | null;
    reply_to_id?: number | null;
    thread_id?: number | null;
    message_id?: string | null;
    in_reply_to?: string | null;
    references?: string | null;
    expires_at?: Date | null;
    self_destruct?: boolean;
    attachments?: Array<{ key: string }>;
}

export async function storeOutboundEmail(data: EmailData, status: 'sending' | 'scheduled'): Promise<number> {
    const from = parseAddress(data.from);
    const to = parseAddress(data.to);
    if (!from || !to) throw new Error('Invalid sender or recipient address');

    const classification = classifyEmail(data.subject, data.body, data.html_body);

    const [row] = await sql`
        INSERT INTO emails (
            from_address, from_domain, to_address, to_domain,
            subject, body, content_type, html_body,
            message_id, in_reply_to, "references",
            scheduled_at, classification, reply_to_id, thread_id,
            expires_at, self_destruct, status
        )
        VALUES (
            ${data.from}, ${from.domain}, ${data.to}, ${to.domain},
            ${data.subject}, ${data.body}, ${data.content_type}, ${data.html_body},
            ${data.message_id ?? null}, ${data.in_reply_to ?? null}, ${data.references ?? null},
            ${data.scheduled_at ?? null}, ${classification}, ${data.reply_to_id ?? null}, ${data.thread_id ?? null},
            ${data.expires_at ?? null}, ${data.self_destruct ?? false}, ${status}
        )
        RETURNING id
    `;
    const id = row.id;

    if (data.attachments && data.attachments.length > 0) {
        const keys = data.attachments.map((a) => a.key).filter(Boolean);
        if (keys.length > 0) {
            await sql`
                UPDATE attachments
                SET email_id = ${id}, status = 'sent'
                WHERE key = ANY(${keys})
            `;
        }
    }

    return id;
}

export async function storeInboundEmail(data: {
    from: string;
    to: string;
    subject: string | null;
    body: string | null;
    content_type: 'text/plain' | 'text/html';
    html_body: string | null;
    message_id?: string | null;
    in_reply_to?: string | null;
    references?: string | null;
    attachments?: Array<{ key: string; filename: string; size: number; type: string }>;
}): Promise<number> {
    const from = parseAddress(data.from);
    const to = parseAddress(data.to);
    if (!from || !to) throw new Error('Invalid sender or recipient address');

    const classification = classifyEmail(data.subject, data.body, data.html_body);

    let resolvedThreadId: number | null = null;
    if (data.in_reply_to) {
        const parent = await sql`
            SELECT thread_id, id FROM emails WHERE message_id = ${data.in_reply_to} LIMIT 1
        `;
        if (parent.length > 0) {
            resolvedThreadId = parent[0].thread_id ?? parent[0].id;
        }
    }

    const [row] = await sql`
        INSERT INTO emails (
            from_address, from_domain, to_address, to_domain,
            subject, body, content_type, html_body,
            message_id, in_reply_to, "references",
            sent_at, status, classification, thread_id
        )
        VALUES (
            ${data.from}, ${from.domain}, ${data.to}, ${to.domain},
            ${data.subject}, ${data.body}, ${data.content_type}, ${data.html_body},
            ${data.message_id ?? null}, ${data.in_reply_to ?? null}, ${data.references ?? null},
            NOW(), 'sent', ${classification}, ${resolvedThreadId}
        )
        RETURNING id
    `;
    const id = row.id;

    if (data.attachments && data.attachments.length > 0) {
        for (const att of data.attachments) {
            await sql`
                INSERT INTO attachments (key, filename, size, type, email_id, status)
                VALUES (${att.key}, ${att.filename}, ${att.size}, ${att.type}, ${id}, 'sent')
                ON CONFLICT (key) DO NOTHING
            `;
        }
    }

    return id;
}

async function resolveMxHost(domain: string): Promise<string> {
    try {
        const records = await resolveMx(domain);
        if (records.length > 0) {
            records.sort((a, b) => a.priority - b.priority);
            return records[0].exchange;
        }
    } catch (e) {
        // no MX records, fall back to A
    }
    const addrs = await resolve4(domain);
    if (addrs.length === 0) throw new Error(`No MX or A records found for ${domain}`);
    return addrs[0];
}

function buildMessage(email: { id: number }) {
    return async (): Promise<{ message: Record<string, unknown>; recipients: ParsedAddress } | null> => {
        const [row] = await sql`
            SELECT * FROM emails WHERE id = ${email.id}
        `;
        if (!row) return null;

        const to = parseAddress(row.to_address);
        if (!to) return null;

        const attachments = await sql`
            SELECT key, filename, type, size
            FROM attachments
            WHERE email_id = ${email.id} AND status != 'failed'
            ORDER BY id ASC
        `;

        const attachmentBuffers = await Promise.all(
            attachments.map(async (a) => ({
                content: await getAttachmentBuffer(a.key),
                filename: a.filename,
                contentType: a.type
            }))
        );

        const message: Record<string, unknown> = {
            envelope: {
                from: row.from_address,
                to: [row.to_address]
            },
            from: row.from_address,
            to: row.to_address,
            subject: row.subject ?? '',
            text: row.content_type === 'text/plain' ? row.body ?? '' : undefined,
            html: row.content_type === 'text/html' ? row.html_body ?? row.body ?? '' : undefined,
            headers: {} as Record<string, string>
        };

        const headers = message.headers as Record<string, string>;
        if (row.message_id) headers['Message-ID'] = row.message_id;
        if (row.in_reply_to) headers['In-Reply-To'] = row.in_reply_to;
        if (row.references) headers['References'] = row.references;

        if (attachmentBuffers.length > 0) {
            message.attachments = attachmentBuffers;
        }

        return { message, recipients: to };
    };
}

function createRelayTransport(): Transporter {
    return nodemailer.createTransport({
        host: env.SMTP_RELAY_HOST,
        port: env.SMTP_RELAY_PORT,
        secure: env.SMTP_RELAY_SECURE,
        name: env.HELO_NAME,
        auth:
            env.SMTP_RELAY_USER && env.SMTP_RELAY_PASS
                ? { user: env.SMTP_RELAY_USER, pass: env.SMTP_RELAY_PASS }
                : undefined,
        tls: { rejectUnauthorized: false }
    });
}

async function deliverOne(emailId: number): Promise<void> {
    const build = buildMessage({ id: emailId });
    const built = await build();
    if (!built) return;

    const { message, recipients } = built;
    const domain = recipients.domain;

    if (domain === env.DOMAIN_NAME) {
        await sql`
            UPDATE emails SET status = 'sent', sent_at = COALESCE(sent_at, NOW())
            WHERE id = ${emailId}
        `;
        return;
    }

    try {
        if (isRelayConfigured()) {
            const transport = createRelayTransport();
            await transport.sendMail(message);
            await transport.close();
        } else {
            const mxHost = await resolveMxHost(domain);
            const transport = nodemailer.createTransport({
                host: mxHost,
                port: 25,
                secure: false,
                name: env.HELO_NAME,
                connectionTimeout: 20000,
                greetingTimeout: 20000,
                socketTimeout: 45000,
                tls: { rejectUnauthorized: false }
            });
            await transport.sendMail(message);
            await transport.close();
        }

        await sql`
            UPDATE emails SET status = 'sent', sent_at = NOW(), error_message = NULL
            WHERE id = ${emailId}
        `;
    } catch (err: unknown) {
        const messageText = err instanceof Error ? err.message : String(err);
        const responseCode = (err as { responseCode?: number })?.responseCode;

        if (responseCode && responseCode >= 500 && responseCode < 600) {
            await sql`
                UPDATE emails SET status = 'rejected', error_message = ${messageText}
                WHERE id = ${emailId}
            `;
        } else {
            await sql`
                UPDATE emails SET status = 'failed', error_message = ${messageText}
                WHERE id = ${emailId}
            `;
        }
    }
}

export async function processDueEmails(): Promise<void> {
    try {
        const due = await sql`
            SELECT id FROM emails
            WHERE (
                status = 'sending'
                OR (
                    status = 'scheduled'
                    AND scheduled_at IS NOT NULL
                    AND scheduled_at <= CURRENT_TIMESTAMP
                )
                OR (
                    status = 'pending'
                )
            )
            ORDER BY id ASC
            LIMIT 10
        `;

        for (const row of due) {
            await deliverOne(row.id);
            await new Promise((r) => setTimeout(r, 500));
        }
    } catch (err) {
        console.error('Error processing outbound queue:', err);
    }
}

export async function cleanupExpiredEmails(): Promise<void> {
    try {
        const toDelete = await sql`
            WITH RECURSIVE to_delete AS (
                SELECT id
                FROM emails
                WHERE expires_at < NOW()
                    AND expires_at IS NOT NULL
                UNION ALL
                SELECT e.id
                FROM emails e
                JOIN to_delete td ON e.reply_to_id = td.id
            )
            SELECT id FROM to_delete
        `;

        if (toDelete.length > 0) {
            const ids = toDelete.map((r) => r.id);
            await sql`DELETE FROM attachments WHERE email_id = ANY(${ids})`;
            await sql`DELETE FROM emails WHERE id = ANY(${ids})`;
        }
    } catch (err) {
        console.error('Error cleaning up expired emails:', err);
    }
}