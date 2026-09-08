import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { sql } from '$lib/server/db';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

export async function POST({ request, locals }: RequestEvent) {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const body = await request.json();
    const currentPassword = body?.current_password;
    const newPassword = body?.new_password;
    const confirmPassword = body?.confirm_password;

    if (typeof currentPassword !== 'string' || !currentPassword) {
        throw error(400, 'Current password is required.');
    }
    if (typeof newPassword !== 'string' || !newPassword) {
        throw error(400, 'New password is required.');
    }
    if (typeof confirmPassword !== 'string' || !confirmPassword) {
        throw error(400, 'Password confirmation is required.');
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
        throw error(400, `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (newPassword !== confirmPassword) {
        throw error(400, 'New passwords do not match.');
    }

    const users = await sql`
        SELECT id, password_hash
        FROM users
        WHERE id = ${locals.user.id} AND deleted_at IS NULL
    `;
    const user = users[0];

    if (!user) {
        throw error(404, 'User not found.');
    }
    if (user.password_hash === 'DELETED_ACCOUNT') {
        throw error(400, 'Invalid current password.');
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
        throw error(400, 'Current password is incorrect.');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const currentCode = locals.user.code;

    await sql.begin(async (sql) => {
        await sql`
            UPDATE users
            SET password_hash = ${passwordHash}
            WHERE id = ${user.id}
        `;
        await sql`
            DELETE FROM user_secret_codes
            WHERE user_id = ${user.id} AND code != ${currentCode}
        `;
    });

    return json({ success: true });
}