import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/middleware/roleCheck'
import { createAuditLog, getRequestMetadata } from '@/lib/auditLog'
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
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user

    const { id } = await params
    const body = await request.json()

    // Fetch old data for audit log
    const oldContract = await prisma.contract.findUnique({
      where: { id },
      include: { client: { select: { clientName: true } } },
    })

    const updateData: {
      status?: string
      sentAt?: Date
      signedAt?: Date
    } = {}

    if (body.status) {
      // Terminating a contract requires admin approval
      if (body.status === 'terminated' && user.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Terminating a contract requires admin approval' },
          { status: 403 }
        )
      }
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

    const metadata = getRequestMetadata(request)
    const actions = []
    if (body.markAsSent) actions.push('marked as sent')
    if (body.markAsSigned) actions.push('marked as signed')
    if (body.status && !body.markAsSent) actions.push(`status changed to "${body.status}"`)
    const actionDesc = actions.length > 0 ? actions.join(', ') : 'updated'

    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'UPDATE',
      actionCategory: 'CONTRACT',
      entityType: 'contract',
      entityId: id,
      entityName: `${oldContract?.contractNumber || id} - ${contract.client?.clientName || ''}`,
      beforeData: oldContract ? { status: oldContract.status } : undefined,
      afterData: updateData,
      changesSummary: `Contract ${oldContract?.contractNumber || id} ${actionDesc}`,
      ...metadata
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

// DELETE - Delete contract and files — Admin only
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user

    const { id } = await params

    // Get contract to find file paths
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: { client: { select: { clientName: true } } },
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

    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'DELETE',
      actionCategory: 'CONTRACT',
      entityType: 'contract',
      entityId: id,
      entityName: `${contract.contractNumber} - ${contract.client?.clientName || ''}`,
      changesSummary: `Deleted contract ${contract.contractNumber}`,
      ...metadata
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
