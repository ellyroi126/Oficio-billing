import fs from 'fs/promises'
import path from 'path'

const PAYMENTS_DIR = path.join(process.cwd(), 'public', 'payments')
const RECEIPTS_DIR = path.join(PAYMENTS_DIR, 'receipts')

// Ensure the receipts directory exists
async function ensureReceiptsDir() {
  try {
    await fs.mkdir(RECEIPTS_DIR, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }
}

// Generate receipt filename
export function generateReceiptFilename(receiptNumber: string): string {
  return `${receiptNumber}.pdf`
}

// Save receipt file and return the public URL path
export async function saveReceiptFile(
  filename: string,
  buffer: Buffer
): Promise<string> {
  await ensureReceiptsDir()

  const filePath = path.join(RECEIPTS_DIR, filename)
  await fs.writeFile(filePath, buffer)

  // Return the public URL path
  return `/payments/receipts/${filename}`
}

// Get receipt file as buffer
export async function getReceiptFile(filePath: string): Promise<Buffer> {
  // Remove leading slash and construct full path
  const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath
  const fullPath = path.join(process.cwd(), 'public', relativePath)

  return fs.readFile(fullPath)
}

// Delete receipt file
export async function deleteReceiptFile(filePath: string): Promise<void> {
  try {
    const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath
    const fullPath = path.join(process.cwd(), 'public', relativePath)
    await fs.unlink(fullPath)
  } catch (error) {
    // File might not exist
    console.error('Error deleting receipt file:', error)
  }
}

// Check if receipt file exists
export async function receiptFileExists(filePath: string): Promise<boolean> {
  try {
    const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath
    const fullPath = path.join(process.cwd(), 'public', relativePath)
    await fs.access(fullPath)
    return true
  } catch {
    return false
  }
}
