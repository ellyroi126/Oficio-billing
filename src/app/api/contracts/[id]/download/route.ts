import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getContractFile } from '@/lib/file-storage'

// GET - Download contract file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'pdf'

    // Get contract
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            clientName: true,
          },
        },
      },
    })

    if (!contract) {
      return NextResponse.json(
        { success: false, error: 'Contract not found' },
        { status: 404 }
      )
    }

    // Determine file path based on format
    const filePath = format === 'docx' ? contract.filePath : contract.pdfPath

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      )
    }

    // Read file from R2 (getContractFile handles URL to key conversion)
    const fileBuffer = await getContractFile(filePath)

    // Extract filename for download header
    const filename = filePath.split('/').pop() || 'contract.pdf'

    // Set content type
    const contentType =
      format === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf'

    // Create response with file (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error downloading contract:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to download contract' },
      { status: 500 }
    )
  }
}
