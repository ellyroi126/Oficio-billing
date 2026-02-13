#!/usr/bin/env node

/**
 * Delete User Script
 *
 * Usage: node scripts/delete-user.js email@example.com
 *
 * This script deletes a user account by email.
 * Only administrators should have access to run this script.
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

// Create Prisma client with PG adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function deleteUser() {
  console.log('\n=== Oficio Billing - Delete User ===\n')

  try {
    const email = process.argv[2]

    if (!email) {
      console.error('Usage: node scripts/delete-user.js email@example.com')
      process.exit(1)
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.error(`\n❌ Error: User with email "${email}" not found`)
      process.exit(1)
    }

    console.log(`Found user:`)
    console.log(`- ID: ${user.id}`)
    console.log(`- Name: ${user.name}`)
    console.log(`- Email: ${user.email}`)
    console.log(`- Created: ${user.createdAt.toLocaleString()}`)

    // Delete user
    await prisma.user.delete({
      where: { email }
    })

    console.log(`\n✅ User "${email}" deleted successfully!\n`)

  } catch (error) {
    console.error('\n❌ Error deleting user:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

deleteUser()
