import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { env } from './env.js';
import { ingestRawMessage } from './ingest.js';

function safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
}

function sendJson(res: import('node:http').ServerResponse, status: number, body: unknown): void {
    const payload = JSON.stringify(body);
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(payload);
}

export function startWebhookServer(): import('node:http').Server {
    const server = createServer(async (req, res) => {
        try {
            const url = new URL(req.url || '/', 'http://localhost');

            if (req.method !== 'POST' || url.pathname !== '/inbound') {
                sendJson(res, 404, { status: 'error', error: 'not found' });
                return;
            }

            if (env.SMTP_WEBHOOK_TOKEN) {
                const auth = req.headers['authorization'] || '';
                const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
                if (!token || !safeEqual(token, env.SMTP_WEBHOOK_TOKEN)) {
                    sendJson(res, 401, { status: 'error', error: 'unauthorized' });
                    return;
                }
            }

            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(chunk as Buffer);
            const raw = Buffer.concat(chunks);
            if (raw.length === 0) {
                sendJson(res, 400, { status: 'error', error: 'empty body' });
                return;
            }

            const envelopeFrom = req.headers['x-envelope-from'] as string | undefined;
            const envelopeTo = ((req.headers['x-envelope-to'] as string | undefined)
                ?.split(',')
                .map((s) => s.trim())
                .filter(Boolean)) || null;

            const id = await ingestRawMessage(raw, { envelopeFrom, envelopeTo });
            sendJson(res, 200, { status: 'accepted', email_id: id, bytes: raw.length });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            sendJson(res, 400, { status: 'error', error: message });
        }
    });

    server.on('error', (err) => {
        console.error(`[webhook] server error: ${err.message}`);
    });

    server.listen(env.WEBHOOK_PORT, env.WEBHOOK_BIND_HOST, () => {
        console.log(`[webhook] ingest listening on ${env.WEBHOOK_BIND_HOST}:${env.WEBHOOK_PORT}`);
    });

    return server;
}