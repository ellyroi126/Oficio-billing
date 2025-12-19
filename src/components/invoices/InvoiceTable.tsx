'use client'

import Link from 'next/link'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table'
import { Badge, getStatusVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FileText, Download, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  amount: number
  vatAmount: number
  totalAmount: number
  billingPeriodStart: string
  billingPeriodEnd: string
  dueDate: string
  filePath: string | null
  createdAt: string
  client: {
    id: string
    clientName: string
  }
  payments?: { amount: number }[]
  totalPaid?: number
  balance?: number
}

interface InvoiceTableProps {
  invoices: Invoice[]
  onDelete: (id: string) => void
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  sortField?: InvoiceSortField
  sortDirection?: SortDirection
  onSort?: (field: InvoiceSortField) => void
}

export type InvoiceSortField = 'invoiceNumber' | 'clientName' | 'totalAmount' | 'dueDate' | 'status' | 'createdAt'
export type SortDirection = 'asc' | 'desc'

export function InvoiceTable({
  invoices,
  onDelete,
  selectedIds,
  onSelectionChange,
  sortField,
  sortDirection,
  onSort,
}: InvoiceTableProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(invoices.map((i) => i.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id])
    } else {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id))
    }
  }

  const allSelected = invoices.length > 0 && selectedIds.length === invoices.length
  const someSelected = selectedIds.length > 0 && selectedIds.length < invoices.length

  const SortIcon = ({ field }: { field: InvoiceSortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-gray-400" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    )
  }

  const SortableHeader = ({
    field,
    children,
  }: {
    field: InvoiceSortField
    children: React.ReactNode
  }) => (
    <button
      className="flex items-center text-xs font-medium text-gray-500 hover:text-gray-700"
      onClick={() => onSort?.(field)}
    >
      {children}
      <SortIcon field={field} />
    </button>
  )

  const StaticHeader = ({ children }: { children: React.ReactNode }) => (
    <span className="text-xs font-medium text-gray-500">{children}</span>
  )

  // Check if invoice is overdue
  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'paid') return false
    return new Date(invoice.dueDate) < new Date()
  }

  if (invoices.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No invoices found.</p>
        <p className="mt-2 text-sm text-gray-400">
          Generate invoices for clients to get started.
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader className="w-12">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected
              }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </TableHeader>
          <TableHeader><SortableHeader field="invoiceNumber">Invoice #</SortableHeader></TableHeader>
          <TableHeader><SortableHeader field="clientName">Client</SortableHeader></TableHeader>
          <TableHeader><StaticHeader>Billing Period</StaticHeader></TableHeader>
          <TableHeader><SortableHeader field="totalAmount">Amount</SortableHeader></TableHeader>
          <TableHeader><StaticHeader>Balance</StaticHeader></TableHeader>
          <TableHeader><SortableHeader field="dueDate">Due Date</SortableHeader></TableHeader>
          <TableHeader><SortableHeader field="status">Status</SortableHeader></TableHeader>
          <TableHeader><StaticHeader>Actions</StaticHeader></TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {invoices.map((invoice) => {
          const isSelected = selectedIds.includes(invoice.id)
          const overdue = isOverdue(invoice)
          const balance = invoice.balance ?? invoice.totalAmount
          return (
            <TableRow key={invoice.id} className={isSelected ? 'bg-blue-50' : ''}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleSelectOne(invoice.id, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </TableCell>
              <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
              <TableCell>
                <Link
                  href={`/clients/${invoice.client.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {invoice.client.clientName}
                </Link>
              </TableCell>
              <TableCell>{formatPeriod(invoice.billingPeriodStart, invoice.billingPeriodEnd)}</TableCell>
              <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
              <TableCell className={balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                {formatCurrency(balance)}
              </TableCell>
              <TableCell className={overdue ? 'text-red-600 font-medium' : ''}>
                {formatDate(invoice.dueDate)}
              </TableCell>
              <TableCell>
                <Badge variant={overdue && invoice.status !== 'paid' ? 'danger' : getStatusVariant(invoice.status)}>
                  {overdue && invoice.status !== 'paid' ? 'Overdue' : invoice.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Link href={`/invoices/${invoice.id}`}>
                    <Button variant="ghost" size="sm" title="View">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </Link>
                  {invoice.filePath && (
                    <a href={`/api/invoices/${invoice.id}/download`}>
                      <Button variant="ghost" size="sm" title="Download PDF">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Delete"
                    onClick={() => onDelete(invoice.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
