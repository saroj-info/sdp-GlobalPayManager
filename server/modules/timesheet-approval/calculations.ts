/**
 * Pure calculation helpers. No DB calls, no Express, no side effects.
 *
 * Each function takes plain data in, returns plain data out. That makes the math
 * easy to unit-test without mocking the storage layer and makes invoice routing
 * trivial to reason about — the orchestrator just composes them.
 */

import { getTrackingUnit } from "@shared/contractHelpers";
import type { InvoiceLineItem } from "./types";

const HOURS_PER_DAY = 8;

const num = (v: any): number => {
  const n = parseFloat(v ?? "0");
  return Number.isFinite(n) ? n : 0;
};

interface RateLine {
  id: string;
  rate: string;
  clientRate?: string | null;
  description?: string | null;
  isDefault?: boolean | null;
}

interface TimesheetEntry {
  hoursWorked?: string | null;
  daysWorked?: string | null;
  isPresent?: boolean | null;
  projectRateLineId?: string | null;
}

interface BillingLine {
  description: string;
  lineType: string;
  rate?: string | null;
  amount?: string | null;
  paidBy?: string | null;
}

// ─── Worker cost ────────────────────────────────────────────────────────────

/**
 * What the worker is owed for this timesheet. Salary (annual) contracts always
 * return 0 — they're paid via payroll, not per-period invoicing.
 */
export function computeWorkerCost(
  contract: any,
  entries: TimesheetEntry[],
  rateLines: RateLine[],
): { workerCost: number; lineItems: InvoiceLineItem[] } {
  const rateType = contract.rateType || "hourly";
  const rateStructure = contract.rateStructure || "single";
  const workerRate = num(contract.rate);
  const lineItems: InvoiceLineItem[] = [];
  let workerCost = 0;

  if (rateType === "annual") return { workerCost: 0, lineItems: [] };

  if (rateStructure === "multiple" && rateLines.length > 0) {
    const rateLineMap = new Map(rateLines.map(rl => [rl.id, num(rl.rate)]));
    const groups = new Map<string, { hours: number; days: number; rate: number; label: string }>();

    for (const entry of entries) {
      const id = entry.projectRateLineId || "default";
      const rate = entry.projectRateLineId
        ? rateLineMap.get(entry.projectRateLineId) ?? workerRate
        : workerRate;
      const rl = rateLines.find(r => r.id === entry.projectRateLineId);
      const label = rl?.description || "Standard Rate";
      if (!groups.has(id)) groups.set(id, { hours: 0, days: 0, rate, label });
      const g = groups.get(id)!;
      if (rateType === "daily") {
        const days = num(entry.daysWorked);
        g.days += days;
        workerCost += days * rate;
      } else {
        const hours = num(entry.hoursWorked);
        g.hours += hours;
        workerCost += hours * rate;
      }
    }

    let sortIdx = 0;
    for (const [, g] of groups) {
      if (rateType === "daily" && g.days > 0) {
        const amt = g.days * g.rate;
        lineItems.push({
          description: `${g.label} — ${g.days}d @ ${contract.currency} ${g.rate}/day`,
          quantity: g.days.toString(),
          unitPrice: g.rate.toFixed(2),
          amount: amt.toFixed(2),
          sortOrder: sortIdx++,
        });
      } else if (g.hours > 0) {
        const amt = g.hours * g.rate;
        lineItems.push({
          description: `${g.label} — ${g.hours}h @ ${contract.currency} ${g.rate}/hr`,
          quantity: g.hours.toString(),
          unitPrice: g.rate.toFixed(2),
          amount: amt.toFixed(2),
          sortOrder: sortIdx++,
        });
      }
    }
    return { workerCost, lineItems };
  }

  if (rateType === "daily") {
    const totalDays = entries.reduce((s, e) => s + num(e.daysWorked), 0);
    workerCost = totalDays * workerRate;
    lineItems.push({
      description: `${totalDays}d @ ${contract.currency} ${workerRate}/day`,
      quantity: totalDays.toString(),
      unitPrice: workerRate.toFixed(2),
      amount: workerCost.toFixed(2),
      sortOrder: 0,
    });
    return { workerCost, lineItems };
  }

  // Default: hourly
  const totalHours = entries.reduce((s, e) => s + num(e.hoursWorked), 0);
  workerCost = totalHours * workerRate;
  lineItems.push({
    description: `${totalHours}h @ ${contract.currency} ${workerRate}/hr`,
    quantity: totalHours.toString(),
    unitPrice: workerRate.toFixed(2),
    amount: workerCost.toFixed(2),
    sortOrder: 0,
  });
  return { workerCost, lineItems };
}

