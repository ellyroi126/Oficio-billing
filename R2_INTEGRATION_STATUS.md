# R2 Integration Status

This document lists all features that have been migrated to use Cloudflare R2 storage.

## ✅ Fully Migrated Features

### 1. Contract Storage
**Files**: `src/lib/file-storage.ts`

- ✅ `saveContractFile()` - Uploads DOCX/PDF to R2 under `contracts/`
- ✅ `getContractFile()` - Downloads from R2 (supports both old local paths and R2 URLs)
- ✅ `deleteContractFile()` - Deletes from R2
- ✅ `deleteContractFiles()` - Deletes multiple contract files from R2

**Routes using this**:
- `POST /api/contracts` - Create contract (uploads to R2)
- `GET /api/contracts/[id]/download` - Download contract (retrieves from R2)
- `DELETE /api/contracts/[id]` - Delete contract (removes from R2)

### 2. Invoice Storage
**Files**: `src/lib/invoice-storage.ts`

- ✅ `saveInvoiceFile()` - Uploads PDF to R2 under `invoices/{CLIENT_CODE}/`
- ✅ `getInvoiceFile()` - Downloads from R2 (supports both old local paths and R2 URLs)
- ✅ `deleteInvoiceByPath()` - Deletes from R2

**Routes using this**:
- `POST /api/invoices` - Create invoice (uploads to R2)
- `GET /api/invoices/[id]/download` - Download invoice (retrieves from R2)
- `POST /api/invoices/send` - Send invoice via email (retrieves from R2)
- `DELETE /api/invoices/[id]` - Delete invoice (removes from R2)

### 3. Payment Evidence Storage
**Files**: `src/lib/payment-storage.ts`

- ✅ `saveEvidenceFile()` - Uploads proof of payment to R2 under `payments/evidence/`
- ✅ `deleteEvidenceFile()` - Deletes from R2

**Routes using this**:
- `POST /api/payments` - Record payment with evidence (uploads to R2)
- `DELETE /api/payments/[id]` - Delete payment (removes evidence from R2)

### 4. Payment Receipt Storage
**Files**: `src/lib/receipt-storage.ts`

- ✅ `saveReceiptFile()` - Uploads receipt PDF to R2 under `payments/receipts/`
- ✅ `getReceiptFile()` - Downloads from R2 (supports both old local paths and R2 URLs)
- ✅ `deleteReceiptFile()` - Deletes from R2

**Routes using this**:
- `GET /api/payments/[id]/receipt` - Generate/download receipt (uploads to R2, retrieves from R2)

## 🔧 Core R2 Utilities

**File**: `src/lib/r2-storage.ts`

### Functions:
- `isR2Configured()` - Checks if R2 credentials are set
- `uploadToR2(key, buffer, contentType)` - Upload file to R2, returns public URL
- `getFromR2(key)` - Download file from R2, returns Buffer
- `deleteFromR2(key)` - Delete file from R2
- `getKeyFromUrl(url)` - Extract R2 key from URL or local path

### Environment Variables Required:
```env
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=oficio-billing-files
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

## 📄 PDF Generation (Read-Only)

These files only READ the logo from local filesystem, they don't write files:

- `src/lib/contract-pdf.ts` - Reads logo to embed in contract PDFs
- `src/lib/invoice-pdf.ts` - Reads logo to embed in invoice PDFs
- `src/lib/receipt-pdf.ts` - Reads logo to embed in receipt PDFs
- `src/lib/contract-template.ts` - Generates DOCX templates (in-memory)

**Status**: ✅ No changes needed - these work in serverless environments

## 🔄 Migration Script

**File**: `scripts/migrate-to-r2.ts`

Migrates existing production files from `public/` directories to R2:
- Uploads all local files to R2
- Updates database records with R2 URLs
- Handles contracts, invoices, payment evidence, and receipts

**Usage**: `npm run migrate-to-r2`

## 📋 File Structure in R2

```
oficio-billing-files/
├── contracts/
│   ├── {ClientName} VO-SA {Year}.docx
│   └── {ClientName} VO-SA {Year}.pdf
│
├── invoices/
│   └── {CLIENT_CODE}/
│       └── {InvoiceNumber}.pdf
│
└── payments/
    ├── evidence/
    │   └── {paymentId}-{timestamp}.{ext}
    └── receipts/
        └── RCP{timestamp}.pdf
```

## 🚀 Deployment Checklist

Before deploying to Vercel:

- [x] All storage modules migrated to R2
- [x] Migration script created
- [x] Download routes updated to support both local and R2 paths
- [x] Email attachment system uses R2
- [ ] Run migration script on production database
- [ ] Add R2 environment variables to Vercel
- [ ] Test all file operations in production

## 🧪 Testing Checklist

After deployment, verify:

- [ ] Create new contract → File in R2
- [ ] Download contract → Works from R2
- [ ] Create new invoice → File in R2
- [ ] Download invoice → Works from R2
- [ ] Send invoice via email → Attachment from R2
- [ ] Upload payment evidence → File in R2
- [ ] Generate payment receipt → File in R2
- [ ] Download payment receipt → Works from R2
- [ ] Delete contract → File removed from R2
- [ ] Delete invoice → File removed from R2

## 🔐 Security Considerations

1. **R2 Bucket Access**:
   - Bucket is configured for public read access
   - Files are served via R2 public URL
   - No authentication required to access files (same as before with public/)

2. **API Keys**:
   - R2 credentials stored in environment variables
   - Never committed to git
   - Required on both local development and Vercel production

3. **File Naming**:
   - Predictable filenames (e.g., `ClientName VO-SA 2025.pdf`)
   - Anyone with the URL can access the file
   - Consider adding random tokens if confidentiality is required

## 📈 Performance & Costs

**Cloudflare R2 Pricing (as of 2024)**:
- Storage: $0.015/GB/month (Free tier: 10GB)
- Class A operations (writes): $4.50 per million (Free tier: 1M/month)
- Class B operations (reads): $0.36 per million (Free tier: 10M/month)
- Bandwidth: FREE (no egress charges)

**Expected Usage**:
- Typical contract: ~30KB DOCX + ~35KB PDF = ~65KB
- Typical invoice: ~22KB PDF
- 1000 contracts + 1000 invoices = ~87MB storage
- Well within free tier limits

**Performance**:
- R2 serves files from Cloudflare's global CDN
- Faster than Vercel serverless filesystem
- Lower latency for international users
- No cold start delays

## 🐛 Common Issues & Solutions

### Issue: "Export getInvoiceFile doesn't exist"
**Solution**: Clear Next.js build cache
```bash
rm -rf .next
npm run build
```

### Issue: "NoSuchKey: The specified key does not exist"
**Solution**: Old database paths need migration
```bash
npm run migrate-to-r2
```

### Issue: "R2 client not configured"
**Solution**: Add R2 environment variables to `.env` and Vercel

### Issue: Files upload but downloads fail
**Solution**: Verify `R2_PUBLIC_URL` matches your bucket's public domain

## 📚 Related Documentation

- [R2_SETUP.md](./R2_SETUP.md) - Initial R2 setup guide
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Detailed migration instructions
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
