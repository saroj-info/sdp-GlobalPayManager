<!--
⚠️ PRESERVATION RULE — READ BEFORE EDITING ⚠️
This document is append-only.
- NEVER overwrite, compress, summarise, or delete existing content.
- NEVER rewrite features in your own words — preserve the original text exactly.
- Only ADD new content at the bottom, or expand existing sections by appending sub-sections.
- Any AI agent or developer working in this codebase must read and follow this rule before making any edit to this file.
- If in doubt: add, never replace.
-->

# Feature Backlog

## Our Mission
To build a worker community and make employment easy for employers and workers — and financially and career rewarding for workers.

Everything on this platform — the contracts, payroll, HRMS, Eleva, AI — exists in service of this mission. Employers get simplicity and compliance. Workers get visibility, community, opportunity, and financial wellbeing. SDP connects the two.

---

*A running list of features identified for future development. Add new items as they are discussed.*

---

## 1. Dual-Role Users (Worker + Business)

**Discussed:** April 2026

**Background:** Some users operate in multiple capacities simultaneously. For example, John runs a business (J2 Pty Ltd) and uses workers, but also personally provides services as a worker to other businesses. The current platform enforces a single, fixed role per account (worker, business_user, sdp_internal, or third_party_business), meaning John would need two separate logins to operate in both capacities.

**Use Cases:**
- A business owner who occasionally onhires their own personal services to another company
- A sole trader with their own ABN/entity who also employs or onhires workers to third parties
- A worker who sets up a business structure and needs to manage both sides

**What Needs to Be Built:**
- A role-switching mechanism allowing a single login to operate as either a business or a worker depending on context
- OR a linked accounts model where a worker profile and a business profile are associated under one user identity but remain logically separate
- UI to switch between modes (e.g. "Switch to Business View" / "Switch to Worker View")
- Ensure contracts, timesheets, invoices and permissions are correctly scoped to the active role at any given time
- Consider how onboarding handles users who want both roles from the start

**Current Constraint:** The userType column in the users table is a single enum value. This is the core architectural change required.

---

## 2. Eleva — Worker-Facing Brand (White-Label / Dual Brand)

**Discussed:** April 2026

**Background:** SDP Global Pay serves two very different audiences — businesses/agencies and workers — with different value propositions. The idea is to create a separate brand called Eleva (domain: elevaplatform.com) specifically for workers, while the existing sdpglobalpay.com continues to serve businesses and SDP staff. Both brands run on the same platform, same database, and same server — workers simply see Eleva everywhere and never see the SDP name.

**Important Clarifications:**
- Eleva is a worker-only platform. Businesses, agencies, and SDP staff do not use Eleva — they continue to use sdpglobalpay.com. This clean separation makes Eleva much easier to market and explain to workers without the confusion of mixing business and worker audiences.
- Eleva does not appear on payslips or legal documents. The employer of record is always the SDP entity (e.g. SDP Solutions Ltd) or, in future, the business's own entity (see Feature #3). The employing entity's name and details appear on payslips and contracts — Eleva is purely the digital experience layer for the worker. Eleva is the front door, not the employer.

**How It Works (Confirmed Understanding):**
- A worker visits elevaplatform.com → sees Eleva logo, colours, messaging, and value proposition throughout
- A business user visits sdpglobalpay.com → sees SDP Global Pay branding as today
- Both domains point to the same backend — one platform, two front doors
- Workers have no visibility of SDP Global Pay branding at any point
- Payslips show the legal employing entity (SDP entity or business entity), not Eleva

**Community Vision:** Eleva is not just a portal — it is a community platform for workers and contractors. By bringing workers together, Eleva creates a network effect that opens future possibilities:
- Workers can connect with each other (skills, experience, industries)
- Businesses can discover and connect with workers through Eleva (talent marketplace)
- Workers can find opportunities through the Eleva community
- This positions Eleva as a long-term platform play, not just a payslip viewer — the community is the moat

**Use Cases / Scope:**
- Eleva-branded login, signup, and onboarding pages for workers
- Eleva-branded dashboard and all authenticated pages workers interact with
- Separate value proposition messaging focused on workers (financial wellbeing, career management, pay visibility, community) — no B2B messaging
- Community features: worker profiles, networking, skills showcasing
- Future: business-to-worker discovery and connection through Eleva (talent marketplace)
- Future: financial management tools, career development tools, and other worker-centric features

**What Needs to Be Built:**
1. Eleva brand config — new colour palette, logo, tagline, and brand name alongside existing SDP config
2. Brand context/provider — detects window.location.hostname on load; supplies active brand (SDP or Eleva) to the entire app
3. Brand-aware pages — login, signup, navigation, sidebar, header, and landing pages read from brand context instead of hardcoding SDP assets
4. Eleva content — worker-focused marketing copy, hero messaging, and value proposition pages
5. Email sending domain — consider whether worker emails (contracts, payslips, invites) should come from @elevaplatform.com rather than @sdpglobalpay.com (requires separate verified domain in Resend)
6. DNS / infrastructure — point elevaplatform.com to the same deployment as sdpglobalpay.com

**Effort Estimate:** Medium
- Brand context and CSS theming: low effort (infrastructure already exists via sdp-brand-shared package and CSS variables)
- Updating all public-facing pages to be brand-aware: moderate effort
- Eleva content, logo, and assets: content/design work outside of engineering

