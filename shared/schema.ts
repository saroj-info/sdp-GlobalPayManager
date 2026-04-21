import { sql, relations } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  integer,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  decimal,
  pgEnum,
  time,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User types enum
export const userTypeEnum = pgEnum('user_type', ['business_user', 'sdp_internal', 'worker', 'third_party_business']);

// SDP role enum for internal users
export const sdpRoleEnum = pgEnum('sdp_role', ['sdp_super_admin', 'sdp_admin', 'sdp_agent']);

// Legal entity type enum for SDP entities
export const legalEntityTypeEnum = pgEnum('legal_entity_type', ['company', 'corporation', 'partnership', 'limited_liability_company', 'sole_proprietorship', 'trust', 'other']);

// Email template scope type enum
export const emailTemplateScopeTypeEnum = pgEnum('email_template_scope_type', ['global', 'country', 'business']);

// Email template status enum  
export const emailTemplateStatusEnum = pgEnum('email_template_status', ['draft', 'published']);

// Country party type enum for shareholders, directors, and tax advisors
export const countryPartyTypeEnum = pgEnum('country_party_type', ['shareholder', 'director', 'tax_advisor']);

// Fee period enum for tax advisor fees
export const feePeriodEnum = pgEnum('fee_period', ['monthly', 'annual']);

// Jurisdiction calculation type enum
export const jurisdictionCalculationTypeEnum = pgEnum('jurisdiction_calculation_type', ['percent', 'flat', 'percent_with_cap', 'percent_above_threshold']);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phoneNumber: varchar("phone_number"),
  jobTitle: varchar("job_title"),
  company: varchar("company"),
  address: varchar("address"),
  city: varchar("city"),
  state: varchar("state"),
  postcode: varchar("postcode"),
  country: varchar("country"),
  userType: userTypeEnum("user_type").default('business_user'),
  sdpRole: sdpRoleEnum("sdp_role"), // Required for sdp_internal users
  accessibleCountries: text("accessible_countries").array().default([]), // for SDP internal users
  accessibleBusinessIds: text("accessible_business_ids").array().default([]), // for client scoping
  isActive: boolean("is_active").default(true), // for activating/deactivating users
  
  // Authentication fields
  passwordHash: varchar("password_hash"), // Hashed password for direct signup users
  emailVerified: boolean("email_verified").default(false), // Email verification status
  emailVerificationToken: varchar("email_verification_token"), // Token for email verification
  emailVerificationExpiresAt: timestamp("email_verification_expires_at"), // Token expiry
  
  // Password reset fields
  passwordResetToken: varchar("password_reset_token"), // Token for password reset
  passwordResetExpiresAt: timestamp("password_reset_expires_at"), // Token expiry (1 hour)
  passwordResetRequestedAt: timestamp("password_reset_requested_at"), // When reset was requested
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business entities that use the platform
export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  ownerId: varchar("owner_id").references(() => users.id).notNull(),
  accessibleCountries: text("accessible_countries").array().default([]),
  isRegistered: boolean("is_registered").default(true).notNull(),
  parentBusinessId: varchar("parent_business_id"),
  contactEmail: varchar("contact_email"),
  contactName: varchar("contact_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_businesses_owner").on(table.ownerId),
  index("idx_businesses_parent").on(table.parentBusinessId),
]);

