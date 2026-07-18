'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, FileText, CheckCircle, XCircle, Check } from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  clientName: string
  status: string
  startDate: string
  endDate: string
}

interface Signer {
  name: string
  position: string
}

interface BatchResult {
  clientId: string
  clientName: string
  success: boolean
  contractId?: string
  contractNumber?: string
  error?: string
}

export default function BatchContractsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [signers, setSigners] = useState<Signer[]>([])
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  // Per-client editable contract dates, keyed by client id. Prefilled from the client's
  // stored lease dates when first selected, then editable so a batch run can contain
  // contracts with different start/end dates.
  const [clientDates, setClientDates] = useState<Record<string, { startDate: string; endDate: string }>>({})
  const [signerIndex, setSignerIndex] = useState('0')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<BatchResult[] | null>(null)

  const toIsoDate = (date: string) => date.split('T')[0]

  useEffect(() => {
    async function fetchData() {
      try {
        const [clientsRes, companyRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/company'),
        ])

        const clientsResult = await clientsRes.json()
        const companyResult = await companyRes.json()

        if (clientsResult.success) {
          // Only show active clients
          setClients(clientsResult.data.filter((c: Client) => c.status === 'active'))
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
  }, [])

  const ensureDates = (client: Client, current: Record<string, { startDate: string; endDate: string }>) => {
    if (current[client.id]) return current
    return {
      ...current,
      [client.id]: {
        startDate: toIsoDate(client.startDate),
        endDate: toIsoDate(client.endDate),
      },
    }
  }

  const toggleClient = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    const newSelected = new Set(selectedClients)
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId)
    } else {
      newSelected.add(clientId)
      if (client) setClientDates((prev) => ensureDates(client, prev))
    }
    setSelectedClients(newSelected)
  }

  const toggleAll = () => {
    if (selectedClients.size === clients.length) {
      setSelectedClients(new Set())
    } else {
      setSelectedClients(new Set(clients.map((c) => c.id)))
      setClientDates((prev) => {
        let next = prev
        for (const c of clients) next = ensureDates(c, next)
        return next
      })
    }
  }

  const updateClientDate = (clientId: string, field: 'startDate' | 'endDate', value: string) => {
    setClientDates((prev) => ({
      ...prev,
      [clientId]: {
        startDate: prev[clientId]?.startDate ?? '',
        endDate: prev[clientId]?.endDate ?? '',
        [field]: value,
      },
    }))
  }

  const formatDate = (date: string) => {
    const dateStr = date.split('T')[0]
    const [year, month, day] = dateStr.split('-').map(Number)
    const localDate = new Date(year, month - 1, day, 12, 0, 0)
    return localDate.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleGenerate = async () => {
    if (selectedClients.size === 0) return

    setGenerating(true)
    setResults(null)

    const selectedSigner = signers[parseInt(signerIndex)] || signers[0]

    // Build per-client date overrides for the selected clients.
    const dates: Record<string, { startDate: string; endDate: string }> = {}
    for (const id of selectedClients) {
      const d = clientDates[id]
      if (d?.startDate && d?.endDate) {
        dates[id] = { startDate: d.startDate, endDate: d.endDate }
      }
    }

    try {
      const response = await fetch('/api/contracts/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIds: Array.from(selectedClients),
          signerName: selectedSigner?.name,
          signerPosition: selectedSigner?.position,
          dates,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setResults(result.results)
      }
    } catch (err) {
      console.error('Error generating contracts:', err)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="Batch Generate Contracts" />
        <div className="flex items-center justify-center p-12">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (results) {
    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return (
      <div>
        <Header title="Batch Generation Complete" />
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Generation Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex gap-4">
                <div className="rounded-lg bg-green-50 px-4 py-2">
                  <span className="text-lg font-semibold text-green-700">{successCount}</span>
                  <span className="ml-2 text-green-600">Successful</span>
                </div>
                {failCount > 0 && (
                  <div className="rounded-lg bg-red-50 px-4 py-2">
                    <span className="text-lg font-semibold text-red-700">{failCount}</span>
                    <span className="ml-2 text-red-600">Failed</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={result.clientId}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{result.clientName}</p>
                        {result.success ? (
                          <p className="text-sm text-green-600">{result.contractNumber}</p>
                        ) : (
                          <p className="text-sm text-red-600">{result.error}</p>
                        )}
                      </div>
                    </div>
                    {result.success && result.contractId && (
                      <Link href={`/contracts/${result.contractId}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <Button onClick={() => setResults(null)} variant="outline">
                  Generate More
                </Button>
                <Link href="/contracts">
                  <Button>Go to Contracts</Button>
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
      <Header title="Batch Generate Contracts" />

      <div className="p-6">
        <Link href="/contracts">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contracts
          </Button>
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Client Selection */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Select Clients</CardTitle>
                  <Button variant="ghost" size="sm" onClick={toggleAll}>
                    {selectedClients.size === clients.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <p className="text-gray-900">No active clients found.</p>
                ) : (
                  <div className="space-y-2">
                    {clients.map((client) => (
                      <div
                        key={client.id}
                        className={`rounded-lg border p-3 transition-colors ${
                          selectedClients.has(client.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div
                          onClick={() => toggleClient(client.id)}
                          className="flex cursor-pointer items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded border ${
                                selectedClients.has(client.id)
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-gray-300'
                              }`}
                            >
                              {selectedClients.has(client.id) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{client.clientName}</p>
                              <p className="text-sm text-gray-900">
                                {formatDate(client.startDate)} - {formatDate(client.endDate)}
                              </p>
                            </div>
                          </div>
                          <Badge variant="success">{client.status}</Badge>
                        </div>

                        {/* Editable per-client contract dates (shown when selected) */}
                        {selectedClients.has(client.id) && (
                          <div
                            className="mt-3 grid grid-cols-1 gap-3 border-t border-blue-200 pt-3 sm:grid-cols-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Input
                              label="Start Date"
                              type="date"
                              value={clientDates[client.id]?.startDate ?? ''}
                              onChange={(e) => updateClientDate(client.id, 'startDate', e.target.value)}
                            />
                            <Input
                              label="End Date"
                              type="date"
                              value={clientDates[client.id]?.endDate ?? ''}
                              onChange={(e) => updateClientDate(client.id, 'endDate', e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Generation Options */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Generation Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {signers.length > 0 && (
                  <Select
                    label="Contract Signer"
                    value={signerIndex}
                    onChange={(e) => setSignerIndex(e.target.value)}
                    options={signers.map((signer, index) => ({
                      value: index.toString(),
                      label: `${signer.name} - ${signer.position}`,
                    }))}
                  />
                )}

                {signers.length === 0 && (
                  <div className="rounded-lg bg-yellow-50 p-3">
                    <p className="text-sm text-yellow-800">
                      No signers configured. Please add signers in{' '}
                      <Link href="/settings" className="underline">
                        Settings
                      </Link>
                      .
                    </p>
                  </div>
                )}

                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-900">
                    <strong>{selectedClients.size}</strong> client
                    {selectedClients.size !== 1 ? 's' : ''} selected
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Tip: each selected client&apos;s start/end dates are pre-filled from their
                    lease and can be edited individually before generating.
                  </p>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={selectedClients.size === 0 || generating || signers.length === 0}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Generate {selectedClients.size} Contract
                      {selectedClients.size !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
