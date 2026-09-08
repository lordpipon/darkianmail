import { error, json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateDownloadUrl } from '$lib/server/s3';
import { sql } from '$lib/server/db';
import { nanoid } from 'nanoid';
import { ALLOWED_TYPES } from '$lib/types/attachment';

const ONE_GB = 1024 * 1024 * 1024; // 1GB in bytes

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const { filename, size, type } = await request.json();

    if (!filename || !size || !type) {
        return json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (size > 25 * 1024 * 1024) { // 25MB
        return json({ error: 'File too large' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(type)) {
        return json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Check user's storage limit
    const [currentUsage] = await sql`
        SELECT calculate_user_storage(${locals.user.id}) as usage
    `;

    const usage = Number(currentUsage?.usage || 0);
    
    if (usage + size > ONE_GB) {
        return json({ 
            error: 'Storage limit exceeded', 
            usage,
            limit: ONE_GB,
            available: ONE_GB - usage 
        }, { status: 400 });
    }

    const key = `attachments/${nanoid()}-${filename}`;
    const userId = locals.user.id;

    await sql`
        INSERT INTO attachments (user_id, key, filename, size, type) 
        VALUES (${userId}, ${key}, ${filename}, ${size}, ${type})`;

    const uploadUrl = `/api/attachment/upload/${encodeURIComponent(key)}`;
    return json({ uploadUrl, key });
};

export const GET: RequestHandler = async ({ locals, url }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const key = url.searchParams.get('key');
    if (!key) {
        throw error(400, 'Missing key parameter');
    }

    try {
        const userEmail = `${locals.user.username}@${locals.user.domain}`;
        const attachment = await sql`
            SELECT a.id 
            FROM attachments a
            LEFT JOIN emails e ON a.email_id = e.id
            WHERE a.key = ${key}
            AND (
                a.user_id = ${locals.user.id}
                OR (
                    e.id IS NOT NULL 
                    AND (e.from_address = ${userEmail} OR e.to_address = ${userEmail})
                )
            )
        `;

        if (!attachment?.length) {
            throw error(404, 'Attachment not found or access denied');
        }

        const signedUrl = await generateDownloadUrl(key);
        throw redirect(302, signedUrl);

    } catch (err) {
        if (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number' && err.status >= 300) {
            throw err;
        }
        throw error(500, 'Failed to process attachment request');
    }
};
