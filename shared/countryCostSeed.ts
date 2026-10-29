/**
 * Seed for the `country_cost_items` table (Cost Settings), keyed by the
 * canonical country name of shared/countryEmploymentData.ts. Loaded at boot for
 * a DB country that has no rows yet, and by "Restore defaults" on the Cost
 * Settings tab. After that the table is the source of truth: edit rates there,
 * not here.
 *
 * Rates are planning figures carried over from the earlier static calculator
 * (Australia super updated to the 12% Superannuation Guarantee rate from
 * 1 July 2025; Philippines 13th-month pay added). Statutory rates change and
 * vary by industry, state and wage caps — SDP keeps them current in the app.
 */
import type { CostAppliesTo, CostCalcType } from "./countryCosts";

export interface CostSeedItem {
  key: string;
  name: string;
  description: string;
  appliesTo: CostAppliesTo[];
  calcType: CostCalcType;
  value: number;
  capAmount?: number;
  stateProvince?: string;
}

const EMP: CostAppliesTo[] = ["employment"];
const EMP_COR: CostAppliesTo[] = ["employment", "contractor_of_record"];
const CONTRACTORS: CostAppliesTo[] = ["contractor_standard", "contractor_of_record"];
const ALL: CostAppliesTo[] = ["employment", "contractor_standard", "contractor_of_record"];

const platform = (value: number, text = "SDP planning allowance for contractor onboarding, platform use and payment administration."): CostSeedItem => ({
  key: "platform",
  name: "Admin and platform",
  description: text,
  appliesTo: CONTRACTORS,
  calcType: "percent",
  value,
});

const compliance = (value: number, name = "Compliance and legal buffer", text = "SDP planning allowance for contractor classification checks, contract review and local compliance work."): CostSeedItem => ({
  key: "compliance",
  name,
  description: text,
  appliesTo: CONTRACTORS,
  calcType: "percent",
  value,
});

const auPayrollTax = (state: string, abbrev: string, value: number): CostSeedItem => ({
  key: `${abbrev.toLowerCase()}_payroll_tax`,
  name: `Payroll tax (${abbrev})`,
  description: `State payroll tax on wages paid in ${state}. The tax-free threshold applies to an employer's total wages, not to each worker; SDP's aggregate payroll is above it, so the full rate is applied to this role. Contractor payments can also be liable under the relevant contract provisions. Rates and thresholds change each financial year.`,
  appliesTo: ALL,
  calcType: "percent",
  value,
  stateProvince: state,
});

const usSuta = (state: string, abbrev: string, value: number, capAmount: number): CostSeedItem => ({
  key: `${abbrev.toLowerCase()}_suta`,
  name: `${abbrev} unemployment insurance (SUTA)`,
  description: `${state} state unemployment insurance, charged on the first USD ${capAmount.toLocaleString("en-US")} of each employee's wages per year. Illustrative new-employer rate; employers are experience-rated after the first years.`,
  appliesTo: ALL,
  calcType: "percent_with_cap",
  value,
  capAmount,
  stateProvince: state,
});

