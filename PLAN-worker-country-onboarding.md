# Dynamic Worker Details by Country and Worker Type

**Status:** Proposed implementation specification; not implemented or legally certified. Revised 2026-10-20 to match the SDP Global Pay codebase; supersedes the draft of the same name.

**Scope:** Dynamic worker onboarding, My Details, Worker administration, database changes, backfill, API behaviour, security, and testing.

**Controlling inputs:** The country and employee/contractor classification saved on the Worker screen.

**Country coverage:** Ten countries exist in the Country table today: Australia, Canada, Ireland, India, Japan, New Zealand, Philippines, Singapore, United Kingdom and United States. The seven other countries configured below (Romania, Malaysia, Vietnam, Brazil, Pakistan, Sri Lanka, Germany) have no `countries` row yet. `workers.countryId` is a foreign key to that table, so each of them needs a row (added to `storage.initializeCountries` and to Country administration) and an approved configuration before a policy can be activated.

This document is the complete engineering scope, not confirmation that its changes have been deployed. Country-specific field names and proposed requirements need local payroll/compliance approval before becoming blocking rules. Sections 8–18 define the storage and implementation details missing from the initial field specification.

**Current data (dev database, 2026-10-20):**

| Item | Value |
|---|---|
| Rows in `countries` | 10 (`au`, `ca`, `ie`, `in`, `jp`, `nz`, `ph`, `sg`, `uk` with code `GB`, `us`) |
| Worker rows | 31: 21 AU, 3 NZ, 2 PH, 2 SG, 1 IE, 1 UK, 1 with no country |
| `worker_change_log` rows holding plaintext bank account numbers | 2 |

## 1. Purpose

The details requested from a worker must be determined by:

1. `countryId` selected when the worker is created or edited in the Worker screen.
2. `workerType` selected in the Worker screen:
   - `employee`
   - `contractor`

The worker must not choose a different onboarding country or worker type. These values are controlled by authorised SDP staff or an authorised business creating its own worker and are shown read-only during onboarding. Existing restrictions on changing engagement type while live contracts exist (`WORKER_TYPE_LOCKED`, `storage.hasLiveContractForWorker`) must remain in place.

**Two creation paths set no country today and must be covered by this specification:**

- **Contractor self-signup** (`POST /api/signup` without an invitation token) creates a worker row with `countryId = null` and no business.
- **Dual-role worker rows** (`storage.ensureSelfWorkerRow`, created when a business user adds the worker role) are written with `countryId: null`.

Proposed rule: self-signup asks for the country once, as a read-only-after-save step of signup; dual-role rows land in an SDP repair queue ("Country setup incomplete") until SDP sets the country. Until the chosen rule ships, the worker-editable Country select added to My Details on 2026-10-20 remains; it is removed in the same release, leaving the read-only country chip.

This specification replaces generic or Australia-specific onboarding fields with one country-aware configuration used by:

- Worker onboarding
- Worker **My Details**
- SDP/business worker view and edit screens
- Server-side completion validation

Third-party workers (`workerType = third_party_worker`) are outside this flow because they do not currently receive a direct worker login.

## 2. Field Status

- **Required**: Must be completed before the relevant onboarding section is complete.
- **Conditional**: Required only when the stated condition applies.
- **Optional**: May be supplied but does not block onboarding.

Final production validation rules should be confirmed with local payroll/compliance advisers. The application should identify these as payroll and onboarding data requirements, not legal advice.

**Approval rule:** "Required" in the country matrix below means proposed required status, not a verified statutory obligation. Unapproved requirements can be displayed as drafts to SDP reviewers but cannot block a live worker. An accepted exemption, pending identifier, or employer-managed item must follow its approved exception rule rather than requiring a fabricated value.

**Data-minimisation rule:** Do not require a passport, national ID, nationality, date of birth, or emergency contact from every contractor merely because the employee form collects it. The common-field rules below and the approved purpose of collection take precedence over broad labels in the country matrix.

## 3. Shared Fields for All Countries

### 3.1 Personal and contact details — employee and contractor

| Field | Status |
|---|---|
| Legal first name | Required |
| Legal middle name(s) | Optional |
| Legal last name | Required |
| Preferred name | Optional |
| Personal email | Required |
| Mobile number, including country code | Required |
| Date of birth | Conditional on approved payroll, eligibility, or identity-check requirements |
| Nationality | Conditional on an approved payroll/work-authorisation purpose |
| Work authorisation status | Conditional for employees or a documented contractor requirement |
| Work authorisation type and expiry | Conditional when evidence is required; citizenship alone must not determine expiry requirements |
| Identity document type | Conditional on an approved identity/right-to-work requirement |
| Identity document number | Conditional on the required identity check; do not collect separately if verification evidence is sufficient |
| Identity document expiry | Conditional when the document expires |
| Identity document upload | Conditional on the approved verification workflow |
| Emergency contact name | Conditional for employees; optional for contractors unless justified |
| Emergency contact relationship | Required when an emergency contact is supplied |
| Emergency contact phone | Required when an emergency contact is supplied |
| Emergency contact email | Optional |

Only first name, last name, email, phone, date of birth, address and emergency contact exist as `workers` columns today; the other rows above are new fields in the typed value store (section 10).

### 3.2 Residential address — employee and contractor

The address labels and validation come from the selected country configuration.

| Field | Status |
|---|---|
| Address line 1 | Required |
| Address line 2 | Optional |
| City/locality | Required |
| State/province/region/county | Required where used by the country |
| Postal/ZIP code | Required where used by the country |
| Country | Read-only; inherited from Worker screen |

### 3.3 Bank details — employee and contractor

| Field | Status |
|---|---|
| Account holder name | Required |
| Bank name | Required |
| Account currency | Required |
| Account number or IBAN | Required |
| Country-specific clearing/routing field | Required where used |
| SWIFT/BIC | Conditional for cross-border payment |
| Proof of bank account | Optional by default; configurable as required |

### 3.4 Contractor business details — contractors only

| Field | Status |
|---|---|
| Contractor structure | Required: individual/sole trader, company, partnership, or other locally valid structure |
| Legal business name | Required for registered entities; optional for an individual |
| Trading name | Optional |
| Registered business address | Required for registered entities |
| Business email | Required |
| Business phone | Optional |
| Country-specific business/tax registration numbers | As specified below |
| Indirect tax registration status | Required yes/no |
| Indirect tax number | Conditional when registered |
| Registration certificate upload | Conditional for registered entities |

Employees must not see contractor business-registration or indirect-tax fields unless a country-specific employee declaration explicitly requires them.

Employee/contractor classification does not by itself settle statutory entitlements. If an approved local rule requires a contribution or declaration for a contractor—for example, a particular Australian labour-only arrangement—the policy must show that specific conditional requirement and route uncertain cases to SDP review. Do not copy the entire employee pension/tax form into the contractor flow.

## 4. Country Configuration

Countries marked **(not yet in the Country table)** need a `countries` row before their policy can be activated.

## Australia (AU)

**Address labels:** Suburb; State/Territory; Postcode.  
**Bank fields:** BSB and account number.

### Employee

- Tax File Number (TFN) — required, with an allowed "not supplied/exemption" workflow.
- Tax residency status — required.
- Claim tax-free threshold — required yes/no.
- HELP/VSL/financial supplement debt — required yes/no.
- Working holiday maker status — required yes/no.
- Super fund choice — required:
  - Fund name
  - Fund ABN
  - USI
  - Member number, conditional for an existing fund
- Super choice/compliance document — conditional.

### Contractor

- TFN — conditional for individual/sole trader.
- Australian Business Number (ABN) — required unless an approved "no ABN" exception is recorded.
- Australian Company Number (ACN) — conditional for a company.
- GST registered — required yes/no.
- GST registration number/ABN — conditional when GST registered.
- Business structure and registration evidence — conditional for registered entities.

## New Zealand (NZ)

**Address labels:** Suburb; City/Town; Region; Postcode.  
**Bank fields:** NZ bank account number.

### Employee

- IRD number — required, with an allowed "applied for/not yet issued" status.
- IR330 tax code — required.
- KiwiSaver status — required:
  - Existing member
  - New enrolment
  - Opt-out/exempt
- KiwiSaver employee contribution rate — conditional for a member.
- KiwiSaver provider and member number — optional.
- Student loan deduction — required yes/no.

