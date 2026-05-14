/**
 * Contract change-log diff + persistence.
 *
 * Compares the contract row before and after an edit and writes one
 * `contract_change_log` row per changed field in a whitelist of business-
 * meaningful columns. Anything outside the whitelist (timestamps, signing
 * audit fields, the generated document) is ignored to keep the log readable.
 */

import { db } from "../../db";
import { contractChangeLog } from "@shared/schema";

// Whitelist of fields to track + human-friendly labels for the UI.
// Keep this list curated — fields outside it (e.g. updatedAt, contractDocument,
// signing audit columns) are intentionally not logged.
export const TRACKED_CONTRACT_FIELDS: Array<{ key: string; label: string }> = [
  // Identity / role
  { key: "contractName",            label: "Contract Name" },
  { key: "customRoleTitle",         label: "Role Title" },
  { key: "roleTitleId",             label: "Role Title (ref)" },
  { key: "employmentType",          label: "Employment Type" },

  // Worker pay
  { key: "rateType",                label: "Worker Rate Type" },
  { key: "rate",                    label: "Worker Rate" },
  { key: "currency",                label: "Worker Currency" },
  { key: "totalPackageValue",       label: "Total Package Value" },
  { key: "rateStructure",           label: "Rate Structure" },

  // Client billing
  { key: "customerBillingRate",     label: "Client Billing Rate" },
  { key: "customerBillingRateType", label: "Client Billing Rate Type" },
  { key: "customerCurrency",        label: "Client Currency" },
  { key: "clientBillingType",       label: "Client Billing Type" },
  { key: "fixedBillingAmount",      label: "Fixed Billing Amount" },
  { key: "fixedBillingFrequency",   label: "Fixed Billing Frequency" },
  { key: "billingMode",             label: "Billing Mode" },
  { key: "invoicingFrequency",      label: "Invoicing Frequency" },
  { key: "paymentTerms",            label: "Payment Terms" },

  // Term
  { key: "startDate",               label: "Start Date" },
  { key: "endDate",                 label: "End Date" },
  { key: "noticePeriodDays",        label: "Notice Period (days)" },

  // Timesheets
  { key: "requiresTimesheet",       label: "Requires Timesheet" },
  { key: "timesheetFrequency",      label: "Timesheet Frequency" },
  { key: "firstTimesheetStartDate", label: "First Timesheet Start" },
  { key: "timesheetApproverRole",   label: "Timesheet Approver" },
  { key: "timesheetCalculationMethod", label: "Timesheet Calculation Method" },
  { key: "paymentScheduleType",     label: "Payment Schedule Type" },
  { key: "paymentDay",              label: "Payment Day" },
  { key: "paymentDaysAfterPeriod",  label: "Payment Days After Period" },

  // Host client
  { key: "isForClient",             label: "Is For Host Client" },
  { key: "clientName",              label: "Host Client Name" },
  { key: "customerBusinessId",      label: "Host Client (Business)" },
];

const TRACKED_KEYS = new Set(TRACKED_CONTRACT_FIELDS.map((f) => f.key));

function normalize(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export interface ContractChangeRow {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}

/** Pure diff — returns the list of changes without touching the DB. */
export function diffContractFields(
  before: Record<string, any>,
  after: Record<string, any>,
): ContractChangeRow[] {
  const changes: ContractChangeRow[] = [];
  for (const key of TRACKED_KEYS) {
    // If the caller didn't provide a new value for this field, skip (the
    // field wasn't part of the edit).
    if (!(key in after)) continue;
    const oldVal = normalize(before[key]);
    const newVal = normalize(after[key]);
    if (oldVal !== newVal) {
      changes.push({ fieldName: key, oldValue: oldVal, newValue: newVal });
    }
  }
  return changes;
}

/**
 * Diff `before` vs `after`, and if anything changed, write one log row per
 * changed field. Returns the rows that were inserted (empty if no changes).
 */
export async function logContractChanges(params: {
  contractId: string;
  before: Record<string, any>;
  after: Record<string, any>;
  changedBy: string | null;
}): Promise<ContractChangeRow[]> {
  const { contractId, before, after, changedBy } = params;
  const changes = diffContractFields(before, after);
  if (changes.length === 0) return [];

  await db.insert(contractChangeLog).values(
    changes.map((c) => ({
      contractId,
      fieldName: c.fieldName,
      oldValue: c.oldValue,
      newValue: c.newValue,
      changedBy: changedBy ?? null,
    })),
  );
  return changes;
}
