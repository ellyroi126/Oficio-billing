import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/middleware/roleCheck'
import { createAuditLog, getRequestMetadata } from '@/lib/auditLog'
import { generateContractDocx, ContractData } from '@/lib/contract-template'
import { generateContractPdf } from '@/lib/contract-pdf'
import { saveContractFile, generateContractFilename } from '@/lib/file-storage'
import { withNotDeleted, softDelete } from '@/lib/softDelete'

// Parse date string (YYYY-MM-DD) to Date at noon local time to avoid timezone issues
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0) // noon to avoid timezone edge cases
}

// GET - List all contracts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')

    // Pagination params
    const page = parseInt(searchParams.get('page') || '0')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '25'), 100)
    const sortField = searchParams.get('sortField') || 'createdAt'
    const sortDirection = (searchParams.get('sortDirection') || 'desc') as 'asc' | 'desc'

    // Build where clause
    const where: any = withNotDeleted({
      ...(status && { status }),
    })

    if (search) {
      where.contractNumber = { contains: search, mode: 'insensitive' }
    }

    // Build orderBy based on sortField
    const sortFieldMap: Record<string, any> = {
      contractNumber: { contractNumber: sortDirection },
      startDate: { startDate: sortDirection },
      endDate: { endDate: sortDirection },
      status: { status: sortDirection },
      createdAt: { createdAt: sortDirection },
      clientName: { client: { clientName: sortDirection } },
    }
    const orderBy = sortFieldMap[sortField] || { createdAt: sortDirection }

    const includeClause = {
      client: {
        select: {
          id: true,
          clientName: true,
          billingTerms: true,
          rentalTermsMonths: true,
        },
      },
    }

    if (page > 0) {
      const [totalItems, contracts] = await Promise.all([
        prisma.contract.count({ where }),
        prisma.contract.findMany({
          where,
          include: includeClause,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ])

      return NextResponse.json({
        success: true,
        data: contracts,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / pageSize),
        },
      })
    }

    // Backward-compatible: no pagination metadata
    const contracts = await prisma.contract.findMany({
      where,
      include: includeClause,
      orderBy,
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
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user

    const body = await request.json()

    // Validate required fields
    if (!body.clientId || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate startDate < endDate
    if (parseLocalDate(body.startDate) >= parseLocalDate(body.endDate)) {
      return NextResponse.json(
        { success: false, error: 'Start date must be before end date' },
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

    // Generate contract number - find max existing number for the year
    const year = new Date().getFullYear().toString()
    const prefix = `VO-SA-${year}-`

    // Generate contract number inside serializable transaction to prevent duplicates
    const contractNumber = await prisma.$transaction(async (tx) => {
      const lastContract = await tx.contract.findFirst({
        where: { contractNumber: { startsWith: `VO-SA-${year}` } },
        orderBy: { contractNumber: 'desc' },
        select: { contractNumber: true },
      })

      let nextNumber = 1
      if (lastContract) {
        const lastNumberStr = lastContract.contractNumber.replace(prefix, '')
        const lastNumber = parseInt(lastNumberStr, 10)
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1
        }
      }

      const num = `${prefix}${String(nextNumber).padStart(4, '0')}`

      // Create a placeholder record to reserve the number
      await tx.contract.create({
        data: {
          clientId: body.clientId,
          contractNumber: num,
          status: 'draft',
          startDate: parseLocalDate(body.startDate),
          endDate: parseLocalDate(body.endDate),
          signerName: signerName,
          signerPosition: signerPosition,
        },
      })

      return num
    }, { isolationLevel: 'Serializable' })

    // Get primary contact (first one since sorted by isPrimary desc)
    const primaryContact = client.contacts[0]

    if (!primaryContact) {
      return NextResponse.json(
        { success: false, error: 'Client must have a primary contact' },
        { status: 400 }
      )
    }

    // Collect all data from all contacts
    const customerEmails = client.contacts
      .map((c: any) => c.email)
      .filter((email: any): email is string => !!email)
    const customerMobiles = client.contacts
      .map((c: any) => c.mobile)
      .filter((mobile: any): mobile is string => !!mobile)
    const customerContactPersons = client.contacts
      .map((c: any) => c.contactPerson)
      .filter((name: any): name is string => !!name)
    const customerPositions = client.contacts
      .map((c: any) => c.contactPosition)
      .filter((pos: any): pos is string => !!pos)

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

      // Customer (Client) - all contacts
      customerName: client.clientName,
      customerContactPersons: customerContactPersons,
      customerPositions: customerPositions,
      customerAddress: client.address,
      customerEmails: customerEmails,
      customerMobiles: customerMobiles,
      customerTelephone: primaryContact.telephone,

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
    const docxFilename = generateContractFilename(client.clientName, year, 'docx', contractNumber)
    const docxPath = await saveContractFile(docxFilename, docxBuffer)

    // Generate PDF
    const pdfBuffer = await generateContractPdf(contractData)
    const pdfFilename = generateContractFilename(client.clientName, year, 'pdf', contractNumber)
    const pdfPath = await saveContractFile(pdfFilename, pdfBuffer)

    // Update contract record with file paths
    const contract = await prisma.contract.update({
      where: { contractNumber },
      data: {
        filePath: docxPath,
        pdfPath: pdfPath,
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

    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'CREATE',
      actionCategory: 'CONTRACT',
      entityType: 'contract',
      entityId: contract.id,
      entityName: `${contractNumber} - ${client.clientName}`,
      afterData: { contractNumber, clientName: client.clientName, startDate: body.startDate, endDate: body.endDate },
      changesSummary: `Created contract ${contractNumber} for ${client.clientName}`,
      ...metadata
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

// DELETE - Bulk delete contracts — Admin only
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
        { success: false, error: 'No contract IDs provided' },
        { status: 400 }
      )
    }

    // Fetch contract details before deleting for audit log
    const contractsToDelete = await prisma.contract.findMany({
      where: { id: { in: ids } },
      select: { id: true, contractNumber: true },
    })

    // Delete all contracts with the given IDs (soft delete)
    const result = await softDelete('contract', ids)

    const metadata = getRequestMetadata(request)
    const contractNumbers = contractsToDelete.map(c => c.contractNumber).join(', ')
    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'DELETE',
      actionCategory: 'CONTRACT',
      entityType: 'contract',
      entityId: ids.join(','),
      entityName: contractNumbers,
      changesSummary: `Bulk deleted ${result.count} contract(s): ${contractNumbers}`,
      ...metadata
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

// PATCH - Bulk update contract status
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
        { success: false, error: 'No contract IDs provided' },
        { status: 400 }
      )
    }

    const validStatuses = ['draft', 'active', 'expired', 'terminated', 'void']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Terminating contracts requires admin approval
    if (status === 'terminated' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Terminating contracts requires admin approval' },
        { status: 403 }
      )
    }

    // Update all contracts with the given IDs
    const result = await prisma.contract.updateMany({
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
      actionCategory: 'CONTRACT',
      entityType: 'contract',
      entityId: ids.join(','),
      afterData: { status },
      changesSummary: `Bulk updated ${result.count} contract(s) status to "${status}"`,
      ...metadata
    })

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${result.count} contract(s) to "${status}"`,
      count: result.count,
    })
  } catch (error) {
    console.error('Error updating contract status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update contract status' },
      { status: 500 }
    )
  }
}
