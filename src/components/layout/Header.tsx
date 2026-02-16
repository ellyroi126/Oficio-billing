'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Bell, User, ArrowLeft, ChevronDown, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { UserProfileModal } from '@/components/profile/UserProfileModal'

interface HeaderProps {
  title: string
  showBack?: boolean
}

export function Header({ title, showBack }: HeaderProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showDropdown])

  const handleProfileClick = () => {
    setShowDropdown(false)
    setShowProfileModal(true)
  }

  const handleLogout = async () => {
    setShowDropdown(false)
    await signOut({ callbackUrl: '/login' })
  }

  const displayName = session?.user?.name || 'Admin'

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
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
          <button className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* User menu with dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <User className="h-5 w-5" />
              <span className="text-sm font-medium">{displayName}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  showDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={handleProfileClick}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Profile Settings
                </button>
                <div className="border-t border-gray-200 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSuccess={() => {
          // Optionally refresh or show success message
        }}
      />
    </>
  )
}
