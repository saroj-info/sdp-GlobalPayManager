/**
 * Country-level employment cost + regulation reference data.
 *
 * Single source of truth shared between:
 *   - client/src/pages/resources.tsx  (Employment Cost Calculator UI)
 *   - server/modules/ai/search/tools.ts  (getCountryEmploymentRules /
 *     estimateEmploymentCost AI tools — grounded numeric answers)
 *
 * All rates are illustrative defaults for planning. Statutory rates change and
 * may vary by state / industry / seniority / age / wage caps. Always validate
 * against current rules.
 */

export interface OnCostItem {
  id: string;
  name: string;
  type: "percent" | "flat" | "percent_with_cap" | "percent_above_threshold";
  value: number;
  capAmount?: number;
  thresholdAmount?: number;
  note?: string;
}

export type OnCostMap = Record<string, OnCostItem[]>;
export type JurisdictionOverlayMap = Record<string, Record<string, OnCostItem[]>>;
export type CountryNoteMap = Record<string, string>;

export const COUNTRY_LIST: readonly string[] = [
  "Australia",
  "USA",
  "New Zealand",
  "Ireland",
  "Philippines",
  "Japan",
  "Canada",
  "UK",
  "Romania",
  "Singapore",
  "Malaysia",
  "Vietnam",
  "India",
  "Brazil",
  "Pakistan",
  "Sri Lanka",
  "Germany",
];

// Country → ISO 3166 alpha-2. Only the countries the calculator + primers cover.
export const COUNTRY_CODE_BY_NAME: Record<string, string> = {
  Australia: "AU",
  USA: "US",
  "New Zealand": "NZ",
  Ireland: "IE",
  Philippines: "PH",
  Japan: "JP",
  Canada: "CA",
  UK: "GB",
  Romania: "RO",
  Singapore: "SG",
  Malaysia: "MY",
  Vietnam: "VN",
  India: "IN",
  Brazil: "BR",
  Pakistan: "PK",
  "Sri Lanka": "LK",
  Germany: "DE",
};

export const COUNTRY_NAME_BY_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_CODE_BY_NAME).map(([name, code]) => [code, name]),
);

// Common aliases the AI (or a user) might send. All values must appear in COUNTRY_LIST.
const COUNTRY_ALIASES: Record<string, string> = {
  "united states": "USA",
  "united states of america": "USA",
  us: "USA",
  america: "USA",
  "united kingdom": "UK",
  "great britain": "UK",
  britain: "UK",
  england: "UK",
  gb: "UK",
  aus: "Australia",
  nz: "New Zealand",
  aotearoa: "New Zealand",
  ie: "Ireland",
  ph: "Philippines",
  jp: "Japan",
  ca: "Canada",
  ro: "Romania",
  sg: "Singapore",
  my: "Malaysia",
  vn: "Vietnam",
  in: "India",
  br: "Brazil",
  pk: "Pakistan",
  lk: "Sri Lanka",
  de: "Germany",
};

/** Resolve any of: canonical name, ISO code, or common alias to a canonical COUNTRY_LIST entry. */
export function canonicaliseCountry(input: string | undefined | null): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  // Direct match in canonical list.
  const directHit = COUNTRY_LIST.find((c) => c.toLowerCase() === raw.toLowerCase());
  if (directHit) return directHit;
  // ISO code.
  const upper = raw.toUpperCase();
  if (COUNTRY_NAME_BY_CODE[upper]) return COUNTRY_NAME_BY_CODE[upper];
  // Alias.
  const alias = COUNTRY_ALIASES[raw.toLowerCase()];
  if (alias) return alias;
  return null;
}

