import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  TableLayoutType,
  PageBreak,
  ImageRun,
} from 'docx'
import * as fs from 'fs'
import * as path from 'path'

export interface ContractData {
  // Provider (Company)
  providerName: string
  providerContactPerson: string
  providerContactPosition: string
  providerAddress: string
  providerEmails: string[]
  providerMobiles: string[]
  providerTelephone?: string | null
  providerPlan: string

  // Signer (from Contract Signers/Approvers)
  signerName: string
  signerPosition: string

  // Customer (Client)
  customerName: string
  customerContactPerson: string
  customerAddress: string
  customerEmail: string
  customerMobile: string
  customerTelephone?: string | null
  customerPosition: string

  // Contract Terms
  rentalRate: number
  vatInclusive: boolean
  rentalTermsMonths: number
  billingTerms: string
  customBillingTerms?: string | null
  leaseInclusions?: string | null
  startDate: Date
  endDate: Date

  // Generated
  contractNumber: string
  contractYear: string
}

// Format currency as "Php. X,XXX.XX"
const formatCurrency = (amount: number) => {
  return 'Php. ' + new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Format mobile as (+63)XXXXXXXXX
const formatMobile = (mobile: string) => {
  if (!mobile) return ''
  // Ensure it's a string and clean it
  const mobileStr = String(mobile).trim()
  if (!mobileStr) return ''
  // Remove non-numeric characters except + at the start
  let cleaned = mobileStr.replace(/[^\d+]/g, '').replace(/^(\+63|63|0)/, '')
  return '(+63)' + cleaned
}

// Format telephone as (63)XXXXXXX
const formatTelephone = (telephone: string) => {
  if (!telephone) return ''
  // Ensure it's a string and clean it
  const telStr = String(telephone).trim()
  if (!telStr) return ''
  // Remove non-numeric characters except + at the start
  let cleaned = telStr.replace(/[^\d+]/g, '').replace(/^(\+63|63|0)/, '')
  return '(63)' + cleaned
}

// Format contact numbers combined with slash for display
const formatContactDisplay = (mobiles: string[], telephone?: string | null): string => {
  const parts: string[] = []
  // Include all mobiles
  for (const mobile of mobiles) {
    if (mobile) {
      parts.push(formatMobile(mobile))
    }
  }
  if (telephone) {
    parts.push(formatTelephone(telephone))
  }
  return parts.join(' / ')
}

// Format multiple emails with slash for display
const formatEmailsDisplay = (emails: string[]): string => {
  return emails.filter(email => email).join(' / ')
}

// Get fee label based on billing terms
const getFeeLabel = (billingTerms: string, customBillingTerms?: string | null): string => {
  switch (billingTerms) {
    case 'Monthly':
      return 'Monthly Fee:'
    case 'Quarterly':
      return 'Quarterly Fee:'
    case 'Semi-Annual':
      return 'Semi-Annual Fee:'
    case 'Annual':
      return 'Annual Fee:'
    case 'Other':
      return customBillingTerms ? `${customBillingTerms} Fee:` : 'Service Fee:'
    default:
      return 'Service Fee:'
  }
}

// Get fee period description based on billing terms
const getFeePeriodDescription = (billingTerms: string, customBillingTerms?: string | null): string => {
  switch (billingTerms) {
    case 'Monthly':
      return 'Monthly service fee'
    case 'Quarterly':
      return 'Quarterly service fee'
    case 'Semi-Annual':
      return 'Semi-annual service fee'
    case 'Annual':
      return 'One year service fee'
    case 'Other':
      return customBillingTerms ? `${customBillingTerms} service fee` : 'Service fee'
    default:
      return 'Service fee'
  }
}

// Format lease inclusions as array
const formatLeaseInclusionsList = (leaseInclusions: string): string[] => {
  return leaseInclusions
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
}

// Standard cell borders - thin black lines
const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
}

// No borders for signature table
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
}

