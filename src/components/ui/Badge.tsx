import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default'
  className?: string
}

const variantStyles = {
  success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
  warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
  danger: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
  default: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

// Helper function to get badge variant from status
export function getStatusVariant(status: string): BadgeProps['variant'] {
  switch (status.toLowerCase()) {
    case 'active':
    case 'paid':
    case 'completed':
      return 'success'
    case 'pending':
    case 'draft':
      return 'warning'
    case 'expired':
    case 'overdue':
    case 'terminated':
      return 'danger'
    case 'sent':
      return 'info'
    default:
      return 'default'
  }
}
