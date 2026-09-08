export interface Contact {
    id: number;
    full_name: string;
    email_address: string;
    tag: string | null;
    created_at: string;
    updated_at: string;
}

export interface NewContact {
    fullName: string;
    email: string;
    tag?: string;
}
