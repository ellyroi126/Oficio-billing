import { uploadToR2, deleteFromR2, getKeyFromUrl, getFromR2 } from './r2-storage'

// Generate client code from client name (e.g., "Servtrix Solutions" -> "SERVTRIX")
export function generateClientCode(clientName: string): string {
  const words = clientName.toUpperCase().split(/\s+/)
  return words[0].substring(0, 10).replace(/[^A-Z0-9]/g, '')
}

// Generate invoice filename
// Format: [InvoiceNumber].pdf (e.g., OFC00000219.pdf)
export function generateInvoiceFilename(invoiceNumber: string): string {
  return `${invoiceNumber}.pdf`
}

// Save invoice file to R2 and return the public URL
// Structure: invoices/{clientCode}/OFC00000219.pdf
export async function saveInvoiceFile(
  filename: string,
  buffer: Buffer,
  clientCode: string
): Promise<string> {
  const key = `invoices/${clientCode}/${filename}`
  return await uploadToR2(key, buffer, 'application/pdf')
}

// Get invoice file from R2 (for downloads/email)
// filePath can be full URL or just the path
export async function getInvoiceFile(filePath: string): Promise<Buffer> {
  const key = getKeyFromUrl(filePath)
  return await getFromR2(key)
}

// Delete invoice file from R2
export async function deleteInvoiceByPath(filePath: string | null): Promise<void> {
  if (!filePath) return

  try {
    const key = getKeyFromUrl(filePath)
    await deleteFromR2(key)
  } catch (error) {
    console.error('Error deleting invoice file:', error)
  }
}
