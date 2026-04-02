# SDP Global Pay — System Overview

---

## 1. Background

SDP Global Pay is a global Employer of Record (EOR) and Agent of Record (AOR) provider operating across multiple countries. The platform enables businesses, recruitment agencies, staffing firms, and labour hire companies to engage local and international workers without needing to establish their own legal entities overseas.

In each country where SDP Global Pay operates, it maintains its own registered entity. This means SDP Global Pay takes on the legal employer role — managing all employment compliance, payroll, statutory contributions, tax obligations, and local labour law requirements on behalf of the client business. This allows companies to access a global workforce rapidly, reduce compliance risk, and remove the administrative burden of international payroll management.

The platform supports two primary engagement models:

- **Cross-border engagement**: A business in one country engages a worker in another country. SDP Global Pay's local entity in the worker's country becomes the employer of record, handling all local obligations.
- **Same-country engagement**: A business engages workers in the same country where it operates, using SDP Global Pay as the employer or agent of record. This allows the business to offload employment risk, compliance, and payroll administration entirely.

SDP Global Pay serves:
- **Enterprises** seeking to hire globally without setting up overseas subsidiaries
- **Recruitment and staffing agencies** placing workers into client companies (host clients)
- **Labour hire companies** managing large pools of casual and contract workers
- **Individual contractors** who want structured, compliant engagements

The platform also offers a public website at **sdpglobalpay.com**, including a Cost of Employment Calculator, country guides, and service information.

---

## 2. User Roles and Permissions

### 2.1 SDP Super Admin
The top-level administrator with full platform access. This role is managed via Replit environment variables (secure credentials). Capabilities include:

- All SDP Admin capabilities (see below)
- Manage Replit environment configuration and secrets
- Configure the super admin password and identity
- Access all businesses, countries, workers, and invoices without restriction
- View and edit platform-wide settings

### 2.2 SDP Admin
An internal SDP team member with broad operational access. Capabilities include:

- Manage country entities: configure tax rates (GST/VAT), compliance document requirements, entity information
- Manage all businesses and users on the platform
- Create and manage workers and contracts on behalf of any business
- View, create, retract, and delete all invoices (SDP, client, contractor)
- Create consolidated and PO-linked invoices
- Manage purchase orders and track budgets
- Approve, reject, or review all timesheets
- Access all reporting and analytics
- Edit and preview email templates
- Invite new businesses and SDP team members to the platform

### 2.3 SDP Business User (Agent)
An SDP internal team member with operational (non-configuration) access, scoped to assigned countries and/or businesses. Capabilities include:

- All invoice operations within assigned scope
- Timesheet review and approval within assigned scope
- Worker and contract management within assigned scope
- Reporting within assigned scope
- Cannot modify country configuration or platform settings

### 2.4 Business User
A registered employer, recruitment agency, staffing firm, or labour hire company using the platform. Businesses self-register or are created by an SDP admin on their behalf. Capabilities include:

- Create and manage workers (employees and contractors)
- Create contracts using templates (casual, fixed-term, contractor, etc.)
- Approve or reject worker timesheets
- View SDP-generated invoices for their account
- Create and send client invoices to their host clients
- Create and manage host clients (with or without portal access)
- Manage purchase orders against their contracts
- View workforce analytics and reports
- Invite additional business users within their organisation

