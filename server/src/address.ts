export interface ParsedAddress {
    local: string;
    domain: string;
}

const LOCAL_PART = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_PART = /^(xn--[a-z0-9-]+|[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)(\.(xn--[a-z0-9-]+|[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?))*$/;

export function parseAddress(address: string): ParsedAddress | null {
    if (!address || typeof address !== 'string') return null;
    const cleaned = address.trim().toLowerCase();
    if (cleaned.length > 254) return null;

    const at = cleaned.lastIndexOf('@');
    if (at <= 0 || at === cleaned.length - 1) return null;

    const local = cleaned.slice(0, at);
    const domain = cleaned.slice(at + 1);

    if (local.length > 64) return null;
    if (!LOCAL_PART.test(local)) return null;
    if (!DOMAIN_PART.test(domain)) return null;

    return { local, domain };
}

export function isValidAddress(address: string): boolean {
    return parseAddress(address) !== null;
}

export function buildAddress(local: string, domain: string): string {
    return `${local}@${domain}`;
}