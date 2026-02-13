import { uploadToR2, deleteFromR2, getKeyFromUrl } from './r2-storage'

// Sanitize filename to remove special characters
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s-]/g, '').trim()
}

// Generate filename based on client name and year
// Format: [ClientName] VO-SA [Year].[ext]
export function generateContractFilename(
  clientName: string,
  year: string,
  format: 'docx' | 'pdf'
): string {
  const sanitizedName = sanitizeFilename(clientName)
  return `${sanitizedName} VO-SA ${year}.${format}`
}

// Save contract file to R2 and return the public URL
export async function saveContractFile(
  filename: string,
  buffer: Buffer
): Promise<string> {
  const key = `contracts/${filename}`
  const contentType = filename.endsWith('.pdf')
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  return await uploadToR2(key, buffer, contentType)
}

// Delete contract file from R2
export async function deleteContractFile(filePath: string): Promise<void> {
  try {
    const key = getKeyFromUrl(filePath)
    await deleteFromR2(key)
  } catch (error) {
    console.error('Error deleting file:', error)
  }
}

// Delete contract files by path
export async function deleteContractFiles(
  docxPath: string | null,
  pdfPath: string | null
): Promise<void> {
  if (docxPath) {
    await deleteContractFile(docxPath)
  }
  if (pdfPath) {
    await deleteContractFile(pdfPath)
  }
}
