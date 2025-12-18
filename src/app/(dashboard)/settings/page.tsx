'use client'

import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { Spinner } from '@/components/ui/Spinner'
import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'

interface Signer {
  name: string
  position: string
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [companyData, setCompanyData] = useState({
    name: '',
    contactPerson: '',
    contactPosition: '',
    address: '',
    emails: [''],
    mobiles: [''],
    telephone: '',
    plan: '',
    signers: [{ name: '', position: '' }] as Signer[],
  })

  // Fetch company data on mount
  useEffect(() => {
    async function fetchCompany() {
      try {
        const response = await fetch('/api/company')
        const result = await response.json()
        if (result.success && result.data) {
          setCompanyData({
            name: result.data.name || '',
            contactPerson: result.data.contactPerson || '',
            contactPosition: result.data.contactPosition || '',
            address: result.data.address || '',
            emails: result.data.emails?.length > 0 ? result.data.emails : [''],
            mobiles: result.data.mobiles?.length > 0 ? result.data.mobiles : [''],
            telephone: result.data.telephone || '',
            plan: result.data.plan || '',
            signers: result.data.signers?.length > 0 ? result.data.signers : [{ name: '', position: '' }],
          })
        }
      } catch (error) {
        console.error('Error fetching company:', error)
        setMessage({ type: 'error', text: 'Failed to load company settings' })
      } finally {
        setLoading(false)
      }
    }
    fetchCompany()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCompanyData({ ...companyData, [e.target.name]: e.target.value })
    setMessage(null)
  }

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...companyData.emails]
    newEmails[index] = value
    setCompanyData({ ...companyData, emails: newEmails })
    setMessage(null)
  }

  const addEmail = () => {
    setCompanyData({ ...companyData, emails: [...companyData.emails, ''] })
  }

  const removeEmail = (index: number) => {
    if (companyData.emails.length > 1) {
      const newEmails = companyData.emails.filter((_, i) => i !== index)
      setCompanyData({ ...companyData, emails: newEmails })
    }
  }

  const handleMobileChange = (index: number, value: string) => {
    const newMobiles = [...companyData.mobiles]
    newMobiles[index] = value
    setCompanyData({ ...companyData, mobiles: newMobiles })
    setMessage(null)
  }

  const addMobile = () => {
    setCompanyData({ ...companyData, mobiles: [...companyData.mobiles, ''] })
  }

  const removeMobile = (index: number) => {
    if (companyData.mobiles.length > 1) {
      const newMobiles = companyData.mobiles.filter((_, i) => i !== index)
      setCompanyData({ ...companyData, mobiles: newMobiles })
    }
  }

  const handleSignerChange = (index: number, field: 'name' | 'position', value: string) => {
    const newSigners = [...companyData.signers]
    newSigners[index] = { ...newSigners[index], [field]: value }
    setCompanyData({ ...companyData, signers: newSigners })
    setMessage(null)
  }

  const addSigner = () => {
    setCompanyData({ ...companyData, signers: [...companyData.signers, { name: '', position: '' }] })
  }

  const removeSigner = (index: number) => {
    if (companyData.signers.length > 1) {
      const newSigners = companyData.signers.filter((_, i) => i !== index)
      setCompanyData({ ...companyData, signers: newSigners })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    // Filter out empty emails, mobiles, and signers
    const dataToSave = {
      ...companyData,
      emails: companyData.emails.filter(e => e.trim() !== ''),
      mobiles: companyData.mobiles.filter(m => m.trim() !== ''),
      signers: companyData.signers.filter(s => s.name.trim() !== ''),
    }

    try {
      const response = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      })
      const result = await response.json()

      if (result.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Error saving company:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="Settings" />
        <div className="flex items-center justify-center p-12">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Settings" />

      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
          </CardHeader>
          <CardContent>
            {message && (
              <div
                className={`mb-4 rounded-lg p-3 ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Input
                  label="Company Name"
                  name="name"
                  value={companyData.name}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Contact Person"
                  name="contactPerson"
                  value={companyData.contactPerson}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Position"
                  name="contactPosition"
                  value={companyData.contactPosition}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Plan"
                  name="plan"
                  value={companyData.plan}
                  onChange={handleChange}
                />
              </div>

              <Input
                label="Address"
                name="address"
                value={companyData.address}
                onChange={handleChange}
                required
              />

              {/* Email addresses - multiple */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Email Address(es)<span className="text-red-500 ml-1">*</span>
                </label>
                {companyData.emails.map((email, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(index, e.target.value)}
                      placeholder="email@example.com"
                      required={index === 0}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                    />
                    {companyData.emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEmail(index)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addEmail}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  Add another email
                </button>
              </div>

              {/* Mobile numbers - multiple with +63 prefix */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Mobile Number(s)<span className="text-red-500 ml-1">*</span>
                </label>
                {companyData.mobiles.map((mobile, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex flex-1">
                      <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 px-3 text-sm text-gray-700">
                        +63
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={mobile}
                        onChange={(e) => handleMobileChange(index, e.target.value.replace(/\D/g, ''))}
                        placeholder="9XXXXXXXXX"
                        required={index === 0}
                        className="block w-full rounded-r-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                      />
                    </div>
                    {companyData.mobiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMobile(index)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addMobile}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  Add another mobile
                </button>
              </div>

              {/* Telephone - optional with 63 prefix */}
              <PhoneInput
                label="Telephone (Optional)"
                prefix="63"
                value={companyData.telephone}
                onChange={(e) => setCompanyData({ ...companyData, telephone: e.target.value.replace(/\D/g, '') })}
                placeholder="2XXXXXXX"
              />

              {/* Signers/Approvers - multiple */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Contract Signers/Approvers<span className="text-red-500 ml-1">*</span>
                </label>
                <p className="text-xs text-gray-500">
                  Add authorized signers for contracts. These will appear as options when generating contracts.
                </p>
                {companyData.signers.map((signer, index) => (
                  <div key={index} className="flex items-start gap-2 rounded-lg border border-gray-200 p-3">
                    <div className="flex-1 grid grid-cols-1 gap-2 md:grid-cols-2">
                      <input
                        type="text"
                        value={signer.name}
                        onChange={(e) => handleSignerChange(index, 'name', e.target.value)}
                        placeholder="Full Name"
                        required={index === 0}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                      />
                      <input
                        type="text"
                        value={signer.position}
                        onChange={(e) => handleSignerChange(index, 'position', e.target.value)}
                        placeholder="Position/Title"
                        required={index === 0}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                      />
                    </div>
                    {companyData.signers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSigner(index)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSigner}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  Add another signer
                </button>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
