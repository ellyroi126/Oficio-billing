import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Users,
  FileText,
  Receipt,
  DollarSign,
  AlertTriangle,
  Clock,
} from 'lucide-react'

// Placeholder stats - will be replaced with real data
const stats = [
  { name: 'Total Clients', value: '0', icon: Users, color: 'bg-blue-500' },
  { name: 'Active Contracts', value: '0', icon: FileText, color: 'bg-green-500' },
  { name: 'Pending Invoices', value: '0', icon: Receipt, color: 'bg-yellow-500' },
  { name: 'Monthly Revenue', value: '₱0', icon: DollarSign, color: 'bg-purple-500' },
  { name: 'Expiring Soon', value: '0', icon: Clock, color: 'bg-orange-500' },
  { name: 'Overdue Payments', value: '0', icon: AlertTriangle, color: 'bg-red-500' },
]

export default function DashboardPage() {
  return (
    <div>
      <Header title="Dashboard" />

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.name}>
              <CardContent className="flex items-center gap-4">
                <div className={`rounded-lg p-3 ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              title="Add New Client"
              description="Register a new client"
              href="/clients/new"
            />
            <QuickAction
              title="Create Contract"
              description="Generate a new contract"
              href="/contracts/new"
            />
            <QuickAction
              title="Create Invoice"
              description="Generate a new invoice"
              href="/invoices/new"
            />
            <QuickAction
              title="Record Payment"
              description="Log a payment received"
              href="/payments/new"
            />
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <Card className="mt-4">
            <CardContent>
              <p className="text-center text-gray-500 py-8">
                No recent activity. Start by adding your first client.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function QuickAction({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <a
      href={href}
      className="block rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </a>
  )
}
