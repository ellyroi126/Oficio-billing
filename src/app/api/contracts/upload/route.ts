import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/roleCheck'
import { saveContractFile } from '@/lib/file-storage'

// POST - Upload signed contract file
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type (PDF only for signed contracts)
    const allowedTypes = ['application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only PDF files are allowed for signed contracts' },
        { status: 400 }
      )
    }

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 20MB' },
        { status: 400 }
      )
    }

    // Get the filename from form data or generate one
    const clientName = formData.get('clientName') as string || 'Contract'
    const contractNumber = formData.get('contractNumber') as string || ''

    // Sanitize for filename
    const sanitized = clientName.replace(/[^a-zA-Z0-9\s-]/g, '').trim()
    const filename = contractNumber
      ? `${sanitized} ${contractNumber} - Signed.pdf`
      : `${sanitized} - Signed.pdf`

    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = await saveContractFile(filename, buffer)

    return NextResponse.json({
      success: true,
      data: {
        filePath,
        originalName: file.name,
      },
    })
  } catch (error) {
    console.error('Error uploading signed contract:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
