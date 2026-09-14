import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  customDomain: string; // e.g. https://media.yourdomain.com
}

export function getR2Client(config: R2Config) {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/**
 * Uploads a buffer directly to R2 and returns the public URL.
 */
export async function uploadToR2(
  config: R2Config,
  filename: string,
  buffer: ArrayBuffer | Buffer,
  contentType: string
): Promise<string> {
  const client = getR2Client(config);
  
  // Ensure the body is a format accepted by AWS SDK v3 in Node.js (Uint8Array or Buffer)
  const body = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: filename,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);

  const domain = config.customDomain.endsWith('/') ? config.customDomain.slice(0, -1) : config.customDomain;
  return `${domain}/${filename}`;
}

/**
 * Generates a pre-signed URL for direct frontend uploads.
 */
export async function getR2SignedUrl(
  config: R2Config,
  filename: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<{ signedUrl: string; publicUrl: string }> {
  const client = getR2Client(config);
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: filename,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(client, command, { expiresIn });
  
  const domain = config.customDomain.endsWith('/') ? config.customDomain.slice(0, -1) : config.customDomain;
  const publicUrl = `${domain}/${filename}`;

  return { signedUrl, publicUrl };
}