// Countries and their SDP entities
export const countries = pgTable("countries", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  code: varchar("code", { length: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  isActive: boolean("is_active").default(true),
  
  // Company Details
  companyName: varchar("company_name").notNull(), // Renamed from sdpEntity for clarity
  companyRegistrationNumber: varchar("company_registration_number"),
  legalEntityType: legalEntityTypeEnum("legal_entity_type"),
  
  // Address Information
  streetAddress: varchar("street_address"),
  city: varchar("city"),
  stateProvince: varchar("state_province"),
  postalCode: varchar("postal_code"),
  country: varchar("country"), // For completeness in address
  
  // Tax & Compliance
  taxIdentificationNumber: varchar("tax_identification_number"), // TIN
  vatGstRegistrationNumber: varchar("vat_gst_registration_number"), // VAT/GST number
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }), // Default GST/VAT rate % for this country
  otherTaxDetails: text("other_tax_details"), // JSON string for additional tax info
  
  // Banking Information
  bankName: varchar("bank_name"),
  bankAccountNumber: varchar("bank_account_number"),
  swiftBicCode: varchar("swift_bic_code"),
  iban: varchar("iban"),
  
  // Contact Information
  phoneNumber: varchar("phone_number"),
  email: varchar("email"),
  website: varchar("website"),
  
  // Operational Details
  timezone: varchar("timezone"),
  businessHours: text("business_hours"), // JSON string for structured business hours
  invoicePrefix: varchar("invoice_prefix"),
  invoiceFormat: varchar("invoice_format"), // Format pattern for invoice numbers
  
  // Entity & Compliance Details
  entityNotes: text("entity_notes"), // Detailed notes about the entity
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Country parties (shareholders, directors, tax advisors)
export const countryParties = pgTable("country_parties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryId: varchar("country_id").references(() => countries.id).notNull(),
  type: countryPartyTypeEnum("type").notNull(),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  titleOrRole: varchar("title_or_role"),
  address: text("address"),
  
  // Shareholder-specific fields
  ownershipPercent: decimal("ownership_percent"),
  isCorporate: boolean("is_corporate").default(false),
  
  // Tax advisor-specific fields
  firmName: varchar("firm_name"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Country party contacts (for detailed contact information)
export const countryPartyContacts = pgTable("country_party_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partyId: varchar("party_id").references(() => countryParties.id).notNull(),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  title: varchar("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Country advisor fees (for tax advisor fee information)
export const countryAdvisorFees = pgTable("country_advisor_fees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partyId: varchar("party_id").references(() => countryParties.id).notNull(),
  amount: decimal("amount").notNull(),
  period: feePeriodEnum("period").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Country documents (incorporation docs, insurance, etc.)
export const countryDocuments = pgTable("country_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryId: varchar("country_id").references(() => countries.id).notNull(),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // e.g., 'incorporation', 'insurance', 'tax'
  objectKey: varchar("object_key").notNull(), // Object storage key
  size: decimal("size"), // File size in bytes
  contentType: varchar("content_type"),
  uploadedByUserId: varchar("uploaded_by_user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Role titles and descriptions
export const roleTitles = pgTable("role_titles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  businessId: varchar("business_id").references(() => businesses.id), // null means global/admin role
  applicableCountries: text("applicable_countries").array().default([]), // empty means all countries
  createdAt: timestamp("created_at").defaultNow(),
});

// Third-party businesses that provide workers
export const thirdPartyBusinesses = pgTable("third_party_businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  contactPerson: varchar("contact_person").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone").notNull(),
  countryId: varchar("country_id").references(() => countries.id).notNull(),
  userId: varchar("user_id").references(() => users.id), // The login account for this third-party business
  employingBusinessId: varchar("employing_business_id").references(() => businesses.id).notNull(), // Which business they're providing workers to
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SDP user invitations
export const sdpUserInvites = pgTable("sdp_user_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  phoneNumber: varchar("phone_number").notNull(),
  sdpRole: sdpRoleEnum("sdp_role").notNull(),
  accessibleCountries: text("accessible_countries").array().default([]),
  accessibleBusinessIds: text("accessible_business_ids").array().default([]),
  invitedByUserId: varchar("invited_by_user_id").references(() => users.id).notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Business user invitations (for business users to invite others to access their business)
export const businessUserInvites = pgTable("business_user_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  invitedByUserId: varchar("invited_by_user_id").references(() => users.id).notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Business invitations - When contractors invite businesses to join the platform
export const businessInvitations = pgTable("business_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractorId: varchar("contractor_id").references(() => workers.id).notNull(),
  businessEmail: varchar("business_email").notNull(),
  businessName: varchar("business_name").notNull(),
  contractorMessage: text("contractor_message"), // Optional message from contractor
  token: varchar("token").notNull().unique(),
  status: varchar("status").notNull().default('sent'), // 'sent', 'registered', 'expired'
  registeredBusinessId: varchar("registered_business_id").references(() => businesses.id), // Set when business registers
  expiresAt: timestamp("expires_at").notNull(),
  registeredAt: timestamp("registered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Worker-Business Associations - Many-to-many relationship between workers and businesses
export const workerBusinessAssociations = pgTable("worker_business_associations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").references(() => workers.id).notNull(),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  status: varchar("status").notNull().default('active'), // 'active', 'removed', 'pending'
  addedBy: varchar("added_by").references(() => users.id), // Who added this association (business user or system)
  addedViaInvitation: boolean("added_via_invitation").default(false), // True if added through contractor invitation
  businessInvitationId: varchar("business_invitation_id").references(() => businessInvitations.id), // Link to original invitation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Worker approval tokens - For single-click worker approval via email
export const workerApprovals = pgTable("worker_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").references(() => workers.id).notNull(),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  businessInvitationId: varchar("business_invitation_id").references(() => businessInvitations.id).notNull(),
  token: varchar("token").notNull().unique(),
  status: varchar("status").notNull().default('pending'), // 'pending', 'approved', 'rejected', 'expired'
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workers (employees, contractors, and third-party workers)
export const workerTypeEnum = pgEnum('worker_type', ['employee', 'contractor', 'third_party_worker']);
export const businessStructureEnum = pgEnum('business_structure', ['sole_trader', 'company', 'partnership', 'trust']);

export const workers = pgTable("workers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => businesses.id), // The business using the worker (nullable for independent contractors)
  thirdPartyBusinessId: varchar("third_party_business_id").references(() => thirdPartyBusinesses.id), // If this is a third-party worker
  userId: varchar("user_id").references(() => users.id), // null for third-party workers (they don't get direct login)
  
  // Personal Details
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull(),
  phoneNumber: varchar("phone_number"),
  dateOfBirth: timestamp("date_of_birth"),
  
  // Address Details
  streetAddress: varchar("street_address"),
  suburb: varchar("suburb"),
  state: varchar("state"),
  postcode: varchar("postcode"),
  countryId: varchar("country_id").references(() => countries.id), // Nullable for initial signup
  
  // Employment Details
  workerType: workerTypeEnum("worker_type").notNull(),
  
  // Business Structure (for contractors)
  businessStructure: businessStructureEnum("business_structure"), // null for employees
  businessName: varchar("business_name"), // for companies
  businessAddress: text("business_address"), // for companies if different from personal
  businessPhone: varchar("business_phone"),
  businessEmail: varchar("business_email"),
  
  // Tax Information
  taxFileNumber: varchar("tax_file_number"), // Australia TFN
  abn: varchar("abn"), // Australian Business Number
  acn: varchar("acn"), // Australian Company Number
  // New Zealand
  irdNumber: varchar("ird_number"), // IRD Number
  // USA
  ssn: varchar("ssn"), // Social Security Number
  ein: varchar("ein"), // Employer Identification Number
  // UK
  niNumber: varchar("ni_number"), // National Insurance Number
  utrNumber: varchar("utr_number"), // Unique Taxpayer Reference
  // Canada
  sin: varchar("sin"), // Social Insurance Number
  businessNumber: varchar("business_number"), // Canada Business Number
  
  // GST/VAT Registration
  gstRegistered: boolean("gst_registered").default(false),
  gstNumber: varchar("gst_number"),
  
  // Bank Details
  accountName: varchar("account_name"),
  bankName: varchar("bank_name"),
  bsb: varchar("bsb"), // Bank State Branch (Australia)
  accountNumber: varchar("account_number"),
  iban: varchar("iban"), // International Bank Account Number
  swiftCode: varchar("swift_code"),
  
  // Emergency Contact
  emergencyContactName: varchar("emergency_contact_name"),
  emergencyContactRelationship: varchar("emergency_contact_relationship"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  emergencyContactEmail: varchar("emergency_contact_email"),
  
  // Pension/Superannuation Details
  // Australia
  superFundName: varchar("super_fund_name"),
  superFundAbn: varchar("super_fund_abn"),
  superMemberNumber: varchar("super_member_number"),
  superFundAddress: text("super_fund_address"),
  // New Zealand - KiwiSaver
  kiwiSaverProvider: varchar("kiwi_saver_provider"),
  kiwiSaverNumber: varchar("kiwi_saver_number"),
  // USA - 401k
  plan401kProvider: varchar("plan_401k_provider"),
  plan401kNumber: varchar("plan_401k_number"),
  // UK - Pension
  pensionProvider: varchar("pension_provider"),
  pensionNumber: varchar("pension_number"),
  // Canada - CPP/QPP
  cppNumber: varchar("cpp_number"),
  qppNumber: varchar("qpp_number"),
  
  // Invitation / Onboarding Token (set when business or SDP admin adds worker, cleared after worker signs up)
  invitationToken: varchar("invitation_token"), // hashed token stored here
  invitationTokenExpiresAt: timestamp("invitation_token_expires_at"),

  // Onboarding Status
  invitationSent: boolean("invitation_sent").default(false),
  personalDetailsCompleted: boolean("personal_details_completed").default(false),
  businessDetailsCompleted: boolean("business_details_completed").default(false),
  bankDetailsCompleted: boolean("bank_details_completed").default(false),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  
  // Audit fields
  createdByUserId: varchar("created_by_user_id").references(() => users.id), // Who created this worker
  createdOnBehalfOfBusinessId: varchar("created_on_behalf_of_business_id").references(() => businesses.id), // If created on behalf of a business
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_workers_business").on(table.businessId),
  index("idx_workers_user").on(table.userId),
  index("idx_workers_email").on(table.email),
]);

// Employment and contract types
export const employmentTypeEnum = pgEnum('employment_type', ['contractor', 'permanent', 'fixed_term', 'casual', 'third_party_worker', 'zero_hours', 'at_will', 'gig_worker', 'on_call', 'seasonal', 'part_time']);
export const contractStatusEnum = pgEnum('contract_status', ['draft', 'pending_sdp_review', 'ready_to_issue', 'pending', 'active', 'completed', 'terminated']);
export const rateTypeEnum = pgEnum('rate_type', ['annual', 'hourly', 'daily']);

// Timesheet and leave types
export const timesheetFrequencyEnum = pgEnum('timesheet_frequency', ['weekly', 'fortnightly', 'semi_monthly', 'monthly']);
export const timesheetStatusEnum = pgEnum('timesheet_status', ['draft', 'submitted', 'approved', 'rejected']);
export const leaveTypeEnum = pgEnum('leave_type', ['annual', 'sick', 'personal', 'parental', 'compassionate', 'unpaid']);
export const leaveStatusEnum = pgEnum('leave_status', ['pending', 'approved', 'rejected', 'cancelled']);
export const invoicingFrequencyEnum = pgEnum('invoicing_frequency', ['weekly', 'fortnightly', 'monthly', 'quarterly']);
export const billingModeEnum = pgEnum('billing_mode', ['direct', 'invoice_through_platform', 'invoice_separately', 'auto_invoice']);

export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  workerId: varchar("worker_id").references(() => workers.id).notNull(),
  countryId: varchar("country_id").references(() => countries.id).notNull(),
  roleTitleId: varchar("role_title_id").references(() => roleTitles.id),
  customRoleTitle: varchar("custom_role_title"), // if not using predefined role
  templateId: varchar("template_id").references(() => contractTemplates.id), // contract template used to generate this contract
  employmentType: employmentTypeEnum("employment_type").notNull(),
  rateType: rateTypeEnum("rate_type").notNull(),
  rate: decimal("rate", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // null for permanent contracts
  status: contractStatusEnum("status").default('draft'),
  jobDescription: text("job_description"),
  contractDocument: text("contract_document"), // generated contract content
  requiresTimesheet: boolean("requires_timesheet").default(false),
  timesheetFrequency: timesheetFrequencyEnum("timesheet_frequency"),
  firstTimesheetStartDate: timestamp("first_timesheet_start_date"), // First period start date calculated from contract wizard
  
  // Timesheet Period Configuration
  timesheetCalculationMethod: varchar("timesheet_calculation_method"), // For weekly: 'monday_sunday', 'tuesday_monday', etc. For fortnightly: 'week_1' or 'week_2'. For monthly: day number (1-28). For semi-monthly: '1st_15th'
  paymentScheduleType: varchar("payment_schedule_type"), // 'days_after' or 'specific_day'
  paymentDay: varchar("payment_day"), // 'Monday', 'Tuesday', etc.
  paymentDaysAfterPeriod: integer("payment_days_after_period"), // e.g., 3 for 3 days after period ends
  paymentHolidayRule: boolean("payment_holiday_rule").default(true), // If true, pay on previous working day when payment day is holiday
  
  // Termination Notice Period
  noticePeriodDays: integer("notice_period_days"), // Number of days notice required for termination
  
  // Pay rate structure
  rateStructure: varchar("rate_structure"), // 'single' | 'multiple' — single rate or multiple project/penalty rates
  totalPackageValue: decimal("total_package_value", { precision: 12, scale: 2 }), // For salary contracts: total CTC entered by business

  // Customer/Client Work Fields
  isForClient: boolean("is_for_client").default(false), // true if work is for external client
  clientName: varchar("client_name"),
  clientAddress: text("client_address"),
  clientCity: varchar("client_city"),
  clientCountry: varchar("client_country"),
  clientContactEmail: varchar("client_contact_email"),
  clientContactPhone: varchar("client_contact_phone"),
  
  // 3rd Party Vendor Reference (for third_party_worker employment type)
  thirdPartyBusinessId: varchar("third_party_business_id").references(() => thirdPartyBusinesses.id), // Vendor company providing the worker (UC4)

  // SDP Entity Override (which SDP country entity handles this contract, defaults to countryId)
  sdpEntityId: varchar("sdp_entity_id").references(() => countries.id),

  // Customer Invoicing Fields (for third-party billing)
  billingMode: billingModeEnum("billing_mode"), // Explicit billing path: direct | invoice_through_platform | invoice_separately | auto_invoice
  invoiceCustomer: boolean("invoice_customer").default(false), // Legacy: true if SDP invoices the customer (derived from billingMode)
  customerBusinessId: varchar("customer_business_id").references(() => businesses.id), // The customer business entity to invoice (required when invoiceCustomer=true)
  customerBillingRate: decimal("customer_billing_rate", { precision: 12, scale: 2 }), // rate charged to customer
  customerBillingRateType: varchar("customer_billing_rate_type"), // 'hourly', 'daily', 'salary', 'per_occurrence'
  customerCurrency: varchar("customer_currency", { length: 3 }),
  invoicingFrequency: invoicingFrequencyEnum("invoicing_frequency"),
  paymentTerms: varchar("payment_terms"), // e.g., "30" for Net 30

  // Client billing type (rate-based vs fixed price)
  clientBillingType: varchar("client_billing_type"), // 'rate_based' | 'fixed_price'
  fixedBillingAmount: decimal("fixed_billing_amount", { precision: 12, scale: 2 }), // for fixed_price billing
  fixedBillingFrequency: varchar("fixed_billing_frequency"), // 'weekly' | 'fortnightly' | 'monthly' | 'per_project'
  
  // Email-based signing audit trail
  emailSentAt: timestamp("email_sent_at"),
  emailViewedAt: timestamp("email_viewed_at"),
  signedAt: timestamp("signed_at"),
  signingIpAddress: varchar("signing_ip_address"),
  signingLocation: text("signing_location"), // JSON string with location data
  signingUserAgent: text("signing_user_agent"),
  signingToken: varchar("signing_token"), // Unique token for the signing link
  signatureText: varchar("signature_text"), // The typed signature
  
  // Audit fields
  createdByUserId: varchar("created_by_user_id").references(() => users.id), // Who created this contract
  createdOnBehalfOfBusinessId: varchar("created_on_behalf_of_business_id").references(() => businesses.id), // If created on behalf of a business
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_contracts_business").on(table.businessId),
  index("idx_contracts_worker").on(table.workerId),
  index("idx_contracts_country").on(table.countryId),
  index("idx_contracts_status").on(table.status),
  index("idx_contracts_created_at").on(table.createdAt),
]);

// Remuneration types for multiple compensation lines
export const remunerationTypeEnum = pgEnum('remuneration_type', ['base_salary', 'bonus', 'commission', 'allowance', 'overtime', 'other']);
export const remunerationFrequencyEnum = pgEnum('remuneration_frequency', ['annual', 'monthly', 'per_occurrence', 'hourly', 'daily']);

// Remuneration Lines - Multiple compensation entries per contract
export const remunerationLines = pgTable("remuneration_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => contracts.id, { onDelete: 'cascade' }).notNull(),
  type: remunerationTypeEnum("type").notNull(),
  description: varchar("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  frequency: remunerationFrequencyEnum("frequency").notNull(),
  paymentTrigger: varchar("payment_trigger").default('scheduled'), // 'scheduled' | 'timesheet_period' | 'event_triggered'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contract Rate Lines - multiple project rates per contract
export const contractRateLines = pgTable("contract_rate_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => contracts.id, { onDelete: 'cascade' }).notNull(),
  projectName: varchar("project_name").notNull(),
  projectCode: varchar("project_code"),
  rateType: rateTypeEnum("rate_type").notNull(),
  rate: decimal("rate", { precision: 12, scale: 2 }).notNull(),
  clientRate: decimal("client_rate", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 3 }).notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isDefault: boolean("is_default").default(false),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchase Orders / SOW tracking
export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', ['open', 'closed', 'exhausted', 'cancelled']);

export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => contracts.id, { onDelete: 'cascade' }).notNull(),
  rateLinkId: varchar("rate_link_id").references(() => contractRateLines.id), // link to a specific project rate line (optional)
  poNumber: varchar("po_number").notNull(),
  sowNumber: varchar("sow_number"),
  projectName: varchar("project_name").notNull(),
  authorisedValue: decimal("authorised_value", { precision: 14, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  invoicedToDate: decimal("invoiced_to_date", { precision: 14, scale: 2 }).default('0'),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: purchaseOrderStatusEnum("status").default('open'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SelectContractRateLine = typeof contractRateLines.$inferSelect;
export type InsertContractRateLine = typeof contractRateLines.$inferInsert;

// Contract Billing Lines — SDP-only fee breakdown that makes up the SDP→Business invoice
// Business users have ZERO visibility into these lines
export const contractBillingLines = pgTable("contract_billing_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => contracts.id, { onDelete: 'cascade' }).notNull(),
  description: varchar("description").notNull(), // e.g. "Management Fee", "Employer Super Contribution"
  lineType: varchar("line_type").notNull(), // 'percentage_of_pay' | 'fixed_amount' | 'fixed_percentage'
  rate: decimal("rate", { precision: 8, scale: 4 }), // for percentage types: e.g. 0.15 = 15%
  amount: decimal("amount", { precision: 12, scale: 2 }), // computed or override amount
  currency: varchar("currency", { length: 3 }),
  frequency: varchar("frequency"), // 'per_timesheet_period' | 'monthly' | 'annual'
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_contract_billing_lines_contract").on(table.contractId),
]);

export type SelectContractBillingLine = typeof contractBillingLines.$inferSelect;
export type InsertContractBillingLine = typeof contractBillingLines.$inferInsert;

export const insertContractBillingLineSchema = createInsertSchema(contractBillingLines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SelectPurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

// Contract templates for different employment types and countries
export const contractTemplates = pgTable("contract_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  employmentType: employmentTypeEnum("employment_type").notNull(),
  countryId: varchar("country_id").references(() => countries.id), // null for global templates
  template: text("template").notNull(), // template content with placeholders
  templateFileUrl: text("template_file_url"), // Object storage path for uploaded template
  variables: text("variables"), // JSON array of template variables like ["workerName", "businessName"]
  uploadedBy: varchar("uploaded_by").references(() => users.id), // Admin user who uploaded
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contract signature statuses
export const contractSignatureStatusEnum = pgEnum('contract_signature_status', [
  'draft', 'sent_for_signature', 'partially_signed', 'fully_signed', 'expired', 'declined'
]);

// Contract instances - individual contracts sent for signing
export const contractInstances = pgTable("contract_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => contractTemplates.id).notNull(),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  workerId: varchar("worker_id").references(() => workers.id).notNull(),
  countryId: varchar("country_id").references(() => countries.id).notNull(),
  contractTitle: varchar("contract_title").notNull(),
  
  // Pre-filled contract details
  workerName: varchar("worker_name").notNull(),
  businessName: varchar("business_name").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  salaryAmount: decimal("salary_amount", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 3 }),
  rateType: rateTypeEnum("rate_type"),
  
  // Generated contract content
  contractContent: text("contract_content").notNull(), // Final contract with filled variables
  contractFileUrl: text("contract_file_url"), // Generated PDF contract for signing
  
  // Signature tracking
  signatureStatus: contractSignatureStatusEnum("signature_status").default('draft'),
  workerSignedAt: timestamp("worker_signed_at"),
  businessSignedAt: timestamp("business_signed_at"),
  workerSignatureUrl: text("worker_signature_url"), // Digital signature image
  businessSignatureUrl: text("business_signature_url"),
  
  // Workflow tracking
  sentAt: timestamp("sent_at"),
  expiresAt: timestamp("expires_at"),
  declinedAt: timestamp("declined_at"),
  declineReason: text("decline_reason"),
  
  // SDP workflow
  sdpNotified: boolean("sdp_notified").default(false),
  sdpNotifiedAt: timestamp("sdp_notified_at"),
  assignedSdpUserId: varchar("assigned_sdp_user_id").references(() => users.id),
  
  // Audit trail
  createdBy: varchar("created_by").references(() => users.id).notNull(), // Business user who created
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_contract_instances_business").on(table.businessId),
  index("idx_contract_instances_worker").on(table.workerId),
  index("idx_contract_instances_country").on(table.countryId),
  index("idx_contract_instances_created_at").on(table.createdAt),
]);

// Timesheets for tracking worker hours
export const timesheets = pgTable("timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => contracts.id).notNull(),
  workerId: varchar("worker_id").references(() => workers.id).notNull(),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalHours: decimal("total_hours", { precision: 8, scale: 2 }).default('0'),
  status: timesheetStatusEnum("status").default('draft'),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id), // Track who created (worker or SDP user)
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_timesheets_worker").on(table.workerId),
  index("idx_timesheets_business").on(table.businessId),
  index("idx_timesheets_status").on(table.status),
  index("idx_timesheets_created_at").on(table.createdAt),
]);

// Timesheet entries for daily hour tracking
export const timesheetEntries = pgTable("timesheet_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timesheetId: varchar("timesheet_id").references(() => timesheets.id).notNull(),
  date: timestamp("date").notNull(),
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }), // Optional for hourly contracts (auto-calculated)
  daysWorked: decimal("days_worked", { precision: 5, scale: 2 }), // For daily rate contracts (1 = full day, 0.5 = half day)
  projectRateLineId: varchar("project_rate_line_id").references(() => contractRateLines.id), // For multiple rates contracts
  
  // Hourly time tracking fields (for hourly rate contracts)
  startTime: time("start_time", { precision: 0 }), // e.g., 09:00:00
  endTime: time("end_time", { precision: 0 }), // e.g., 17:00:00
  breakHours: decimal("break_hours", { precision: 4, scale: 2 }), // e.g., 1.0 for 1 hour break
  
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Composite index to prevent duplicate entries per day and speed up lookups
  index("idx_timesheet_entries_timesheet_date").on(table.timesheetId, table.date),
]);

// Timesheet attachments for supporting documents
export const timesheetAttachments = pgTable("timesheet_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timesheetId: varchar("timesheet_id").references(() => timesheets.id).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_timesheet_attachments_timesheet").on(table.timesheetId),
]);

// Timesheet expenses for reimbursable claims
export const timesheetExpenses = pgTable("timesheet_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timesheetId: varchar("timesheet_id").references(() => timesheets.id).notNull(),
  date: timestamp("date").notNull(),
  category: varchar("category", { length: 50 }).notNull().default('other'), // travel, meals, accommodation, equipment, communication, other
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default('AUD'),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_timesheet_expenses_timesheet").on(table.timesheetId),
]);

// Leave requests for workers
export const leaveRequests = pgTable("leave_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").references(() => workers.id).notNull(),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalDays: decimal("total_days", { precision: 5, scale: 1 }).notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").default('pending'),
  submittedAt: timestamp("submitted_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payslips uploaded by SDP Global Pay internal users
export const payslips = pgTable("payslips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").references(() => workers.id).notNull(),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(), // SDP internal user
  payDate: timestamp("pay_date").notNull(),
  payPeriodStart: timestamp("pay_period_start").notNull(),
  payPeriodEnd: timestamp("pay_period_end").notNull(),
  grossTaxableWages: decimal("gross_taxable_wages", { precision: 12, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 12, scale: 2 }).notNull(),
  netPay: decimal("net_pay", { precision: 12, scale: 2 }).notNull(),
  superannuation: decimal("superannuation", { precision: 12, scale: 2 }).default('0'), // Australia
  providentFund: decimal("provident_fund", { precision: 12, scale: 2 }).default('0'), // Singapore/India
  kiwiSaver: decimal("kiwi_saver", { precision: 12, scale: 2 }).default('0'), // New Zealand
  currency: varchar("currency", { length: 3 }).notNull(),
  payslipFileUrl: text("payslip_file_url"), // Object storage path
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoice statuses
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid']);

// Invoices submitted by contractor workers
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractorId: varchar("contractor_id").references(() => workers.id).notNull(),
  businessId: varchar("business_id").references(() => businesses.id).notNull(),
  invoiceNumber: varchar("invoice_number").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  description: text("description"),
  hoursWorked: decimal("hours_worked", { precision: 8, scale: 2 }),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default('0'),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: invoiceStatusEnum("status").default('draft'),
  invoiceFileUrl: text("invoice_file_url"), // Object storage path for uploaded invoice document
  notes: text("notes"),
  // Timesheet reference if created from timesheet
  timesheetId: varchar("timesheet_id").references(() => timesheets.id),
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_invoices_business").on(table.businessId),
  index("idx_invoices_contractor").on(table.contractorId),
  index("idx_invoices_status").on(table.status),
  index("idx_invoices_created_at").on(table.createdAt),
]);

// SDP Invoice statuses - for invoices FROM SDP entities TO businesses
export const sdpInvoiceStatusEnum = pgEnum('sdp_invoice_status', ['draft', 'issued', 'sent', 'paid', 'overdue', 'cancelled']);

// SDP Invoice categories - type of invoice
export const invoiceCategoryEnum = pgEnum('invoice_category', ['customer_billing', 'sdp_services', 'business_to_client']);

// Margin payment statuses - tracking payment of margins to businesses
export const marginPaymentStatusEnum = pgEnum('margin_payment_status', ['pending', 'partial', 'paid']);

// SDP Invoices - Bills sent from SDP entities to businesses for services
export const sdpInvoices = pgTable("sdp_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Invoice basics
  invoiceNumber: varchar("invoice_number").notNull().unique(), // Sequential number with country prefix
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  invoiceCategory: invoiceCategoryEnum("invoice_category").default('sdp_services'), // Type of invoice
  
  // From/To parties
  fromCountryId: varchar("from_country_id").references(() => countries.id).notNull(), // SDP entity
  toBusinessId: varchar("to_business_id").references(() => businesses.id).notNull(), // Client business
  fromBusinessId: varchar("from_business_id").references(() => businesses.id), // Set for business_to_client invoices (the raising business)
  
  // Financial details
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  gstVatAmount: decimal("gst_vat_amount", { precision: 12, scale: 2 }).default('0'),
  gstVatRate: decimal("gst_vat_rate", { precision: 5, scale: 2 }).default('0'), // e.g. 10.00 for 10%
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  
  // Service details
  description: text("description").notNull(),
  serviceType: varchar("service_type").notNull(), // e.g., 'employment_services', 'timesheet_processing'
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  
  // Cross-border flags
  isCrossBorder: boolean("is_cross_border").default(false), // True if no GST/VAT applicable
  businessCountry: varchar("business_country"), // Business's country for GST calculation
  
  // Status and workflow
  status: sdpInvoiceStatusEnum("status").default('draft'),
  issuedAt: timestamp("issued_at"),
  sentAt: timestamp("sent_at"), // When invoice was sent to client
  paidAt: timestamp("paid_at"), // When payment was received
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default('0'), // Amount actually paid (supports partial payments)
  lastModified: timestamp("last_modified").defaultNow(), // Audit trail for edits
  
  // Customer billing specific (only for invoiceCategory='customer_billing')
  suggestedMargin: decimal("suggested_margin", { precision: 12, scale: 2 }), // Auto-calculated margin for customer billing invoices
  
  // Related entities
  timesheetId: varchar("timesheet_id").references(() => timesheets.id), // If created from timesheet
  contractId: varchar("contract_id").references(() => contracts.id), // If related to specific contract
  workerId: varchar("worker_id").references(() => workers.id), // If for specific worker services
  
  // Purchase Order linkage (optional)
  purchaseOrderId: varchar("purchase_order_id").references(() => purchaseOrders.id),

  // File storage
  invoiceFileUrl: text("invoice_file_url"), // Generated PDF invoice
  
  // Audit and notes
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id).notNull(), // SDP internal user
  approvedBy: varchar("approved_by").references(() => users.id), // For approval workflow if needed
  
  // Secure public view link (no login required)
  viewToken: varchar("view_token").unique().default(sql`gen_random_uuid()`),
  
  // Uploaded document (for business_to_client uploaded invoices)
  documentUrl: text("document_url"),
  
  // Stripe payment link (for unregistered host clients paying via Stripe)
  stripePaymentLink: varchar("stripe_payment_link"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SDP Invoice Line Items - Individual line items for SDP invoices
export const sdpInvoiceLineItems = pgTable("sdp_invoice_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => sdpInvoices.id, { onDelete: 'cascade' }).notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default('1'),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // quantity * unitPrice
  sortOrder: integer("sort_order").notNull().default(0), // For maintaining order of line items
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_sdp_invoice_line_items_invoice").on(table.invoiceId),
]);

// SDP Invoice Timesheets - Junction table linking consolidated SDP invoices to their source timesheets
export const sdpInvoiceTimesheets = pgTable("sdp_invoice_timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => sdpInvoices.id, { onDelete: 'cascade' }).notNull(),
  timesheetId: varchar("timesheet_id").references(() => timesheets.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_sdp_invoice_timesheets_unique").on(table.invoiceId, table.timesheetId),
  index("idx_sdp_invoice_timesheets_invoice").on(table.invoiceId),
  index("idx_sdp_invoice_timesheets_timesheet").on(table.timesheetId),
]);

export const insertSdpInvoiceTimesheetSchema = createInsertSchema(sdpInvoiceTimesheets).omit({
  id: true,
  createdAt: true,
});
export type InsertSdpInvoiceTimesheetType = z.infer<typeof insertSdpInvoiceTimesheetSchema>;
export type SelectSdpInvoiceTimesheetType = typeof sdpInvoiceTimesheets.$inferSelect;

// Margin Payments - Tracking margins paid to businesses from customer invoices
export const marginPayments = pgTable("margin_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Links to invoice and business
  sdpInvoiceId: varchar("sdp_invoice_id").references(() => sdpInvoices.id, { onDelete: 'cascade' }).notNull(),
  businessId: varchar("business_id").references(() => businesses.id, { onDelete: 'restrict' }).notNull(),
  contractId: varchar("contract_id").references(() => contracts.id, { onDelete: 'restrict' }), // For reporting joins
  
  // Payment details
  marginAmount: decimal("margin_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: marginPaymentStatusEnum("status").default('pending'),
  
  // Payment tracking
  paidDate: timestamp("paid_date"),
  paidByUserId: varchar("paid_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  
  // Metadata
  referenceNumber: varchar("reference_number"), // For reconciliation
  suggestedMargin: decimal("suggested_margin", { precision: 12, scale: 2 }), // Auto-calculated suggestion
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_margin_payments_invoice").on(table.sdpInvoiceId),
  index("idx_margin_payments_business").on(table.businessId),
  index("idx_margin_payments_contract").on(table.contractId),
  index("idx_margin_payments_status").on(table.status),
  index("idx_margin_payments_paid_date").on(table.paidDate),
]);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  ownedBusinesses: many(businesses),
  workerProfile: one(workers, {
    fields: [users.id],
    references: [workers.userId],
  }),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, {
    fields: [businesses.ownerId],
    references: [users.id],
  }),
  workers: many(workers),
  contracts: many(contracts),
  customRoleTitles: many(roleTitles),
  registeredFromInvitations: many(businessInvitations),
  workerBusinessAssociations: many(workerBusinessAssociations),
  workerApprovals: many(workerApprovals),
}));

