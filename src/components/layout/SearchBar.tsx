'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, FileText, Receipt, CreditCard, X } from 'lucide-react'

interface SearchResults {
  clients: { id: string; clientName: string }[]
  invoices: { id: string; invoiceNumber: string; totalAmount: number; status: string }[]
  contracts: { id: string; contractNumber: string; status: string }[]
  payments: { id: string; referenceNumber: string | null; amount: number; paymentMethod: string }[]
}

export function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>(undefined)

  // Expose focus method for keyboard shortcuts
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail === 'focus-search') {
        inputRef.current?.focus()
      }
    }
    window.addEventListener('focus-search' as any, handler)
    return () => window.removeEventListener('focus-search' as any, handler)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null)
      setIsOpen(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (data.success) {
        setResults(data.data)
        setIsOpen(true)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
  }

  const handleNavigate = (path: string) => {
    setIsOpen(false)
    setQuery('')
    setResults(null)
    router.push(path)
  }

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const hasResults = results && (
    results.clients.length > 0 ||
    results.invoices.length > 0 ||
    results.contracts.length > 0 ||
    results.payments.length > 0
  )

  return (
    <div ref={containerRef} className="relative w-64 lg:w-80">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results) setIsOpen(true) }}
          placeholder="Search... (press /)"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 py-2 pl-10 pr-8 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-gray-300 dark:focus:border-gray-500 focus:bg-white dark:focus:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-500"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults(null); setIsOpen(false) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
          ) : !hasResults ? (
            <div className="px-4 py-3 text-sm text-gray-500">No results found</div>
          ) : (
            <>
              {results!.clients.length > 0 && (
                <ResultGroup
                  title="Clients"
                  icon={<Users className="h-4 w-4 text-blue-500" />}
                  items={results!.clients.map(c => ({
                    label: c.clientName,
                    onClick: () => handleNavigate(`/clients/${c.id}`),
                  }))}
                />
              )}
              {results!.contracts.length > 0 && (
                <ResultGroup
                  title="Contracts"
                  icon={<FileText className="h-4 w-4 text-green-500" />}
                  items={results!.contracts.map(c => ({
                    label: c.contractNumber,
                    sublabel: c.status,
                    onClick: () => handleNavigate(`/contracts/${c.id}`),
                  }))}
                />
              )}
              {results!.invoices.length > 0 && (
                <ResultGroup
                  title="Invoices"
                  icon={<Receipt className="h-4 w-4 text-purple-500" />}
                  items={results!.invoices.map(i => ({
                    label: i.invoiceNumber,
                    sublabel: `₱${i.totalAmount.toLocaleString()} · ${i.status}`,
                    onClick: () => handleNavigate(`/invoices/${i.id}`),
                  }))}
                />
              )}
              {results!.payments.length > 0 && (
                <ResultGroup
                  title="Payments"
                  icon={<CreditCard className="h-4 w-4 text-emerald-500" />}
                  items={results!.payments.map(p => ({
                    label: p.referenceNumber || 'No reference',
                    sublabel: `₱${p.amount.toLocaleString()} · ${p.paymentMethod}`,
                    onClick: () => handleNavigate(`/payments/${p.id}`),
                  }))}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ResultGroup({
  title,
  icon,
  items,
}: {
  title: string
  icon: React.ReactNode
  items: { label: string; sublabel?: string; onClick: () => void }[]
}) {
  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-700/50">
        {icon}
        {title}
      </div>
      {items.map((item, i) => (
        <button
          key={i}
          onClick={item.onClick}
          className="flex w-full items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="font-medium">{item.label}</span>
          {item.sublabel && <span className="text-xs text-gray-400">{item.sublabel}</span>}
        </button>
      ))}
    </div>
  )
}
