'use client'

import Link from 'next/link'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table'
import { Badge, getStatusVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FileText, Download, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

interface Contract {
  id: string
  contractNumber: string
  status: string
  startDate: string
  endDate: string
  filePath: string | null
  pdfPath: string | null
  createdAt: string
  client: {
    id: string
    clientName: string
  }
}

interface ContractTableProps {
  contracts: Contract[]
  onDelete: (id: string) => void
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  sortField?: ContractSortField
  sortDirection?: SortDirection
  onSort?: (field: ContractSortField) => void
}

export type ContractSortField = 'contractNumber' | 'clientName' | 'startDate' | 'endDate' | 'status' | 'createdAt'
export type SortDirection = 'asc' | 'desc'

export function ContractTable({
  contracts,
  onDelete,
  selectedIds,
  onSelectionChange,
  sortField,
  sortDirection,
  onSort,
}: ContractTableProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(contracts.map((c) => c.id))
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

  const allSelected = contracts.length > 0 && selectedIds.length === contracts.length
  const someSelected = selectedIds.length > 0 && selectedIds.length < contracts.length

  const SortIcon = ({ field }: { field: ContractSortField }) => {
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
    field: ContractSortField
    children: React.ReactNode
  }) => (
    <button
      className="flex items-center font-semibold hover:text-blue-600"
      onClick={() => onSort?.(field)}
    >
      {children}
      <SortIcon field={field} />
    </button>
  )

  if (contracts.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No contracts found.</p>
        <p className="mt-2 text-sm text-gray-400">
          Create a contract for a client to get started.
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
          <TableHeader><SortableHeader field="contractNumber">Contract No.</SortableHeader></TableHeader>
          <TableHeader><SortableHeader field="clientName">Client</SortableHeader></TableHeader>
          <TableHeader><SortableHeader field="startDate">Start Date</SortableHeader></TableHeader>
          <TableHeader><SortableHeader field="endDate">End Date</SortableHeader></TableHeader>
          <TableHeader><SortableHeader field="status">Status</SortableHeader></TableHeader>
          <TableHeader><SortableHeader field="createdAt">Created</SortableHeader></TableHeader>
          <TableHeader>Actions</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {contracts.map((contract) => {
          const isSelected = selectedIds.includes(contract.id)
          return (
            <TableRow key={contract.id} className={isSelected ? 'bg-blue-50' : ''}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleSelectOne(contract.id, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </TableCell>
              <TableCell className="font-medium">{contract.contractNumber}</TableCell>
              <TableCell>
                <Link
                  href={`/clients/${contract.client.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {contract.client.clientName}
                </Link>
              </TableCell>
              <TableCell>{formatDate(contract.startDate)}</TableCell>
              <TableCell>{formatDate(contract.endDate)}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(contract.status)}>
                  {contract.status}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(contract.createdAt)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Link href={`/contracts/${contract.id}`}>
                    <Button variant="ghost" size="sm" title="View">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </Link>
                  {contract.pdfPath && (
                    <a href={`/api/contracts/${contract.id}/download?format=pdf`}>
                      <Button variant="ghost" size="sm" title="Download PDF">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Delete"
                    onClick={() => onDelete(contract.id)}
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
