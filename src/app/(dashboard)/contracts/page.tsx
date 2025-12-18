'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { ContractTable } from '@/components/contracts/ContractTable'
import { Plus, Files } from 'lucide-react'

interface Contract {
  id: string
  contractNumber: string
  status: string
  startDate: string
  endDate: string
  filePath: string | null
  pdfPath: string | null
  createdAt: string
  client: {
    id: string
    clientName: string
  }
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/contracts')
      const result = await response.json()
      if (result.success) {
        setContracts(result.data)
      }
    } catch (error) {
      console.error('Error fetching contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContracts()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return

    try {
      const response = await fetch(`/api/contracts/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        setContracts(contracts.filter((c) => c.id !== id))
      }
    } catch (error) {
      console.error('Error deleting contract:', error)
    }
  }

  return (
    <div>
      <Header title="Contracts" />

      <div className="p-6">
        {/* Actions */}
        <div className="flex gap-3">
          <Link href="/contracts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Contract
            </Button>
          </Link>
          <Link href="/contracts/batch">
            <Button variant="outline">
              <Files className="mr-2 h-4 w-4" />
              Batch Generate
            </Button>
          </Link>
        </div>

        {/* Contract List */}
        <Card className="mt-6">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <ContractTable contracts={contracts} onDelete={handleDelete} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
