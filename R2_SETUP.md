# Cloudflare R2 Setup Guide

## Prerequisites
- Cloudflare account (free tier available)
- R2 bucket created

## Step 1: Get Your Cloudflare Account ID

1. Log in to Cloudflare Dashboard
2. Look at the URL: `https://dash.cloudflare.com/{ACCOUNT_ID}/r2/overview`
3. Copy the `ACCOUNT_ID` from the URL

## Step 2: Create R2 API Tokens

1. In Cloudflare Dashboard, go to **R2** → **Manage R2 API Tokens**
2. Click **Create API Token**
3. Give it a name (e.g., "Oficio Billing App")
4. Permissions: **Object Read & Write**
5. TTL: **Forever** (or set expiration as needed)
6. Click **Create API Token**
7. Copy the **Access Key ID** and **Secret Access Key** (you won't see the secret again!)

## Step 3: Configure Your R2 Bucket

### Option A: Public Bucket (Recommended for simplicity)

1. Go to your R2 bucket settings
2. Click **Settings** → **Public Access**
3. Enable **Public Access**
4. Set up a custom domain or use the R2.dev subdomain
5. Your public URL will be: `https://pub-xxxxx.r2.dev` or `https://files.yourdomain.com`

### Option B: Private Bucket with Signed URLs (More secure)

If you want private files, you'll need to implement signed URL generation (not included in current setup).

## Step 4: Add Environment Variables

Add these to your **Vercel Environment Variables** (Settings → Environment Variables):

```bash
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=oficio-billing
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev  # or your custom domain
```

**Important:**
- `R2_PUBLIC_URL` should NOT have a trailing slash
- If using custom domain, make sure it's configured in Cloudflare R2 settings

## Step 5: Test Locally

1. Update your local `.env` file with the same variables
2. Run `npm run dev`
3. Try creating an invoice or uploading payment evidence
4. Check your R2 bucket - files should appear in folders:
   - `invoices/{CLIENT_CODE}/`
   - `contracts/`
   - `payments/evidence/`

## Step 6: Deploy to Vercel

1. Push your code: `git push origin main`
2. Vercel will auto-deploy
3. Test file uploads in production

## Troubleshooting

### Error: "R2 client not configured"
- Check that all environment variables are set in Vercel
- Redeploy after adding environment variables

### Error: "Access Denied"
- Verify API token has **Object Read & Write** permissions
- Check that bucket name matches `R2_BUCKET_NAME`

### Files upload but can't be accessed
- Ensure bucket has Public Access enabled
- Verify `R2_PUBLIC_URL` is correct
- Check Cloudflare R2 bucket CORS settings if needed

## Cost Estimate

**Cloudflare R2 Free Tier:**
- 10 GB storage (free)
- 1 million Class A operations/month (free)
- 10 million Class B operations/month (free)
- No egress fees

For a billing app with ~100 invoices/month, you'll likely stay within free tier for a long time.

## File Structure in R2

```
oficio-billing/
├── invoices/
│   ├── SERVTRIX/
│   │   ├── OFC00000219.pdf
│   │   ├── OFC00000220.pdf
│   │   └── ...
│   ├── TESTCLIENT/
│   │   └── OFC00000221.pdf
│   └── ...
├── contracts/
│   ├── ServtrixSolutions VO-SA 2025.docx
│   ├── ServtrixSolutions VO-SA 2025.pdf
│   └── ...
└── payments/
    └── evidence/
        ├── payment-123-1234567890.jpg
        ├── payment-456-1234567890.pdf
        └── ...
```

## Security Notes

- **Never commit** your R2 credentials to Git
- Store them only in `.env` (local) and Vercel environment variables (production)
- Consider rotating API tokens periodically
- For sensitive documents, consider using private buckets with signed URLs
