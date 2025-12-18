import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateContractDocx, ContractData } from '@/lib/contract-template'
import { generateContractPdf } from '@/lib/contract-pdf'
import { saveContractFile, generateContractFilename } from '@/lib/file-storage'

// Parse date string (YYYY-MM-DD) to Date at noon local time to avoid timezone issues
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0) // noon to avoid timezone edge cases
}

// GET - List all contracts
export async function GET() {
  try {
    const contracts = await prisma.contract.findMany({
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: contracts })
  } catch (error) {
    console.error('Error fetching contracts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contracts' },
      { status: 500 }
    )
  }
}

// POST - Create new contract and generate files
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.clientId || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch client with all contacts
    const client = await prisma.client.findUnique({
      where: { id: body.clientId },
      include: {
        contacts: {
          orderBy: { isPrimary: 'desc' }, // Primary contact first
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Fetch company settings
    const company = await prisma.company.findFirst()

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company settings not configured' },
        { status: 400 }
      )
    }

    // Generate contract number
    const year = new Date().getFullYear().toString()
    const count = await prisma.contract.count({
      where: {
        contractNumber: {
          startsWith: `VO-SA-${year}`,
        },
      },
    })
    const contractNumber = `VO-SA-${year}-${String(count + 1).padStart(4, '0')}`

    // Get primary contact (first one since sorted by isPrimary desc)
    const primaryContact = client.contacts[0]

    if (!primaryContact) {
      return NextResponse.json(
        { success: false, error: 'Client must have a primary contact' },
        { status: 400 }
      )
    }

    // Collect all emails and mobiles from all contacts
    const customerEmails = client.contacts
      .map(c => c.email)
      .filter((email): email is string => !!email)
    const customerMobiles = client.contacts
      .map(c => c.mobile)
      .filter((mobile): mobile is string => !!mobile)

    // Prepare contract data with new schema
    // Use signer if provided, otherwise fall back to company contact person
    const signerName = body.signerName || company.contactPerson
    const signerPosition = body.signerPosition || company.contactPosition

    const contractData: ContractData = {
      // Provider (Company)
      providerName: company.name,
      providerContactPerson: company.contactPerson,    // Contact person from Company Details
      providerContactPosition: company.contactPosition, // Position from Company Details
      providerAddress: company.address,
      providerEmails: company.emails,
      providerMobiles: company.mobiles,
      providerTelephone: company.telephone,
      providerPlan: company.plan,

      // Signer (from selected signer)
      signerName: signerName,
      signerPosition: signerPosition,

      // Customer (Client)
      customerName: client.clientName,
      customerContactPerson: primaryContact.contactPerson,
      customerAddress: client.address,
      customerEmails: customerEmails,
      customerMobiles: customerMobiles,
      customerTelephone: primaryContact.telephone,
      customerPosition: primaryContact.contactPosition || '',

      // Contract Terms
      rentalRate: client.rentalRate,
      vatInclusive: client.vatInclusive,
      rentalTermsMonths: client.rentalTermsMonths,
      billingTerms: client.billingTerms,
      customBillingTerms: client.customBillingTerms,
      leaseInclusions: client.leaseInclusions,
      startDate: parseLocalDate(body.startDate),
      endDate: parseLocalDate(body.endDate),

      // Generated
      contractNumber,
      contractYear: year,
    }

    // Generate DOCX
    const docxBuffer = await generateContractDocx(contractData)
    const docxFilename = generateContractFilename(client.clientName, year, 'docx')
    const docxPath = await saveContractFile(docxFilename, docxBuffer)

    // Generate PDF
    const pdfBuffer = await generateContractPdf(contractData)
    const pdfFilename = generateContractFilename(client.clientName, year, 'pdf')
    const pdfPath = await saveContractFile(pdfFilename, pdfBuffer)

    // Create contract record
    const contract = await prisma.contract.create({
      data: {
        clientId: body.clientId,
        contractNumber,
        filePath: docxPath,
        pdfPath: pdfPath,
        status: 'draft',
        startDate: parseLocalDate(body.startDate),
        endDate: parseLocalDate(body.endDate),
        signerName: signerName,
        signerPosition: signerPosition,
      },
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: contract,
      files: {
        docx: docxPath,
        pdf: pdfPath,
      },
    })
  } catch (error) {
    console.error('Error creating contract:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create contract' },
      { status: 500 }
    )
  }
}

// DELETE - Bulk delete contracts
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No contract IDs provided' },
        { status: 400 }
      )
    }

    // Delete all contracts with the given IDs
    const result = await prisma.contract.deleteMany({
      where: {
        id: { in: ids },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} contract(s)`,
      count: result.count,
    })
  } catch (error) {
    console.error('Error deleting contracts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete contracts' },
      { status: 500 }
    )
  }
}
