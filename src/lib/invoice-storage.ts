import fs from 'fs/promises'
import path from 'path'

const INVOICES_DIR = path.join(process.cwd(), 'public', 'invoices')

// Ensure the invoices directory exists
async function ensureDir() {
  try {
    await fs.access(INVOICES_DIR)
  } catch {
    await fs.mkdir(INVOICES_DIR, { recursive: true })
  }
}

// Generate invoice filename
// Format: [InvoiceNumber].pdf (e.g., INV-SERVTRIX-0001.pdf)
export function generateInvoiceFilename(invoiceNumber: string): string {
  return `${invoiceNumber}.pdf`
}

// Save invoice file and return the public URL path
export async function saveInvoiceFile(
  filename: string,
  buffer: Buffer
): Promise<string> {
  await ensureDir()

  const filePath = path.join(INVOICES_DIR, filename)
  await fs.writeFile(filePath, buffer)

  // Return the public URL path
  return `/invoices/${filename}`
}

// Get invoice file as buffer
export async function getInvoiceFile(filename: string): Promise<Buffer> {
  const filePath = path.join(INVOICES_DIR, filename)
  return await fs.readFile(filePath)
}

// Delete invoice file
export async function deleteInvoiceFile(filename: string): Promise<void> {
  try {
    const filePath = path.join(INVOICES_DIR, filename)
    await fs.unlink(filePath)
  } catch (error) {
    // Ignore if file doesn't exist
    console.error('Error deleting invoice file:', error)
  }
}

// Delete invoice file by path
export async function deleteInvoiceByPath(filePath: string | null): Promise<void> {
  if (filePath) {
    const filename = filePath.replace('/invoices/', '')
    await deleteInvoiceFile(filename)
  }
}

// Check if file exists
export async function invoiceFileExists(filename: string): Promise<boolean> {
  try {
    const filePath = path.join(INVOICES_DIR, filename)
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}