export const COUNTRY_COST_SEED: Record<string, CostSeedItem[]> = {
  Australia: [
    {
      key: "super",
      name: "Superannuation Guarantee",
      description: "Compulsory employer superannuation contribution of 12% of ordinary time earnings (the Superannuation Guarantee rate from 1 July 2025), paid into the worker's super fund at least quarterly. Not deducted from pay.",
      appliesTo: EMP_COR,
      calcType: "percent",
      value: 12,
    },
    {
      key: "workers_comp",
      name: "Workers' compensation insurance",
      description: "Mandatory employer insurance covering work-related injury and illness. Premiums are set by the state scheme and the industry classification; 1.2% is a planning average for office-based roles.",
      appliesTo: EMP,
      calcType: "percent",
      value: 1.2,
    },
    {
      key: "admin_ins",
      name: "Insurance and admin buffer",
      description: "SDP planning allowance for general insurances (public liability, professional indemnity) and payroll administration overheads attributable to the role.",
      appliesTo: EMP,
      calcType: "percent",
      value: 1,
    },
    platform(1),
    {
      key: "pli",
      name: "Public liability and insurances",
      description: "Allowance for public liability and related insurances that cover the contractor's engagement.",
      appliesTo: CONTRACTORS,
      calcType: "percent",
      value: 1,
    },
    {
      key: "allowances",
      name: "Leave and allowance buffer",
      description: "Planning allowance for paid leave, public holidays and other allowances a contractor engagement may carry under the terms agreed.",
      appliesTo: CONTRACTORS,
      calcType: "percent",
      value: 8,
    },
    auPayrollTax("New South Wales", "NSW", 5.45),
    auPayrollTax("Victoria", "VIC", 4.85),
    auPayrollTax("Queensland", "QLD", 4.75),
    auPayrollTax("South Australia", "SA", 4.95),
    auPayrollTax("Western Australia", "WA", 5.5),
    auPayrollTax("Tasmania", "TAS", 4),
    auPayrollTax("Australian Capital Territory", "ACT", 6.85),
    auPayrollTax("Northern Territory", "NT", 5.5),
  ],
  USA: [
    {
      key: "fica",
      name: "FICA (Social Security and Medicare)",
      description: "Employer share of federal payroll taxes: Social Security 6.2% (up to the annual wage base) and Medicare 1.45% (no cap). The wage base is not modelled here.",
      appliesTo: EMP,
      calcType: "percent",
      value: 7.65,
    },
    {
      key: "futa",
      name: "FUTA",
      description: "Federal unemployment tax, 0.6% after the state credit, on the first USD 7,000 of each employee's wages per year.",
      appliesTo: EMP,
      calcType: "percent_with_cap",
      value: 0.6,
      capAmount: 7000,
    },
    {
      key: "workers_comp",
      name: "Workers' compensation (average)",
      description: "State-mandated insurance for work-related injury; premiums depend on the state, class code and payroll. 1.5% is a planning average.",
      appliesTo: EMP,
      calcType: "percent",
      value: 1.5,
    },
    {
      key: "health",
      name: "Health benefits (typical)",
      description: "Employer contribution to medical, dental and vision plans. Plan-dependent; set to 0 when no benefits are provided.",
      appliesTo: EMP,
      calcType: "percent",
      value: 10,
    },
    platform(1),
    {
      key: "pli",
      name: "Insurance buffer",
      description: "Allowance for general liability and related insurances covering the contractor's engagement.",
      appliesTo: CONTRACTORS,
      calcType: "percent",
      value: 1,
    },
    usSuta("California", "CA", 3.4, 7000),
    usSuta("New York", "NY", 4.1, 12000),
    usSuta("Texas", "TX", 2.7, 9000),
    usSuta("Florida", "FL", 2.7, 7000),
    usSuta("Washington", "WA", 1.2, 68000),
  ],
  "New Zealand": [
    {
      key: "kiwisaver",
      name: "KiwiSaver employer contribution",
      description: "Compulsory employer contribution of 3% of gross salary for employees enrolled in KiwiSaver (permanent employees are auto-enrolled and may opt out). Subject to employer superannuation contribution tax.",
      appliesTo: EMP,
      calcType: "percent",
      value: 3,
    },
    {
      key: "acc",
      name: "ACC employer levy (average)",
      description: "Work Account levy funding cover for workplace injuries, set by ACC per industry classification; 1.4% is a planning average.",
      appliesTo: EMP,
      calcType: "percent",
      value: 1.4,
    },
    platform(1),
    compliance(1),
  ],
  Ireland: [
    {
      key: "prsi",
      name: "Employer PRSI",
      description: "Employer Pay Related Social Insurance (Class A) on gross pay. A lower rate applies below a weekly earnings threshold; the standard higher rate is used for planning.",
      appliesTo: EMP,
      calcType: "percent",
      value: 11.05,
    },
    {
      key: "training",
      name: "Training and levies buffer",
      description: "SDP planning allowance for the National Training Fund levy and similar employer levies collected with PRSI.",
      appliesTo: EMP,
      calcType: "percent",
      value: 1,
    },
    platform(1),
    compliance(1.5, "EU compliance buffer", "SDP planning allowance for EU and Irish employment-law compliance work on contractor engagements."),
  ],
  Philippines: [
    {
      key: "sss",
      name: "SSS employer share",
      description: "Employer share of Social Security System contributions, on the monthly salary credit up to the statutory ceiling. Planning rate applied to gross pay; the ceiling is not modelled.",
      appliesTo: EMP,
      calcType: "percent",
      value: 9.5,
    },
    {
      key: "philhealth",
      name: "PhilHealth employer share",
      description: "Employer half of the PhilHealth (National Health Insurance) premium, subject to the income floor and ceiling.",
      appliesTo: EMP,
      calcType: "percent",
      value: 3,
    },
    {
      key: "pagibig",
      name: "Pag-IBIG employer share",
      description: "Employer contribution to the Home Development Mutual Fund (Pag-IBIG), 2% of monthly compensation up to the fund's ceiling.",
      appliesTo: EMP,
      calcType: "percent",
      value: 2,
    },
    {
      key: "thirteenth_month",
      name: "13th-month pay",
      description: "Mandatory 13th-month pay (Presidential Decree 851): one twelfth of the basic salary earned in the calendar year, paid on or before 24 December. Accrued at 8.33% of basic pay.",
      appliesTo: EMP,
      calcType: "percent",
      value: 8.33,
    },
    platform(1.5),
    compliance(1),
  ],
  Japan: [
    {
      key: "social",
      name: "Social insurance (average)",
      description: "Employer share of health insurance, nursing-care insurance, employees' pension insurance and the child-rearing contribution. Rates vary by prefecture and health insurer; 15% of gross pay is a planning average.",
      appliesTo: EMP,
      calcType: "percent",
      value: 15,
    },
    {
      key: "unemployment",
      name: "Employment insurance",
      description: "Employer share of employment (unemployment) insurance at the general-business rate.",
      appliesTo: EMP,
      calcType: "percent",
      value: 0.6,
    },
    platform(1),
    compliance(1.5),
  ],
  Canada: [
    {
      key: "cpp_ei",
      name: "CPP/QPP and EI (average)",
      description: "Employer Canada / Quebec Pension Plan contributions and Employment Insurance premiums (the employer pays 1.4 times the employee EI rate), each up to an annual maximum. 7.5% of pay is a planning average below the maximums.",
      appliesTo: EMP,
      calcType: "percent",
      value: 7.5,
    },
    {
      key: "workers_comp",
      name: "Workers' compensation (average)",
      description: "Provincial workers' compensation board premium, set per industry; 1.5% is a planning average.",
      appliesTo: EMP,
      calcType: "percent",
      value: 1.5,
    },
    platform(1),
    compliance(1, "Provincial compliance buffer", "SDP planning allowance for province-specific employment-standards and tax compliance on contractor engagements."),
  ],
  UK: [
    {
      key: "eni",
      name: "Employer National Insurance",
      description: "Employer Class 1 National Insurance on earnings above the secondary threshold. Planning rate; verify the current rate each tax year.",
      appliesTo: EMP,
      calcType: "percent",
      value: 13.8,
    },
    {
      key: "apprenticeship",
      name: "Apprenticeship Levy",
      description: "0.5% of the annual pay bill for employers whose pay bill exceeds GBP 3 million (an annual allowance offsets part of it). Set inactive for smaller pay bills.",
      appliesTo: EMP,
      calcType: "percent",
      value: 0.5,
    },
    platform(1),
    compliance(1.5),
  ],
  Romania: [
    {
      key: "work_ins",
      name: "Work insurance contribution (CAM)",
      description: "Employer insurance contribution for work (contribuția asiguratorie pentru muncă) on gross salary. Since 2018 the pension and health contributions are borne by the employee.",
      appliesTo: EMP,
      calcType: "percent",
      value: 2.25,
    },
    platform(1),
    compliance(1.5, "EU compliance buffer", "SDP planning allowance for EU and Romanian employment-law compliance work on contractor engagements."),
  ],
  Singapore: [
    {
      key: "cpf",
      name: "CPF employer contribution (age 55 and below)",
      description: "Central Provident Fund employer contribution for Singapore citizens and permanent residents aged 55 and below, on ordinary wages up to the monthly ceiling. Lower rates apply to older workers; no CPF for most foreign work-pass holders.",
      appliesTo: EMP,
      calcType: "percent",
      value: 17,
    },
    {
      key: "sdl",
      name: "Skills Development Levy",
      description: "Levy of 0.25% of monthly remuneration (minimum SGD 2 and maximum SGD 11.25 per employee per month), payable for every employee.",
      appliesTo: EMP,
      calcType: "percent",
      value: 0.25,
    },
    platform(1),
    compliance(1),
  ],
  Malaysia: [
    {
      key: "epf",
      name: "EPF employer contribution",
      description: "Employees Provident Fund employer contribution: 12% for monthly wages above RM 5,000 (13% at or below).",
      appliesTo: EMP,
      calcType: "percent",
      value: 12,
    },
    {
      key: "socso",
      name: "SOCSO",
      description: "Employer contribution to the Social Security Organisation (employment injury and invalidity schemes), on wages up to the insured ceiling.",
      appliesTo: EMP,
      calcType: "percent",
      value: 1.75,
    },
    {
      key: "eis",
      name: "Employment Insurance System",
      description: "Employer contribution to EIS (loss-of-employment protection), on wages up to the ceiling.",
      appliesTo: EMP,
      calcType: "percent",
      value: 0.2,
    },
    {
      key: "hrdf",
      name: "HRD levy (eligible employers)",
      description: "Human Resource Development levy of 1% of monthly wages for employers covered by the HRD Corp scheme (by sector and headcount).",
      appliesTo: EMP,
      calcType: "percent",
      value: 1,
    },
    platform(1.5),
    compliance(1),
  ],
  Vietnam: [
    {
      key: "si",
      name: "Social insurance",
      description: "Employer social insurance contribution (retirement, sickness, maternity, occupational accident and disease) on salary up to 20 times the base salary.",
      appliesTo: EMP,
      calcType: "percent",
      value: 17.5,
    },
    {
      key: "hi",
      name: "Health insurance",
      description: "Employer health insurance contribution on salary up to the cap.",
      appliesTo: EMP,
      calcType: "percent",
      value: 3,
    },
    {
      key: "ui",
      name: "Unemployment insurance",
      description: "Employer unemployment insurance contribution on salary up to 20 times the regional minimum wage.",
      appliesTo: EMP,
      calcType: "percent",
      value: 1,
    },
    {
      key: "union",
      name: "Trade union fee",
      description: "Employer trade union contribution of 2% of the social-insurance salary base, payable whether or not a union is established at the employer.",
      appliesTo: EMP,
      calcType: "percent",
      value: 2,
    },
    platform(1.5),
    compliance(1),
  ],
  India: [
    {
      key: "pf",
      name: "Provident Fund (employer)",
      description: "Employer contribution to the Employees' Provident Fund, 12% of basic pay plus dearness allowance (statutory wage ceiling INR 15,000 per month; many employers contribute on the full basic). Applied to gross pay here as a planning assumption.",
      appliesTo: EMP,
      calcType: "percent",
      value: 12,
    },
    {
      key: "esi",
      name: "ESI (employer)",
      description: "Employer contribution to Employees' State Insurance, 3.25% of gross wages, applicable only to employees earning up to INR 21,000 per month. Set inactive for higher-paid roles.",
      appliesTo: EMP,
      calcType: "percent",
      value: 3.25,
    },
    {
      key: "gratuity",
      name: "Gratuity accrual",
      description: "Provision for gratuity under the Payment of Gratuity Act (15 days' wages per completed year of service, payable after five years); 4.81% of basic pay is the standard accrual.",
      appliesTo: EMP,
      calcType: "percent",
      value: 4.81,
    },
    {
      key: "edli",
      name: "EDLI and PF admin charges",
      description: "Employees' Deposit Linked Insurance (0.5%) and EPF administrative charges (0.5%) on PF wages.",
      appliesTo: EMP,
      calcType: "percent",
      value: 1,
    },
    platform(1.5),
    compliance(1),
  ],
  Brazil: [
    {
      key: "inss",
      name: "INSS employer contribution",
      description: "Employer social security contribution of 20% of the payroll for CLT employees.",
      appliesTo: EMP,
      calcType: "percent",
      value: 20,
    },
    {
      key: "fgts",
      name: "FGTS",
      description: "Monthly deposit of 8% of salary into the employee's Guarantee Fund for Length of Service (Fundo de Garantia do Tempo de Serviço).",
      appliesTo: EMP,
      calcType: "percent",
      value: 8,
    },
    {
      key: "thirteenth",
      name: "13th salary",
      description: "Mandatory 13th salary (one extra month per year, usually paid in two instalments), accrued at one twelfth of pay.",
      appliesTo: EMP,
      calcType: "percent",
      value: 8.33,
    },
    {
      key: "vacation",
      name: "Vacation and one-third bonus",
      description: "Accrual for the paid 30-day vacation and its constitutional one-third bonus; 8.33% of pay is the planning accrual used here.",
      appliesTo: EMP,
      calcType: "percent",
      value: 8.33,
    },
    {
      key: "others",
      name: "RAT and third-party contributions",
      description: "Work-accident insurance (RAT, 1–3% by risk grade) and contributions to third parties (Sistema S, INCRA, salário-educação); 6% is a planning average.",
      appliesTo: EMP,
      calcType: "percent",
      value: 6,
    },
    platform(1.5),
    compliance(2),
  ],
  Pakistan: [
    {
      key: "eobi",
      name: "EOBI (employer)",
      description: "Employer contribution to the Employees' Old-Age Benefits Institution, 5% of the minimum wage per employee; applied to pay here as a planning simplification.",
      appliesTo: EMP,
      calcType: "percent",
      value: 5,
    },
    {
      key: "sessi",
      name: "Provincial social security (SESSI / PESSI)",
      description: "Employer contribution to the provincial employees' social security institution (for example SESSI in Sindh), 6% of wages up to the scheme ceiling.",
      appliesTo: EMP,
      calcType: "percent",
      value: 6,
    },
    {
      key: "wwf",
      name: "Workers' Welfare Fund",
      description: "Contribution to the Workers' Welfare Fund levied on employers of a qualifying size; applied to pay here for planning.",
      appliesTo: EMP,
      calcType: "percent",
      value: 2,
    },
    {
      key: "admin",
      name: "Admin and compliance buffer",
      description: "SDP planning allowance for provincial labour-law compliance and payroll administration.",
      appliesTo: EMP,
      calcType: "percent",
      value: 1.5,
    },
    platform(1.5),
    compliance(1),
  ],
  "Sri Lanka": [
    {
      key: "epf",
      name: "EPF (employer)",
      description: "Employer contribution to the Employees' Provident Fund, 12% of total earnings.",
      appliesTo: EMP,
      calcType: "percent",
      value: 12,
    },
    {
      key: "etf",
      name: "ETF",
      description: "Employer contribution to the Employees' Trust Fund, 3% of total earnings.",
      appliesTo: EMP,
      calcType: "percent",
      value: 3,
    },
    {
      key: "admin",
      name: "Admin and compliance buffer",
      description: "SDP planning allowance for labour-law compliance and payroll administration.",
      appliesTo: EMP,
      calcType: "percent",
      value: 1.5,
    },
    platform(1.5),
    compliance(1),
  ],
  Germany: [
    {
      key: "social_ins",
      name: "Social insurance (average)",
      description: "Employer share of statutory pension, health (including half of the supplementary rate) and long-term care insurance, each up to its contribution ceiling; 19.5% of gross pay is a planning average.",
      appliesTo: EMP,
      calcType: "percent",
      value: 19.5,
    },
    {
      key: "unemployment",
      name: "Unemployment insurance",
      description: "Employer share of statutory unemployment insurance, up to the contribution ceiling.",
      appliesTo: EMP,
      calcType: "percent",
      value: 1.3,
    },
    {
      key: "accident",
      name: "Accident insurance (average)",
      description: "Statutory accident insurance (Berufsgenossenschaft) premium, set per industry; 1.3% is a planning average.",
      appliesTo: EMP,
      calcType: "percent",
      value: 1.3,
    },
    {
      key: "admin",
      name: "Admin and compliance buffer",
      description: "SDP planning allowance for German payroll administration and compliance.",
      appliesTo: EMP,
      calcType: "percent",
      value: 1,
    },
    platform(1),
    compliance(1.5),
  ],
};

/** The seed for a canonical country name, or an empty list. */
export function seedItemsFor(canonicalCountry: string | null | undefined): CostSeedItem[] {
  if (!canonicalCountry) return [];
  return COUNTRY_COST_SEED[canonicalCountry] ?? [];
}