> Note: Billing lines (SDP's fee structure) and internal remuneration line details are hidden from business users until SDP confirms them. Business users see a "pending confirmation" message on salary contracts until SDP completes the setup.

### 2.5 Host Client
A client company that a business places workers into. Host clients may or may not have direct platform access:

- **With portal access**: Can view timesheets submitted by provided workers, view and download invoices directed to them, track hours and spend
- **Without portal access**: Receive invoices by email (with a secure public view link); no login required
- Leave approval always remains with the employing business, not the host client
- Host clients are stored as business entities with `isRegistered=false`

### 2.6 Worker (Employee or Contractor)
An individual engaged through the platform. Workers are invited by the business after being created. Capabilities include:

- Complete onboarding (personal details, bank account, business structure for contractors, compliance documents)
- Review and electronically sign employment or contractor agreements
- Submit timesheets (hourly, daily, or attendance-based depending on contract type)
- Attach expense receipts for reimbursement on timesheets
- Download payslips (employees)
- Generate and submit tax invoices (contractors)
- Request leave and track leave approval status
- Update personal details and security settings (including 2FA)

---

## 3. Technology Overview

### 3.1 Platform and Hosting
The entire SDP Global Pay platform — including the application and the public marketing website — is built and hosted on **Replit**. The live domain is **sdpglobalpay.com**, with hosting, TLS, and deployment all managed through Replit's infrastructure.

### 3.2 Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI component framework |
| **TypeScript** | Type safety across the frontend |
| **Vite** | Build tool and development server |
| **Wouter** | Lightweight client-side routing |
| **TanStack Query v5** | Server state management, caching, and background refetching |
| **React Hook Form + Zod** | Form state management and schema-based validation |
| **Radix UI** | Accessible, unstyled UI primitives |
| **shadcn/ui** | Pre-built component library built on Radix UI |
| **Tailwind CSS** | Utility-first CSS styling |
| **Framer Motion** | Animations and transitions |
| **Recharts** | Analytics charts and data visualisations |
| **jsPDF + jsPDF-AutoTable** | Client-side PDF generation for invoices and payslips |
| **Lucide React + React Icons** | Icon sets |
| **Embla Carousel** | Carousel components |
| **date-fns** | Date manipulation and formatting |

### 3.3 Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express.js (TypeScript)** | Backend web server and RESTful API |
| **Passport.js** | Authentication middleware |
| **express-session + connect-pg-simple** | Session management with PostgreSQL-backed session store |
| **JWT (jsonwebtoken)** | Stateless API token authentication |
| **bcrypt** | Password hashing |
| **otpauth + qrcode** | TOTP-based two-factor authentication |
| **Nodemailer + Resend + SendGrid** | Email delivery for transactional notifications |
| **Stripe SDK** | Payment intent creation, confirmation, and Payment Links |
| **OpenAI SDK** | AI capabilities (available for feature integration) |
| **Google Cloud Storage + Uppy** | Document upload and storage with ACL policies |
| **xlsx** | Spreadsheet export for reports |
| **ws** | WebSocket support |
| **pdfkit** | Server-side PDF generation (payslips) |

### 3.4 Database
| Technology | Purpose |
|---|---|
| **PostgreSQL (Neon)** | Primary database — serverless PostgreSQL |
| **Drizzle ORM** | Type-safe database access layer |
| **drizzle-zod** | Auto-generates Zod validators from Drizzle schemas |
| **drizzle-kit** | Schema migrations and `db:push` tooling |

### 3.5 Authentication and Security
- **Replit OpenID Connect (OIDC)**: Primary authentication for production — users log in via Replit's identity provider
- **Custom token-based login**: Development and test authentication system with predefined test accounts
- **Two-Factor Authentication (2FA)**: TOTP-based (Time-based One-Time Passwords) using authenticator apps; AES-256 encrypted secret storage; backup recovery codes; device trust functionality; audit logging; rate limiting on verification attempts
- **Password Reset**: Time-limited token-based email verification; strong password requirements enforced
- **Role-Based Access Control (RBAC)**: Enforced at the API layer for all sensitive operations
- **JWT tokens**: Used for stateless, secure API access (e.g. invoice view links, signing links)
- **Session security**: httpOnly cookies, secure flag in production, PostgreSQL-backed session store

### 3.6 External Integrations
| Service | Purpose |
|---|---|
| **Stripe** | Online payment processing — payment intents, confirmation, and Stripe Payment Links for unregistered clients |
| **Resend** | Primary email API for transactional notifications |
| **Nodemailer** | Email fallback and SMTP support |
| **SendGrid** | Additional email delivery capability |
| **Google Cloud Storage** | Document and file storage |
| **Neon Database** | Serverless PostgreSQL hosting |
| **OpenAI** | AI capabilities |
| **Replit** | Application hosting, domain, TLS, deployment |

---

## 4. Feature Modules Summary

### 4.1 Public Website and Marketing
- Landing page with explainer video, "Who We Help" section, global reach overview, and trust indicators
- Solutions page (EOR, Payroll, Contractor Management)
- How It Works, Pricing, Country Guides, and Resources pages
- Contact inquiry form
- **Cost of Employment Calculator**: Public-facing tool supporting 17 countries with jurisdiction-specific employer costs, employee vs. contractor toggling, and CSV export

### 4.2 Workforce Management
- Create employees and contractors across supported countries
- Multi-step worker onboarding: personal details, banking, business structure, compliance documents
- Resend onboarding invitations
- List and card view toggles with search, filter, and sort
- "Workers Provided to You" section for host clients receiving placed workers
- Document upload and management per worker

### 4.3 Contract Management
- Contract creation wizard with step-by-step configuration
- Employment types supported: Casual, Permanent, Fixed-Term, Contractor, 3rd Party Business Worker, Zero-Hours, At-Will, Gig Worker, On-Call, Seasonal, Part-Time
- Contract templates: Casual Employment, Global Contractor, and others
- Rate structures: Single rate, Multiple rates (with per-entry rate selection on timesheets)
- Client billing modes: Rate-Based or Fixed Price
- Pay modes: Hourly, Daily, Fixed Salary (CTC)
- SDP-only billing lines (hidden from business users): management fees, employer contributions
- Remuneration line gating: salary contract breakdowns hidden until SDP confirms
- Digital signing via secure token links (workers and businesses)
- Contract status tracking: Draft → Pending → Active → Terminated
- Timesheet requirements configurable per contract

### 4.4 Timesheet and Leave Management
- Timesheet submission by workers (hourly, daily, or attendance/salary)
- Full-period entry table with multiple entries per day and per-entry rate line selection
- Expense reimbursements: attach receipts, categorise expenses per timesheet
- Approval workflow: submit → approve/reject → auto-invoice generation on approval
- Search and filter: by worker name, country, host client, business
- Host client timesheet separation: provided workers' timesheets visible to host clients
- Leave requests: types include sick leave, annual leave, and others; approval stays with employing business
- List and grid view toggles with status filter tabs

### 4.5 Invoicing
Three parallel invoice streams operate on the platform:

```
Worker (Contractor) ──→ SDP Global Pay
                              │
                              ▼
SDP Global Pay ──────→ Business / Agency
                              │
                              ▼
Business / Agency ───→ Host Client
```

- **SDP→Business Invoices**: Generated automatically on timesheet approval or created manually. Supports Stripe online payment, PDF download, secure public view links, and Stripe Payment Links for unregistered clients.
- **Worker→Business Invoices (Contractor Invoices)**: Workers generate and submit tax invoices directly through the worker portal.
- **Business→Host Client Invoices**: Businesses create and send invoices to their host clients (auto-generated or manual).
- **Consolidated Invoices**: SDP users can select multiple workers/timesheets for a single business and generate one consolidated invoice with one line item per worker.
- **Purchase Order (PO) Linking**: SDP invoices can be linked to a Purchase Order. The PO's invoiced total is automatically updated, and the PO is marked exhausted when the budget is consumed.
- **Retract/Void Controls**: SDP users can retract (void) a sent invoice to free timesheets for re-invoicing. Retraction is blocked if payment has been received.
- **Delete Controls**: Invoice deletion is blocked for paid invoices.
- **PDF Generation**: Client-side PDF generation for all invoice types via jsPDF.
- **Auto-VAT**: Country-configured GST/VAT rates auto-populate in invoice creation modals.
- **Invoice Search and Filters**: Search by invoice number, filter by worker, business, host client, and country.
- **Grid/List View Toggle**: All invoice tabs support card and list views.

### 4.6 Purchase Orders
- Create purchase orders against contracts with a defined budget
- POs linked to SDP invoices at time of creation or automatically on timesheet approval
- `invoicedToDate` field tracks how much of the budget has been consumed
- PO status: `open` → `exhausted` (auto-set when budget is fully consumed)
- Retracting or deleting an invoice reverses its contribution to the PO balance

### 4.7 Reporting
- Generate payroll, spend, and compliance reports
- Filter by date range, country, business, and worker
- Email reports directly to stakeholders from within the platform
- Export to spreadsheet (XLSX)

### 4.8 Administration and Configuration
- **Country Management**: Configure GST/VAT rates, compliance document requirements, entity information, and advisor fees per country
- **User Management**: Invite and manage SDP internal team members; role-based access configuration
- **Business Management**: View and manage all registered businesses and their associated users
- **Email Template Editor**: Edit, version, preview, and test all system-generated email templates (Welcome, Invoice, Contract Request, Salary Notification, etc.)

### 4.9 Security
- Custom TOTP-based 2FA with authenticator app support
- Backup recovery codes (one-time use)
- Device trust for trusted browsers
- Audit logging for 2FA events
- Rate limiting on authentication and verification endpoints
- Secure password reset with time-limited tokens
- Role-based API access control enforced server-side

---

## 5. Use Cases

---

### UC1 — Business Onboards an Employee (Internal Work, Casual, Hourly)

**Actor**: Business User

1. Business user visits sdpglobalpay.com and clicks **Sign Up**
2. Completes registration and gains access to the platform
3. Navigates to **Workforce → Add Worker**, selects type: Employee
4. Enters worker details and sends an onboarding invitation
5. Navigates to **Contracts → New Contract**
6. Configures: Country = Australia, Employment Type = Casual, Work Type = Internal, Role = Business Analyst, Start = 01 Jan 2026, End = 31 Mar 2026, Template = Casual Employment Contract, Rate = Hourly, Structure = Single Rate, PO = None, Timesheet = Yes
7. Creates and sends the contract for signature
8. **SDP Admin is notified** → logs in → opens the contract → completes billing lines and remuneration lines
9. **Worker receives invitation** → logs in → completes personal details, banking, and compliance documents
10. Worker reviews and signs the contract
11. Worker submits a weekly timesheet for approved hours
12. Business user receives email notification → logs in → approves the timesheet
13. System auto-generates an SDP→Business invoice on approval
14. SDP user logs in → views the approved timesheet and the generated invoice

---

### UC2 — Agency Onboards a Contractor for a Host Client (Auto-Billing, Hourly)

**Actor**: Agency/Business User

1. Agency user signs up on the platform (or is created by SDP admin)
2. Navigates to **Workforce → Add Worker**, selects type: Contractor
3. Navigates to **Contracts → New Contract**
4. Configures: Country = Australia, Type = Contractor, Work Type = Host Client, Billing = Auto Billing, creates a new Host Client record, Rate = Hourly (matching pay rates), Role = Business Analyst, Start = 01 Jan 2026, End = 31 Mar 2026, Template = Global Contractor, Rate Structure = Single Rate, PO = None, Timesheet = Yes
5. Creates and sends the contract
6. **SDP Admin is notified** → logs in → completes billing lines for the contractor engagement
7. Worker (contractor) receives invitation → signs contract → completes all required details
8. Contractor submits a timesheet for the week
9. Agency approver receives email → approves the timesheet
10. System auto-generates two invoices: SDP→Agency (services) and Agency→Host Client (billing)
11. SDP user logs in → views both the timesheet and the two invoices

---

### UC3 — Employee (Worker) Self-Onboarding Journey

**Actor**: Worker (Employee)

1. Worker receives an onboarding invitation email from the platform
2. Clicks the link → sets up their password and logs in
3. Completes the onboarding form: personal details, address, bank account, emergency contacts
4. Uploads required compliance documents (e.g. identity verification)
5. Navigates to **Contracts** → reviews the contract prepared by the business
6. Reads and accepts the terms → clicks **Sign Contract** (digitally signed via secure token)
7. Each week, navigates to **Timesheets → New Timesheet**, selects the contract period, enters hours worked per day, attaches any expense receipts
8. Submits the timesheet → approver receives email notification
9. Once approved, worker sees the timesheet status update to "Approved"
10. At month end, worker navigates to **Payslips** → downloads their monthly payslip (PDF)

---

### UC4 — Contractor Submits a Tax Invoice via Worker Portal

**Actor**: Worker (Contractor)

1. Contractor logs in and navigates to **Invoices**
2. Clicks **New Invoice** → selects the relevant contract and period
3. Platform pre-populates line items based on timesheet hours and hourly rate
4. Contractor reviews totals, adds any applicable notes, and submits the invoice
5. Business user is notified → reviews and approves the contractor invoice
6. Invoice status updates to approved; contractor receives confirmation

---

### UC5 — SDP Admin Configures a New Country Entity

**Actor**: SDP Admin

1. Logs in → navigates to **Country Management**
2. Clicks **Add Country** or selects an existing country to edit
3. Configures: country name, currency, GST/VAT rate (e.g. 10% for Australia), compliance document requirements, entity information (legal name, ABN/registration number, address)
4. Adds advisor fee rates for that country
5. Saves configuration
6. Country is now available for selection in contract creation and invoice generation
7. GST/VAT rate auto-populates in invoice creation modals when this country is selected as the SDP entity

---

### UC6 — Business Creates a Purchase Order and Links it to SDP Invoices

**Actor**: Business User / SDP Admin

1. Business user logs in → navigates to **Purchase Orders → New PO**
2. Enters PO number, project name, total budget, and links the PO to a contract
3. PO is created with status: **Open**
4. When SDP creates a new invoice for that business, they open the **Create Invoice** modal
5. After selecting the business, a **Purchase Order** dropdown appears showing open POs with remaining budget
6. SDP user selects the relevant PO
7. Invoice is created and linked to the PO; PO's `invoicedToDate` is incremented by the invoice total
8. When the PO budget is fully consumed, status changes to **Exhausted** automatically
9. If an invoice is retracted or deleted, the PO balance is reversed accordingly

---

### UC7 — SDP Creates a Consolidated Invoice for Multiple Workers

**Actor**: SDP Admin or SDP Business User

1. SDP user navigates to **SDP Invoices → Consolidated Invoice**
2. **Step 1 — Configure**: Selects SDP entity (country), client business, optional period range, currency, and optionally links a Purchase Order
3. **Step 2 — Select Workers**: A list of approved timesheets for the selected business (not yet invoiced) is displayed with checkboxes; SDP user selects the workers to include; running subtotal is shown
4. **Step 3 — Preview and Create**: Line items per worker are shown with hours, rate, and amount; GST is calculated if cross-border; grand total displayed
5. SDP user clicks **Create Consolidated Invoice**
6. A single invoice is generated with one line item per worker, linked to all selected timesheets
7. Those timesheets are now marked as invoiced and cannot be selected in a subsequent consolidated invoice (unless the invoice is later voided)
8. Success toast shows the new invoice number; cache refreshes

---

### UC8 — SDP Retracts an Invoice to Free Timesheets for Re-Invoicing

**Actor**: SDP Admin or SDP Business User

1. SDP user navigates to **SDP Invoices** and locates a sent (non-paid) invoice
2. Clicks the **Retract Invoice** button on the invoice card
3. A confirmation dialog appears: "This will void the invoice and free the timesheet for re-consolidation. Are you sure?"
4. SDP user confirms
5. Invoice status is set to **Void**; the invoice card shows a "Voided" badge
6. If the invoice was linked to a Purchase Order, the PO's `invoicedToDate` is reduced by the invoice amount
7. If the PO was previously exhausted, its status is reset to **Open**
8. The timesheets linked to this invoice are now available again in the consolidated invoice wizard

---

### UC9 — Business Invites a Host Client (With or Without Portal Access)

**Actor**: Business User

1. Business user navigates to **Workforce → Host Clients → Add Host Client**
2. Enters the host client's business name and contact details
3. Selects whether to give the host client portal access:
   - **With access**: An invitation email is sent; host client user can log in to view timesheets and invoices for provided workers
   - **Without access**: No portal access; host client receives invoices by email with a secure public view link (no login required)
4. Host client record is created; can now be selected in contract creation as the work destination

---

### UC10 — Worker Requests Leave; Business Approves

**Actor**: Worker → Business User

1. Worker logs in → navigates to **Leave → New Leave Request**
2. Selects leave type (annual, sick, etc.), date range, and adds optional notes
3. Submits the leave request
4. Business user receives an email notification
5. Business user logs in → navigates to **Leave Requests** → reviews the request
6. Approves or rejects the request with optional comments
7. Worker receives an email notification of the outcome
8. Approved leave is recorded against the worker's contract

> Note: For workers placed at a host client, leave approval always remains with the employing business, not the host client.

---

### UC11 — SDP Generates a Payroll Report and Emails It to a Stakeholder

**Actor**: SDP Admin

1. SDP user navigates to **Reports**
2. Selects report type: Payroll, Spend, or Compliance
3. Configures filters: date range, country, business, worker
4. Clicks **Generate Report**
5. Report is rendered on screen with a summary table
6. Clicks **Export** to download as XLSX (spreadsheet)
7. Alternatively, clicks **Email Report** → enters stakeholder email address → clicks Send
8. Stakeholder receives the report by email

---

### UC12 — SDP Sends an Invoice to a Business with Stripe Payment Link

**Actor**: SDP Admin → Business User

1. SDP user creates or locates an SDP→Business invoice
2. Clicks **Send Invoice** → the invoice status updates to "Sent" and an email is sent to the business contact
3. The email contains a **Stripe Payment Link** for online payment (available even if the business does not have a platform login)
4. Business user (or unregistered contact) clicks the link → is taken to a Stripe-hosted payment page
5. Enters card details and completes payment
6. Stripe confirms the payment → the platform receives the webhook → invoice status updates to **Paid**
7. SDP user sees the invoice marked as paid in the SDP Invoices dashboard

---

### UC13 — SDP Admin Edits and Previews an Email Template

**Actor**: SDP Admin

1. SDP admin navigates to **Admin → Email Templates**
2. Browses the list of system email templates (Welcome, Invoice Sent, Contract Request, Salary Notification, etc.)
3. Selects a template to edit
4. Modifies the subject line, body content, and variables (e.g. `{{worker_name}}`, `{{invoice_number}}`)
5. Clicks **Preview** → a rendered preview is shown with sample data substituted
6. Optionally sends a test email to verify rendering in an email client
7. Saves the updated template
8. New version is stored; previous versions are retained for rollback if needed
9. All future emails using this template use the updated version

---

### UC14 — User Enables Two-Factor Authentication (2FA)

**Actor**: Any authenticated user (Worker, Business User, SDP User)

1. User logs in → navigates to **Security Settings**
2. Clicks **Enable Two-Factor Authentication**
3. A QR code is displayed — user scans it with an authenticator app (e.g. Google Authenticator, Authy)
4. User enters the 6-digit code from the app to verify setup
5. Backup recovery codes are shown — user is prompted to save these securely
6. 2FA is now enabled on the account
7. On next login, after entering their password, the user is prompted to enter a TOTP code from their authenticator app
8. User may mark a device as trusted (device fingerprint stored) to skip 2FA on that device for future logins

---

### UC15 — Business User Views and Approves Timesheets from Placed Workers

**Actor**: Host Client (with portal access) and/or Business User

1. Workers placed at a host client submit their timesheets as normal
2. Business user (the employing agency) navigates to **Timesheets**
3. In the **Workers Provided to You** section, timesheets from workers placed at this business's host clients are shown separately
4. Business user reviews the hours, approves or rejects each timesheet
5. Host client (if given portal access) can also view the same timesheets in their own portal view for visibility
6. On approval, the system auto-generates invoices: SDP→Agency and Agency→Host Client

---

### UC16 — SDP Configures a Salary Contract and Sets Up Remuneration Lines

**Actor**: Business User → SDP Admin

1. Business user creates a contract with Pay Mode = Fixed Salary and enters the CTC (Cost to Company) annual value
2. On contract creation, the platform automatically sends a notification email to SDP (`onboard@sdpglobalpay.com`) with worker details and required action items
3. Business user sees the contract in `pending_sdp_review` status; remuneration lines are hidden with a "Pay breakdown pending SDP confirmation" message
4. SDP Admin receives the notification → logs in → opens the contract
5. SDP Admin opens the **SDP Billing Lines** panel (hidden from business users) and configures management fees and employer contribution amounts
6. SDP Admin then opens the **Remuneration Lines** panel and allocates the salary breakdown (base pay, superannuation/pension, allowances)
7. SDP Admin confirms the configuration → contract status updates; business user can now see the remuneration breakdown
8. Worker signs the contract and proceeds with normal timesheet submission

---

### UC17 — Contractor Submits a Multiple-Rate Timesheet with Expense Claims

**Actor**: Worker (Contractor with Multiple Rate Structure)

1. Contractor logs in → navigates to **Timesheets → New Timesheet**
2. Selects the contract period (the contract has multiple rate lines: standard rate and overtime rate)
3. The timesheet entry table shows one row per day with an **Applicable Rate** dropdown per entry row
4. Contractor clicks **+ Add Entry** on a day where both standard and overtime hours apply
5. For the first entry on that day: selects "Standard Rate", enters start time, end time, and break duration
6. For the second entry on that day: selects "Overtime Rate", enters the additional hours
7. Scrolls to the **Expenses** section → clicks **Add Expense**
8. Enters expense date, category (e.g. Travel), description, amount, and currency; attaches a receipt photo
9. Submits the timesheet
10. Business approver sees the timesheet with both rate entries and the expense claim
11. Approver reviews, approves, and the system calculates the total correctly: (standard hours × standard rate) + (overtime hours × overtime rate) + reimbursable expense amount
12. Invoice is auto-generated reflecting the correct blended total

---

## 6. Invoice Flow Diagram

The platform manages three parallel invoice streams:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SDP GLOBAL PAY INVOICE FLOWS                    │
└─────────────────────────────────────────────────────────────────────┘

  Worker (Contractor)
       │
       │  Submits tax invoice
       ▼
  SDP Global Pay / Business
       │
       │  After timesheet approval (auto) or manual creation
       ▼
  SDP Global Pay ──────────────────────────► Business / Agency
  (SDP Services Invoice)                    (receives invoice, pays via Stripe
                                             or bank transfer)
       │
       │  Agency/Business bills their client
       ▼
  Business / Agency ───────────────────────► Host Client
  (Client Invoice)                           (receives invoice via email
                                              or portal; pays business directly)

─────────────────────────────────────────────────────────────────────
CONSOLIDATED INVOICE:  Multiple workers → one SDP→Business invoice
PO-LINKED INVOICE:     SDP invoice linked to a Purchase Order budget
RETRACTED (VOIDED):    Invoice cancelled; timesheets freed; PO reversed
─────────────────────────────────────────────────────────────────────
```

**Invoice Statuses**: `draft` → `sent` → `paid` (or `void` / `cancelled` if retracted)

**Payment Methods**:
- Stripe Payment Link (online card payment, available to unregistered clients)
- Bank transfer (manual; SDP marks as paid once confirmed)

---

*Document prepared: March 2026*
*Platform: SDP Global Pay — sdpglobalpay.com*
