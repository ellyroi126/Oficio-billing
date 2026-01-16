'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table'
import { FileText, Calendar, AlertCircle, Receipt, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { RevenueLineChart, InvoiceStatusPieChart, TopClientsBarChart } from '@/components/charts'

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

// Billing Report Types
interface BillingSummary {
  totalInvoices: number
  pending: number
  sent: number
  paid: number
  totalAmount: number
  totalPaid: number
  totalOutstanding: number
}

interface BillingClientItem {
  clientId: string
  clientName: string
  invoiceCount: number
  totalAmount: number
  totalPaid: number
  outstanding: number
}

interface OverdueInvoice {
  id: string
  invoiceNumber: string
  clientName: string
  clientId: string
  totalAmount: number
  dueDate: string
  daysOverdue: number
  balance: number
}

// Revenue Report Types
interface RevenueSummary {
  totalRevenue: number
  currentMonthRevenue: number
  previousMonthRevenue: number
  revenueChange: number
  totalPayments: number
  averagePayment: number
}

interface MonthlyRevenue {
  month: string
  revenue: number
  count: number
}

interface RevenueClientItem {
  clientId: string
  clientName: string
  totalPayments: number
  paymentCount: number
}

interface PaymentMethodItem {
  method: string
  amount: number
}

interface RecentPayment {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: string
  invoiceNumber: string
  clientName: string
}

type ReportTab = 'contracts' | 'renewals' | 'billing' | 'revenue'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('contracts')
  const [loading, setLoading] = useState(true)

  // Contract status data
  const [contractSummary, setContractSummary] = useState<ContractSummary | null>(null)
  const [contracts, setContracts] = useState<ContractItem[]>([])

  // Renewals data
  const [renewalSummary, setRenewalSummary] = useState<RenewalSummary | null>(null)
  const [renewals, setRenewals] = useState<RenewalsData | null>(null)

  // Billing data
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null)
  const [billingByClient, setBillingByClient] = useState<BillingClientItem[]>([])
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([])
  const [invoiceStatusData, setInvoiceStatusData] = useState<{ status: string; count: number }[]>([])

  // Revenue data
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null)
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([])
  const [revenueByClient, setRevenueByClient] = useState<RevenueClientItem[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([])
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])

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
        } else if (activeTab === 'renewals') {
          const res = await fetch('/api/reports/renewals')
          const data = await res.json()
          if (data.success) {
            setRenewalSummary(data.data.summary)
            setRenewals(data.data.renewals)
          }
        } else if (activeTab === 'billing') {
          const res = await fetch('/api/reports/billing')
          const data = await res.json()
          if (data.success) {
            setBillingSummary(data.data.summary)
            setBillingByClient(data.data.byClient)
            setOverdueInvoices(data.data.overdueInvoices)
            // Build invoice status data for pie chart
            const summary = data.data.summary
            setInvoiceStatusData([
              { status: 'pending', count: summary.pending || 0 },
              { status: 'sent', count: summary.sent || 0 },
              { status: 'paid', count: summary.paid || 0 },
              { status: 'overdue', count: data.data.overdueInvoices?.length || 0 },
            ])
          }
        } else if (activeTab === 'revenue') {
          const res = await fetch('/api/reports/revenue')
          const data = await res.json()
          if (data.success) {
            setRevenueSummary(data.data.summary)
            setMonthlyRevenue(data.data.monthlyRevenue)
            setRevenueByClient(data.data.byClient)
            setPaymentMethods(data.data.paymentMethods)
            setRecentPayments(data.data.recentPayments)
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
        <div className="mb-6 flex flex-wrap gap-2">
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
          <Button
            variant={activeTab === 'billing' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('billing')}
          >
            <Receipt className="mr-2 h-4 w-4" />
            Billing Summary
          </Button>
          <Button
            variant={activeTab === 'revenue' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('revenue')}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Revenue Report
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
                  <div className="py-8 text-center text-gray-900">Loading...</div>
                ) : contracts.length === 0 ? (
                  <div className="py-8 text-center text-gray-900">No contracts found</div>
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
              <div className="py-8 text-center text-gray-900">Loading...</div>
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
                    <CardContent className="py-8 text-center text-gray-900">
                      No contracts expiring in the next 90 days
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* Billing Summary Report */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              <SummaryCard label="Total Invoices" value={billingSummary?.totalInvoices ?? 0} loading={loading} />
              <SummaryCard label="Pending" value={billingSummary?.pending ?? 0} loading={loading} color="gray" />
              <SummaryCard label="Sent" value={billingSummary?.sent ?? 0} loading={loading} color="orange" />
              <SummaryCard label="Paid" value={billingSummary?.paid ?? 0} loading={loading} color="green" />
              <CurrencyCard label="Total Amount" value={billingSummary?.totalAmount ?? 0} loading={loading} formatCurrency={formatCurrency} />
              <CurrencyCard label="Total Paid" value={billingSummary?.totalPaid ?? 0} loading={loading} formatCurrency={formatCurrency} color="green" />
              <CurrencyCard label="Outstanding" value={billingSummary?.totalOutstanding ?? 0} loading={loading} formatCurrency={formatCurrency} color="red" />
            </div>

            {/* Invoice Status Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-8 text-center text-gray-900">Loading...</div>
                ) : (
                  <InvoiceStatusPieChart data={invoiceStatusData} />
                )}
              </CardContent>
            </Card>

            {/* Overdue Invoices */}
            {overdueInvoices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    Overdue Invoices ({overdueInvoices.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="py-8 text-center text-gray-900">Loading...</div>
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeader>Invoice #</TableHeader>
                          <TableHeader>Client</TableHeader>
                          <TableHeader>Amount</TableHeader>
                          <TableHeader>Balance</TableHeader>
                          <TableHeader>Due Date</TableHeader>
                          <TableHeader>Days Overdue</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {overdueInvoices.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">
                              <a href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline">
                                {inv.invoiceNumber}
                              </a>
                            </TableCell>
                            <TableCell>{inv.clientName}</TableCell>
                            <TableCell>{formatCurrency(inv.totalAmount)}</TableCell>
                            <TableCell className="text-red-600 font-medium">{formatCurrency(inv.balance)}</TableCell>
                            <TableCell>{formatDate(inv.dueDate)}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                                <AlertCircle className="h-3 w-3" /> {inv.daysOverdue} days
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* By Client Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Billing by Client</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-8 text-center text-gray-900">Loading...</div>
                ) : billingByClient.length === 0 ? (
                  <div className="py-8 text-center text-gray-900">No billing data</div>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader>Client</TableHeader>
                        <TableHeader>Invoices</TableHeader>
                        <TableHeader>Total Amount</TableHeader>
                        <TableHeader>Paid</TableHeader>
                        <TableHeader>Outstanding</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {billingByClient.map((client) => (
                        <TableRow key={client.clientId}>
                          <TableCell className="font-medium">
                            <a href={`/clients/${client.clientId}`} className="text-blue-600 hover:underline">
                              {client.clientName}
                            </a>
                          </TableCell>
                          <TableCell>{client.invoiceCount}</TableCell>
                          <TableCell>{formatCurrency(client.totalAmount)}</TableCell>
                          <TableCell className="text-green-600">{formatCurrency(client.totalPaid)}</TableCell>
                          <TableCell className={client.outstanding > 0 ? 'text-red-600 font-medium' : ''}>
                            {formatCurrency(client.outstanding)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Revenue Report */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <CurrencyCard label="Total Revenue (YTD)" value={revenueSummary?.totalRevenue ?? 0} loading={loading} formatCurrency={formatCurrency} />
              <CurrencyCard label="This Month" value={revenueSummary?.currentMonthRevenue ?? 0} loading={loading} formatCurrency={formatCurrency} color="green" />
              <CurrencyCard label="Last Month" value={revenueSummary?.previousMonthRevenue ?? 0} loading={loading} formatCurrency={formatCurrency} color="gray" />
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="py-4">
                  <p className="text-sm text-gray-900">Month Change</p>
                  <div className="flex items-center gap-2">
                    {(revenueSummary?.revenueChange ?? 0) >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    )}
                    <p className={`text-2xl font-semibold ${(revenueSummary?.revenueChange ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {loading ? '-' : `${(revenueSummary?.revenueChange ?? 0) >= 0 ? '+' : ''}${revenueSummary?.revenueChange ?? 0}%`}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <SummaryCard label="Total Payments" value={revenueSummary?.totalPayments ?? 0} loading={loading} />
              <CurrencyCard label="Avg Payment" value={revenueSummary?.averagePayment ?? 0} loading={loading} formatCurrency={formatCurrency} />
            </div>

            {/* Monthly Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue ({new Date().getFullYear()})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-8 text-center text-gray-900">Loading...</div>
                ) : (
                  <RevenueLineChart data={monthlyRevenue} />
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Revenue by Client - Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Clients by Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="py-8 text-center text-gray-900">Loading...</div>
                  ) : revenueByClient.length === 0 ? (
                    <div className="py-8 text-center text-gray-900">No payment data</div>
                  ) : (
                    <TopClientsBarChart
                      data={revenueByClient.map(c => ({
                        clientName: c.clientName,
                        total: c.totalPayments,
                        count: c.paymentCount,
                      }))}
                      maxItems={8}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Payment Methods Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="py-8 text-center text-gray-900">Loading...</div>
                  ) : paymentMethods.length === 0 ? (
                    <div className="py-8 text-center text-gray-900">No payment data</div>
                  ) : (
                    <div className="space-y-4">
                      {paymentMethods.map((method) => {
                        const total = paymentMethods.reduce((sum, m) => sum + m.amount, 0)
                        const percentage = total > 0 ? Math.round((method.amount / total) * 100) : 0
                        return (
                          <div key={method.method} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium capitalize">{method.method}</span>
                              <span className="text-gray-900">{formatCurrency(method.amount)} ({percentage}%)</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-8 text-center text-gray-900">Loading...</div>
                ) : recentPayments.length === 0 ? (
                  <div className="py-8 text-center text-gray-900">No payments recorded</div>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader>Date</TableHeader>
                        <TableHeader>Client</TableHeader>
                        <TableHeader>Invoice</TableHeader>
                        <TableHeader>Method</TableHeader>
                        <TableHeader>Amount</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                          <TableCell>{payment.clientName}</TableCell>
                          <TableCell>{payment.invoiceNumber}</TableCell>
                          <TableCell className="capitalize">{payment.paymentMethod}</TableCell>
                          <TableCell className="text-green-600 font-medium">{formatCurrency(payment.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
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
        <p className="text-sm text-gray-900">{label}</p>
        <p className="text-2xl font-semibold text-gray-900">
          {loading ? '-' : value}
        </p>
      </CardContent>
    </Card>
  )
}

function CurrencyCard({
  label,
  value,
  loading,
  formatCurrency,
  color,
}: {
  label: string
  value: number
  loading: boolean
  formatCurrency: (amount: number) => string
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
        <p className="text-sm text-gray-900">{label}</p>
        <p className="text-xl font-semibold text-gray-900">
          {loading ? '-' : formatCurrency(value)}
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
