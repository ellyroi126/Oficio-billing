'use client'

import { useRouter } from 'next/navigation'
import { Bell, User, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface HeaderProps {
  title: string
  showBack?: boolean
}

export function Header({ title, showBack }: HeaderProps) {
  const router = useRouter()

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-3">
        {showBack && (
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User menu */}
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100">
          <User className="h-5 w-5" />
          <span className="text-sm font-medium">Admin</span>
        </button>
      </div>
    </header>
  )
}
