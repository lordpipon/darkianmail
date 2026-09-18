import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildGoogleAuthUrl, generateOAuthState, googleEnabled } from '$lib/server/google';

export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) {
        throw redirect(303, '/login');
    }
    if (!googleEnabled()) {
        throw redirect(303, '/settings?error=google_disabled');
    }

    const { state, verifier, challenge } = generateOAuthState();
    const redirectUri = `${url.origin}/auth/google/callback`;
    const authUrl = buildGoogleAuthUrl({ state, challenge, mode: 'link', redirectUri });

    const stateCookie = JSON.stringify({ s: state, v: verifier });
    return new Response(null, {
        status: 302,
        headers: {
            Location: authUrl,
            'Set-Cookie': `oauth_state=${encodeURIComponent(stateCookie)}; Path=/; Max-Age=600; ${
                process.env.NODE_ENV === 'production' ? 'Secure;' : ''
            } SameSite=Lax`
        }
    });
};