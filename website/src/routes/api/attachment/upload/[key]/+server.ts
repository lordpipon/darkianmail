import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uploadObject } from '$lib/server/s3';

export const PUT: RequestHandler = async ({ request, params, locals }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const key = params.key;
    if (!key) {
        return json({ error: 'Missing attachment key' }, { status: 400 });
    }

    try {
        const buffer = Buffer.from(await request.arrayBuffer());
        if (buffer.byteLength > 25 * 1024 * 1024) {
            return json({ error: 'File too large' }, { status: 400 });
        }
        const contentType = request.headers.get('content-type') || 'application/octet-stream';
        await uploadObject(key, buffer, contentType);
        return new Response(null, { status: 201 });
    } catch (err) {
        console.error('Attachment upload failed:', err);
        return json({ error: 'Upload failed' }, { status: 500 });
    }
};