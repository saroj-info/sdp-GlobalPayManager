/**
 * Country reference data shared by the client and the server: the canonical
 * country names, ISO codes and aliases (`canonicaliseCountry`), the currency per
 * country and the prose employment notes the AI country intel quotes.
 *
 * Statutory / employer cost ITEMS are NOT here any more: they live in the
 * `country_cost_items` table (Cost Settings on /platform-config), seeded from
 * shared/countryCostSeed.ts, with the maths and vocabulary in
 * shared/countryCosts.ts.
 */

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

// Currency per country (seed data; the DB `countries.currency` is authoritative in the app).
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
