'use client'

import Link from 'next/link'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table'
import { Badge, getStatusVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Edit, FileText, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

interface Client {
  id: string
  clientName: string
  rentalRate: number
  billingTerms: string
  rentalTermsMonths: number
  startDate: string
  status: string
  contacts: {
    contactPerson: string
    email: string | null
    mobile: string | null
    isPrimary: boolean
  }[]
  _count: { contracts: number }
}

export type ClientSortField = 'clientName' | 'rentalRate' | 'contracts' | 'status' | 'startDate'
export type SortDirection = 'asc' | 'desc'

interface ClientTableProps {
  clients: Client[]
  onDelete: (id: string) => void
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  sortField?: ClientSortField
  sortDirection?: SortDirection
  onSort?: (field: ClientSortField) => void
}

export function ClientTable({
  clients,
  onDelete,
  selectedIds,
  onSelectionChange,
  sortField,
  sortDirection,
  onSort,
}: ClientTableProps) {
  const getPrimaryContact = (contacts: Client['contacts']) => {
    const primary = contacts.find((c) => c.isPrimary)
    return primary || contacts[0] || null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(clients.map((c) => c.id))
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

  const allSelected = clients.length > 0 && selectedIds.length === clients.length
  const someSelected = selectedIds.length > 0 && selectedIds.length < clients.length

  const SortIcon = ({ field }: { field: ClientSortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-gray-900" />
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
    field: ClientSortField
    children: React.ReactNode
  }) => (
    <button
      className="flex items-center text-xs font-medium text-gray-900 hover:text-gray-700"
      onClick={() => onSort?.(field)}
    >
      {children}
      <SortIcon field={field} />
    </button>
  )

  const StaticHeader = ({ children }: { children: React.ReactNode }) => (
    <span className="text-xs font-medium text-gray-900">{children}</span>
  )

  if (clients.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-900">No clients found.</p>
        <p className="mt-2 text-sm text-gray-900">
          Add your first client to get started.
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
          <TableHeader><SortableHeader field="clientName">Client Name</SortableHeader></TableHeader>
          <TableHeader><StaticHeader>Contact Person</StaticHeader></TableHeader>
          <TableHeader><SortableHeader field="rentalRate">Rate</SortableHeader></TableHeader>
          <TableHeader><StaticHeader>Billing / Duration</StaticHeader></TableHeader>
          <TableHeader><SortableHeader field="startDate">Start Date</SortableHeader></TableHeader>
          <TableHeader><SortableHeader field="status">Status</SortableHeader></TableHeader>
          <TableHeader><StaticHeader>Actions</StaticHeader></TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {clients.map((client) => {
          const primaryContact = getPrimaryContact(client.contacts)
          const isSelected = selectedIds.includes(client.id)
          return (
            <TableRow key={client.id} className={isSelected ? 'bg-blue-50' : ''}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleSelectOne(client.id, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </TableCell>
              <TableCell className="font-medium text-gray-900">{client.clientName}</TableCell>
              <TableCell className="text-gray-900">{primaryContact?.contactPerson || '-'}</TableCell>
              <TableCell className="text-gray-900">{formatCurrency(client.rentalRate)}</TableCell>
              <TableCell className="text-gray-900">{client.billingTerms} / {client.rentalTermsMonths}mo</TableCell>
              <TableCell className="text-gray-900">{formatDate(client.startDate)}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(client.status)}>
                  {client.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Link href={`/clients/${client.id}`}>
                    <Button variant="ghost" size="sm" title="View">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/clients/${client.id}/edit`}>
                    <Button variant="ghost" size="sm" title="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
