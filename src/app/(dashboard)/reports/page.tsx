import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { BarChart3, FileText, TrendingUp, Calendar } from 'lucide-react'

const reportTypes = [
  {
    title: 'Contract Status Report',
    description: 'Overview of all contracts by status (active, expired, expiring soon)',
    icon: FileText,
  },
  {
    title: 'Billing Summary',
    description: 'Summary of invoices, payments, and outstanding balances',
    icon: TrendingUp,
  },
  {
    title: 'Monthly Revenue',
    description: 'Revenue tracking by month with comparisons',
    icon: BarChart3,
  },
  {
    title: 'Upcoming Renewals',
    description: 'Contracts expiring in the next 30, 60, 90 days',
    icon: Calendar,
  },
]

export default function ReportsPage() {
  return (
    <div>
      <Header title="Reports" />

      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {reportTypes.map((report) => (
            <Card key={report.title} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <report.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle>{report.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">{report.description}</p>
                <p className="mt-4 text-sm text-gray-400">
                  Report generation coming soon...
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
