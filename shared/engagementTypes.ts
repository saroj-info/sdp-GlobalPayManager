/**
 * Engagement types ("Permanent", "Casual Employee", "Gig Worker", …) per country
 * and worker type. One list shared by the Create Contract wizard
 * (client/src/components/modals/contract-wizard-modal.tsx) and the Quotes editor
 * (client/src/components/quotes/engagement-card.tsx), so a quote carries the same
 * `employmentType` value a contract will later store.
 *
 * Country ids are the `countries.id` values ('au', 'nz', 'us', 'uk', …). The
 * labels and descriptions are the wizard's exact strings: the AI contract
 * primers quote them, so change them in one place only and with care.
 */

export type EngagementWorkerType = "employee" | "contractor" | "third_party_worker";

export interface EngagementTypeOption {
  value: string;
  label: string;
  description: string;
}

/** `employmentType` values that belong to the employment category. */
export const EMPLOYEE_ENGAGEMENT_TYPE_VALUES = [
  "permanent", "fixed_term", "casual", "zero_hours", "at_will", "on_call", "seasonal", "part_time",
] as const;

/** `employmentType` values that belong to the two contractor categories. */
export const CONTRACTOR_ENGAGEMENT_TYPE_VALUES = ["contractor", "gig_worker"] as const;

/** Every value a quote may store (third-party workers are never quoted). */
export const QUOTE_EMPLOYMENT_TYPE_VALUES = [
  ...EMPLOYEE_ENGAGEMENT_TYPE_VALUES,
  ...CONTRACTOR_ENGAGEMENT_TYPE_VALUES,
] as const;

const LABELS: Record<string, string> = {
  third_party_worker: "3rd Party Business Worker",
  contractor: "Contractor",
  gig_worker: "Gig Worker",
  permanent: "Permanent",
  fixed_term: "Fixed Term",
  casual: "Casual Employee",
  zero_hours: "Zero-Hours Contract",
  at_will: "At-Will Employment",
  on_call: "On-Call Employee",
  seasonal: "Seasonal Worker",
  part_time: "Part-Time Employee",
};

export function getEngagementTypeLabel(value: string | null | undefined): string {
  if (!value) return "";
  return LABELS[value] ?? value;
}

/**
 * Country-specific engagement types for a worker type. With no worker type
 * (nothing picked yet) every type is offered so the list is never empty.
 */
export function getEngagementTypes(
  countryId: string | null | undefined,
  workerType: EngagementWorkerType | string | null | undefined,
): EngagementTypeOption[] {
  const country = (countryId || "").toLowerCase();

  // Third-party worker — only one option
  if (workerType === "third_party_worker") {
    return [{ value: "third_party_worker", label: "3rd Party Business Worker", description: "Worker from another business" }];
  }

  // Contractor — only contractor-category types
  if (workerType === "contractor") {
    const contractorTypes: EngagementTypeOption[] = [
      { value: "contractor", label: "Contractor", description: "Independent services" },
    ];
    if (country === "us") {
      contractorTypes.push({ value: "gig_worker", label: "Gig Worker", description: "Independent contractor for specific tasks" });
    }
    return contractorTypes;
  }

  // Employee — only employment-category types
  if (workerType === "employee") {
    const employeeTypes: EngagementTypeOption[] = [
      { value: "permanent", label: "Permanent", description: "Ongoing employment" },
      { value: "fixed_term", label: "Fixed Term", description: "Time-limited contract" },
    ];
    switch (country) {
      case "au":
        employeeTypes.push({ value: "casual", label: "Casual Employee", description: "Flexible hours with casual loading" });
        break;
      case "nz":
        employeeTypes.push({ value: "casual", label: "Casual Employee", description: "Flexible employment" });
        break;
      case "uk":
      case "gb":
        employeeTypes.push({ value: "zero_hours", label: "Zero-Hours Contract", description: "No guaranteed hours" });
        break;
      case "ph":
        employeeTypes.push({ value: "casual", label: "Casual Employee", description: "Flexible engagement" });
        break;
      case "us":
        employeeTypes.push({ value: "at_will", label: "At-Will Employment", description: "Employment at will of either party" });
        break;
      case "ca":
        employeeTypes.push({ value: "on_call", label: "On-Call Employee", description: "Called to work as needed" });
        employeeTypes.push({ value: "seasonal", label: "Seasonal Worker", description: "Temporary seasonal employment" });
        break;
      case "hk":
      case "sg":
        employeeTypes.push({ value: "part_time", label: "Part-Time Employee", description: "Reduced hours employment" });
        break;
      case "jp":
        employeeTypes.push({ value: "part_time", label: "Part-Time (パートタイム)", description: "Reduced hours employment" });
        break;
    }
    return employeeTypes;
  }

  // No worker selected yet — show all types so the list isn't empty
  const allTypes: EngagementTypeOption[] = [
    { value: "contractor", label: "Contractor", description: "Independent services" },
    { value: "permanent", label: "Permanent", description: "Ongoing employment" },
    { value: "fixed_term", label: "Fixed Term", description: "Time-limited contract" },
  ];
  switch (country) {
    case "au":
    case "nz":
    case "ph":
      allTypes.push({ value: "casual", label: "Casual Employee", description: "Flexible hours" });
      break;
    case "uk":
    case "gb":
      allTypes.push({ value: "zero_hours", label: "Zero-Hours Contract", description: "No guaranteed hours" });
      break;
    case "us":
      allTypes.push({ value: "at_will", label: "At-Will Employment", description: "Employment at will" });
      allTypes.push({ value: "gig_worker", label: "Gig Worker", description: "Independent contractor for specific tasks" });
      break;
    case "ca":
      allTypes.push({ value: "on_call", label: "On-Call Employee", description: "Called to work as needed" });
      allTypes.push({ value: "seasonal", label: "Seasonal Worker", description: "Temporary seasonal employment" });
      break;
    case "hk":
    case "sg":
    case "jp":
      allTypes.push({ value: "part_time", label: "Part-Time Employee", description: "Reduced hours employment" });
      break;
  }
  return allTypes;
}