### Contractor

- IRD number — required.
- NZBN — conditional for a registered business (no column exists today; new typed field).
- Company number — conditional for a company.
- GST registered — required yes/no.
- GST number — conditional when registered.
- Withholding tax/ schedular payment status and rate — conditional when the engagement uses schedular payments.

## United States (US)

**Address labels:** City; State; ZIP code. State is required and selected from the US state list.  
**Bank fields:** ABA routing number, account number, and account type.

### Employee

- Social Security Number (SSN) — required.
- Federal Form W-4 data — required:
  - Filing status
  - Multiple jobs/spouse works
  - Dependants amount
  - Other income/deductions
  - Additional withholding
- State withholding declaration — conditional by selected state.
- Work authorisation/I-9 document workflow — required.
- 401(k) details — optional unless a plan is offered and selected.

### Contractor

- Federal tax classification — required.
- Form W-9 data — required for US persons:
  - Legal name
  - Business name, if different
  - SSN or EIN
  - Federal tax classification
  - Exemption codes, if applicable
- Form W-8 series/document — conditional for non-US persons.
- State business registration/license — conditional.
- Sales-tax registration — conditional by state and service.

## Ireland (IE)

**Address labels:** Town/City; County; Eircode.  
**Bank fields:** IBAN and BIC.

### Employee

- Personal Public Service Number (PPSN) — required, with a pending-status option.
- Revenue payroll registration status — required.
- Tax basis/certificate details — optional display data when received from payroll.
- PRSI class — assigned by payroll, not worker-editable.
- Pension details — optional when applicable.

### Contractor

- PPSN or Irish tax reference number — required based on structure.
- CRO company number — conditional for a company.
- VAT registered — required yes/no.
- VAT number — conditional when registered.
- Tax clearance/access number — conditional when required for the engagement.

## Philippines (PH)

**Address labels:** Barangay; City/Municipality; Province; Postal code.  
**Bank fields:** Bank/branch and account number.

### Employee

- BIR Tax Identification Number (TIN) — required.
- SSS number — required.
- PhilHealth number — required.
- Pag-IBIG/MID number — required.
- Civil status — required for payroll records.
- Dependants — conditional where payroll/benefits require them.

### Contractor

- BIR TIN — required.
- Individual/business registration type — required.
- BIR Certificate of Registration details — conditional for a registered business/professional.
- SEC or DTI registration number — conditional by structure.
- VAT or percentage-tax registration status and number — conditional.
- Official receipt/invoice registration details — conditional.

## Japan (JP)

**Address labels:** Prefecture; City/Ward; Postal code.  
**Bank fields:** Bank code/name, branch code/name, account type, account number, account holder name in the bank-required script.

### Employee

- My Number — required, stored as highly sensitive data.
- Pension number — required or pending.
- Health insurance number — conditional if already enrolled.
- Employment insurance number — conditional if previously issued.
- Resident tax municipality — required.
- Dependant declaration — conditional.

### Contractor

- My Number — required for an individual.
- Corporate number — conditional for a company.
- Qualified invoice issuer registration number — conditional when registered.
- Consumption-tax registration status — required yes/no.
- Business registration/trade name — conditional.

## Canada (CA)

**Address labels:** City; Province/Territory; Postal code. Province/Territory is required.  
**Bank fields:** Institution number, transit number, and account number.

### Employee

- Social Insurance Number (SIN) — required.
- Federal TD1 declaration — required.
- Provincial/territorial TD1 declaration — required.
- Work permit details and expiry — conditional.
- Quebec-specific payroll identifiers/declarations — conditional when province is Quebec.
- Pension/benefit plan details — optional where offered.

### Contractor

- SIN — conditional for an individual.
- Business Number (BN) — conditional for a registered business.
- GST/HST registered — required yes/no.
- GST/HST number — conditional when registered.
- QST number — conditional for Quebec registration.
- Provincial business registration — conditional.

## United Kingdom (GB)

The Country table row is `id = 'uk'` with `code = 'GB'`; policies are keyed by the ISO code (section 9.1).

**Address labels:** Town/City; County optional; Postcode.  
**Bank fields:** Sort code and account number; IBAN/BIC optional for international payment.

### Employee

- National Insurance number — required or pending.
- P45 availability — required yes/no.
- Starter checklist declaration — conditional when no P45.
- Tax code — optional if known; payroll-controlled after HMRC notification.
- Student/postgraduate loan plan — required selection.
- Workplace pension status — required when eligible:
  - Enrol
  - Opt out
  - Postpone/not eligible
- Pension provider and member number — optional/conditional.

### Contractor

- Unique Taxpayer Reference (UTR) — required for sole traders.
- National Insurance number — conditional for an individual.
- Companies House number — conditional for a company.
- VAT registered — required yes/no.
- VAT number — conditional when registered.
- CIS details — conditional for construction engagements.

## Romania (RO) (not yet in the Country table)

**Address labels:** Locality; County/Sector; Postal code.  
**Bank fields:** IBAN and BIC.

### Employee

- Personal Numeric Code (CNP) — required for Romanian nationals/residents.
- Passport/residence permit number — conditional.
- Health-insurance status/details — required or pending.
- Pension/social-insurance identifier — conditional if separately issued.
- Dependants/tax deduction declaration — conditional.

### Contractor

- CNP — conditional for an authorised individual.
- Fiscal identification code (CUI/CIF) — required for registered businesses.
- Trade Registry number — conditional for registered entities.
- VAT registered — required yes/no.
- VAT number — conditional when registered.
- Entity type, including PFA/company — required.

## Singapore (SG)

**Address labels:** Block/House number and street; Unit; Postal code.  
**Bank fields:** Bank/branch code and account number.

### Employee

- NRIC or FIN — required.
- Residency/work-pass type — required.
- Work-pass number and expiry — conditional.
- CPF contribution status — required.
- CPF account is associated through NRIC/FIN; do not request a separate invented CPF number.
- Skills Development Levy/other payroll classifications — payroll-controlled, not worker-editable.

### Contractor

- NRIC/FIN — required for an individual.
- Unique Entity Number (UEN) — conditional for a registered entity.
- ACRA entity type — conditional.
- GST registered — required yes/no.
- GST registration number — conditional when registered.

## Malaysia (MY) (not yet in the Country table)

**Address labels:** City; State; Postcode.  
**Bank fields:** Bank name and account number; SWIFT conditional for cross-border payment.

### Employee

- NRIC/MyKad or passport number — required.
- Tax Identification Number — required or pending.
- EPF/KWSP number — required or pending.
- SOCSO/PERKESO number — required or pending.
- Employment Insurance System status — required.
- Work-pass type, number, and expiry — conditional.

### Contractor

- NRIC/passport — required for an individual.
- Tax Identification Number — required.
- SSM business/company registration number — conditional for registered entities.
- SST registration status — required yes/no.
- SST number — conditional when registered.

## Vietnam (VN) (not yet in the Country table)

**Address labels:** Ward/Commune; District; Province/City; Postal code optional.  
**Bank fields:** Bank, branch, account number, and account holder.

### Employee

- Personal tax code — required or pending.
- Citizen ID/passport — required.
- Social insurance number — required or pending.
- Health insurance number — conditional if separately available.
- Dependant registration — conditional.
- Work permit/visa details — conditional for foreign workers.

### Contractor

- Personal tax code — required for an individual.
- Enterprise tax code — conditional for a registered entity.
- Business registration number — conditional.
- VAT invoice registration/status — conditional.
- Withholding-tax classification — assigned/reviewed by payroll, not freely selected.

## India (IN)

**Address labels:** City/District; State/Union Territory; PIN code.  
**Bank fields:** IFSC and account number.

### Employee

- Permanent Account Number (PAN) — required.
- Aadhaar number — conditional; collect only where required and consented.
- Universal Account Number (UAN) — required or "not yet issued".
- Employees' State Insurance number — conditional when covered.
- Tax regime selection — required where payroll needs it.
- Previous-employment income/tax declaration — conditional.
- Nominee details — conditional for statutory benefits.

### Contractor

- PAN — required.
- Legal entity type — required.
- GST registered — required yes/no.
- GSTIN — conditional when registered.
- Corporate Identification Number/LLPIN — conditional by entity type.
- MSME/Udyam number — optional.
- Tax Deduction Account/withholding details — reviewed based on payment setup.

