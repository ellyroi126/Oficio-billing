'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { ArrowLeft, FileText, Download } from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  clientName: string
  startDate: string
  endDate: string
}

interface Signer {
  name: string
  position: string
}

interface Company {
  signers: Signer[]
}

export default function NewContractPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get('clientId')

  const [clients, setClients] = useState<Client[]>([])
  const [signers, setSigners] = useState<Signer[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{
    contractId: string
    docxPath: string
    pdfPath: string
  } | null>(null)

  const [formData, setFormData] = useState({
    clientId: preselectedClientId || '',
    startDate: '',
    endDate: '',
    signerIndex: '0', // Index of selected signer
  })

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch clients and company in parallel
        const [clientsRes, companyRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/company'),
        ])

        const clientsResult = await clientsRes.json()
        const companyResult = await companyRes.json()

        if (clientsResult.success) {
          setClients(clientsResult.data)

          // If client is preselected, set their dates
          if (preselectedClientId) {
            const client = clientsResult.data.find(
              (c: Client) => c.id === preselectedClientId
            )
            if (client) {
              setFormData((prev) => ({
                ...prev,
                clientId: client.id,
                startDate: new Date(client.startDate).toISOString().split('T')[0],
                endDate: new Date(client.endDate).toISOString().split('T')[0],
              }))
            }
          }
        }

        if (companyResult.success && companyResult.data?.signers) {
          setSigners(companyResult.data.signers)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [preselectedClientId])

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    if (client) {
      setFormData({
        ...formData,
        clientId,
        startDate: new Date(client.startDate).toISOString().split('T')[0],
        endDate: new Date(client.endDate).toISOString().split('T')[0],
      })
    } else {
      setFormData({ ...formData, clientId })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)

    // Get selected signer
    const selectedSigner = signers[parseInt(formData.signerIndex)] || signers[0]

    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: formData.clientId,
          startDate: formData.startDate,
          endDate: formData.endDate,
          signerName: selectedSigner?.name,
          signerPosition: selectedSigner?.position,
        }),
      })
      const result = await response.json()

      if (result.success) {
        setSuccess({
          contractId: result.data.id,
          docxPath: result.files.docx,
          pdfPath: result.files.pdf,
        })
      } else {
        setError(result.error || 'Failed to create contract')
      }
    } catch (err) {
      console.error('Error creating contract:', err)
      setError('Failed to create contract')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="Create Contract" />
        <div className="flex items-center justify-center p-12">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div>
        <Header title="Contract Created" />
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Contract Generated Successfully!
              </h2>
              <p className="mt-2 text-gray-500">
                Your contract has been created in both DOCX and PDF formats.
              </p>

              <div className="mt-6 flex justify-center gap-3">
                <a href={`/api/contracts/${success.contractId}/download?format=docx`}>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download DOCX
                  </Button>
                </a>
                <a href={`/api/contracts/${success.contractId}/download?format=pdf`}>
                  <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </a>
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <Link href={`/contracts/${success.contractId}`}>
                  <Button variant="ghost">View Contract Details</Button>
                </Link>
                <Link href="/contracts">
                  <Button variant="ghost">Back to Contracts</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Create Contract" />

      <div className="p-6">
        <Link href="/contracts">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contracts
          </Button>
        </Link>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Contract Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Select
                label="Select Client"
                value={formData.clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                options={clients.map((client) => ({
                  value: client.id,
                  label: client.clientName,
                }))}
                placeholder="Choose a client..."
                required
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Start Date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                />
                <Input
                  label="End Date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  required
                />
              </div>

              {/* Signer Selection */}
              {signers.length > 0 && (
                <Select
                  label="Contract Signer (For Provider)"
                  value={formData.signerIndex}
                  onChange={(e) =>
                    setFormData({ ...formData, signerIndex: e.target.value })
                  }
                  options={signers.map((signer, index) => ({
                    value: index.toString(),
                    label: `${signer.name} - ${signer.position}`,
                  }))}
                  required
                />
              )}

              {signers.length === 0 && (
                <div className="rounded-lg bg-yellow-50 p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> No signers configured. Please add at least one
                    signer in{' '}
                    <Link href="/settings" className="underline">
                      Settings
                    </Link>{' '}
                    before generating contracts.
                  </p>
                </div>
              )}

              {formData.clientId && (
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> The contract will be generated using the
                    client&apos;s rental rate and terms, combined with your company
                    settings. Make sure your company details are configured in{' '}
                    <Link href="/settings" className="underline">
                      Settings
                    </Link>
                    .
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Generating Contract...' : 'Generate Contract'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
