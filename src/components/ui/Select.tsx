import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options?: SelectOption[]
  placeholder?: string
  children?: ReactNode
}

export type { SelectProps }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, options, placeholder, id, required, children, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          required={required}
          className={`block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 shadow-sm transition-colors
            ${error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
            }
            focus:outline-none focus:ring-1
            disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-900 dark:disabled:text-gray-400
            ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" className="text-gray-900 dark:text-gray-100">{placeholder}</option>
          )}
          {children || options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
