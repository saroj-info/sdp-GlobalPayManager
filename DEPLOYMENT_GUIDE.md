# SDP Global Pay - Production Deployment Guide

This guide provides step-by-step instructions for deploying SDP Global Pay to production.

## 📋 Pre-Deployment Checklist

### 1. Code & Configuration
- [ ] All features tested in development
- [ ] Latest code committed to repository
- [ ] No console errors in browser
- [ ] All API endpoints functioning correctly

### 2. Documentation Review
- [ ] Read [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) for environment variables
- [ ] Understand database separation (dev vs production)
- [ ] Identify which secrets are ready to configure

### 3. External Services
- [ ] Resend account active and domain verified
- [ ] Database backup strategy planned (if needed)

## 🚀 Deployment Steps

### Step 1: Publish Your Replit App

1. **Click the "Publish" button** in your Replit workspace
2. **Choose deployment type:**
   - Recommended: **Autoscale Deployment** (scales with traffic)
   - Alternative: **Reserved VM** (dedicated resources)
3. **Configure deployment settings:**
   - Give your deployment a name
   - Select your deployment type
   - Review pricing

4. **Enable PostgreSQL Database:**
   - In deployment settings, enable PostgreSQL
   - This automatically creates production database with connection strings

### Step 2: Configure Environment Variables

Navigate to your deployment's **Environment Variables** or **Secrets** section and add:

#### Required Now:
```bash
# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx  # Same as development
RESEND_FROM_EMAIL=onboard@sdpglobalpay.com

# Security (2FA)
TOTP_ENCRYPTION_KEY=your_32_byte_hex_key  # Copy from development
```

#### Get TOTP_ENCRYPTION_KEY from development:
In your development console, run:
```bash
echo $TOTP_ENCRYPTION_KEY
```
Copy the output and add to production.

#### To Add Later (when credentials available):
```bash
# Stripe (when ready)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx  
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# OpenAI (when ready)
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
```

### Step 3: Deploy & Verify

1. **Click "Deploy"** to publish your application
2. **Wait for build to complete** (usually 2-5 minutes)
3. **Get your production URL** (e.g., `your-app.replit.app`)
4. **Verify deployment:**
   - Visit the production URL
   - Check that landing page loads
   - Verify no console errors (F12 > Console)

### Step 4: Seed Production Database

⚠️ **IMPORTANT:** Your production database is currently empty. You need to populate it with essential data.

#### Option A: Run Seed Script from Replit Shell (Recommended)

1. **Open your Replit deployment shell**
2. **Navigate to your project:**
   ```bash
   cd /path/to/your/project
   ```

3. **Run the production seed script:**
   ```bash
   tsx scripts/seed-production.ts
   ```

4. **Verify output:**
   - You should see: "✅ Production database seeded successfully!"
   - Note the admin credentials shown in output

#### Option B: Run Seed Script Locally (If you have DATABASE_URL)

1. **Get production DATABASE_URL** from deployment environment variables
2. **Set it locally:**
   ```bash
   export DATABASE_URL="postgresql://user:pass@host/db"
   ```
3. **Run seed script:**
   ```bash
   tsx scripts/seed-production.ts
   ```

### Step 5: Verify Seeded Data

1. **Check database pane** in your Replit deployment
2. **Verify tables populated:**
   - `countries` - Should have 17 countries
   - `contract_templates` - Should have 4 templates
   - `users` - Should have 1 SDP Super Admin

3. **Test admin login:**
   - Navigate to: `https://your-app.replit.app`
   - Click "Sign In"
   - Use credentials:
     - **Email:** `admin@sdpglobalpay.com`
     - **Password:** `SDPGlobal2024!`
   - ⚠️ **Change password immediately after first login!**

### Step 6: Post-Deployment Configuration

#### 1. Change Admin Password
- [ ] Log in as admin
- [ ] Go to My Details / Profile
- [ ] Change password from default `SDPGlobal2024!`
- [ ] Enable 2FA for admin account (recommended)

#### 2. Verify Email Service
- [ ] Test sending an email (e.g., invite a test user)
- [ ] Check Resend dashboard for delivery status
- [ ] Verify email domain is working correctly

#### 3. Test Core Features
- [ ] Create a test business user
- [ ] Add a test worker
- [ ] Create a test contract
- [ ] Verify contract generation works
- [ ] Test timesheet creation (if applicable)

#### 4. Configure Integrations (When Ready)

