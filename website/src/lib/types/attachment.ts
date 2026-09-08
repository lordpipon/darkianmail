export const MAX_FILES = 10;

export const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
] as const;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'] as const;

export type AllowedType = typeof ALLOWED_TYPES[number];
export type ImageType = typeof IMAGE_TYPES[number];