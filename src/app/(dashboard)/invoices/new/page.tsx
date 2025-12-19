import { Header } from '@/components/layout/Header'
import { InvoiceForm } from '@/components/invoices/InvoiceForm'

export default function NewInvoicePage() {
  return (
    <div>
      <Header title="Create Invoice" showBack />

      <div className="mx-auto max-w-2xl p-6">
        <InvoiceForm />
      </div>
    </div>
  )
}
