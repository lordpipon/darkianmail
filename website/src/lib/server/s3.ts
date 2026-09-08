import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PRIVATE_S3_ACCESS_KEY, PRIVATE_S3_BUCKET, PRIVATE_S3_ENDPOINT, PRIVATE_S3_REGION, PRIVATE_S3_SECRET_KEY } from '$env/static/private';

const s3Client = new S3Client({
    endpoint: PRIVATE_S3_ENDPOINT,
    region: PRIVATE_S3_REGION,
    forcePathStyle: true,
    credentials: {
        accessKeyId: PRIVATE_S3_ACCESS_KEY,
        secretAccessKey: PRIVATE_S3_SECRET_KEY
    }
});

let bucketReady = false;

export async function ensureBucket(): Promise<void> {
    if (bucketReady) return;
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: PRIVATE_S3_BUCKET }));
    } catch {
        await s3Client.send(new CreateBucketCommand({ Bucket: PRIVATE_S3_BUCKET }));
    }
    bucketReady = true;
}

export async function uploadObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await ensureBucket();
    await s3Client.send(new PutObjectCommand({
        Bucket: PRIVATE_S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType
    }));
}

export async function generatePresignedUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: PRIVATE_S3_BUCKET,
        Key: key,
        ContentType: contentType
    });

    return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
}

export async function deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
        Bucket: PRIVATE_S3_BUCKET,
        Key: key
    });

    await s3Client.send(command);
}

export async function generateDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: PRIVATE_S3_BUCKET,
        Key: key
    });

    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export { s3Client };