## Brazil (BR) (not yet in the Country table)

**Address labels:** City; State (UF); CEP.  
**Bank fields:** Bank code, branch/agency, account number/type; PIX key optional.

### Employee

- CPF — required.
- PIS/PASEP/NIT — required or pending.
- Digital Work Card/CTPS details — required where applicable.
- eSocial-relevant civil status and dependant data — conditional.
- Voter/military identifiers — collect only when confirmed necessary.

### Contractor

- CPF — required for an individual.
- CNPJ — conditional for a legal entity.
- Municipal registration — conditional for service providers.
- State registration — conditional.
- Simples Nacional/tax-regime status — conditional.
- Service invoice (NFS-e) registration details — conditional.

## Pakistan (PK) (not yet in the Country table)

**Address labels:** City; Province/Territory; Postal code.  
**Bank fields:** IBAN.

### Employee

- CNIC/NICOP or passport — required.
- National Tax Number (NTN) — required or pending where applicable.
- EOBI number — conditional if already registered.
- Provincial social-security number — conditional.

### Contractor

- CNIC/NICOP — required for an individual.
- NTN — required.
- SECP company registration number — conditional for a company.
- Sales-tax registration number — conditional.
- Provincial service-tax registration — conditional based on location/services.

## Sri Lanka (LK) (not yet in the Country table)

**Address labels:** City; District/Province; Postal code.  
**Bank fields:** Bank, branch, account number; SWIFT conditional.

### Employee

- National Identity Card or passport — required.
- Taxpayer Identification Number (TIN) — required or pending.
- EPF member number — required or pending.
- ETF-related registration is employer-managed; collect only an existing worker identifier if applicable.

### Contractor

- NIC/passport — required for an individual.
- TIN — required.
- Business registration number — conditional.
- VAT registered — required yes/no.
- VAT number — conditional when registered.
- Social Security Contribution Levy registration — conditional when applicable.

## Germany (DE) (not yet in the Country table)

**Address labels:** City; State optional; Postcode.  
**Bank fields:** IBAN and BIC.

### Employee

- Tax Identification Number (Steuer-ID) — required.
- Social security number — required or pending.
- Statutory/private health insurer — required.
- Health-insurance membership number — required or pending.
- Tax class — required.
- Church-tax status — required where applicable.
- Child allowance/dependant information — conditional.

### Contractor

- Personal tax number — required for an individual.
- Business tax number — conditional.
- VAT ID (USt-IdNr.) — conditional.
- Trade registration (Gewerbeanmeldung) — conditional.
- Commercial register number — conditional for registered entities.
- Small-business VAT status — required yes/no where applicable.

## 5. Dynamic Behaviour

### 5.1 Source of truth

Create one shared country-onboarding configuration. Do not maintain separate switch statements in onboarding, My Details, and worker administration. Today there are three: the per-country maps inside `client/src/pages/my-details.tsx` (`getContractorBusinessIdFields`, `getIndirectTaxLabel`, `getCountryTaxFields`, `getCountryPensionFields`, `getCountryTaxDeclaration`), the `showFor(countryCodes)` filters in `client/src/components/modals/view-worker-modal.tsx`, and the static form in `client/src/pages/worker-onboarding.tsx`. The first two are the seed for the shared registry; lift them, do not write a fourth copy.

Each configuration contains:

- Country code and local labels
- Address fields
- Bank fields
- Employee sections and fields
- Contractor sections and fields
- Required/conditional rules
- Validation pattern and masking format
- Help text
- Document upload requirements

### 5.2 Resolution rules

1. Read `worker.countryId` and `worker.workerType` from the server.
2. Resolve the ISO code from the Country record's `code` column (`countries.id` is not the ISO code: the United Kingdom row is `uk` / `GB`).
3. Load common fields plus the matching employee or contractor configuration.
4. Render only applicable fields.
5. Validate the same configuration on the server before marking a section complete.
6. Show an explicit "Country setup incomplete" message if the worker has no country or the country has no approved configuration. Do not silently fall back to Australian fields.

### 5.3 Changing country or worker type

- Country and worker type remain controlled from the Worker screen (`add-worker-modal.tsx`, `view-worker-modal.tsx`, `PATCH /api/workers/:id`), plus the two no-country paths named in section 1.
- A change recalculates required fields immediately.
- Existing values are not silently deleted.
- Values that no longer apply are hidden and marked inactive.
- The worker's affected onboarding sections return to "Needs review".
- The worker is notified that details need review.
- Active contracts continue to use their saved country/type (`contracts.countryId` is a separate column); changing a worker profile must not rewrite an existing contract.

### 5.4 Completion

Track completion by section rather than only broad booleans:

- Personal details
- Identity/work authorisation
- Address
- Tax/payroll
- Statutory benefit/pension
- Banking
- Contractor business and indirect tax, when applicable
- Documents and declarations

The overall profile is complete only when every applicable required field and declaration is complete.

## 6. Security and Privacy Requirements

Tax, identity, pension, and bank identifiers are highly sensitive.

- Encrypt sensitive values at rest.
- Mask values after entry, showing only a short suffix.
- Never include full values in logs, emails, analytics, search indexes, or AI prompts.
- Separate "value is present" from the value returned to most API clients.
- Restrict full-value access by role and log every reveal/change.
- Require re-authentication or a privileged workflow before revealing a full identifier.
- Store uploaded identity/tax documents in private object storage with authorised, expiring access.
- Keep country-specific retention and deletion controls.

## 7. Acceptance Criteria

1. Selecting New Zealand + Employee on the Worker screen produces NZ address, IRD, IR330, KiwiSaver, student-loan, and NZ bank fields when that worker logs in.
2. Selecting New Zealand + Contractor produces NZ contractor business/tax fields and does not show employee KiwiSaver or IR330 fields unless separately applicable.
3. Selecting USA + Employee requires a state and shows SSN, W-4, state withholding, I-9, and US bank fields.
4. Selecting USA + Contractor shows W-9/W-8 and contractor business fields and does not show employee W-4 or I-9 fields.
5. Australia-only labels such as TFN, ABN, ACN, BSB, and super do not appear for another country.
6. Country/type changes in the Worker screen update both worker-facing and administrator-facing forms from the same configuration.
7. Server validation prevents a worker from completing onboarding without the fields required by their country/type configuration.
8. Existing data is preserved but made inactive when it no longer applies.
9. Sensitive values are masked by default and absent from logs and AI/search content.
10. All ten countries in the Country table have an explicit approved configuration, and the seven new countries each have a Country row plus a draft configuration; there is no Australia fallback anywhere.

## 8. Scope, Existing Behaviour, and Delivery Boundaries

### 8.1 Existing code to consolidate (verified 2026-10-20)