export const countriesRelations = relations(countries, ({ many }) => ({
  workers: many(workers),
  contracts: many(contracts),
  contractTemplates: many(contractTemplates),
}));

export const roleTitlesRelations = relations(roleTitles, ({ one, many }) => ({
  business: one(businesses, {
    fields: [roleTitles.businessId],
    references: [businesses.id],
  }),
  contracts: many(contracts),
}));

export const workersRelations = relations(workers, ({ one, many }) => ({
  business: one(businesses, {
    fields: [workers.businessId],
    references: [businesses.id],
  }),
  user: one(users, {
    fields: [workers.userId],
    references: [users.id],
  }),
  country: one(countries, {
    fields: [workers.countryId],
    references: [countries.id],
  }),
  contracts: many(contracts),
  payslips: many(payslips),
  businessInvitations: many(businessInvitations),
  workerBusinessAssociations: many(workerBusinessAssociations),
  workerApprovals: many(workerApprovals),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  business: one(businesses, {
    fields: [contracts.businessId],
    references: [businesses.id],
  }),
  worker: one(workers, {
    fields: [contracts.workerId],
    references: [workers.id],
  }),
  country: one(countries, {
    fields: [contracts.countryId],
    references: [countries.id],
  }),
  roleTitle: one(roleTitles, {
    fields: [contracts.roleTitleId],
    references: [roleTitles.id],
  }),
  timesheets: many(timesheets),
}));

