'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ClientForm } from '@/components/clients/ClientForm'

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
    contactPerson: string
    contactPosition: string
    email: string
    mobile: string
    telephone: string
    isPrimary: boolean
  }[]
}

export default function NewClientPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: ClientFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()

      if (result.success) {
        router.push('/clients')
      } else {
        setError(result.error || 'Failed to create client')
      }
    } catch (err) {
      console.error('Error creating client:', err)
      setError('Failed to create client')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <Header title="Add New Client" />

      <div className="p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">
            {error}
          </div>
        )}
        <ClientForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  )
}
