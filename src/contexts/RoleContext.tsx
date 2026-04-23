'use client'

import { createContext, useContext, useMemo, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

interface RoleContextType {
  role: 'ADMIN' | 'EMPLOYEE' | null
  isAdmin: boolean
  isEmployee: boolean
  isLoading: boolean
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  isAdmin: false,
  isEmployee: false,
  isLoading: true
})

export function RoleProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()

  const role = session?.user?.role as 'ADMIN' | 'EMPLOYEE' | null
  const isAdmin = role === 'ADMIN'
  const isEmployee = role === 'EMPLOYEE'
  const isLoading = status === 'loading'

  const value = useMemo(() => ({ role, isAdmin, isEmployee, isLoading }), [role, isAdmin, isEmployee, isLoading])

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}