export const timesheetsRelations = relations(timesheets, ({ one, many }) => ({
  contract: one(contracts, {
    fields: [timesheets.contractId],
    references: [contracts.id],
  }),
  worker: one(workers, {
    fields: [timesheets.workerId],
    references: [workers.id],
  }),
  business: one(businesses, {
    fields: [timesheets.businessId],
    references: [businesses.id],
  }),
  approver: one(users, {
    fields: [timesheets.approvedBy],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [timesheets.createdBy],
    references: [users.id],
  }),
  entries: many(timesheetEntries),
  attachments: many(timesheetAttachments),
  expenses: many(timesheetExpenses),
}));

export const timesheetEntriesRelations = relations(timesheetEntries, ({ one }) => ({
  timesheet: one(timesheets, {
    fields: [timesheetEntries.timesheetId],
    references: [timesheets.id],
  }),
}));

export const timesheetExpensesRelations = relations(timesheetExpenses, ({ one }) => ({
  timesheet: one(timesheets, {
    fields: [timesheetExpenses.timesheetId],
    references: [timesheets.id],
  }),
}));

export const timesheetAttachmentsRelations = relations(timesheetAttachments, ({ one }) => ({
  timesheet: one(timesheets, {
    fields: [timesheetAttachments.timesheetId],
    references: [timesheets.id],
  }),
  uploader: one(users, {
    fields: [timesheetAttachments.uploadedBy],
    references: [users.id],
  }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  worker: one(workers, {
    fields: [leaveRequests.workerId],
    references: [workers.id],
  }),
  business: one(businesses, {
    fields: [leaveRequests.businessId],
    references: [businesses.id],
  }),
  approver: one(users, {
    fields: [leaveRequests.approvedBy],
    references: [users.id],
  }),
}));

export const payslipsRelations = relations(payslips, ({ one }) => ({
  worker: one(workers, {
    fields: [payslips.workerId],
    references: [workers.id],
  }),
  business: one(businesses, {
    fields: [payslips.businessId],
    references: [businesses.id],
  }),
  uploadedByUser: one(users, {
    fields: [payslips.uploadedBy],
    references: [users.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  contractor: one(workers, {
    fields: [invoices.contractorId],
    references: [workers.id],
  }),
  business: one(businesses, {
    fields: [invoices.businessId],
    references: [businesses.id],
  }),
  timesheet: one(timesheets, {
    fields: [invoices.timesheetId],
    references: [timesheets.id],
  }),
  reviewer: one(users, {
    fields: [invoices.reviewedBy],
    references: [users.id],
  }),
}));

// Relations for new business invitation tables
export const businessInvitationsRelations = relations(businessInvitations, ({ one, many }) => ({
  contractor: one(workers, {
    fields: [businessInvitations.contractorId],
    references: [workers.id],
  }),
  registeredBusiness: one(businesses, {
    fields: [businessInvitations.registeredBusinessId],
    references: [businesses.id],
  }),
  workerBusinessAssociations: many(workerBusinessAssociations),
  workerApprovals: many(workerApprovals),
}));

export const workerBusinessAssociationsRelations = relations(workerBusinessAssociations, ({ one }) => ({
  worker: one(workers, {
    fields: [workerBusinessAssociations.workerId],
    references: [workers.id],
  }),
  business: one(businesses, {
    fields: [workerBusinessAssociations.businessId],
    references: [businesses.id],
  }),
  addedByUser: one(users, {
    fields: [workerBusinessAssociations.addedBy],
    references: [users.id],
  }),
  businessInvitation: one(businessInvitations, {
    fields: [workerBusinessAssociations.businessInvitationId],
    references: [businessInvitations.id],
  }),
}));

export const workerApprovalsRelations = relations(workerApprovals, ({ one }) => ({
  worker: one(workers, {
    fields: [workerApprovals.workerId],
    references: [workers.id],
  }),
  business: one(businesses, {
    fields: [workerApprovals.businessId],
    references: [businesses.id],
  }),
  businessInvitation: one(businessInvitations, {
    fields: [workerApprovals.businessInvitationId],
    references: [businessInvitations.id],
  }),
}));

export const contractTemplatesRelations = relations(contractTemplates, ({ one, many }) => ({
  country: one(countries, {
    fields: [contractTemplates.countryId],
    references: [countries.id],
  }),
  uploadedByUser: one(users, {
    fields: [contractTemplates.uploadedBy],
    references: [users.id],
  }),
  instances: many(contractInstances),
}));

export const contractInstancesRelations = relations(contractInstances, ({ one }) => ({
  template: one(contractTemplates, {
    fields: [contractInstances.templateId],
    references: [contractTemplates.id],
  }),
  business: one(businesses, {
    fields: [contractInstances.businessId],
    references: [businesses.id],
  }),
  worker: one(workers, {
    fields: [contractInstances.workerId],
    references: [workers.id],
  }),
  country: one(countries, {
    fields: [contractInstances.countryId],
    references: [countries.id],
  }),
  createdByUser: one(users, {
    fields: [contractInstances.createdBy],
    references: [users.id],
  }),
  assignedSdpUser: one(users, {
    fields: [contractInstances.assignedSdpUserId],
    references: [users.id],
  }),
}));

// Schema types
// User sessions table for secure authentication
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
});

// Two-Factor Authentication tables
export const userTwoFactorAuth = pgTable("user_two_factor_auth", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  method: varchar("method").notNull().default('totp'), // 'totp', 'email'
  totpSecret: text("totp_secret"), // Encrypted TOTP secret
  backupCodes: text("backup_codes").array(), // Encrypted hashed backup codes
  isEnabled: boolean("is_enabled").default(false).notNull(),
  enabledAt: timestamp("enabled_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Trusted devices for adaptive authentication
export const trustedDevices = pgTable("trusted_devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceFingerprint: varchar("device_fingerprint").notNull(),
  deviceName: varchar("device_name"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  isTrusted: boolean("is_trusted").default(true).notNull(),
  lastUsedAt: timestamp("last_used_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit log for 2FA events
export const twoFactorAuditLog = pgTable("two_factor_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventType: varchar("event_type").notNull(), // 'enrollment_started', 'enrollment_completed', 'verification_success', 'verification_failed', 'backup_code_used', 'disabled', 'backup_codes_regenerated'
  eventDetails: text("event_details"), // Additional context as JSON string
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  deviceFingerprint: varchar("device_fingerprint"),
  success: boolean("success").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_2fa_audit_user").on(table.userId),
  index("idx_2fa_audit_created").on(table.createdAt),
]);

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;

export type UserTwoFactorAuth = typeof userTwoFactorAuth.$inferSelect;
export type InsertUserTwoFactorAuth = typeof userTwoFactorAuth.$inferInsert;

export type TrustedDevice = typeof trustedDevices.$inferSelect;
export type InsertTrustedDevice = typeof trustedDevices.$inferInsert;

export type TwoFactorAuditLog = typeof twoFactorAuditLog.$inferSelect;
export type InsertTwoFactorAuditLog = typeof twoFactorAuditLog.$inferInsert;

export type InsertBusiness = typeof businesses.$inferInsert;
export type Business = typeof businesses.$inferSelect;

export type InsertCountry = typeof countries.$inferInsert;
export type Country = typeof countries.$inferSelect;

export type InsertRoleTitle = typeof roleTitles.$inferInsert;
export type RoleTitle = typeof roleTitles.$inferSelect;

export type InsertWorker = typeof workers.$inferInsert;
export type Worker = typeof workers.$inferSelect;

export type InsertContract = typeof contracts.$inferInsert;
export type Contract = typeof contracts.$inferSelect;

export type RemunerationLine = typeof remunerationLines.$inferSelect;

export type InsertContractTemplate = typeof contractTemplates.$inferInsert;
export type ContractTemplate = typeof contractTemplates.$inferSelect;

export type InsertContractInstance = typeof contractInstances.$inferInsert;
export type ContractInstance = typeof contractInstances.$inferSelect;

export type InsertTimesheet = typeof timesheets.$inferInsert;
export type Timesheet = typeof timesheets.$inferSelect;

export type InsertTimesheetEntry = typeof timesheetEntries.$inferInsert;
export type TimesheetEntry = typeof timesheetEntries.$inferSelect;

export type InsertTimesheetAttachment = typeof timesheetAttachments.$inferInsert;
export type TimesheetAttachment = typeof timesheetAttachments.$inferSelect;

export type InsertTimesheetExpense = typeof timesheetExpenses.$inferInsert;
export type TimesheetExpense = typeof timesheetExpenses.$inferSelect;

export type InsertLeaveRequest = typeof leaveRequests.$inferInsert;
export type LeaveRequest = typeof leaveRequests.$inferSelect;

export type InsertPayslip = typeof payslips.$inferInsert;
export type Payslip = typeof payslips.$inferSelect;

export type InsertInvoice = typeof invoices.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;

export type InsertBusinessInvitation = typeof businessInvitations.$inferInsert;
export type BusinessInvitation = typeof businessInvitations.$inferSelect;

export type InsertWorkerBusinessAssociation = typeof workerBusinessAssociations.$inferInsert;
export type WorkerBusinessAssociation = typeof workerBusinessAssociations.$inferSelect;

export type InsertWorkerApproval = typeof workerApprovals.$inferInsert;
export type WorkerApproval = typeof workerApprovals.$inferSelect;

export type InsertThirdPartyBusiness = typeof thirdPartyBusinesses.$inferInsert;
export type ThirdPartyBusiness = typeof thirdPartyBusinesses.$inferSelect;

// Insert schemas
export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCountrySchema = createInsertSchema(countries).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  // Ensure businessHours and otherTaxDetails are properly validated as JSON strings
  businessHours: z.string().optional(),
  otherTaxDetails: z.string().optional(),
});

export const insertWorkerSchema = createInsertSchema(workers).omit({
  id: true,
  userId: true,
  invitationSent: true,
  personalDetailsCompleted: true,
  businessDetailsCompleted: true,
  bankDetailsCompleted: true,
  onboardingCompleted: true,
  createdByUserId: true,
  createdOnBehalfOfBusinessId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dateOfBirth: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  // Fields for SDP Internal users creating workers on behalf of businesses
  onBehalf: z.boolean().optional(), // UI flag to indicate creating on behalf
  selectedBusinessId: z.string().optional(), // The business ID when creating on behalf
});

export const insertBusinessInvitationSchema = createInsertSchema(businessInvitations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for user input when creating business invitations (only the fields the user provides)
export const createBusinessInvitationInputSchema = createInsertSchema(businessInvitations).pick({
  businessName: true,
  businessEmail: true,
  contractorMessage: true,
});

export const insertWorkerBusinessAssociationSchema = createInsertSchema(workerBusinessAssociations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkerApprovalSchema = createInsertSchema(workerApprovals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Onboarding step schemas
export const personalDetailsSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  streetAddress: z.string().min(1, "Street address is required"),
  suburb: z.string().min(1, "Suburb/City is required"),
  state: z.string().min(1, "State/Province is required"),
  postcode: z.string().min(1, "Postcode/Zip code is required"),
});

export const businessStructureSchema = z.object({
  businessStructure: z.enum(['sole_trader', 'company', 'partnership', 'trust']),
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional().or(z.literal("")),
  abn: z.string().optional(),
  acn: z.string().optional(),
  gstRegistered: z.boolean().default(false),
  gstNumber: z.string().optional(),
});

export const bankDetailsSchema = z.object({
  accountName: z.string().min(1, "Account name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  bsb: z.string().optional(),
  accountNumber: z.string().min(1, "Account number is required"),
  iban: z.string().optional(),
  swiftCode: z.string().optional(),
});

export const taxDetailsSchema = z.object({
  taxFileNumber: z.string().min(1, "Tax file number is required"),
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  contractDocument: true,
  createdByUserId: true,
  createdOnBehalfOfBusinessId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  rate: z.union([z.string(), z.number()]).refine(
    (val) => val !== '' && val !== null && val !== undefined && !isNaN(Number(val)),
    { message: 'Rate is required and must be a valid number' }
  ).transform((val) => String(val)),
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  firstTimesheetStartDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  // Handle numeric fields that might be empty strings
  totalPackageValue: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().transform((val) =>
    val === '' || val === null || val === undefined ? null : val
  ),
  fixedBillingAmount: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().transform((val) =>
    val === '' || val === null || val === undefined ? null : val
  ),
  customerBillingRate: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().transform((val) =>
    val === '' || val === null || val === undefined ? null : val
  ),
  paymentDaysAfterPeriod: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().transform((val) => 
    val === '' || val === null || val === undefined ? null : (typeof val === 'string' ? parseInt(val) : val)
  ),
  noticePeriodDays: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().transform((val) => 
    val === '' || val === null || val === undefined ? null : (typeof val === 'string' ? parseInt(val) : val)
  ),
  // FK fields — empty string should become null
  thirdPartyBusinessId: z.union([z.string(), z.null(), z.undefined()]).optional().transform((val) =>
    val === '' || val === null || val === undefined ? null : val
  ),
  sdpEntityId: z.union([z.string(), z.null(), z.undefined()]).optional().transform((val) =>
    val === '' || val === null || val === undefined ? null : val
  ),
  customerBusinessId: z.union([z.string(), z.null(), z.undefined()]).optional().transform((val) =>
    val === '' || val === null || val === undefined ? null : val
  ),
  roleTitleId: z.union([z.string(), z.null(), z.undefined()]).optional().transform((val) =>
    val === '' || val === null || val === undefined ? null : val
  ),
  // String fields that should be null when empty
  paymentDay: z.union([z.string(), z.null(), z.undefined()]).optional().transform((val) =>
    val === '' || val === null || val === undefined ? null : val
  ),
  timesheetCalculationMethod: z.union([z.string(), z.null(), z.undefined()]).optional().transform((val) =>
    val === '' || val === null || val === undefined ? null : val
  ),
  // billingMode — explicit billing path for customer-work contracts
  billingMode: z.enum(['direct', 'invoice_through_platform', 'invoice_separately', 'auto_invoice']).nullable().optional(),
  // Fields for SDP Internal users creating contracts on behalf of businesses
  onBehalf: z.boolean().optional(), // UI flag to indicate creating on behalf
  selectedBusinessId: z.string().optional(), // The business ID when creating on behalf
});

export const insertRemunerationLineSchema = createInsertSchema(remunerationLines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.union([z.string(), z.number()]).refine(
    (val) => val !== '' && val !== null && val !== undefined && !isNaN(Number(val)),
    { message: 'Remuneration amount is required and must be a valid number' }
  ).transform((val) => String(val)),
});

export type InsertRemunerationLineType = z.infer<typeof insertRemunerationLineSchema>;

export const insertRoleTitleSchema = createInsertSchema(roleTitles).omit({
  id: true,
  createdAt: true,
});

export const insertContractTemplateSchema = createInsertSchema(contractTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  countryId: z.string().nullable().optional(), // Allow null for global templates
});

export const insertContractInstanceSchema = createInsertSchema(contractInstances).omit({
  id: true,
  sentAt: true,
  workerSignedAt: true,
  businessSignedAt: true,
  declinedAt: true,
  sdpNotifiedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  expiresAt: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  salaryAmount: z.string().optional().transform((val) => val),
});

export type InsertContractTemplateType = z.infer<typeof insertContractTemplateSchema>;
export type InsertContractInstanceType = z.infer<typeof insertContractInstanceSchema>;

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  submittedAt: true,
  approvedAt: true,
  rejectedAt: true,
  approvedBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  periodStart: z.string().transform((val) => new Date(val)),
  periodEnd: z.string().transform((val) => new Date(val)),
});

export const insertTimesheetEntrySchema = createInsertSchema(timesheetEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.string().transform((val) => new Date(val)),
});

export const insertTimesheetAttachmentSchema = createInsertSchema(timesheetAttachments).omit({
  id: true,
  createdAt: true,
});

export const insertTimesheetExpenseSchema = createInsertSchema(timesheetExpenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.string().transform((val) => new Date(val)),
  amount: z.string(),
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  submittedAt: true,
  approvedAt: true,
  rejectedAt: true,
  approvedBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
});

