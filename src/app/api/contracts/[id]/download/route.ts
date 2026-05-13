import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getContractFile, saveContractFile, generateContractFilename } from '@/lib/file-storage'
import { generateContractPdf } from '@/lib/contract-pdf'
import { generateContractDocx } from '@/lib/contract-template'
import { requireAuth } from '@/lib/middleware/roleCheck'

// GET - Download contract file (regenerates if not found in R2)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const format = (searchParams.get('format') || 'pdf') as 'pdf' | 'docx'

    // Get contract with client data for potential regeneration
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            contacts: {
              orderBy: { isPrimary: 'desc' as const },
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

    // Determine file path based on format
    const filePath = format === 'docx' ? contract.filePath : contract.pdfPath

    // Try to fetch from R2
    let fileBuffer: Buffer | null = null

    if (filePath) {
      try {
        fileBuffer = await getContractFile(filePath)
      } catch {
        console.warn(`Contract file not found in R2 for ${contract.contractNumber} (${format}), regenerating...`)
      }
    }

    // If not found, regenerate
    if (!fileBuffer) {
      // Re-check DB in case another request already regenerated
      const freshContract = await prisma.contract.findUnique({
        where: { id },
        select: { filePath: true, pdfPath: true },
      })
      const freshPath = format === 'docx' ? freshContract?.filePath : freshContract?.pdfPath
      if (freshPath && freshPath !== filePath) {
        try {
          fileBuffer = await getContractFile(freshPath)
        } catch {
          // Still not found, proceed with regeneration
        }
      }

      if (!fileBuffer) {
        const company = await prisma.company.findFirst()
        if (!company) {
          return NextResponse.json(
            { success: false, error: 'Company settings not configured' },
            { status: 500 }
          )
        }

        const client = contract.client
        const primaryContact = client.contacts[0]

        if (!primaryContact) {
          return NextResponse.json(
            { success: false, error: 'Client has no contacts, cannot regenerate contract' },
            { status: 500 }
          )
        }

        const customerEmails = client.contacts
          .map((c: { email: string | null }) => c.email)
          .filter((e: string | null): e is string => !!e)
        const customerMobiles = client.contacts
          .map((c: { mobile: string | null }) => c.mobile)
          .filter((m: string | null): m is string => !!m)
        const customerContactPersons = client.contacts
          .map((c: { contactPerson: string }) => c.contactPerson)
          .filter((n: string): n is string => !!n)
        const customerPositions = client.contacts
          .map((c: { contactPosition: string | null }) => c.contactPosition)
          .filter((p: string | null): p is string => !!p)

        const year = new Date(contract.startDate).getFullYear().toString()

        const contractData = {
          providerName: company.name,
          providerContactPerson: company.contactPerson,
          providerContactPosition: company.contactPosition,
          providerAddress: company.address,
          providerEmails: company.emails,
          providerMobiles: company.mobiles,
          providerTelephone: company.telephone,
          providerPlan: company.plan,
          customerName: client.clientName,
          customerContactPersons,
          customerPositions,
          customerAddress: client.address,
          customerEmails,
          customerMobiles,
          customerTelephone: primaryContact.telephone,
          rentalRate: client.rentalRate,
          vatInclusive: client.vatInclusive,
          rentalTermsMonths: client.rentalTermsMonths,
          billingTerms: client.billingTerms,
          customBillingTerms: client.customBillingTerms,
          leaseInclusions: client.leaseInclusions,
          startDate: contract.startDate,
          endDate: contract.endDate,
          contractNumber: contract.contractNumber,
          contractYear: year,
          signerName: contract.signerName || company.contactPerson,
          signerPosition: contract.signerPosition || company.contactPosition,
        }

        const filename = generateContractFilename(client.clientName, year, format)

        if (format === 'pdf') {
          fileBuffer = await generateContractPdf(contractData)
          const newPath = await saveContractFile(filename, fileBuffer)
          await prisma.contract.update({ where: { id }, data: { pdfPath: newPath } })
        } else {
          fileBuffer = await generateContractDocx(contractData)
          const newPath = await saveContractFile(filename, fileBuffer)
          await prisma.contract.update({ where: { id }, data: { filePath: newPath } })
        }
      }
    }

    // Set content type and filename
    const contentType = format === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/pdf'

    const downloadFilename = filePath?.split('/').pop()
      || `${contract.client.clientName} VO-SA ${new Date(contract.startDate).getFullYear()}.${format}`

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${downloadFilename.replace(/[^a-zA-Z0-9_.\s-]/g, '_')}"`,
      },
    })
  } catch (error) {
    console.error('Error downloading contract:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to download contract' },
      { status: 500 }
    )
  }
}
