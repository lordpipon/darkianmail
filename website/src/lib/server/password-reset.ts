import bcrypt from 'bcryptjs';
import { sql } from '$lib/server/db';
import { generateSecureCode } from '$lib/server/jwt';
import { sendTransactionalEmail } from '$lib/server/mailer';
import { PUBLIC_DOMAIN } from '$env/static/public';

const RESET_CODE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const SALT_ROUNDS = 10;

export async function requestPasswordReset(input: string): Promise<boolean> {
    const identifier = input.toLowerCase().split('@')[0];
    if (!identifier) return false;

    const users = await sql`
        SELECT id, username, recovery_email
        FROM users
        WHERE username = ${identifier} AND deleted_at IS NULL
    `;
    const user = users[0];
    if (!user) return false;

    const destination = user.recovery_email;

    // If the user never set a recovery email, silently do nothing (anti-enumeration).
    if (!destination) return false;

    const code = generateSecureCode(24);
    await sql`
        INSERT INTO password_reset_tokens (code, user_id, expires_at)
        VALUES (${code}, ${user.id}, NOW() + (${RESET_CODE_EXPIRY_MS}::bigint * interval '1 millisecond'))
    `;

    const resetUrl = `https://mail.${PUBLIC_DOMAIN}/auth/reset-password?code=${code}`;
    try {
        await sendTransactionalEmail({
            to: destination,
            subject: 'Reset your Darkian Mail password',
            text: `You requested a password reset for your Darkian Mail account.\n\nOpen this link within the next hour to choose a new password:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
            html: `<p>You requested a password reset for your Darkian Mail account.</p><p>Open this link within the next hour to choose a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can safely ignore this email.</p>`
        });
    } catch (err) {
        console.error('Failed to send password reset email:', err);
        await sql`DELETE FROM password_reset_tokens WHERE code = ${code}`;
        return false;
    }

    return true;
}

export async function resetPasswordWithCode(
    code: string,
    newPassword: string
): Promise<{ success: boolean; error?: string }> {
    const tokens = await sql`
        SELECT user_id
        FROM password_reset_tokens
        WHERE code = ${code} AND expires_at > NOW()
    `;
    const token = tokens[0];
    if (!token) {
        return { success: false, error: 'This reset link is invalid or has expired.' };
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await sql.begin(async (tx) => {
        await tx`
            UPDATE users SET password_hash = ${passwordHash} WHERE id = ${token.user_id}
        `;
        await tx`
            DELETE FROM password_reset_tokens WHERE user_id = ${token.user_id}
        `;
        await tx`
            DELETE FROM user_secret_codes WHERE user_id = ${token.user_id}
        `;
    });

    return { success: true };
}