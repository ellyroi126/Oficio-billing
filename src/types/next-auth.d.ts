import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      role: string
      isActive: boolean
    }
  }

  interface User {
    id: string
    email: string
    name: string | null
    role: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    name: string | null
    role: string
    isActive?: boolean
  }
}