- `workers.countryId` and `workers.workerType`, set through the Worker screen (`client/src/components/modals/add-worker-modal.tsx` requires a country; `view-worker-modal.tsx` edits it) and `PATCH /api/workers/:id` (`updateWorkerSchema` whitelist, `WORKER_TYPE_LOCKED` guard).
- Shared identity, address, bank, contractor, and country-specific identifier columns on `workers` in `shared/schema.ts`: `taxFileNumber`, `abn`, `acn`, `irdNumber`, `ssn`, `ein`, `niNumber`, `utrNumber`, `sin`, `businessNumber`, `gstRegistered`, `gstNumber`, `bsb`, `iban`, `swiftCode`, AU super, NZ KiwiSaver, US 401(k), UK pension and CA `cppNumber` / `qppNumber` columns.
- `client/src/pages/worker-onboarding.tsx`: routed at `/onboarding`, linked from nowhere, static Australian labels, writes through `PATCH /api/worker-profile`.
- `client/src/pages/my-details.tsx`: country-aware since 2026-10-20 through page-local maps and a per-country tax resolver (`buildTaxSchema`); has a worker-editable Country select (section 1).
- `client/src/components/modals/view-worker-modal.tsx`: `showFor(countryCodes)` filters per section (around line 231); shows full tax IDs and bank numbers to anyone who can open it, business owners included; reads a `taxDetailsCompleted` flag (around lines 710–725) that does not exist as a column.
- Two worker self-service profile API families, neither with a field whitelist: `GET`/`PATCH /api/workers/profile` (`server/routes.ts` around 5171 / 5193; derives `personalDetailsCompleted`, `bankDetailsCompleted`, `businessDetailsCompleted` server-side; checks a changed email for conflicts) and `GET`/`PATCH /api/worker-profile` (around 10306 / 10322; passes the body straight through).
- `worker_change_log` (`field_name`, `old_value`, `new_value`) stores **plaintext**; `maskSensitive` in `server/modules/workforce/changeLog.ts` masks only the email and the UI. Two rows already hold plaintext bank account numbers.
- Serializers that send whole worker rows: `GET /api/workers/list` (`select *` in `server/modules/workforce/repository.ts`), both profile GETs, legacy `GET /api/workers`, and worker rows embedded in contract and payslip payloads. The AI tools (`searchWorkers` returns id, name and email only), `storage.generateContractContent` and the reports do not reference tax or bank fields.
- `server/index.ts` logs the first 80 characters of every `/api` **response** JSON; CORS reflects any origin with credentials; auth is a bearer JWT in `localStorage` with a session fallback only on `GET /api/auth/user`.
- No queue, cron, outbox or background worker exists; `emailService.sendEmail` returns `false` on failure and never throws.
- Object storage: `POST /api/objects/upload` returns a presigned PUT URL, a per-feature endpoint then sets the ACL, and reads go through `…/download-url` routes (`GET /api/payslips/:id/download-url` is the pattern). With `USE_LOCAL_OBJECT_STORAGE=true` the ACL endpoints throw and `/objects/*` cannot serve local files. No malware scanning exists.
- `server/rateLimitMiddleware.ts` exports an unused in-memory `apiRateLimiter`.
- `server/twoFactorAuth.ts` refuses to boot without `TOTP_ENCRYPTION_KEY` (32+ characters): the pattern for a new data key.

These must converge on the design below, not remain independently maintained implementations.

### 8.2 Included

All field sets in sections 3–4; conditional forms; draft saving; employee/contractor separation; private documents; declarations; SDP review and exceptions; schema changes and a scripted backfill; backward compatibility; server-side permissions; automated checks.

### 8.3 Excluded

Payroll calculation or filing, government submissions, automatic tax advice, automatic identity verification with an external vendor, electronic government-form certification, and payment execution. Uploading a form does not constitute filing it.

Standard-contractor versus Contractor-of-Record service pricing does not change `workerType`: both use the contractor baseline. Any extra COR compliance checks must be explicit approved policy conditions, not inferred from the fee. Note that `contractor_of_record` is not a value of the `businessStructure` enum (`sole_trader`, `company`, `partnership`, `trust`), although `client/src/components/layout/sidebar.tsx` tests for it (decision in section 18).

## 9. Configuration and Field Contract

### 9.1 One versioned rule registry

Maintain typed, source-controlled definitions in `shared/worker-onboarding/` (one file per country plus shared validators), following the precedent of `shared/businessProfile.ts`, which already holds per-country business-number labels used by both sides. Resolve ISO codes through the saved Country record's `code`; never assume `countries.id` equals the ISO code (`uk` → `GB`). Normalise `UK` to `GB` at the resolver boundary.

Each published manifest contains:

| Property | Purpose |
|---|---|
| `countryCode`, `workerType`, `version` | Stable policy identity |
| `status` | `draft`, `approved`, or `retired` |
| `effectiveFrom` | Earliest date the approved policy can be assigned |
| `reviewedAt`, `reviewReference` | Evidence of country payroll/compliance approval |
| `sections` | Order, labels, applicability, and completion rules |
| `fields` | Field definitions described below |
| `declarations` | Versioned declaration text/document requirements |
| `retentionPolicyKey` | Approved country/data-class retention rules |
| `manifestHash` | Integrity/version comparison |

Do not execute arbitrary JavaScript or user-entered expressions from the database. Conditions use a small typed rule vocabulary: equality, membership, presence, all-of, and any-of.

### 9.2 Required field-definition properties

Every field has a stable key, section, local label, input type, purpose, required rule, visibility rule, allowed values, normaliser, validator, help text, sensitivity, read/write permissions, masking rule, storage location, and pending/exemption support.

Supported value types are string, boolean, decimal string, date, enum, multi-enum, document reference, and bounded repeatable records. Identifiers, bank numbers, postal codes, and telephone numbers are strings, never numbers: preserve leading zeroes. Monetary declaration amounts include a currency. Dates of birth/expiry use SQL `date` in dedicated new columns or validated ISO date-only strings in the typed value store, not timestamps (today `workers.dateOfBirth` is a `timestamp` column; it stays as the legacy source until migrated).

Country-specific checksums or formats must be verified against official guidance; a matching pattern does not establish that an identifier belongs to the worker.

### 9.3 Canonical key families

- `personal.*`: legal names, preferred name, birth date, contact information.
- `address.*`: residential address and local subdivisions.
- `identity.*`, `workAuthorization.*`, `emergencyContact.*`.
- `tax.*`: personal tax identifiers and approved declaration answers.
- `statutory.*`: pension, social insurance, and employee benefit enrolment.
- `business.*`: contractor legal entity, registration, and indirect tax.
- `bank.*`: payout account, bank country, currency, and clearing method.

One underlying identifier must not be collected twice merely because it appears in multiple sections. For example, an Australian GST registration can use the business ABN, and Singapore CPF linkage must not invent a separate CPF number.

### 9.4 Country-specific key coverage

The types/statuses in sections 3–4 apply to these explicit country keys. Additional declaration answers are defined as typed fields in the same manifest, not stored as an unchecked free-text blob.

| Country | Employee tax/statutory keys | Contractor tax/business keys | Local banking keys beyond holder/bank/account |
|---|---|---|---|
| AU | `tax.au.tfn`, `tax.au.residency`, `tax.au.thresholdClaim`, `tax.au.loanDebt`, `statutory.au.superChoice`, `statutory.au.fundAbn`, `statutory.au.usi`, `statutory.au.memberNumber` | `tax.au.tfn` when applicable; `business.au.abn`, `business.au.acn`, `business.indirectTaxRegistered` | `bank.au.bsb` |
| NZ | `tax.nz.ird`, `tax.nz.taxCode`, `tax.nz.studentLoan`, `statutory.nz.kiwiSaverStatus`, `statutory.nz.contributionRate` | `tax.nz.ird`, `business.nz.nzbn`, `business.nz.companyNumber`, `business.nz.gstNumber`, `tax.nz.schedularStatus`, `tax.nz.schedularRate` | NZ account format; no Australian BSB |
| US | `tax.us.ssn`, approved W-4 answers, state declaration, work-authorisation evidence | `business.us.federalClassification`, `tax.us.tinType`, `tax.us.tin`, W-9/W-8 document reference, state registrations | `bank.us.routingNumber`, `bank.accountType` |
| IE | `tax.ie.ppsn`, `tax.ie.revenueStatus`, employer-managed PRSI classification | `tax.ie.reference`, `business.ie.cro`, `business.ie.vatNumber`, clearance reference where applicable | `bank.iban`, `bank.bic` |
| PH | `tax.ph.tin`, `statutory.ph.sss`, `statutory.ph.philHealth`, `statutory.ph.pagIbig` | `tax.ph.tin`, `business.ph.registrationType`, `business.ph.secDti`, `business.ph.birRegistration`, indirect-tax details | `bank.branch` and approved payment-rail fields |
| JP | `identity.jp.myNumber`, pension/health/employment-insurance identifiers, resident-tax municipality | Individual My Number or `business.jp.corporateNumber`, `business.jp.invoiceIssuerNumber`, consumption-tax status | Bank/branch codes, account type, bank-required holder script |
| CA | `tax.ca.sin`, federal/provincial TD1 answers, approved Quebec-specific answers | Individual SIN only when justified; `business.ca.bn`, `business.ca.gstHst`, `business.ca.qst` | `bank.ca.institutionNumber`, `bank.ca.transitNumber` |
| GB | `tax.gb.nino`, `tax.gb.p45Status`, starter declaration, loan plan, pension status | `tax.gb.utr`, conditional NINO, `business.gb.companyNumber`, `business.gb.vatNumber`, conditional CIS details | `bank.gb.sortCode` |
| RO | `identity.ro.cnp`, approved insurance/dependant fields | Conditional CNP, `business.ro.cuiCif`, `business.ro.tradeRegistry`, `business.ro.vatNumber` | `bank.iban`, `bank.bic` |
| SG | `identity.sg.nricFin`, residency/pass details, `statutory.sg.cpfStatus` | Conditional NRIC/FIN, `business.sg.uen`, ACRA type, GST registration | Bank/branch codes for selected payment rail |
| MY | NRIC/passport, `tax.my.tin`, `statutory.my.epf`, `statutory.my.socso`, EIS status | Individual ID when justified, `tax.my.tin`, `business.my.ssm`, `business.my.sstNumber` | SWIFT when needed; no invented local routing requirement |
| VN | `tax.vn.personalTaxCode`, identity, social/health-insurance identifiers | Personal or enterprise tax code, business registration, invoice status | `bank.branch` |
| IN | `tax.in.pan`, conditional Aadhaar, `statutory.in.uan`, `statutory.in.esi`, tax-regime and nominee answers | `tax.in.pan`, `business.in.gstin`, `business.in.cinLlpIn`, optional Udyam | `bank.in.ifsc` |
| BR | `tax.br.cpf`, `statutory.br.pisPasepNit`, CTPS reference, approved eSocial answers | Individual CPF or `business.br.cnpj`, municipal/state registration, tax regime, NFS-e | Bank code, agency, account type; optional PIX key |
| PK | CNIC/NICOP/passport, `tax.pk.ntn`, conditional EOBI/provincial insurance | Individual CNIC/NICOP, `tax.pk.ntn`, SECP and sales/service-tax registration | `bank.iban` |
| LK | NIC/passport, `tax.lk.tin`, `statutory.lk.epf` | Individual ID, `tax.lk.tin`, business registration, VAT/SSCL details | `bank.branch`, conditional SWIFT |
| DE | `tax.de.steuerId`, social-security number, health-insurer details, approved tax-class/church-tax answers | Personal/business tax number, `business.de.vatId`, trade/commercial registration, small-business VAT status | `bank.iban`, `bank.bic` |

