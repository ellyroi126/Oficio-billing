'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import {
  Trash2,
  FileText,
  Calendar,
  CreditCard,
  Building2,
  DollarSign,
  Image,
  File,
  ExternalLink
} from 'lucide-react'

interface Payment {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: string
  referenceNumber: string | null
  notes: string | null
  evidencePath: string | null
  createdAt: string
  invoice: {
    id: string
    invoiceNumber: string
    totalAmount: number
    status: string
    billingPeriodStart: string
    billingPeriodEnd: string
    dueDate: string
    client: {
      id: string
      clientName: string
    }
    totalPaid: number
    balance: number
  }
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  check: 'Check',
  gcash: 'GCash',
  maya: 'Maya',
  other: 'Other',
}

export default function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayment()
  }, [id])

  const fetchPayment = async () => {
    try {
      const response = await fetch(`/api/payments/${id}`)
      const result = await response.json()
      if (result.success) {
        setPayment(result.data)
      }
    } catch (error) {
      console.error('Error fetching payment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this payment?')) return

    try {
      const response = await fetch(`/api/payments/${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        router.push('/payments')
      }
    } catch (error) {
      console.error('Error deleting payment:', error)
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

  const getEvidenceIcon = (path: string | null) => {
    if (!path) return null
    const ext = path.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
      return <Image className="h-6 w-6 text-green-500" />
    }
    return <File className="h-6 w-6 text-blue-500" />
  }

  if (loading) {
    return (
      <div>
        <Header title="Payment Details" showBack />
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div>
        <Header title="Payment Details" showBack />
        <div className="p-6 text-center">
          <p className="text-gray-900">Payment not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Payment Details" showBack />

      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-green-600">
                      {formatCurrency(payment.amount)}
                    </h2>
                    <p className="mt-1 text-sm text-gray-900">
                      Recorded on {formatDate(payment.createdAt)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-gray-900">Payment Date</p>
                    <p className="font-medium">{formatDate(payment.paymentDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">Payment Method</p>
                    <p className="font-medium">
                      {PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}
                    </p>
                  </div>
                  {payment.referenceNumber && (
                    <div>
                      <p className="text-sm text-gray-900">Reference Number</p>
                      <p className="font-medium">{payment.referenceNumber}</p>
                    </div>
                  )}
                </div>

                {payment.notes && (
                  <div className="mt-4 rounded-md bg-gray-50 p-3">
                    <p className="text-sm text-gray-900">Notes</p>
                    <p className="mt-1 text-sm text-gray-700">{payment.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoice Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-900" />
                  <h3 className="font-semibold">Invoice</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Link
                      href={`/invoices/${payment.invoice.id}`}
                      className="text-lg font-medium text-blue-600 hover:underline"
                    >
                      {payment.invoice.invoiceNumber}
                    </Link>
                    <p className="mt-1 text-sm text-gray-900">
                      {payment.invoice.client.clientName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">Invoice Total</p>
                    <p className="font-medium">{formatCurrency(payment.invoice.totalAmount)}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 rounded-md bg-gray-50 p-3">
                  <div>
                    <p className="text-sm text-gray-900">Total Paid</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(payment.invoice.totalPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">Balance Due</p>
                    <p className={`font-medium ${payment.invoice.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(payment.invoice.balance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-900" />
                  <h3 className="font-semibold">Client</h3>
                </div>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/clients/${payment.invoice.client.id}`}
                  className="text-lg font-medium text-blue-600 hover:underline"
                >
                  {payment.invoice.client.clientName}
                </Link>
              </CardContent>
            </Card>

            {/* Evidence */}
            {payment.evidencePath && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-gray-900" />
                    <h3 className="font-semibold">Payment Evidence</h3>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between rounded-md border p-4">
                    <div className="flex items-center gap-3">
                      {getEvidenceIcon(payment.evidencePath)}
                      <div>
                        <p className="font-medium">Uploaded Evidence</p>
                        <p className="text-sm text-gray-900">
                          {payment.evidencePath.split('/').pop()}
                        </p>
                      </div>
                    </div>
                    <a
                      href={payment.evidencePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Actions</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href={`/invoices/${payment.invoice.id}`} className="block">
                  <Button className="w-full" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    View Invoice
                  </Button>
                </Link>

                <Button
                  className="w-full text-red-600 hover:bg-red-50"
                  variant="outline"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Payment
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
                  <DollarSign className="h-4 w-4 text-gray-900" />
                  <span className="text-gray-900">Amount:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-900" />
                  <span className="text-gray-900">Date:</span>
                  <span className="font-medium">{formatDate(payment.paymentDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-900" />
                  <span className="text-gray-900">Method:</span>
                  <span className="font-medium">
                    {PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}
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
