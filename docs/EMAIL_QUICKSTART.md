# Email Service Quick Start Guide

Your Oficio Billing app supports two email providers: **Gmail SMTP** and **Resend**. This guide will help you get started quickly.

## Current Status

✅ **Email code is already integrated** in your application
✅ **Both Gmail and Resend support is ready**
⚠️ **Configuration needed** to start sending emails

## Quick Decision Guide

### Use Gmail SMTP if:
- ✅ You want to start **immediately** (5-minute setup)
- ✅ You send **less than 500 emails per day**
- ✅ You're okay with emails showing "via gmail.com" in headers
- ✅ You already have a Gmail account

👉 **Follow**: [Gmail Setup Guide](./EMAIL_SETUP_GMAIL.md)

### Use Resend if:
- ✅ You want **professional emails** from your domain (e.g., invoices@oficiopl.com)
- ✅ You need **better deliverability**
- ✅ You want **email analytics** (opens, clicks, bounces)
- ✅ You can wait 30 minutes for DNS setup
- ✅ You own the domain `oficiopl.com`

👉 **Follow**: [Resend Setup Guide](./EMAIL_SETUP_RESEND.md)

### Use Both (Recommended):
- ✅ **Best reliability** - automatic fallback
- ✅ **Flexibility** - switch anytime
- ✅ **Future-proof** - start with Gmail, migrate to Resend later

👉 **Follow both guides**, set `EMAIL_PROVIDER="auto"`

## 5-Minute Gmail Setup

Perfect for getting started today:

1. **Enable 2FA** on your Google account (if not already enabled)
2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Create password for "Oficio Billing"
   - Copy the 16-character password
3. **Update .env file**:
   ```bash
   EMAIL_PROVIDER="gmail"
   GMAIL_USER="info@oficiopl.com"
   GMAIL_APP_PASSWORD="your16charpassword"  # No spaces
   ```
4. **Restart server**: `npm run dev`
5. **Test**: Send an invoice from the Invoices page

✅ **Done!** You're now sending emails.

## 30-Minute Resend Setup

For professional emails with your domain:

1. **Sign up** at https://resend.com
2. **Add domain**: `oficiopl.com`
3. **Configure DNS** records provided by Resend
4. **Wait** for DNS verification (5 mins - 48 hours, usually < 1 hour)
5. **Get API Key** from Resend dashboard
6. **Update .env file**:
   ```bash
   EMAIL_PROVIDER="resend"
   RESEND_API_KEY="re_your_actual_key"
   RESEND_DOMAIN="oficiopl.com"
   ```
7. **Restart server**: `npm run dev`
8. **Test**: Send an invoice from the Invoices page

✅ **Done!** You're now sending professional emails.

## Configuration Options

### Option 1: Gmail Only
```bash
EMAIL_PROVIDER="gmail"
GMAIL_USER="info@oficiopl.com"
GMAIL_APP_PASSWORD="your_password"
```

### Option 2: Resend Only
```bash
EMAIL_PROVIDER="resend"
RESEND_API_KEY="re_your_key"
RESEND_DOMAIN="oficiopl.com"
```

### Option 3: Auto (Smart Fallback) ⭐ Recommended
```bash
EMAIL_PROVIDER="auto"

# Configure both
GMAIL_USER="info@oficiopl.com"
GMAIL_APP_PASSWORD="your_password"

RESEND_API_KEY="re_your_key"
RESEND_DOMAIN="oficiopl.com"
```

**How Auto Mode Works:**
1. Tries Resend first (if configured)
2. Falls back to Gmail if Resend fails
3. Logs which provider was used
4. Provides maximum reliability

## Testing Your Setup

After configuration:

1. **Start your server**:
   ```bash
   npm run dev
   ```

2. **Send a test invoice**:
   - Login to your app
   - Go to Invoices page
   - Select a pending invoice
   - Click "Send Invoice"
   - Enter recipient email (use your own email for testing)

3. **Check the result**:
   - ✅ Success message appears
   - 📧 Email arrives in recipient's inbox
   - 📝 Console logs show: "Email sent successfully via [provider]"

## Current Email Features

Your app currently sends emails for:

- ✅ **Invoice delivery** with PDF attachment
- ✅ Professional HTML email template
- ✅ Payment instructions included
- ✅ Billing period and due date highlighted

**Email Preview:**

```
Subject: Invoice #INV-001 from Oficio Property Leasing

[Professional header with company branding]

Dear [Client Name],

Please find attached Invoice #INV-001 for your billing period.

Invoice Details:
- Invoice Number: INV-001
- Billing Period: January 1, 2024 - January 31, 2024
- Amount Due: ₱10,000.00
- Due Date: February 15, 2024

Payment Instructions:
[Bank details for BDO and Security Bank]

[PDF attachment: Invoice-INV-001.pdf]
```

## Future Email Features

You can easily add more email types:

- 📧 Payment receipt confirmation
- 📧 Contract renewal reminders
- 📧 Overdue invoice notifications
- 📧 Welcome emails for new users
- 📧 Approval request notifications

See your codebase at `src/lib/email.ts` and `src/lib/email-gmail.ts` for implementation examples.

## Troubleshooting

### No emails being sent?

1. **Check environment variables**:
   ```bash
   # In your terminal
   echo $GMAIL_APP_PASSWORD
   echo $EMAIL_PROVIDER
   ```

2. **Check console logs** for error messages

3. **Verify credentials**:
   - Gmail: App password is correct (no spaces)
   - Resend: API key starts with `re_`

### Emails going to spam?

- **Gmail**: Ask recipients to mark as "Not Spam"
- **Resend**: Wait 24-48 hours for domain reputation to build
- **Both**: Ensure DNS records are configured (SPF, DKIM)

### Rate limit errors?

- **Gmail**: 500 emails/day limit
- **Resend**: 100 emails/day on free tier
- **Solution**: Upgrade plan or use `EMAIL_PROVIDER="auto"` for fallback

## Getting Help

- **Gmail Issues**: [Gmail Setup Guide](./EMAIL_SETUP_GMAIL.md)
- **Resend Issues**: [Resend Setup Guide](./EMAIL_SETUP_RESEND.md)
- **Code Issues**: Check `src/lib/email.ts` and console logs

## What's Next?

1. ✅ Choose your email provider
2. ✅ Follow the setup guide
3. ✅ Test with sample invoices
4. ✅ Monitor delivery success
5. 🚀 Start sending real invoices!

---

**Quick Links:**
- [Gmail Setup Guide](./EMAIL_SETUP_GMAIL.md) - 5 minutes
- [Resend Setup Guide](./EMAIL_SETUP_RESEND.md) - 30 minutes
- [Compare Gmail vs Resend](./EMAIL_SETUP_RESEND.md#comparison-with-gmail)
