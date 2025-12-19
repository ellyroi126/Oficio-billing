import fs from 'fs/promises'
import path from 'path'

const INVOICES_DIR = path.join(process.cwd(), 'public', 'invoices')

// Ensure a directory exists
async function ensureDir(dirPath: string) {
  try {
    await fs.access(dirPath)
  } catch {
    await fs.mkdir(dirPath, { recursive: true })
  }
}

// Generate client code from client name (e.g., "Servtrix Solutions" -> "SERVTRIX")
export function generateClientCode(clientName: string): string {
  const words = clientName.toUpperCase().split(/\s+/)
  return words[0].substring(0, 10).replace(/[^A-Z0-9]/g, '')
}

// Generate invoice filename
// Format: [InvoiceNumber].pdf (e.g., INV-SERVTRIX-0001.pdf)
export function generateInvoiceFilename(invoiceNumber: string): string {
  return `${invoiceNumber}.pdf`
}

// Save invoice file in client folder and return the public URL path
// Structure: /invoices/{clientCode}/INV-XXX.pdf
export async function saveInvoiceFile(
  filename: string,
  buffer: Buffer,
  clientCode: string
): Promise<string> {
  const clientDir = path.join(INVOICES_DIR, clientCode)
  await ensureDir(clientDir)

  const filePath = path.join(clientDir, filename)
  await fs.writeFile(filePath, buffer)

  // Return the public URL path
  return `/invoices/${clientCode}/${filename}`
}

// Get invoice file as buffer (handles both old flat structure and new folder structure)
export async function getInvoiceFile(filePath: string): Promise<Buffer> {
  // filePath is like "/invoices/SERVTRIX/INV-SERVTRIX-0001.pdf" or "/invoices/INV-SERVTRIX-0001.pdf"
  const relativePath = filePath.replace(/^\/invoices\//, '')
  const fullPath = path.join(INVOICES_DIR, relativePath)
  return await fs.readFile(fullPath)
}

// Delete invoice file by path
export async function deleteInvoiceByPath(filePath: string | null): Promise<void> {
  if (!filePath) return

  try {
    // filePath is like "/invoices/SERVTRIX/INV-SERVTRIX-0001.pdf" or "/invoices/INV-SERVTRIX-0001.pdf"
    const relativePath = filePath.replace(/^\/invoices\//, '')
    const fullPath = path.join(INVOICES_DIR, relativePath)
    await fs.unlink(fullPath)
  } catch (error) {
    // Ignore if file doesn't exist
    console.error('Error deleting invoice file:', error)
  }
}

// Check if file exists
export async function invoiceFileExists(filePath: string): Promise<boolean> {
  try {
    const relativePath = filePath.replace(/^\/invoices\//, '')
    const fullPath = path.join(INVOICES_DIR, relativePath)
    await fs.access(fullPath)
    return true
  } catch {
    return false
  }
}
