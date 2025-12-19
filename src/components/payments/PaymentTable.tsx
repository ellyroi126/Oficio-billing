'use client'

import Link from 'next/link'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { FileText, Trash2, ArrowUp, ArrowDown, ArrowUpDown, Image, File } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: string
  referenceNumber: string | null
  notes: string | null
  evidencePath: string | null
  createdAt: string
  invoice: {
    id: string
    invoiceNumber: string
    totalAmount: number
    client: {
      id: string
      clientName: string
    }
  }
}

interface PaymentTableProps {
  payments: Payment[]
  onDelete: (id: string) => void
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  sortField?: PaymentSortField
  sortDirection?: SortDirection
  onSort?: (field: PaymentSortField) => void
}

export type PaymentSortField = 'paymentDate' | 'clientName' | 'invoiceNumber' | 'amount' | 'paymentMethod'
export type SortDirection = 'asc' | 'desc'

export function PaymentTable({
  payments,
  onDelete,
  selectedIds,
  onSelectionChange,
  sortField,
  sortDirection,
  onSort,
}: PaymentTableProps) {
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(payments.map((p) => p.id))
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

  const allSelected = payments.length > 0 && selectedIds.length === payments.length
  const someSelected = selectedIds.length > 0 && selectedIds.length < payments.length

  const SortIcon = ({ field }: { field: PaymentSortField }) => {
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
    field: PaymentSortField
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

  const getEvidenceIcon = (path: string | null) => {
    if (!path) return null
    const ext = path.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
      return <Image className="h-4 w-4 text-green-500" />
    }
    return <File className="h-4 w-4 text-blue-500" />
  }

  if (payments.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No payments found.</p>
        <p className="mt-2 text-sm text-gray-400">
          Record payments for invoices to track transactions.
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
          <TableHeader><SortableHeader field="paymentDate">Date</SortableHeader></TableHeader>
          <TableHeader><SortableHeader field="clientName">Client</SortableHeader></TableHeader>
          <TableHeader><SortableHeader field="invoiceNumber">Invoice</SortableHeader></TableHeader>
          <TableHeader><SortableHeader field="amount">Amount</SortableHeader></TableHeader>
          <TableHeader><SortableHeader field="paymentMethod">Method</SortableHeader></TableHeader>
          <TableHeader><StaticHeader>Reference</StaticHeader></TableHeader>
          <TableHeader><StaticHeader>Evidence</StaticHeader></TableHeader>
          <TableHeader><StaticHeader>Actions</StaticHeader></TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {payments.map((payment) => {
          const isSelected = selectedIds.includes(payment.id)
          return (
            <TableRow key={payment.id} className={isSelected ? 'bg-blue-50' : ''}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleSelectOne(payment.id, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </TableCell>
              <TableCell>{formatDate(payment.paymentDate)}</TableCell>
              <TableCell>
                <Link
                  href={`/clients/${payment.invoice.client.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {payment.invoice.client.clientName}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/invoices/${payment.invoice.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {payment.invoice.invoiceNumber}
                </Link>
              </TableCell>
              <TableCell className="font-medium text-green-600">
                {formatCurrency(payment.amount)}
              </TableCell>
              <TableCell className="capitalize">{payment.paymentMethod}</TableCell>
              <TableCell className="text-gray-500">
                {payment.referenceNumber || '-'}
              </TableCell>
              <TableCell>
                {payment.evidencePath ? (
                  <a
                    href={payment.evidencePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    {getEvidenceIcon(payment.evidencePath)}
                    <span className="text-xs">View</span>
                  </a>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Link href={`/payments/${payment.id}`}>
                    <Button variant="ghost" size="sm" title="View">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Delete"
                    onClick={() => onDelete(payment.id)}
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
