import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
    // Redirect to home if already logged in
    if (locals.user) {
        throw redirect(303, '/inbox');
    }
};
