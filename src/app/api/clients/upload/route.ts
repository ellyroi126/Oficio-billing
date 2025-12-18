import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

// Expected column headers (in order)
const EXPECTED_HEADERS = [
  'ClientName*',
  'Address*',
  'RentalRate*',
  'VAT(Inclusive/Exclusive)*',
  'RentalTerms*',
  'BillingTerms*',
  'StartDate*',
  'LeaseInclusions*',
  'ContactPerson*',
  'ContactPerson\u2019sPosition*', // Unicode right single quotation mark (')
  'Email*',
  'Mobile*',
  'Telephone',
]

// Normalize header for comparison (handle different apostrophe types)
function normalizeHeader(header: string): string {
  return header
    .replace(/[\u2018\u2019\u0027]/g, "'") // Normalize all apostrophe types
    .trim()
    .toLowerCase()
}

// Convert Excel serial date to JavaScript Date
function excelDateToJSDate(serial: number): Date {
  // Excel's epoch is December 30, 1899
  const utcDays = Math.floor(serial - 25569)
  const utcValue = utcDays * 86400
  return new Date(utcValue * 1000)
}

// Parse multiline values (separated by \r\n or \n)
function parseMultilineValue(value: string | undefined | null): string[] {
  if (!value) return []
  return String(value)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// Validate billing terms
function isValidBillingTerms(value: string): boolean {
  const validTerms = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Other']
  return validTerms.includes(value)
}

// Format mobile number (remove country code prefix if present)
function formatMobileForStorage(mobile: string | number): string {
  const mobileStr = String(mobile)
  // Remove common prefixes and keep just the number
  return mobileStr.replace(/^(\+63|63|0)/, '')
}

interface ParsedRow {
  clientName: string
  address: string
  rentalRate: number
  vatInclusive: boolean
  rentalTermsMonths: number
  billingTerms: string
  customBillingTerms: string | null
  startDate: Date
  endDate: Date
  leaseInclusions: string | null
  contacts: {
    contactPerson: string
    contactPosition: string | null
    email: string | null
    mobile: string | null
    telephone: string | null
    isPrimary: boolean
  }[]
}

interface ValidationError {
  row: number
  field: string
  message: string
}

// POST - Upload and process Excel file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      )
    }

    // Read file buffer
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })

    // Get first sheet
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json(
        { success: false, error: 'Excel file has no sheets' },
        { status: 400 }
      )
    }

    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

    if (data.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Excel file must have a header row and at least one data row' },
        { status: 400 }
      )
    }

    // Validate headers
    const headers = data[0] as string[]
    const headerMismatch = EXPECTED_HEADERS.some((expected, index) => {
      const actual = headers[index]?.toString() || ''
      return normalizeHeader(actual) !== normalizeHeader(expected)
    })

    if (headerMismatch) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid template format. Please use the official template.',
          expectedHeaders: EXPECTED_HEADERS,
          receivedHeaders: headers,
        },
        { status: 400 }
      )
    }

    // Parse and validate each row
    const parsedRows: ParsedRow[] = []
    const errors: ValidationError[] = []

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as unknown[]
      const rowNumber = i + 1 // 1-indexed for user display

      // Skip empty rows
      if (!row || row.length === 0 || !row[0]) {
        continue
      }

      // Extract values
      const clientName = row[0]?.toString().trim() || ''
      const address = row[1]?.toString().trim() || ''
      const rentalRateRaw = row[2]
      const vatRaw = row[3]?.toString().trim().toUpperCase() || ''
      const rentalTermsRaw = row[4]
      const billingTerms = row[5]?.toString().trim() || ''
      const startDateRaw = row[6]
      const leaseInclusions = row[7]?.toString().trim() || ''
      const contactPersonRaw = row[8]?.toString() || ''
      const contactPositionRaw = row[9]?.toString() || ''
      const emailRaw = row[10]?.toString() || ''
      const mobileRaw = row[11]
      const telephoneRaw = row[12]

      // Validate required fields
      if (!clientName) {
        errors.push({ row: rowNumber, field: 'ClientName', message: 'Client name is required' })
      }
      if (!address) {
        errors.push({ row: rowNumber, field: 'Address', message: 'Address is required' })
      }

      // Parse and validate rental rate
      const rentalRate = parseFloat(String(rentalRateRaw))
      if (isNaN(rentalRate) || rentalRate <= 0) {
        errors.push({ row: rowNumber, field: 'RentalRate', message: 'Rental rate must be a positive number' })
      }

      // Validate VAT
      const vatInclusive = vatRaw === 'Y'
      if (vatRaw !== 'Y' && vatRaw !== 'N') {
        errors.push({ row: rowNumber, field: 'VAT', message: 'VAT must be Y (inclusive) or N (exclusive)' })
      }

      // Parse and validate rental terms
      const rentalTermsMonths = parseInt(String(rentalTermsRaw))
      if (isNaN(rentalTermsMonths) || rentalTermsMonths <= 0) {
        errors.push({ row: rowNumber, field: 'RentalTerms', message: 'Rental terms must be a positive number of months' })
      }

      // Validate billing terms
      if (!isValidBillingTerms(billingTerms)) {
        errors.push({
          row: rowNumber,
          field: 'BillingTerms',
          message: 'Billing terms must be one of: Monthly, Quarterly, Semi-Annual, Annual, Other',
        })
      }

      // Parse start date
      let startDate: Date
      if (typeof startDateRaw === 'number') {
        startDate = excelDateToJSDate(startDateRaw)
      } else if (startDateRaw) {
        startDate = new Date(String(startDateRaw))
      } else {
        startDate = new Date()
        errors.push({ row: rowNumber, field: 'StartDate', message: 'Start date is required' })
      }

      if (isNaN(startDate.getTime())) {
        errors.push({ row: rowNumber, field: 'StartDate', message: 'Invalid start date format' })
        startDate = new Date()
      }

      // Calculate end date
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + (rentalTermsMonths || 12))

      // Parse contacts (can be multiline)
      const contactPersons = parseMultilineValue(contactPersonRaw)
      const contactPositions = parseMultilineValue(contactPositionRaw)
      const emails = parseMultilineValue(emailRaw)
      const mobiles = mobileRaw ? parseMultilineValue(String(mobileRaw)) : []
      const telephones = telephoneRaw ? parseMultilineValue(String(telephoneRaw)) : []

      if (contactPersons.length === 0) {
        errors.push({ row: rowNumber, field: 'ContactPerson', message: 'At least one contact person is required' })
      }

      if (emails.length === 0) {
        errors.push({ row: rowNumber, field: 'Email', message: 'At least one email is required' })
      }

      if (mobiles.length === 0) {
        errors.push({ row: rowNumber, field: 'Mobile', message: 'At least one mobile number is required' })
      }

      // Build contacts array
      const contacts = contactPersons.map((person, index) => ({
        contactPerson: person,
        contactPosition: contactPositions[index] || contactPositions[0] || null,
        email: emails[index] || emails[0] || null,
        mobile: mobiles[index] ? formatMobileForStorage(mobiles[index]) : (mobiles[0] ? formatMobileForStorage(mobiles[0]) : null),
        telephone: telephones[index] || telephones[0] || null,
        isPrimary: index === 0, // First contact is primary
      }))

      // Only add if no critical errors for this row
      const rowErrors = errors.filter((e) => e.row === rowNumber)
      if (rowErrors.length === 0) {
        parsedRows.push({
          clientName,
          address,
          rentalRate,
          vatInclusive,
          rentalTermsMonths,
          billingTerms,
          customBillingTerms: billingTerms === 'Other' ? billingTerms : null,
          startDate,
          endDate,
          leaseInclusions: leaseInclusions || null,
          contacts,
        })
      }
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation errors found in the uploaded file',
          validationErrors: errors,
          validRowCount: parsedRows.length,
          errorRowCount: errors.length,
        },
        { status: 400 }
      )
    }

    if (parsedRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid data rows found in the file' },
        { status: 400 }
      )
    }

    // Create all clients in a transaction
    const createdClients = await prisma.$transaction(
      parsedRows.map((row) =>
        prisma.client.create({
          data: {
            clientName: row.clientName,
            address: row.address,
            rentalRate: row.rentalRate,
            vatInclusive: row.vatInclusive,
            rentalTermsMonths: row.rentalTermsMonths,
            billingTerms: row.billingTerms,
            customBillingTerms: row.customBillingTerms,
            leaseInclusions: row.leaseInclusions,
            startDate: row.startDate,
            endDate: row.endDate,
            status: 'active',
            contacts: {
              create: row.contacts,
            },
          },
          include: {
            contacts: true,
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdClients.length} clients`,
      data: createdClients,
      count: createdClients.length,
    })
  } catch (error) {
    console.error('Error processing upload:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process uploaded file' },
      { status: 500 }
    )
  }
}
