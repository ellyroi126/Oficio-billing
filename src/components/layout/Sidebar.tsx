'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useRole } from '@/contexts/RoleContext'
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  CheckSquare,
  ClipboardList,
  UserCog,
  ScrollText,
  Trash2,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: any
  adminOnly?: boolean
  badgeKey?: 'approvalsPending' | 'overdueInvoices'
  badgeColor?: string
}

interface SidebarCounts {
  approvalsPending: number
  overdueInvoices: number
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Contracts', href: '/contracts', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: Receipt, badgeKey: 'overdueInvoices', badgeColor: 'bg-orange-500' },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const roleSpecificNavigation: { admin: NavItem[]; employee: NavItem[] } = {
  admin: [
    { name: 'Approvals', href: '/approvals', icon: CheckSquare, badgeKey: 'approvalsPending', badgeColor: 'bg-red-500' },
    { name: 'Users', href: '/users', icon: UserCog },
    { name: 'Audit Logs', href: '/audit-logs', icon: ScrollText },
    { name: 'Trash', href: '/trash', icon: Trash2 },
  ],
  employee: [
    { name: 'My Requests', href: '/my-requests', icon: ClipboardList },
  ],
}

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { isAdmin, isEmployee } = useRole()
  const [counts, setCounts] = useState<SidebarCounts>({ approvalsPending: 0, overdueInvoices: 0 })

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/sidebar/counts')
      const data = await res.json()
      if (data.success) {
        setCounts(data.data)
      }
    } catch {
      // Silently fail - badges are non-critical
    }
  }, [])

  useEffect(() => {
    fetchCounts()
    const interval = setInterval(fetchCounts, 60000)
    return () => clearInterval(interval)
  }, [fetchCounts])

  // Filter navigation based on role
  const filteredNavigation = navigation.filter(item => {
    if (item.adminOnly && !isAdmin) return false
    return true
  })

  // Add role-specific navigation
  const roleNav = isAdmin
    ? roleSpecificNavigation.admin
    : isEmployee
    ? roleSpecificNavigation.employee
    : []

  // Listen for refresh events (e.g., after approving a request)
  useEffect(() => {
    const handleRefresh = () => fetchCounts()
    window.addEventListener('sidebar-refresh', handleRefresh)
    return () => window.removeEventListener('sidebar-refresh', handleRefresh)
  }, [fetchCounts])

  return (
    <>
      {/* Mobile backdrop overlay */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Mobile hamburger button */}
      <button
        onClick={onToggle}
        className="fixed left-3 top-3 z-50 rounded-lg bg-gray-900 p-2 text-gray-400 hover:bg-gray-800 hover:text-white md:hidden"
        title="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div
        className={`flex h-screen flex-col bg-gray-900 transition-all duration-300
          fixed inset-y-0 left-0 z-40 w-64 md:relative md:z-auto
          ${isCollapsed ? '-translate-x-full md:translate-x-0 md:w-16' : 'translate-x-0 md:w-64'}
        `}
      >
        {/* Logo and Toggle */}
        <div className="flex h-16 items-center justify-between border-b border-gray-800 px-3">
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-white">Oficio</h1>
          )}
          <button
            onClick={onToggle}
            className={`rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white ${
              isCollapsed ? 'mx-auto' : ''
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))
              const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 768 && !isCollapsed) {
                      onToggle()
                    }
                  }}
                  className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  } ${isCollapsed ? 'md:justify-center' : ''}`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <div className="relative flex-shrink-0">
                    <item.icon className="h-5 w-5" />
                    {isCollapsed && badgeCount > 0 && (
                      <span className={`absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${item.badgeColor || 'bg-red-500'}`}>
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="flex-1">{item.name}</span>
                      {badgeCount > 0 && (
                        <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white ${item.badgeColor || 'bg-red-500'}`}>
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Role-specific section */}
          {roleNav.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              {!isCollapsed && (
                <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {isAdmin ? 'Admin' : 'My Account'}
                </p>
              )}
              <div className="space-y-1">
                {roleNav.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href))
                  const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => {
                        if (window.innerWidth < 768 && !isCollapsed) {
                          onToggle()
                        }
                      }}
                      className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      } ${isCollapsed ? 'md:justify-center' : ''}`}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <div className="relative flex-shrink-0">
                        <item.icon className="h-5 w-5" />
                        {isCollapsed && badgeCount > 0 && (
                          <span className={`absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${item.badgeColor || 'bg-red-500'}`}>
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}
                      </div>
                      {!isCollapsed && (
                        <>
                          <span className="flex-1">{item.name}</span>
                          {badgeCount > 0 && (
                            <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white ${item.badgeColor || 'bg-red-500'}`}>
                              {badgeCount > 99 ? '99+' : badgeCount}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-800 p-2">
          <button
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white ${
              isCollapsed ? 'md:justify-center' : ''
            }`}
            title={isCollapsed ? 'Logout' : undefined}
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </>
  )
}
