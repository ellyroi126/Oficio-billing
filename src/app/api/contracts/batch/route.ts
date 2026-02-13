import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    // Find the highest existing contract number for this year
    const lastContract = await prisma.contract.findFirst({
      where: {
        contractNumber: {
          startsWith: `VO-SA-${year}`,
        },
      },
      orderBy: {
        contractNumber: 'desc',
      },
      select: {
        contractNumber: true,
      },
    })

    let nextNumber = 1
    if (lastContract) {
      // Extract the number from the last contract number (e.g., "VO-SA-2025-0005" -> 5)
      const lastNumberStr = lastContract.contractNumber.replace(prefix, '')
      const lastNumber = parseInt(lastNumberStr, 10)
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1
      }
    }

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

        // Generate contract number
        const contractNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`
        nextNumber++

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
        const docxFilename = generateContractFilename(client.clientName, year, 'docx')
        const docxPath = await saveContractFile(docxFilename, docxBuffer)

        // Generate PDF
        const pdfBuffer = await generateContractPdf(contractData)
        const pdfFilename = generateContractFilename(client.clientName, year, 'pdf')
        const pdfPath = await saveContractFile(pdfFilename, pdfBuffer)

        // Create contract record
        const contract = await prisma.contract.create({
          data: {
            clientId: client.id,
            contractNumber,
            filePath: docxPath,
            pdfPath: pdfPath,
            status: 'draft',
            startDate: client.startDate,
            endDate: client.endDate,
            signerName: signerName,
            signerPosition: signerPosition,
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