**Future Wishlist for Eleva (to be expanded separately):**
- Worker financial management tools
- Career and skills tracking
- Eleva as a standalone worker app (potentially tied to the dual-role feature — Feature #1)

---

## 3. Business-Owned Entities (SaaS/PaaS Hybrid Model)

**Discussed:** April 2026 | **Status:** Requirements gathering in progress

**Background:** Some business clients want to act as their own employer of record (EOR) or agent of record (AOR) in their home country rather than using an SDP entity — essentially running their own payroll and HR in their local market. At the same time, they still want to use SDP as the EOR/AOR in other countries where they don't have a legal entity. This creates a hybrid model:
- In their home country: Business uses the platform as a SaaS HR/payroll tool — they are the employer, SDP is just the software provider
- In other countries: Business uses SDP as EOR/AOR as normal (PaaS model)

**Core Concept:** Allow a business to register one or more of their own legal entities on the platform. These entities would behave like SDP entities but are exclusively owned and used by that business — other businesses cannot access them. Contracts, payroll, and compliance in those jurisdictions flow through the business's own entity rather than SDP's.

**Current Architecture (How It Works Today):** The countries table doubles as the SDP entity table — each country record contains SDP's legal company name in that jurisdiction (e.g. "SDP Solutions Ltd" for NZ). Every contract points to a country, and that country record IS the SDP entity. There is already a niche sdpEntityId field on contracts to override which SDP entity handles it, but it still only points to SDP-owned records. The businesses table is completely separate.

**What Needs to Be Built — Layer by Layer:**
1. **New businessEntities table (foundational — everything else depends on this)** — A business-owned equivalent of the SDP country/entity record. Would store the business's legal company name, ABN/tax ID, bank details, registered address, and which country it covers. Linked to the owning business and only accessible to them. Leaves the existing SDP entity model completely untouched.
2. **Contract routing logic (moderate complexity)** — Today contracts always route through an SDP entity. A new field is needed on the contract to declare "who is the employing entity — SDP or this business's own entity?" Could be automatic (if the business has their own entity for that country, offer it as an option) or manual selection at contract creation.
3. **Contract template variable substitution (moderate)** — Templates currently use variables like {{sdpEntityName}}, {{sdpEntityAddress}}, {{sdpEntityBankAccount}}. When a business entity is the employer, these must resolve to the business's own entity details instead. Requires the merge/generation logic to be entity-aware.
4. **Payslips (moderate–high)** — Currently issued "from" SDP. Would need to be issued from the business entity when they are the employer.
5. **Invoices (moderate–high)** — Currently SDP invoices the business for EOR services. In the self-entity model there may be no SDP services invoice at all — or just a platform/SaaS fee invoice. Invoice generation logic needs to distinguish between the two models.
6. **Payroll disbursements (high — depends on open questions below)** — The biggest variable. Three possible models, each with very different engineering scope:
   - SDP still processes payroll on the business's behalf → moderate extra work, mostly configuration
   - Business runs their own payroll externally, platform is record-keeping only → simpler but platform is less sticky
   - Business pays workers directly through the platform → most complex, needs payment rails bypassing SDP's entity
7. **Access control enforcement (moderate)** — Business-owned entities must be fully siloed — no other business can see or use them. SDP admins retain full visibility across everything for oversight. Straightforward to implement but must be enforced consistently across all API routes.
8. **Billing differentiation (moderate)** — Per-contract tracking of whether SDP is acting as EOR (PaaS fee) or just providing software (SaaS fee). Required for correct revenue reporting and invoicing to the business.

**Effort Summary:**

| Area | Effort |
|---|---|
| New businessEntities table and management UI | Low–Medium |
| Contract routing logic | Medium |
| Access control enforcement | Medium |
| Contract template variable substitution | Medium |
| Payslip and invoice re-routing | Medium–High |
| Billing differentiation | Medium |
| Payroll disbursement flows | High (scope depends on open questions) |

**Key Open Questions to Resolve in Requirements Gathering:**
- Who moves the money? — This is the biggest unknown and most affects scope
- Will the business manage their own payroll calculations and disbursements, or does SDP still process payments on their behalf?
- How does compliance and liability differ when the business is the EOR vs SDP?
- Does SDP charge differently for SaaS (own entity) vs PaaS (SDP entity) per contract? Billing model needs to be defined
- Are there countries where SDP would not permit a business to self-serve as EOR due to regulatory risk?
- Who is responsible for compliance updates in the business's own entity jurisdictions?

---

## 4. HRMS Add-On (Human Resource Management Features)

**Discussed:** April 2026 | **Status:** Requirements gathering in progress

**Background:** As a natural extension of the platform — especially for businesses using Feature #3 (their own entity/SaaS model) — there is demand for a full HRMS layer. This would be offered as a paid add-on, only available to businesses on a qualifying subscription tier.

**Known Feature Areas (Requirements Being Gathered):**
- Hiring requests — internal job requisition workflow (raise a hiring request, get approval, link to a contract)
- Onboarding — structured onboarding checklists, document collection, and task management for new starters
- Performance management — goal setting, review cycles, feedback, and ratings
- Leave management — leave requests, approvals, balances, and accruals
- Employee records — full HR file per worker including documents, notes, and history
- Org chart / reporting lines — visual structure of the business
- Offboarding — structured exit process

**Subscription / Access Model:**
- HRMS features should be gated behind a specific subscription plan or add-on
- Businesses not subscribed should not see HRMS menus/features
- SDP needs a way to enable/disable HRMS access per business account
- Potential to offer HRMS tiers (e.g. basic onboarding only vs full performance management suite)

**AI Opportunities Within HRMS:** HRMS is one of the richest areas for AI on the platform. Key opportunities:
- Hiring — AI-assisted job description writing, suggested role requirements based on similar past hires, ranking and shortlisting candidates
- Onboarding — conversational onboarding guide (worker is walked through steps by an AI assistant rather than a static checklist), auto-identification of missing documents based on country requirements
- Performance management — AI-generated performance review summaries, trend analysis across review cycles, flagging workers who may be at flight risk based on engagement signals
- Leave and absence — anomaly detection (unusual leave patterns), predictive leave liability forecasting for the business
- Employee records — natural language search across HR records ("show me all workers in Australia who haven't completed compliance training"), auto-classification of uploaded documents
- People analytics — AI-generated insights on headcount trends, turnover risk, compensation benchmarking, and workforce planning
- HR policy assistant — workers can ask HR policy questions ("How many days of sick leave am I entitled to?") and get instant, accurate answers from their contract and jurisdiction rules

*The AI layer (Feature #6) provides the shared infrastructure — HRMS plugs into it rather than building its own AI separately.*

**Relationship to Other Features:**
- Closely linked to Feature #3 — businesses running their own entity are the most likely buyers of HRMS
- Could also tie into Feature #1 (dual-role users) — a worker in HRMS context may also be a business user
- Eleva (Feature #2) surfaces HRMS information to workers (onboarding tasks, leave balances, performance reviews, career development)
- Feature #6 (AI Layer) powers the intelligent features within HRMS — not built separately

**What Needs to Be Built (High Level — Detail to Follow After Requirements):**
1. Subscription/feature flag system — mechanism to enable HRMS features per business account
2. Hiring request module — requisition form, approval workflow, link to contract creation
3. Onboarding module — task lists, document uploads, welcome flows
4. Performance module — review templates, cycles, and ratings
5. Leave module — leave types, balances, request and approval flow
6. HR records — extended worker profile with HR-specific fields and document storage

---

## 5. Global Payroll Platform

**Discussed:** April 2026 | **Status:** High priority — to be scoped

**Background:** The platform currently has many of the raw ingredients for payroll but no automated payroll engine. The vision is to build a fully automated global payroll platform that handles every worker type (timesheet-based, salaried, casual, fixed-term, gig) across all countries — sellable as a standalone global payroll product.

**Important Note — Current Stop-Gap Arrangement:** The platform already has a payslip upload feature that acts as a temporary bridge. Payroll is currently processed entirely outside the platform (manually by SDP), and the resulting payslip is then uploaded into the platform. From both the worker's and the business's perspective it appears seamless — they see payslips in one place alongside contracts and timesheets. This stop-gap is intentional and buys time while the full payroll engine is built. The end goal is to replace the manual processing with an automated in-platform pay run, with no change to what the worker or business sees.

**What Already Exists (Platform Foundations):**
- All major employment types already defined: contractor, permanent, fixed_term, casual, gig_worker, zero_hours, at_will, on_call, seasonal, part_time
- Rate types: annual, hourly, daily
- Timesheets — workers already submit timesheets per period
- Payslips table — has payPeriodStart, payPeriodEnd, grossTaxableWages, tax, netPay fields, but currently populated manually via the stop-gap upload
- Remuneration lines — base salary, allowances, bonuses, commissions (already modelled)
- Jurisdictions table — exists with tax rate fields (e.g. "Payroll tax NSW")
- Leave requests — already modelled, needs to feed into payroll
- Multi-currency — contracts already carry currency

**What Does Not Exist (Needs to Be Built):**

1. **Pay Run Engine (core — everything else hangs off this)** — A scheduled or manually triggered process that calculates pay using the following defined structure:
```
Base Salary / Earnings + Entitlements        (salary or timesheet-based earnings, leave loading, etc.)
+ Before-Tax Additions                        (e.g. ad hoc bonus, allowances taxable pre-deduction)
− Before-Tax Deductions                       (e.g. car lease / novated lease in AU, HRA in India, salary sacrifice)
− Tax                                         (calculated by the tax engine for the relevant country)
+ After-Tax Additions                         (e.g. tax-free travel allowance, expense reimbursements)
− After-Tax Deductions                        (e.g. garnishments, voluntary deductions)
= Net Pay

Separately reported (not netted):
  Retirement / Savings Contributions          (e.g. Superannuation AU, KiwiSaver NZ, EPF/PF IN, CPF SG)
  — these are employer obligations reported alongside the payslip but treated separately from net pay
```
   The engine:
   - Collects approved timesheets for the pay period (for hourly/daily workers)
   - Takes salary and divides by pay frequency (for salaried workers)
   - Applies each layer of the above calculation in sequence
   - Produces a net pay figure and a full payslip breakdown per worker
   - Moves the pay run through a draft → reviewed → approved → paid workflow

2. **Tax Calculation Engine (highest complexity — country by country)** — Every country has different rules. Examples:
   - Australia: PAYG withholding, superannuation (11.5%), Medicare levy, TFN declarations
   - UK: PAYE, National Insurance (employee + employer), pension auto-enrolment
   - USA: Federal income tax brackets, FICA (Social Security + Medicare), state taxes vary by state, FUTA/SUTA
   - New Zealand: PAYE, KiwiSaver, ACC levies
   - Singapore: CPF contributions (rates vary by age and residency)
   - Philippines, Malaysia, India, Ireland, Germany, etc. — each with own rules

   **Decision:** Build in-house, rolling out 2 countries at a time. Third-party payroll tax APIs (KeyPay, Symmetry, Staffology, etc.) were considered but most operate as direct competitors in the EOR/payroll space, creating dependency and conflict risk. Building in-house gives full control, no competitor reliance, and keeps the platform genuinely differentiated as a global payroll product.

   **Rollout strategy:**
   - Launch with 2 countries (likely Australia and New Zealand as the home market anchor)
   - Add 2 countries per release cycle, prioritising by where SDP has existing business volume
   - Each country module contains: tax brackets and rates, statutory deductions, employer contributions, pay frequency rules, and compliance filing requirements
   - Tax data is maintained in a structured, admin-editable format so annual rate changes (e.g. superannuation rate increases, new tax thresholds) can be updated without code deployments
   - This is acknowledged as ongoing maintenance work — tedious but manageable, and owning the data is a strategic asset

   **Suggested country rollout order (to be confirmed):**
   1. Australia + New Zealand (anchor markets)
   2. UK + Ireland
   3. Singapore + Malaysia
   4. USA (complex — state-by-state variation, may need its own dedicated phase)
   5. Philippines, India, Germany, etc.

3. **Statutory Deductions and Employer Contributions** — Beyond income tax, each country has mandatory employer-side contributions that must be calculated and remitted: Superannuation (AU), KiwiSaver (NZ), CPF (SG), EPF (MY), Provident Fund (IN), National Insurance employer portion (UK), Social Security employer portion (US), etc. These affect the cost to the employer, not just the worker's net pay.

4. **Payslip Auto-Generation** — Replace the current manual PDF upload with auto-generated payslips from the calculated pay run data. Must be country-formatted (correct field names, statutory references, currency formatting per locale).

5. **Payment Rails / Disbursement** — How money actually moves from employer to worker. Options:
   - Integration with a global payments provider (e.g. Wise Business, Airwallex, Payoneer) for multi-currency cross-border payments
   - Local bank transfer rails per country for domestic payments
   - This is a significant integration and compliance exercise (AML, KYC considerations)

6. **Pay Frequency Configuration** — Weekly, fortnightly, semi-monthly, monthly — all need to be supported. Salaried workers: divide annual salary by frequency. Hourly/daily: sum approved timesheet hours × rate for the period.

7. **Leave Integration into Payroll** — Approved leave must reduce or adjust hours in a pay run. Leave loading (e.g. 17.5% in Australia), leave accruals, and paid vs unpaid leave all affect gross pay.

8. **Year-End and Statutory Reporting** — Each country requires annual employer tax filings and worker payment summaries:
   - Australia: Payment Summaries / Single Touch Payroll (STP) submissions to ATO
   - UK: P60s, RTI submissions to HMRC
   - USA: W-2s, 941 quarterly filings
   - NZ: Employment Information (EI) filing to IRD
   - This is both a reporting and a compliance obligation

9. **Payroll Calendar and Compliance Alerts** — A calendar view of upcoming pay runs, tax remittance deadlines, and statutory filing dates per country. Alerts when deadlines are approaching or missed.

10. **Contractor vs Employee Payroll Distinction**
    - Contractors: typically no tax withheld (they manage own taxes), pay against approved invoices or timesheets
    - Employees (permanent, fixed-term, casual): full PAYE/withholding applies
    - Gig workers: depends on jurisdiction — some treat as employees for tax purposes
    - The engine must handle these differently per employment type AND per country

**Effort Assessment:**

| Component | Effort | Notes |
|---|---|---|
| Pay run engine (draft → approve → paid workflow) | High | Core engine, affects everything |
| Tax calculation — simple jurisdictions (2–3 countries) | High | Complex even for one country |
| Tax calculation — all supported countries | Very High | Ongoing maintenance every tax year |
| Tax API integration (alternative to building) | Medium | Faster but adds cost and dependency |
| Statutory employer contributions per country | High | Per-country research + build |
| Payslip auto-generation | Medium | Template per country locale |
| Payment rails integration | Very High | Regulatory, AML/KYC, provider integration |
| Pay frequency configuration | Low–Medium | Configuration layer on existing data |
| Leave integration into pay runs | Medium | Leave model already exists |
| Year-end reporting per country | High | Different format and submission method per country |
| Payroll compliance calendar | Medium | UI + scheduling logic |

**Strategic Recommendation:** The pay run engine and auto-generated payslips are the right starting point — they deliver visible value quickly and use existing timesheet and remuneration data. Tax calculation is where the real complexity and risk lies; a third-party tax API integration is strongly recommended for the first version rather than building tax logic in-house. Payment rails (actually moving money) should be scoped as a separate phase as it carries the most regulatory complexity.

**Relationship to Other Features:**
- Directly required by Feature #3 (Business-Owned Entities) — a business acting as their own EOR needs to run their own payroll through the platform
- HRMS (Feature #4) feeds into payroll — onboarding, leave, and salary changes all affect pay runs
- Eleva (Feature #2) — workers would see their payslips, leave balances, and pay history through the Eleva brand

---

## 6. Platform-Wide AI Layer

**Discussed:** April 2026 | **Status:** Strategic priority — platform-wide approach required

**Background:** The platform already has pockets of automation (e.g. invoice automation). The goal is not to continue adding AI features in a piecemeal way but to take a deliberate, platform-wide approach to AI that increases productivity for all users, answers questions fast, and meaningfully enhances the experience for workers, businesses, and SDP staff alike. The platform is already built using AI tooling — the next step is making AI a first-class feature that users interact with directly.

**Core Principle:** AI should feel like a natural part of the platform, not a bolt-on. Every user type (worker, business, SDP admin) should benefit from AI in ways relevant to their context. The approach must be consistent across the platform — not individual one-off features — so it compounds over time.

**Target Outcomes:**
- Productivity — reduce the time it takes for SDP staff, businesses, and workers to complete tasks
- Fast answers — users should be able to ask questions and get accurate, contextual responses without navigating menus or contacting support
- Better experience — AI surfaces the right information at the right time, reduces errors, and guides users through complex processes

**Feature Areas:**

1. **AI Assistant / Conversational Interface** — A context-aware assistant embedded in the platform. Each user type gets answers relevant to their role:
   - Worker asks "When is my next pay day?" or "What is my leave balance?" → answered instantly from their data
   - Business asks "Show me all contractors whose contracts expire this month" → AI queries and summarises
   - SDP admin asks "Which businesses have outstanding invoices over 30 days?" → instant report
   - Reduces support load on SDP staff significantly

2. **Payroll Automation** (extension of Feature #5)
   - Auto-detect anomalies in timesheets before a pay run (e.g. unusually high hours, missing entries)
   - Flag potential errors in payslip calculations for SDP review
   - Suggest pay run approval or raise exceptions automatically
   - Future: fully automated pay runs with AI validation replacing manual SDP processing

3. **Contract Intelligence**
   - AI review of contract templates — flag missing clauses, potential compliance gaps, or unusual terms
   - Suggest appropriate contract template based on country, employment type, and worker profile
   - Auto-populate contract fields from existing worker and business data, reducing manual entry
   - Summarise a contract in plain language for the worker before they sign

4. **Onboarding Assistance** (links to Feature #4 HRMS)
   - Guide workers through onboarding steps with a conversational flow instead of static forms
   - Alert businesses when onboarding tasks are incomplete or overdue
   - Auto-collect required documents based on country compliance requirements

5. **Invoice and Billing Automation** (extending existing)
   - Extend current invoice automation with AI-powered anomaly detection
   - Auto-match timesheets to invoices and flag discrepancies
   - Predict cash flow based on upcoming payroll obligations and outstanding receivables

6. **Compliance and Regulatory Assistant**
   - Answer questions about employment law, leave entitlements, and payroll obligations per country
   - Alert SDP admins and businesses when regulatory changes affect their workers (e.g. minimum wage updates, superannuation rate changes)
   - Reduce reliance on SDP staff for routine compliance questions

7. **Reporting and Insights**
   - Natural language reporting: "Show me headcount by country for Q1" without building a report manually
   - AI-generated summaries for SDP management (e.g. monthly business health, worker activity trends)
   - Predictive alerts (e.g. contract expiring soon with no renewal in progress, worker hasn't submitted a timesheet)

8. **Eleva AI (worker-facing)**
   - Workers on Eleva can ask questions about their pay, contracts, leave, and career
   - Career suggestions based on skills and contract history
   - Financial wellbeing nudges (e.g. "Your pay this month is 10% lower than last month — here's why")

**Implementation Approach:**
- Platform-wide, not piecemeal — establish a shared AI service/layer that all parts of the platform can call, rather than building isolated AI features per page
- Use OpenAI integration (already installed and configured on the platform) as the foundation
- Build a context layer that supplies the AI with the right data scoped to the logged-in user's role and permissions — AI must never surface data the user shouldn't see
- Start with the assistant (Feature Area 1) as it delivers broad value quickly and establishes the shared infrastructure all other AI features can build on

**What Already Exists:**
- OpenAI integration is already installed and configured on the platform
- Invoice automation is already in place — proves the pattern works and can be extended

**Key Considerations:**
- Data privacy and scoping — AI must be strictly scoped to the user's role. A worker should never see another worker's data via an AI query.
- Accuracy and hallucination — for anything regulatory or financial, AI responses must be grounded in actual platform data, not generated. Retrieval-augmented generation (RAG) approach recommended.
- Auditability — AI-initiated actions (e.g. auto-approving a pay run) must be logged and reversible
- Incremental rollout — start with read-only AI (answering questions, surfacing insights) before moving to AI that takes actions

**Extended AI Sub-Features** *(added April 2026 — appended to original Feature 6, not replacing it)*

9. **AI Instant Answers**
   - Natural language query interface for all users — ask any question about the platform data in plain English
   - Examples: "When will contractor X be paid?", "Why is this margin lower?", "Which timesheets are missing this week?"
   - Rules-based engine pulls live DB data for deterministic, always-accurate answers (no hallucination risk for known facts)
   - OpenAI integration for query parsing and nuanced fallback where rules do not cover the question
   - Role-scoped: worker sees only their own data, business sees only their workers, SDP admin sees all
   - Confidence scoring on each answer — low-confidence answers flagged rather than served as fact
   - Answer history log per user for audit and repeated-question tracking
   - Replaces inbound support conversations — the goal is that users never need to email or call SDP to ask a status question

10. **Proactive Exception Flags**
    - Automated background scanning for conditions that need attention — surfaced before the user asks
    - Examples of flags: missing timesheet for current pay period, rate mismatch between contract and invoice, client approval pending beyond threshold, visa/document expiry approaching, BGV check overdue, payroll processing deadline in 24 hours
    - Flags shown prominently in the relevant dashboard for the affected user (worker, business, or agency)
    - Digest email + in-app notification: daily or weekly summary of open flags per business/agency
    - Configurable thresholds per business (e.g. flag missing timesheets after 2 days, or 5 days)
    - Applies to ALL users — not just agencies. Workers see their own flags, businesses see their workforce flags, SDP admins see platform-wide flags.

11. **Self-Serve & Status Transparency ("No Chase" Design)**
    - Every entity on the platform — timesheet, invoice, BGV check, contract, payroll run, leave request — displays:
      - A clear status badge (e.g. Pending, In Review, Approved, Processing, Paid, Overdue)
      - A last-updated timestamp ("Updated 2 hours ago")
      - A next-action label ("Awaiting client approval", "Processing on Friday 3pm", "Requires your signature")
    - Worker-facing status timeline on their profile — shows every step of their engagement from onboarding to payslip
    - Payroll processing schedule displayed prominently for agencies and businesses: "Next payroll run: Friday 3pm. Timesheets must be approved by Thursday 5pm."
    - Design principle: visibility replaces conversations. No user should ever need to contact SDP to find out "what is happening with X" — the answer is always visible in the platform.

12. **Help & Guidance**
    - In-app contextual help tooltips on complex or unfamiliar fields — shown inline, not requiring navigation away
    - Searchable FAQ and knowledge base accessible from within the platform
    - Onboarding checklists for new businesses, new agencies, and new workers — structured task lists with progress tracking
    - Escalation path clearly defined and signposted: PlacIq (self-serve tier, Feature #9) → SDP Global Pay (managed/enterprise tier) for agencies that grow beyond self-serve capacity or need dedicated account management

---

## 7. Background Verification, Compliance Documents & Pre-Offer Details ✅ BUILT

**Discussed:** April 2026 | **Status:** Requirements defined — built

**Background:** When a business invites a worker to the platform, they may require background checks, compliance documents, and pre-offer information before a contract can be issued. This is not mandatory for all workers — the business selects what is required per invite or via a saved Pack. If no checks are selected, the platform works exactly as it does today. The feature is also available to SDP users who can initiate checks for their own workers or on behalf of a business.

**Three Categories of Requirements:**

1. **Background Checks** (connected to Certn — charged to business) — All identity and criminal history checks run through Certn's API. The business selects which checks are required:
   - Right to work / visa verification
   - Police / criminal history check
   - Identity verification (ID documents, facial biometrics)
   - Credit check
   - Bankruptcy check
   - Others as available from Certn

2. **Compliance Documents** (no charge — document collection only) — Business selects which documents they need from the worker. Each document item has a document upload field, reference number field, and expiry date field. Examples: Working with Children check, industry licences, trade certificates, security licences, professional registrations, industry cards, etc.

3. **Pre-Offer Details** (no charge — information collection only) — Information the business wants before making an offer. Most personal fields already exist in the worker profile. Additional fields to be added: Skills (structured or free text), Resume / CV upload, any other pre-offer information the business specifies.

**BGV Packs** — Packs are a preset combination of background checks, compliance documents, and pre-offer requirements. There are two types:
- **Global Packs** — created and managed by SDP admins. Available to all businesses on the platform.
- **Custom Packs** — created by an individual business and only available to that business.

Examples:
- "Childcare Workers Pack" (Global) — Working with Children check + Police check + ID verification + Working with Children Certificate
- "Security Industry Pack" (Global) — Police check + Security licence + Right to work
- "Acme Corp Driver Pack" (Custom) — Police check + Driver's licence + Drivers Abstract

When inviting a worker, the business or SDP user has three options: select a Global Pack, select one of their own Custom Packs, or select individual items. Packs are a convenience shortcut, not a requirement.

**Contract Gate:**
- If BGV checks or compliance documents are required and not yet complete/approved → contract cannot be sent for signing (blocked with clear status message)
- If no requirements were selected at invite → contract flow works exactly as today, no change

**Billing:**
- Background checks (Certn) only: charged to the business via Stripe at Certn's cost + 10% SDP margin
- Compliance documents and pre-offer details: no charge
- Cost is tracked per check per worker and reported to the business

**End-to-End Flow:**
```
Business creates worker invite
  → optionally selects a Pack (or individual items per category)
  → invite sent to worker
Worker completes onboarding:
  → existing sections: personal details, bank, tax (unchanged)
  → new: skills & resume
  → new: compliance documents (upload + ref no + expiry per item)
  → new: background check consent → triggers Certn API
Certn runs checks → webhook returns results → stored on worker profile
Business / SDP reviews → approves
Contract creation proceeds as normal
  → at send step: if BGV required and not approved → blocked
  → if BGV required and approved → sends as normal
  → if no BGV selected → works exactly as today
Stripe charges business for Certn checks (cost + 10% markup)
On check completion: email notification + SMS notification sent to business contact
```

**Relationship to Other Features:**
- Feeds into HRMS (Feature #4) — hiring request flow would naturally trigger a BGV pack
- Eleva (Feature #2) — workers would see their BGV status and document requirements through the Eleva interface
- AI (Feature #6) — could flag expired compliance documents proactively before they become an issue

---

## 8. Eleva Mobile App (Worker)

**Discussed:** April 2026 | **Status:** Concept — to be scoped

**Background:** A dedicated mobile app for workers under the Eleva brand. Goes beyond a mobile version of the web platform — it becomes the worker's daily companion for work, finances, career, and community. The app starts with core work features and progressively expands into financial wellbeing, marketplace, and community. Eventually it becomes the platform through which workers can find and apply for new opportunities, access financial products, and connect with each other.

**Core Work Features** (extending what already exists on the platform):
- Timesheet entry with geo-tag check-in/check-out — worker checks in at the start of shift and checks out at the end using device GPS. Location is stamped against the timesheet entry, reducing disputes and manual entry errors. Business can set geofences for valid check-in zones.
- Contract viewing and signing — view and e-sign contracts directly on mobile
- Payslip access — view, download, and share payslips
- Leave requests — submit and track leave from the app
- Expense claims — photo receipt capture, categorise, and submit expenses on the go
- Push notifications — pay day alerts, timesheet reminders, contract expiry warnings, document expiry alerts, BGV status updates
- Document vault — store and access important documents (contracts, payslips, licences, certificates)

**Financial Wellbeing Features:**
- Budget planner — worker sets a monthly budget, app tracks income vs spend categories, provides simple visualisations
- Tax estimator — based on earnings to date, estimate annual tax liability so workers aren't caught short at tax time (particularly relevant for contractors managing their own tax)
- Earnings tracker — week-by-week and month-by-month pay history, trends, and projections
- Salary benchmarking — show how their pay compares to market rates for their role and country
- Savings goals — set goals (e.g. holiday, emergency fund) and track progress against earnings
- Multi-currency view — for workers paid across different engagements in different currencies

**Financial Products Marketplace** (offers negotiated by SDP for platform members):
- Personal loans — preferential rates for Eleva members, integrated application flow
- Income protection / insurance — tailored insurance products for contractors and workers
- Health insurance — group rates negotiated for platform members
- Superannuation / retirement — consolidated super finder, contribution tracking, fund switching
- Banking / neo-bank — potential partnership with a digital bank offering Eleva-branded accounts
- Buy now pay later / earned wage access — access a portion of earned but unpaid wages before pay day
- These are partnership/referral integrations — SDP earns referral or white-label margin

**Career & Development Features:**
- Skills profile — maintain a live skills profile that grows with each engagement
- Career progression tracker — visualise career history, roles, industries, and growth
- Training and certifications — recommended courses based on role and skills gaps, track completed certifications
- Licence and certificate reminders — alerts before compliance documents expire (Working with Children, security licence, etc.)

**Community Features:**
- Worker network — connect with other workers in similar industries or locations
- Events — industry events, networking events, SDP-hosted community events, webinars
- Community forums / groups — industry-specific discussions, advice, Q&A
- Referral program — refer other workers to Eleva, earn rewards

**Opportunity Marketplace (future phase):**
- Job board / work opportunities — businesses post opportunities on the platform, Eleva workers can browse and apply directly
- Gig and project work — short-term engagements posted by businesses, workers express interest
- Direct matching — AI-powered matching of worker skills profile to open opportunities (links to Feature #6 AI Layer)
- This turns Eleva from a work management app into a talent marketplace, closing the loop between Feature #2 (Eleva community) and Feature #3 (business-owned entities)

**Geo-Tag Timesheet — Detail:**
- Worker opens app at start of shift → taps Check In → GPS location captured and stored
- Worker taps Check Out at end of shift → time and location captured
- App auto-calculates hours for the period
- Business optionally sets a geofence (e.g. must be within 500m of site address) — check-ins outside geofence flagged for review
- Manual override available for remote or mobile workers where geofencing doesn't apply
- All location data stored against the timesheet record for audit purposes

**Technology Note:** The mobile app would be built using React Native / Expo — this allows code sharing with the existing React web platform (shared business logic, API calls, component patterns) while delivering a true native mobile experience on iOS and Android. The existing platform API serves the app without duplication.

**Phased Rollout Suggestion:**

| Phase | Features |
|---|---|
| Phase 1 | Timesheet (with geo check-in), payslips, contracts, leave, push notifications |
| Phase 2 | Budget planner, earnings tracker, document vault, expense claims |
| Phase 3 | Financial products marketplace, career tools, community |
| Phase 4 | Opportunity marketplace, AI matching, direct work applications |

**Relationship to Other Features:**
- Eleva brand (Feature #2) — the app IS the Eleva experience on mobile; same brand, same community vision
- BGV (Feature #7) — workers complete compliance documents and check consents through the app
- Payroll (Feature #5) — payslips and earnings data feed the budget planner and financial features
- HRMS (Feature #4) — leave requests, onboarding tasks, performance check-ins accessible on mobile
- AI (Feature #6) — powers job matching, budget insights, career recommendations within the app

---

## 9. PlacIq — Agency-Facing Brand

**Discussed:** April 2026 | **Status:** Requirements defined — to be scoped

**Background:** SDP Global Pay operates a third brand called PlacIq (domain: placiq.com), targeted specifically at small-to-mid recruitment agencies. Like Eleva for workers, PlacIq is the same platform with the same database and API — agencies simply see PlacIq branding and an agency-optimised dashboard. This is not a separate product. It is the same system through a third front door.

**The Niche — "Structured Agency Back Office"**

| Attribute | Detail |
|---|---|
| Target size | 1–20 consultant recruitment agencies |
| Industries | IT, healthcare, white-collar contracting |
| Contractor volume | 5–200 contractors per agency |
| Positioning | Not enterprise. Not bespoke. Structured and self-serve. |

**Why Agencies Need PlacIq — The Reality of Running an Agency:**
1. **Fear of losing contractors** — Contractors are revenue. Any delay or confusion → panic. They expect instant answers.
2. **Cashflow stress** — Paid by client in 14–45 days. Need to pay contractors weekly. Funding is critical.
3. **"Yes to everything" behaviour** — Agencies accept custom rates, complex timesheets, client-specific invoicing rules, then dump complexity on their back-office provider.
4. **High urgency / pushiness** — "Need payroll done NOW." "Client asked for this TODAY." They expect exceptions as standard.

**Our Model: "Controlled Flexibility Platform"**

PlacIq is not a service provider. It is an operating system that agencies must fit into. We do not fight the pushy nature of agencies — we channel it into the system:

Instead of: *"Can you check this urgently?"*
They see: *Dashboard: "Payroll processing at 3pm Friday" | Status: "Approved / Pending"*

Visibility replaces conversations. The platform gives the "always available" illusion — agencies feel like they have instant support, but it is the platform answering, not a person.

**How It Works — Brand Gating:**
- A business registers on the platform and selects "Agency" as their business type
- Once registered as an agency, they are served the PlacIq brand (logo, colour palette, messaging) across all authenticated pages
- The underlying platform is identical — contracts, timesheets, invoices, BGV, payroll all work exactly as they do for any other business
- SDP Global Pay branding is never shown to PlacIq users

**PlacIq Dashboard — Agency-Specific View:**
- **Payroll processing schedule** — prominently displayed: "Next payroll run: Friday 3pm. Timesheets must be approved by Thursday 5pm."
- **Outstanding client payments panel** — which client invoices are unpaid and when they are due (cashflow at a glance)
- **Contractor count and margin summary** — active contractors this week, total margin this pay period
- **Exception flag panel** — missing timesheets, pending approvals, rate mismatches (links to Feature #6 Proactive Flags)
- **AI Instant Answers** — "When will contractor X be paid?" answered instantly (links to Feature #6 AI Instant Answers)

**Escalation to SDP Global Pay:**
- PlacIq is the self-serve entry tier — designed for agencies that can run themselves within the structured system
- If an agency grows beyond ~50 contractors, needs a dedicated account manager, requires bespoke invoicing rules, or needs managed services, they are escalated to SDP Global Pay
- Clear escalation CTA shown in PlacIq: *"Running 50+ contractors or need dedicated support? Talk to SDP Global Pay."*
- SDP Global Pay can charge higher fees and provide a customer-managed solution for these clients

**Relationship to Other Features:**
- Feature #6 (AI Layer) — PlacIq relies on AI Instant Answers, Proactive Flags, and Self-Serve Transparency as core platform capabilities, not agency-only features
- Feature #2 (Eleva) — Same multi-brand architecture pattern. One system, three front doors: SDP Global Pay (enterprise/business), Eleva (workers), PlacIq (agencies)
- Feature #7 (BGV) — Agencies use BGV packs for contractor compliance checks as standard

---

## Brand & Website Design Reference

*One system, three front doors. All three brands run on the same platform, same database, same API. Brand is served based on hostname at load time. This section is the design and content reference for all three — to be used when building landing pages, email templates, onboarding flows, and marketing materials.*

---

### SDP Global Pay — sdpglobalpay.com

**Audience:** Businesses, HR teams, finance teams, enterprise procurement, multi-country employers.

**Tone:** Authoritative, professional, compliance-forward, trust-building. This is the enterprise face of the platform.

**Colour Palette:** Deep navy / slate grey / white / gold accent.

**Homepage Structure:**
- Hero: *"The Global Workforce Operating System"* — sub-headline: "Hire, pay, and manage workers in any country. Contracts, payroll, compliance, and BGV in one platform."
- Feature pillars: Employer of Record, Global Payroll, Background Verification, Contracts & Compliance, HRMS Add-On
- Social proof: countries covered, workers managed, businesses onboarded
- CTA: Book a Demo / Start Free Trial

**Navigation:** Solutions (by use case: EOR, Payroll, BGV, HRMS), Pricing, Resources, Login, Book a Demo

**Key Pages:**
- Employer of Record explainer (what it is, how SDP handles it)
- Global Payroll (the platform capability + stop-gap vs automated distinction)
- BGV (packs, Certn integration, compliance documents)
- Country Guide library (per-country compliance overview)
- Pricing (tiered: SaaS self-serve vs PaaS managed)
- Contact Sales

---

### Eleva — elevaplatform.com

**Audience:** Workers and contractors globally — permanent, casual, fixed-term, gig, and freelance.

**Tone:** Warm, empowering, community-focused, financially encouraging. Nothing corporate. Workers should feel this platform is built for them.

**Colour Palette:** Vibrant teal / coral / warm white. Contrasts sharply with SDP's corporate palette — intentionally different to signal a completely different audience.

**Homepage Structure:**
- Hero: *"Your work. Your pay. Your community."* — sub-headline: "See your pay, manage your contracts, and connect with a community of workers like you."
- Worker benefit pillars: Pay Visibility, Contract Management, Leave & Expenses, Community & Career, Financial Wellbeing
- Worker testimonials / community stories
- App download CTA (once mobile app is built)
- Community preview — show the network effect, not just the admin features

**Navigation:** Features, Community, Financial Tools, Download App, Log In

**Key Pages:**
- How Eleva works (worker journey from invite to payslip)
- Financial Wellbeing Tools (budget planner, tax estimator, earnings tracker)
- Community (what the worker network looks like and how to join)
- Download Mobile App (Phase 1 launch page)

**Important Rules:**
- SDP Global Pay name and logo must never appear on elevaplatform.com
- Legal entity on payslips and contracts is the employing entity (SDP or business), not Eleva — Eleva is the experience layer only
- All copy is worker-first — no B2B language, no "employer" POV

---

### PlacIq — placiq.com

**Audience:** 1–20 consultant recruitment agencies running IT, healthcare, and white-collar contracting with 5–200 contractors.

**Tone:** Efficient, structured, no-nonsense. *"You are in control."* Direct, practical language. No fluff. Addresses agency pain points (cashflow, contractor panic, timesheet chasing) head-on.

**Colour Palette:** Clean mid-blue / white / orange accent. Modern but not corporate-heavy — approachable but professional.

**Homepage Structure:**
- Hero: *"The Back Office Your Agency Actually Needs"* — sub-headline: "Stop chasing timesheets. Stop fielding 'when do I get paid?' calls. Run your contractor business on a platform built for agencies."
- Pain-point-led copy (call out their daily frustrations):
  - "Contractors always asking when they'll be paid? The answer is in the dashboard."
  - "Cashflow stress? See every outstanding client invoice in one view."
  - "Timesheet chaos? Automated reminders and approval workflows handle it."
- Feature pillars: Payroll Schedule, Live Status on Everything, AI Instant Answers, Proactive Exception Flags
- Agency size selector: "Running under 50 contractors? PlacIq is built for you. Over 50 or need dedicated support? Talk to SDP Global Pay."
- CTA: Start Free / Book a 15-min Demo

**Navigation:** Features, Pricing, For Agencies, Log In, Get Started

**Key Pages:**
- How PlacIq works (agency journey: sign up as agency → branded dashboard → payroll runs → contractor visibility)
- Pricing (self-serve tier vs SDP Global Pay enterprise — clearly show when to upgrade)
- Agency Dashboard Demo (interactive or video walkthrough of the PlacIq dashboard)
- FAQ (answers the top 10 agency questions: "Can I use my own invoice format?", "How do I handle multiple client rates?", etc.)

**Escalation Messaging** (appears on pricing page and in-app):
> *"Running 50+ contractors or need a dedicated account manager? You've outgrown self-serve. Talk to SDP Global Pay for a fully managed solution."*

---

*More features to be added here as discussed. Always append — never overwrite or compress existing entries.*