// Employer on-cost defaults per country (Total Cost of Employment reference).
export const DEFAULT_EMPLOYER_ONCOSTS: OnCostMap = {
  Australia: [
    { id: "super", name: "Superannuation", type: "percent", value: 11.5, note: "Adjust for current FY" },
    { id: "payroll_tax", name: "Payroll tax (base)", type: "percent", value: 0, note: "Overridden by state thresholds/rates" },
    { id: "workers_comp", name: "Workers' compensation", type: "percent", value: 1.2, note: "Industry rating varies" },
    { id: "admin_ins", name: "Insurance & admin buffer", type: "percent", value: 1, note: "General overheads" },
  ],
  USA: [
    { id: "fica", name: "FICA (SS+Medicare)", type: "percent", value: 7.65, note: "SS cap not modelled; edit if needed" },
    { id: "futa", name: "FUTA", type: "percent_with_cap", value: 0.6, capAmount: 7000, note: "On first $7,000 wages" },
    { id: "suta", name: "SUTA (state overlay)", type: "percent_with_cap", value: 0, capAmount: 0, note: "Overridden by state" },
    { id: "workers_comp", name: "Workers' comp (avg)", type: "percent", value: 1.5, note: "Industry dependent" },
    { id: "health", name: "Health benefits (typical)", type: "percent", value: 10, note: "Plan-dependent; set to 0 if not provided" },
  ],
  "New Zealand": [
    { id: "kiwisaver", name: "KiwiSaver (if enrolled)", type: "percent", value: 3 },
    { id: "acc", name: "ACC employer levy (avg)", type: "percent", value: 1.4 },
  ],
  Ireland: [
    { id: "prsi", name: "Employer PRSI (std)", type: "percent", value: 11.05 },
    { id: "training", name: "Training/levies buffer", type: "percent", value: 1 },
  ],
  Philippines: [
    { id: "sss", name: "SSS (employer share)", type: "percent", value: 9.5 },
    { id: "philhealth", name: "PhilHealth (employer)", type: "percent", value: 3 },
    { id: "pagibig", name: "Pag-IBIG", type: "percent", value: 2 },
  ],
  Japan: [
    { id: "social", name: "Social insurance (avg)", type: "percent", value: 15 },
    { id: "unemployment", name: "Unemployment insurance", type: "percent", value: 0.6 },
  ],
  Canada: [
    { id: "cpp_ei", name: "CPP/QPP + EI (avg)", type: "percent", value: 7.5 },
    { id: "workers_comp", name: "Workers' comp (avg)", type: "percent", value: 1.5 },
  ],
  UK: [
    { id: "eni", name: "Employer NI", type: "percent", value: 13.8 },
    { id: "apprenticeship", name: "Apprenticeship Levy", type: "percent", value: 0.5 },
  ],
  Romania: [
    { id: "work_ins", name: "Work insurance contribution", type: "percent", value: 2.25 },
  ],
  Singapore: [
    { id: "cpf", name: "CPF (employer) ≤55y", type: "percent", value: 17 },
    { id: "sdl", name: "Skills Development Levy", type: "percent", value: 0.25 },
  ],
  Malaysia: [
    { id: "epf", name: "EPF (employer)", type: "percent", value: 12 },
    { id: "socso", name: "SOCSO", type: "percent", value: 1.75 },
    { id: "eis", name: "EIS", type: "percent", value: 0.2 },
    { id: "hrdf", name: "HRD levy (eligible)", type: "percent", value: 1 },
  ],
  Vietnam: [
    { id: "si", name: "Social Insurance", type: "percent", value: 17.5 },
    { id: "hi", name: "Health Insurance", type: "percent", value: 3 },
    { id: "ui", name: "Unemployment Insurance", type: "percent", value: 1 },
    { id: "union", name: "Trade Union (typical)", type: "percent", value: 2 },
  ],
  India: [
    { id: "pf", name: "Provident Fund (employer)", type: "percent", value: 12 },
    { id: "esi", name: "ESI (employer)", type: "percent", value: 3.25 },
    { id: "gratuity", name: "Gratuity accrual (typical)", type: "percent", value: 4.81 },
    { id: "edli", name: "EDLI + admin (approx)", type: "percent", value: 1 },
  ],
  Brazil: [
    { id: "inss", name: "INSS employer", type: "percent", value: 20 },
    { id: "fgts", name: "FGTS", type: "percent", value: 8 },
    { id: "13th", name: "13th month salary", type: "percent", value: 8.33 },
    { id: "vacation", name: "Vacation bonus (1/3)", type: "percent", value: 8.33 },
    { id: "others", name: "RAT/third parties (avg)", type: "percent", value: 6 },
  ],
  Pakistan: [
    { id: "eobi", name: "EOBI (employer contribution)", type: "percent", value: 5 },
    { id: "sessi", name: "SESSI (Social Security)", type: "percent", value: 6 },
    { id: "wwf", name: "Workers' Welfare Fund", type: "percent", value: 2 },
    { id: "admin", name: "Admin & compliance buffer", type: "percent", value: 1.5 },
  ],
  "Sri Lanka": [
    { id: "epf", name: "EPF (employer contribution)", type: "percent", value: 12 },
    { id: "etf", name: "ETF (Training Fund)", type: "percent", value: 3 },
    { id: "admin", name: "Admin & compliance buffer", type: "percent", value: 1.5 },
  ],
  Germany: [
    { id: "social_ins", name: "Social insurance (avg)", type: "percent", value: 19.5 },
    { id: "unemployment", name: "Unemployment insurance", type: "percent", value: 1.3 },
    { id: "accident", name: "Accident insurance (avg)", type: "percent", value: 1.3 },
    { id: "admin", name: "Admin & compliance buffer", type: "percent", value: 1 },
  ],
};

