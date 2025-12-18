import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default function InvoicesPage() {
  return (
    <div>
      <Header title="Invoices" />

      <div className="p-6">
        {/* Actions */}
        <div className="flex gap-3">
          <Link href="/invoices/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
        </div>

        {/* Invoice List */}
        <Card className="mt-6">
          <CardContent>
            <div className="py-12 text-center">
              <p className="text-gray-500">No invoices found.</p>
              <p className="mt-2 text-sm text-gray-400">
                Create an invoice for a client to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
