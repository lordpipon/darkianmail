import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import type { AddressInfo } from 'node:net';
import bcrypt from 'bcryptjs';
import { env } from './env.js';
import { sql } from './db.js';
import { parseAddress } from './address.js';
import { storeOutboundEmail } from './deliver.js';
import { saveInboundAttachments, ingestRawMessage } from './ingest.js';
import { ensureStorage } from './storage.js';

function log(port: number, message: string): void {
    console.log(`[smtp:${port}] ${message}`);
}

async function handleInboundData(stream: NodeJS.ReadableStream, envelopeTo: string[]) {
    await ingestRawMessage(stream, {
        envelopeTo
    });
}

export function startInboundServer(): SMTPServer {
    const server = new SMTPServer({
        name: env.HELO_NAME,
        secure: false,
        hideSTARTTLS: true,
        disabledCommands: ['STARTTLS', 'AUTH'],
        authOptional: true,
        size: env.MAX_MESSAGE_SIZE,
        onConnect(session, callback) {
            log(env.SMTP_INBOUND_PORT, `connection from ${session.remoteAddress}`);
            callback();
        },
        onMailFrom(address, session, callback) {
            if (address.address && !parseAddress(address.address)) {
                return callback(new Error('Invalid sender address'));
            }
            callback();
        },
        async onRcptTo(address, session, callback) {
            try {
                const parsed = parseAddress(address.address);
                if (!parsed || parsed.domain !== env.DOMAIN_NAME) {
                    return callback(new Error('This server does not handle mail for this domain'));
                }
                const users = await sql`
                    SELECT id FROM users
                    WHERE username = ${parsed.local} AND domain = ${env.DOMAIN_NAME} AND deleted_at IS NULL
                `;
                if (users.length === 0) {
                    return callback(new Error('Recipient user not found'));
                }
                callback();
            } catch (err) {
                log(env.SMTP_INBOUND_PORT, `rcpt error: ${String(err)}`);
                callback(new Error('Temporary failure'));
            }
        },
        async onData(stream, session, callback) {
            try {
                await handleInboundData(stream, session.envelope.rcptTo.map((r) => r.address));
                callback(null, 'accepted');
            } catch (err) {
                log(env.SMTP_INBOUND_PORT, `data error: ${String(err)}`);
                callback(new Error('Failed to accept message'));
            }
        }
    });

    server.on('error', (err) => {
        log(env.SMTP_INBOUND_PORT, `server error: ${err.message}`);
    });

    server.listen(env.SMTP_INBOUND_PORT, env.SMTP_BIND_HOST, () => {
        const addr = server.server.address() as AddressInfo;
        log(env.SMTP_INBOUND_PORT, `inbound listening on ${addr.address}:${addr.port}`);
    });

    return server;
}

export function startSubmissionServer(): SMTPServer {
    const server = new SMTPServer({
        name: env.HELO_NAME,
        secure: false,
        hideSTARTTLS: true,
        disabledCommands: ['STARTTLS'],
        allowInsecureAuth: true,
        size: env.MAX_MESSAGE_SIZE,
        onConnect(session, callback) {
            log(env.SMTP_SUBMISSION_PORT, `connection from ${session.remoteAddress}`);
            callback();
        },
        async onAuth(auth, session, callback) {
            try {
                const parsed = parseAddress(auth.username || '');
                if (!parsed || !auth.password) {
                    return callback(new Error('Invalid credentials'));
                }
                if (auth.method === 'XOAUTH2') {
                    return callback(new Error('Unsupported authentication method'));
                }
                if (parsed.domain !== env.DOMAIN_NAME) {
                    return callback(new Error('Invalid credentials'));
                }

                const users = await sql`
                    SELECT id, username, domain, password_hash, is_banned, deleted_at
                    FROM users
                    WHERE username = ${parsed.local} AND domain = ${env.DOMAIN_NAME}
                `;
                if (users.length === 0 || users[0].deleted_at !== null) {
                    return callback(new Error('Invalid credentials'));
                }
                const user = users[0];
                if (user.is_banned) {
                    return callback(new Error('Account is banned'));
                }
                const match = await bcrypt.compare(auth.password, user.password_hash);
                if (!match) {
                    return callback(new Error('Invalid credentials'));
                }

                session.user = user.username;
                callback(null, { user: user.username });
            } catch (err) {
                log(env.SMTP_SUBMISSION_PORT, `auth error: ${String(err)}`);
                callback(new Error('Temporary failure'));
            }
        },
        onMailFrom(address, session, callback) {
            const username = session.user;
            if (!username) return callback(new Error('Authentication required'));
            if (address.address === '<>') return callback();
            const parsed = parseAddress(address.address || '');
            if (!parsed || parsed.local !== username || parsed.domain !== env.DOMAIN_NAME) {
                return callback(new Error(`You can only send as ${username}@${env.DOMAIN_NAME}`));
            }
            callback();
        },
        async onData(stream, session, callback) {
            try {
                const parsed = await simpleParser(stream, { skipHtmlToText: true, skipImageLinks: true });
                const mailFrom = session.envelope.mailFrom as { address?: string } | undefined;
                const from = mailFrom?.address || parsed.from?.value?.[0]?.address || '';
                const toAddresses = session.envelope.rcptTo.map((r) => r.address);
                if (!from || toAddresses.length === 0) {
                    return callback(new Error('Missing sender or recipient'));
                }

                const isHtml = Boolean(parsed.html);

                const attachments = await saveInboundAttachments(parsed);
                const html = isHtml ? (parsed.html || null) : null;

                for (const to of toAddresses) {
                    await storeOutboundEmail(
                        {
                            from,
                            to,
                            subject: parsed.subject || null,
                            body: parsed.text || null,
                            content_type: isHtml ? 'text/html' : 'text/plain',
                            html_body: html,
                            message_id: parsed.messageId ?? null,
                            in_reply_to: parsed.inReplyTo ?? null,
                            references: parsed.references ?? null
                        },
                        'sending'
                    );
                }

                callback(null, 'accepted');
            } catch (err) {
                log(env.SMTP_SUBMISSION_PORT, `data error: ${String(err)}`);
                callback(new Error('Failed to accept message'));
            }
        }
    });

    server.on('error', (err) => {
        log(env.SMTP_SUBMISSION_PORT, `server error: ${err.message}`);
    });

    server.listen(env.SMTP_SUBMISSION_PORT, env.SMTP_BIND_HOST, () => {
        const addr = server.server.address() as AddressInfo;
        log(env.SMTP_SUBMISSION_PORT, `submission listening on ${addr.address}:${addr.port}`);
    });

    return server;
}

export async function startMailServers(): Promise<void> {
    await ensureStorage();
    const inbound = startInboundServer();
    inbound.on('error', (err) => {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'EACCES' || code === 'EPERM') {
            console.warn(
                `Cannot bind inbound SMTP on port ${env.SMTP_INBOUND_PORT} (${code}). ` +
                `Try: sudo setcap 'cap_net_bind_service=+ep' $(command -v node)  OR  run with sudo. Continuing without inbound.`
            );
        }
    });

    const submission = startSubmissionServer();
    submission.on('error', (err) => {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'EACCES' || code === 'EPERM') {
            console.warn(
                `Cannot bind submission SMTP on port ${env.SMTP_SUBMISSION_PORT} (${code}). ` +
                `Try: sudo setcap 'cap_net_bind_service=+ep' $(command -v node)  OR  run with sudo. Continuing without submission.`
            );
        }
    });
}