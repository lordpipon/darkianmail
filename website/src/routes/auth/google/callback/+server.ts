import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { exchangeGoogleCode, googleEnabled } from '$lib/server/google';
import { createAuthJWT, storeCode, deleteAllCodesForUser } from '$lib/server/jwt';
import { PUBLIC_DOMAIN } from '$env/static/public';
import bcrypt from 'bcryptjs';

function errorRedirect(message: string): never {
    throw redirect(303, `/login?error=${encodeURIComponent(message)}`);
}

function sendAuthCookie(event: { cookies: any }, token: string) {
    event.cookies.set('auth_token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
    });
}

export const GET: RequestHandler = async ({ url, request, cookies, locals }) => {
    if (!googleEnabled()) {
        errorRedirect('google_disabled');
    }

    const oauthCode = url.searchParams.get('code');
    if (!oauthCode) {
        errorRedirect('google_cancelled');
    }

    const rawState = url.searchParams.get('state');
    const stateCookie = cookies.get('oauth_state');
    const { s: expectedState, v: verifier } = stateCookie ? JSON.parse(stateCookie) : { s: null, v: null };

    if (!rawState || !expectedState) {
        errorRedirect('google_expired');
    }

    let parsedState: { s?: string; m?: string } = {};
    try {
        parsedState = JSON.parse(rawState);
    } catch {
        errorRedirect('google_expired');
    }

    if (parsedState.s !== expectedState || !verifier) {
        errorRedirect('google_expired');
    }

    cookies.delete('oauth_state', { path: '/' });

    let profile;
    try {
        const redirectUri = `${url.origin}/auth/google/callback`;
        profile = await exchangeGoogleCode({ code: oauthCode, verifier, redirectUri });
    } catch (err) {
        console.error('Google callback exchange failed:', err);
        errorRedirect('google_cancelled');
    }

    const mode = parsedState.m === 'link' ? 'link' : 'login';

    if (mode === 'link') {
        if (!locals.user) {
            errorRedirect('please_login');
        }

        const alreadyLinked = await sql`
            SELECT user_id FROM google_links WHERE google_sub = ${profile.sub}
        `;
        if (alreadyLinked.length > 0 && alreadyLinked[0].user_id !== locals.user.id) {
            errorRedirect('google_already_linked');
        }

        await sql`
            INSERT INTO google_links (user_id, google_sub, google_email)
            VALUES (${locals.user.id}, ${profile.sub}, ${profile.email})
            ON CONFLICT (user_id) DO UPDATE
            SET google_sub = EXCLUDED.google_sub, google_email = EXCLUDED.google_email
        `;

        throw redirect(303, '/settings?google=linked');
    }

    // ---- Login mode ----
    const linked = await sql`
        SELECT user_id FROM google_links WHERE google_sub = ${profile.sub}
    `;

    let userId: number;

    if (linked.length > 0) {
        userId = linked[0].user_id;
    } else {
        let baseUsername = (profile.email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_.]/gi, '').slice(0, 20);
        if (!baseUsername) baseUsername = 'user';

        const available = await sql`
            SELECT username FROM users WHERE username IN (
                SELECT unnest(${buildUsernameCandidates(baseUsername)}::text[])
            ) AND deleted_at IS NULL
        `;
        const taken = new Set(available.map((r) => r.username));
        let username = baseUsername;
        for (let i = 1; taken.has(username) && i < 100; i++) {
            username = `${baseUsername}${i}`;
        }

        const passwordHash = await bcrypt.hash(Math.random().toString(36).slice(2) + Date.now(), 10);

        const [newUser] = await sql`
            INSERT INTO users (username, password_hash, domain, recovery_email)
            VALUES (${username}, ${passwordHash}, ${PUBLIC_DOMAIN}, ${profile.email})
            RETURNING id
        `;
        userId = newUser.id;

        await sql`
            INSERT INTO google_links (user_id, google_sub, google_email)
            VALUES (${userId}, ${profile.sub}, ${profile.email})
        `;
    }

    const users = await sql`
        SELECT is_banned FROM users WHERE id = ${userId} AND deleted_at IS NULL
    `;
    if (!users.length || users[0].is_banned) {
        errorRedirect('banned');
    }

    await deleteAllCodesForUser(userId);
    const { token, code: sessionCode } = await createAuthJWT({ userId });
    await storeCode(userId, sessionCode, request.headers.get('x-forwarded-for')?.split(',')[0] ?? undefined);

    sendAuthCookie({ cookies }, token);

    throw redirect(303, '/inbox');
};

function buildUsernameCandidates(base: string): string[] {
    const candidates = [base];
    for (let i = 1; i < 50; i++) candidates.push(`${base}${i}`);
    return candidates;
}