export async function generateContractDocx(data: ContractData): Promise<Buffer> {
  // Load logo image
  const logoPath = path.join(process.cwd(), 'public', 'Oficio_logo.png')
  const logoBuffer = fs.readFileSync(logoPath)

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 22, // 11pt
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inch
              bottom: 720,
              left: 900,   // 0.625 inch
              right: 900,
            },
          },
        },
        children: [
          // ============ LOGO HEADER ============
          new Paragraph({
            children: [
              new ImageRun({
                data: logoBuffer,
                transformation: {
                  width: 180,
                  height: 140,
                },
                type: 'png',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
          }),

          // ============ PARTY INFORMATION TABLE ============
          createPartyTable(data),

          // Spacer
          new Paragraph({ children: [], spacing: { after: 300 } }),

          // ============ SERVICE PLAN DETAILS ============
          ...createServiceDetails(data),

          // Spacer before Terms of Use
          new Paragraph({ children: [], spacing: { after: 600 } }),

          // ============ TERMS OF USE AGREEMENT ============
          new Paragraph({
            children: [
              new TextRun({
                text: 'TERMS OF USE AGREEMENT',
                bold: true,
                size: 24, // 12pt
                font: 'Arial',
              }),
            ],
            spacing: { after: 300 },
          }),

          // Clauses
          ...createClauses(data),

          // ============ SIGNATURE SECTION ============
          ...createSignatureSection(data),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return Buffer.from(buffer)
}

function createPartyTable(data: ContractData): Table {
  const providerContact = formatContactDisplay(data.providerMobiles, data.providerTelephone)
  const customerContact = formatContactDisplay(
    data.customerMobile ? [data.customerMobile] : [],
    data.customerTelephone
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      // Header Row
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Provider:', bold: true, size: 22 })],
                spacing: { before: 60, after: 60 },
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            shading: { fill: 'F2F2F2' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Customer:', bold: true, size: 22 })],
                spacing: { before: 60, after: 60 },
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            shading: { fill: 'F2F2F2' },
          }),
        ],
      }),

      // Name
      createTableRow('Name:', data.providerName, 'Name:', data.customerName),

      // Contact Person
      createTableRow('Contact Person:', data.providerContactPerson, 'Contact Person:', data.customerContactPerson),

      // Position
      createTableRow('Position:', data.providerContactPosition, 'Position:', data.customerPosition),

      // Address
      createTableRow('Address:', data.providerAddress, 'Address:', data.customerAddress),

      // Email
      createTableRow('Email:', formatEmailsDisplay(data.providerEmails), 'Email:', data.customerEmail),

      // Mobile
      createTableRow('Mobile:', providerContact, 'Mobile:', customerContact),
    ],
  })
}

function createTableRow(label1: string, value1: string, label2: string, value2: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: label1, bold: true, size: 20 }),
              new TextRun({ text: ' ' + value1, size: 20 }),
            ],
            spacing: { before: 40, after: 40 },
          }),
        ],
        width: { size: 50, type: WidthType.PERCENTAGE },
        borders: cellBorders,
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: label2, bold: true, size: 20 }),
              new TextRun({ text: ' ' + value2, size: 20 }),
            ],
            spacing: { before: 40, after: 40 },
          }),
        ],
        width: { size: 50, type: WidthType.PERCENTAGE },
        borders: cellBorders,
      }),
    ],
  })
}

function createServiceDetails(data: ContractData): Paragraph[] {
  const vatText = data.vatInclusive ? 'VAT included' : 'VAT excluded'
  const feeLabel = getFeeLabel(data.billingTerms, data.customBillingTerms)
  const feePeriod = getFeePeriodDescription(data.billingTerms, data.customBillingTerms)
  const paragraphs: Paragraph[] = []
  const fontSize = 22 // 11pt

  // Plan
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Plan: ', bold: true, size: fontSize }),
        new TextRun({ text: data.providerPlan, size: fontSize }),
      ],
      spacing: { after: 120 },
    })
  )

  // Fee (dynamic based on billing terms)
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: `${feeLabel} `, bold: true, size: fontSize }),
        new TextRun({ text: `${formatCurrency(data.rentalRate)} (${feePeriod}, ${vatText})`, size: fontSize }),
      ],
      spacing: { after: 120 },
    })
  )

  // Term
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Term: ', bold: true, size: fontSize }),
        new TextRun({ text: `${data.rentalTermsMonths} Months`, size: fontSize }),
      ],
      spacing: { after: 120 },
    })
  )

  // Inclusions
  if (data.leaseInclusions) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Inclusions:', bold: true, size: fontSize }),
        ],
        spacing: { after: 60 },
      })
    )

    const inclusionItems = formatLeaseInclusionsList(data.leaseInclusions)
    for (const item of inclusionItems) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `• ${item}`, size: fontSize }),
          ],
          indent: { left: 360 },
          spacing: { after: 60 },
        })
      )
    }
  }

  // Start Date
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Start Date: ', bold: true, size: fontSize }),
        new TextRun({ text: formatDate(data.startDate), size: fontSize }),
      ],
      spacing: { after: 120 },
    })
  )

  // End Date
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'End Date: ', bold: true, size: fontSize }),
        new TextRun({ text: formatDate(data.endDate), size: fontSize }),
      ],
      spacing: { after: 120 },
    })
  )

  return paragraphs
}

