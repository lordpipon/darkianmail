import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const draft = await request.json();

    if (!draft.body && !draft.htmlBody && !draft.subject && !draft.to) {
        return json({ error: 'Cannot save empty draft' }, { status: 400 });
    }

    const result = await sql`
        INSERT INTO email_drafts (user_id, to_address, subject, body, content_type, html_body, updated_at)
        VALUES (${locals.user.id}, ${draft.to}, ${draft.subject}, ${draft.body}, ${draft.contentType}, ${draft.htmlBody}, CURRENT_TIMESTAMP)
        RETURNING id
    `;

    return json({ id: result[0].id });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const draft = await request.json();

    if (!draft.id) {
        return json({ error: 'Draft ID is required for update' }, { status: 400 });
    }

    const result = await sql`
        UPDATE email_drafts
        SET 
            to_address = ${draft.to}, 
            subject = ${draft.subject}, 
            body = ${draft.body}, 
            content_type = ${draft.contentType}, 
            html_body = ${draft.htmlBody},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${draft.id} AND user_id = ${locals.user.id}
        RETURNING id
    `;

    if (result.length === 0) {
        return json({ error: 'Draft not found or unauthorized' }, { status: 404 });
    }

    return json({ id: result[0].id });
};

export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const drafts = await sql`
        SELECT * FROM email_drafts
        WHERE user_id = ${locals.user.id}
        ORDER BY updated_at DESC
    `;

    return json({ drafts });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const { id } = await request.json();

    await sql`
        DELETE FROM email_drafts
        WHERE id = ${id}
        AND user_id = ${locals.user.id}
    `;

    return json({ success: true });
};