export const insertPayslipSchema = createInsertSchema(payslips).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  payDate: z.string().transform((val) => new Date(val)),
  payPeriodStart: z.string().transform((val) => new Date(val)),
  payPeriodEnd: z.string().transform((val) => new Date(val)),
  grossTaxableWages: z.string().transform((val) => val),
  tax: z.string().transform((val) => val),
  netPay: z.string().transform((val) => val),
  superannuation: z.string().optional().transform((val) => val || '0'),
  providentFund: z.string().optional().transform((val) => val || '0'),
  kiwiSaver: z.string().optional().transform((val) => val || '0'),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  submittedAt: true,
  reviewedAt: true,
  reviewedBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  invoiceDate: z.string().transform((val) => new Date(val)),
  dueDate: z.string().transform((val) => new Date(val)),
  periodStart: z.string().transform((val) => new Date(val)),
  periodEnd: z.string().transform((val) => new Date(val)),
  subtotal: z.string().transform((val) => val),
  taxAmount: z.string().optional().transform((val) => val || '0'),
  totalAmount: z.string().transform((val) => val),
  hoursWorked: z.string().optional().transform((val) => val),
  hourlyRate: z.string().optional().transform((val) => val),
  kiwiSaver: z.string().optional().transform((val) => val || '0'),
});

