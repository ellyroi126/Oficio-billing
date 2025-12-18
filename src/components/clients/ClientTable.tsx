'use client'

import Link from 'next/link'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table'
import { Badge, getStatusVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Edit, Trash2, FileText } from 'lucide-react'

interface Client {
  id: string
  clientName: string
  rentalRate: number
  status: string
  contacts: {
    contactPerson: string
    email: string | null
    mobile: string | null
    isPrimary: boolean
  }[]
  _count: { contracts: number }
}

interface ClientTableProps {
  clients: Client[]
  onDelete: (id: string) => void
}

export function ClientTable({ clients, onDelete }: ClientTableProps) {
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

  if (clients.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No clients found.</p>
        <p className="mt-2 text-sm text-gray-400">
          Add your first client to get started.
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader>Client Name</TableHeader>
          <TableHeader>Contact Person</TableHeader>
          <TableHeader>Email</TableHeader>
          <TableHeader>Rental Rate</TableHeader>
          <TableHeader>Contracts</TableHeader>
          <TableHeader>Status</TableHeader>
          <TableHeader>Actions</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {clients.map((client) => {
          const primaryContact = getPrimaryContact(client.contacts)
          return (
            <TableRow key={client.id}>
              <TableCell className="font-medium text-gray-900">{client.clientName}</TableCell>
              <TableCell className="text-gray-900">{primaryContact?.contactPerson || '-'}</TableCell>
              <TableCell className="text-gray-900">{primaryContact?.email || '-'}</TableCell>
              <TableCell className="text-gray-900">{formatCurrency(client.rentalRate)}</TableCell>
              <TableCell className="text-gray-900">{client._count.contracts}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(client.status)}>
                  {client.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Delete"
                    onClick={() => onDelete(client.id)}
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
