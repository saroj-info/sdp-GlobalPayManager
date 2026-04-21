CREATE TYPE "public"."billing_mode" AS ENUM('direct', 'invoice_through_platform', 'invoice_separately', 'auto_invoice');--> statement-breakpoint
CREATE TYPE "public"."business_structure" AS ENUM('sole_trader', 'company', 'partnership', 'trust');--> statement-breakpoint
CREATE TYPE "public"."contract_signature_status" AS ENUM('draft', 'sent_for_signature', 'partially_signed', 'fully_signed', 'expired', 'declined');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('draft', 'pending_sdp_review', 'ready_to_issue', 'pending', 'active', 'completed', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."country_party_type" AS ENUM('shareholder', 'director', 'tax_advisor');--> statement-breakpoint
CREATE TYPE "public"."email_template_scope_type" AS ENUM('global', 'country', 'business');--> statement-breakpoint
CREATE TYPE "public"."email_template_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('contractor', 'permanent', 'fixed_term', 'casual', 'third_party_worker', 'zero_hours', 'at_will', 'gig_worker', 'on_call', 'seasonal', 'part_time');--> statement-breakpoint
CREATE TYPE "public"."fee_period" AS ENUM('monthly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."invoice_category" AS ENUM('customer_billing', 'sdp_services', 'business_to_client');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid');--> statement-breakpoint
CREATE TYPE "public"."invoicing_frequency" AS ENUM('weekly', 'fortnightly', 'monthly', 'quarterly');--> statement-breakpoint
CREATE TYPE "public"."jurisdiction_calculation_type" AS ENUM('percent', 'flat', 'percent_with_cap', 'percent_above_threshold');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('annual', 'sick', 'personal', 'parental', 'compassionate', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."legal_entity_type" AS ENUM('company', 'corporation', 'partnership', 'limited_liability_company', 'sole_proprietorship', 'trust', 'other');--> statement-breakpoint
CREATE TYPE "public"."margin_payment_status" AS ENUM('pending', 'partial', 'paid');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('open', 'closed', 'exhausted', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."rate_type" AS ENUM('annual', 'hourly', 'daily');--> statement-breakpoint
CREATE TYPE "public"."remuneration_frequency" AS ENUM('annual', 'monthly', 'per_occurrence', 'hourly', 'daily');--> statement-breakpoint
CREATE TYPE "public"."remuneration_type" AS ENUM('base_salary', 'bonus', 'commission', 'allowance', 'overtime', 'other');--> statement-breakpoint
CREATE TYPE "public"."sdp_invoice_status" AS ENUM('draft', 'issued', 'sent', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sdp_role" AS ENUM('sdp_super_admin', 'sdp_admin', 'sdp_agent');--> statement-breakpoint
CREATE TYPE "public"."timesheet_frequency" AS ENUM('weekly', 'fortnightly', 'semi_monthly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."timesheet_status" AS ENUM('draft', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('business_user', 'sdp_internal', 'worker', 'third_party_business');--> statement-breakpoint
CREATE TYPE "public"."worker_type" AS ENUM('employee', 'contractor', 'third_party_worker');--> statement-breakpoint
CREATE TABLE "business_invitations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" varchar NOT NULL,
	"business_email" varchar NOT NULL,
	"business_name" varchar NOT NULL,
	"contractor_message" text,
	"token" varchar NOT NULL,
	"status" varchar DEFAULT 'sent' NOT NULL,
	"registered_business_id" varchar,
	"expires_at" timestamp NOT NULL,
	"registered_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "business_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "business_user_invites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"invited_by_user_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "business_user_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"owner_id" varchar NOT NULL,
	"accessible_countries" text[] DEFAULT '{}',
	"is_registered" boolean DEFAULT true NOT NULL,
	"parent_business_id" varchar,
	"contact_email" varchar,
	"contact_name" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contract_billing_lines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"description" varchar NOT NULL,
	"line_type" varchar NOT NULL,
	"rate" numeric(8, 4),
	"amount" numeric(12, 2),
	"currency" varchar(3),
	"frequency" varchar,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contract_instances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"worker_id" varchar NOT NULL,
	"country_id" varchar NOT NULL,
	"contract_title" varchar NOT NULL,
	"worker_name" varchar NOT NULL,
	"business_name" varchar NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"salary_amount" numeric(12, 2),
	"currency" varchar(3),
	"rate_type" "rate_type",
	"contract_content" text NOT NULL,
	"contract_file_url" text,
	"signature_status" "contract_signature_status" DEFAULT 'draft',
	"worker_signed_at" timestamp,
	"business_signed_at" timestamp,
	"worker_signature_url" text,
	"business_signature_url" text,
	"sent_at" timestamp,
	"expires_at" timestamp,
	"declined_at" timestamp,
	"decline_reason" text,
	"sdp_notified" boolean DEFAULT false,
	"sdp_notified_at" timestamp,
	"assigned_sdp_user_id" varchar,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contract_rate_lines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"project_name" varchar NOT NULL,
	"project_code" varchar,
	"rate_type" "rate_type" NOT NULL,
	"rate" numeric(12, 2) NOT NULL,
	"client_rate" numeric(12, 2),
	"currency" varchar(3) NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_default" boolean DEFAULT false,
	"notes" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"employment_type" "employment_type" NOT NULL,
	"country_id" varchar,
	"template" text NOT NULL,
	"template_file_url" text,
	"variables" text,
	"uploaded_by" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"worker_id" varchar NOT NULL,
	"country_id" varchar NOT NULL,
	"role_title_id" varchar,
	"custom_role_title" varchar,
	"template_id" varchar,
	"employment_type" "employment_type" NOT NULL,
	"rate_type" "rate_type" NOT NULL,
	"rate" numeric(12, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"status" "contract_status" DEFAULT 'draft',
	"job_description" text,
	"contract_document" text,
	"requires_timesheet" boolean DEFAULT false,
	"timesheet_frequency" timesheet_frequency,
	"first_timesheet_start_date" timestamp,
	"timesheet_calculation_method" varchar,
	"payment_schedule_type" varchar,
	"payment_day" varchar,
	"payment_days_after_period" integer,
	"payment_holiday_rule" boolean DEFAULT true,
	"notice_period_days" integer,
	"rate_structure" varchar,
	"total_package_value" numeric(12, 2),
	"is_for_client" boolean DEFAULT false,
	"client_name" varchar,
	"client_address" text,
	"client_city" varchar,
	"client_country" varchar,
	"client_contact_email" varchar,
	"client_contact_phone" varchar,
	"third_party_business_id" varchar,
	"sdp_entity_id" varchar,
	"billing_mode" "billing_mode",
	"invoice_customer" boolean DEFAULT false,
	"customer_business_id" varchar,
	"customer_billing_rate" numeric(12, 2),
	"customer_billing_rate_type" varchar,
	"customer_currency" varchar(3),
	"invoicing_frequency" "invoicing_frequency",
	"payment_terms" varchar,
	"client_billing_type" varchar,
	"fixed_billing_amount" numeric(12, 2),
	"fixed_billing_frequency" varchar,
	"email_sent_at" timestamp,
	"email_viewed_at" timestamp,
	"signed_at" timestamp,
	"signing_ip_address" varchar,
	"signing_location" text,
	"signing_user_agent" text,
	"signing_token" varchar,
	"signature_text" varchar,
	"created_by_user_id" varchar,
	"created_on_behalf_of_business_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"code" varchar(2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"is_active" boolean DEFAULT true,
	"company_name" varchar NOT NULL,
	"company_registration_number" varchar,
	"legal_entity_type" "legal_entity_type",
	"street_address" varchar,
	"city" varchar,
	"state_province" varchar,
	"postal_code" varchar,
	"country" varchar,
	"tax_identification_number" varchar,
	"vat_gst_registration_number" varchar,
	"gst_rate" numeric(5, 2),
	"other_tax_details" text,
	"bank_name" varchar,
	"bank_account_number" varchar,
	"swift_bic_code" varchar,
	"iban" varchar,
	"phone_number" varchar,
	"email" varchar,
	"website" varchar,
	"timezone" varchar,
	"business_hours" text,
	"invoice_prefix" varchar,
	"invoice_format" varchar,
	"entity_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "country_advisor_fees" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_id" varchar NOT NULL,
	"amount" numeric NOT NULL,
	"period" "fee_period" NOT NULL,
	"currency" varchar(3) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "country_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"category" varchar NOT NULL,
	"object_key" varchar NOT NULL,
	"size" numeric,
	"content_type" varchar,
	"uploaded_by_user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "country_parties" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" varchar NOT NULL,
	"type" "country_party_type" NOT NULL,
	"name" varchar NOT NULL,
	"email" varchar,
	"phone" varchar,
	"title_or_role" varchar,
	"address" text,
	"ownership_percent" numeric,
	"is_corporate" boolean DEFAULT false,
	"firm_name" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "country_party_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"email" varchar,
	"phone" varchar,
	"title" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_settings" (
	"id" varchar PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"default_from_display_name" varchar DEFAULT 'SDP Global Pay',
	"default_from_local_part" varchar DEFAULT 'onboard',
	"reply_to_local_part" varchar DEFAULT 'support',
	"bounce_handling" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_template_definitions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar NOT NULL,
	"name" varchar NOT NULL,
	"category" varchar NOT NULL,
	"description" text NOT NULL,
	"triggered_from_screen" varchar NOT NULL,
	"allowed_variables" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "email_template_definitions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "email_template_versions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"version_number" varchar NOT NULL,
	"subject_template" text NOT NULL,
	"html_template" text NOT NULL,
	"text_template" text,
	"from_display_name" varchar,
	"from_local_part" varchar,
	"changelog" text,
	"created_by_user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"definition_id" varchar NOT NULL,
	"locale" varchar DEFAULT 'en',
	"scope_type" "email_template_scope_type" DEFAULT 'global',
	"scope_id" varchar,
	"subject_template" text NOT NULL,
	"html_template" text NOT NULL,
	"text_template" text,
	"from_display_name" varchar,
	"from_local_part" varchar,
	"status" "email_template_status" DEFAULT 'draft',
	"version_number" varchar DEFAULT '1.0',
	"published_at" timestamp,
	"published_by_user_id" varchar,
	"created_by_user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"invoice_number" varchar NOT NULL,
	"invoice_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"description" text,
	"hours_worked" numeric(8, 2),
	"hourly_rate" numeric(8, 2),
	"subtotal" numeric(12, 2) NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0',
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" "invoice_status" DEFAULT 'draft',
	"invoice_file_url" text,
	"notes" text,
	"timesheet_id" varchar,
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"reviewed_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jurisdictions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" varchar NOT NULL,
	"state_province" varchar NOT NULL,
	"name" varchar NOT NULL,
	"calculation_type" "jurisdiction_calculation_type" NOT NULL,
	"value" numeric(10, 4),
	"cap_amount" numeric(12, 2),
	"threshold_amount" numeric(12, 2),
	"note" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"leave_type" "leave_type" NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"total_days" numeric(5, 1) NOT NULL,
	"reason" text,
	"status" "leave_status" DEFAULT 'pending',
	"submitted_at" timestamp DEFAULT now(),
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"approved_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "margin_payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sdp_invoice_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"contract_id" varchar,
	"margin_amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" "margin_payment_status" DEFAULT 'pending',
	"paid_date" timestamp,
	"paid_by_user_id" varchar,
	"reference_number" varchar,
	"suggested_margin" numeric(12, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"uploaded_by" varchar NOT NULL,
	"pay_date" timestamp NOT NULL,
	"pay_period_start" timestamp NOT NULL,
	"pay_period_end" timestamp NOT NULL,
	"gross_taxable_wages" numeric(12, 2) NOT NULL,
	"tax" numeric(12, 2) NOT NULL,
	"net_pay" numeric(12, 2) NOT NULL,
	"superannuation" numeric(12, 2) DEFAULT '0',
	"provident_fund" numeric(12, 2) DEFAULT '0',
	"kiwi_saver" numeric(12, 2) DEFAULT '0',
	"currency" varchar(3) NOT NULL,
	"payslip_file_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"rate_link_id" varchar,
	"po_number" varchar NOT NULL,
	"sow_number" varchar,
	"project_name" varchar NOT NULL,
	"authorised_value" numeric(14, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"invoiced_to_date" numeric(14, 2) DEFAULT '0',
	"start_date" timestamp,
	"end_date" timestamp,
	"status" "purchase_order_status" DEFAULT 'open',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "remuneration_lines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"type" "remuneration_type" NOT NULL,
	"description" varchar NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"frequency" "remuneration_frequency" NOT NULL,
	"payment_trigger" varchar DEFAULT 'scheduled',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_titles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"business_id" varchar,
	"applicable_countries" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sdp_invoice_line_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sdp_invoice_timesheets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"timesheet_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sdp_invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar NOT NULL,
	"invoice_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"invoice_category" "invoice_category" DEFAULT 'sdp_services',
	"from_country_id" varchar NOT NULL,
	"to_business_id" varchar NOT NULL,
	"from_business_id" varchar,
	"subtotal" numeric(12, 2) NOT NULL,
	"gst_vat_amount" numeric(12, 2) DEFAULT '0',
	"gst_vat_rate" numeric(5, 2) DEFAULT '0',
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"description" text NOT NULL,
	"service_type" varchar NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"is_cross_border" boolean DEFAULT false,
	"business_country" varchar,
	"status" "sdp_invoice_status" DEFAULT 'draft',
	"issued_at" timestamp,
	"sent_at" timestamp,
	"paid_at" timestamp,
	"paid_amount" numeric(12, 2) DEFAULT '0',
	"last_modified" timestamp DEFAULT now(),
	"suggested_margin" numeric(12, 2),
	"timesheet_id" varchar,
	"contract_id" varchar,
	"worker_id" varchar,
	"purchase_order_id" varchar,
	"invoice_file_url" text,
	"notes" text,
	"created_by" varchar NOT NULL,
	"approved_by" varchar,
	"view_token" varchar DEFAULT gen_random_uuid(),
	"document_url" text,
	"stripe_payment_link" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sdp_invoices_invoice_number_unique" UNIQUE("invoice_number"),
	CONSTRAINT "sdp_invoices_view_token_unique" UNIQUE("view_token")
);
--> statement-breakpoint
CREATE TABLE "sdp_user_invites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"phone_number" varchar NOT NULL,
	"sdp_role" "sdp_role" NOT NULL,
	"accessible_countries" text[] DEFAULT '{}',
	"accessible_business_ids" text[] DEFAULT '{}',
	"invited_by_user_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sdp_user_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "third_party_businesses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"contact_person" varchar NOT NULL,
	"email" varchar NOT NULL,
	"phone" varchar NOT NULL,
	"country_id" varchar NOT NULL,
	"user_id" varchar,
	"employing_business_id" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timesheet_attachments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timesheet_id" varchar NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"uploaded_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timesheet_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timesheet_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"hours_worked" numeric(5, 2),
	"days_worked" numeric(5, 2),
	"project_rate_line_id" varchar,
	"start_time" time(0),
	"end_time" time(0),
	"break_hours" numeric(4, 2),
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timesheet_expenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timesheet_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"category" varchar(50) DEFAULT 'other' NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'AUD' NOT NULL,
	"receipt_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timesheets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"worker_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_hours" numeric(8, 2) DEFAULT '0',
	"status" timesheet_status DEFAULT 'draft',
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"approved_by" varchar,
	"created_by" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trusted_devices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"device_fingerprint" varchar NOT NULL,
	"device_name" varchar,
	"ip_address" varchar,
	"user_agent" text,
	"is_trusted" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factor_audit_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"event_type" varchar NOT NULL,
	"event_details" text,
	"ip_address" varchar,
	"user_agent" text,
	"device_fingerprint" varchar,
	"success" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"last_used_at" timestamp DEFAULT now(),
	"ip_address" varchar,
	"user_agent" varchar,
	CONSTRAINT "user_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_two_factor_auth" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"method" varchar DEFAULT 'totp' NOT NULL,
	"totp_secret" text,
	"backup_codes" text[],
	"is_enabled" boolean DEFAULT false NOT NULL,
	"enabled_at" timestamp,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_two_factor_auth_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"phone_number" varchar,
	"job_title" varchar,
	"company" varchar,
	"address" varchar,
	"city" varchar,
	"state" varchar,
	"postcode" varchar,
	"country" varchar,
	"user_type" "user_type" DEFAULT 'business_user',
	"sdp_role" "sdp_role",
	"accessible_countries" text[] DEFAULT '{}',
	"accessible_business_ids" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true,
	"password_hash" varchar,
	"email_verified" boolean DEFAULT false,
	"email_verification_token" varchar,
	"email_verification_expires_at" timestamp,
	"password_reset_token" varchar,
	"password_reset_expires_at" timestamp,
	"password_reset_requested_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "worker_approvals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"business_invitation_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "worker_approvals_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "worker_business_associations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" varchar NOT NULL,
	"business_id" varchar NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"added_by" varchar,
	"added_via_invitation" boolean DEFAULT false,
	"business_invitation_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar,
	"third_party_business_id" varchar,
	"user_id" varchar,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"phone_number" varchar,
	"date_of_birth" timestamp,
	"street_address" varchar,
	"suburb" varchar,
	"state" varchar,
	"postcode" varchar,
	"country_id" varchar,
	"worker_type" "worker_type" NOT NULL,
	"business_structure" "business_structure",
	"business_name" varchar,
	"business_address" text,
	"business_phone" varchar,
	"business_email" varchar,
	"tax_file_number" varchar,
	"abn" varchar,
	"acn" varchar,
	"ird_number" varchar,
	"ssn" varchar,
	"ein" varchar,
	"ni_number" varchar,
	"utr_number" varchar,
	"sin" varchar,
	"business_number" varchar,
	"gst_registered" boolean DEFAULT false,
	"gst_number" varchar,
	"account_name" varchar,
	"bank_name" varchar,
	"bsb" varchar,
	"account_number" varchar,
	"iban" varchar,
	"swift_code" varchar,
	"emergency_contact_name" varchar,
	"emergency_contact_relationship" varchar,
	"emergency_contact_phone" varchar,
	"emergency_contact_email" varchar,
	"super_fund_name" varchar,
	"super_fund_abn" varchar,
	"super_member_number" varchar,
	"super_fund_address" text,
	"kiwi_saver_provider" varchar,
	"kiwi_saver_number" varchar,
	"plan_401k_provider" varchar,
	"plan_401k_number" varchar,
	"pension_provider" varchar,
	"pension_number" varchar,
	"cpp_number" varchar,
	"qpp_number" varchar,
	"invitation_token" varchar,
	"invitation_token_expires_at" timestamp,
	"invitation_sent" boolean DEFAULT false,
	"personal_details_completed" boolean DEFAULT false,
	"business_details_completed" boolean DEFAULT false,
	"bank_details_completed" boolean DEFAULT false,
	"onboarding_completed" boolean DEFAULT false,
	"created_by_user_id" varchar,
	"created_on_behalf_of_business_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "business_invitations" ADD CONSTRAINT "business_invitations_contractor_id_workers_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_invitations" ADD CONSTRAINT "business_invitations_registered_business_id_businesses_id_fk" FOREIGN KEY ("registered_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_user_invites" ADD CONSTRAINT "business_user_invites_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_user_invites" ADD CONSTRAINT "business_user_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_billing_lines" ADD CONSTRAINT "contract_billing_lines_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_instances" ADD CONSTRAINT "contract_instances_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_instances" ADD CONSTRAINT "contract_instances_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_instances" ADD CONSTRAINT "contract_instances_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_instances" ADD CONSTRAINT "contract_instances_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_instances" ADD CONSTRAINT "contract_instances_assigned_sdp_user_id_users_id_fk" FOREIGN KEY ("assigned_sdp_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_instances" ADD CONSTRAINT "contract_instances_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_rate_lines" ADD CONSTRAINT "contract_rate_lines_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_role_title_id_role_titles_id_fk" FOREIGN KEY ("role_title_id") REFERENCES "public"."role_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_third_party_business_id_third_party_businesses_id_fk" FOREIGN KEY ("third_party_business_id") REFERENCES "public"."third_party_businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_sdp_entity_id_countries_id_fk" FOREIGN KEY ("sdp_entity_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customer_business_id_businesses_id_fk" FOREIGN KEY ("customer_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_on_behalf_of_business_id_businesses_id_fk" FOREIGN KEY ("created_on_behalf_of_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "country_advisor_fees" ADD CONSTRAINT "country_advisor_fees_party_id_country_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."country_parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "country_documents" ADD CONSTRAINT "country_documents_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "country_documents" ADD CONSTRAINT "country_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "country_parties" ADD CONSTRAINT "country_parties_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "country_party_contacts" ADD CONSTRAINT "country_party_contacts_party_id_country_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."country_parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template_versions" ADD CONSTRAINT "email_template_versions_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template_versions" ADD CONSTRAINT "email_template_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_definition_id_email_template_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."email_template_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contractor_id_workers_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_timesheet_id_timesheets_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."timesheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "margin_payments" ADD CONSTRAINT "margin_payments_sdp_invoice_id_sdp_invoices_id_fk" FOREIGN KEY ("sdp_invoice_id") REFERENCES "public"."sdp_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "margin_payments" ADD CONSTRAINT "margin_payments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "margin_payments" ADD CONSTRAINT "margin_payments_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "margin_payments" ADD CONSTRAINT "margin_payments_paid_by_user_id_users_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_rate_link_id_contract_rate_lines_id_fk" FOREIGN KEY ("rate_link_id") REFERENCES "public"."contract_rate_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remuneration_lines" ADD CONSTRAINT "remuneration_lines_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_titles" ADD CONSTRAINT "role_titles_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdp_invoice_line_items" ADD CONSTRAINT "sdp_invoice_line_items_invoice_id_sdp_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sdp_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdp_invoice_timesheets" ADD CONSTRAINT "sdp_invoice_timesheets_invoice_id_sdp_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sdp_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdp_invoice_timesheets" ADD CONSTRAINT "sdp_invoice_timesheets_timesheet_id_timesheets_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."timesheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdp_invoices" ADD CONSTRAINT "sdp_invoices_from_country_id_countries_id_fk" FOREIGN KEY ("from_country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdp_invoices" ADD CONSTRAINT "sdp_invoices_to_business_id_businesses_id_fk" FOREIGN KEY ("to_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdp_invoices" ADD CONSTRAINT "sdp_invoices_from_business_id_businesses_id_fk" FOREIGN KEY ("from_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdp_invoices" ADD CONSTRAINT "sdp_invoices_timesheet_id_timesheets_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."timesheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdp_invoices" ADD CONSTRAINT "sdp_invoices_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdp_invoices" ADD CONSTRAINT "sdp_invoices_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdp_invoices" ADD CONSTRAINT "sdp_invoices_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdp_invoices" ADD CONSTRAINT "sdp_invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdp_invoices" ADD CONSTRAINT "sdp_invoices_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdp_user_invites" ADD CONSTRAINT "sdp_user_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_party_businesses" ADD CONSTRAINT "third_party_businesses_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_party_businesses" ADD CONSTRAINT "third_party_businesses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_party_businesses" ADD CONSTRAINT "third_party_businesses_employing_business_id_businesses_id_fk" FOREIGN KEY ("employing_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_attachments" ADD CONSTRAINT "timesheet_attachments_timesheet_id_timesheets_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."timesheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_attachments" ADD CONSTRAINT "timesheet_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_timesheet_id_timesheets_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."timesheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_project_rate_line_id_contract_rate_lines_id_fk" FOREIGN KEY ("project_rate_line_id") REFERENCES "public"."contract_rate_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_expenses" ADD CONSTRAINT "timesheet_expenses_timesheet_id_timesheets_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."timesheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor_audit_log" ADD CONSTRAINT "two_factor_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_two_factor_auth" ADD CONSTRAINT "user_two_factor_auth_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_approvals" ADD CONSTRAINT "worker_approvals_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_approvals" ADD CONSTRAINT "worker_approvals_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_approvals" ADD CONSTRAINT "worker_approvals_business_invitation_id_business_invitations_id_fk" FOREIGN KEY ("business_invitation_id") REFERENCES "public"."business_invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_business_associations" ADD CONSTRAINT "worker_business_associations_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_business_associations" ADD CONSTRAINT "worker_business_associations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_business_associations" ADD CONSTRAINT "worker_business_associations_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_business_associations" ADD CONSTRAINT "worker_business_associations_business_invitation_id_business_invitations_id_fk" FOREIGN KEY ("business_invitation_id") REFERENCES "public"."business_invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workers" ADD CONSTRAINT "workers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workers" ADD CONSTRAINT "workers_third_party_business_id_third_party_businesses_id_fk" FOREIGN KEY ("third_party_business_id") REFERENCES "public"."third_party_businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workers" ADD CONSTRAINT "workers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workers" ADD CONSTRAINT "workers_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workers" ADD CONSTRAINT "workers_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workers" ADD CONSTRAINT "workers_created_on_behalf_of_business_id_businesses_id_fk" FOREIGN KEY ("created_on_behalf_of_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_businesses_owner" ON "businesses" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_businesses_parent" ON "businesses" USING btree ("parent_business_id");--> statement-breakpoint
CREATE INDEX "idx_contract_billing_lines_contract" ON "contract_billing_lines" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_contract_instances_business" ON "contract_instances" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_contract_instances_worker" ON "contract_instances" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "idx_contract_instances_country" ON "contract_instances" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "idx_contract_instances_created_at" ON "contract_instances" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_contracts_business" ON "contracts" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_contracts_worker" ON "contracts" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "idx_contracts_country" ON "contracts" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "idx_contracts_status" ON "contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_contracts_created_at" ON "contracts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_email_templates_lookup" ON "email_templates" USING btree ("definition_id","locale","scope_type","scope_id","status");--> statement-breakpoint
CREATE INDEX "idx_invoices_business" ON "invoices" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_contractor" ON "invoices" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_status" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_invoices_created_at" ON "invoices" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_margin_payments_invoice" ON "margin_payments" USING btree ("sdp_invoice_id");--> statement-breakpoint
CREATE INDEX "idx_margin_payments_business" ON "margin_payments" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_margin_payments_contract" ON "margin_payments" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_margin_payments_status" ON "margin_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_margin_payments_paid_date" ON "margin_payments" USING btree ("paid_date");--> statement-breakpoint
CREATE INDEX "idx_sdp_invoice_line_items_invoice" ON "sdp_invoice_line_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sdp_invoice_timesheets_unique" ON "sdp_invoice_timesheets" USING btree ("invoice_id","timesheet_id");--> statement-breakpoint
CREATE INDEX "idx_sdp_invoice_timesheets_invoice" ON "sdp_invoice_timesheets" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_sdp_invoice_timesheets_timesheet" ON "sdp_invoice_timesheets" USING btree ("timesheet_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_timesheet_attachments_timesheet" ON "timesheet_attachments" USING btree ("timesheet_id");--> statement-breakpoint
CREATE INDEX "idx_timesheet_entries_timesheet_date" ON "timesheet_entries" USING btree ("timesheet_id","date");--> statement-breakpoint
CREATE INDEX "idx_timesheet_expenses_timesheet" ON "timesheet_expenses" USING btree ("timesheet_id");--> statement-breakpoint
CREATE INDEX "idx_timesheets_worker" ON "timesheets" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "idx_timesheets_business" ON "timesheets" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_timesheets_status" ON "timesheets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_timesheets_created_at" ON "timesheets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_2fa_audit_user" ON "two_factor_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_2fa_audit_created" ON "two_factor_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_workers_business" ON "workers" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_workers_user" ON "workers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_workers_email" ON "workers" USING btree ("email");