function createClauses(data: ContractData): Paragraph[] {
  const clauses = [
    {
      number: '1.1',
      title: 'PRODUCT DEFINITION',
      content: `"Virtual Office" shall refer to the service where ${data.providerName} (the Provider) allows the Customer to use its designated address as their business address.`,
    },
    {
      number: '1.2',
      title: 'OPERATING HOURS',
      content: 'Services are available during regular business hours, from 7:30 am to 6:30 pm. The Provider will observe all Philippine public holidays.',
    },
    {
      number: '1.3',
      title: 'COMMUNICATIONS',
      content: 'The primary method of communication will be email. Any email sent to the address provided by the Customer is considered delivered and accepted. The Customer is responsible for keeping their email address updated.',
    },
    {
      number: '1.4',
      title: 'SUSPENSION OR TERMINATION',
      content: `The agreement term is ${data.rentalTermsMonths} months. No early termination is allowed. The agreement renews automatically for the same term unless either party gives 30 days' prior written notice. If the Customer terminates early, all deposits and advances are forfeited as liquidated damages. If the Provider terminates without fault of the Customer, deposits and advances will be refunded.`,
    },
    {
      number: '1.5',
      title: 'CLIENT PRIVACY',
      content: "The Provider guarantees customer information will be kept confidential and not sold or shared. However, it reserves the right to release information to a third party if it believes it is necessary to secure the performance of the customer's obligations.",
    },
    {
      number: '1.6',
      title: 'FRAUDULENT USE OF SERVICE',
      content: "The Customer agrees not to use the Provider's name, services, or premises for any illegal, fraudulent, or unethical purposes. The Provider is not responsible for any civil or criminal law violations by the Customer.",
    },
    {
      number: '1.7',
      title: 'INDEMNITY',
      content: "The Customer agrees to indemnify and hold the Provider harmless from any claims, losses, damages, or expenses arising from the Customer's actions or the actions of their employees, agents, or invitees.",
    },
    {
      number: '1.8',
      title: 'MISCELLANEOUS',
      content: `The Provider is only a service provider and is not affiliated with the Customer, nor is it a guarantor for the Customer's financial obligations (loans, credits, etc.). The agreement is for a single customer entity to use a single ${data.providerName} location.`,
    },
    {
      number: '1.9',
      title: 'PAYMENT TERMS',
      content: "The service fee must be paid three (3) days before each month's billing period. Late payments will incur an interest charge of 0.2% per day on the outstanding amount. A deposit equivalent to one month's service fee is required upon signing. The deposit will be returned to the Customer after the agreement ends and all outstanding fees and costs have been settled.",
    },
  ]

  const paragraphs: Paragraph[] = []
  const titleSize = 22 // 11pt
  const contentSize = 20 // 10pt

  clauses.forEach((clause) => {
    // Clause title
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${clause.number} ${clause.title}`, bold: true, size: titleSize }),
        ],
        spacing: { before: 200, after: 100 },
      })
    )
    // Clause content
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: clause.content, size: contentSize })],
        spacing: { after: 160 },
      })
    )
  })

  return paragraphs
}

function createSignatureSection(data: ContractData): (Paragraph | Table)[] {
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      // Signature lines
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: '_'.repeat(35), size: 20 })],
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: noBorders,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: '_'.repeat(35), size: 20 })],
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: noBorders,
          }),
        ],
      }),
      // Names
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: data.signerName, bold: true, size: 22 })],
                spacing: { before: 60 },
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: noBorders,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: data.customerContactPerson, bold: true, size: 22 })],
                spacing: { before: 60 },
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: noBorders,
          }),
        ],
      }),
      // Position and Company
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: `${data.signerPosition}, ${data.providerName}`, size: 20 })],
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: noBorders,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: `${data.customerPosition}, ${data.customerName}`, size: 20 })],
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: noBorders,
          }),
        ],
      }),
    ],
  })

  return [
    new Paragraph({ children: [], spacing: { before: 600 } }),
    signatureTable,
  ]
}
