import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Get single client with contacts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        contacts: {
          orderBy: { isPrimary: 'desc' },
        },
        contracts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: client })
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

// PUT - Update client and contacts
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Update client
    const client = await prisma.client.update({
      where: { id },
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
        status: body.status,
      },
    })

    // Update contacts - delete existing and create new
    if (body.contacts) {
      await prisma.clientContact.deleteMany({
        where: { clientId: id },
      })

      await prisma.clientContact.createMany({
        data: body.contacts.map((contact: {
          contactPerson: string
          contactPosition?: string
          email?: string
          mobile?: string
          telephone?: string
          isPrimary: boolean
        }) => ({
          clientId: id,
          contactPerson: contact.contactPerson,
          contactPosition: contact.contactPosition || null,
          email: contact.email || null,
          mobile: contact.mobile || null,
          telephone: contact.telephone || null,
          isPrimary: contact.isPrimary || false,
        })),
      })
    }

    // Fetch updated client with contacts
    const updatedClient = await prisma.client.findUnique({
      where: { id },
      include: { contacts: true },
    })

    return NextResponse.json({ success: true, data: updatedClient })
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

// DELETE - Delete client (cascades to contacts)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.client.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}
