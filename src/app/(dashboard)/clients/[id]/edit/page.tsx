'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ClientForm } from '@/components/clients/ClientForm'
import { Spinner } from '@/components/ui/Spinner'

interface ClientFormData {
  clientName: string
  address: string
  rentalRate: string
  vatInclusive: boolean
  rentalTermsMonths: string
  billingTerms: string
  customBillingTerms: string
  leaseInclusions: string
  startDate: string
  endDate: string
  contacts: {
    id?: string
    contactPerson: string
    contactPosition: string
    email: string
    mobile: string
    telephone: string
    isPrimary: boolean
  }[]
}

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [initialData, setInitialData] = useState<ClientFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchClient() {
      try {
        const response = await fetch(`/api/clients/${id}`)
        const result = await response.json()
        if (result.success) {
          const client = result.data
          setInitialData({
            clientName: client.clientName,
            address: client.address,
            rentalRate: client.rentalRate.toString(),
            vatInclusive: client.vatInclusive,
            rentalTermsMonths: client.rentalTermsMonths?.toString() || '',
            billingTerms: client.billingTerms || '',
            customBillingTerms: client.customBillingTerms || '',
            leaseInclusions: client.leaseInclusions || '',
            startDate: new Date(client.startDate).toISOString().split('T')[0],
            endDate: new Date(client.endDate).toISOString().split('T')[0],
            contacts: client.contacts.map((c: {
              id: string
              contactPerson: string
              contactPosition: string | null
              email: string | null
              mobile: string | null
              telephone: string | null
              isPrimary: boolean
            }) => ({
              id: c.id,
              contactPerson: c.contactPerson,
              contactPosition: c.contactPosition || '',
              email: c.email || '',
              mobile: c.mobile || '',
              telephone: c.telephone || '',
              isPrimary: c.isPrimary,
            })),
          })
        }
      } catch (err) {
        console.error('Error fetching client:', err)
        setError('Failed to load client data')
      } finally {
        setLoading(false)
      }
    }
    fetchClient()
  }, [id])

  const handleSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()

      if (result.success) {
        router.push(`/clients/${id}`)
      } else {
        setError(result.error || 'Failed to update client')
      }
    } catch (err) {
      console.error('Error updating client:', err)
      setError('Failed to update client')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="Edit Client" />
        <div className="flex items-center justify-center p-12">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (!initialData) {
    return (
      <div>
        <Header title="Client Not Found" />
        <div className="p-6">
          <p className="text-gray-900">The requested client could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Edit Client" />

      <div className="p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">
            {error}
          </div>
        )}
        <ClientForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  )
}