// Contractor baseline (generic, editable). Local law may treat some
// "contractors" as employees — use COR/EOR guidance.
export const DEFAULT_CONTRACTOR_ONCOSTS: OnCostMap = {
  Australia: [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1 },
    { id: "pli", name: "Public liability/insurances", type: "percent", value: 1 },
    { id: "allowances", name: "Leave/allowance buffer", type: "percent", value: 8 },
  ],
  USA: [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1 },
    { id: "pli", name: "Insurance buffer", type: "percent", value: 1 },
  ],
  Pakistan: [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1.5 },
    { id: "compliance", name: "Compliance & legal buffer", type: "percent", value: 1 },
  ],
  "Sri Lanka": [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1.5 },
    { id: "compliance", name: "Compliance & legal buffer", type: "percent", value: 1 },
  ],
  Germany: [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1 },
    { id: "compliance", name: "Compliance & legal buffer", type: "percent", value: 1.5 },
  ],
  "New Zealand": [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1 },
    { id: "compliance", name: "Compliance & legal buffer", type: "percent", value: 1 },
  ],
  Ireland: [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1 },
    { id: "compliance", name: "EU compliance buffer", type: "percent", value: 1.5 },
  ],
  Philippines: [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1.5 },
    { id: "compliance", name: "Compliance & legal buffer", type: "percent", value: 1 },
  ],
  Japan: [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1 },
    { id: "compliance", name: "Compliance & legal buffer", type: "percent", value: 1.5 },
  ],
  Canada: [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1 },
    { id: "compliance", name: "Provincial compliance buffer", type: "percent", value: 1 },
  ],
  UK: [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1 },
    { id: "compliance", name: "Compliance & legal buffer", type: "percent", value: 1.5 },
  ],
  Romania: [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1 },
    { id: "compliance", name: "EU compliance buffer", type: "percent", value: 1.5 },
  ],
  Singapore: [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1 },
    { id: "compliance", name: "Compliance & legal buffer", type: "percent", value: 1 },
  ],
  Malaysia: [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1.5 },
    { id: "compliance", name: "Compliance & legal buffer", type: "percent", value: 1 },
  ],
  Vietnam: [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1.5 },
    { id: "compliance", name: "Compliance & legal buffer", type: "percent", value: 1 },
  ],
  India: [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1.5 },
    { id: "compliance", name: "Compliance & legal buffer", type: "percent", value: 1 },
  ],
  Brazil: [
    { id: "platform", name: "Admin & platform", type: "percent", value: 1.5 },
    { id: "compliance", name: "Compliance & legal buffer", type: "percent", value: 2 },
  ],
};