// ─── Customer billing ───────────────────────────────────────────────────────

/**
 * What gets billed to the host client. Honours fixed-price contracts, multi-rate
 * setups, and the contract's tracking unit so an hourly-billed host client always
 * sees hours regardless of the worker's rate type.
 */
export function computeCustomerBilling(
  contract: any,
  entries: TimesheetEntry[],
  rateLines: RateLine[],
  period: { start: any; end: any },
): { amount: number; lineItems: InvoiceLineItem[] } {
  const clientBillingType = contract.clientBillingType || "rate_based";

  if (clientBillingType === "fixed_price") {
    const amount = num(contract.fixedBillingAmount);
    return {
      amount,
      lineItems: [
        {
          description: `Fixed period billing — ${period.start} to ${period.end}`,
          quantity: "1",
          unitPrice: amount.toFixed(2),
          amount: amount.toFixed(2),
          sortOrder: 0,
        },
      ],
    };
  }

  const topLevelCustomerRate = num(contract.customerBillingRate);
  const fallbackLineRate = (() => {
    const def = rateLines.find(r => r.isDefault && r.clientRate);
    if (def?.clientRate) return num(def.clientRate);
    const first = rateLines.find(r => r.clientRate);
    return first?.clientRate ? num(first.clientRate) : 0;
  })();
  const customerRate = topLevelCustomerRate || fallbackLineRate;
  const trackingUnit = getTrackingUnit(contract);
  const rateStructure = contract.rateStructure || "single";
  const lineItems: InvoiceLineItem[] = [];
  let amount = 0;

  if (rateStructure === "multiple" && rateLines.length > 0) {
    const groups = new Map<string, { hours: number; days: number; rate: number; label: string }>();
    for (const entry of entries) {
      const rl = rateLines.find(r => r.id === entry.projectRateLineId);
      const rate = rl?.clientRate ? num(rl.clientRate) : customerRate;
      const label = rl?.description || "Standard Rate";
      const key = entry.projectRateLineId || "default";
      if (!groups.has(key)) groups.set(key, { hours: 0, days: 0, rate, label });
      const g = groups.get(key)!;
      const entryHours = num(entry.hoursWorked);
      const entryDays = num(entry.daysWorked);
      if (trackingUnit === "daily") {
        // Prefer days; fall back to hours/8 for legacy timesheets logged in the wrong unit.
        const days = entryDays > 0 ? entryDays : entryHours > 0 ? entryHours / HOURS_PER_DAY : 0;
        g.days += days;
        amount += days * rate;
      } else {
        const hours = entryHours > 0 ? entryHours : entryDays > 0 ? entryDays * HOURS_PER_DAY : 0;
        g.hours += hours;
        amount += hours * rate;
      }
    }
    let idx = 0;
    for (const [, g] of groups) {
      if (trackingUnit === "daily" && g.days > 0) {
        lineItems.push({
          description: `${g.label} — ${g.days}d`,
          quantity: g.days.toString(),
          unitPrice: g.rate.toFixed(2),
          amount: (g.days * g.rate).toFixed(2),
          sortOrder: idx++,
        });
      } else if (g.hours > 0) {
        lineItems.push({
          description: `${g.label} — ${g.hours}h`,
          quantity: g.hours.toString(),
          unitPrice: g.rate.toFixed(2),
          amount: (g.hours * g.rate).toFixed(2),
          sortOrder: idx++,
        });
      }
    }
    return { amount, lineItems };
  }

  // Single rate
  const sumHours = entries.reduce((s, e) => s + num(e.hoursWorked), 0);
  const sumDays = entries.reduce((s, e) => s + num(e.daysWorked), 0);
  // Backwards-compat: legacy annual timesheets used presence-only entries.
  const presentDays = sumHours === 0 && sumDays === 0
    ? entries.reduce((s, e) => s + (e.isPresent ? 1 : 0), 0)
    : 0;

  if (trackingUnit === "daily") {
    const totalDays = sumDays > 0 ? sumDays : sumHours > 0 ? sumHours / HOURS_PER_DAY : presentDays;
    amount = totalDays * customerRate;
    lineItems.push({
      description: `${totalDays}d @ ${contract.customerCurrency || contract.currency} ${customerRate}/day`,
      quantity: totalDays.toString(),
      unitPrice: customerRate.toFixed(2),
      amount: amount.toFixed(2),
      sortOrder: 0,
    });
  } else {
    const totalHours = sumHours > 0 ? sumHours : sumDays > 0 ? sumDays * HOURS_PER_DAY : presentDays * HOURS_PER_DAY;
    amount = totalHours * customerRate;
    lineItems.push({
      description: `${totalHours}h @ ${contract.customerCurrency || contract.currency} ${customerRate}/hr`,
      quantity: totalHours.toString(),
      unitPrice: customerRate.toFixed(2),
      amount: amount.toFixed(2),
      sortOrder: 0,
    });
  }

  return { amount, lineItems };
}

