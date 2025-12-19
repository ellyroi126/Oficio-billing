import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// GET - Generate and download the client upload template
export async function GET() {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new()

    // Header row - must match EXPECTED_HEADERS in upload route exactly
    const headers = [
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

    // Instructions row (row 2) - format hints
    const instructions = [
      'Company/Person Name',
      'Full Address',
      'Number (e.g., 10000)',
      'Y or N',
      'Months (e.g., 12)',
      'Monthly/Quarterly/Semi-Annual/Annual/Other',
      'March 1, 2025 (use this format)',
      'One per line',
      'Full Name',
      'e.g., Director',
      'email@example.com',
      '9171234567',
      '(02) 1234567',
    ]

    // Example data row
    const exampleData = [
      'ABC Corporation',
      '123 Main Street, Makati City',
      '15000',
      'Y',
      '12',
      'Monthly',
      'March 1, 2025',
      'Business Address\nPersonal Mailbox',
      'Juan Dela Cruz',
      'General Manager',
      'juan@abc.com',
      '9171234567',
      '(02) 8123-4567',
    ]

    // Create worksheet with headers, instructions, and example
    const wsData = [headers, instructions, exampleData]
    const worksheet = XLSX.utils.aoa_to_sheet(wsData)

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 25 },  // ClientName
      { wch: 40 },  // Address
      { wch: 12 },  // RentalRate
      { wch: 22 },  // VAT
      { wch: 12 },  // RentalTerms
      { wch: 15 },  // BillingTerms
      { wch: 20 },  // StartDate
      { wch: 25 },  // LeaseInclusions
      { wch: 20 },  // ContactPerson
      { wch: 25 },  // ContactPosition
      { wch: 25 },  // Email
      { wch: 15 },  // Mobile
      { wch: 15 },  // Telephone
    ]

    // Add the worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients')

    // Create instructions sheet
    const instructionsSheet = XLSX.utils.aoa_to_sheet([
      ['OFICIO CLIENT UPLOAD TEMPLATE - INSTRUCTIONS'],
      [''],
      ['IMPORTANT: Date Format'],
      ['Enter dates using this format: March 1, 2025'],
      ['This format is unambiguous and will always be parsed correctly.'],
      [''],
      ['If you prefer numeric dates like 03/01/2025:'],
      ['  - Select the correct format in the upload modal'],
      ['  - MM/DD/YYYY: 03/01/2025 = March 1'],
      ['  - DD/MM/YYYY: 03/01/2025 = January 3'],
      [''],
      ['Column Descriptions:'],
      ['  ClientName* - Company or individual name (required)'],
      ['  Address* - Full business address (required)'],
      ['  RentalRate* - Monthly rate as number, e.g., 10000 (required)'],
      ['  VAT* - Y for VAT inclusive, N for VAT exclusive (required)'],
      ['  RentalTerms* - Contract duration in months, e.g., 12 (required)'],
      ['  BillingTerms* - One of: Monthly, Quarterly, Semi-Annual, Annual, Other (required)'],
      ['  StartDate* - Contract start date (required)'],
      ['  LeaseInclusions* - Services included, one per line (required)'],
      ['  ContactPerson* - Primary contact name (required)'],
      ['  ContactPerson\'s Position* - Contact\'s job title (required)'],
      ['  Email* - Contact email address (required)'],
      ['  Mobile* - Mobile number without country code, e.g., 9171234567 (required)'],
      ['  Telephone - Landline number (optional)'],
      [''],
      ['Tips:'],
      ['  - Delete the example row (row 3) before entering your data'],
      ['  - Row 2 contains format hints - you can delete it too'],
      ['  - For multiple contacts, enter each on a new line within the same cell'],
      ['  - Do not change the column headers'],
    ])

    instructionsSheet['!cols'] = [{ wch: 80 }]
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Oficio Client Upload Template.xlsx"',
      },
    })
  } catch (error) {
    console.error('Error generating template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate template' },
      { status: 500 }
    )
  }
}
