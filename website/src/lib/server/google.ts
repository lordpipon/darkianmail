import { createRemoteJWKSet, jwtVerify } from 'jose';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$env/static/private';
import { randomBytes, createHash } from 'node:crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export function googleEnabled(): boolean {
    return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

function base64url(input: string | Buffer): string {
    return Buffer.from(input).toString('base64url');
}

export function generateOAuthState(): { state: string; verifier: string; challenge: string } {
    const state = randomBytes(24).toString('hex');
    const verifier = randomBytes(32).toString('base64url');
    const challenge = base64url(createHash('sha256').update(verifier).digest());
    return { state, verifier, challenge };
}

export function buildGoogleAuthUrl(opts: {
    state: string;
    challenge: string;
    mode: 'login' | 'link';
    redirectUri: string;
    prompt?: 'select_account';
}): string {
    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: opts.redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state: JSON.stringify({ s: opts.state, m: opts.mode }),
        code_challenge: opts.challenge,
        code_challenge_method: 'S256',
        nonce: randomBytes(16).toString('hex'),
        access_type: 'offline',
        prompt: opts.prompt ?? 'select_account'
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type GoogleProfile = {
    sub: string;
    email: string;
    name?: string | null;
    email_verified?: boolean;
};

export async function exchangeGoogleCode(opts: {
    code: string;
    verifier: string;
    redirectUri: string;
}): Promise<GoogleProfile> {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code: opts.code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: opts.redirectUri,
            grant_type: 'authorization_code',
            code_verifier: opts.verifier
        })
    });

    if (!tokenResponse.ok) {
        const body = await tokenResponse.text();
        throw new Error(`Google token exchange failed: ${tokenResponse.status} ${body}`);
    }

    const tokenData = await tokenResponse.json();
    const { id_token } = tokenData as { id_token?: string };
    if (!id_token) {
        throw new Error('Google response did not include an id_token.');
    }

    if (!jwks) {
        jwks = createRemoteJWKSet(new URL(GOOGLE_CERTS_URL));
    }

    try {
        const { payload } = await jwtVerify(id_token, jwks, {
            algorithms: ['RS256'],
            issuer: 'https://accounts.google.com',
            audience: GOOGLE_CLIENT_ID
        });

        return {
            sub: payload.sub as string,
            email: payload.email as string,
            name: (payload.name as string) ?? null,
            email_verified: payload.email_verified as boolean | undefined
        };
    } catch (err) {
        console.error('Google id_token verification failed:', err);
        throw new Error('Could not verify Google sign-in.');
    }
}