import { randomUUID } from 'node:crypto';
import { ensureBucket, uploadObject, getObject } from './s3.js';

export async function ensureStorage(): Promise<void> {
    await ensureBucket();
}

export async function saveAttachment(
    data: Buffer,
    filename: string
): Promise<{ key: string }> {
    const safeFilename = filename.replace(/[^\w.\- ]+/g, '_').slice(0, 120);
    const key = `attachments/${randomUUID()}-${safeFilename}`;
    await uploadObject(key, data, 'application/octet-stream');
    return { key };
}

export async function getAttachmentBuffer(key: string): Promise<Buffer> {
    return getObject(key);
}