/**
 * Worker change-log diff + persistence.
 *
 * Mirrors server/modules/contracts/changeLog.ts. Compares the worker row
 * before and after an edit and writes one `worker_change_log` row per
 * changed field in the whitelist below. Anything outside the whitelist
 * (system columns, tokens, onboarding flags, audit fields) is ignored.
 */

import { db } from "../../db";
import { workerChangeLog } from "@shared/schema";

// Whitelist of fields to track + human-friendly labels for the UI + a
// `sensitive` flag: sensitive values get their old/new masked to last 4
// when rendered (e.g. bank account, tax IDs) so the audit trail and the
// notification email don't leak the full value.
export interface TrackedWorkerField {
  key: string;
  label: string;
  sensitive?: boolean;
}

export const TRACKED_WORKER_FIELDS: TrackedWorkerField[] = [
  // Identity
  { key: "firstName",                   label: "First Name" },
  { key: "lastName",                    label: "Last Name" },
  { key: "email",                       label: "Email" },
  { key: "phoneNumber",                 label: "Phone Number" },
  { key: "dateOfBirth",                 label: "Date of Birth" },

  // Employment
  { key: "workerType",                  label: "Engagement Type" },

  // Address
  { key: "streetAddress",               label: "Street Address" },
  { key: "suburb",                      label: "Suburb / City" },
  { key: "state",                       label: "State / Region" },
  { key: "postcode",                    label: "Postcode" },
  { key: "countryId",                   label: "Country" },

  // Contractor business
  { key: "businessStructure",           label: "Business Structure" },
  { key: "businessName",                label: "Business Name" },
  { key: "businessAddress",             label: "Business Address" },
  { key: "businessPhone",               label: "Business Phone" },
  { key: "businessEmail",               label: "Business Email" },

  // Tax IDs (all sensitive)
  { key: "taxFileNumber",               label: "Tax File Number (AU)",         sensitive: true },
  { key: "abn",                         label: "ABN",                          sensitive: true },
  { key: "acn",                         label: "ACN",                          sensitive: true },
  { key: "irdNumber",                   label: "IRD Number (NZ)",              sensitive: true },
  { key: "ssn",                         label: "SSN (US)",                     sensitive: true },
  { key: "ein",                         label: "EIN (US)",                     sensitive: true },
  { key: "niNumber",                    label: "NI Number (UK)",               sensitive: true },
  { key: "utrNumber",                   label: "UTR (UK)",                     sensitive: true },
  { key: "sin",                         label: "SIN (CA)",                     sensitive: true },
  { key: "businessNumber",              label: "Business Number (CA)",         sensitive: true },
  { key: "gstRegistered",               label: "GST Registered" },
  { key: "gstNumber",                   label: "GST Number",                   sensitive: true },

  // Bank (all sensitive)
  { key: "accountName",                 label: "Bank Account Name" },
  { key: "bankName",                    label: "Bank Name" },
  { key: "bsb",                         label: "BSB",                          sensitive: true },
  { key: "accountNumber",               label: "Account Number",               sensitive: true },
  { key: "iban",                        label: "IBAN",                         sensitive: true },
  { key: "swiftCode",                   label: "SWIFT Code",                   sensitive: true },

  // Emergency contact
  { key: "emergencyContactName",        label: "Emergency Contact Name" },
  { key: "emergencyContactRelationship",label: "Emergency Contact Relationship" },
  { key: "emergencyContactPhone",       label: "Emergency Contact Phone" },
  { key: "emergencyContactEmail",       label: "Emergency Contact Email" },

  // Pension / retirement
  { key: "superFundName",               label: "Super Fund Name" },
  { key: "superFundAbn",                label: "Super Fund ABN",               sensitive: true },
  { key: "superMemberNumber",           label: "Super Member Number",          sensitive: true },
  { key: "superFundAddress",            label: "Super Fund Address" },
  { key: "kiwiSaverProvider",           label: "KiwiSaver Provider" },
  { key: "kiwiSaverNumber",             label: "KiwiSaver Number",             sensitive: true },
  { key: "plan401kProvider",            label: "401(k) Provider" },
  { key: "plan401kNumber",              label: "401(k) Account Number",        sensitive: true },
  { key: "pensionProvider",             label: "Pension Provider" },
  { key: "pensionNumber",               label: "Pension Number",               sensitive: true },
  { key: "cppNumber",                   label: "CPP Number",                   sensitive: true },
  { key: "qppNumber",                   label: "QPP Number",                   sensitive: true },
];

const TRACKED_KEYS = new Set(TRACKED_WORKER_FIELDS.map((f) => f.key));
const TRACKED_BY_KEY = new Map(TRACKED_WORKER_FIELDS.map((f) => [f.key, f]));

function normalize(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export interface WorkerChangeRow {
  fieldName: string;
  label: string;
  oldValue: string | null;
  newValue: string | null;
  sensitive: boolean;
}

/** Pure diff — returns the list of changes without touching the DB. */
export function diffWorkerFields(
  before: Record<string, any>,
  after: Record<string, any>,
): WorkerChangeRow[] {
  const changes: WorkerChangeRow[] = [];
  for (const key of TRACKED_KEYS) {
    if (!(key in after)) continue;
    const oldVal = normalize(before[key]);
    const newVal = normalize(after[key]);
    if (oldVal !== newVal) {
      const meta = TRACKED_BY_KEY.get(key)!;
      changes.push({
        fieldName: key,
        label: meta.label,
        oldValue: oldVal,
        newValue: newVal,
        sensitive: !!meta.sensitive,
      });
    }
  }
  return changes;
}

/** Mask all but the last 4 characters of a sensitive value. */
export function maskSensitive(value: string | null): string {
  if (!value) return "—";
  if (value.length <= 4) return "•".repeat(value.length);
  return "•".repeat(Math.max(4, value.length - 4)) + value.slice(-4);
}

/**
 * Diff `before` vs `after`, and if anything changed, write one log row per
 * changed field. Returns the changes that were inserted (empty if none).
 */
export async function logWorkerChanges(params: {
  workerId: string;
  before: Record<string, any>;
  after: Record<string, any>;
  changedBy: string | null;
}): Promise<WorkerChangeRow[]> {
  const { workerId, before, after, changedBy } = params;
  const changes = diffWorkerFields(before, after);
  if (changes.length === 0) return [];

  await db.insert(workerChangeLog).values(
    changes.map((c) => ({
      workerId,
      fieldName: c.fieldName,
      oldValue: c.oldValue,
      newValue: c.newValue,
      changedBy: changedBy ?? null,
    })),
  );
  return changes;
}
