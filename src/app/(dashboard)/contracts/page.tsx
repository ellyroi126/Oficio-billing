'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { ContractTable, ContractSortField, SortDirection } from '@/components/contracts/ContractTable'
import ApprovalRequestModal from '@/components/approvals/ApprovalRequestModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useRole } from '@/contexts/RoleContext'
import { useToast } from '@/contexts/ToastContext'
import { Plus, Files, Trash2, RefreshCw } from 'lucide-react'

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
    billingTerms: string
    rentalTermsMonths: number
  }
}

export default function ContractsPage() {
  const { isAdmin } = useRole()
  const toast = useToast()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [sortField, setSortField] = useState<ContractSortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean
    contractId: string
    contractNumber: string
  }>({ isOpen: false, contractId: '', contractNumber: '' })
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

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
    const contract = contracts.find((c) => c.id === id)
    if (!contract) return

    // If employee, request approval
    if (!isAdmin) {
      setApprovalModal({
        isOpen: true,
        contractId: id,
        contractNumber: contract.contractNumber
      })
      return
    }

    // If admin, delete directly
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Contract',
      message: 'Are you sure you want to delete this contract?',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/contracts/${id}`, { method: 'DELETE' })
          const result = await response.json()
          if (result.success) {
            setContracts(contracts.filter((c) => c.id !== id))
            setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id))
          }
        } catch (error) {
          console.error('Error deleting contract:', error)
        }
      }
    })
    return
  }

  const handleApprovalSubmit = async (reason: string) => {
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'DELETE_CONTRACT',
          entityType: 'contract',
          entityId: approvalModal.contractId,
          entityName: approvalModal.contractNumber,
          reason
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success('Delete request submitted for approval')
      } else {
        throw new Error(result.error || 'Failed to submit approval request')
      }
    } catch (error) {
      console.error('Error submitting approval request:', error)
      throw error
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return

    // Employees: submit individual approval requests for each selected contract
    if (!isAdmin) {
      const selectedContracts = contracts.filter(c => selectedIds.includes(c.id))
      let submitted = 0
      for (const contract of selectedContracts) {
        try {
          const response = await fetch('/api/approvals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              actionType: 'DELETE_CONTRACT',
              entityType: 'contract',
              entityId: contract.id,
              entityName: contract.contractNumber,
              reason: `Bulk delete request for ${selectedIds.length} contract(s)`
            })
          })
          const result = await response.json()
          if (result.success) submitted++
        } catch (error) {
          console.error('Error submitting approval for contract:', contract.contractNumber, error)
        }
      }
      if (submitted > 0) {
        toast.success(`${submitted} delete request(s) submitted for approval`)
      }
      setSelectedIds([])
      return
    }

    const confirmMessage = `Are you sure you want to delete ${selectedIds.length} contract(s)?`
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Contracts',
      message: confirmMessage,
      onConfirm: async () => {
        setDeleting(true)
        try {
          const response = await fetch('/api/contracts', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedIds }),
          })
          const result = await response.json()
          if (result.success) {
            setContracts(contracts.filter((c) => !selectedIds.includes(c.id)))
            toast.success(`Successfully deleted ${selectedIds.length} contract(s)`)
            setSelectedIds([])
          }
        } catch (error) {
          console.error('Error deleting contracts:', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete contracts'
          toast.error(errorMessage)
        } finally {
          setDeleting(false)
        }
      }
    })
    return
  }

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedIds.length === 0) return

    // Employees cannot set "terminated" — backend already rejects, but give a friendly message
    if (status === 'terminated' && !isAdmin) {
      toast.error('Terminating contracts requires admin approval. Please use the contract detail page to submit a request.')
      return
    }

    setUpdatingStatus(true)
    try {
      const response = await fetch('/api/contracts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update status')
      }

      if (result.success) {
        // Update local state
        setContracts(contracts.map((c) =>
          selectedIds.includes(c.id) ? { ...c, status } : c
        ))
        toast.success(`Successfully updated status for ${selectedIds.length} contract(s)`)
        setSelectedIds([])
      }
    } catch (error) {
      console.error('Error updating contract status:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update contract status'
      toast.error(errorMessage)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleSort = (field: ContractSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedContracts = useMemo(() => {
    return [...contracts].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'contractNumber':
          comparison = a.contractNumber.localeCompare(b.contractNumber)
          break
        case 'clientName':
          comparison = a.client.clientName.localeCompare(b.client.clientName)
          break
        case 'startDate':
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          break
        case 'endDate':
          comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        default:
          comparison = 0
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [contracts, sortField, sortDirection])

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
          {selectedIds.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900">Change Status:</span>
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
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  {isAdmin && <option value="terminated">Terminated</option>}
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

        {/* Contract List */}
        <Card className="mt-6">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <ContractTable
                contracts={sortedContracts}
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

      {/* Approval Request Modal */}
      <ApprovalRequestModal
        isOpen={approvalModal.isOpen}
        onClose={() => setApprovalModal({ isOpen: false, contractId: '', contractNumber: '' })}
        actionType="DELETE_CONTRACT"
        entityType="contract"
        entityId={approvalModal.contractId}
        entityName={approvalModal.contractNumber}
        onSubmit={handleApprovalSubmit}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          confirmDialog.onConfirm()
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        }}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
