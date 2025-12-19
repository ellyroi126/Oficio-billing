'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge, getStatusVariant } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Select } from '@/components/ui/Select'
import { ArrowLeft, Download, Send, CheckCircle } from 'lucide-react'

interface Contract {
  id: string
  contractNumber: string
  status: string
  startDate: string
  endDate: string
  filePath: string | null
  pdfPath: string | null
  sentAt: string | null
  signedAt: string | null
  createdAt: string
  client: {
    id: string
    clientName: string
    address: string
    rentalRate: number
    vatInclusive: boolean
    contacts: {
      contactPerson: string
      contactPosition: string | null
      email: string | null
      isPrimary: boolean
    }[]
  }
}

export default function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    async function fetchContract() {
      try {
        const response = await fetch(`/api/contracts/${id}`)
        const result = await response.json()
        if (result.success) {
          setContract(result.data)
        }
      } catch (error) {
        console.error('Error fetching contract:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchContract()
  }, [id])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/contracts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await response.json()
      if (result.success) {
        setContract(result.data)
      }
    } catch (error) {
      console.error('Error updating contract:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleMarkAsSent = async () => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/contracts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAsSent: true }),
      })
      const result = await response.json()
      if (result.success) {
        setContract(result.data)
      }
    } catch (error) {
      console.error('Error updating contract:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleMarkAsSigned = async () => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/contracts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAsSigned: true }),
      })
      const result = await response.json()
      if (result.success) {
        setContract(result.data)
      }
    } catch (error) {
      console.error('Error updating contract:', error)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="Contract Details" />
        <div className="flex items-center justify-center p-12">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div>
        <Header title="Contract Not Found" />
        <div className="p-6">
          <p className="text-gray-500">The requested contract could not be found.</p>
          <Link href="/contracts">
            <Button className="mt-4">Back to Contracts</Button>
          </Link>
        </div>
      </div>
    )
  }

  const primaryContact = contract.client.contacts?.[0]

  return (
    <div>
      <Header title={contract.contractNumber} />

      <div className="p-6">
        {/* Back button */}
        <Link href="/contracts">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contracts
          </Button>
        </Link>

        {/* Download buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          {contract.filePath && (
            <a href={`/api/contracts/${contract.id}/download?format=docx`}>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download DOCX
              </Button>
            </a>
          )}
          {contract.pdfPath && (
            <a href={`/api/contracts/${contract.id}/download?format=pdf`}>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </a>
          )}
          {!contract.sentAt && (
            <Button variant="outline" onClick={handleMarkAsSent} disabled={updating}>
              <Send className="mr-2 h-4 w-4" />
              Mark as Sent
            </Button>
          )}
          {!contract.signedAt && (
            <Button variant="outline" onClick={handleMarkAsSigned} disabled={updating}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Signed
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contract Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Contract Information</CardTitle>
                <Badge variant={getStatusVariant(contract.status)}>
                  {contract.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Contract Number</span>
                <span className="text-sm font-medium text-gray-900">{contract.contractNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Start Date</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(contract.startDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">End Date</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(contract.endDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Created</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(contract.createdAt)}
                </span>
              </div>
              {contract.sentAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Sent</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(contract.sentAt)}
                  </span>
                </div>
              )}
              {contract.signedAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Signed</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(contract.signedAt)}
                  </span>
                </div>
              )}

              <div className="border-t pt-4">
                <label className="text-sm text-gray-500">Update Status</label>
                <Select
                  value={contract.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'active', label: 'Active' },
                    { value: 'expired', label: 'Expired' },
                    { value: 'terminated', label: 'Terminated' },
                  ]}
                  className="mt-1"
                  disabled={updating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Client Name</span>
                <Link
                  href={`/clients/${contract.client.id}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {contract.client.clientName}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Address</span>
                <span className="text-sm font-medium text-gray-900 text-right max-w-xs">
                  {contract.client.address}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Email</span>
                <span className="text-sm font-medium text-gray-900">{primaryContact?.email || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Rental Rate</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(contract.client.rentalRate)}
                  {contract.client.vatInclusive ? ' (VAT Incl.)' : ' (VAT Excl.)'}
                </span>
              </div>

              {primaryContact && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700">Primary Contact</p>
                  <p className="text-sm text-gray-900">{primaryContact.contactPerson}</p>
                  <p className="text-sm text-gray-900">
                    {primaryContact.contactPosition}
                  </p>
                  <p className="text-sm text-gray-900">{primaryContact.email}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
