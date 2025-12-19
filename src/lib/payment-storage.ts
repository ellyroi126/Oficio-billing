import * as fs from 'fs/promises'
import * as path from 'path'

const PAYMENTS_DIR = path.join(process.cwd(), 'public', 'payments')
const EVIDENCE_DIR = path.join(PAYMENTS_DIR, 'evidence')

async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
}

export function generateEvidenceFilename(paymentId: string, originalFilename: string): string {
  const ext = path.extname(originalFilename)
  const timestamp = Date.now()
  return `${paymentId}-${timestamp}${ext}`
}

export async function saveEvidenceFile(filename: string, buffer: Buffer): Promise<string> {
  await ensureDir(EVIDENCE_DIR)
  const filePath = path.join(EVIDENCE_DIR, filename)
  await fs.writeFile(filePath, buffer)
  return `/payments/evidence/${filename}`
}

export async function deleteEvidenceFile(filePath: string): Promise<void> {
  try {
    const fullPath = path.join(process.cwd(), 'public', filePath)
    await fs.unlink(fullPath)
  } catch (error) {
    console.error('Error deleting evidence file:', error)
  }
}

export async function getEvidenceFilePath(filename: string): Promise<string> {
  return path.join(EVIDENCE_DIR, filename)
}