// Jurisdiction overlays override / augment the country defaults when a
// specific state / province is selected. Illustrative — edit to current.
export const DEFAULT_JURISDICTIONS_OVERLAY: JurisdictionOverlayMap = {
  Australia: {
    "New South Wales": [
      { id: "nsw_payroll_tax", name: "Payroll tax (NSW)", type: "percent_above_threshold", value: 5.45, thresholdAmount: 1000000, note: "Example: 5.45% above A$1m — edit to current" },
    ],
    Victoria: [
      { id: "vic_payroll_tax", name: "Payroll tax (VIC)", type: "percent_above_threshold", value: 4.85, thresholdAmount: 700000, note: "Example — edit to current" },
    ],
    Queensland: [
      { id: "qld_payroll_tax", name: "Payroll tax (QLD)", type: "percent_above_threshold", value: 4.75, thresholdAmount: 1300000, note: "Example — edit to current" },
    ],
    "South Australia": [
      { id: "sa_payroll_tax", name: "Payroll tax (SA)", type: "percent_above_threshold", value: 4.95, thresholdAmount: 1200000, note: "Example — edit to current" },
    ],
    "Western Australia": [
      { id: "wa_payroll_tax", name: "Payroll tax (WA)", type: "percent_above_threshold", value: 5.5, thresholdAmount: 1000000, note: "Example — edit to current" },
    ],
    Tasmania: [
      { id: "tas_payroll_tax", name: "Payroll tax (TAS)", type: "percent_above_threshold", value: 4, thresholdAmount: 1250000, note: "Example — edit to current" },
    ],
    "Australian Capital Territory": [
      { id: "act_payroll_tax", name: "Payroll tax (ACT)", type: "percent_above_threshold", value: 6.85, thresholdAmount: 2200000, note: "Example — edit to current" },
    ],
    "Northern Territory": [
      { id: "nt_payroll_tax", name: "Payroll tax (NT)", type: "percent_above_threshold", value: 5.5, thresholdAmount: 1500000, note: "Example — edit to current" },
    ],
  },
  USA: {
    California: [
      { id: "ca_suta", name: "CA UI (SUTA)", type: "percent_with_cap", value: 3.4, capAmount: 7000, note: "New employers; experience-rated thereafter" },
      { id: "ca_edi", name: "CA ETT/SDI (employer portion)", type: "flat", value: 0, note: "Typically employee-paid; leave at 0 or add flat" },
    ],
    "New York": [
      { id: "ny_suta", name: "NY UI (SUTA)", type: "percent_with_cap", value: 4.1, capAmount: 12000, note: "Illustrative; edit for actual rate" },
    ],
    Texas: [
      { id: "tx_suta", name: "TX UI (SUTA)", type: "percent_with_cap", value: 2.7, capAmount: 9000, note: "Illustrative; edit for actual rate" },
    ],
    Florida: [
      { id: "fl_suta", name: "FL UI (SUTA)", type: "percent_with_cap", value: 2.7, capAmount: 7000, note: "Illustrative; edit for actual rate" },
    ],
    Washington: [
      { id: "wa_suta", name: "WA UI (SUTA)", type: "percent_with_cap", value: 1.2, capAmount: 68000, note: "Wage base much higher; illustrative" },
    ],
  },
};

