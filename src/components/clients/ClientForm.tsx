'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { BillingTermsSelect } from '@/components/ui/BillingTermsSelect'
import { Plus, Trash2 } from 'lucide-react'

interface Contact {
  id?: string
  contactPerson: string
  contactPosition: string
  email: string
  mobile: string
  telephone: string
  isPrimary: boolean
}

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
  contacts: Contact[]
}

interface ClientFormProps {
  initialData?: ClientFormData
  onSubmit: (data: ClientFormData) => Promise<void>
  isLoading?: boolean
}

const emptyContact: Contact = {
  contactPerson: '',
  contactPosition: '',
  email: '',
  mobile: '',
  telephone: '',
  isPrimary: false,
}

// Calculate end date based on billing terms and rental term months
function calculateEndDate(startDate: string, billingTerms: string, rentalTermsMonths: string): string {
  if (!startDate || !rentalTermsMonths) return ''

  const start = new Date(startDate)
  const months = parseInt(rentalTermsMonths, 10)

  if (isNaN(months) || months <= 0) return ''

  const end = new Date(start)
  end.setMonth(end.getMonth() + months)
  // Subtract one day to get the last day of the period
  end.setDate(end.getDate() - 1)

  return end.toISOString().split('T')[0]
}

// Format number to accounting format (XXX,XXX.XX)
function formatAccountingNumber(value: string): string {
  const num = parseFloat(value.replace(/,/g, ''))
  if (isNaN(num)) return value
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

// Parse accounting format back to number string
function parseAccountingNumber(value: string): string {
  return value.replace(/,/g, '')
}

export function ClientForm({ initialData, onSubmit, isLoading }: ClientFormProps) {
  const [formData, setFormData] = useState<ClientFormData>(
    initialData || {
      clientName: '',
      address: '',
      rentalRate: '',
      vatInclusive: false,
      rentalTermsMonths: '',
      billingTerms: '',
      customBillingTerms: '',
      leaseInclusions: '',
      startDate: '',
      endDate: '',
      contacts: [{ ...emptyContact, isPrimary: true }],
    }
  )

  const [displayRentalRate, setDisplayRentalRate] = useState(
    initialData?.rentalRate ? formatAccountingNumber(initialData.rentalRate) : ''
  )

  // Auto-calculate end date when start date or rental terms change
  const updateEndDate = useCallback(() => {
    const calculatedEndDate = calculateEndDate(
      formData.startDate,
      formData.billingTerms,
      formData.rentalTermsMonths
    )
    if (calculatedEndDate) {
      setFormData((prev) => ({ ...prev, endDate: calculatedEndDate }))
    }
  }, [formData.startDate, formData.billingTerms, formData.rentalTermsMonths])

  useEffect(() => {
    updateEndDate()
  }, [updateEndDate])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked,
      })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleRentalRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9.]/g, '')
    setFormData({ ...formData, rentalRate: rawValue })
    setDisplayRentalRate(rawValue)
  }

  const handleRentalRateBlur = () => {
    if (formData.rentalRate) {
      setDisplayRentalRate(formatAccountingNumber(formData.rentalRate))
    }
  }

  const handleRentalRateFocus = () => {
    setDisplayRentalRate(formData.rentalRate)
  }

  const handleBillingTermsChange = (value: string, customValue?: string) => {
    setFormData({
      ...formData,
      billingTerms: value,
      customBillingTerms: customValue || '',
    })
  }

  const handleRentalTermsMonthsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/\D/g, '')
    setFormData({ ...formData, rentalTermsMonths: value })
  }

  const handleContactChange = (
    index: number,
    field: keyof Contact,
    value: string | boolean
  ) => {
    const newContacts = [...formData.contacts]

    // For mobile, strip non-numeric characters
    if (field === 'mobile' || field === 'telephone') {
      value = (value as string).replace(/\D/g, '')
    }

    newContacts[index] = { ...newContacts[index], [field]: value }

    // If setting isPrimary, unset others
    if (field === 'isPrimary' && value === true) {
      newContacts.forEach((c, i) => {
        if (i !== index) c.isPrimary = false
      })
    }

    setFormData({ ...formData, contacts: newContacts })
  }

  const addContact = () => {
    setFormData({
      ...formData,
      contacts: [...formData.contacts, { ...emptyContact }],
    })
  }

  const removeContact = (index: number) => {
    if (formData.contacts.length === 1) return
    const newContacts = formData.contacts.filter((_, i) => i !== index)
    // Ensure at least one is primary
    if (!newContacts.some((c) => c.isPrimary)) {
      newContacts[0].isPrimary = true
    }
    setFormData({ ...formData, contacts: newContacts })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Client Name"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            required
          />
          <Input
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
          />
        </CardContent>
      </Card>

      {/* Rental Details */}
      <Card>
        <CardHeader>
          <CardTitle>Rental Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Rental Rate<span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={displayRentalRate}
                onChange={handleRentalRateChange}
                onBlur={handleRentalRateBlur}
                onFocus={handleRentalRateFocus}
                placeholder="0.00"
                required
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-500">Format: XXX,XXX.XX</p>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="vatInclusive"
                name="vatInclusive"
                checked={formData.vatInclusive}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="vatInclusive" className="text-sm text-gray-700">
                VAT Inclusive
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Rental Terms (Months)<span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formData.rentalTermsMonths}
                onChange={handleRentalTermsMonthsChange}
                placeholder="12"
                required
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-500">Enter number of months only</p>
            </div>
            <BillingTermsSelect
              label="Billing Terms"
              value={formData.billingTerms}
              customValue={formData.customBillingTerms}
              onChange={handleBillingTermsChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Start Date"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                End Date<span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                readOnly
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm cursor-not-allowed"
              />
              <p className="text-xs text-gray-500">Auto-calculated from Start Date + Rental Terms</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Lease Inclusions
            </label>
            <textarea
              name="leaseInclusions"
              value={formData.leaseInclusions}
              onChange={handleChange}
              rows={3}
              placeholder="List any inclusions for this lease..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Persons */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contact Persons</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addContact}>
            <Plus className="mr-1 h-4 w-4" />
            Add Contact
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.contacts.map((contact, index) => {
            const isPrimary = contact.isPrimary
            return (
              <div
                key={index}
                className={`rounded-lg border p-4 space-y-4 ${
                  isPrimary ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id={`primary-${index}`}
                      checked={contact.isPrimary}
                      onChange={() => handleContactChange(index, 'isPrimary', true)}
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor={`primary-${index}`}
                      className="text-sm font-medium text-gray-700"
                    >
                      Primary Contact
                    </label>
                  </div>
                  {formData.contacts.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeContact(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Contact Person"
                    value={contact.contactPerson}
                    onChange={(e) =>
                      handleContactChange(index, 'contactPerson', e.target.value)
                    }
                    required
                  />
                  <Input
                    label="Position"
                    value={contact.contactPosition}
                    onChange={(e) =>
                      handleContactChange(index, 'contactPosition', e.target.value)
                    }
                    required={isPrimary}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={contact.email}
                    onChange={(e) =>
                      handleContactChange(index, 'email', e.target.value)
                    }
                    required={isPrimary}
                  />
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Mobile{isPrimary && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 px-3 text-sm text-gray-700">
                        +63
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={contact.mobile}
                        onChange={(e) =>
                          handleContactChange(index, 'mobile', e.target.value)
                        }
                        placeholder="9XXXXXXXXX"
                        required={isPrimary}
                        className="block w-full rounded-r-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Telephone (Optional)
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 px-3 text-sm text-gray-700">
                        63
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={contact.telephone}
                        onChange={(e) =>
                          handleContactChange(index, 'telephone', e.target.value)
                        }
                        placeholder="2XXXXXXX"
                        className="block w-full rounded-r-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : initialData ? 'Update Client' : 'Create Client'}
        </Button>
      </div>
    </form>
  )
}
