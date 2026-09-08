// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

type UserSessionData = {
	id: number;
	username: string;
	domain: string;
	is_banned: boolean;
	created_at: string;
	iq: number;
	is_admin: boolean;
	code: string;
} | null;

declare global {
	namespace App {
		interface Locals {
			user: UserSessionData;
		}
	}
}

export { };
