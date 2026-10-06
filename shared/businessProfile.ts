/**
 * Business profile completeness: the details a customer business must have
 * (address, country, registration number), the per-country labels for its
 * numbers, and the body schema for `PATCH /api/businesses/me`.
 *
 * Pure, no DB. Shared by the server (save endpoint, contract-creation block)
 * and the client (login prompt, reminder bar, profile form) so both agree on
 * what "missing" means.
 */

import { z } from "zod";

// Structural, so callers can pass a `Business` row or an untyped API payload.
export interface BusinessProfileFields {
  isRegistered?: boolean | null;
  isSdpOwned?: boolean | null;
  address?: string | null;
  registrationCountryId?: string | null;
  registrationNumber?: string | null;
  taxNumber?: string | null;
}

export type MissingBusinessDetail = 'address' | 'country' | 'registrationNumber';

export interface BusinessNumberLabels {
  registration: string;
  tax: string;
}

/**
 * Only customer businesses need a profile. Host clients (`isRegistered = false`)
 * and the SDP-owned employer row do not.
 */
export function requiresBusinessProfile(business: BusinessProfileFields | null | undefined): boolean {
  return !!business && business.isRegistered !== false && !business.isSdpOwned;
}

/** Required details that are still empty. `[]` when no profile is required. */
export function getMissingBusinessDetails(business: BusinessProfileFields | null | undefined): MissingBusinessDetail[] {
  if (!business || !requiresBusinessProfile(business)) return [];
  const missing: MissingBusinessDetail[] = [];
  if (!business.address?.trim()) missing.push('address');
  if (!business.registrationCountryId?.trim()) missing.push('country');
  if (!business.registrationNumber?.trim()) missing.push('registrationNumber');
  return missing;
}

const DEFAULT_NUMBER_LABELS: BusinessNumberLabels = {
  registration: 'Business registration number',
  tax: 'Tax number (GST/VAT)',
};

// Keyed by `countries.id` (lowercase; the UK row is `uk`, with code `GB`).
const NUMBER_LABELS_BY_COUNTRY: Record<string, BusinessNumberLabels> = {
  au: { registration: 'ABN', tax: 'GST number' },
  nz: { registration: 'NZBN', tax: 'GST number' },
  us: { registration: 'EIN', tax: 'State tax ID' },
  uk: { registration: 'Company Number', tax: 'VAT number' },
  ca: { registration: 'Business Number (BN)', tax: 'GST/HST number' },
  sg: { registration: 'UEN', tax: 'GST registration number' },
  ie: { registration: 'CRO number', tax: 'VAT number' },
  in: { registration: 'CIN', tax: 'GSTIN' },
  ph: { registration: 'SEC registration number', tax: 'TIN' },
  jp: { registration: 'Corporate Number', tax: 'JCT registration number' },
};

/** Labels for the registration number and the optional tax number. */
export function getBusinessNumberLabels(countryId: string | null | undefined): BusinessNumberLabels {
  const key = (countryId ?? '').trim().toLowerCase();
  return NUMBER_LABELS_BY_COUNTRY[key === 'gb' ? 'uk' : key] ?? DEFAULT_NUMBER_LABELS;
}

/**
 * The missing details as words for a sentence, e.g. "address, country and
 * business registration number". Uses the country's own label for the number
 * once the country is known ("address and ABN").
 */
export function describeMissingBusinessDetails(
  missing: MissingBusinessDetail[],
  countryId?: string | null,
): string {
  const labels = getBusinessNumberLabels(countryId);
  const registrationWord = labels === DEFAULT_NUMBER_LABELS ? 'business registration number' : labels.registration;
  const words = missing.map((detail) => (detail === 'registrationNumber' ? registrationWord : detail));
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/**
 * Body of `PATCH /api/businesses/me`. The three required details are saved
 * together; a business that does not have them yet skips the page instead.
 * Numbers are free text: no per-country format check.
 */
export const updateBusinessProfileSchema = z.object({
  address: z.string().trim().min(1, 'Address is required').max(500, 'Address must be 500 characters or fewer'),
  registrationCountryId: z.string().trim().min(1, 'Country is required'),
  registrationNumber: z.string().trim().min(1, 'This number is required').max(50, 'Must be 50 characters or fewer'),
  taxNumber: z.string().trim().max(50, 'Must be 50 characters or fewer').optional(),
});

export type UpdateBusinessProfileInput = z.infer<typeof updateBusinessProfileSchema>;
