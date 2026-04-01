import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/middleware/roleCheck'
import { createAuditLog, getRequestMetadata } from '@/lib/auditLog'
import { withNotDeleted, softDelete } from '@/lib/softDelete'

// GET - List all clients with contacts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    // Pagination params
    const page = parseInt(searchParams.get('page') || '0')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '25'), 100)
    const sortField = searchParams.get('sortField') || 'createdAt'
    const sortDirection = (searchParams.get('sortDirection') || 'desc') as 'asc' | 'desc'

    const where = withNotDeleted(search
      ? {
          OR: [
            { clientName: { contains: search, mode: 'insensitive' as const } },
            { address: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {})

    // Build orderBy based on sortField
    const sortFieldMap: Record<string, any> = {
      clientName: { clientName: sortDirection },
      rentalRate: { rentalRate: sortDirection },
      status: { status: sortDirection },
      startDate: { startDate: sortDirection },
      createdAt: { createdAt: sortDirection },
    }
    const orderBy = sortFieldMap[sortField] || { createdAt: sortDirection }

    const includeClause = {
      contacts: {
        orderBy: { isPrimary: 'desc' as const },
      },
      _count: {
        select: { contracts: true },
      },
    }

    if (page > 0) {
      const [totalItems, clients] = await Promise.all([
        prisma.client.count({ where }),
        prisma.client.findMany({
          where,
          include: includeClause,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ])

      return NextResponse.json({
        success: true,
        data: clients,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / pageSize),
        },
      })
    }

    // Backward-compatible: no pagination metadata
    const clients = await prisma.client.findMany({
      where,
      include: includeClause,
      orderBy,
    })

    return NextResponse.json({ success: true, data: clients })
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

// POST - Create new client with contacts
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user

    const body = await request.json()

    // Validate required fields
    if (!body.clientName || !body.address) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate contacts - at least one contact with primary contact having required fields
    const contacts = body.contacts || []
    if (contacts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one contact person is required' },
        { status: 400 }
      )
    }

    const primaryContact = contacts.find((c: { isPrimary: boolean }) => c.isPrimary)
    if (!primaryContact) {
      return NextResponse.json(
        { success: false, error: 'A primary contact is required' },
        { status: 400 }
      )
    }

    if (!primaryContact.contactPerson || !primaryContact.email || !primaryContact.mobile) {
      return NextResponse.json(
        { success: false, error: 'Primary contact must have name, email, and mobile' },
        { status: 400 }
      )
    }

    // Check for duplicate client (same name AND address, case insensitive)
    const existingClient = await prisma.client.findFirst({
      where: {
        AND: [
          { clientName: { equals: body.clientName, mode: 'insensitive' } },
          { address: { equals: body.address, mode: 'insensitive' } },
        ],
      },
    })

    if (existingClient) {
      return NextResponse.json(
        { success: false, error: `A client with the same name and address already exists: "${existingClient.clientName}"` },
        { status: 409 }
      )
    }

    // Create client with contacts
    const client = await prisma.client.create({
      data: {
        clientName: body.clientName,
        address: body.address,
        rentalRate: parseFloat(body.rentalRate) || 0,
        vatInclusive: body.vatInclusive === true || body.vatInclusive === 'true',
        rentalTermsMonths: parseInt(body.rentalTermsMonths) || 12,
        billingTerms: body.billingTerms || 'Monthly',
        customBillingTerms: body.customBillingTerms || null,
        leaseInclusions: body.leaseInclusions || null,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        status: body.status || 'active',
        contacts: {
          create: contacts.map((contact: {
            contactPerson: string
            contactPosition?: string
            email?: string
            mobile?: string
            telephone?: string
            isPrimary: boolean
          }) => ({
            contactPerson: contact.contactPerson,
            contactPosition: contact.contactPosition || null,
            email: contact.email || null,
            mobile: contact.mobile || null,
            telephone: contact.telephone || null,
            isPrimary: contact.isPrimary || false,
          })),
        },
      },
      include: {
        contacts: true,
      },
    })

    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'CREATE',
      actionCategory: 'CLIENT',
      entityType: 'client',
      entityId: client.id,
      entityName: client.clientName,
      afterData: { clientName: client.clientName, address: client.address, rentalRate: client.rentalRate },
      changesSummary: `Created client: ${client.clientName}`,
      ...metadata
    })

    return NextResponse.json({ success: true, data: client })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create client' },
      { status: 500 }
    )
  }
}

// DELETE - Bulk delete clients — Admin only
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user

    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No client IDs provided' },
        { status: 400 }
      )
    }

    // Fetch client names before deleting for audit log
    const clientsToDelete = await prisma.client.findMany({
      where: { id: { in: ids } },
      select: { id: true, clientName: true },
    })

    // Delete all clients with the given IDs (soft delete)
    const result = await softDelete('client', ids)

    const metadata = getRequestMetadata(request)
    const clientNames = clientsToDelete.map(c => c.clientName).join(', ')
    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'DELETE',
      actionCategory: 'CLIENT',
      entityType: 'client',
      entityId: ids.join(','),
      entityName: clientNames,
      changesSummary: `Bulk deleted ${result.count} client(s): ${clientNames}`,
      ...metadata
    })

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} client(s)`,
      count: result.count,
    })
  } catch (error) {
    console.error('Error deleting clients:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete clients' },
      { status: 500 }
    )
  }
}

// PATCH - Bulk update client status
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user

    const body = await request.json()
    const { ids, status } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No client IDs provided' },
        { status: 400 }
      )
    }

    const validStatuses = ['active', 'expired', 'terminated']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Terminating clients requires admin
    if (status === 'terminated' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Terminating clients requires admin approval' },
        { status: 403 }
      )
    }

    // Update all clients with the given IDs
    const result = await prisma.client.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        status,
      },
    })

    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'UPDATE',
      actionCategory: 'CLIENT',
      entityType: 'client',
      entityId: ids.join(','),
      afterData: { status },
      changesSummary: `Bulk updated ${result.count} client(s) status to "${status}"`,
      ...metadata
    })

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${result.count} client(s) to "${status}"`,
      count: result.count,
    })
  } catch (error) {
    console.error('Error updating client status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update client status' },
      { status: 500 }
    )
  }
}
