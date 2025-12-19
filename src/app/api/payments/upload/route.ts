import { NextRequest, NextResponse } from 'next/server'
import { saveEvidenceFile, generateEvidenceFilename } from '@/lib/payment-storage'

// POST - Upload payment evidence file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const paymentId = formData.get('paymentId') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: JPG, PNG, GIF, PDF' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    // Generate filename and save
    const id = paymentId || `temp-${Date.now()}`
    const filename = generateEvidenceFilename(id, file.name)
    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = await saveEvidenceFile(filename, buffer)

    return NextResponse.json({
      success: true,
      data: {
        filePath,
        filename,
        originalName: file.name,
        size: file.size,
        type: file.type,
      },
    })
  } catch (error) {
    console.error('Error uploading evidence file:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