// Prose narrative per country — hiring rules, pay cadence, leave, notice
// periods. The AI grounds narrative answers here.
export const COUNTRY_EMPLOYMENT_NOTES: CountryNoteMap = {
  Australia:
    `Employment is governed by the Fair Work framework and state laws. Most roles are under an Award or enterprise agreement with minimums for pay, leave and notice.
• Pension (Superannuation) is employer‑funded; payroll tax and workers' comp vary by state and industry.
• Typical leave includes 20 days annual leave, 10 days personal/carer's leave, plus public holidays.
• Probation is usually 3–6 months. Termination requires notice and, if applicable, consultation process.
• Common pitfalls: award classification, overtime/penalty rates, and state payroll tax thresholds.
• Pay cycles: fortnightly or monthly; single touch payroll reporting is mandatory.`,
  USA:
    `At‑will employment is common, but offer letters, handbooks and state laws matter.
• Statutory employer costs include FICA, FUTA, SUTA and workers' compensation; health benefits are often a large additional cost.
• Pay cadence varies by state; overtime rules under FLSA apply to non‑exempt roles.
• Benefits packages (medical, dental, vision, 401(k)) are a key competitiveness factor.
• Compliance is state‑specific (wage/hour, paid sick leave, pay transparency).`,
  "New Zealand":
    `Employment is contract‑based under the Employment Relations Act with good‑faith obligations.
• Minimum leave: 4 weeks annual leave, 11 public holidays; sick leave entitlements apply after 6 months.
• KiwiSaver (employee‑opt‑in) often triggers the employer 3% contribution; ACC levies apply to employers.
• Probation/trial periods only for certain employer sizes and must be explicit.
• Payroll is usually monthly or fortnightly; PAYE withheld by the employer.`,
  Ireland:
    `Contracts must include core terms. Working Time and Payment of Wages Acts set key baselines.
• Employer PRSI is a material on‑cost; auto‑enrolment pensions are being phased in.
• Leave: 4 weeks' annual leave (pro‑rata), public holidays and statutory sick pay.
• Collective agreements exist in some sectors; pay transparency and record‑keeping are important.
• Payroll: monthly is common; operate PAYE/USC/PRSI via Revenue.`,
  Philippines:
    `Employment is under the Labor Code. Regularization typically after 6 months unless fixed‑term/project.
• 13th‑month pay is mandatory; employer shares for SSS, PhilHealth and Pag‑IBIG.
• Typical leave: service incentive leave; other leaves depend on company policy/law.
• Night differential/OT rules apply; holiday pay has special rates.
• Payroll is commonly twice‑monthly (15th and end‑month).`,
  Japan:
    `Employment practices emphasize written rules of employment and social insurance participation.
• Employer bears significant social insurance costs (health, pension, unemployment, etc.).
• Working hours/overtime tightly regulated; premium rates for OT and late night work.
• Bonuses are customary (summer/winter) though not strictly mandatory unless contractual.
• Payroll is monthly with year‑end adjustments; many benefits determined by insurer rates.`,
  Canada:
    `Employment standards and payroll are provincial/territorial.
• Employer contributions include CPP/QPP, EI and workers' compensation levies.
• Paid leave, public holidays and termination notice are province‑specific.
• Benefits plans (health/dental) are common to supplement public healthcare.
• Payroll frequencies: bi‑weekly or semi‑monthly are common; ROEs for separations.`,
  UK:
    `Written statements of particulars required. Working Time Regulations govern hours/holidays.
• Employer NI is the main statutory on‑cost; apprenticeship levy may apply.
• Holiday minimum 5.6 weeks (incl. public holidays) for full‑time staff.
• Auto‑enrolment pensions require employer contributions above thresholds.
• Payroll is monthly; operate PAYE and RTI submissions to HMRC.`,
  Romania:
    `Most social contributions are employee‑borne since 2018, with a small employer work insurance contribution.
• Individual Employment Contracts must be registered in REVISAL.
• Annual leave minimum is typically 20 working days; meal vouchers common as a perk.
• Payroll: monthly; watch sector‑specific tax facilities (e.g., IT, construction).`,
  Singapore:
    `Flexible, pro‑business regime. Employment Act covers many (not all) employees.
• CPF employer contributions apply to Citizens/PRs (age‑tiered). No CPF for most foreign EP holders.
• Skills Development Levy applies to most employees.
• Leave: at least 7 days rising with service (many employers offer ~14–18), plus public holidays.
• Payroll: monthly; itemized payslips and KETs required.`,
  Malaysia:
    `Employment Act sets baselines; some provisions apply by wage thresholds.
• Employer costs include EPF, SOCSO, EIS and possible HRD levy (eligible sectors).
• Annual leave and public holiday entitlements apply; OT rules by category/wage.
• Payroll: monthly; PCB (income tax) deductions and statutory filings required.`,
  Vietnam:
    `Labor Code requires written contracts. Social, health and unemployment insurances are employer on‑costs, subject to caps.
• Minimum wages vary by region; trade union fee may apply.
• Leave: at least 12 days annually (more by seniority) plus public holidays.
• Payroll: monthly; net‑to‑gross planning important for expats.`,
  India:
    `Complex but well‑structured regime with central and state laws.
• Employer on‑costs often include Provident Fund, ESI (below thresholds), gratuity provisioning and insurance.
• Shops & Establishments and standing orders apply by state/size.
• Leave policies vary by state/company; festival/public holidays add complexity.
• Payroll: monthly with TDS and statutory filings; salary structure (basic/allowances) matters for PF/ESI.`,
  Brazil:
    `Protective labor regime under the CLT. Common on‑costs: INSS employer share, FGTS, 13th salary and vacation bonus.
• 13th salary equals one extra month, usually in two installments; vacation bonus adds 1/3 monthly pay.
• Union/sector charges and risk insurance (RAT) may apply.
• Payroll: monthly with eSocial filings; careful planning of total cost is essential.`,
  Pakistan:
    `Employment is governed by various provincial labor laws and federal legislation. Contract and permanent employment arrangements are common.
• Key employer contributions include EOBI (pension), SESSI (social security), and Workers' Welfare Fund; rates vary by province and employee count.
• Annual leave entitlements typically 21 days; sick leave and public holidays as per local law.
• Notice periods vary by seniority; severance may apply for certain terminations.
• Payroll cycles vary but monthly is common; income tax and social contributions withheld by employer.`,
  "Sri Lanka":
    `Employment relationships are governed by various acts including the Shop and Office Employees Act and Industrial Disputes Act.
• Mandatory employer contributions to EPF (12%) and ETF (3%) for eligible employees; additional benefits may apply.
• Annual leave entitlements depend on length of service; typically 14-21 days plus public holidays.
• Termination requires proper notice and procedures; Industrial Court may review disputes.
• Monthly payroll common; PAYE tax and statutory contributions managed by employer.`,
  Germany:
    `Employment is highly regulated with strong worker protections under various labor laws and collective agreements.
• Substantial social insurance obligations: health, pension, unemployment and accident insurance typically ~22-23% of gross salary.
• Generous vacation (minimum 24 days), extensive sick leave, and parental leave benefits.
• Strict termination procedures with notice periods up to 7 months; works councils have significant rights.
• Monthly payroll standard; complex tax and social contribution system managed by employer.`,
};

