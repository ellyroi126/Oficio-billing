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
  'ContactPerson\'s Position*',
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
  // Excel serial date system:
  // - Serial 1 = January 1, 1900
  // - Serial 60 = February 29, 1900 (BUG: this day didn't exist!)
  // - For serial > 60, we subtract 1 to correct for this bug

  let days = Math.floor(serial)

  // Correct for Excel's fake leap year bug (Feb 29, 1900 didn't exist)
  if (days > 60) {
    days -= 1
  }

  // Calculate using UTC to avoid timezone issues
  // Serial 1 = Jan 1, 1900, so we use Dec 31, 1899 as day 0
  const msPerDay = 24 * 60 * 60 * 1000
  const dec31_1899_utc = Date.UTC(1899, 11, 31) // December 31, 1899 in UTC
  const targetMs = dec31_1899_utc + (days * msPerDay)

  // Get UTC date components
  const utcDate = new Date(targetMs)

  // Create local date at noon to avoid timezone edge cases
  return new Date(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth(),
    utcDate.getUTCDate(),
    12, 0, 0
  )
}

// Date format type
type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY'

// Parse date from various formats (Excel serial number or string)
// The template now uses TEXT format for dates, so we primarily receive strings.
// Supported string formats:
// - "March 1, 2025" (recommended - unambiguous)
// - "03/01/2025" (interpreted based on dateFormat parameter)
// - "2025-03-01" (ISO format)
// - Excel serial numbers (fallback for old files)
function parseDate(value: unknown, dateFormat: DateFormat = 'MM/DD/YYYY'): Date | null {
  if (!value) return null

  // If it's already a Date object
  if (value instanceof Date) {
    const year = value.getUTCFullYear()
    const month = value.getUTCMonth()
    const day = value.getUTCDate()
    return new Date(year, month, day, 12, 0, 0)
  }

  // If it's a number, treat as Excel serial date (fallback for old files)
  if (typeof value === 'number') {
    return excelDateToJSDate(value)
  }

  // String parsing
  const dateStr = String(value).trim()

  // Try "Month Day, Year" format (e.g., "March 1, 2025" or "Mar 1, 2025")
  const monthNames: { [key: string]: number } = {
    'january': 0, 'jan': 0,
    'february': 1, 'feb': 1,
    'march': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'may': 4,
    'june': 5, 'jun': 5,
    'july': 6, 'jul': 6,
    'august': 7, 'aug': 7,
    'september': 8, 'sep': 8, 'sept': 8,
    'october': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'december': 11, 'dec': 11,
  }

  // Match "Month Day, Year" or "Month Day Year"
  const monthDayYearMatch = dateStr.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/)
  if (monthDayYearMatch) {
    const monthName = monthDayYearMatch[1].toLowerCase()
    const day = parseInt(monthDayYearMatch[2])
    const year = parseInt(monthDayYearMatch[3])
    const month = monthNames[monthName]

    if (month !== undefined && day >= 1 && day <= 31) {
      return new Date(year, month, day, 12, 0, 0)
    }
  }

  // Try slash-separated date format (XX/XX/YYYY)
  // Interpretation depends on dateFormat parameter
  const slashDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashDateMatch) {
    const first = parseInt(slashDateMatch[1])
    const second = parseInt(slashDateMatch[2])
    const year = parseInt(slashDateMatch[3])

    let month: number
    let day: number

    if (dateFormat === 'DD/MM/YYYY') {
      // European format: day/month/year
      day = first
      month = second - 1
    } else {
      // US format: month/day/year (default)
      month = first - 1
      day = second
    }

    return new Date(year, month, day, 12, 0, 0)
  }

  // Try YYYY-MM-DD format (ISO)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const year = parseInt(isoMatch[1])
    const month = parseInt(isoMatch[2]) - 1
    const day = parseInt(isoMatch[3])
    return new Date(year, month, day, 12, 0, 0)
  }

  // Fallback to JavaScript's Date parsing
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0)
  }

  return null
}