Do not retain the existing Canadian `cppNumber` and `qppNumber` inputs as universal separate identifiers. Canada payroll requirements and SIN linkage need review; preserve legacy values as restricted migration records until resolved. Likewise, US dependants must use the approved W-4 monetary-credit fields, not a simplistic number-of-dependants substitute.

### 9.5 Additional context is not the onboarding country

The Worker screen country determines the policy. Tax residence, nationality, residential address, actual work state/province, bank country, and contractor incorporation country are distinct facts.

- Collect work state/province separately where payroll depends on it; do not silently use the postal address state.
- A foreign bank account selects an approved cross-border payment-field variant without changing the worker country.
- Foreign tax residency or a foreign contractor entity routes to SDP review and the appropriate approved document flow.
- The user does not receive a legal entity's local tax fields merely because that entity uses a foreign bank.

## 10. Database Design

### 10.1 Approach and ownership

Keep the current database (Postgres on Neon through Drizzle). Schema changes are made in `shared/schema.ts` and applied with `npm run db:push` by the repository owner; there is no migrations folder and this specification does not introduce one. Everything below is additive. Do not replace the database or create one new worker table per country.

Use a hybrid model:

1. Keep existing core Worker-screen identity, `country_id`, `worker_type`, business ownership, and contract relationships on `workers`.
2. Store additional typed field values under a versioned onboarding context.
3. Store sensitive values encrypted in dedicated ciphertext columns, never in general JSON.
4. Store documents, declarations, review state, and audit metadata separately.

Do not add dozens of country columns to `workers`. Do not add a duplicate country/type that can independently diverge from the Worker screen.

Column conventions for the new tables: follow the existing schema (`varchar` ids with `gen_random_uuid()`, `timestamp` columns as elsewhere, or `{ withTimezone: true }` on every new table, never a mix); ciphertext is base64 `text` (the Drizzle version in use has no `bytea`; `business_logos.data` is the precedent); date-only values use `date`. Partial unique indexes are already used (`businesses.isSdpOwned`).

The table names below are proposed new names. Reuse an equivalent existing table where inspection confirms it meets the same contract.

### 10.2 `worker_onboarding_policies`

| Column | PostgreSQL type / constraint |
|---|---|
| `id` | UUID primary key |
| `country_code` | `varchar(2)`, not null; normalised ISO |
| `worker_type` | Existing worker type enum with a CHECK limiting it to `employee` / `contractor` (the enum also contains `third_party_worker`) |
| `version` | Positive integer, not null |
| `status` | Text check: draft/approved/retired |
| `manifest` | JSONB, not null; field definitions only, no worker data |
| `manifest_hash` | Text, not null |
| `effective_from`, `reviewed_at` | Timestamp, nullable until approved |
| `review_reference`, `retention_policy_key` | Text |
| `reviewed_by`, `created_by` | Nullable FK to users |
| `created_at` | Timestamp, not null |

Unique `(country_code, worker_type, version)`. Index `(country_code, worker_type, status, effective_from)`. Approved manifests are immutable; changes create a new version. Activation comes from reviewed source-controlled releases, not a free-form production rule editor.

### 10.3 `worker_onboarding_contexts`

| Column | PostgreSQL type / constraint |
|---|---|
| `id` | UUID primary key |
| `worker_id` | FK to workers, not null |
| `policy_id` | FK to policies, not null |
| `country_id_snapshot` | FK to countries, not null |
| `worker_type_snapshot` | Worker type enum, not null |
| `status` | Text check: active/superseded |
| `revision` | Non-negative bigint, not null; optimistic concurrency |
| `overall_status` | Text check: draft/in_progress/submitted/needs_review/complete |
| `started_at`, `submitted_at`, `completed_at`, `superseded_at` | Timestamp |
| `created_at`, `updated_at` | Timestamp, not null |

Partial unique index on `(worker_id) WHERE status = 'active'`. Index `(worker_id, created_at)`. Snapshot country/type must match the current worker for an active context; enforce through one transactional service with locking, and reject stale contexts on every write.

Policy upgrades create a new context and re-evaluate carry-forward values. Completion history remains attached to the original policy.

### 10.4 `worker_onboarding_values`

| Column | PostgreSQL type / constraint |
|---|---|
| `id` | UUID primary key |
| `context_id` | FK to contexts, not null |
| `field_key` | Text, not null; must exist in pinned manifest |
| `value_type` | Text, not null; matches field definition |
| `value_json` | JSONB, nullable; non-sensitive typed value only |
| `encrypted_value` | Text (base64 authenticated-encryption envelope), nullable |
| `encryption_key_version` | Text, nullable |
| `masked_suffix` | Nullable short text; only if approved for this field |
| `value_state` | Text check: provided/pending/exempt/not_applicable/unset |
| `verification_status` | Text check: unverified/pending/verified/rejected |
| `source` | Text check: worker/staff/migration/carry_forward |
| `verified_by`, `updated_by` | Nullable FK to users |
| `verified_at`, `created_at`, `updated_at` | Timestamp |

Unique `(context_id, field_key)`. Check that no row contains both `value_json` and `encrypted_value`; a provided value has exactly one. Sensitive registry fields must use encryption, enforced server-side. Pending/exempt states carry a separate approved reason/reference, not a placeholder identifier. Date/decimal/enum shapes are validated by the shared typed validator before persistence.

Use normalised reference tables or bounded child records for repeatable dependants/nominees; each record's sensitive members receive equivalent encryption. Do not put an unencrypted dependant list in general JSON.

### 10.5 `worker_onboarding_sections`

Columns: `id` UUID PK; `context_id` FK; `section_key` text; `status` text check (`not_started`, `in_progress`, `pending_information`, `submitted`, `needs_review`, `complete`, `not_applicable`); `validation_summary` JSONB containing codes/field keys only; `review_reason_code` text; `review_comment` restricted text; `submitted_at`, `reviewed_at`, `completed_at`, `updated_at` timestamp; `reviewed_by` nullable user FK.

Unique `(context_id, section_key)`. Index `(status, updated_at)` for authorised review queues. No sensitive answers in validation summaries or comments.

### 10.6 `worker_onboarding_documents`

