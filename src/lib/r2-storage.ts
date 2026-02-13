import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

// Initialize R2 client (S3-compatible)
const r2Client = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    })
  : null

const BUCKET_NAME = process.env.R2_BUCKET_NAME || ''
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '' // Your R2 public domain (e.g., https://files.yourdomain.com)

// Check if R2 is configured
export function isR2Configured(): boolean {
  return !!(r2Client && BUCKET_NAME && PUBLIC_URL)
}

// Upload file to R2 and return public URL
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (!r2Client) {
    throw new Error('R2 client not configured')
  }

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  )

  // Return public URL
  return `${PUBLIC_URL}/${key}`
}

// Get file from R2
export async function getFromR2(key: string): Promise<Buffer> {
  if (!r2Client) {
    throw new Error('R2 client not configured')
  }

  const response = await r2Client.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  )

  if (!response.Body) {
    throw new Error('File not found in R2')
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = []
  for await (const chunk of response.Body as any) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

// Delete file from R2
export async function deleteFromR2(key: string): Promise<void> {
  if (!r2Client) {
    throw new Error('R2 client not configured')
  }

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  )
}

// Helper: Extract R2 key from public URL
export function getKeyFromUrl(url: string): string {
  // URL format: https://files.yourdomain.com/invoices/CLIENT/file.pdf
  // Extract: invoices/CLIENT/file.pdf
  if (url.startsWith(PUBLIC_URL)) {
    return url.replace(`${PUBLIC_URL}/`, '')
  }
  // If it's already just a key, return as is
  return url
}
