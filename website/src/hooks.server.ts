import type { Handle } from '@sveltejs/kit';
import { deleteCode, verifyAuthJWT } from '$lib/server/jwt';
import { sql } from '$lib/server/db';
import { PUBLIC_DOMAIN } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
    const token = event.cookies.get('auth_token');
    event.locals.user = null;

    if (token) {
        const payload = await verifyAuthJWT(token);
        if (payload) {
            try {
                const users = await sql`
                    SELECT id, username, domain, is_banned, created_at, iq, is_admin 
                    FROM users 
                    WHERE id = ${payload.userId} AND deleted_at IS NULL
                `;
                const dbUser = users[0];

                if (dbUser) {
                    event.locals.user = {
                        id: dbUser.id,
                        username: dbUser.username,
                        domain: dbUser.domain || PUBLIC_DOMAIN,
                        is_banned: dbUser.is_banned,
                        created_at: dbUser.created_at.toISOString(),
                        iq: dbUser.iq,
                        is_admin: dbUser.is_admin,
                        code: payload.code
                    };
                } else {
                    await deleteCode(payload.code);
                    event.cookies.delete('auth_token', { path: '/' });
                }
            } catch (error) {
                event.cookies.delete('auth_token', { path: '/' });
            }
        } else {
            event.cookies.delete('auth_token', { path: '/' });
        }
    }

    return await resolve(event);
};