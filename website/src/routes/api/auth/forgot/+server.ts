import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requestPasswordReset } from '$lib/server/password-reset';

export const POST: RequestHandler = async ({ request }) => {
    let body;
    try {
        body = await request.json();
    } catch {
        return json({ success: true });
    }

    const identifier = typeof body?.email_or_username === 'string' ? body.email_or_username.trim() : '';
    if (!identifier) {
        return json({ success: true });
    }

    await requestPasswordReset(identifier);

    // Always return success so we don't reveal whether an account exists.
    return json({ success: true });
};