// Currency per country — matches the CURRENCIES map inside resources.tsx.
export interface CountryCurrency {
  code: string;
  symbol: string;
}

export const COUNTRY_CURRENCIES: Record<string, CountryCurrency> = {
  Australia: { code: "AUD", symbol: "A$" },
  USA: { code: "USD", symbol: "$" },
  "New Zealand": { code: "NZD", symbol: "NZ$" },
  Ireland: { code: "EUR", symbol: "€" },
  Philippines: { code: "PHP", symbol: "₱" },
  Japan: { code: "JPY", symbol: "¥" },
  Canada: { code: "CAD", symbol: "C$" },
  UK: { code: "GBP", symbol: "£" },
  Romania: { code: "RON", symbol: "lei" },
  Singapore: { code: "SGD", symbol: "S$" },
  Malaysia: { code: "MYR", symbol: "RM" },
  Vietnam: { code: "VND", symbol: "₫" },
  India: { code: "INR", symbol: "₹" },
  Brazil: { code: "BRL", symbol: "R$" },
  Pakistan: { code: "PKR", symbol: "₨" },
  "Sri Lanka": { code: "LKR", symbol: "Rs" },
  Germany: { code: "EUR", symbol: "€" },
};

/**
 * Pure calculator matching resources.tsx `calcLine` — kept here so the AI's
 * `estimateEmploymentCost` tool produces exactly the same numbers the
 * calculator UI shows.
 */
