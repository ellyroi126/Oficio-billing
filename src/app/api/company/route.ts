import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware/roleCheck'
import { createAuditLog, getRequestMetadata } from '@/lib/auditLog'

// GET - Fetch company settings (returns first company or creates default)
export async function GET() {
  try {
    let company = await prisma.company.findFirst()

    // Create default company if none exists
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'Oficio Property Leasing',
          contactPerson: '',
          contactPosition: '',
          address: '',
          emails: ['info@oficiopl.com'],
          mobiles: [],
          telephone: null,
          plan: 'Virtual',
          signers: [],
        },
      })
    }

    return NextResponse.json({ success: true, data: company })
  } catch (error) {
    console.error('Error fetching company:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company settings' },
      { status: 500 }
    )
  }
}

// PUT - Update company settings
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user

    const body = await request.json()

    // Get existing company or create if not exists
    let company = await prisma.company.findFirst()
    const oldData = company ? { name: company.name, address: company.address, contactPerson: company.contactPerson } : undefined

    const companyData = {
      name: body.name,
      contactPerson: body.contactPerson,
      contactPosition: body.contactPosition,
      address: body.address,
      emails: body.emails || [],
      mobiles: body.mobiles || [],
      telephone: body.telephone || null,
      plan: body.plan,
      signers: body.signers || [],
    }

    if (company) {
      // Update existing
      company = await prisma.company.update({
        where: { id: company.id },
        data: companyData,
      })
    } else {
      // Create new
      company = await prisma.company.create({
        data: companyData,
      })
    }

    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'UPDATE',
      actionCategory: 'SETTINGS',
      entityType: 'company',
      entityId: company.id,
      entityName: company.name,
      beforeData: oldData,
      afterData: { name: company.name, address: company.address, contactPerson: company.contactPerson },
      changesSummary: `Updated company settings: ${company.name}`,
      ...metadata
    })

    return NextResponse.json({ success: true, data: company })
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update company settings' },
      { status: 500 }
    )
  }
}
