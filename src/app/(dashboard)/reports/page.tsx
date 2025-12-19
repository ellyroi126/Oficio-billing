'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table'
import { FileText, Calendar, AlertCircle } from 'lucide-react'

interface ContractSummary {
  total: number
  draft: number
  active: number
  expired: number
  terminated: number
}

interface ContractItem {
  id: string
  contractNumber: string
  clientName: string
  clientId: string
  status: string
  startDate: string
  endDate: string
  createdAt: string
}

interface RenewalSummary {
  next30Days: number
  next60Days: number
  next90Days: number
  total: number
}

interface RenewalItem {
  id: string
  contractNumber: string
  clientId: string
  clientName: string
  rentalRate: number
  billingTerms: string
  startDate: string
  endDate: string
  daysUntilExpiry: number
}

interface RenewalsData {
  next30Days: RenewalItem[]
  next60Days: RenewalItem[]
  next90Days: RenewalItem[]
}

type ReportTab = 'contracts' | 'renewals'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('contracts')
  const [loading, setLoading] = useState(true)

  // Contract status data
  const [contractSummary, setContractSummary] = useState<ContractSummary | null>(null)
  const [contracts, setContracts] = useState<ContractItem[]>([])

  // Renewals data
  const [renewalSummary, setRenewalSummary] = useState<RenewalSummary | null>(null)
  const [renewals, setRenewals] = useState<RenewalsData | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        if (activeTab === 'contracts') {
          const res = await fetch('/api/reports/contracts')
          const data = await res.json()
          if (data.success) {
            setContractSummary(data.data.summary)
            setContracts(data.data.contracts)
          }
        } else {
          const res = await fetch('/api/reports/renewals')
          const data = await res.json()
          if (data.success) {
            setRenewalSummary(data.data.summary)
            setRenewals(data.data.renewals)
          }
        }
      } catch (error) {
        console.error('Error fetching report data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeTab])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      terminated: 'bg-orange-100 text-orange-800',
    }
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${styles[status] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getUrgencyBadge = (days: number) => {
    if (days <= 7) {
      return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
        <AlertCircle className="h-3 w-3" /> {days} days
      </span>
    }
    if (days <= 14) {
      return <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">{days} days</span>
    }
    return <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">{days} days</span>
  }

  return (
    <div>
      <Header title="Reports" />

      <div className="p-6">
        {/* Tab Buttons */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={activeTab === 'contracts' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('contracts')}
          >
            <FileText className="mr-2 h-4 w-4" />
            Contract Status
          </Button>
          <Button
            variant={activeTab === 'renewals' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('renewals')}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Upcoming Renewals
          </Button>
        </div>

        {/* Contract Status Report */}
        {activeTab === 'contracts' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <SummaryCard label="Total" value={contractSummary?.total ?? 0} loading={loading} />
              <SummaryCard label="Draft" value={contractSummary?.draft ?? 0} loading={loading} color="gray" />
              <SummaryCard label="Active" value={contractSummary?.active ?? 0} loading={loading} color="green" />
              <SummaryCard label="Expired" value={contractSummary?.expired ?? 0} loading={loading} color="red" />
              <SummaryCard label="Terminated" value={contractSummary?.terminated ?? 0} loading={loading} color="orange" />
            </div>

            {/* Contracts Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Contracts</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-8 text-center text-gray-500">Loading...</div>
                ) : contracts.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">No contracts found</div>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader>Contract #</TableHeader>
                        <TableHeader>Client</TableHeader>
                        <TableHeader>Status</TableHeader>
                        <TableHeader>Start Date</TableHeader>
                        <TableHeader>End Date</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {contracts.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">{contract.contractNumber}</TableCell>
                          <TableCell>{contract.clientName}</TableCell>
                          <TableCell>{getStatusBadge(contract.status)}</TableCell>
                          <TableCell>{formatDate(contract.startDate)}</TableCell>
                          <TableCell>{formatDate(contract.endDate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upcoming Renewals Report */}
        {activeTab === 'renewals' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryCard label="Total Expiring" value={renewalSummary?.total ?? 0} loading={loading} />
              <SummaryCard label="Next 30 Days" value={renewalSummary?.next30Days ?? 0} loading={loading} color="red" />
              <SummaryCard label="31-60 Days" value={renewalSummary?.next60Days ?? 0} loading={loading} color="orange" />
              <SummaryCard label="61-90 Days" value={renewalSummary?.next90Days ?? 0} loading={loading} color="yellow" />
            </div>

            {/* Renewals by Period */}
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading...</div>
            ) : (
              <>
                {/* Next 30 Days */}
                {(renewals?.next30Days?.length ?? 0) > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-700">
                        <AlertCircle className="h-5 w-5" />
                        Expiring in Next 30 Days
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <RenewalsTable
                        renewals={renewals?.next30Days ?? []}
                        formatDate={formatDate}
                        formatCurrency={formatCurrency}
                        getUrgencyBadge={getUrgencyBadge}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* 31-60 Days */}
                {(renewals?.next60Days?.length ?? 0) > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-orange-700">Expiring in 31-60 Days</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <RenewalsTable
                        renewals={renewals?.next60Days ?? []}
                        formatDate={formatDate}
                        formatCurrency={formatCurrency}
                        getUrgencyBadge={getUrgencyBadge}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* 61-90 Days */}
                {(renewals?.next90Days?.length ?? 0) > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-yellow-700">Expiring in 61-90 Days</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <RenewalsTable
                        renewals={renewals?.next90Days ?? []}
                        formatDate={formatDate}
                        formatCurrency={formatCurrency}
                        getUrgencyBadge={getUrgencyBadge}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* No renewals message */}
                {(renewalSummary?.total ?? 0) === 0 && (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">
                      No contracts expiring in the next 90 days
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  loading,
  color,
}: {
  label: string
  value: number
  loading: boolean
  color?: 'gray' | 'green' | 'red' | 'orange' | 'yellow'
}) {
  const colorStyles: Record<string, string> = {
    gray: 'border-l-gray-400',
    green: 'border-l-green-500',
    red: 'border-l-red-500',
    orange: 'border-l-orange-500',
    yellow: 'border-l-yellow-500',
  }

  return (
    <Card className={`border-l-4 ${color ? colorStyles[color] : 'border-l-blue-500'}`}>
      <CardContent className="py-4">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-900">
          {loading ? '-' : value}
        </p>
      </CardContent>
    </Card>
  )
}

function RenewalsTable({
  renewals,
  formatDate,
  formatCurrency,
  getUrgencyBadge,
}: {
  renewals: RenewalItem[]
  formatDate: (date: string) => string
  formatCurrency: (amount: number) => string
  getUrgencyBadge: (days: number) => React.ReactNode
}) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader>Contract #</TableHeader>
          <TableHeader>Client</TableHeader>
          <TableHeader>Rate</TableHeader>
          <TableHeader>Billing</TableHeader>
          <TableHeader>End Date</TableHeader>
          <TableHeader>Days Left</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {renewals.map((renewal) => (
          <TableRow key={renewal.id}>
            <TableCell className="font-medium">{renewal.contractNumber}</TableCell>
            <TableCell>{renewal.clientName}</TableCell>
            <TableCell>{formatCurrency(renewal.rentalRate)}</TableCell>
            <TableCell>{renewal.billingTerms}</TableCell>
            <TableCell>{formatDate(renewal.endDate)}</TableCell>
            <TableCell>{getUrgencyBadge(renewal.daysUntilExpiry)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
