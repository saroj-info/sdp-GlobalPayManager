# Plan: SDP Billing Terms acceptance on contract creation

## Context

When a contract uses a billing option where SDP acts as the billing entity, nothing today asks the business to accept any legal terms. The wizard, the AI chat and `POST /api/contracts` all save the contract straight away. The only acceptance pattern in the code is contract e-signing (records signer, time, IP, browser). Signup's "I agree" checkbox is never stored.

Decisions confirmed with you:

| Topic | Decision |
|---|---|
| Trigger | Customer Work with billing mode "SDP Global Pay as Billing Agent" (`invoice_through_platform`) **or** "Auto Invoice upon Approval" (`auto_invoice`). Not Invoice Separately, not internal work. |
| Frequency | Every contract that uses one of these modes. |
| SDP on behalf | SDP admin records an **offline acceptance**: confirmation tick, signer name, signer email (optional), accepted date, optional upload of the signed agreement. |
| Business user | Opens the full text, ticks "I have read and agree", in the wizard (Step 3) or before Create in the AI chat. |
| Legal text | SDP admins edit it with draft / publish / version history, in Templates → System Settings (the empty tab). Placeholders for business name, SDP entity, country. |
| Record | Who, when, IP, browser, terms version, the exact rendered text and its hash, method (`in_app` / `sdp_offline`), signer details and document for offline. Visible in contract details and the change history. |
| Existing contracts | Not blocked retroactively. A new acceptance is required only when an edit moves the contract **into** a triggering mode. |

Findings that shape the design:
- The SDP entity name column is `countries.companyName` (not `sdpEntity`); address and registration columns exist beside it.
- The wizard never sets `billingMode = 'direct'` for internal work (it keeps the default `invoice_separately`), so the trigger rule must also require `isForClient === true`.
- In edit mode the wizard sets `onBehalf: true` for every contract when SDP edits. Who-accepts is therefore decided by **caller role**: business user → in app, SDP → offline. The server enforces the same mapping.
- `insertContractSchema` strips unknown keys, so the acceptance payload is read from `req.body` before parsing.
- `db.transaction` exists but `storage.createContract` uses the module-level `db`; the acceptance row is inserted right after the contract and a failure deletes the contract (compensation) and returns 500.
- Admin email-template routes return `{ error }`; the new module uses `{ message, code }` per server/CLAUDE.md.

### Database step (you run it)

`npm run db:push` adds two enums and two tables. No existing table changes.

- `billing_terms_versions` (one row per version; at most one `draft` and one `published`, partial unique indexes).
- `contract_billing_terms_acceptances`.

Until a version is **published**, every contract using a triggering mode is refused with a clear message, so publish the terms right after deploying (or before, on a staging copy of the text).

## Changes

### 1. Schema (`shared/schema.ts`, near `contractChangeLog`)

Enums `billing_terms_status` (`draft | published | superseded`), `billing_terms_acceptance_method` (`in_app | sdp_offline`).

`billing_terms_versions`: `id, versionNumber (int, unique), title, bodyTemplate (text with {{placeholders}}), bodyHash, changelog, status, publishedAt, publishedByUserId, createdByUserId, updatedByUserId, createdAt, updatedAt`.

`contract_billing_terms_acceptances`: `id, contractId (FK, cascade), businessId, termsVersionId, termsVersionNumber, termsText (rendered text as shown), termsHash (sha256), billingMode, method, acceptedByUserId (null for offline), recordedByUserId, acceptedAt, ipAddress, userAgent, signerName, signerEmail, signedDocumentPath ('/objects/…'), createdAt`. Indexes on `contractId`, `businessId`, `termsVersionId`. Several rows per contract allowed; "current" = latest.

No column on `contracts`. Insert schemas and types exported.

### 2. Shared rules (new `shared/billingTerms.ts`)

- `requiresBillingTerms(billingMode, isForClient)`: client work and mode in `['invoice_through_platform','auto_invoice']`.
- `billingTermsChangeNeedsAcceptance({ before, after })`: `requiresBillingTerms(after) && !requiresBillingTerms(before)`.
- `BILLING_TERMS_PLACEHOLDERS` list (`businessName, sdpEntityName, sdpEntityAddress, countryName, countryCode, currency, today`) with descriptions and sample values; `renderBillingTerms(template, values)` (unknown placeholders left as is).
- Zod `billingTermsAcceptanceSchema` (discriminated on `method`): in app `{ termsVersionId, accepted: true }`; offline `{ termsVersionId, confirmed: true, signerName, signerEmail?, acceptedDate 'YYYY-MM-DD' (not in the future), signedDocumentPath? starting with '/objects/' }`.

