import path from 'node:path'
import { defineConfig } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),

  // Required for prisma db push - type assertion for Prisma 7.x compatibility
  datasource: {
    url: process.env.DIRECT_URL!,
  },
} as Parameters<typeof defineConfig>[0])
