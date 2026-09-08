import { env } from './env.js';
import { ensureStorage } from './storage.js';
import { startMailServers } from './smtp.js';
import { processDueEmails, cleanupExpiredEmails } from './deliver.js';
import { startWebhookServer } from './webhook.js';
import { sql } from './db.js';

async function boot(): Promise<void> {
    console.log('========== DarkianMail mail server ==========');
    console.log(`Domain:        ${env.DOMAIN_NAME}`);
    console.log(`Inbound port:  ${env.SMTP_INBOUND_PORT}`);
    console.log(`Submission:    ${env.SMTP_SUBMISSION_PORT}`);
    console.log(`Ingest webhook: ${env.WEBHOOK_BIND_HOST}:${env.WEBHOOK_PORT} (${env.SMTP_WEBHOOK_TOKEN ? 'token required' : 'open'})`);
    console.log(`Relay:         ${env.SMTP_RELAY_HOST ? `${env.SMTP_RELAY_HOST}:${env.SMTP_RELAY_PORT} (${env.SMTP_RELAY_USER || 'no auth'})` : 'direct MX delivery'}`);
    console.log(`Attachments:   ${env.ATTACHMENT_DIR}`);
    console.log('==============================================');

    await ensureStorage();

    await sql`SELECT 1`;
    console.log('Connected to PostgreSQL');

    await processDueEmails();

    await startMailServers();

    startWebhookServer();

    setInterval(() => {
        void processDueEmails().catch((err) => console.error('delivery tick error:', err));
    }, env.DELIVERY_INTERVAL_MS);

    setInterval(() => {
        void cleanupExpiredEmails().catch((err) => console.error('expiry cleanup error:', err));
    }, 30000);

    console.log('Mail server is running.');
}

boot().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
});