// ─── Billing lines (SDP service fees / margin etc.) ─────────────────────────

/** A single billing line's monetary amount. Percentage types multiply against workerCost. */
export function computeBillingLineAmount(bl: BillingLine, workerCost: number): number {
  if (bl.lineType === "percentage_of_pay" || bl.lineType === "fixed_percentage") {
    return workerCost * (num(bl.rate) / 100);
  }
  return num(bl.amount || bl.rate);
}

/** Split billing lines by who pays. Null `paidBy` defaults to 'business' for backward compat. */
export function partitionBillingLines(activeBillingLines: BillingLine[]): {
  business: BillingLine[];
  hostClient: BillingLine[];
} {
  return {
    business: activeBillingLines.filter(bl => (bl.paidBy ?? "business") !== "host_client"),
    hostClient: activeBillingLines.filter(bl => bl.paidBy === "host_client"),
  };
}

/**
 * Roll up the SDP→Business invoice content. Worker cost is bundled here ONLY when
 * billingMode === 'auto_invoice' AND the contract is non-salary. In every other
 * mode the SDP→Business invoice contains only the business-payable billing lines.
 */
export function computeSdpServicesContent(args: {
  billingMode: string;
  rateType: string;
  workerCost: number;
  workerCostLineItems: InvoiceLineItem[];
  businessBillingLines: BillingLine[];
}): { total: number; lineItems: InvoiceLineItem[] } {
  const { billingMode, rateType, workerCost, workerCostLineItems, businessBillingLines } = args;
  const includeWorkerCost = billingMode === "auto_invoice" && rateType !== "annual";
  const lineItems: InvoiceLineItem[] = [];
  let total = 0;

  if (includeWorkerCost) {
    workerCostLineItems.forEach((li, i) => lineItems.push({ ...li, sortOrder: i }));
    total += workerCost;
  }

  let idx = lineItems.length;
  for (const bl of businessBillingLines) {
    const amt = computeBillingLineAmount(bl, workerCost);
    total += amt;
    lineItems.push({
      description: bl.description,
      quantity: "1",
      unitPrice: amt.toFixed(2),
      amount: amt.toFixed(2),
      sortOrder: idx++,
    });
  }

  return { total, lineItems };
}

/**
 * Append host-client-payable billing lines to the existing client invoice content.
 * Mutates nothing — returns a new array + updated total.
 */
export function appendHostClientBillingLines(args: {
  workerCost: number;
  customerBillingAmount: number;
  clientLineItems: InvoiceLineItem[];
  hostClientBillingLines: BillingLine[];
}): { amount: number; lineItems: InvoiceLineItem[] } {
  const { workerCost, customerBillingAmount, clientLineItems, hostClientBillingLines } = args;
  if (hostClientBillingLines.length === 0) {
    return { amount: customerBillingAmount, lineItems: clientLineItems };
  }
  const out = [...clientLineItems];
  let total = customerBillingAmount;
  let idx = out.length;
  for (const bl of hostClientBillingLines) {
    const amt = computeBillingLineAmount(bl, workerCost);
    total += amt;
    out.push({
      description: bl.description,
      quantity: "1",
      unitPrice: amt.toFixed(2),
      amount: amt.toFixed(2),
      sortOrder: idx++,
    });
  }
  return { amount: total, lineItems: out };
}
