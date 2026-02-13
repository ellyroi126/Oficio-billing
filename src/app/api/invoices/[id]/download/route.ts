import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getInvoiceFile } from '@/lib/invoice-storage'

// GET - Download invoice PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            clientName: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    if (!invoice.filePath) {
      return NextResponse.json(
        { success: false, error: 'Invoice PDF not generated yet' },
        { status: 404 }
      )
    }

    // Read file from R2 (getInvoiceFile handles URL to key conversion)
    const fileBuffer = await getInvoiceFile(invoice.filePath)

    // Extract filename for download header
    const filename = invoice.filePath.split('/').pop() || `${invoice.invoiceNumber}.pdf`

    // Create response with file
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error downloading invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to download invoice' },
      { status: 500 }
    )
  }
}
