import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { sql } from '$lib/server/db';
import { exportStore } from '$lib/server/exportStore';

export async function GET({ locals, url }: RequestEvent) {
    if (!locals.user) throw error(401);
    const status = exportStore.get(locals.user.id);
    if (!status) return json({ status: 'none' });

    if (url.searchParams.get('action') === 'download' && status.blob) {
        return new Response(status.blob, {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': 'attachment; filename="user-data.json"'
            }
        });
    }

    return json({
        status: status.blob ? 'completed' : 'processing',
        progress: status.progress
    });
}

export async function POST({ locals }: RequestEvent) {
    if (!locals.user) throw error(401);
    if (!exportStore.canExport(locals.user.id)) {
        throw error(429, 'Please wait 12 hours between exports');
    }

    const userId = locals.user.id;
    const userEmail = `${locals.user.username}@${locals.user.domain}`;
    const initialExportTime = Date.now();

    exportStore.set(userId, { progress: 0, lastExport: initialExportTime });

    (async () => {
        try {
            const dataToExport: Record<string, any> = {};

            await new Promise(resolve => setTimeout(resolve, 1500));
            const emails = await sql`
                SELECT * FROM emails WHERE from_address = ${userEmail} OR to_address = ${userEmail}
            `;
            dataToExport.emails = emails;
            exportStore.set(userId, { progress: 40, lastExport: initialExportTime });

            await new Promise(resolve => setTimeout(resolve, 1500));
            const emailIds = emails.map(e => e.id);
            const attachments = emailIds.length ? await sql`
                SELECT * FROM attachments WHERE email_id IN ${sql(emailIds)}
            ` : [];
            dataToExport.attachments = attachments;
            exportStore.set(userId, { progress: 70, lastExport: initialExportTime });

            await new Promise(resolve => setTimeout(resolve, 1000));
            const [settings, contacts] = await Promise.all([
                sql`SELECT * FROM user_settings WHERE user_id = ${userId}`,
                sql`SELECT * FROM contacts WHERE user_id = ${userId}`
            ]);
            dataToExport.settings = settings[0] || {};
            dataToExport.contacts = contacts;

            const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
                type: 'application/json'
            });
            exportStore.set(userId, { progress: 100, lastExport: initialExportTime, blob });
        } catch (err) {
            console.error("Error during background data export:", err);
            exportStore.set(userId, { progress: 0, lastExport: initialExportTime });
        }
    })();

    return json({ status: 'processing', progress: 0 });
}
