import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';

export const sql = postgres(DATABASE_URL);