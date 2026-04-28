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
  SelectJurisdictionType as Jurisdiction,
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
  Jurisdiction,
};

// ---- Enriched variants the API returns ---------------------------------

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
  country?: string | Country | null;
}

export interface DashboardStats {
  userType?: string;
  totalActiveWorkers?: number;
  totalActiveContracts?: number;
  pendingTimesheets?: number;
  totalContracts?: number;
  activeContracts?: number;
  pendingContracts?: number;
  draftContracts?: number;
  successRate?: number;
  totalEarnings?: number;
  monthlyTrends?: Array<{ month: string; value: number; [k: string]: any }>;
  [key: string]: any;
}
