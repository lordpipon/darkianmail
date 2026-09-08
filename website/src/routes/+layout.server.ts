import { checkAuth } from "$lib/auth";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
    const user = checkAuth(event);
    return { user };
};
