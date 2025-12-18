import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    const body = await request.json()

    // Get existing company or create if not exists
    let company = await prisma.company.findFirst()

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

    return NextResponse.json({ success: true, data: company })
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update company settings' },
      { status: 500 }
    )
  }
}
