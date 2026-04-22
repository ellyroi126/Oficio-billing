import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware/roleCheck'
import { createAuditLog, getRequestMetadata } from '@/lib/auditLog'
import { generateContractDocx, ContractData } from '@/lib/contract-template'
import { generateContractPdf } from '@/lib/contract-pdf'
import { saveContractFile, generateContractFilename } from '@/lib/file-storage'

// Parse date string (YYYY-MM-DD) to Date at noon local time to avoid timezone issues
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

interface BatchContractRequest {
  clientIds: string[]
  signerName?: string
  signerPosition?: string
}

interface BatchResult {
  clientId: string
  clientName: string
  success: boolean
  contractId?: string
  contractNumber?: string
  error?: string
}

// POST - Create contracts for multiple clients
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user

    const body: BatchContractRequest = await request.json()

    if (!body.clientIds || body.clientIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No clients selected' },
        { status: 400 }
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

    // Get signer info
    const signerName = body.signerName || company.contactPerson
    const signerPosition = body.signerPosition || company.contactPosition

    // Fetch all selected clients with all their contacts
    const clients = await prisma.client.findMany({
      where: {
        id: { in: body.clientIds },
      },
      include: {
        contacts: {
          orderBy: { isPrimary: 'desc' }, // Primary contact first
        },
      },
    })

    const results: BatchResult[] = []
    const year = new Date().getFullYear().toString()
    const prefix = `VO-SA-${year}-`

    for (const client of clients) {
      try {
        const primaryContact = client.contacts[0]

        if (!primaryContact) {
          results.push({
            clientId: client.id,
            clientName: client.clientName,
            success: false,
            error: 'No primary contact found',
          })
          continue
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

        // Generate contract number atomically inside transaction
        const contractNumber = await prisma.$transaction(async (tx) => {
          const last = await tx.contract.findFirst({
            where: { contractNumber: { startsWith: `VO-SA-${year}` } },
            orderBy: { contractNumber: 'desc' },
            select: { contractNumber: true },
          })

          let num = 1
          if (last) {
            const parsed = parseInt(last.contractNumber.replace(prefix, ''), 10)
            if (!isNaN(parsed)) num = parsed + 1
          }

          const cn = `${prefix}${String(num).padStart(4, '0')}`

          // Reserve the number by creating the record
          await tx.contract.create({
            data: {
              clientId: client.id,
              contractNumber: cn,
              status: 'draft',
              startDate: client.startDate,
              endDate: client.endDate,
              signerName: signerName,
              signerPosition: signerPosition,
            },
          })

          return cn
        }, { isolationLevel: 'Serializable' })

        // Prepare contract data
        const contractData: ContractData = {
          // Provider (Company)
          providerName: company.name,
          providerContactPerson: company.contactPerson,
          providerContactPosition: company.contactPosition,
          providerAddress: company.address,
          providerEmails: company.emails,
          providerMobiles: company.mobiles,
          providerTelephone: company.telephone,
          providerPlan: company.plan,

          // Signer
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
          startDate: client.startDate,
          endDate: client.endDate,

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
        })

        results.push({
          clientId: client.id,
          clientName: client.clientName,
          success: true,
          contractId: contract.id,
          contractNumber: contract.contractNumber,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const errorStack = error instanceof Error ? error.stack : ''
        console.error(`Error creating contract for client ${client.id} (${client.clientName}):`, {
          error: errorMessage,
          stack: errorStack,
          address: client.address,
          addressLength: client.address?.length || 0,
        })
        results.push({
          clientId: client.id,
          clientName: client.clientName,
          success: false,
          error: `Failed to generate contract: ${errorMessage}`,
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    const metadata = getRequestMetadata(request)
    const successfulContracts = results.filter(r => r.success)
    const contractNumbers = successfulContracts.map(r => r.contractNumber).join(', ')
    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'CREATE',
      actionCategory: 'CONTRACT',
      entityType: 'contract',
      entityName: `Batch: ${successCount} contracts`,
      afterData: { contractNumbers: successfulContracts.map(r => r.contractNumber), clientNames: successfulContracts.map(r => r.clientName) },
      changesSummary: `Batch generated ${successCount} contract(s)${failCount > 0 ? `, ${failCount} failed` : ''}: ${contractNumbers}`,
      ...metadata
    })

    return NextResponse.json({
      success: true,
      message: `Generated ${successCount} contracts${failCount > 0 ? `, ${failCount} failed` : ''}`,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount,
      },
    })
  } catch (error) {
    console.error('Error in batch contract generation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate contracts' },
      { status: 500 }
    )
  }
}
