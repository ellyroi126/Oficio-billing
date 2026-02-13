#!/usr/bin/env node

/**
 * Create User Script (Non-Interactive)
 *
 * Usage: node scripts/create-user-simple.js "Full Name" "email@example.com" "password"
 *
 * This script creates a new user account for the Oficio Billing system.
 * Only administrators should have access to run this script.
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

// Create Prisma client with PG adapter (same as the app)
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function createUser() {
  console.log('\n=== Oficio Billing - Create User ===\n')

  try {
    // Get arguments
    const args = process.argv.slice(2)

    if (args.length !== 3) {
      console.error('Usage: node scripts/create-user-simple.js "Full Name" "email@example.com" "password"')
      console.error('\nExample: node scripts/create-user-simple.js "John Doe" "john@oficiopl.com" "mypassword123"')
      process.exit(1)
    }

    const [name, email, password] = args

    // Validation
    if (!name || !email || !password) {
      console.error('\n❌ Error: All fields are required')
      process.exit(1)
    }

    if (password.length < 8) {
      console.error('\n❌ Error: Password must be at least 8 characters')
      process.exit(1)
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.error(`\n❌ Error: User with email "${email}" already exists`)
      process.exit(1)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    })

    console.log('✅ User created successfully!')
    console.log(`\nUser Details:`)
    console.log(`- ID: ${user.id}`)
    console.log(`- Name: ${user.name}`)
    console.log(`- Email: ${user.email}`)
    console.log(`- Created: ${user.createdAt.toLocaleString()}`)
    console.log('\nUser can now log in at /login\n')

  } catch (error) {
    console.error('\n❌ Error creating user:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

createUser()
