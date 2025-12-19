'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Users,
  FileText,
  Clock,
  UserPlus,
  FilePlus,
  Receipt,
  AlertTriangle,
  DollarSign,
  CreditCard,
} from 'lucide-react'

interface DashboardStats {
  totalClients: number
  activeContracts: number
  expiringSoon: number
  pendingInvoices: number
  overdueInvoices: number
  paidThisMonth: number
  monthlyRevenue: number
}

interface Activity {
  id: string
  type: 'client' | 'contract' | 'invoice' | 'payment'
  action: string
  description: string
  timestamp: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, activityRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/activity'),
        ])

        const statsData = await statsRes.json()
        const activityData = await activityRes.json()

        if (statsData.success) {
          setStats(statsData.data)
        }
        if (activityData.success) {
          setActivities(activityData.data)
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const statCards = [
    {
      name: 'Total Clients',
      value: stats?.totalClients ?? 0,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Contracts',
      value: stats?.activeContracts ?? 0,
      icon: FileText,
      color: 'bg-green-500',
    },
    {
      name: 'Expiring Soon',
      value: stats?.expiringSoon ?? 0,
      icon: Clock,
      color: 'bg-orange-500',
      subtitle: 'Next 30 days',
    },
    {
      name: 'Pending Invoices',
      value: stats?.pendingInvoices ?? 0,
      icon: Receipt,
      color: 'bg-purple-500',
    },
    {
      name: 'Overdue Invoices',
      value: stats?.overdueInvoices ?? 0,
      icon: AlertTriangle,
      color: 'bg-red-500',
      highlight: (stats?.overdueInvoices ?? 0) > 0,
    },
    {
      name: 'Revenue This Month',
      value: formatCurrency(stats?.monthlyRevenue ?? 0),
      icon: DollarSign,
      color: 'bg-emerald-500',
      isFormatted: true,
    },
  ]

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'client':
        return <UserPlus className="h-4 w-4 text-blue-600" />
      case 'contract':
        return <FilePlus className="h-4 w-4 text-green-600" />
      case 'invoice':
        return <Receipt className="h-4 w-4 text-purple-600" />
      case 'payment':
        return <CreditCard className="h-4 w-4 text-emerald-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div>
      <Header title="Dashboard" />

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {statCards.map((stat) => (
            <Card key={stat.name} className={stat.highlight ? 'ring-2 ring-red-200' : ''}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-lg p-2 ${stat.color}`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{stat.name}</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {loading ? '-' : stat.isFormatted ? stat.value : stat.value}
                  </p>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-400">{stat.subtitle}</p>
                  )}
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
              icon={<UserPlus className="h-5 w-5 text-blue-500" />}
            />
            <QuickAction
              title="Create Contract"
              description="Generate a new contract"
              href="/contracts/new"
              icon={<FilePlus className="h-5 w-5 text-green-500" />}
            />
            <QuickAction
              title="Create Invoice"
              description="Bill a client"
              href="/invoices/new"
              icon={<Receipt className="h-5 w-5 text-purple-500" />}
            />
            <QuickAction
              title="Record Payment"
              description="Log a payment received"
              href="/payments/new"
              icon={<CreditCard className="h-5 w-5 text-emerald-500" />}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <Card className="mt-4">
            <CardContent className="p-0">
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : activities.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No recent activity. Start by adding your first client.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {activities.map((activity) => (
                    <li key={activity.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.action}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {activity.description}
                        </p>
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatTimeAgo(activity.timestamp)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
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
  icon,
}: {
  title: string
  description: string
  href: string
  icon: React.ReactNode
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </a>
  )
}
