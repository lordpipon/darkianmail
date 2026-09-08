const BLOCKED_TERMS: string[] = [];

export function checkHardcore(value: string): boolean {
    const lower = value.toLowerCase();
    return BLOCKED_TERMS.some((term) => lower.includes(term));
}