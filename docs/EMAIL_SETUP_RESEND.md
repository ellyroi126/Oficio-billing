# Resend Email Service Setup Guide

This guide will help you set up Resend for sending invoice emails with your own domain (`oficiopl.com`).

## Why Use Resend?

- ✅ Better email deliverability than Gmail
- ✅ Professional emails from your own domain (e.g., `invoices@oficiopl.com`)
- ✅ Higher sending limits (100 emails/day free, 50k+ with paid plans)
- ✅ Built for transactional emails
- ✅ Simple API, better than traditional SMTP
- ✅ Email analytics dashboard

## Prerequisites

- Own a domain (e.g., `oficiopl.com`)
- Access to your domain's DNS settings

## Setup Steps

### 1. Create Resend Account

1. Go to https://resend.com
2. Sign up with your email
3. Verify your email address

### 2. Add Your Domain

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain: `oficiopl.com`
4. Click **Add**

### 3. Configure DNS Records

Resend will provide you with DNS records to add. You'll need to add these to your domain registrar (e.g., GoDaddy, Namecheap, Cloudflare):

**Example DNS Records:**

```
Type: TXT
Name: resend._domainkey.oficiopl.com
Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ... (long string provided by Resend)

Type: TXT
Name: oficiopl.com
Value: v=spf1 include:amazonses.com ~all
```

**How to Add DNS Records:**

- **GoDaddy**: Domain Settings → Manage DNS → Add Record
- **Namecheap**: Domain List → Manage → Advanced DNS → Add New Record
- **Cloudflare**: Select Domain → DNS → Add Record

**Note**: DNS propagation can take 5 minutes to 48 hours (usually within 1 hour)

### 4. Verify Domain

1. After adding DNS records, return to Resend dashboard
2. Click **Verify** next to your domain
3. Wait for verification (green checkmark)
4. If it fails, double-check DNS records and wait a bit longer

### 5. Get API Key

1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it: `Oficio Billing Production`
4. Copy the API key (starts with `re_`)
5. **Save it immediately** - you won't see it again

### 6. Update Your .env File

Add the following to your `.env` file:

```bash
# Email Service Configuration
EMAIL_PROVIDER="resend"  # or "auto" to use Resend with Gmail fallback

# Resend
RESEND_API_KEY="re_your_actual_api_key_here"
RESEND_DOMAIN="oficiopl.com"  # Your verified domain
```

### 7. Test the Configuration

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. In your application:
   - Go to the Invoices page
   - Select a pending invoice
   - Click "Send Invoice"
   - Check the recipient's email inbox

3. Check Resend dashboard:
   - Go to **Emails** to see sent emails
   - View delivery status, opens, clicks

## Email Address Options

Once your domain is verified, you can send from any address at your domain:

- `invoices@oficiopl.com` (recommended for invoices)
- `billing@oficiopl.com`
- `no-reply@oficiopl.com`
- `info@oficiopl.com`

The "from" address is configured in `src/lib/email.ts` and uses:
```typescript
from: `${providerName} <invoices@${process.env.RESEND_DOMAIN}>`,
```

To change the sender address, update the code or add an environment variable:
```bash
RESEND_FROM_ADDRESS="invoices"  # Will become invoices@oficiopl.com
```

## Pricing

### Free Tier
- **100 emails/day**
- **1 domain**
- Perfect for testing and small businesses

### Paid Plans
- **$20/month**: 50,000 emails/month
- **$80/month**: 100,000 emails/month
- Custom plans available for higher volumes

See https://resend.com/pricing for current pricing.

## Troubleshooting

### DNS Verification Failed

**Solutions:**
1. Double-check you copied the DNS records exactly as provided
2. Wait longer (up to 48 hours for DNS propagation)
3. Use [DNS Checker](https://dnschecker.org) to verify DNS records are propagated
4. Clear browser cache and try verifying again

### "Domain not verified" Error

**Solution:**
- Check Resend dashboard to ensure domain shows as verified (green checkmark)
- If not verified, check DNS records and wait for propagation

### Emails Not Being Received

**Solutions:**
1. Check Resend dashboard → Emails tab for delivery status
2. Check recipient's spam folder
3. Ensure DNS records are properly configured (SPF, DKIM)
4. Wait 24-48 hours for domain reputation to build

### Rate Limit Exceeded

**Solution:**
- You've hit your daily limit (100 emails on free tier)
- Wait until tomorrow or upgrade your plan
- Consider switching to `EMAIL_PROVIDER="auto"` to use Gmail as fallback

## Using Both Gmail and Resend

You can configure both providers for redundancy:

```bash
EMAIL_PROVIDER="auto"  # Try Resend first, fall back to Gmail if it fails

# Both configured
RESEND_API_KEY="re_your_key"
RESEND_DOMAIN="oficiopl.com"

GMAIL_USER="info@oficiopl.com"
GMAIL_APP_PASSWORD="your_app_password"
```

With `EMAIL_PROVIDER="auto"`, the app will:
1. Try Resend first
2. If Resend fails (rate limit, API error), automatically use Gmail
3. Log which provider was used

## Monitoring Email Delivery

### Resend Dashboard

- View all sent emails
- Check delivery status
- See open rates
- Track bounces and complaints
- View email content

### In Your Application

Check server logs for email sending results:
```
Email sent successfully via resend
Message ID: <unique-id>
```

## Best Practices

1. **Start with Free Tier**: Test everything before upgrading
2. **Monitor Usage**: Check Resend dashboard regularly
3. **Set Up Both Providers**: Use `EMAIL_PROVIDER="auto"` for reliability
4. **Keep API Keys Secret**: Never commit them to git
5. **Use Descriptive From Names**: e.g., "Oficio Billing" instead of just an email
6. **Test Spam Scores**: Use [Mail Tester](https://www.mail-tester.com) to check email quality

## Migrating from Gmail to Resend

If you're currently using Gmail and want to switch:

1. Follow this guide to set up Resend
2. Update `.env`:
   ```bash
   EMAIL_PROVIDER="resend"  # Switch to Resend
   ```
3. Restart your server
4. Test with a few invoices first
5. Monitor Resend dashboard for delivery issues

## Support

- **Resend Documentation**: https://resend.com/docs
- **Resend Support**: https://resend.com/support
- **DNS Help**: Contact your domain registrar's support

## Comparison with Gmail

| Feature | Resend | Gmail SMTP |
|---------|--------|------------|
| Setup Time | 30 min (DNS) | 5 min |
| Daily Limit (Free) | 100 emails | 500 emails |
| Deliverability | Excellent | Good |
| From Address | invoices@oficiopl.com | info@oficiopl.com (via gmail) |
| Professional Look | ✅ Yes | ⚠️ Shows "via gmail.com" |
| Analytics | ✅ Built-in dashboard | ❌ No |
| API vs SMTP | ✅ Modern API | ⚠️ Traditional SMTP |

## Next Steps

After setting up Resend:

1. Send test invoices to yourself
2. Check spam scores
3. Monitor Resend dashboard
4. Consider adding more email features:
   - Payment receipt emails
   - Contract renewal reminders
   - Overdue invoice notifications

For implementation of additional email features, see [Adding More Email Types](./EMAIL_ADDING_FEATURES.md) (to be created).