// Third-party business schema
export const insertThirdPartyBusinessSchema = createInsertSchema(thirdPartyBusinesses).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// SDP user invite schema  
export const insertSdpUserInviteSchema = createInsertSchema(sdpUserInvites).omit({
  id: true,
  token: true,
  invitedByUserId: true, // Set server-side from req.user.id
  expiresAt: true, // Set server-side
  acceptedAt: true,
  createdAt: true,
});

// Business user invite schema
export const insertBusinessUserInviteSchema = createInsertSchema(businessUserInvites).omit({
  id: true,
  token: true,
  invitedByUserId: true, // Set server-side from req.user.id
  expiresAt: true, // Set server-side
  acceptedAt: true,
  createdAt: true,
});

// SDP Invoice schema  
export const insertSdpInvoiceSchema = createInsertSchema(sdpInvoices).omit({
  id: true,
  issuedAt: true,
  sentAt: true,
  paidAt: true,
  paidAmount: true,
  lastModified: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  invoiceDate: z.string().transform((val) => new Date(val)),
  dueDate: z.string().transform((val) => new Date(val)),
  periodStart: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  periodEnd: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  subtotal: z.string().transform((val) => val),
  gstVatAmount: z.string().optional().transform((val) => val || '0'),
  gstVatRate: z.string().optional().transform((val) => val || '0'),
  totalAmount: z.string().transform((val) => val),
});

