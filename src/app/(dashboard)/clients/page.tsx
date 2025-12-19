'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { ClientTable, ClientSortField, SortDirection } from '@/components/clients/ClientTable'
import { MassUploadModal } from '@/components/clients/MassUploadModal'
import { Plus, Upload, Search, Trash2, RefreshCw } from 'lucide-react'

interface Client {
  id: string
  clientName: string
  email: string
  mobile: string
  rentalRate: number
  billingTerms: string
  rentalTermsMonths: number
  startDate: string
  status: string
  contacts: { contactPerson: string; email: string | null; mobile: string | null; isPrimary: boolean }[]
  _count: { contracts: number }
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [sortField, setSortField] = useState<ClientSortField>('clientName')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const fetchClients = async (searchQuery = '') => {
    try {
      const response = await fetch(
        `/api/clients${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`
      )
      const result = await response.json()
      if (result.success) {
        setClients(result.data)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSelectedIds([])
    fetchClients(search)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return

    try {
      const response = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        setClients(clients.filter((c) => c.id !== id))
        setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id))
      }
    } catch (error) {
      console.error('Error deleting client:', error)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return

    const confirmMessage = `Are you sure you want to delete ${selectedIds.length} client(s)? This will also delete all their contracts.`
    if (!confirm(confirmMessage)) return

    setDeleting(true)
    try {
      const response = await fetch('/api/clients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      })
      const result = await response.json()
      if (result.success) {
        setClients(clients.filter((c) => !selectedIds.includes(c.id)))
        setSelectedIds([])
      }
    } catch (error) {
      console.error('Error deleting clients:', error)
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedIds.length === 0) return

    setUpdatingStatus(true)
    try {
      const response = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status }),
      })
      const result = await response.json()
      if (result.success) {
        // Update local state
        setClients(clients.map((c) =>
          selectedIds.includes(c.id) ? { ...c, status } : c
        ))
        setSelectedIds([])
      }
    } catch (error) {
      console.error('Error updating client status:', error)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleUploadSuccess = () => {
    setLoading(true)
    setSelectedIds([])
    fetchClients(search)
  }

  const handleSort = (field: ClientSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'clientName':
          comparison = a.clientName.localeCompare(b.clientName)
          break
        case 'rentalRate':
          comparison = a.rentalRate - b.rentalRate
          break
        case 'contracts':
          comparison = a._count.contracts - b._count.contracts
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        default:
          comparison = 0
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [clients, sortField, sortDirection])

  return (
    <div>
      <Header title="Clients" />

      <div className="p-6">
        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-3">
            <Link href="/clients/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setShowUploadModal(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Mass Upload
            </Button>
            {selectedIds.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Change Status:</span>
                  <select
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkStatusUpdate(e.target.value)
                        e.target.value = ''
                      }
                    }}
                    disabled={updatingStatus}
                    defaultValue=""
                  >
                    <option value="" disabled>Select status...</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="terminated">Terminated</option>
                  </select>
                  {updatingStatus && <Spinner size="sm" />}
                </div>
                <Button
                  variant="danger"
                  onClick={handleBulkDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete Selected ({selectedIds.length})
                </Button>
              </>
            )}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* Client List */}
        <Card className="mt-6">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <ClientTable
                clients={sortedClients}
                onDelete={handleDelete}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mass Upload Modal */}
      <MassUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  )
}
