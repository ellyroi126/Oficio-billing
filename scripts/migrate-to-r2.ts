import { PrismaClient } from '@prisma/client'
import { uploadToR2 } from '../src/lib/r2-storage'
import * as fs from 'fs/promises'
import * as path from 'path'

const prisma = new PrismaClient()

async function migrateFilesToR2() {
  console.log('Starting R2 migration...\n')

  try {
    // 1. Migrate contract files
    console.log('=== Migrating Contracts ===')
    const contracts = await prisma.contract.findMany({
      where: {
        OR: [
          { filePath: { not: null } },
          { pdfPath: { not: null } }
        ]
      }
    })

    for (const contract of contracts) {
      console.log(`\nContract ${contract.contractNumber}:`)

      // Migrate DOCX
      if (contract.filePath && !contract.filePath.startsWith('http')) {
        try {
          const localPath = path.join(process.cwd(), 'public', contract.filePath)
          const buffer = await fs.readFile(localPath)
          const filename = path.basename(contract.filePath)
          const key = `contracts/${filename}`

          const publicUrl = await uploadToR2(
            key,
            buffer,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          )

          await prisma.contract.update({
            where: { id: contract.id },
            data: { filePath: publicUrl }
          })

          console.log(`  ✓ Migrated DOCX: ${filename}`)
        } catch (error) {
          console.log(`  ✗ Failed to migrate DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Migrate PDF
      if (contract.pdfPath && !contract.pdfPath.startsWith('http')) {
        try {
          const localPath = path.join(process.cwd(), 'public', contract.pdfPath)
          const buffer = await fs.readFile(localPath)
          const filename = path.basename(contract.pdfPath)
          const key = `contracts/${filename}`

          const publicUrl = await uploadToR2(key, buffer, 'application/pdf')

          await prisma.contract.update({
            where: { id: contract.id },
            data: { pdfPath: publicUrl }
          })

          console.log(`  ✓ Migrated PDF: ${filename}`)
        } catch (error) {
          console.log(`  ✗ Failed to migrate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    // 2. Migrate invoice files
    console.log('\n\n=== Migrating Invoices ===')
    const invoices = await prisma.invoice.findMany({
      where: {
        filePath: { not: null }
      },
      include: {
        client: {
          select: { clientName: true }
        }
      }
    })

    for (const invoice of invoices) {
      if (!invoice.filePath || invoice.filePath.startsWith('http')) continue

      console.log(`\nInvoice ${invoice.invoiceNumber}:`)

      try {
        // Determine the local file path
        let localPath: string

        // Check if it's in a subdirectory structure (invoices/CLIENT/file.pdf)
        if (invoice.filePath.includes('/')) {
          localPath = path.join(process.cwd(), 'public', invoice.filePath)
        } else {
          // Old flat structure (invoices/file.pdf)
          localPath = path.join(process.cwd(), 'public', 'invoices', invoice.filePath)
        }

        const buffer = await fs.readFile(localPath)
        const filename = path.basename(invoice.filePath)

        // Generate client code for R2 structure
        const clientCode = invoice.client.clientName.toUpperCase().split(/\s+/)[0].substring(0, 10).replace(/[^A-Z0-9]/g, '')
        const key = `invoices/${clientCode}/${filename}`

        const publicUrl = await uploadToR2(key, buffer, 'application/pdf')

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { filePath: publicUrl }
        })

        console.log(`  ✓ Migrated: ${filename}`)
      } catch (error) {
        console.log(`  ✗ Failed to migrate: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // 3. Migrate payment evidence files
    console.log('\n\n=== Migrating Payment Evidence ===')
    const payments = await prisma.payment.findMany({
      where: {
        evidencePath: { not: null }
      }
    })

    for (const payment of payments) {
      if (!payment.evidencePath || payment.evidencePath.startsWith('http')) continue

      console.log(`\nPayment ${payment.id}:`)

      try {
        const localPath = path.join(process.cwd(), 'public', payment.evidencePath)
        const buffer = await fs.readFile(localPath)
        const filename = path.basename(payment.evidencePath)
        const key = `payments/evidence/${filename}`

        // Determine content type
        let contentType = 'application/octet-stream'
        if (filename.endsWith('.pdf')) contentType = 'application/pdf'
        else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg'
        else if (filename.endsWith('.png')) contentType = 'image/png'
        else if (filename.endsWith('.gif')) contentType = 'image/gif'

        const publicUrl = await uploadToR2(key, buffer, contentType)

        await prisma.payment.update({
          where: { id: payment.id },
          data: { evidencePath: publicUrl }
        })

        console.log(`  ✓ Migrated: ${filename}`)
      } catch (error) {
        console.log(`  ✗ Failed to migrate: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // 4. Migrate payment receipt files
    console.log('\n\n=== Migrating Payment Receipts ===')
    const receipts = await prisma.payment.findMany({
      where: {
        receiptPath: { not: null }
      }
    })

    for (const receipt of receipts) {
      if (!receipt.receiptPath || receipt.receiptPath.startsWith('http')) continue

      console.log(`\nReceipt ${receipt.id}:`)

      try {
        const localPath = path.join(process.cwd(), 'public', receipt.receiptPath)
        const buffer = await fs.readFile(localPath)
        const filename = path.basename(receipt.receiptPath)
        const key = `payments/receipts/${filename}`

        const publicUrl = await uploadToR2(key, buffer, 'application/pdf')

        await prisma.payment.update({
          where: { id: receipt.id },
          data: { receiptPath: publicUrl }
        })

        console.log(`  ✓ Migrated: ${filename}`)
      } catch (error) {
        console.log(`  ✗ Failed to migrate: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log('\n\n=== Migration Complete ===')
    console.log('\nNext steps:')
    console.log('1. Verify all files are accessible in R2')
    console.log('2. Test downloads and email attachments')
    console.log('3. Once verified, you can safely delete local files from public/')
    console.log('4. Deploy to Vercel with R2 environment variables')

  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateFilesToR2()
