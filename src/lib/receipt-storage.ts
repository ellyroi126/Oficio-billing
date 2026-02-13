import { uploadToR2, deleteFromR2, getKeyFromUrl, getFromR2 } from './r2-storage'

// Generate receipt filename
export function generateReceiptFilename(receiptNumber: string): string {
  return `${receiptNumber}.pdf`
}

// Save receipt file to R2 and return the public URL
export async function saveReceiptFile(
  filename: string,
  buffer: Buffer
): Promise<string> {
  const key = `payments/receipts/${filename}`
  return await uploadToR2(key, buffer, 'application/pdf')
}

// Get receipt file from R2
export async function getReceiptFile(filePath: string): Promise<Buffer> {
  const key = getKeyFromUrl(filePath)
  return await getFromR2(key)
}

// Delete receipt file from R2
export async function deleteReceiptFile(filePath: string): Promise<void> {
  try {
    const key = getKeyFromUrl(filePath)
    await deleteFromR2(key)
  } catch (error) {
    console.error('Error deleting receipt file:', error)
  }
}
