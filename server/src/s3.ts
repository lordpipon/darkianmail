import { S3Client, HeadBucketCommand, CreateBucketCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from './env.js';

export const s3 = new S3Client({
    endpoint: env.PRIVATE_S3_ENDPOINT,
    region: env.PRIVATE_S3_REGION,
    forcePathStyle: true,
    credentials: {
        accessKeyId: env.PRIVATE_S3_ACCESS_KEY,
        secretAccessKey: env.PRIVATE_S3_SECRET_KEY
    }
});

let bucketReady = false;

export async function ensureBucket(): Promise<void> {
    if (bucketReady) return;
    try {
        await s3.send(new HeadBucketCommand({ Bucket: env.PRIVATE_S3_BUCKET }));
    } catch {
        await s3.send(new CreateBucketCommand({ Bucket: env.PRIVATE_S3_BUCKET }));
    }
    bucketReady = true;
}

export async function uploadObject(key: string, data: Buffer, contentType: string): Promise<void> {
    await ensureBucket();
    await s3.send(new PutObjectCommand({
        Bucket: env.PRIVATE_S3_BUCKET,
        Key: key,
        Body: data,
        ContentType: contentType
    }));
}

export async function getObject(key: string): Promise<Buffer> {
    const res = await s3.send(new GetObjectCommand({ Bucket: env.PRIVATE_S3_BUCKET, Key: key }));
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
}