function calcLineAmount(item: OnCostItem, base: number): number {
  const pct = (b: number, percent: number | undefined) => (b * (percent || 0)) / 100;
  switch (item.type) {
    case "percent_with_cap": {
      const appliedBase = Math.min(base, item.capAmount ?? base);
      return pct(appliedBase, item.value);
    }
    case "percent_above_threshold": {
      const taxable = Math.max(0, base - (item.thresholdAmount ?? 0));
      return pct(taxable, item.value);
    }
    case "percent":
      return pct(base, item.value);
    case "flat":
      return item.value || 0;
    default:
      return 0;
  }
}

export interface OnCostLine {
  id: string;
  name: string;
  type: OnCostItem["type"];
  ratePct?: number;
  amount: number;
  note?: string;
}

export interface EmploymentCostEstimate {
  country: string;
  countryCode: string | null;
  currency: CountryCurrency | null;
  employmentType: "Employee" | "Contractor";
  baseSalary: number;
  jurisdictionApplied?: string;
  onCostBreakdown: OnCostLine[];
  onCostTotal: number;
  totalEmployerCost: number;
}

export function estimateEmploymentCost(params: {
  country: string;
  employmentType?: "Employee" | "Contractor";
  annualSalary: number;
  jurisdiction?: string;
}): EmploymentCostEstimate | null {
  const canonical = canonicaliseCountry(params.country);
  if (!canonical) return null;
  const base = Number.isFinite(params.annualSalary) ? Number(params.annualSalary) : 0;
  const employmentType: "Employee" | "Contractor" = params.employmentType === "Contractor" ? "Contractor" : "Employee";
  const bag = employmentType === "Employee" ? DEFAULT_EMPLOYER_ONCOSTS : DEFAULT_CONTRACTOR_ONCOSTS;
  const countryItems: OnCostItem[] = bag[canonical] ?? [];
  const jurisdictionItems: OnCostItem[] = params.jurisdiction
    ? DEFAULT_JURISDICTIONS_OVERLAY[canonical]?.[params.jurisdiction] ?? []
    : [];
  const merged = [...countryItems, ...jurisdictionItems];
  const onCostBreakdown: OnCostLine[] = merged.map((item) => {
    const amount = calcLineAmount(item, base);
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      ratePct: item.type === "flat" ? undefined : item.value,
      amount: Number(amount.toFixed(2)),
      note: item.note,
    };
  });
  const onCostTotal = Number(onCostBreakdown.reduce((s, l) => s + l.amount, 0).toFixed(2));
  const totalEmployerCost = Number((base + onCostTotal).toFixed(2));
  return {
    country: canonical,
    countryCode: COUNTRY_CODE_BY_NAME[canonical] ?? null,
    currency: COUNTRY_CURRENCIES[canonical] ?? null,
    employmentType,
    baseSalary: base,
    jurisdictionApplied: jurisdictionItems.length ? params.jurisdiction : undefined,
    onCostBreakdown,
    onCostTotal,
    totalEmployerCost,
  };
}
