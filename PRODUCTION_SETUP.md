# Production Setup Guide

This document outlines all environment variables, secrets, and configurations needed for production deployment of SDP Global Pay.

## 🔐 Required Environment Variables & Secrets

### 1. Database (Automatically Configured)
When you enable the PostgreSQL database in Replit deployments, these are automatically set:
- `DATABASE_URL` - PostgreSQL connection string
- `PGHOST` - Database host
- `PGUSER` - Database user
- `PGPASSWORD` - Database password
- `PGDATABASE` - Database name
- `PGPORT` - Database port

**Action Required:** ✅ Enable PostgreSQL database in your deployment settings

### 2. Email Service (Resend)
Required for sending emails (invitations, notifications, etc.):
- `RESEND_API_KEY` - Your Resend API key (same as development)
- `RESEND_FROM_EMAIL` - Default sender email (e.g., "onboard@sdpglobalpay.com")

**Action Required:** 
1. ✅ Add `RESEND_API_KEY` to production secrets
2. ✅ Verify your domain in Resend dashboard
3. ✅ Set `RESEND_FROM_EMAIL` in production secrets

### 3. Authentication & Security
- `TOTP_ENCRYPTION_KEY` - Encryption key for 2FA secrets (32-byte hex string)
- `SESSION_SECRET` - Session encryption secret (generated automatically if not set)

**Action Required:** 
1. ✅ Copy `TOTP_ENCRYPTION_KEY` from development to production (to maintain existing 2FA setups)
2. ⚠️ Or generate a new one for production (will require users to re-setup 2FA)

### 4. Payment Processing (Stripe) - TO BE ADDED LATER
Required for payment processing:
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret

**Action Required:** 
1. ⏳ You'll provide these later
2. Add to production secrets when ready

### 5. AI Features (OpenAI) - TO BE ADDED LATER
Required for AI-powered features:
- `OPENAI_API_KEY` - OpenAI API key

**Action Required:** 
1. ⏳ You'll provide this later
2. Add to production secrets when ready

### 6. Application Configuration
- `NODE_ENV` - Set to `production` (automatically set by Replit)
- `REPLIT_DEPLOYMENT` - Set to `1` in production (automatically set by Replit)

**Action Required:** ✅ No action needed (automatically configured)

## 📋 Secrets Checklist

### Ready to Configure Now:
- [ ] `DATABASE_URL` - ✅ Automatically configured when PostgreSQL is enabled
- [ ] `RESEND_API_KEY` - ✅ Same as development
- [ ] `RESEND_FROM_EMAIL` - ✅ Set to "onboard@sdpglobalpay.com"
- [ ] `TOTP_ENCRYPTION_KEY` - ✅ Copy from development OR generate new

### To Configure Later:
- [ ] `STRIPE_SECRET_KEY` - ⏳ Awaiting Stripe credentials
- [ ] `STRIPE_PUBLISHABLE_KEY` - ⏳ Awaiting Stripe credentials
- [ ] `STRIPE_WEBHOOK_SECRET` - ⏳ Awaiting Stripe credentials
- [ ] `OPENAI_API_KEY` - ⏳ Awaiting OpenAI credentials

## 🔧 Integration Setup

### Replit Authentication (OIDC)
The application uses Replit's OpenID Connect for authentication. This is automatically configured in production.

**Action Required:** ✅ No action needed (automatically configured)

### Stripe Integration
Once you have Stripe credentials:
1. Add the three Stripe secrets to production
2. Verify webhook endpoints are configured in Stripe dashboard
3. Test payment flows in production

### OpenAI Integration
Once you have OpenAI credentials:
1. Add `OPENAI_API_KEY` to production secrets
2. Test AI-powered features

## 📝 Environment Variables Summary

### Current Status:

| Variable | Status | Value | Notes |
|----------|--------|-------|-------|
| `DATABASE_URL` | ✅ Ready | Auto-configured | Enable PostgreSQL in deployment |
| `RESEND_API_KEY` | ✅ Ready | Same as dev | Add to secrets |
| `RESEND_FROM_EMAIL` | ✅ Ready | onboard@sdpglobalpay.com | Add to secrets |
| `TOTP_ENCRYPTION_KEY` | ✅ Ready | Copy from dev | Add to secrets |
| `STRIPE_SECRET_KEY` | ⏳ Later | TBD | Awaiting credentials |
| `STRIPE_PUBLISHABLE_KEY` | ⏳ Later | TBD | Awaiting credentials |
| `STRIPE_WEBHOOK_SECRET` | ⏳ Later | TBD | Awaiting credentials |
| `OPENAI_API_KEY` | ⏳ Later | TBD | Awaiting credentials |

## 🎯 Quick Setup Commands

### To add secrets to production:
1. Go to your Replit deployment settings
2. Navigate to "Environment Variables" or "Secrets"
3. Add each secret using the table above

### To get current TOTP_ENCRYPTION_KEY from development:
```bash
echo $TOTP_ENCRYPTION_KEY
```

### To generate a new TOTP_ENCRYPTION_KEY (if needed):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## ⚠️ Important Notes

1. **Database Separation**: Production and development databases are completely separate. You'll need to run the seed script to populate production data.

2. **Secret Management**: Never commit secrets to the repository. Always use Replit's secrets management.

3. **Email Domain**: Ensure your email domain (sdpglobalpay.com) is verified in Resend before deploying.

4. **2FA Compatibility**: If you copy `TOTP_ENCRYPTION_KEY` from development, existing 2FA setups will work in production. If you generate a new key, users will need to re-setup 2FA.

5. **Stripe Webhooks**: When adding Stripe, update webhook URLs to point to your production domain.

## 🚀 Ready to Deploy?

Before publishing:
- [ ] All "Ready" secrets are configured in production
- [ ] PostgreSQL database is enabled
- [ ] Email domain is verified in Resend
- [ ] Production seed script is ready to run (see DEPLOYMENT_GUIDE.md)

For deployment steps, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
