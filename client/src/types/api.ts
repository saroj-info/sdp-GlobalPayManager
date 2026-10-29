// Shared API response types for the client.
// Re-exports Drizzle row types from shared/schema, plus enriched variants
// that match what the server actually returns from each endpoint.

import type {
  User,
  Business,
  Country,
  Worker,
  Contract,
  ContractInstance,
  ContractTemplate,
  RoleTitle,
  RemunerationLine,
  SelectContractRateLine as ContractRateLine,
  SelectContractBillingLine as ContractBillingLine,
  Timesheet,
  TimesheetEntry,
  TimesheetExpense,
  TimesheetAttachment,
  Invoice,
  Payslip,
  LeaveRequest,
  BusinessInvitation,
  SelectSdpInvoiceType as SdpInvoice,
  SelectSdpInvoiceLineItemType as SdpInvoiceLineItem,
} from '@shared/schema';

export type {
  User,
  Business,
  Country,
  Worker,
  Contract,
  ContractInstance,
  ContractTemplate,
  ContractRateLine,
  ContractBillingLine,
  RoleTitle,
  RemunerationLine,
  Timesheet,
  TimesheetEntry,
  TimesheetExpense,
  TimesheetAttachment,
  Invoice,
  Payslip,
  LeaveRequest,
  BusinessInvitation,
  SdpInvoice,
  SdpInvoiceLineItem,
};

// ---- Enriched variants the API returns ---------------------------------

export type { HostClientConfirmationStatus } from '@shared/contractLifecycle';

/** A linked contract (renewal source or renewal) as attached by /api/contracts/list. */
export interface ContractLinkSummary {
  id: string;
  contractName: string | null;
  customRoleTitle: string | null;
  startDate: string | Date;
  endDate: string | Date | null;
  status: string | null;
}

export interface ContractWithDerived extends Omit<Contract, 'signedAt'> {
  derivedSignatureStatus?: string;
  termExpired?: boolean;
  worker?: Worker | null;
  business?: Business | null;
  country?: Country | null;
  customerBusiness?: Business | null;
  roleTitle?: RoleTitle | null;
  template?: ContractTemplate | null;
  rateLines?: ContractRateLine[];
  billingLines?: ContractBillingLine[];
  viewerRole?: 'owner' | 'host_client';
  readOnly?: boolean;
  signedAt?: string | Date | null;
  remunerationLines?: RemunerationLine[];
  // Contract lifecycle (shared/contractLifecycle.ts): renewal links attached by the list.
  renewedFrom?: ContractLinkSummary | null;
  renewals?: ContractLinkSummary[];
}

export interface TimesheetWithContract extends Timesheet {
  contract?: ContractWithDerived | null;
  worker?: Worker | null;
  entries?: TimesheetEntry[];
  expenses?: TimesheetExpense[];
  attachments?: TimesheetAttachment[];
  totalDays?: number | string | null;
}

export interface SdpInvoiceWithContext extends Omit<SdpInvoice, 'paidAt'> {
  contract?: ContractWithDerived | null;
  timesheet?: TimesheetWithContract | null;
  worker?: Worker | null;
  business?: Business | null;
  customerBusiness?: Business | null;
  lineItems?: SdpInvoiceLineItem[];
  paidAt?: string | Date | null;
}

export interface InvoiceWithContext extends Invoice {
  contract?: ContractWithDerived | null;
  timesheet?: TimesheetWithContract | null;
  worker?: Worker | null;
  business?: Business | null;
}

// ---- Auth / dashboard / misc -------------------------------------------

export interface AuthUser extends Omit<User, 'country'> {
  business?: Business | null;
  // Workers only: the employer (slim), so the sidebar can show its logo.
  employerBusiness?: { id: string; name: string; logoUrl: string | null } | null;
  country?: string | Country | null;
  // Dual-role: `userType` is the EFFECTIVE (active) role the server resolved.
  // These extra fields expose the switcher state.
  primaryRole?: string;        // immutable account type
  activeRole?: string;         // currently-active role (= userType)
  availableRoles?: string[];   // roles this user may switch between
  featureFlags?: {
    aiContractDraftEnabled?: boolean;
    aiSearchEnabled?: boolean;
    aiCountryIntelEnabled?: boolean;
    aiRoleSuggestEnabled?: boolean;
  };
}

// Quotes (SDP cost quotes) — see client/CLAUDE.md → Quotes
export type { Quote, QuoteFeeDefault, FxRateSnapshot } from "@shared/schema";
export type { QuoteListResult, QuoteDefaultsResponse, FxRatesResponse } from "@shared/quotes";