### 3. Server module (new `server/modules/billingTerms/`: types, repository, service, controller, index)

Registered right after `registerBusinessProfileRoutes` (`routes.ts` ~7624) with a third arg `requireSdpRole(['sdp_super_admin','sdp_admin'])` for the admin routes (same as `ai/adminSettings`).

| Route | Who | Purpose |
|---|---|---|
| `GET /api/billing-terms/current?businessId=&countryId=` | signed in | Rendered published text + version. Business users: business is always their own (query ignored). SDP: must pass `businessId`. 404 `BILLING_TERMS_NOT_PUBLISHED`. |
| `GET /api/contracts/:id/billing-terms-acceptance` | same gate as `/change-log` | Latest acceptance with accepter / recorder names. |
| `GET /api/contracts/:id/billing-terms-acceptance/document-url` | same | Short-lived download URL for the signed document (mirrors payslip download-url). |
| `PUT /api/billing-terms/signed-document` | SDP | Sets the ACL on an uploaded object and returns `/objects/…` (mirrors `PUT /api/payslip-documents`). Called before the contract exists. |
| `GET /api/admin/billing-terms`, `GET …/versions`, `POST …` (create draft), `PUT …/:id` (edit draft), `POST …/:id/publish`, `POST …/preview` | SDP super admin / admin | Editor. Publish: hash the body, mark the old published row `superseded`, in one `db.transaction` (module-local SQL). 409 `BILLING_TERMS_DRAFT_EXISTS` for a second draft. |

Service functions used by `routes.ts`:
- `checkBillingTermsForCreate({ billingMode, isForClient, acceptanceRaw, callerUserType })` → `null` when not required, else a validated acceptance; errors 409 `BILLING_TERMS_NOT_PUBLISHED`, 409 `BILLING_TERMS_REQUIRED` (missing payload; body carries `currentVersionId`), 409 `BILLING_TERMS_OUTDATED` (version is no longer the published one), 400 `BILLING_TERMS_INVALID` (method does not match role, bad signer fields).
- `checkBillingTermsForUpdate({ before, after, acceptanceRaw, callerUserType })` → same, gated by `billingTermsChangeNeedsAcceptance`; `after.billingMode === undefined` means unchanged.
- `recordBillingTermsAcceptance(validated, ctx)`: renders text for the business and the contract's country, hashes, inserts; `acceptedAt` = now (in app) or signer date (offline); IP and user agent captured as in `POST /api/contracts/:id/sign`; then a `contract_change_log` row `billingTermsAccepted` = "v3 (in app)" / "v3 (offline, Jane Doe)". Label added to `TRACKED_CONTRACT_FIELDS` in `modules/contracts/changeLog.ts` (like `tierDiscounts`).
- Service built by a `createBillingTermsService(deps)` factory (repository + the two `storage` lookups) so it can be tested without a database; default instance exported.

`POST /api/contracts` (`routes.ts`):
1. ~5772: read `req.body.billingTermsAcceptance`, delete it from `contractData`.
2. ~5964, after the business-profile block and the billing-field validation: call `checkBillingTermsForCreate`; return its status/body on failure.
3. Right after `storage.createContract` (~6017), before the association upsert: `recordBillingTermsAcceptance`; on failure delete the contract row and return 500 `BILLING_TERMS_RECORD_FAILED`.

`PUT /api/contracts/:id`: pull `billingTermsAcceptance` out beside `contractDocument` (~6179, document-only fast path unchanged); after the tier-discount pre-check and before `storage.updateContract`, call `checkBillingTermsForUpdate`; after the update and change log, record the acceptance (log on failure, no compensation).

### 4. Client

