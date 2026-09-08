import { simpleParser } from 'mailparser';
import type { ParsedMail, Attachment as MailAttachment } from 'mailparser';
import { env } from './env.js';
import { sql } from './db.js';
import { parseAddress } from './address.js';
import { storeInboundEmail } from './deliver.js';
import { saveAttachment } from './storage.js';

export async function saveInboundAttachments(parsed: ParsedMail): Promise<
    Array<{ key: string; filename: string; size: number; type: string }>
> {
    return Promise.all(
        (parsed.attachments || []).map(async (att: MailAttachment) => {
            if (!att.content || !att.filename) return null;
            const { key } = await saveAttachment(att.content, att.filename);
            return {
                key,
                filename: att.filename,
                size: att.size ?? att.content.length,
                type: att.contentType
            };
        })
    ).then((list) => list.filter((x): x is NonNullable<typeof x> => x !== null));
}

export async function parseIncomingMessage(
    source: Buffer | NodeJS.ReadableStream
): Promise<ParsedMail> {
    return simpleParser(source, { skipHtmlToText: true, skipImageLinks: true });
}

export async function recipientExistsFor(address: string): Promise<boolean> {
    const parsed = parseAddress(address);
    if (!parsed || parsed.domain !== env.DOMAIN_NAME) return false;
    const users = await sql`
        SELECT id FROM users
        WHERE username = ${parsed.local} AND domain = ${env.DOMAIN_NAME} AND deleted_at IS NULL
    `;
    return users.length > 0;
}

export interface IngestOptions {
    envelopeFrom?: string | null;
    envelopeTo?: string[] | null;
}

export async function ingestRawMessage(
    source: Buffer | NodeJS.ReadableStream,
    opts: IngestOptions = {}
): Promise<number> {
    const parsed = await parseIncomingMessage(source);
    const from = opts.envelopeFrom || parsed.from?.value?.[0]?.address || 'unknown@localhost';

    let toList: string[];
    if (opts.envelopeTo && opts.envelopeTo.length > 0) {
        toList = opts.envelopeTo;
    } else {
        toList = [...(parsed.to?.value ?? [])]
            .map((t) => t.address)
            .filter((a): a is string => typeof a === 'string' && a.length > 0);
    }
    if (toList.length === 0) throw new Error('No recipient address');

    for (const to of toList) {
        if (!(await recipientExistsFor(to))) throw new Error(`Recipient user not found: ${to}`);
    }

    const isHtml = Boolean(parsed.html);
    const attachments = await saveInboundAttachments(parsed);
    const html = isHtml ? (parsed.html || null) : null;

    return storeInboundEmail({
        from,
        to: toList.join(','),
        subject: parsed.subject || null,
        body: parsed.text || null,
        content_type: isHtml ? 'text/html' : 'text/plain',
        html_body: html,
        message_id: parsed.messageId ?? null,
        in_reply_to: parsed.inReplyTo ?? null,
        references: parsed.references ?? null,
        attachments
    });
}