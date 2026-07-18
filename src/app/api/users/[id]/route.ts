import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware/roleCheck'
import { createAuditLog, getRequestMetadata } from '@/lib/auditLog'

/**
 * PATCH /api/users/[id]
 * Update user (Admin only)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const { name, role, isActive } = body

    // Get current user data
    const oldUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!oldUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Validate role if provided
    if (role && !['ADMIN', 'EMPLOYEE'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN or EMPLOYEE' },
        { status: 400 }
      )
    }

    // Prevent an admin from locking themselves out by self-demotion/deactivation.
    const isSelf = id === auth.user.id
    if (isSelf && ((role !== undefined && role !== 'ADMIN') || isActive === false)) {
      return NextResponse.json(
        { error: 'You cannot demote or deactivate your own admin account.' },
        { status: 400 }
      )
    }

    // Prevent removing the last remaining active admin (would leave the system with
    // no one able to access admin-gated routes).
    const isRemovingAdmin =
      oldUser.role === 'ADMIN' &&
      ((role !== undefined && role !== 'ADMIN') || isActive === false)
    if (isRemovingAdmin) {
      const otherActiveAdmins = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true, id: { not: id } },
      })
      if (otherActiveAdmins === 0) {
        return NextResponse.json(
          { error: 'Cannot demote or deactivate the last active admin.' },
          { status: 400 }
        )
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    // Create audit log
    const metadata = getRequestMetadata(req)
    const changes: string[] = []
    if (name !== undefined && name !== oldUser.name) changes.push(`name: "${oldUser.name}" → "${name}"`)
    if (role !== undefined && role !== oldUser.role) changes.push(`role: ${oldUser.role} → ${role}`)
    if (isActive !== undefined && isActive !== oldUser.isActive) changes.push(`isActive: ${oldUser.isActive} → ${isActive}`)

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.name || auth.user.email,
      userEmail: auth.user.email,
      userRole: auth.user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'UPDATE',
      actionCategory: 'USER_MGMT',
      entityType: 'user',
      entityId: user.id,
      entityName: user.email,
      beforeData: { name: oldUser.name, role: oldUser.role, isActive: oldUser.isActive },
      afterData: { name: user.name, role: user.role, isActive: user.isActive },
      changesSummary: `Updated user ${user.email}: ${changes.join(', ')}`,
      ...metadata
    })

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}
