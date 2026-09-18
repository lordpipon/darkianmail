import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resetPasswordWithCode } from '$lib/server/password-reset';

const MIN_PASSWORD_LENGTH = 8;

export const POST: RequestHandler = async ({ request }) => {
    let body;
    try {
        body = await request.json();
    } catch {
        throw error(400, 'Invalid request.');
    }

    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const confirm = typeof body?.confirm === 'string' ? body.confirm : '';

    if (!code) throw error(400, 'Missing reset code.');
    if (!password) throw error(400, 'New password is required.');
    if (password.length < MIN_PASSWORD_LENGTH) {
        throw error(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (password !== confirm) throw error(400, 'Passwords do not match.');

    const result = await resetPasswordWithCode(code, password);
    if (!result.success) {
        throw error(400, result.error ?? 'Could not reset password.');
    }

    return json({ success: true });
};