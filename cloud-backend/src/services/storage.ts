import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const endpoint = process.env.S3_ENDPOINT;
const bucket = process.env.S3_BUCKET;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const region = process.env.S3_REGION || 'auto';

export function isStorageConfigured(): boolean {
  return Boolean(
    bucket &&
    accessKeyId &&
    secretAccessKey &&
    !accessKeyId.includes('your_s3') &&
    !secretAccessKey.includes('your_s3')
  );
}

function getS3Client(): S3Client | null {
  if (!isStorageConfigured()) {
    return null;
  }

  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
    forcePathStyle: true, // Needed for Cloudflare R2, MinIO, and custom S3 endpoints
  });
}

export async function checkStorageHealth(): Promise<{
  configured: boolean;
  accessible: boolean;
  error?: string;
}> {
  if (!isStorageConfigured()) {
    return {
      configured: false,
      accessible: false,
      error: 'S3 credentials not configured in cloud-backend environment.',
    };
  }

  const s3 = getS3Client();
  if (!s3) {
    return { configured: false, accessible: false };
  }

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket! }));
    return { configured: true, accessible: true };
  } catch (err: any) {
    return {
      configured: true,
      accessible: false,
      error: err.message || 'Failed to connect to S3 bucket',
    };
  }
}

export async function uploadBackupFile(
  buffer: Buffer,
  key: string,
  contentType: string = 'application/x-sqlite3',
  metadata: Record<string, string> = {}
): Promise<{ success: boolean; key: string; url?: string; error?: string }> {
  if (!isStorageConfigured()) {
    return {
      success: false,
      key,
      error: 'Storage provider is not configured. Set S3 environment variables.',
    };
  }

  const s3 = getS3Client();
  if (!s3) {
    return { success: false, key, error: 'Could not initialize S3 client' };
  }

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket!,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
      })
    );

    // Generate a long-lived or pre-signed URL
    let url: string | undefined;
    try {
      const getCommand = new GetObjectCommand({ Bucket: bucket!, Key: key });
      url = await getSignedUrl(s3, getCommand, { expiresIn: 60 * 60 * 24 }); // 24 hours
    } catch {}

    return {
      success: true,
      key,
      url,
    };
  } catch (err: any) {
    return {
      success: false,
      key,
      error: err.message || 'Upload to S3 failed',
    };
  }
}

export async function getBackupDownloadStream(key: string): Promise<{
  success: boolean;
  stream?: any;
  contentType?: string;
  contentLength?: number;
  error?: string;
}> {
  if (!isStorageConfigured()) {
    return { success: false, error: 'Storage provider not configured' };
  }

  const s3 = getS3Client();
  if (!s3) return { success: false, error: 'Could not initialize S3 client' };

  try {
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: bucket!,
        Key: key,
      })
    );

    return {
      success: true,
      stream: res.Body,
      contentType: res.ContentType || 'application/octet-stream',
      contentLength: res.ContentLength,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to retrieve file from S3',
    };
  }
}

export async function getBackupSignedDownloadUrl(
  key: string,
  expiresInSeconds: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!isStorageConfigured()) {
    return { success: false, error: 'Storage provider not configured' };
  }

  const s3 = getS3Client();
  if (!s3) return { success: false, error: 'Could not initialize S3 client' };

  try {
    const command = new GetObjectCommand({ Bucket: bucket!, Key: key });
    const url = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
    return { success: true, url };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to sign URL' };
  }
}
