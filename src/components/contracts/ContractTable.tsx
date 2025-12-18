'use client'

import Link from 'next/link'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table'
import { Badge, getStatusVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FileText, Download, Trash2 } from 'lucide-react'

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
}

export function ContractTable({ contracts, onDelete }: ContractTableProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

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
          <TableHeader>Contract No.</TableHeader>
          <TableHeader>Client</TableHeader>
          <TableHeader>Start Date</TableHeader>
          <TableHeader>End Date</TableHeader>
          <TableHeader>Status</TableHeader>
          <TableHeader>Created</TableHeader>
          <TableHeader>Actions</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {contracts.map((contract) => (
          <TableRow key={contract.id}>
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
        ))}
      </TableBody>
    </Table>
  )
}
