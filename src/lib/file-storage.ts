import fs from 'fs/promises'
import path from 'path'

const CONTRACTS_DIR = path.join(process.cwd(), 'public', 'contracts')

// Ensure the contracts directory exists
async function ensureDir() {
  try {
    await fs.access(CONTRACTS_DIR)
  } catch {
    await fs.mkdir(CONTRACTS_DIR, { recursive: true })
  }
}

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

// Save contract file and return the public URL path
export async function saveContractFile(
  filename: string,
  buffer: Buffer
): Promise<string> {
  await ensureDir()

  const filePath = path.join(CONTRACTS_DIR, filename)
  await fs.writeFile(filePath, buffer)

  // Return the public URL path
  return `/contracts/${filename}`
}

// Get contract file as buffer
export async function getContractFile(filename: string): Promise<Buffer> {
  const filePath = path.join(CONTRACTS_DIR, filename)
  return await fs.readFile(filePath)
}

// Delete contract file
export async function deleteContractFile(filename: string): Promise<void> {
  try {
    const filePath = path.join(CONTRACTS_DIR, filename)
    await fs.unlink(filePath)
  } catch (error) {
    // Ignore if file doesn't exist
    console.error('Error deleting file:', error)
  }
}

// Delete contract files by path
export async function deleteContractFiles(
  docxPath: string | null,
  pdfPath: string | null
): Promise<void> {
  if (docxPath) {
    const docxFilename = docxPath.replace('/contracts/', '')
    await deleteContractFile(docxFilename)
  }
  if (pdfPath) {
    const pdfFilename = pdfPath.replace('/contracts/', '')
    await deleteContractFile(pdfFilename)
  }
}

// Check if file exists
export async function contractFileExists(filename: string): Promise<boolean> {
  try {
    const filePath = path.join(CONTRACTS_DIR, filename)
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}
