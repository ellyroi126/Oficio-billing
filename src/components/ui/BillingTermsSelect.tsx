'use client'

import { forwardRef, useState, useEffect } from 'react'

interface BillingTermsSelectProps {
  label?: string
  error?: string
  value: string
  customValue?: string
  onChange: (value: string, customValue?: string) => void
  required?: boolean
  disabled?: boolean
  className?: string
  id?: string
}

const BILLING_TERMS_OPTIONS = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Semi-Annual', label: 'Semi-Annual' },
  { value: 'Annual', label: 'Annual' },
  { value: 'Other', label: 'Other (specify)' },
]

export const BillingTermsSelect = forwardRef<HTMLSelectElement, BillingTermsSelectProps>(
  ({ label, error, value, customValue = '', onChange, required, disabled, className = '', id }, ref) => {
    const [showCustomInput, setShowCustomInput] = useState(value === 'Other')
    const [customInputValue, setCustomInputValue] = useState(customValue)

    useEffect(() => {
      setShowCustomInput(value === 'Other')
    }, [value])

    useEffect(() => {
      setCustomInputValue(customValue)
    }, [customValue])

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newValue = e.target.value
      setShowCustomInput(newValue === 'Other')
      if (newValue === 'Other') {
        onChange(newValue, customInputValue)
      } else {
        onChange(newValue, undefined)
      }
    }

    const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newCustomValue = e.target.value
      setCustomInputValue(newCustomValue)
      onChange('Other', newCustomValue)
    }

    return (
      <div className="space-y-2">
        <div className="space-y-1">
          {label && (
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          <select
            ref={ref}
            id={id}
            value={value}
            onChange={handleSelectChange}
            required={required}
            disabled={disabled}
            className={`block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors
              ${error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }
              focus:outline-none focus:ring-1
              disabled:bg-gray-50 disabled:text-gray-900
              ${className}`}
          >
            <option value="" className="text-gray-900">Select billing terms...</option>
            {BILLING_TERMS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {showCustomInput && (
          <div className="ml-4">
            <input
              type="text"
              value={customInputValue}
              onChange={handleCustomInputChange}
              placeholder="Specify custom billing terms..."
              disabled={disabled}
              required={required && value === 'Other'}
              className={`block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors
                border-gray-300 focus:border-blue-500 focus:ring-blue-500
                focus:outline-none focus:ring-1
                disabled:bg-gray-50 disabled:text-gray-900
                placeholder:text-gray-900`}
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)

BillingTermsSelect.displayName = 'BillingTermsSelect'