Columns: `id` UUID PK; `worker_id` FK; `context_id` FK; `field_key`, `document_type`, `object_key`, `safe_file_name`, `mime_type` text; `size_bytes` bigint; `content_hash` text; `scan_status` text check (`not_scanned`, `pending`, `clean`, `rejected`); `review_status` text check (`pending`, `approved`, `rejected`, `expired`); `expires_on` date; `uploaded_by`, `reviewed_by` nullable user FKs; `uploaded_at`, `reviewed_at`, `deleted_at`, `retention_until` timestamp.

The object key identifies a private object (`/objects/<entity-id>` as written by `normalizeObjectEntityPath`), not a public/signed URL. Document bytes stay out of PostgreSQL. Index `(worker_id, document_type)` and `(review_status, expires_on)`. No malware scanner exists in the platform today: `not_scanned` is the state until one is added, and a document is not accepted while review is pending. In local development (`USE_LOCAL_OBJECT_STORAGE=true`) files go to `./uploads/` through `/api/dev-uploads/*`; the ACL step must be skipped there rather than fail, mirroring how the existing upload features behave.

### 10.7 `worker_onboarding_declarations`

Columns: `id` UUID PK; `context_id` FK; `declaration_key`, `declaration_version`, `text_hash` text; `answers_revision` bigint; `accepted_by` user FK; `accepted_at` timestamp; `evidence_document_id` nullable document FK; `status` text check (`accepted`, `superseded`, `withdrawn`).

Use a partial unique index on `(context_id, declaration_key, declaration_version, answers_revision)` for accepted records. Store immutable declaration content by version with the policy release. Answer changes that affect a declaration require fresh acknowledgement. Acknowledgement is not automatically a legally compliant electronic signature; use approved signed-document workflows where needed (the SDP Billing Terms acceptance records are the house pattern: frozen text plus sha256).

### 10.8 Audit and backfill records

Introduce `worker_onboarding_audit_events`: UUID PK; worker/context/actor FKs; action, field key, purpose/reason code, request correlation ID; safe previous/new state metadata; timestamp. Index worker/time and actor/time. Record writes, reviews, country/type/policy changes, document access, and successful/denied sensitive reveals. Do not store full old/new sensitive values.

Introduce `worker_onboarding_migration_items`: UUID PK; migration batch ID; worker FK; legacy field key; target field key; status (`pending`, `migrated`, `needs_review`, `failed`); safe error code; source digest using keyed integrity protection where needed; completion timestamp. Unique `(migration_batch_id, worker_id, legacy_field_key)` makes retries idempotent.

`worker_change_log` holds plaintext old and new values today (two bank-account rows already). Reuse it for non-sensitive core profile changes only: at cutover, remove every `sensitive: true` key from `TRACKED_WORKER_FIELDS` in `server/modules/workforce/changeLog.ts`, and run an explicit remediation that replaces existing sensitive `old_value` / `new_value` entries with their masked form. Masking only the API response does not secure what is already persisted.

### 10.9 Existing `workers` columns and compatibility flags

- Keep first/last name, contact information, country/type, business ownership, invitation, and contract relationships intact.
- Address/contact fields that remain on `workers` have a declared canonical storage mapping in the manifest; do not maintain a second unsynchronised value row.
- New personal/business fields without an existing core column use the typed value store.
- Country-specific legacy identifiers, bank values, and pension values migrate into the new store; after cutover they are not independently writable.
- `personalDetailsCompleted`, `bankDetailsCompleted` and `businessDetailsCompleted` are already derived server-side inside `PATCH /api/workers/profile`; `onboardingCompleted` is set to `false` at invitation signup and never recomputed. All four become server-derived compatibility outputs of section state during the transition.
- `taxDetailsCompleted` does not exist as a column even though `view-worker-modal.tsx` reads it. Tax completion comes from section state; add a compatibility field only if a verified consumer requires it.
- A complete worker profile does not automatically approve a worker, approve a contract, or authorise payment.

## 11. Backfill and Rollout Plan

### 11.1 Preconditions

Inventory all consumers of worker records: the two profile route families, `GET /api/workers/list` and legacy `GET /api/workers`, contract and payslip payloads that embed worker rows, contract generation, email placeholders, invoice code, AI/search tools (clean today), `storage` methods, and the change log. Identify access expectations and legacy columns before writing the backfill.

Review the production schema through read-only inspection. Backups and the production `db:push` require the normal approval process. No production change is authorised by this specification alone.

### 11.2 Expand → backfill → switch → retire

1. **Expand:** Add the new tables and indexes to `shared/schema.ts`; the owner applies them with `npm run db:push`. Ship the serialization code behind a new env flag `WORKER_ONBOARDING_V2_ENABLED` (default off), mirrored on `GET /api/auth/user` `featureFlags.workerOnboardingV2Enabled`, following the AI feature-flag convention. Add the flag and the data key to the root `CLAUDE.md` env table and `.env.example`.
2. **Seed drafts:** Load the 20 baseline manifests for the ten countries in the Country table (employee and contractor each), plus the 14 draft manifests for the seven countries that still need a Country row. Activate only locally reviewed versions; the seed is idempotent by identity and hash.
3. **Dry run:** A resumable script under `scripts/` (precedent: `scripts/migrate-customer-business.ts`) reports counts by country/type, workers without a country, unknown identifiers, mismatches, and invalid formats without printing raw values.
4. **Backfill:** The same script processes workers in batches (31 rows today, so one batch). Lock an individual worker/context, create its context, copy/normalise/encrypt valid mapped values, and record each migration item in the same transaction.
5. **Reconcile:** Compare presence and protected integrity digests, associations, counts, and validation outcomes. Quarantine mismatches; never discard or invent data.
6. **Pilot:** Enable approved country/type combinations for a controlled SDP cohort. Keep draft saves available; do not unexpectedly block existing payroll or contracts.
7. **Switch reads and writes:** Both worker profile route families and all authorised consumers use one service. Never fall back to unprotected legacy plaintext when a new read fails.
8. **Retire legacy sensitive storage:** After reconciliation, authorised retention review, and a safe recovery window, clear deprecated plaintext values and remediate the change log. Remove compatibility code in a later release.

### 11.3 Legacy mapping rules

| Existing field family | Destination / rule |
|---|---|
| `countryId`, `workerType` | Source of truth; a missing country (one worker today) creates an admin repair case, not an AU default |
| TFN/ABN/ACN | AU personal/business keys only when the country and structure support them |
| `irdNumber` | NZ IRD |
| `ssn`, `ein` | US employee SSN or contractor TIN based on explicit type; preserve mismatches for review |
| `niNumber`, `utrNumber` | GB NINO/UTR, normalising GB/UK aliases |
| `sin`, `businessNumber` | CA SIN/BN under the correct individual/entity classification |
| `gstRegistered`, `gstNumber` | Country-specific contractor indirect-tax keys; do not infer a verified registration from a boolean |
| Account name, bank, number, BSB, IBAN, SWIFT | Bank keys with confirmed bank country/rail; non-AU BSB use is a review issue |
| AU super / NZ KiwiSaver / GB pension | Appropriate statutory keys; do not equate presence with valid enrolment |
| US 401(k) fields | Optional offered-plan details, not a universal employee requirement |
| Canada CPP/QPP values | Preserve restricted legacy evidence for payroll review; do not invent new number requirements |
| Unknown-country generic tax value | Restricted migration review record; never relabel as a country's tax ID without confirmation |
| Legacy completion flags | Recalculate; retain a transition marker so existing operations are not silently stopped |

### 11.4 Rollback and recovery

Rollback is the feature flag turned off with the additive schema left in place. It must not restore broad raw worker serializers or plaintext logging. Keep new encrypted data, policy history, and migration records; never drop the new tables over worker submissions.

After legacy plaintext is retired, recovery uses encrypted storage and controlled backups, not recreated plaintext columns. A failed batch retries from the migration journal. Key loss is a disaster-recovery event, not grounds for an insecure fallback.

## 12. API and Validation Specification

### 12.1 Canonical endpoints

All of these live in a new module `server/modules/workerOnboarding/` (types, authorize, repository, service factory, controller, index), registered from `routes.ts` next to the other modules. Register the `/api/workers/me/onboarding*` routes before the `/api/workers/:id/onboarding*` routes, the same rule `modules/businesses` follows for `/me`.

