import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteContractFiles } from '@/lib/file-storage'

// GET - Get single contract
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            contacts: {
              where: { isPrimary: true },
              take: 1,
            },
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

    return NextResponse.json({ success: true, data: contract })
  } catch (error) {
    console.error('Error fetching contract:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contract' },
      { status: 500 }
    )
  }
}

// PUT - Update contract status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: {
      status?: string
      sentAt?: Date
      signedAt?: Date
    } = {}

    if (body.status) {
      updateData.status = body.status
    }

    if (body.markAsSent) {
      updateData.sentAt = new Date()
      updateData.status = 'active'
    }

    if (body.markAsSigned) {
      updateData.signedAt = new Date()
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: contract })
  } catch (error) {
    console.error('Error updating contract:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update contract' },
      { status: 500 }
    )
  }
}

// DELETE - Delete contract and files
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get contract to find file paths
    const contract = await prisma.contract.findUnique({
      where: { id },
    })

    if (!contract) {
      return NextResponse.json(
        { success: false, error: 'Contract not found' },
        { status: 404 }
      )
    }

    // Delete files
    await deleteContractFiles(contract.filePath, contract.pdfPath)

    // Delete contract record
    await prisma.contract.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contract:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete contract' },
      { status: 500 }
    )
  }
}
