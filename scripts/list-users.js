#!/usr/bin/env node

/**
 * List Users Script
 *
 * Usage: node scripts/list-users.js
 *
 * This script lists all user accounts in the system.
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

// Create Prisma client with PG adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function listUsers() {
  console.log('\n=== Oficio Billing - User List ===\n')

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    })

    if (users.length === 0) {
      console.log('No users found.')
      return
    }

    console.log(`Total users: ${users.length}\n`)

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'No name'}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Created: ${user.createdAt.toLocaleString()}`)
      console.log('')
    })

  } catch (error) {
    console.error('\n❌ Error listing users:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

listUsers()