**Stripe:**
1. Add Stripe secrets to production environment
2. Configure webhook URL: `https://your-app.replit.app/api/stripe/webhook`
3. Test payment flows
4. Verify invoice processing

**OpenAI:**
1. Add OpenAI API key to production environment
2. Test AI-powered features
3. Monitor usage in OpenAI dashboard

## 🔒 Security Checklist

Post-deployment security verification:

- [ ] Admin password changed from default
- [ ] 2FA enabled for admin account
- [ ] All secrets properly configured in Replit (not hardcoded)
- [ ] Production database accessible only to authorized users
- [ ] HTTPS enabled (automatic with Replit deployments)
- [ ] Email domain verified and SPF/DKIM configured
- [ ] Test unauthorized access attempts (should be blocked)

## 📊 Monitoring & Maintenance

### What to Monitor:
1. **Application Health:**
   - Deployment status in Replit dashboard
   - Error logs in deployment console
   - Response times and performance

2. **Database:**
   - Storage usage
   - Connection pool status
   - Query performance

3. **Email Delivery:**
   - Resend dashboard for delivery rates
   - Bounce and complaint rates
   - Domain reputation

4. **External Services:**
   - Stripe webhook delivery (when configured)
   - OpenAI API usage and limits (when configured)

### Regular Maintenance:
- [ ] Review error logs weekly
- [ ] Monitor database growth
- [ ] Check email delivery rates
- [ ] Review user activity logs
- [ ] Update dependencies monthly
- [ ] Backup critical data regularly

## 🆘 Troubleshooting

### Issue: Application won't start
**Solution:**
1. Check deployment logs for errors
2. Verify all required environment variables are set
3. Check database connection (DATABASE_URL)
4. Review recent code changes

### Issue: Database empty after deployment
**Solution:**
1. Run the seed script: `tsx scripts/seed-production.ts`
2. Verify DATABASE_URL points to production database
3. Check seed script output for errors

### Issue: Emails not sending
**Solution:**
1. Verify RESEND_API_KEY is set correctly
2. Check domain is verified in Resend dashboard
3. Review Resend logs for delivery failures
4. Ensure FROM email matches verified domain

### Issue: Admin login fails
**Solution:**
1. Verify seed script ran successfully
2. Check user exists in database: `SELECT * FROM users WHERE email = 'admin@sdpglobalpay.com'`
3. Reset password if needed using database tools
4. Check TOTP_ENCRYPTION_KEY if 2FA is enabled

### Issue: Stripe/OpenAI features not working
**Solution:**
1. Verify credentials are added to production environment
2. Check integration is set up correctly
3. Review application logs for API errors
4. Test with development credentials first

## 📝 Deployment Summary

### What Gets Deployed:
✅ Application code and assets
✅ Database schema (tables, indexes)
✅ Environment variables and secrets

### What Needs Manual Setup:
⚠️ Database data (run seed script)
⚠️ Admin password change
⚠️ External service configuration (Stripe, OpenAI when ready)

### Critical Files:
- `scripts/seed-production.ts` - Database seed script
- `PRODUCTION_SETUP.md` - Environment variables guide
- `DEPLOYMENT_GUIDE.md` - This file

## 🎯 Quick Reference

### Production Seed Script:
```bash
tsx scripts/seed-production.ts
```

### Admin Credentials (Default):
```
Email: admin@sdpglobalpay.com
Password: SDPGlobal2024!
⚠️ CHANGE IMMEDIATELY AFTER FIRST LOGIN
```

### Essential Data Seeded:
- 17 active countries (AU, BR, CA, DE, IN, IE, JP, MY, NZ, PK, PH, RO, SG, LK, UK, US, VN)
- 4 contract templates (At-Will, Contractor, Permanent, 3rd Party)
- 1 SDP Super Admin user

### Production URL:
```
https://your-app-name.replit.app
```

### Support Resources:
- Replit Docs: https://docs.replit.com
- Resend Docs: https://resend.com/docs
- This Deployment Guide: DEPLOYMENT_GUIDE.md
- Environment Setup: PRODUCTION_SETUP.md

## ✅ Deployment Complete!

Once all steps are completed:
- [ ] Application is live at production URL
- [ ] Database is seeded with essential data
- [ ] Admin can log in and access dashboard
- [ ] Email service is working
- [ ] All security measures in place
- [ ] Monitoring is active

**Congratulations! SDP Global Pay is now live in production! 🎉**

For ongoing support and updates, keep this guide handy and refer to the troubleshooting section as needed.
