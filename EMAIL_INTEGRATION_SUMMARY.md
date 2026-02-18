# Email Integration Summary

## ✅ What's Been Implemented

Your Oficio Billing app now has **dual email provider support** with automatic fallback:

### Supported Providers
1. **Gmail SMTP** - Quick start, works immediately
2. **Resend** - Professional emails from your domain
3. **Auto Mode** - Smart fallback (Resend → Gmail)

### Files Created/Modified

**New Files:**
- `src/lib/email-gmail.ts` - Gmail SMTP implementation using Nodemailer
- `docs/EMAIL_QUICKSTART.md` - Quick start guide (start here!)
- `docs/EMAIL_SETUP_GMAIL.md` - Detailed Gmail setup instructions
- `docs/EMAIL_SETUP_RESEND.md` - Detailed Resend setup instructions

**Modified Files:**
- `src/lib/email.ts` - Now supports both providers with smart routing
- `.env.example` - Updated with email configuration examples
- `.env` - Set to use Gmail by default (needs App Password)

## 🚀 How to Start Using Email (5 Minutes)

### Step 1: Get Gmail App Password

1. Go to https://myaccount.google.com/apppasswords
2. Create a password for "Oficio Billing"
3. Copy the 16-character password (remove spaces)

### Step 2: Update .env

Open your `.env` file and update:

```bash
# Email Service Configuration
EMAIL_PROVIDER="gmail"  # Already set

# Gmail SMTP
GMAIL_USER="info@oficiopl.com"  # Already set
GMAIL_APP_PASSWORD="your16charpassword"  # ADD THIS
```

### Step 3: Restart & Test

```bash
npm run dev
```

Then test:
1. Go to Invoices page
2. Select a pending invoice
3. Click "Send Invoice"
4. Check recipient's inbox

## 📧 Current Email Features

Your app sends professional HTML emails with:
- ✅ Invoice PDF attachment
- ✅ Company branding header
- ✅ Invoice details (number, period, amount, due date)
- ✅ Payment instructions (BDO and Security Bank details)
- ✅ Professional formatting

## ⚙️ Configuration Options

### Option 1: Gmail Only (Current Default)
```bash
EMAIL_PROVIDER="gmail"
GMAIL_USER="info@oficiopl.com"
GMAIL_APP_PASSWORD="your_app_password"
```
**Limits**: 500 emails/day

### Option 2: Resend Only
```bash
EMAIL_PROVIDER="resend"
RESEND_API_KEY="re_your_key"
RESEND_DOMAIN="oficiopl.com"
```
**Requires**: Domain verification (30 min setup)
**Limits**: 100 emails/day (free), upgrade available

### Option 3: Auto (Recommended)
```bash
EMAIL_PROVIDER="auto"

# Both configured - automatic fallback
GMAIL_USER="info@oficiopl.com"
GMAIL_APP_PASSWORD="your_password"
RESEND_API_KEY="re_your_key"
RESEND_DOMAIN="oficiopl.com"
```
**Behavior**: Tries Resend first, falls back to Gmail automatically

## 📊 Comparison

| Feature | Gmail SMTP | Resend |
|---------|-----------|---------|
| **Setup Time** | 5 minutes | 30 minutes |
| **Daily Limit (Free)** | 500 emails | 100 emails |
| **From Address** | info@oficiopl.com | invoices@oficiopl.com |
| **Professional Look** | Shows "via gmail.com" | Clean, professional |
| **Deliverability** | Good | Excellent |
| **Analytics** | ❌ No | ✅ Yes |
| **Domain Required** | ❌ No | ✅ Yes |

## 🎯 Recommendations

### For Immediate Use (Today)
**Use Gmail** - Just add the App Password and you're done!

### For Production (Within a Week)
**Set up Resend** with your domain for:
- Better deliverability
- Professional appearance
- Email analytics
- Higher sending capacity (with paid plan)

### For Best Reliability
**Use Auto Mode** - Configure both providers so you have automatic fallback

## 📖 Next Steps

1. **Right now**: Follow the 5-minute Gmail setup above
2. **This week**: Read [Resend Setup Guide](./docs/EMAIL_SETUP_RESEND.md) to add domain
3. **After testing**: Switch to `EMAIL_PROVIDER="auto"` for both

## 🔧 How the Code Works

### Smart Provider Selection

The `sendInvoiceEmail()` function in `src/lib/email.ts` automatically:

1. Checks `EMAIL_PROVIDER` environment variable
2. Routes to appropriate provider:
   - `"gmail"` → Always use Gmail
   - `"resend"` → Always use Resend
   - `"auto"` → Try Resend first, fallback to Gmail
3. Returns success/error with provider used

### Example Usage (Already Implemented)

```typescript
// In your API routes (already working)
const emailResult = await sendInvoiceEmail({
  to: 'client@example.com',
  clientName: 'ABC Company',
  invoiceNumber: 'INV-001',
  dueDate: new Date(),
  totalAmount: 10000,
  billingPeriodStart: new Date('2024-01-01'),
  billingPeriodEnd: new Date('2024-01-31'),
  pdfBuffer: invoicePdfBuffer,
  providerName: 'Oficio Property Leasing'
})

// Returns: { success: true, messageId: '...', provider: 'gmail' }
```

### Error Handling

- Gracefully handles provider failures
- Automatic fallback in auto mode
- Detailed error messages in logs
- Email failures don't block invoice status updates

## 🐛 Troubleshooting

### No emails sent?
1. Check `.env` file has `GMAIL_APP_PASSWORD`
2. Restart server after changing `.env`
3. Check console logs for errors

### Emails in spam?
- Gmail: Ask recipients to mark as "Not Spam"
- Resend: Wait 24-48 hours for reputation building

### "Invalid credentials" error?
- Double-check App Password has no spaces
- Ensure 2FA is enabled on Google account
- Regenerate App Password if needed

## 📚 Documentation

All documentation is in the `docs/` folder:

- **Start here**: [EMAIL_QUICKSTART.md](./docs/EMAIL_QUICKSTART.md)
- **Gmail details**: [EMAIL_SETUP_GMAIL.md](./docs/EMAIL_SETUP_GMAIL.md)
- **Resend details**: [EMAIL_SETUP_RESEND.md](./docs/EMAIL_SETUP_RESEND.md)

## ✨ Future Enhancements

You can easily add more email types by following the pattern in `email.ts` and `email-gmail.ts`:

- Payment receipt emails
- Contract renewal reminders
- Overdue invoice notifications
- User account emails
- Approval notifications

All email templates follow the same professional HTML format with your branding.

## 🎉 You're All Set!

Your email integration is complete. Just add your Gmail App Password and start sending invoices!

**Questions?** Check the documentation in `docs/` folder.
