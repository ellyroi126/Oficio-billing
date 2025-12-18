'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge, getStatusVariant } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Edit, Plus, ArrowLeft } from 'lucide-react'

interface Client {
  id: string
  clientName: string
  address: string
  rentalRate: number
  vatInclusive: boolean
  rentalTermsMonths: number
  billingTerms: string
  customBillingTerms: string | null
  leaseInclusions: string | null
  startDate: string
  endDate: string
  status: string
  contacts: {
    id: string
    contactPerson: string
    contactPosition: string | null
    email: string | null
    mobile: string | null
    telephone: string | null
    isPrimary: boolean
  }[]
  contracts: {
    id: string
    contractNumber: string
    status: string
    startDate: string
    endDate: string
  }[]
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchClient() {
      try {
        const response = await fetch(`/api/clients/${id}`)
        const result = await response.json()
        if (result.success) {
          setClient(result.data)
        }
      } catch (error) {
        console.error('Error fetching client:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchClient()
  }, [id])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  const formatDate = (date: string) => {
    // Parse YYYY-MM-DD part only to avoid timezone issues
    const dateStr = date.split('T')[0]
    const [year, month, day] = dateStr.split('-').map(Number)
    // Create date at noon local time to avoid any timezone edge cases
    const localDate = new Date(year, month - 1, day, 12, 0, 0)
    return localDate.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatMobile = (mobile: string | null) => {
    if (!mobile) return '-'
    return `+63${mobile}`
  }

  const formatTelephone = (telephone: string | null) => {
    if (!telephone) return null
    return `(63) ${telephone}`
  }

  const getBillingTermsDisplay = (billingTerms: string, customBillingTerms: string | null) => {
    if (billingTerms === 'Other' && customBillingTerms) {
      return customBillingTerms
    }
    return billingTerms
  }

  if (loading) {
    return (
      <div>
        <Header title="Client Details" />
        <div className="flex items-center justify-center p-12">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div>
        <Header title="Client Not Found" />
        <div className="p-6">
          <p className="text-gray-500">The requested client could not be found.</p>
          <Link href="/clients">
            <Button className="mt-4">Back to Clients</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title={client.clientName} />

      <div className="p-6">
        {/* Actions */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/clients">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clients
            </Button>
          </Link>
          <div className="flex gap-3">
            <Link href={`/contracts/new?clientId=${client.id}`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Contract
              </Button>
            </Link>
            <Link href={`/clients/${client.id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Client Information</CardTitle>
                <Badge variant={getStatusVariant(client.status)}>{client.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Client Name" value={client.clientName} />
              <InfoRow label="Address" value={client.address} />
            </CardContent>
          </Card>

          {/* Rental Details */}
          <Card>
            <CardHeader>
              <CardTitle>Rental Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Rental Rate" value={formatCurrency(client.rentalRate)} />
              <InfoRow label="VAT" value={client.vatInclusive ? 'Inclusive' : 'Exclusive'} />
              <InfoRow label="Billing Terms" value={getBillingTermsDisplay(client.billingTerms, client.customBillingTerms)} />
              <InfoRow label="Rental Duration" value={`${client.rentalTermsMonths} month${client.rentalTermsMonths > 1 ? 's' : ''}`} />
              <InfoRow label="Start Date" value={formatDate(client.startDate)} />
              <InfoRow label="End Date" value={formatDate(client.endDate)} />
              {client.leaseInclusions && (
                <div>
                  <p className="text-sm text-gray-500">Lease Inclusions</p>
                  <p className="text-sm text-gray-900">
                    {client.leaseInclusions
                      .split('\n')
                      .map(line => line.trim())
                      .filter(line => line.length > 0)
                      .join(', ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Persons */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Persons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {client.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`rounded-lg border p-3 ${
                      contact.isPrimary ? 'border-blue-200 bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{contact.contactPerson}</p>
                      {contact.isPrimary && (
                        <Badge variant="info">Primary</Badge>
                      )}
                    </div>
                    {contact.contactPosition && (
                      <p className="text-sm text-gray-500">{contact.contactPosition}</p>
                    )}
                    {contact.email && (
                      <p className="text-sm text-gray-900">{contact.email}</p>
                    )}
                    {contact.mobile && (
                      <p className="text-sm text-gray-900">{formatMobile(contact.mobile)}</p>
                    )}
                    {contact.telephone && (
                      <p className="text-sm text-gray-900">Tel: {formatTelephone(contact.telephone)}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contracts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Contracts</CardTitle>
            </CardHeader>
            <CardContent>
              {client.contracts.length === 0 ? (
                <p className="text-sm text-gray-500">No contracts yet.</p>
              ) : (
                <div className="space-y-3">
                  {client.contracts.map((contract) => (
                    <Link
                      key={contract.id}
                      href={`/contracts/${contract.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{contract.contractNumber}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                        </p>
                      </div>
                      <Badge variant={getStatusVariant(contract.status)}>
                        {contract.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}
