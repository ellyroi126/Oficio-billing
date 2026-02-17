import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

interface AuthResult {
  user?: {
    id: string
    email: string
    name: string | null
    role: string
  }
  error?: string
  status?: number
}

/**
 * Middleware to require admin role
 * Returns user if authenticated and admin, otherwise returns error
 */
export async function requireAdmin(): Promise<AuthResult> {
  const session = await getServerSession(authOptions)

  if (!session) {
    return { error: 'Unauthorized', status: 401 }
  }

  if (session.user.role !== 'ADMIN') {
    return { error: 'Forbidden: Admin access required', status: 403 }
  }

  return { user: session.user }
}

/**
 * Middleware to require any authenticated user
 * Returns user if authenticated, otherwise returns error
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions)

  if (!session) {
    return { error: 'Unauthorized', status: 401 }
  }

  return { user: session.user }
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions)
  return session?.user?.role === 'ADMIN'
}

/**
 * Check if user is employee
 */
export async function isEmployee(): Promise<boolean> {
  const session = await getServerSession(authOptions)
  return session?.user?.role === 'EMPLOYEE'
}
