import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - List all clients with contacts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    const clients = await prisma.client.findMany({
      where: search
        ? {
            OR: [
              { clientName: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        contacts: {
          orderBy: { isPrimary: 'desc' },
        },
        _count: {
          select: { contracts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
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

    return NextResponse.json({ success: true, data: client })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create client' },
      { status: 500 }
    )
  }
}

// DELETE - Bulk delete clients
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No client IDs provided' },
        { status: 400 }
      )
    }

    // Delete all clients with the given IDs (cascades to contacts and contracts)
    const result = await prisma.client.deleteMany({
      where: {
        id: { in: ids },
      },
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

    // Update all clients with the given IDs
    const result = await prisma.client.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        status,
      },
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