| # | File | Change |
|---|---|---|
| a | new `components/modals/billing-terms-dialog.tsx` | Dialog (`max-h-[90vh]`, scroll area) showing the rendered text and version. Props: `mode: 'in_app' \| 'sdp_offline' \| 'read_only'`, `businessId?`, `countryId?`, `existingAcceptance?`, `onAccepted(payload, terms)`. Query `/api/billing-terms/current` with `staleTime: 0`. In app: checkbox "I have read and agree to the SDP Billing Terms (v{n})" + "Agree and continue". Offline: confirmation checkbox, signer name, signer email, accepted-on date (max today), `ObjectUploader` for the signed agreement → `PUT /api/billing-terms/signed-document`, "Record acceptance". Not published: Alert with role-specific copy, button disabled. Reading to the end is **not** required (short texts may not scroll; the recorded hash and the explicit tick carry the proof). Also exports `useBillingTermsCurrent()`. |
| b | `components/modals/contract-wizard-modal.tsx` | New state outside `formData`: `billingTermsAcceptance`, `billingTermsDialogOpen`; cleared whenever `billingMode` changes and on reset. Edit mode fetches the existing acceptance. Step 3, under the Customer Invoicing radio, when the mode triggers: card "SDP Billing Terms & Conditions" explaining that SDP will be the billing entity, with "Read and accept the terms" (SDP: "Record offline acceptance"), then a green "Accepted v{n}" row with View / Change; in edit mode with an acceptance on file and no mode change: read-only row. Step 3 Continue disabled until satisfied. `handleSubmit` guards and adds `billingTermsAcceptance` to the payload when needed. `onError`: on `BILLING_TERMS_OUTDATED` / `REQUIRED` / `NOT_PUBLISHED` clear the acceptance, go back to Step 3, reopen the dialog, toast "The billing terms were updated, please review and accept the new version." |
| c | `components/modals/ai-contract-chat-modal.tsx` | Create first opens the dialog when the draft's mode triggers and nothing is accepted yet (`sdp_offline` for admins with `&Business`, `in_app` otherwise); on accept, Create proceeds. `buildContractPayload` attaches the acceptance. Cleared when `draft.billingMode` changes and on close. `onError` handles the `BILLING_TERMS_*` codes without adding a chat bubble. Server checklist unchanged. One primer line so the AI can mention that these modes require accepting SDP's billing terms at Create. |
| d | `pages/contracts.tsx` | `ContractBillingTermsPanel` next to the change history: version, method, accepted by / signer, date, recorded by, "View terms text" (read-only dialog), "Signed agreement" link (fetches the download URL). Legacy contract in a triggering mode with no acceptance: muted "No acceptance on file". Hidden for workers and host-client viewers. |
| e | new `components/admin/billing-terms-admin-panel.tsx`, mounted in `pages/admin.tsx` System Settings tab (~1496) | Status header (published version or "not published, contracts blocked"), draft editor (title, body textarea, changelog), click-to-insert placeholder list from the shared helper, Preview (sample values), Save draft, Publish (confirm dialog), versions table with View. Invalidates `/api/admin/billing-terms*` and `/api/billing-terms/current`. In-panel guard for `sdp_super_admin` / `sdp_admin`. |

### 5. Context docs

`server/CLAUDE.md` (module registry row, schema tables and `billingTerms.ts`, error codes, data-access note on where the checks sit, recent changes), `client/CLAUDE.md` (new "SDP Billing Terms" section beside "Business profile", modal count, `components/admin/`, System Settings note, recent changes), root `CLAUDE.md` (module bullet, glossary entry).

## Not included

- Scroll-to-end before the checkbox enables (easy follow-up).
- Per-country or per-entity text variants (placeholders cover the entity name and address for now).
- Appending the terms or a reference to the generated contract document.
- Email to the business when terms are published or accepted.
- Making `VariableHelper` generic; the panel uses its own small placeholder list.

## Verification

| Check | How |
|---|---|
| Types | `npm run check` |
| Rules, rendering, payload schema | Script on `shared/billingTerms.ts`: trigger table (4 modes × isForClient), change-needs-acceptance cases, placeholders, Zod valid/invalid payloads |
| Service | Script using `createBillingTermsService` with stand-in repository and storage: every 409/400 code, role↔method mapping, hash equals sha256 of rendered text, record path |
| HTTP layer | Express on an ephemeral port with the stand-in service: current / acceptance / admin routes, role guards |
| Screens | Headless Chrome against Vite with all `/api/*` mocked: business user Step 3 (Continue disabled → dialog → tick → enabled → POST body carries the acceptance), SDP offline form with mocked upload, mocked 409 OUTDATED reopening the dialog, AI Create → dialog → Create, details card, admin panel save / preview / publish, dialog fits at 768×1024 |

Needs your database after `db:push` (you or a test login):
1. Publish a version in Templates → System Settings; a second draft is refused; publishing again supersedes the old one.
2. Create a Billing Agent contract as a business user and as SDP on behalf (with an uploaded file): acceptance row with hash, change-history line, IP and browser recorded; details card shows it and the document link opens.
3. Edit an Invoice Separately contract to Auto Invoice without accepting → refused; with acceptance → saved.
4. Force the acceptance insert to fail once and confirm the contract row is removed.
