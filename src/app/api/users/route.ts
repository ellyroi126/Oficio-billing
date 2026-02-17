import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware/roleCheck'
import { createAuditLog, getRequestMetadata } from '@/lib/auditLog'
import bcrypt from 'bcryptjs'

/**
 * GET /api/users
 * Get all users (Admin only)
 */
export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users
 * Create a new user (Admin only)
 */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const { email, name, password, role } = body

    // Validate required fields
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['ADMIN', 'EMPLOYEE'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN or EMPLOYEE' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        password: hashedPassword,
        role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    })

    // Create audit log
    const metadata = getRequestMetadata(req)
    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.name || auth.user.email,
      userEmail: auth.user.email,
      userRole: 'ADMIN',
      action: 'CREATE',
      actionCategory: 'USER_MGMT',
      entityType: 'user',
      entityId: user.id,
      entityName: user.email,
      afterData: { email: user.email, name: user.name, role: user.role },
      changesSummary: `Created user: ${user.email} with role ${user.role}`,
      ...metadata
    })

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User created successfully'
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