| Endpoint | Behaviour |
|---|---|
| `GET /api/workers/me/onboarding` | Authenticated worker's active context, resolved safe schema, permitted values, section state, pending requirements |
| `PATCH /api/workers/me/onboarding/sections/:sectionKey` | Draft-save only fields writable in this section; validate supplied values; return new revision and safe completion summary |
| `POST /api/workers/me/onboarding/sections/:sectionKey/submit` | Validate all applicable required rules for the section |
| `POST /api/workers/me/onboarding/submit` | Validate complete context, acknowledgements, and document state; idempotent for the same revision |
| `POST /api/workers/me/onboarding/declarations/:key/accept` | Accept exact declaration version/hash for current answer revision |
| `POST /api/workers/:id/onboarding/documents/uploads` | Authorise private upload for permitted field/document type (wraps `POST /api/objects/upload`) |
| `POST /api/workers/:id/onboarding/documents/:documentId/finalize` | Verify uploaded object, ownership, size/type, scan state; sets the private ACL (skipped in local-dev storage) |
| `GET /api/workers/:id/onboarding/documents/:documentId/download` | Authorise and audit a short-lived private download URL (the payslip `download-url` pattern) |
| `GET /api/workers/:id/onboarding` | Authorised staff/business view with field-level restrictions |
| `PATCH /api/workers/:id/onboarding/sections/:sectionKey` | Permission-checked administrative edits, reason required for sensitive changes |
| `POST /api/workers/:id/onboarding/review` | Authorised payroll reviewer decision: approve/request changes/approved exception |
| `POST /api/workers/:id/onboarding/fields/:fieldKey/reveal` | Privileged re-authenticated, purpose-bound reveal; never a GET/list response |

Worker-screen country/type updates continue through `PATCH /api/workers/:id`, but invoke the same transactional context-change service. Do not allow workers to set them through an onboarding PATCH.

### 12.2 Draft request example

```json
{
  "contextId": "context-id",
  "policyVersion": 1,
  "expectedRevision": 4,
  "changes": {
    "tax.nz.taxCode": { "state": "provided", "value": "M" },
    "tax.nz.studentLoan": { "state": "provided", "value": false }
  }
}
```

Draft saves permit missing required fields but reject invalid supplied values, unknown keys, wrong-section keys, immutable fields, and inactive policy fields. Clearing uses explicit `state: "unset"`; empty or masked display values must not overwrite a saved identifier.

Sensitive fields return safe metadata, for example `present`, `masked`, `valueState`, `verificationStatus`, and `editable`, not their plaintext values. Unsaved input remains visible only in the local edit session until saved. Reopening an edit uses a replace-value interaction, not a silent reveal.

### 12.3 Response/error contract

Responses follow the house shape `{ message, code? }`.

- `200/201`: Safe context/section result and authoritative new revision.
- `400`: Malformed or forbidden request keys; field-keyed errors without echoed values.
- `401`: Missing/expired login.
- `403`: Wrong role, tenancy, field permission, or reveal privilege.
- `404`: Worker/document not visible to this user or absent.
- `409`: Stale revision/context, country/type changed, policy changed, or live-contract restriction.
- `422`: Valid request shape but submission requirements unmet.
- `503`: Unavailable approved policy, encryption service/key, or document service; never insecure fallback.

For a revision conflict, retain local unsaved changes, fetch current context, and ask the user to review conflicting fields. Do not automatically overwrite another session.

### 12.4 Backward compatibility and server trust

`GET`/`PATCH /api/workers/profile` and `GET`/`PATCH /api/worker-profile` become adapters into the same service while callers migrate. Both get strict allowlists; today neither has one, and `PATCH /api/worker-profile` passes the request body straight to `updateWorkerProfile`. Existing routes must not bypass new field permissions or accept client completion flags. Once all callers move, deprecate and remove the adapters.

Server resolves worker identity, ownership, country, classification, policy, field applicability, review permissions, and completion. Reject worker changes to IDs, business associations, country/type, approvals, invitation tokens, or completion flags. Client validation is for usability, not authority.

Every update validates normalised data, checks current context/revision, persists values, updates section state, derives compatibility flags, and writes safe audit records in one transaction.

## 13. Permissions and Sensitive-Data Controls

The platform's roles are: worker; business owner and business team members; `sdp_internal` users with `sdpRole` `sdp_agent` (scoped by `accessibleCountries` / `accessibleBusinessIds`), `sdp_admin` or `sdp_super_admin`; host-client logins; and `third_party_business`.

| Actor | Allowed access |
|---|---|
| Worker | Own profile only; edit permitted answers, replace own sensitive values, acknowledge own declarations, upload own required documents |
| Business owner / business team member | Their authorised workers' basic details, progress, and outstanding action categories; no personal tax/identity/bank reveal by default (**decision 3 in section 18**: today the worker modal shows these in full to business users) |
| `sdp_agent` | Workers within assigned country/business scope; basic details and onboarding status; no sensitive updates or reveals |
| SDP payroll/compliance capability | Scoped sensitive processing, document review, reasoned corrections, and purpose-bound reveals. **No such role exists today**; decision 4 in section 18 chooses between a `sdpCapabilities` flag on `users` and a fourth `sdpRole` |
| `sdp_admin` / `sdp_super_admin` | Policy activation and access administration; the administrative role alone is not a blanket raw-data export permission |
| Host-client / third-party viewer | Existing permitted workforce metadata only; never inherited access to the worker's sensitive onboarding record |

Preserve existing scoped SDP access rather than granting every internal account access to every country.

### 13.1 Encryption and logging

Use authenticated encryption with a versioned envelope and unique nonce. Bind worker, context, and field key as associated data to prevent ciphertext swapping. Introduce `WORKER_DATA_ENCRYPTION_KEY` (32+ characters) with the same refuse-to-boot check `server/twoFactorAuth.ts` applies to `TOTP_ENCRYPTION_KEY`; never reuse the JWT, session or TOTP keys. Keep a tested rotation/recovery procedure and fail closed when decryption is unavailable.

Exclude the onboarding, document, declaration, and reveal routes from the response-body capture in the `server/index.ts` request logger (it logs the first 80 characters of every `/api` response today). Redact errors and traces. Replace broad `res.json(worker)` serializers (`GET /api/workers/profile`, `GET /api/worker-profile`, the `select *` list repository, legacy `GET /api/workers`, worker rows inside contract and payslip payloads) with an allowlisted worker shape. AI/search tools stay as they are (id, name, email) and must never gain identifier or document access by default.

These endpoints accept bearer tokens only (no session fallback). Reveal responses use `Cache-Control: no-store`; no sensitive field values in URLs, browser persistent storage, analytics, email, or notifications. Apply the existing in-memory `apiRateLimiter` to the reveal and upload endpoints. Note that CORS currently reflects any origin with credentials (`server/index.ts`); tighten it to the configured `FRONTEND_URL` before these endpoints ship.

### 13.2 Documents and retention

Enforce authorised upload prefixes, allowed MIME types, file size limits, and content/type validation. Add malware scanning when a scanner is adopted; until then documents carry `scan_status = not_scanned` and go through human review. Never trust a client-supplied object key belonging to another worker. Use short-lived download URLs, no public object paths or active inline HTML documents.

Each approved country policy must supply a retention schedule and legal-hold rule. Do not invent one universal retention period. Historical inactive fields are retained only for an approved purpose and duration, not indefinitely. Deletion removes private objects and database values through an audited job when retention/holds allow; superseding a context is not itself a deletion instruction.

## 14. Worker and Administrator Experience

- Show read-only **Country** and **Worker type** with "Contact SDP to change these details".
- Steps: Personal/contact; Address; Identity/work authorisation when applicable; Tax/payroll; Statutory schemes when applicable; Banking; Contractor business/indirect tax when applicable; Review/declarations.
- Do not display empty employee-only pension steps to contractors, or contractor-business steps to employees.
- Show local labels, explanatory text, examples, required markers, and country-specific number formatting.
- Show pending/exempt options only where approved; provide a review status rather than forcing dummy data.
- Save drafts at section level. Preserve values after validation failures; confirm before navigating away from unsaved edits.
- Use the site's shared typography, cards, form controls, and spacing (shadcn/ui, react-hook-form with `zodResolver`). Align labels/inputs in grids, show errors beside fields, maintain keyboard access and accessible labels/error summaries.
- Provide a clear review page with masked identifiers, outstanding actions, submitted state, and what requires SDP review.
- Business views show progress and action categories, not missing identifier values.
- SDP sees a scoped review queue, safe change history, verification outcomes, and explicit exception reasons.
- Document expiry marks only affected sections for review and alerts appropriate users. It does not silently terminate employment or a contract.
- Client, server, and administrator forms render from the same resolved schema. `/my-details`, the unlinked `/onboarding` page and the worker modal are replaced by that shared renderer.

