import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { ContractData } from './contract-template'
import * as fs from 'fs'
import * as path from 'path'

// Sanitize text for PDF (replace unsupported characters)
// StandardFonts only support WinAnsiEncoding which has limited character set
const sanitizeText = (text: string): string => {
  if (!text) return ''
  let result = String(text)

  // FIRST: Replace all line breaks with spaces (pdf-lib can't encode \r)
  // This must happen before other processing
  result = result.replace(/\r\n/g, ' ')  // Windows line breaks
  result = result.replace(/\r/g, ' ')    // Old Mac line breaks
  result = result.replace(/\n/g, ' ')    // Unix line breaks
  result = result.replace(/\t/g, ' ')    // Tabs to spaces

  // Replace smart/curly quotes with regular quotes (using explicit character codes)
  // Opening double quote ", closing double quote ", low-9 double quote „, etc.
  result = result.replace(/\u201C/g, '"')  // "
  result = result.replace(/\u201D/g, '"')  // "
  result = result.replace(/\u201E/g, '"')  // „
  result = result.replace(/\u201F/g, '"')  // ‟
  result = result.replace(/\u2033/g, '"')  // ″
  result = result.replace(/\u00AB/g, '"')  // «
  result = result.replace(/\u00BB/g, '"')  // »

  // Single quotes - ', ', ‚, ‛, ′, `, ´
  result = result.replace(/\u2018/g, "'")  // '
  result = result.replace(/\u2019/g, "'")  // '
  result = result.replace(/\u201A/g, "'")  // ‚
  result = result.replace(/\u201B/g, "'")  // ‛
  result = result.replace(/\u2032/g, "'")  // ′
  result = result.replace(/\u0060/g, "'")  // `
  result = result.replace(/\u00B4/g, "'")  // ´

  // Em/en dashes
  result = result.replace(/\u2013/g, '-')  // –
  result = result.replace(/\u2014/g, '-')  // —
  result = result.replace(/\u2015/g, '-')  // ―
  result = result.replace(/\u2212/g, '-')  // −

  // Ellipsis
  result = result.replace(/\u2026/g, '...')  // …

  // Various spaces to regular space
  result = result.replace(/\u00A0/g, ' ')  // Non-breaking space
  result = result.replace(/[\u2000-\u200B]/g, ' ')  // Various Unicode spaces
  result = result.replace(/\u202F/g, ' ')  // Narrow no-break space
  result = result.replace(/\u205F/g, ' ')  // Medium mathematical space
  result = result.replace(/\u3000/g, ' ')  // Ideographic space

  // Bullets to asterisk
  result = result.replace(/[\u2022\u2023\u2043\u204C\u204D]/g, '*')

  // Math symbols
  result = result.replace(/\u00D7/g, 'x')   // ×
  result = result.replace(/\u00F7/g, '/')   // ÷

  // Other symbols
  result = result.replace(/\u00B0/g, ' deg')  // °
  result = result.replace(/\u00A9/g, '(c)')   // ©
  result = result.replace(/\u00AE/g, '(R)')   // ®
  result = result.replace(/\u2122/g, '(TM)')  // ™

  // Collapse multiple spaces into one
  result = result.replace(/\s+/g, ' ').trim()

  // Final pass: Remove ANY character not in WinAnsi range
  // WinAnsi supports: 0x20-0x7E (basic ASCII printable) and 0xA0-0xFF (extended Latin)
  result = result.split('').filter(char => {
    const code = char.charCodeAt(0)
    return (code >= 0x20 && code <= 0x7E) || // Basic ASCII printable
           (code >= 0xA0 && code <= 0xFF)    // Extended Latin (WinAnsi)
  }).join('')

  return result
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

// Format telephone as (+63)XXXXXXX
const formatTelephone = (telephone: string) => {
  if (!telephone) return ''
  // Ensure it's a string and clean it
  const telStr = String(telephone).trim()
  if (!telStr) return ''
  // Remove non-numeric characters except + at the start
  let cleaned = telStr.replace(/[^\d+]/g, '').replace(/^(\+63|63|0)/, '')
  return '(+63)' + cleaned
}

// Format mobile numbers with slash, return N/A if empty
const formatMobilesDisplay = (mobiles: string[]): string => {
  const parts: string[] = []
  for (const mobile of mobiles) {
    if (mobile && mobile.trim()) {
      parts.push(formatMobile(mobile))
    }
  }
  return parts.length > 0 ? parts.join(' / ') : 'N/A'
}

// Format multiple emails with slash for display, return N/A if empty
const formatEmailsDisplay = (emails: string[]): string => {
  const filtered = emails.filter(email => email && email.trim())
  return filtered.length > 0 ? filtered.join(' / ') : 'N/A'
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
    // Sanitize text to remove unsupported characters
    const safeText = sanitizeText(text || '')
    page.drawText(safeText, {
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
    const safeText = sanitizeText(text || '')
    const textFont = options.font || font
    const textSize = options.size || 10
    const textWidth = textFont.widthOfTextAtSize(safeText, textSize)
    drawText(safeText, (pageWidth - textWidth) / 2, yPos, options)
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
    // Sanitize text first to avoid issues with special characters
    const safeText = sanitizeText(text || '')
    if (!safeText) return ['']

    const words = safeText.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      // Handle very long words that exceed max width by themselves
      if (textFont.widthOfTextAtSize(word, fontSize) > maxWidth) {
        // Push current line if it has content
        if (currentLine) {
          lines.push(currentLine)
          currentLine = ''
        }
        // Break the long word into chunks that fit
        let remainingWord = word
        while (remainingWord.length > 0) {
          let chunkEnd = remainingWord.length
          while (chunkEnd > 1 && textFont.widthOfTextAtSize(remainingWord.substring(0, chunkEnd), fontSize) > maxWidth) {
            chunkEnd--
          }
          const chunk = remainingWord.substring(0, chunkEnd)
          lines.push(chunk)
          remainingWord = remainingWord.substring(chunkEnd)
        }
        continue
      }

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
    return lines.length > 0 ? lines : ['']
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

  // Draw cell with label and value (with text wrapping support)
  const drawPartyCell = (label: string, value: string, x: number, yTop: number, width: number, height: number) => {
    // Draw cell border
    drawLine(x, yTop, x + width, yTop, 0.5)
    drawLine(x, yTop - height, x + width, yTop - height, 0.5)
    drawLine(x, yTop, x, yTop - height, 0.5)
    drawLine(x + width, yTop, x + width, yTop - height, 0.5)

    // Draw text - use N/A for empty values
    const displayValue = value && value.trim() ? value : 'N/A'
    const textY = yTop - 14
    drawText(label, x + cellPadding, textY, { font: boldFont, size: fontSize })
    const labelWidth = boldFont.widthOfTextAtSize(label, fontSize)
    const spacingAfterLabel = 4 // Fixed spacing after label
    const valueX = x + cellPadding + labelWidth + spacingAfterLabel
    const maxValueWidth = width - labelWidth - spacingAfterLabel - cellPadding * 2

    // Wrap value text
    const valueLines = wrapText(displayValue, maxValueWidth, fontSize)

    // Draw first line after label, subsequent lines below
    for (let i = 0; i < valueLines.length; i++) {
      if (i === 0) {
        drawText(valueLines[i], valueX, textY, { size: fontSize })
      } else {
        drawText(valueLines[i], valueX, textY - i * 10, { size: fontSize })
      }
    }
  }

  // Calculate row height needed for wrapped content
  const getRowHeightForContent = (value1: string, value2: string, labelWidth: number): number => {
    const maxValueWidth = colWidth - labelWidth - cellPadding * 3
    const lines1 = wrapText(value1 || '', maxValueWidth, fontSize)
    const lines2 = wrapText(value2 || '', maxValueWidth, fontSize)
    const maxLines = Math.max(lines1.length, lines2.length)
    return Math.max(rowHeight, maxLines * 10 + 12)
  }

  // Draw a row with dynamic height based on content
  const drawDynamicRow = (label: string, providerValue: string, customerValue: string): number => {
    const labelWidth = boldFont.widthOfTextAtSize(label, fontSize)
    const height = getRowHeightForContent(providerValue, customerValue, labelWidth)
    drawPartyCell(label, providerValue, tableLeft, currentY, colWidth, height)
    drawPartyCell(label, customerValue, tableLeft + colWidth, currentY, colWidth, height)
    return height
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

  // Format arrays with "/" separator, return N/A if empty
  const formatArrayDisplay = (items: string[]): string => {
    const filtered = items.filter(item => item && item.trim())
    return filtered.length > 0 ? filtered.join(' / ') : 'N/A'
  }

  // Format contact persons with deduplication, return N/A if empty
  const formatContactPersonsDisplay = (persons: string[]): string => {
    const filtered = persons.filter(p => p && p.trim())
    if (filtered.length === 0) return 'N/A'
    const unique = [...new Set(filtered)]
    return unique.join(' / ')
  }

  // Format positions with deduplication, return N/A if empty
  const formatPositionsDisplay = (positions: string[]): string => {
    const filtered = positions.filter(pos => pos && pos.trim())
    if (filtered.length === 0) return 'N/A'
    const unique = [...new Set(filtered)]
    // If only one unique position, show it once
    if (unique.length === 1) {
      return unique[0]
    }
    return unique.join(' / ')
  }

  // Data rows with dynamic height
  currentY -= drawDynamicRow('Name:', data.providerName, data.customerName)
  currentY -= drawDynamicRow('Contact Person:', data.providerContactPerson, formatContactPersonsDisplay(data.customerContactPersons))
  currentY -= drawDynamicRow('Position:', data.providerContactPosition, formatPositionsDisplay(data.customerPositions))

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

  // Email row with dynamic height
  currentY -= drawDynamicRow('Email:', formatEmailsDisplay(data.providerEmails), formatEmailsDisplay(data.customerEmails))

  // Mobile row with dynamic height
  const providerMobile = formatMobilesDisplay(data.providerMobiles)
  const customerMobile = formatMobilesDisplay(data.customerMobiles)
  currentY -= drawDynamicRow('Mobile:', providerMobile, customerMobile)

  // Telephone row with dynamic height
  const providerTel = data.providerTelephone ? formatTelephone(data.providerTelephone) : ''
  const customerTel = data.customerTelephone ? formatTelephone(data.customerTelephone) : ''
  currentY -= drawDynamicRow('Telephone:', providerTel, customerTel)

  y = currentY - 25

  // ============ SERVICE PLAN DETAILS ============
  const detailFontSize = 10
  const detailLineHeight = 16
  const vatText = data.vatInclusive ? 'VAT included' : 'VAT excluded'
  const feeLabel = getFeeLabel(data.billingTerms, data.customBillingTerms)
  const feePeriod = getFeePeriodDescription(data.billingTerms, data.customBillingTerms)
  const labelValueSpacing = 4 // Fixed spacing between label and value

  drawText('Plan:', margin, y, { font: boldFont, size: detailFontSize })
  drawText(data.providerPlan, margin + boldFont.widthOfTextAtSize('Plan:', detailFontSize) + labelValueSpacing, y, { size: detailFontSize })
  y -= detailLineHeight

  drawText(feeLabel, margin, y, { font: boldFont, size: detailFontSize })
  drawText(`${formatCurrency(data.rentalRate)} (${feePeriod}, ${vatText})`, margin + boldFont.widthOfTextAtSize(feeLabel, detailFontSize) + labelValueSpacing, y, { size: detailFontSize })
  y -= detailLineHeight

  drawText('Term:', margin, y, { font: boldFont, size: detailFontSize })
  drawText(`${data.rentalTermsMonths} Months`, margin + boldFont.widthOfTextAtSize('Term:', detailFontSize) + labelValueSpacing, y, { size: detailFontSize })
  y -= detailLineHeight

  // Inclusions
  if (data.leaseInclusions) {
    drawText('Inclusions:', margin, y, { font: boldFont, size: detailFontSize })
    y -= 14

    const inclusionItems = formatLeaseInclusionsList(data.leaseInclusions)
    for (const item of inclusionItems) {
      drawText(`* ${item}`, margin + 15, y, { size: detailFontSize })
      y -= 13
    }
  }

  drawText('Start Date:', margin, y, { font: boldFont, size: detailFontSize })
  drawText(formatDate(data.startDate), margin + boldFont.widthOfTextAtSize('Start Date:', detailFontSize) + labelValueSpacing, y, { size: detailFontSize })
  y -= detailLineHeight

  drawText('End Date:', margin, y, { font: boldFont, size: detailFontSize })
  drawText(formatDate(data.endDate), margin + boldFont.widthOfTextAtSize('End Date:', detailFontSize) + labelValueSpacing, y, { size: detailFontSize })
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

  // Try to load and draw manager signature image (above the signature line)
  try {
    const signaturePath = path.join(process.cwd(), 'public', 'Meg-e-sig.png')
    const signatureBytes = fs.readFileSync(signaturePath)
    const signatureImage = await pdfDoc.embedPng(signatureBytes)
    const sigDims = signatureImage.scale(0.45)  // Larger signature
    // Position signature lower, closer to the line (can overlap with line/name below)
    page.drawImage(signatureImage, {
      x: leftX - 20,  // More to the left
      y: y - 35,  // Moved down further
      width: sigDims.width,
      height: sigDims.height,
    })
  } catch (error) {
    // Signature not found, continue without it
    console.error('Signature image not found:', error)
  }

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

  // Names (use first/primary contact for signature)
  drawText(data.signerName, leftX, y, { font: boldFont, size: 10 })
  drawText(data.customerContactPersons[0] || '', rightX, y, { font: boldFont, size: 10 })
  y -= 12

  // Position and company
  drawText(`${data.signerPosition}, ${data.providerName}`, leftX, y, { size: 9 })
  drawText(`${data.customerPositions[0] || ''}, ${data.customerName}`, rightX, y, { size: 9 })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