// Parse multiline values (separated by \r\n or \n or multiple spaces)
function parseMultilineValue(value: string | number | undefined | null): string[] {
  if (value === undefined || value === null) return []

  const strValue = String(value).trim()
  if (!strValue) return []

  // Split by various newline formats
  const lines = strValue
    .split(/\r\n|\r|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  return lines
}

// Parse phone numbers - handle both single numbers and multiline text
function parsePhoneValues(value: string | number | undefined | null): string[] {
  if (value === undefined || value === null) return []

  // If it's a number, just return it as a single value
  if (typeof value === 'number') {
    return [String(value)]
  }

  const strValue = String(value).trim()
  if (!strValue) return []

  // Split by newlines, commas, or semicolons
  const phones = strValue
    .split(/\r\n|\r|\n|,|;/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  return phones
}

// Validate billing terms
function isValidBillingTerms(value: string): boolean {
  const validTerms = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Other']
  return validTerms.includes(value)
}

// Format mobile number (remove country code prefix and non-numeric characters)
function formatMobileForStorage(mobile: string | number): string {
  let mobileStr = String(mobile).trim()

  // Remove common prefixes and special characters
  mobileStr = mobileStr
    .replace(/[\s\-\(\)\.]/g, '') // Remove spaces, dashes, parentheses, dots
    .replace(/^(\+63|63|0)/, '') // Remove country code prefixes

  return mobileStr
}

// Format telephone number for storage
function formatTelephoneForStorage(telephone: string | number): string {
  let telStr = String(telephone).trim()

  // Remove special characters but keep the number
  telStr = telStr
    .replace(/[\s\-\(\)\.]/g, '') // Remove spaces, dashes, parentheses, dots
    .replace(/^(\+63|63|0)/, '') // Remove country code prefixes

  return telStr
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
    const dateFormat = (formData.get('dateFormat') as DateFormat) || 'MM/DD/YYYY'

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
    // Read without cellDates - we'll handle date parsing ourselves to avoid locale issues
    const workbook = XLSX.read(buffer, {
      type: 'array',
      raw: true,  // Get raw cell values
    })

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
      const mobileRaw = row[11] as string | number | undefined
      const telephoneRaw = row[12] as string | number | undefined

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
      const startDate = parseDate(startDateRaw, dateFormat)
      if (!startDate) {
        errors.push({ row: rowNumber, field: 'StartDate', message: `Start date is required. Use ${dateFormat} format.` })
      }

      // Calculate end date (last day of the lease period)
      let endDate: Date
      if (startDate) {
        endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + (rentalTermsMonths || 12))
        // Subtract 1 day to get the last day of the lease period
        // e.g., April 1, 2024 + 12 months = April 1, 2025, then -1 day = March 31, 2025
        endDate.setDate(endDate.getDate() - 1)
      } else {
        endDate = new Date()
      }

      // Parse contacts (can be multiline)
      const contactPersons = parseMultilineValue(contactPersonRaw)
      const contactPositions = parseMultilineValue(contactPositionRaw)
      const emails = parseMultilineValue(emailRaw)
      const mobiles = parsePhoneValues(mobileRaw)
      const telephones = parsePhoneValues(telephoneRaw)

      if (contactPersons.length === 0) {
        errors.push({ row: rowNumber, field: 'ContactPerson', message: 'At least one contact person is required' })
      }

      if (emails.length === 0) {
        errors.push({ row: rowNumber, field: 'Email', message: 'At least one email is required' })
      }

      if (mobiles.length === 0) {
        errors.push({ row: rowNumber, field: 'Mobile', message: 'At least one mobile number is required' })
      }

      // Build contacts array - use the maximum count from any field to create contacts
      const maxContacts = Math.max(
        contactPersons.length,
        emails.length,
        mobiles.length,
        1
      )

      const contacts = Array.from({ length: maxContacts }, (_, index) => ({
        contactPerson: contactPersons[index] || contactPersons[0] || 'Contact Person',
        contactPosition: contactPositions[index] || contactPositions[0] || null,
        email: emails[index] || (index === 0 ? emails[0] : null),
        mobile: mobiles[index]
          ? formatMobileForStorage(mobiles[index])
          : (index === 0 && mobiles[0] ? formatMobileForStorage(mobiles[0]) : null),
        telephone: telephones[index]
          ? formatTelephoneForStorage(telephones[index])
          : (index === 0 && telephones[0] ? formatTelephoneForStorage(telephones[0]) : null),
        isPrimary: index === 0, // First contact is primary
      }))

      // Only add if no critical errors for this row
      const rowErrors = errors.filter((e) => e.row === rowNumber)
      if (rowErrors.length === 0 && startDate) {
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

    // Check for duplicates in the database (same name AND address, case insensitive)
    const duplicateErrors: ValidationError[] = []

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i]
      const rowNumber = i + 2 // Account for header row and 1-indexing

      // Check against existing clients in database
      const existingClient = await prisma.client.findFirst({
        where: {
          AND: [
            { clientName: { equals: row.clientName, mode: 'insensitive' } },
            { address: { equals: row.address, mode: 'insensitive' } },
          ],
        },
      })

      if (existingClient) {
        duplicateErrors.push({
          row: rowNumber,
          field: 'ClientName',
          message: `A client with the same name and address already exists: "${existingClient.clientName}"`,
        })
      }

      // Check for duplicates within the uploaded file itself
      for (let j = 0; j < i; j++) {
        const otherRow = parsedRows[j]
        if (
          row.clientName.toLowerCase() === otherRow.clientName.toLowerCase() &&
          row.address.toLowerCase() === otherRow.address.toLowerCase()
        ) {
          duplicateErrors.push({
            row: rowNumber,
            field: 'ClientName',
            message: `Duplicate entry in file: same name and address as row ${j + 2}`,
          })
          break
        }
      }
    }

    if (duplicateErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate clients found',
          validationErrors: duplicateErrors,
          validRowCount: parsedRows.length - duplicateErrors.length,
          errorRowCount: duplicateErrors.length,
        },
        { status: 409 }
      )
    }

    // Create all clients in a transaction with extended timeout for large uploads
    // Using interactive transaction which properly supports timeout option
    const createdClients = await prisma.$transaction(
      async (tx) => {
        const results = []
        for (const row of parsedRows) {
          const client = await tx.client.create({
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
          results.push(client)
        }
        return results
      },
      {
        maxWait: 10000,  // Max time to wait for transaction to start
        timeout: 120000, // 2 minutes for large batch uploads
      }
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
