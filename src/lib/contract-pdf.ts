import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { ContractData } from './contract-template'
import * as fs from 'fs'
import * as path from 'path'

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
  let cleaned = mobile.replace(/^(\+63|63|0)/, '')
  return '(+63)' + cleaned
}

// Format telephone as (63)XXXXXXX
const formatTelephone = (telephone: string) => {
  if (!telephone) return ''
  let cleaned = telephone.replace(/^(\+63|63|0)/, '')
  return '(63)' + cleaned
}

// Format contact numbers combined with slash
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

export async function generateContractPdf(data: ContractData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 612 // Letter size
  const pageHeight = 792
  const margin = 50
  const contentWidth = pageWidth - margin * 2

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  // Colors
  const brandColor = rgb(0.10, 0.32, 0.46) // #1a5276
  const grayColor = rgb(0.4, 0.4, 0.4)
  const blackColor = rgb(0, 0, 0)
  const lightGray = rgb(0.95, 0.95, 0.95)

  const drawText = (
    text: string,
    x: number,
    yPos: number,
    options: { font?: typeof font; size?: number; color?: ReturnType<typeof rgb> } = {}
  ) => {
    page.drawText(text, {
      x,
      y: yPos,
      size: options.size || 10,
      font: options.font || font,
      color: options.color || blackColor,
    })
  }

  const drawCenteredText = (
    text: string,
    yPos: number,
    options: { font?: typeof font; size?: number; color?: ReturnType<typeof rgb> } = {}
  ) => {
    const textFont = options.font || font
    const textSize = options.size || 10
    const textWidth = textFont.widthOfTextAtSize(text, textSize)
    drawText(text, (pageWidth - textWidth) / 2, yPos, options)
  }

  const drawLine = (x1: number, y1: number, x2: number, y2: number, thickness: number = 0.5) => {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness,
      color: blackColor,
    })
  }

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y < margin + requiredSpace) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }
  }

  // Helper to wrap text within a max width
  const wrapText = (text: string, maxWidth: number, fontSize: number, textFont: typeof font = font): string[] => {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word
      const testWidth = textFont.widthOfTextAtSize(testLine, fontSize)

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) {
      lines.push(currentLine)
    }
    return lines
  }

  // ============ LOGO HEADER ============
  // Load and embed logo image
  const logoPath = path.join(process.cwd(), 'public', 'Oficio_logo.png')
  const logoBytes = fs.readFileSync(logoPath)
  const logoImage = await pdfDoc.embedPng(logoBytes)

  // Scale logo to fit nicely (original aspect ratio preserved)
  const logoWidth = 120
  const logoHeight = (logoImage.height / logoImage.width) * logoWidth
  const logoX = (pageWidth - logoWidth) / 2

  page.drawImage(logoImage, {
    x: logoX,
    y: y - logoHeight + 20,
    width: logoWidth,
    height: logoHeight,
  })
  y -= logoHeight + 0

  // ============ PARTY INFORMATION TABLE ============
  const tableLeft = margin
  const tableRight = pageWidth - margin
  const colWidth = contentWidth / 2
  const rowHeight = 22
  const cellPadding = 5
  const fontSize = 9

  // Draw cell with label and value
  const drawPartyCell = (label: string, value: string, x: number, yTop: number, width: number, height: number) => {
    // Draw cell border
    drawLine(x, yTop, x + width, yTop, 0.5)
    drawLine(x, yTop - height, x + width, yTop - height, 0.5)
    drawLine(x, yTop, x, yTop - height, 0.5)
    drawLine(x + width, yTop, x + width, yTop - height, 0.5)

    // Draw text
    const textY = yTop - 14
    drawText(label, x + cellPadding, textY, { font: boldFont, size: fontSize })
    const labelWidth = boldFont.widthOfTextAtSize(label, fontSize)

    // Truncate value if too long
    let displayValue = value
    const maxValueWidth = width - labelWidth - cellPadding * 3
    while (font.widthOfTextAtSize(displayValue, fontSize) > maxValueWidth && displayValue.length > 0) {
      displayValue = displayValue.slice(0, -1)
    }
    drawText(' ' + displayValue, x + cellPadding + labelWidth, textY, { size: fontSize })
  }

  // Header row with shading
  const headerY = y
  const headerHeight = 24

  // Draw header background
  page.drawRectangle({
    x: tableLeft,
    y: headerY - headerHeight,
    width: colWidth,
    height: headerHeight,
    color: lightGray,
  })
  page.drawRectangle({
    x: tableLeft + colWidth,
    y: headerY - headerHeight,
    width: colWidth,
    height: headerHeight,
    color: lightGray,
  })

  // Header borders
  drawLine(tableLeft, headerY, tableRight, headerY, 0.5)
  drawLine(tableLeft, headerY - headerHeight, tableRight, headerY - headerHeight, 0.5)
  drawLine(tableLeft, headerY, tableLeft, headerY - headerHeight, 0.5)
  drawLine(tableRight, headerY, tableRight, headerY - headerHeight, 0.5)
  drawLine(tableLeft + colWidth, headerY, tableLeft + colWidth, headerY - headerHeight, 0.5)

  // Header text
  drawText('Provider:', tableLeft + cellPadding, headerY - 16, { font: boldFont, size: 10 })
  drawText('Customer:', tableLeft + colWidth + cellPadding, headerY - 16, { font: boldFont, size: 10 })

  let currentY = headerY - headerHeight

  // Data rows
  const rows = [
    { label: 'Name:', providerValue: data.providerName, customerValue: data.customerName },
    { label: 'Contact Person:', providerValue: data.providerContactPerson, customerValue: data.customerContactPerson },
    { label: 'Position:', providerValue: data.providerContactPosition, customerValue: data.customerPosition },
  ]

  for (const row of rows) {
    drawPartyCell(row.label, row.providerValue, tableLeft, currentY, colWidth, rowHeight)
    drawPartyCell(row.label, row.customerValue, tableLeft + colWidth, currentY, colWidth, rowHeight)
    currentY -= rowHeight
  }

  // Address row (needs more height for wrapping)
  const addressLabelWidth = boldFont.widthOfTextAtSize('Address:', fontSize)
  const addressValueOffset = cellPadding + addressLabelWidth + 3 // 3px space after label
  const providerAddrLines = wrapText(data.providerAddress, colWidth - addressValueOffset - cellPadding, fontSize)
  const customerAddrLines = wrapText(data.customerAddress, colWidth - addressValueOffset - cellPadding, fontSize)
  const addrRowHeight = Math.max(providerAddrLines.length, customerAddrLines.length, 1) * 11 + 10

  // Draw address cells
  drawLine(tableLeft, currentY, tableRight, currentY, 0.5)
  drawLine(tableLeft, currentY - addrRowHeight, tableRight, currentY - addrRowHeight, 0.5)
  drawLine(tableLeft, currentY, tableLeft, currentY - addrRowHeight, 0.5)
  drawLine(tableRight, currentY, tableRight, currentY - addrRowHeight, 0.5)
  drawLine(tableLeft + colWidth, currentY, tableLeft + colWidth, currentY - addrRowHeight, 0.5)

  drawText('Address:', tableLeft + cellPadding, currentY - 12, { font: boldFont, size: fontSize })
  for (let i = 0; i < providerAddrLines.length; i++) {
    drawText(providerAddrLines[i], tableLeft + addressValueOffset, currentY - 12 - i * 11, { size: fontSize })
  }

  drawText('Address:', tableLeft + colWidth + cellPadding, currentY - 12, { font: boldFont, size: fontSize })
  for (let i = 0; i < customerAddrLines.length; i++) {
    drawText(customerAddrLines[i], tableLeft + colWidth + addressValueOffset, currentY - 12 - i * 11, { size: fontSize })
  }
  currentY -= addrRowHeight

  // Email row
  drawPartyCell('Email:', formatEmailsDisplay(data.providerEmails), tableLeft, currentY, colWidth, rowHeight)
  drawPartyCell('Email:', data.customerEmail, tableLeft + colWidth, currentY, colWidth, rowHeight)
  currentY -= rowHeight

  // Mobile row
  const providerMobile = formatContactDisplay(data.providerMobiles, data.providerTelephone)
  const customerMobile = formatContactDisplay(
    data.customerMobile ? [data.customerMobile] : [],
    data.customerTelephone
  )
  drawPartyCell('Mobile:', providerMobile, tableLeft, currentY, colWidth, rowHeight)
  drawPartyCell('Mobile:', customerMobile, tableLeft + colWidth, currentY, colWidth, rowHeight)
  currentY -= rowHeight

  y = currentY - 25

  // ============ SERVICE PLAN DETAILS ============
  const detailFontSize = 10
  const detailLineHeight = 16
  const vatText = data.vatInclusive ? 'VAT included' : 'VAT excluded'
  const feeLabel = getFeeLabel(data.billingTerms, data.customBillingTerms)
  const feePeriod = getFeePeriodDescription(data.billingTerms, data.customBillingTerms)

  drawText('Plan:', margin, y, { font: boldFont, size: detailFontSize })
  drawText(' ' + data.providerPlan, margin + boldFont.widthOfTextAtSize('Plan:', detailFontSize), y, { size: detailFontSize })
  y -= detailLineHeight

  drawText(feeLabel, margin, y, { font: boldFont, size: detailFontSize })
  drawText(` ${formatCurrency(data.rentalRate)} (${feePeriod}, ${vatText})`, margin + boldFont.widthOfTextAtSize(feeLabel, detailFontSize), y, { size: detailFontSize })
  y -= detailLineHeight

  drawText('Term:', margin, y, { font: boldFont, size: detailFontSize })
  drawText(` ${data.rentalTermsMonths} Months`, margin + boldFont.widthOfTextAtSize('Term:', detailFontSize), y, { size: detailFontSize })
  y -= detailLineHeight

  // Inclusions
  if (data.leaseInclusions) {
    drawText('Inclusions:', margin, y, { font: boldFont, size: detailFontSize })
    y -= 14

    const inclusionItems = formatLeaseInclusionsList(data.leaseInclusions)
    for (const item of inclusionItems) {
      drawText(`• ${item}`, margin + 15, y, { size: detailFontSize })
      y -= 13
    }
  }

  drawText('Start Date:', margin, y, { font: boldFont, size: detailFontSize })
  drawText(' ' + formatDate(data.startDate), margin + boldFont.widthOfTextAtSize('Start Date:', detailFontSize), y, { size: detailFontSize })
  y -= detailLineHeight

  drawText('End Date:', margin, y, { font: boldFont, size: detailFontSize })
  drawText(' ' + formatDate(data.endDate), margin + boldFont.widthOfTextAtSize('End Date:', detailFontSize), y, { size: detailFontSize })
  y -= 50

  // ============ TERMS OF USE AGREEMENT ============
  addNewPageIfNeeded(100)
  drawText('TERMS OF USE AGREEMENT', margin, y, { font: boldFont, size: 12 })
  y -= 22

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

  const clauseTitleSize = 10
  const clauseContentSize = 9
  const clauseLineHeight = 12

  for (const clause of clauses) {
    addNewPageIfNeeded(60)

    drawText(`${clause.number} ${clause.title}`, margin, y, { font: boldFont, size: clauseTitleSize })
    y -= 14

    // Word wrap the content
    const wrappedLines = wrapText(clause.content, contentWidth, clauseContentSize)
    for (const line of wrappedLines) {
      addNewPageIfNeeded(clauseLineHeight)
      drawText(line, margin, y, { size: clauseContentSize })
      y -= clauseLineHeight
    }
    y -= 8
  }

  // ============ SIGNATURE SECTION ============
  addNewPageIfNeeded(90)
  y -= 30

  const sigColWidth = contentWidth / 2 - 20
  const leftX = margin
  const rightX = margin + contentWidth / 2 + 10

  // Provider signature line
  page.drawLine({
    start: { x: leftX, y },
    end: { x: leftX + 200, y },
    thickness: 0.5,
    color: blackColor,
  })

  // Customer signature line
  page.drawLine({
    start: { x: rightX, y },
    end: { x: rightX + 200, y },
    thickness: 0.5,
    color: blackColor,
  })

  y -= 14

  // Names
  drawText(data.signerName, leftX, y, { font: boldFont, size: 10 })
  drawText(data.customerContactPerson, rightX, y, { font: boldFont, size: 10 })
  y -= 12

  // Position and company
  drawText(`${data.signerPosition}, ${data.providerName}`, leftX, y, { size: 9 })
  drawText(`${data.customerPosition}, ${data.customerName}`, rightX, y, { size: 9 })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
