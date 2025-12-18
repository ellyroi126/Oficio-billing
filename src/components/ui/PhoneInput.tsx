import { InputHTMLAttributes, forwardRef } from 'react'

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  prefix?: '+63' | '63'
  required?: boolean
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className = '', label, error, id, prefix = '+63', required, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="flex">
          <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 px-3 text-sm text-gray-700">
            {prefix}
          </span>
          <input
            ref={ref}
            id={id}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            className={`block w-full rounded-r-lg border px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors
              ${error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }
              focus:outline-none focus:ring-1
              disabled:bg-gray-50 disabled:text-gray-500
              placeholder:text-gray-400
              ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)

PhoneInput.displayName = 'PhoneInput'
