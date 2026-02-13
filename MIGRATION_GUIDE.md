# R2 Migration Guide

This guide explains how to migrate your existing production files from local storage to Cloudflare R2.

## Prerequisites

1. R2 credentials configured in `.env`:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `R2_PUBLIC_URL`

2. All production files exist in `public/` directories:
   - `public/contracts/` - Contract DOCX and PDF files
   - `public/invoices/` - Invoice PDF files (may be in subdirectories)
   - `public/payments/evidence/` - Payment proof files (if any)
   - `public/payments/receipts/` - Payment receipt files (if any)

## What Gets Migrated

The migration script will:

1. **Contracts** - Upload DOCX and PDF files to R2 under `contracts/`
2. **Invoices** - Upload PDF files to R2 under `invoices/{CLIENT_CODE}/`
3. **Payment Evidence** - Upload proof files to R2 under `payments/evidence/`
4. **Payment Receipts** - Upload receipt PDFs to R2 under `payments/receipts/`

After migration, all database records will be updated with R2 public URLs instead of local paths.

## Running the Migration

### Step 1: Install tsx (if not already installed)

```bash
npm install -D tsx
```

### Step 2: Run the migration script

```bash
npm run migrate-to-r2
```

The script will:
- Read all file records from the database
- Upload files that have local paths (not starting with `http`)
- Update database records with new R2 URLs
- Show progress for each file
- Report success/failure for each migration

### Step 3: Verify the migration

After the migration completes:

1. Check your R2 bucket in Cloudflare dashboard to verify files were uploaded
2. Test downloading contracts, invoices, and receipts from the web interface
3. Test sending invoices via email (verifies R2 file retrieval)

### Step 4: Clean up local files (optional)

Once you've verified everything works with R2:

```bash
# Backup first (recommended)
tar -czf backup-public-files.tar.gz public/contracts public/invoices public/payments

# Then remove local files
rm -rf public/contracts/*
rm -rf public/invoices/*
rm -rf public/payments/*
```

**Keep the directories** (for backward compatibility with old code paths), but you can delete the files.

## Migration Script Details

### File Structure in R2

```
oficio-billing-files/
├── contracts/
│   ├── ClientName VO-SA 2025.docx
│   ├── ClientName VO-SA 2025.pdf
│   └── ...
├── invoices/
│   ├── SERVTRIX/
│   │   ├── OFC00000219.pdf
│   │   └── ...
│   ├── 98/
│   │   └── ...
│   └── ...
└── payments/
    ├── evidence/
    │   └── ...
    └── receipts/
        └── ...
```

### Database Updates

The migration updates these fields:
- `Contract.filePath` - Updated from `/contracts/file.docx` to `https://pub-....r2.dev/contracts/file.docx`
- `Contract.pdfPath` - Updated from `/contracts/file.pdf` to `https://pub-....r2.dev/contracts/file.pdf`
- `Invoice.filePath` - Updated from `/invoices/file.pdf` to `https://pub-....r2.dev/invoices/CLIENT/file.pdf`
- `Payment.evidencePath` - Updated to R2 URL
- `Payment.receiptPath` - Updated to R2 URL

## Troubleshooting

### Error: "R2 client not configured"

Ensure all R2 environment variables are set in `.env`:
```bash
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="oficio-billing-files"
R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"
```

### Error: "ENOENT: no such file or directory"

This means a file path exists in the database but the actual file is missing from `public/`. Options:
1. Remove the database record if it's test data
2. Regenerate the file from the application
3. Skip it - the script continues on errors

### Files not appearing in R2

1. Check Cloudflare R2 dashboard - ensure bucket is public
2. Verify `R2_PUBLIC_URL` matches your bucket's public domain
3. Check bucket CORS settings if accessing from browser

### Migration runs slowly

The script processes files one at a time to avoid rate limits. For large datasets:
- It may take several minutes for hundreds of files
- You'll see progress messages for each file
- Errors don't stop the migration - it continues with other files

## Deploying to Vercel

After successful migration:

1. **Add R2 environment variables to Vercel**:
   - Go to Vercel dashboard → Your project → Settings → Environment Variables
   - Add all R2 variables (same values from `.env`)

2. **Push changes to GitHub**:
   ```bash
   git push
   ```

3. **Deploy**:
   - Vercel will auto-deploy on push
   - Or manually deploy from Vercel dashboard

4. **Test in production**:
   - Download a contract
   - Download an invoice
   - Send an invoice via email
   - Generate a payment receipt

## Rolling Back (if needed)

If something goes wrong:

1. **Restore database from backup** (if you have database backups)

2. **Or manually update paths back to local**:
   ```sql
   -- Example: restore invoice paths
   UPDATE "Invoice"
   SET "filePath" = REPLACE("filePath", 'https://pub-xxxxx.r2.dev/', '/')
   WHERE "filePath" LIKE 'https://pub-xxxxx.r2.dev/%';
   ```

3. **Restore local files from backup**:
   ```bash
   tar -xzf backup-public-files.tar.gz
   ```

## Support

If you encounter issues:
1. Check the migration script output for specific errors
2. Verify R2 credentials in Cloudflare dashboard
3. Test file access directly via R2 public URL
4. Check Vercel deployment logs for runtime errors
