import { uploadToR2, deleteFromR2, getKeyFromUrl } from './r2-storage'
import * as path from 'path'

export function generateEvidenceFilename(paymentId: string, originalFilename: string): string {
  const ext = path.extname(originalFilename)
  const timestamp = Date.now()
  return `${paymentId}-${timestamp}${ext}`
}

export async function saveEvidenceFile(filename: string, buffer: Buffer): Promise<string> {
  const key = `payments/evidence/${filename}`

  // Determine content type from extension
  let contentType = 'application/octet-stream'
  if (filename.endsWith('.pdf')) {
    contentType = 'application/pdf'
  } else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
    contentType = 'image/jpeg'
  } else if (filename.endsWith('.png')) {
    contentType = 'image/png'
  } else if (filename.endsWith('.gif')) {
    contentType = 'image/gif'
  }

  return await uploadToR2(key, buffer, contentType)
}

export async function deleteEvidenceFile(filePath: string): Promise<void> {
  try {
    const key = getKeyFromUrl(filePath)
    await deleteFromR2(key)
  } catch (error) {
    console.error('Error deleting evidence file:', error)
  }
}
