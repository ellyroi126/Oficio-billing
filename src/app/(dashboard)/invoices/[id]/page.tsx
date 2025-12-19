'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge, getStatusVariant } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import {
  Download,
  Send,
  CheckCircle,
  Trash2,
  CreditCard,
  Building2,
  Calendar,
  FileText,
  DollarSign
} from 'lucide-react'

interface Payment {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: string
  referenceNumber: string | null
  notes: string | null
  createdAt: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  amount: number
  vatAmount: number
  totalAmount: number
  billingPeriodStart: string
  billingPeriodEnd: string
  dueDate: string
  filePath: string | null
  createdAt: string
  sentAt: string | null
  paidAt: string | null
  client: {
    id: string
    clientName: string
    address: string
    billingTerms: string
    vatInclusive: boolean
  }
  payments: Payment[]
  totalPaid: number
  balance: number
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchInvoice()
  }, [id])

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}`)
      const result = await response.json()
      if (result.success) {
        setInvoice(result.data)
      }
    } catch (error) {
      console.error('Error fetching invoice:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!invoice) return
    setUpdating(true)

    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await response.json()
      if (result.success) {
        setInvoice(result.data)
      }
    } catch (error) {
      console.error('Error updating invoice:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this invoice?')) return

    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        router.push('/invoices')
      }
    } catch (error) {
      console.error('Error deleting invoice:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatShortDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const isOverdue = () => {
    if (!invoice || invoice.status === 'paid') return false
    return new Date(invoice.dueDate) < new Date()
  }

  if (loading) {
    return (
      <div>
        <Header title="Invoice Details" showBack />
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div>
        <Header title="Invoice Details" showBack />
        <div className="p-6 text-center">
          <p className="text-gray-500">Invoice not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Invoice Details" showBack />

      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold">{invoice.invoiceNumber}</h2>
                      <Badge
                        variant={
                          isOverdue() && invoice.status !== 'paid'
                            ? 'danger'
                            : getStatusVariant(invoice.status)
                        }
                      >
                        {isOverdue() && invoice.status !== 'paid' ? 'Overdue' : invoice.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Created on {formatDate(invoice.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {invoice.filePath && (
                      <a href={`/api/invoices/${invoice.id}/download`}>
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-gray-500">Billing Period</p>
                    <p className="font-medium">
                      {formatShortDate(invoice.billingPeriodStart)} -{' '}
                      {formatShortDate(invoice.billingPeriodEnd)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Due Date</p>
                    <p className={`font-medium ${isOverdue() ? 'text-red-600' : ''}`}>
                      {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  {invoice.sentAt && (
                    <div>
                      <p className="text-sm text-gray-500">Sent</p>
                      <p className="font-medium">{formatDate(invoice.sentAt)}</p>
                    </div>
                  )}
                  {invoice.paidAt && (
                    <div>
                      <p className="text-sm text-gray-500">Paid</p>
                      <p className="font-medium">{formatDate(invoice.paidAt)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Client Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <h3 className="font-semibold">Client</h3>
                </div>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/clients/${invoice.client.id}`}
                  className="text-lg font-medium text-blue-600 hover:underline"
                >
                  {invoice.client.clientName}
                </Link>
                <p className="mt-1 text-sm text-gray-500">{invoice.client.address}</p>
                <div className="mt-3 flex gap-4 text-sm">
                  <span className="text-gray-500">
                    Billing Terms: <span className="font-medium text-gray-700">{invoice.client.billingTerms}</span>
                  </span>
                  <span className="text-gray-500">
                    VAT: <span className="font-medium text-gray-700">{invoice.client.vatInclusive ? 'Inclusive' : 'Exclusive'}</span>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Amount Breakdown */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                  <h3 className="font-semibold">Amount Details</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(invoice.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      VAT (12%{invoice.client.vatInclusive ? ' inclusive' : ''})
                    </span>
                    <span className="font-medium">{formatCurrency(invoice.vatAmount)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Total Amount</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(invoice.totalAmount)}
                      </span>
                    </div>
                  </div>
                  {invoice.payments.length > 0 && (
                    <>
                      <div className="border-t pt-2">
                        <div className="flex justify-between text-green-600">
                          <span>Total Paid</span>
                          <span className="font-medium">
                            -{formatCurrency(invoice.totalPaid)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between text-lg">
                        <span className="font-semibold">Balance Due</span>
                        <span
                          className={`font-bold ${
                            invoice.balance > 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {formatCurrency(invoice.balance)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payments */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <h3 className="font-semibold">Payments</h3>
                  </div>
                  {invoice.status !== 'paid' && (
                    <Link href={`/payments/new?invoiceId=${invoice.id}`}>
                      <Button size="sm">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Record Payment
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {invoice.payments.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-4">
                    No payments recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {invoice.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                      >
                        <div>
                          <p className="font-medium">{formatCurrency(payment.amount)}</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(payment.paymentDate)} via {payment.paymentMethod}
                            {payment.referenceNumber && ` - Ref: ${payment.referenceNumber}`}
                          </p>
                        </div>
                        <Link href={`/payments/${payment.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Actions</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {invoice.status === 'pending' && (
                  <Button
                    className="w-full"
                    onClick={() => handleStatusUpdate('sent')}
                    disabled={updating}
                  >
                    {updating ? (
                      <Spinner size="sm" className="mr-2" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Mark as Sent
                  </Button>
                )}

                {invoice.status !== 'paid' && invoice.balance <= 0 && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => handleStatusUpdate('paid')}
                    disabled={updating}
                  >
                    {updating ? (
                      <Spinner size="sm" className="mr-2" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Mark as Paid
                  </Button>
                )}

                {invoice.status !== 'paid' && (
                  <Link href={`/payments/new?invoiceId=${invoice.id}`} className="block">
                    <Button className="w-full" variant="outline">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Record Payment
                    </Button>
                  </Link>
                )}

                <Button
                  className="w-full text-red-600 hover:bg-red-50"
                  variant="outline"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Invoice
                </Button>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Quick Info</h3>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Invoice Number:</span>
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Due:</span>
                  <span className={`font-medium ${isOverdue() ? 'text-red-600' : ''}`}>
                    {formatDate(invoice.dueDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Balance:</span>
                  <span
                    className={`font-medium ${
                      invoice.balance > 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {formatCurrency(invoice.balance)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
