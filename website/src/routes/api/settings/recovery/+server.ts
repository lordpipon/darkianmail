import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { sendTransactionalEmail } from '$lib/server/mailer';
import { PUBLIC_DOMAIN } from '$env/static/public';

const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user) throw error(401, 'Unauthorized');

    const users = await sql`
        SELECT recovery_email FROM users WHERE id = ${locals.user.id}
    `;
    const google = await sql`
        SELECT google_email FROM google_links WHERE user_id = ${locals.user.id}
    `;

    return json({
        recovery_email: users[0]?.recovery_email ?? null,
        google_linked: google.length > 0,
        google_email: google[0]?.google_email ?? null
    });
};

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) throw error(401, 'Unauthorized');

    let body;
    try {
        body = await request.json();
    } catch {
        throw error(400, 'Invalid request.');
    }

    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!EMAIL_PATTERN.test(email)) {
        throw error(400, 'Invalid recovery email address.');
    }

    await sql`
        UPDATE users SET recovery_email = ${email} WHERE id = ${locals.user.id}
    `;

    try {
        await sendTransactionalEmail({
            to: email,
            subject: 'Recovery email confirmed',
            text: `This address is now set as the recovery email for ${locals.user.username}@${PUBLIC_DOMAIN}. We will send password reset links here.`,
            html: `<p>This address is now set as the recovery email for <strong>${locals.user.username}@${PUBLIC_DOMAIN}</strong>.</p><p>We will send password reset links here.</p>`
        });
    } catch (err) {
        console.error('Failed to send recovery confirmation email:', err);
    }

    return json({ success: true, recovery_email: email });
};