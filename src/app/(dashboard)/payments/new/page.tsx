import { Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { PaymentForm } from '@/components/payments/PaymentForm'
import { Spinner } from '@/components/ui/Spinner'

export default function NewPaymentPage() {
  return (
    <div>
      <Header title="Record Payment" showBack />

      <div className="mx-auto max-w-2xl p-6">
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        }>
          <PaymentForm />
        </Suspense>
      </div>
    </div>
  )
}
