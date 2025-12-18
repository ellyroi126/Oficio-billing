'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { ClientTable } from '@/components/clients/ClientTable'
import { MassUploadModal } from '@/components/clients/MassUploadModal'
import { Plus, Upload, Search } from 'lucide-react'

interface Client {
  id: string
  clientName: string
  email: string
  mobile: string
  rentalRate: number
  status: string
  contacts: { contactPerson: string; isPrimary: boolean }[]
  _count: { contracts: number }
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)

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
    fetchClients(search)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return

    try {
      const response = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        setClients(clients.filter((c) => c.id !== id))
      }
    } catch (error) {
      console.error('Error deleting client:', error)
    }
  }

  const handleUploadSuccess = () => {
    setLoading(true)
    fetchClients(search)
  }

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
              <ClientTable clients={clients} onDelete={handleDelete} />
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
