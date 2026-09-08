import { SignJWT, jwtVerify } from 'jose';
import { JWT_SECRET } from '$env/static/private';
import { sql } from '$lib/server/db';
import crypto from 'crypto';

const secret = new TextEncoder().encode(JWT_SECRET);
const alg = 'HS256';

export type JWTPayload = {
    userId: number;
    code: string;
};

export function generateSecureCode(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

export async function createAuthJWT(payload: Omit<JWTPayload, 'code'>, expiresIn: string | number | Date = '7d'): Promise<{ token: string; code: string }> {
    const users = await sql`SELECT id, is_banned FROM users WHERE id = ${payload.userId}`;
    const user = users[0];

    if (!user) {
        throw new Error("User not found.");
    }
    if (user.is_banned) {
        throw new Error("User is banned and cannot create a new token.");
    }

    const code = generateSecureCode();
    const jwtPayload: JWTPayload = { ...payload, code };

    const token = await new SignJWT(jwtPayload)
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(secret);

    return { token, code };
}

export async function verifyAuthJWT(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify<JWTPayload>(token, secret, {
            algorithms: [alg]
        });

        const codes = await sql`
            SELECT user_id FROM user_secret_codes WHERE code = ${payload.code}
        `;

        if (codes.length === 0) {
            console.warn(`JWT verification failed: Code ${payload.code} not found in DB.`);
            return null;
        }

        const users = await sql`SELECT is_banned FROM users WHERE id = ${payload.userId}`;
        if (users[0]?.is_banned) {
            console.warn(`JWT verification failed: User ${payload.userId} is banned.`);

            await deleteCode(payload.code);
            return null;
        }

        return payload;
    } catch (err: any) {
        if (err.code === 'ERR_JWT_EXPIRED') {
            console.log('JWT expired');
        } else {
            console.error('JWT verification error:', err.message);
        }
        return null;
    }
}

export async function storeCode(userId: number, code: string, ip?: string, userAgent?: string): Promise<void> {
    await sql`
        INSERT INTO user_secret_codes (code, user_id, ip, user_agent)
        VALUES (${code}, ${userId}, ${ip ?? null}, ${userAgent ?? null})
    `;
}

export async function deleteCode(code: string): Promise<void> {
    await sql`
        DELETE FROM user_secret_codes WHERE code = ${code}
    `;
}

export async function deleteAllCodesForUser(userId: number): Promise<void> {
    await sql`
        DELETE FROM user_secret_codes WHERE user_id = ${userId}
    `;
}
