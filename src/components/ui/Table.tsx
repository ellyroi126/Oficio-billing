import { ReactNode } from 'react'

interface TableProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y divide-gray-200 dark:divide-gray-700 ${className}`}>
        {children}
      </table>
    </div>
  )
}

interface TableHeadProps {
  children: ReactNode
  className?: string
}

export function TableHead({ children, className = '' }: TableHeadProps) {
  return (
    <thead className={`bg-gray-50 dark:bg-gray-800 ${className}`}>
      {children}
    </thead>
  )
}

interface TableBodyProps {
  children: ReactNode
  className?: string
}

export function TableBody({ children, className = '' }: TableBodyProps) {
  return (
    <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 ${className}`}>
      {children}
    </tbody>
  )
}

interface TableRowProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function TableRow({ children, className = '', onClick }: TableRowProps) {
  return (
    <tr
      className={`${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

interface TableHeaderProps {
  children: ReactNode
  className?: string
}

export function TableHeader({ children, className = '' }: TableHeaderProps) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-900 dark:text-gray-300 ${className}`}>
      {children}
    </th>
  )
}

interface TableCellProps {
  children: ReactNode
  className?: string
}

export function TableCell({ children, className = '' }: TableCellProps) {
  return (
    <td className={`whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100 ${className}`}>
      {children}
    </td>
  )
}
