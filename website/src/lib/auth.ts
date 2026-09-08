import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";

export function requireAuth(event: RequestEvent) {
    if (!event.locals.user) {
        throw redirect(303, '/login');
    }
    return event.locals.user;
}

export function checkAuth(event: RequestEvent) {
    const isPublicRoute = event.route.id === '/' || 
                         event.route.id?.startsWith('/(auth)') ||
                         event.route.id?.startsWith('/legal');
    
    if (!isPublicRoute) {
        return requireAuth(event);
    }
    return event.locals.user;
}
