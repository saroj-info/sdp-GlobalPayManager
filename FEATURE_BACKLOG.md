# SDP Global Pay — Feature Backlog

> Last updated: April 2026  
> Positioning: "The global workforce OS for businesses hiring across borders and workers building careers."

---

## Completed Features

### ✅ Feature 1 — Core Worker Management
- Worker profiles (employee / contractor / third-party)
- Business onboarding and user management
- SDP internal admin portal
- Role titles and country jurisdictions

### ✅ Feature 2 — Contracts & Templates
- Contract templates by employment type and country
- DocuSign-style signing flow
- Contract instances with status tracking
- Contract rate lines and billing lines (SDP-only)
- Purchase Orders / SOW tracking

### ✅ Feature 3 — Timesheets
- Timesheet creation and submission
- Manager approval workflow
- Timesheet attachments and expense claims
- Leave requests integrated with timesheets

### ✅ Feature 4 — Payroll & Payslips
- Payslip generation and worker-facing view
- Remuneration lines per contract
- Pay period tracking

### ✅ Feature 5 — Invoicing
- Worker invoices (contractor-raised from approved timesheets)
- SDP invoices to businesses (consolidated, customer billing, business-to-client)
- Invoice PDF generation and email delivery
- Stripe payment links for unregistered host clients
- Margin payments: SDP tracking of margins from customer invoices

### ✅ Feature 6 — Email System
- Resend-based email delivery
- Customisable email templates (admin-editable via DB)
- Template versioning and publishing workflow
- Email settings management

### ✅ Feature 7 — Background Verification & Compliance Documents
- BGV Packs: global (SDP-created) and custom (business-created) verification packs
- Pack items: background checks, compliance documents, pre-offer details
- Pack selection at worker invite time
- Worker BGV check records with status tracking (not_started → in_progress → passed/failed/refer)
- Certn integration fields (orderId, reportUrl) for future automation
- Compliance document records with expiry dates and reference numbers
- BGV & Compliance tab in worker profile modal (admin + business view)
- BGV Packs management tab in SDP admin dashboard
- Email notification to business contact on check completion (passed/failed/refer)
- Stripe billing at cost + 10% (Certn provider) — future automation hook

---

## Planned Features

### 🔲 Feature 8 — Global Mobility (Lightweight)
- Visa and immigration support as SDP-managed service
- Country-specific visa type library
- Worker visa tracking (type, status, expiry)
- SDP internal team manages process; no self-serve automation
- Notification on visa expiry approaching

### 🔲 Feature 9 — Eleva Brand (Worker-Facing)
- Eleva-branded portal for workers (separate branding from SDP Global Pay)
- Worker dashboard: timesheets, payslips, contracts, leave, BGV status
- Eleva Business sub-feature:
  - Airwallex banking/payments (SDP partnership)
  - Invoicing from the Eleva portal
  - Insurance marketplace (referral-only, no financial services licence)
  - Xero/QuickBooks push integration
- Dual-role architecture: single user can be both business and worker

### 🔲 Feature 10 — Eleva Business Banking (Airwallex Integration)
- Business banking via Airwallex (SDP partner)
- KYB handled by Airwallex at business signup
- Account opening, multi-currency wallets
- Payment rails for international payroll
- Reconciliation with SDP payroll

### 🔲 Feature 11 — Insurance Marketplace
- Referral-only model (no financial services licence required)
- Curated panel of insurers (professional indemnity, public liability, income protection)
- Worker and business-facing referral pages
- Referral tracking for revenue reporting

### 🔲 Feature 12 — Reporting & Analytics
- Workforce headcount reports by business, country, employment type
- Payroll cost reports
- Invoice aging and payment status
- BGV completion rates and outstanding checks
- Exportable to CSV/Excel

### 🔲 Feature 13 — Multi-Entity SDP Support
- Multiple SDP legal entities per country
- Entity-specific invoicing and banking details
- Country-scoped routing of workers and contracts to correct entity

### 🔲 Feature 14 — Certn API Integration (BGV Automation)
- Full Certn API integration for automated check ordering
- Webhook receiver for check completion events
- Auto-update check status from Certn webhook
- Stripe billing automation at cost + 10% on check completion

### 🔲 Feature 15 — Xero / QuickBooks Integration
- Push invoices and payroll data to Xero or QuickBooks
- Reconciliation sync
- Tax category mapping per jurisdiction

### 🔲 Feature 16 — Two-Factor Authentication (2FA)
- TOTP-based 2FA (already partially implemented)
- Backup codes
- Admin can enforce 2FA for all users of a business

### 🔲 Feature 17 — Mobile App (Expo / React Native)
- Worker-facing mobile app (Eleva brand)
- Timesheet entry and approval from mobile
- Push notifications for check completions, payslips, approvals
- Document upload from mobile camera

---

## Architecture Notes

- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Session-based with bcrypt, optional 2FA
- **Storage**: Object storage (S3-compatible) for documents, payslips, invoices
- **Email**: Resend (production), console fallback (dev)
- **Payments**: Stripe (invoice links, BGV billing future)
- **BGV Provider**: Certn (manual ordering now, automation in Feature 14)
- **Banking**: Airwallex (Eleva Business, Feature 10)
- **Dual-role**: A single user can hold both `business` and `worker` roles (load-bearing for Eleva Business)

---

## Competitive Positioning

| Feature | SDP Global Pay | Deel | Remote | Workday |
|---|---|---|---|---|
| BGV Packs (custom) | ✅ | ✅ | ✅ | ✅ |
| Eleva worker brand | ✅ | ❌ | ❌ | ❌ |
| Airwallex banking | ✅ | ❌ | ❌ | ❌ |
| Insurance referral | ✅ | ❌ | ❌ | ❌ |
| Multi-entity SDP | 🔲 | ✅ | ✅ | ✅ |
| Global mobility | 🔲 | ✅ | ✅ | ✅ |

---

*This backlog is a living document — update after each sprint.*