## 15. State Transitions and Business Rules

### 15.1 Section/context transitions

An applicable section starts `not_started`, becomes `in_progress` on draft save, and becomes `submitted` after valid submission. Approved self-attested sections can become complete immediately; documents and regulated declarations remain subject to their configured review rules. Reviewer approval sets `complete`; rejection sets `needs_review`. Approved pending identifiers use `pending_information` and any explicitly approved operational exception.

Context status is `complete` only when all applicable sections and declaration/document checks meet the pinned policy. An exception is explicit, authorised, reasoned, scoped, and optionally expiring; it is not silent validation bypass.

### 15.2 Country/type changes

1. Authorise change from the Worker screen and lock the worker/context.
2. Retain the existing live-contract worker-type lock (`WORKER_TYPE_LOCKED`). This specification also proposes blocking country changes while live contracts exist until an authorised transfer/contract-amendment workflow is available.
3. Require an approved target policy; if unavailable, leave the current worker unchanged.
4. Mark old context superseded, update the core worker country/type, create the new active context, and carry only semantically compatible values in one transaction.
5. Re-evaluate requirements; do not copy "verified" status or signed declarations automatically when their purpose or policy changed.
6. Keep previously inapplicable sensitive values restricted in the old context; do not resurface them automatically later without review.
7. Notify the worker and relevant SDP reviewer with a safe summary. Existing contracts and payroll history remain unchanged.

Policy upgrades follow the same review principles. No silent retroactive application of new requirements to signed declarations.

### 15.3 Notifications and reliability

No queue, outbox, cron or background worker exists in the platform, and `emailService.sendEmail` returns `false` on failure. Two options:

1. **Build an outbox**: a `worker_onboarding_outbox` table written in the same transaction as the change, drained by a `setInterval` loop started in `server/index.ts`, with per-row retry counts and deduplication by worker/context/revision/event type.
2. **Synchronous send with audit** (recommended for the first release): send after the transaction commits, check the boolean, and record `sent` / `failed` on the audit event so a failed email never loses a valid save and can be re-sent from the review queue.

Notify on country/type changes, requests for corrections, approval, approved pending-document expiry reminders, and sensitive administrative corrections. Messages name the changed category only, not full values or documents. Use the database-managed email templates where a template exists.

## 16. Test and Acceptance Plan

There is no test runner in the repository. Checks use `npm run check` (type-check) plus scripted and browser verification, the approach used for the invitation and business-logo work:

- `npx tsx --env-file=.env` scripts with Map-backed stand-ins for the service factory.
- Real-database smoke scripts that create temporary rows and delete them in `finally`.
- Headless Chrome against `npx vite --port 5199 --strictPort` with every `/api/*` call mocked, with screenshots.

### 16.1 Automated coverage

- **Baseline configurations:** All 20 live manifests (ten countries × employee/contractor) and the 14 draft manifests resolve without AU fallback. Test relevant conditional branches as well as the baseline.
- **Field contracts:** Stable keys, valid sections, required/help text, sensitivity, storage mapping, masking, and defined options.
- **Shared rules:** Client/server decisions match for visibility, pending/exempt rules, value formats, boolean false, zero amounts, leading zeroes, Unicode names, and local dates.
- **Country/state/bank variants:** US/Canada work jurisdiction; AU state; foreign bank accounts; tax residence distinct from Worker country.
- **Permissions:** Worker self-access; business tenancy; team permissions; scoped SDP roles; host-client visibility; forged worker IDs, field keys, context IDs, and document keys.
- **Workflow:** Draft, submit, reject/correct, review, complete, expired evidence, worker-type/country change, active-contract lock, policy upgrade, self-signup and dual-role country capture.
- **Concurrency:** Two browser tabs, stale revisions, double submit, interrupted requests, notification retries.
- **Security:** Ciphertext swapping fails; no plaintext in ordinary API/list/audit/log/AI/export responses; unknown keys/completion flags rejected; reveals authorised/audited; uploads private; the response logger skips the new routes.
- **Backfill:** Dry run, resumable retries, mixed-country legacy fields, the worker with no country, mismatched tax IDs, preserved contract associations, encrypted reconciliation, change-log remediation, flag-off rollback.
- **Accessibility/responsiveness:** Keyboard-only navigation, readable labels/errors, screen-reader summary, phone/tablet/desktop layouts and aligned controls (the sidebar is a fixed 256 px, so check 768 px).

### 16.2 Release acceptance

Sections 7 and 16 must pass for every activated policy. A representative worker can log in, save drafts, finish applicable fields, acknowledge the correct declaration version, and see accurate completion. SDP can review without ordinary business users seeing sensitive data.

Country release requires recorded payroll/compliance approval, verified configuration, backfill reconciliation, safe API serialization across legacy consumers, and functioning encryption/private documents. Do not describe all country requirements as verified merely because engineering checks pass.

## 17. Implementation Sequence and Definition of Done

1. Approve data purposes, country field rules, permissions, exceptions, retention, and the decisions in section 18.
2. Inventory legacy consumers and introduce safe worker serializers, the logger exclusion and the CORS tightening.
3. Add `shared/worker-onboarding/` (registry lifted from `my-details.tsx` and `view-worker-modal.tsx`), typed validators, and the policy/context/value/section/document/declaration/audit tables in `shared/schema.ts`; owner runs `npm run db:push`.
4. Implement encryption, key rotation checks, private uploads, reveal controls, and the change-log remediation.
5. Seed the Country rows for the seven new countries; run the dry-run and backfill scripts and reconcile.
6. Implement `server/modules/workerOnboarding/` and the guarded legacy adapters behind `WORKER_ONBOARDING_V2_ENABLED`.
7. Replace the three field switches (onboarding page, My Details, worker modal) with the shared renderer; implement state, review, and notifications; remove the My Details Country select.
8. Pilot approved countries; run the 20 live and 14 draft configurations and the security/backfill scenarios; progressively activate approved policies.
9. Remove deprecated plaintext fields/readers only after an approved recovery window.

**Done means:** Approved activated country/type rules control all three interfaces and server validation; existing data is migrated and protected; no country/type bypass or Australian fallback exists; all specified checks pass; operators have a recovery runbook; the three CLAUDE.md context files are updated; no unrelated payroll or contract behaviour is changed.

## 18. Review Decisions Before Implementation

The following are genuine approval items, not details the engineer should invent:

1. Confirm each proposed country identifier, declaration, statutory scheme, contractor statutory exception, and mandatory/optional rule against current local payroll guidance. The small lists of declaration fields above are scope outlines, not substitutes for complete current official forms.
2. Confirm the lawful purpose for identity documents, nationality, birth dates, emergency contacts, and sensitive religious/health-related declaration answers.
3. **Business-user visibility.** Business owners and team members currently see full tax IDs and bank numbers in the worker modal. Confirm the default proposed here (hidden, progress and action categories only) or require parity with today.
4. **Payroll/compliance capability.** No such role exists. Choose a `sdpCapabilities` flag on `users` or a fourth `sdpRole`, and who may grant it.
5. **No-country workers.** Confirm the section 1 rule for contractor self-signup (country step at signup) and dual-role rows (SDP repair queue), and the removal of the worker-editable Country select on My Details.
6. **Contractor of Record.** `contractor_of_record` is not a `businessStructure` value, yet the sidebar tests for it. Extend the enum or remove the check.
7. **Notifications.** Confirm option 2 in section 15.3 (synchronous send with audit) for the first release, or fund the outbox.
8. Confirm approved pending/exemption cases and whether they permit payroll processing or only profile submission.
9. Confirm country-specific document/e-signature standards and retention/legal holds.
10. Confirm supported local/cross-border banking rails and permitted bank countries.
11. Approve the proposed country-change live-contract restriction and operational transfer process.
12. Approve encryption key custody, recovery/rotation, rollout cohort, and the timing of the production `db:push` and backfill.

Until these are reviewed, this is a comprehensive proposed specification, not an instruction to collect every listed sensitive identifier or block every worker.
