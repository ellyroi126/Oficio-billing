#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import * as readline from 'readline'
import 'dotenv/config'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve))
}

async function listUsers() {
  console.log('\n📋 Current Users:\n')
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' }
  })

  if (users.length === 0) {
    console.log('No users found.')
    return
  }

  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name || 'No name'} (${user.email})`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Created: ${user.createdAt.toLocaleDateString()}`)
    console.log('')
  })
}

async function createUser() {
  console.log('\n➕ Create New User\n')

  const email = await question('Email: ')
  if (!email || !email.includes('@')) {
    console.log('❌ Invalid email address')
    return
  }

  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log('❌ User with this email already exists')
    return
  }

  const name = await question('Name (optional): ')
  const password = await question('Password (min 8 chars): ')

  if (password.length < 8) {
    console.log('❌ Password must be at least 8 characters')
    return
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      name: name || null,
      password: hashedPassword,
    },
    select: {
      id: true,
      email: true,
      name: true,
    }
  })

  console.log('\n✅ User created successfully!')
  console.log(`   Email: ${user.email}`)
  console.log(`   Name: ${user.name || 'N/A'}`)
  console.log(`   ID: ${user.id}\n`)
}

async function deleteUser() {
  console.log('\n🗑️  Delete User\n')

  await listUsers()

  const email = await question('Enter email of user to delete: ')
  if (!email) {
    console.log('❌ Email required')
    return
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true }
  })

  if (!user) {
    console.log('❌ User not found')
    return
  }

  console.log(`\n⚠️  You are about to delete:`)
  console.log(`   ${user.name || 'No name'} (${user.email})`)
  const confirm = await question('\nType "DELETE" to confirm: ')

  if (confirm !== 'DELETE') {
    console.log('❌ Deletion cancelled')
    return
  }

  await prisma.user.delete({ where: { id: user.id } })
  console.log('✅ User deleted successfully\n')
}

async function resetPassword() {
  console.log('\n🔑 Reset User Password\n')

  const email = await question('Enter email: ')
  if (!email) {
    console.log('❌ Email required')
    return
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true }
  })

  if (!user) {
    console.log('❌ User not found')
    return
  }

  const password = await question('New password (min 8 chars): ')
  if (password.length < 8) {
    console.log('❌ Password must be at least 8 characters')
    return
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword }
  })

  console.log('✅ Password reset successfully\n')
}

async function main() {
  console.log('\n================================')
  console.log('  User Management CLI')
  console.log('================================\n')

  while (true) {
    console.log('Options:')
    console.log('  1. List users')
    console.log('  2. Create user')
    console.log('  3. Delete user')
    console.log('  4. Reset password')
    console.log('  5. Exit')
    console.log('')

    const choice = await question('Choose an option (1-5): ')

    switch (choice.trim()) {
      case '1':
        await listUsers()
        break
      case '2':
        await createUser()
        break
      case '3':
        await deleteUser()
        break
      case '4':
        await resetPassword()
        break
      case '5':
        console.log('\n👋 Goodbye!\n')
        rl.close()
        await prisma.$disconnect()
        process.exit(0)
      default:
        console.log('\n❌ Invalid option\n')
    }
  }
}

main().catch((error) => {
  console.error('Error:', error)
  rl.close()
  prisma.$disconnect()
  process.exit(1)
})
