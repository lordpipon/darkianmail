import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { sql } from '$lib/server/db';

export async function GET({ locals }: RequestEvent) {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const settings = await sql`
        SELECT notifications_enabled 
        FROM user_settings 
        WHERE user_id = ${locals.user.id}
    `;

    return json(settings[0] || { notifications_enabled: false });
}

export async function POST({ request, locals }: RequestEvent) {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const settings = await request.json();

    await sql`
        INSERT INTO user_settings (user_id, notifications_enabled)
        VALUES (${locals.user.id}, ${settings.notifications_enabled})
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            notifications_enabled = ${settings.notifications_enabled},
            updated_at = CURRENT_TIMESTAMP
    `;

    return json({ success: true });
}

export async function DELETE({ locals }: RequestEvent) {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const userId = locals.user.id;

    await sql.begin(async (sql) => {
        await sql`DELETE FROM user_settings WHERE user_id = ${userId}`;
        await sql`DELETE FROM user_secret_codes WHERE user_id = ${userId}`;
        await sql`DELETE FROM email_stars WHERE user_id = ${userId}`;
        await sql`DELETE FROM email_drafts WHERE user_id = ${userId}`;
        await sql`DELETE FROM contacts WHERE user_id = ${userId}`;
        await sql`DELETE FROM user_storage_limits WHERE user_id = ${userId}`;

        await sql`
            UPDATE users 
            SET deleted_at = NOW(),
                password_hash = 'DELETED_ACCOUNT', 
                iq = NULL
            WHERE id = ${userId} AND deleted_at IS NULL
        `;
    });

    return json({ success: true });
}
