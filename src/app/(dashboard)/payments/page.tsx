import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default function PaymentsPage() {
  return (
    <div>
      <Header title="Payments" />

      <div className="p-6">
        {/* Actions */}
        <div className="flex gap-3">
          <Link href="/payments/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </Link>
        </div>

        {/* Payment List */}
        <Card className="mt-6">
          <CardContent>
            <div className="py-12 text-center">
              <p className="text-gray-500">No payments recorded.</p>
              <p className="mt-2 text-sm text-gray-400">
                Record a payment when you receive one from a client.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