// SDP Invoice Line Items schema
export const insertSdpInvoiceLineItemSchema = createInsertSchema(sdpInvoiceLineItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  quantity: z.string().optional().transform((val) => val || '1'),
  unitPrice: z.string().transform((val) => val),
  amount: z.string().transform((val) => val),
});

// Margin Payments schema
export const insertMarginPaymentSchema = createInsertSchema(marginPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  marginAmount: z.string().transform((val) => val),
  suggestedMargin: z.string().optional().transform((val) => val || undefined),
  paidDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

// Email Template Management System
// ================================

// Email template definitions - defines what email types exist and their metadata
export const emailTemplateDefinitions = pgTable("email_template_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(), // e.g., 'welcome_after_signup', 'email_verification'
  name: varchar("name").notNull(), // Display name for UI
  category: varchar("category").notNull(), // e.g., 'user_account', 'business', 'notifications'
  description: text("description").notNull(), // When this email is triggered
  triggeredFromScreen: varchar("triggered_from_screen").notNull(), // Which screen/page triggers this
  allowedVariables: text("allowed_variables").array().default([]), // Variables available for templates
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email templates - actual template content with versioning and scoping
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  definitionId: varchar("definition_id").references(() => emailTemplateDefinitions.id).notNull(),
  locale: varchar("locale").default('en'), // Language/locale for template
  scopeType: emailTemplateScopeTypeEnum("scope_type").default('global'), // global, country, business
  scopeId: varchar("scope_id"), // null for global, country id or business id for scoped
  subjectTemplate: text("subject_template").notNull(), // Subject line template with variables
  htmlTemplate: text("html_template").notNull(), // HTML email template
  textTemplate: text("text_template"), // Plain text fallback
  fromDisplayName: varchar("from_display_name"), // Override display name for this template
  fromLocalPart: varchar("from_local_part"), // Override email local part (before @) 
  status: emailTemplateStatusEnum("status").default('draft'), // draft or published
  versionNumber: varchar("version_number").default('1.0'), // Version for tracking changes
  publishedAt: timestamp("published_at"),
  publishedByUserId: varchar("published_by_user_id").references(() => users.id),
  createdByUserId: varchar("created_by_user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_email_templates_lookup").on(table.definitionId, table.locale, table.scopeType, table.scopeId, table.status),
]);

