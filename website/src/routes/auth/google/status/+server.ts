import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { googleEnabled } from '$lib/server/google';

export const GET: RequestHandler = async () => {
    return json({ enabled: googleEnabled() });
};