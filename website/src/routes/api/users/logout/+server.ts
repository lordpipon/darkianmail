import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteCode } from '$lib/server/jwt';

export const POST: RequestHandler = async ({ cookies, locals }) => {
    try {
        const token = cookies.get('auth_token');
        if (token && locals.user?.code) {
            await deleteCode(locals.user.code);
        }

        cookies.delete('auth_token', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

        return json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        return json({ success: false, message: 'Failed to logout' }, { status: 500 });
    }
};