// Email template versions - historical record of all template changes
export const emailTemplateVersions = pgTable("email_template_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => emailTemplates.id).notNull(),
  versionNumber: varchar("version_number").notNull(),
  subjectTemplate: text("subject_template").notNull(),
  htmlTemplate: text("html_template").notNull(), 
  textTemplate: text("text_template"),
  fromDisplayName: varchar("from_display_name"),
  fromLocalPart: varchar("from_local_part"),
  changelog: text("changelog"), // Description of what changed in this version
  createdByUserId: varchar("created_by_user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email settings - global email configuration
export const emailSettings = pgTable("email_settings", {
  id: varchar("id").primaryKey().default('singleton'), // Only one row allowed
  defaultFromDisplayName: varchar("default_from_display_name").default('SDP Global Pay'),
  defaultFromLocalPart: varchar("default_from_local_part").default('onboard'),
  replyToLocalPart: varchar("reply_to_local_part").default('support'),
  bounceHandling: text("bounce_handling"), // JSON config for bounce handling
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email template insert schemas
export const insertEmailTemplateDefinitionSchema = createInsertSchema(emailTemplateDefinitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  publishedAt: true,
  publishedByUserId: true,
  createdByUserId: true, // Set from authenticated user
  createdAt: true,
  updatedAt: true,
});

export const insertEmailTemplateVersionSchema = createInsertSchema(emailTemplateVersions).omit({
  id: true,
  createdByUserId: true, // Set from authenticated user
  createdAt: true,
});

export const insertEmailSettingsSchema = createInsertSchema(emailSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Jurisdiction management table
export const jurisdictions = pgTable("jurisdictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryId: varchar("country_id").notNull(),
  stateProvince: varchar("state_province").notNull(), // e.g., "New South Wales", "California"
  name: varchar("name").notNull(), // e.g., "Payroll tax (NSW)", "CA UI (SUTA)"
  calculationType: jurisdictionCalculationTypeEnum("calculation_type").notNull(),
  value: decimal("value", { precision: 10, scale: 4 }), // percentage or flat amount
  capAmount: decimal("cap_amount", { precision: 12, scale: 2 }), // for percent_with_cap
  thresholdAmount: decimal("threshold_amount", { precision: 12, scale: 2 }), // for percent_above_threshold
  note: text("note"), // Additional notes for the jurisdiction rule
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Jurisdiction insert schema
export const insertJurisdictionSchema = createInsertSchema(jurisdictions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Jurisdiction relations
export const jurisdictionsRelations = relations(jurisdictions, ({ one }) => ({
  country: one(countries, {
    fields: [jurisdictions.countryId],
    references: [countries.id],
  }),
}));

// Email template select types
export type SelectEmailTemplateDefinitionType = typeof emailTemplateDefinitions.$inferSelect;
export type SelectEmailTemplateType = typeof emailTemplates.$inferSelect;
export type SelectEmailTemplateVersionType = typeof emailTemplateVersions.$inferSelect;
export type SelectEmailSettingsType = typeof emailSettings.$inferSelect;

// Email template insert types
export type InsertEmailTemplateDefinitionType = z.infer<typeof insertEmailTemplateDefinitionSchema>;
export type InsertEmailTemplateType = z.infer<typeof insertEmailTemplateSchema>;
export type InsertEmailTemplateVersionType = z.infer<typeof insertEmailTemplateVersionSchema>;
export type InsertEmailSettingsType = z.infer<typeof insertEmailSettingsSchema>;

// Country entity management insert schemas
export const insertCountryPartySchema = createInsertSchema(countryParties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCountryPartyContactSchema = createInsertSchema(countryPartyContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCountryAdvisorFeeSchema = createInsertSchema(countryAdvisorFees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCountryDocumentSchema = createInsertSchema(countryDocuments).omit({
  id: true,
  uploadedByUserId: true, // Set from authenticated user
  createdAt: true,
});

// Country entity management select types
export type SelectCountryPartyType = typeof countryParties.$inferSelect;
export type SelectCountryPartyContactType = typeof countryPartyContacts.$inferSelect;
export type SelectCountryAdvisorFeeType = typeof countryAdvisorFees.$inferSelect;
export type SelectCountryDocumentType = typeof countryDocuments.$inferSelect;

// Country entity management insert types
export type InsertCountryPartyType = z.infer<typeof insertCountryPartySchema>;
export type InsertCountryPartyContactType = z.infer<typeof insertCountryPartyContactSchema>;
export type InsertCountryAdvisorFeeType = z.infer<typeof insertCountryAdvisorFeeSchema>;
export type InsertCountryDocumentType = z.infer<typeof insertCountryDocumentSchema>;

export type InsertThirdPartyBusinessType = z.infer<typeof insertThirdPartyBusinessSchema>;
export type InsertSdpUserInviteType = z.infer<typeof insertSdpUserInviteSchema>;
export type InsertBusinessUserInviteType = z.infer<typeof insertBusinessUserInviteSchema>;
export type InsertCountryType = z.infer<typeof insertCountrySchema>;
export type InsertWorkerType = z.infer<typeof insertWorkerSchema>;
export type InsertPayslipType = z.infer<typeof insertPayslipSchema>;
export type InsertInvoiceType = z.infer<typeof insertInvoiceSchema>;
export type InsertSdpInvoiceType = z.infer<typeof insertSdpInvoiceSchema>;
export type SelectSdpInvoiceType = typeof sdpInvoices.$inferSelect;
export type InsertSdpInvoiceLineItemType = z.infer<typeof insertSdpInvoiceLineItemSchema>;
export type SelectSdpInvoiceLineItemType = typeof sdpInvoiceLineItems.$inferSelect;
export type InsertMarginPaymentType = z.infer<typeof insertMarginPaymentSchema>;
export type SelectMarginPaymentType = typeof marginPayments.$inferSelect;

// Jurisdiction types
export type InsertJurisdictionType = z.infer<typeof insertJurisdictionSchema>;
export type SelectJurisdictionType = typeof jurisdictions.$inferSelect;
