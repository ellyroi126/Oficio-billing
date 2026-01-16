import * as XLSX from 'xlsx'

export interface ExportColumn<T> {
  header: string
  key: keyof T | string
  width?: number
  format?: (value: any, row: T) => any
}

// Format currency for display
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format date for display
const formatDate = (date: string | Date): string => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Get nested value from object using dot notation
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

// Generic export function
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  // Create header row
  const headers = columns.map(col => col.header)

  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = getNestedValue(item, col.key as string)
      if (col.format) {
        return col.format(value, item)
      }
      return value ?? ''
    })
  })

  // Combine headers and data
  const wsData = [headers, ...rows]

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(wsData)

  // Set column widths
  worksheet['!cols'] = columns.map(col => ({ wch: col.width || 15 }))

  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')

  // Generate and download
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

// Invoice export columns
export const invoiceExportColumns: ExportColumn<any>[] = [
  { header: 'Invoice #', key: 'invoiceNumber', width: 18 },
  { header: 'Client', key: 'client.clientName', width: 30 },
  {
    header: 'Billing Period',
    key: 'billingPeriodStart',
    width: 28,
    format: (_, row) => `${formatDate(row.billingPeriodStart)} - ${formatDate(row.billingPeriodEnd)}`
  },
  {
    header: 'Amount',
    key: 'totalAmount',
    width: 15,
    format: (value) => formatCurrency(value)
  },
  {
    header: 'Balance',
    key: 'balance',
    width: 15,
    format: (value) => formatCurrency(value)
  },
  {
    header: 'Due Date',
    key: 'dueDate',
    width: 15,
    format: (value) => formatDate(value)
  },
  {
    header: 'Status',
    key: 'status',
    width: 12,
    format: (value) => value?.charAt(0).toUpperCase() + value?.slice(1) || ''
  },
]

// Payment export columns
export const paymentExportColumns: ExportColumn<any>[] = [
  {
    header: 'Date',
    key: 'paymentDate',
    width: 15,
    format: (value) => formatDate(value)
  },
  { header: 'Client', key: 'client.clientName', width: 30 },
  { header: 'Invoice #', key: 'invoice.invoiceNumber', width: 18 },
  {
    header: 'Amount',
    key: 'amount',
    width: 15,
    format: (value) => formatCurrency(value)
  },
  {
    header: 'Method',
    key: 'paymentMethod',
    width: 15,
    format: (value) => value || 'Not specified'
  },
  { header: 'Reference', key: 'referenceNumber', width: 20 },
  { header: 'Remarks', key: 'remarks', width: 30 },
]
