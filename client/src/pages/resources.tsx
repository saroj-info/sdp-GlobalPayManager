import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/layout/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Calculator, FileText, Download, Edit3, Plus, X, BookOpen, Clock, User, TrendingUp, Shield, Users, Settings, Database } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePersistent } from "../hooks/usePersistent";

// =============================================================
//  Global Total Cost of Employment (TCOE) — SDP
//  Now with: Employment type toggle, jurisdiction selectors (AU/US),
//  state-specific overlays, and improved calculation types.
//  Assumptions are editable and persist in the browser.
// =============================================================

// ---------- Utility helpers ----------
const CURRENCIES = {
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

function fmtCurrency(value: any, currencyCode: any) {
  if (Number.isNaN(value)) return "-";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode || "USD",
      maximumFractionDigits: currencyCode === "VND" ? 0 : 2,
    }).format(value || 0);
  } catch (e) {
    return `${value?.toFixed?.(2) ?? value}`;
  }
}

// ---------- Calculation engine ----------
function calcLine(item: any, base: any) {
  const pct = (b: any, percent: any) => (b * (percent || 0)) / 100;
  switch (item.type) {
    case "percent_with_cap": {
      const appliedBase = Math.min(base, item.capAmount || base);
      return pct(appliedBase, item.value);
    }
    case "percent_above_threshold": {
      const taxable = Math.max(0, base - (item.thresholdAmount || 0));
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

function sum(arr: any) {
  return arr.reduce((a: any, b: any) => a + (Number.isFinite(b) ? b : 0), 0);
}

// ---------- Country-level default assumptions ----------
// IMPORTANT: These are illustrative defaults for planning only. Statutory rates change and may vary by state/province, industry, seniority, age, wage caps etc.
// Always validate against current rules. You can edit all values in the UI.
const DEFAULT_EMPLOYEE = {
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

// Contractor baseline (generic, editable). Local law may treat some "contractors" as employees — use COR/EOR guidance.
const DEFAULT_CONTRACTOR = {
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

const COUNTRIES = [
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

// ---------- Jurisdiction overlays (examples + editable) ----------
// These override/augment the country defaults when selected.
const DEFAULT_JURISDICTIONS = {
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
    "California": [
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
    "Washington": [
      { id: "wa_suta", name: "WA UI (SUTA)", type: "percent_with_cap", value: 1.2, capAmount: 68000, note: "Wage base much higher; illustrative" },
    ],
  },
};

// ---------- Country narratives ----------
const COUNTRY_NOTES = {
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

function EmploymentCostCalculator() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [employmentType, setEmploymentType] = usePersistent("tcoe_employment_type", "Employee");
  const [country, setCountry] = usePersistent("tcoe_country", "Australia");
  const [salary, setSalary] = usePersistent("tcoe_salary", 120000);
  const [assumptionsEmployee, setAssumptionsEmployee] = usePersistent("tcoe_emp_defaults_v2", DEFAULT_EMPLOYEE);
  const [assumptionsContractor, setAssumptionsContractor] = usePersistent("tcoe_con_defaults_v1", DEFAULT_CONTRACTOR);
  // Fetch jurisdiction data from database instead of hardcoded constants - NOTE: Now using layout context for authenticated users
  const { data: countriesData = [] } = useQuery<any[]>({
    queryKey: ['/api/countries'],
  });
  const countries = countriesData; // Keep for calculator compatibility

  const { data: dbJurisdictions, isLoading: isLoadingJurisdictions } = useQuery({
    queryKey: ['/api/jurisdictions/all'],
    queryFn: async () => {
      const response = await fetch('/api/jurisdictions/all');
      if (!response.ok) {
        throw new Error('Failed to fetch jurisdiction data');
      }
      return response.json();
    },
  });

  // Transform database data to match expected format
  const transformedJurisdictions = useMemo(() => {
    if (!dbJurisdictions) return DEFAULT_JURISDICTIONS;
    
    const transformed: any = {};
    dbJurisdictions.forEach((jurisdiction: any) => {
      if (!transformed[jurisdiction.countryId]) {
        transformed[jurisdiction.countryId] = {};
      }
      if (!transformed[jurisdiction.countryId][jurisdiction.stateProvince]) {
        transformed[jurisdiction.countryId][jurisdiction.stateProvince] = [];
      }
      transformed[jurisdiction.countryId][jurisdiction.stateProvince].push({
        id: jurisdiction.id,
        name: jurisdiction.name,
        type: jurisdiction.calculationType,
        value: jurisdiction.value,
        capAmount: jurisdiction.capAmount,
        thresholdAmount: jurisdiction.thresholdAmount,
        note: jurisdiction.note
      });
    });
    return transformed;
  }, [dbJurisdictions]);

  const [jurisdictions, setJurisdictions] = useState(transformedJurisdictions);
  const [jurisdictionKey, setJurisdictionKey] = usePersistent("tcoe_selected_juris", { Australia: "New South Wales", USA: "California" });
  const [showEditor, setShowEditor] = useState(false);
  const [editScope, setEditScope] = useState({ level: "country" }); // { level: 'country' | 'jurisdiction', name?: string }

  // Update jurisdictions when database data changes
  useEffect(() => {
    if (transformedJurisdictions) {
      setJurisdictions(transformedJurisdictions);
    }
  }, [transformedJurisdictions]);
  
  // Check if user has permission to edit assumptions (SDP admin/super admin only)
  const canEditAssumptions = (user as any)?.userType === 'sdp_internal' && 
    ((user as any)?.sdpRole === 'sdp_admin' || (user as any)?.sdpRole === 'sdp_super_admin');

  // Check if user has permission to edit jurisdiction data (SDP super admin only)
  const canEditJurisdictions = (user as any)?.userType === 'sdp_internal' && (user as any)?.sdpRole === 'sdp_super_admin';

  const currency = (CURRENCIES as any)[country]?.code || "USD";

  const baseLines = employmentType === "Employee" ? (assumptionsEmployee[country] || []) : (assumptionsContractor[country] || []);
  const jurisOptions = jurisdictions[country] ? Object.keys(jurisdictions[country]) : [];
  const activeJurisName = jurisOptions.includes(jurisdictionKey[country]) ? jurisdictionKey[country] : undefined;
  const jurisLines = activeJurisName ? (jurisdictions[country]?.[activeJurisName] || []) : [];

  // merge: country base + jurisdiction overlay
  const mergedLines = useMemo(() => {
    // If IDs collide, jurisdiction overrides base by replacing same id, else appended.
    const map = new Map();
    baseLines.forEach((l: any) => map.set(l.id, { ...l }));
    jurisLines.forEach((l: any) => map.set(l.id, { ...l }));
    return Array.from(map.values());
  }, [baseLines, jurisLines]);

  const { oncostTotal, totalCost, oncostPct, breakdown } = useMemo(() => {
    const items = mergedLines.map((it) => ({
      ...it,
      amount: calcLine(it, Number(salary) || 0),
    }));
    const oncost = sum(items.map((i) => i.amount));
    const total = (Number(salary) || 0) + oncost;
    const pct = (oncost / (Number(salary) || 1)) * 100;
    return { oncostTotal: oncost, totalCost: total, oncostPct: pct, breakdown: items };
  }, [mergedLines, salary]);

  function updateLine(scope: any, id: any, patch: any) {
    if (scope === "country") {
      if (employmentType === "Employee") {
        setAssumptionsEmployee((prev: any) => ({
          ...prev,
          [country]: (prev[country] || []).map((l: any) => (l.id === id ? { ...l, ...patch } : l)),
        }));
      } else {
        setAssumptionsContractor((prev: any) => ({
          ...prev,
          [country]: (prev[country] || []).map((l: any) => (l.id === id ? { ...l, ...patch } : l)),
        }));
      }
    } else if (scope === "jurisdiction" && activeJurisName) {
      setJurisdictions((prev: any) => ({
        ...prev,
        [country]: {
          ...((prev as any)[country] || {}),
          [activeJurisName]: ((prev as any)[country]?.[activeJurisName] || []).map((l: any) => (l.id === id ? { ...l, ...patch } : l)),
        },
      }));
    }
  }

  function addLine(scope: any) {
    const id = "custom_" + Math.random().toString(36).slice(2, 8);
    const newLine = { id, name: "Custom item", type: "percent", value: 1, note: "Editable" };
    if (scope === "country") {
      if (employmentType === "Employee") {
        setAssumptionsEmployee((prev: any) => ({ ...prev, [country]: [...(prev[country] || []), newLine] }));
      } else {
        setAssumptionsContractor((prev: any) => ({ ...prev, [country]: [...(prev[country] || []), newLine] }));
      }
    } else if (scope === "jurisdiction" && activeJurisName) {
      setJurisdictions((prev: any) => ({
        ...prev,
        [country]: {
          ...((prev as any)[country] || {}),
          [activeJurisName]: [...((prev as any)[country]?.[activeJurisName] || []), newLine],
        },
      }));
    }
  }

  function removeLine(scope: any, id: any) {
    if (scope === "country") {
      if (employmentType === "Employee") {
        setAssumptionsEmployee((prev: any) => ({
          ...prev,
          [country]: (prev[country] || []).filter((l: any) => l.id !== id),
        }));
      } else {
        setAssumptionsContractor((prev: any) => ({
          ...prev,
          [country]: (prev[country] || []).filter((l: any) => l.id !== id),
        }));
      }
    } else if (scope === "jurisdiction" && activeJurisName) {
      setJurisdictions((prev: any) => ({
        ...prev,
        [country]: {
          ...((prev as any)[country] || {}),
          [activeJurisName]: ((prev as any)[country]?.[activeJurisName] || []).filter((l: any) => l.id !== id),
        },
      }));
    }
  }

  function resetDefaults(scope: any) {
    if (scope === "country") {
      if (employmentType === "Employee") {
        setAssumptionsEmployee((prev: any) => ({ ...prev, [country]: (DEFAULT_EMPLOYEE as any)[country] }));
      } else {
        setAssumptionsContractor((prev: any) => ({ ...prev, [country]: (DEFAULT_CONTRACTOR as any)[country] || [] }));
      }
    } else if (scope === "jurisdiction" && activeJurisName) {
      setJurisdictions((prev: any) => ({
        ...prev,
        [country]: {
          ...((prev as any)[country] || {}),
          [activeJurisName]: (DEFAULT_JURISDICTIONS as any)[country]?.[activeJurisName] || [],
        },
      }));
    }
  }

  function exportCSV() {
    const rows = [
      ["Employment type", employmentType],
      ["Country", country],
      ["Jurisdiction", activeJurisName || "(none)"],
      ["Currency", currency],
      ["Base Salary", (Number(salary) || 0).toString()],
      [],
      ["Item", "Scope", "Type", "Rate/Value", "Cap", "Threshold", "Amount"],
      ...breakdown.map((b) => [
        b.name,
        jurisLines.find((j: any) => j.id === b.id) ? "Jurisdiction" : "Country",
        b.type,
        b.type === "flat" ? b.value : `${b.value}%`,
        b.capAmount ? fmtCurrency(b.capAmount, currency) : "",
        b.thresholdAmount ? fmtCurrency(b.thresholdAmount, currency) : "",
        fmtCurrency(b.amount, currency),
      ]),
      [],
      ["On‑cost total", "", "", "", "", "", fmtCurrency(oncostTotal, currency)],
      ["Total employer cost", "", "", "", "", "", fmtCurrency(totalCost, currency)],
      ["On‑cost % of salary", "", "", "", "", "", oncostPct.toFixed(2) + "%"],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TCOE_${employmentType}_${country}_${activeJurisName || "NA"}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-gradient-to-br from-primary-50 via-white to-accent-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <Calculator className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-secondary-900">Total Cost of Employment Calculator</h1>
              <p className="text-secondary-600 mt-1">Calculate employer on-costs across 17 countries with state/province specific rates</p>
            </div>
          </div>
          <Card className="border-secondary-200 bg-white/80 backdrop-blur">
            <CardContent className="p-4">
              <p className="text-sm text-secondary-600 mb-2">
                Select employment type, country (and jurisdiction if available), then enter the annual base salary to estimate employer on‑costs. 
                Assumptions are editable and persist locally.
              </p>
              <p className="text-xs text-secondary-500">
                <strong>Disclaimer:</strong> Planning tool only. Laws change; state/province rates, thresholds and wage caps vary. Validate before making decisions.
              </p>
            </CardContent>
          </Card>
        </header>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Employment Type</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                {(["Employee", "Contractor"]).map((t) => (
                  <Button
                    key={t}
                    variant={employmentType === t ? "default" : "outline"}
                    className={`flex-1 ${employmentType === t ? "bg-primary-600 hover:bg-primary-700" : ""}`}
                    onClick={() => setEmploymentType(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Country</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <select
                className="w-full rounded-lg border border-secondary-300 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Jurisdiction</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <select
                className="w-full rounded-lg border border-secondary-300 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                value={activeJurisName || ""}
                onChange={(e) => setJurisdictionKey({ ...jurisdictionKey, [country]: e.target.value })}
                disabled={!jurisOptions.length}
              >
                {jurisOptions.length ? (
                  jurisOptions.map((j) => <option key={j} value={j}>{j}</option>)
                ) : (
                  <option value="">(none available)</option>
                )}
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Annual Base Salary</CardTitle>
              <CardDescription className="text-xs">{(CURRENCIES as any)[country]?.symbol}{(CURRENCIES as any)[country]?.code}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <input
                type="number"
                min={0}
                step="1000"
                className="w-full rounded-lg border border-secondary-300 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={salary}
                onChange={(e) => setSalary(e.target.value === '' ? 0 : Number(e.target.value))}
                data-testid="input-salary"
              />
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          {canEditAssumptions && (
            <>
              <Button
                onClick={() => { setEditScope({ level: "country" }); setShowEditor(true); }}
                className="bg-primary-600 hover:bg-primary-700"
                data-testid="button-edit-country"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Country Assumptions
              </Button>
              <Button
                variant="outline"
                onClick={() => { setEditScope({ level: "jurisdiction" }); setShowEditor(true); }}
                disabled={!activeJurisName}
                title={activeJurisName ? "" : "Select a jurisdiction first"}
                data-testid="button-edit-jurisdiction"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Jurisdiction Overlay
              </Button>
            </>
          )}
          {canEditJurisdictions && (
            <Button
              variant="outline"
              onClick={() => {
                setLocation('/admin');
                setTimeout(() => {
                  const tabTrigger = document.querySelector('[value="jurisdiction-data"]');
                  if (tabTrigger) {
                    (tabTrigger as HTMLElement).click();
                  }
                }, 200);
              }}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
              data-testid="button-edit-jurisdiction-data"
            >
              <Database className="w-4 h-4 mr-2" />
              Edit Jurisdiction Data
            </Button>
          )}
          <Button
            variant="outline"
            onClick={exportCSV}
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Results Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-secondary-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-secondary-600">Base Salary</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-secondary-900">{fmtCurrency(Number(salary) || 0, currency)}</div>
            </CardContent>
          </Card>
          <Card className="border-accent-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-accent-600">On‑cost Total</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-accent-700">{fmtCurrency(oncostTotal, currency)}</div>
            </CardContent>
          </Card>
          <Card className="border-primary-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-primary-600">Total Employer Cost</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-primary-700">{fmtCurrency(totalCost, currency)}</div>
              <div className="text-xs text-secondary-500 mt-1">On‑costs = {oncostPct.toFixed(1)}% of salary</div>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary-50 text-secondary-700">
                  <tr>
                    <th className="text-left p-4 font-medium">Item</th>
                    <th className="text-left p-4 font-medium">Scope</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-right p-4 font-medium">Rate/Value</th>
                    <th className="text-right p-4 font-medium">Cap</th>
                    <th className="text-right p-4 font-medium">Threshold</th>
                    <th className="text-right p-4 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((b) => (
                    <tr key={b.id} className="border-t border-secondary-100 hover:bg-secondary-25">
                      <td className="p-4">
                        <div className="font-medium text-secondary-900">{b.name}</div>
                        {b.note && <div className="text-xs text-secondary-500 mt-1">{b.note}</div>}
                      </td>
                      <td className="p-4 text-secondary-600">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          jurisLines.find((j: any) => j.id === b.id) 
                            ? "bg-accent-100 text-accent-700" 
                            : "bg-primary-100 text-primary-700"
                        }`}>
                          {jurisLines.find((j: any) => j.id === b.id) ? "Jurisdiction" : "Country"}
                        </span>
                      </td>
                      <td className="p-4 text-secondary-600 capitalize">{b.type.replaceAll("_", " ")}</td>
                      <td className="p-4 text-right font-medium">{b.type === "flat" ? fmtCurrency(b.value, currency) : `${b.value}%`}</td>
                      <td className="p-4 text-right">{b.capAmount ? fmtCurrency(b.capAmount, currency) : "—"}</td>
                      <td className="p-4 text-right">{b.thresholdAmount ? fmtCurrency(b.thresholdAmount, currency) : "—"}</td>
                      <td className="p-4 text-right font-bold text-secondary-900">{fmtCurrency(b.amount, currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-accent-50 border-t border-accent-200">
                    <td className="p-4 font-bold text-accent-900" colSpan={6}>On‑cost Total</td>
                    <td className="p-4 text-right font-bold text-accent-900">{fmtCurrency(oncostTotal, currency)}</td>
                  </tr>
                  <tr className="bg-primary-50 border-t border-primary-200">
                    <td className="p-4 font-bold text-primary-900" colSpan={6}>Total Employer Cost</td>
                    <td className="p-4 text-right font-bold text-primary-900">{fmtCurrency(totalCost, currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Country Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>Country Info & Employment Notes — {country}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-line text-secondary-700 leading-relaxed">
              {(COUNTRY_NOTES as any)[country]}
            </div>
          </CardContent>
        </Card>

        {/* Editor Modal */}
        {showEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditor(false)} />
            <div className="relative max-w-5xl w-full max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-secondary-200">
              <div className="flex items-center justify-between p-6 border-b border-secondary-200">
                <h3 className="text-xl font-bold">
                  {editScope.level === "country" ? (
                    <>Edit {employmentType.toLowerCase()} assumptions — {country}</>
                  ) : (
                    <>Edit jurisdiction overlay — {country}{activeJurisName ? ` / ${activeJurisName}` : ""}</>
                  )}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowEditor(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {(editScope.level === "country" ? baseLines : jurisLines).map((l: any) => (
                  <Card key={l.id} className="border border-secondary-200">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-12 md:col-span-5">
                          <label className="block text-xs font-medium mb-1">Name</label>
                          <input
                            className="w-full rounded-lg border border-secondary-300 p-2 text-sm"
                            value={l.name}
                            onChange={(e) => updateLine(editScope.level, l.id, { name: e.target.value })}
                          />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <label className="block text-xs font-medium mb-1">Type</label>
                          <select
                            className="w-full rounded-lg border border-secondary-300 p-2 text-sm"
                            value={l.type}
                            onChange={(e) => updateLine(editScope.level, l.id, { type: e.target.value })}
                          >
                            <option value="percent">Percent</option>
                            <option value="percent_with_cap">Percent with Cap</option>
                            <option value="percent_above_threshold">Percent above Threshold</option>
                            <option value="flat">Flat Amount</option>
                          </select>
                        </div>
                        <div className="col-span-6 md:col-span-2">
                          <label className="block text-xs font-medium mb-1">Rate / Value</label>
                          <input
                            type="number"
                            className="w-full rounded-lg border border-secondary-300 p-2 text-sm text-right"
                            value={l.value}
                            onChange={(e) => updateLine(editScope.level, l.id, { value: Number(e.target.value) })}
                          />
                        </div>
                        <div className="col-span-6 md:col-span-2">
                          <label className="block text-xs font-medium mb-1">Cap (annual)</label>
                          <input
                            type="number"
                            className="w-full rounded-lg border border-secondary-300 p-2 text-sm text-right"
                            value={l.capAmount || ""}
                            onChange={(e) => updateLine(editScope.level, l.id, { capAmount: e.target.value ? Number(e.target.value) : undefined })}
                          />
                        </div>
                        <div className="col-span-6 md:col-span-2">
                          <label className="block text-xs font-medium mb-1">Threshold (annual)</label>
                          <input
                            type="number"
                            className="w-full rounded-lg border border-secondary-300 p-2 text-sm text-right"
                            value={l.thresholdAmount || ""}
                            onChange={(e) => updateLine(editScope.level, l.id, { thresholdAmount: e.target.value ? Number(e.target.value) : undefined })}
                          />
                        </div>
                        <div className="col-span-12">
                          <label className="block text-xs font-medium mb-1">Note</label>
                          <input
                            className="w-full rounded-lg border border-secondary-300 p-2 text-sm"
                            value={l.note || ""}
                            onChange={(e) => updateLine(editScope.level, l.id, { note: e.target.value })}
                          />
                        </div>
                        <div className="col-span-12 flex items-center justify-between pt-2 border-t border-secondary-100">
                          <div className="text-xs text-secondary-500">
                            Amount at current salary: <span className="font-medium text-secondary-700">{fmtCurrency(calcLine(l, Number(salary) || 0), currency)}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeLine(editScope.level, l.id)} className="text-red-600 hover:text-red-700">
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="p-6 border-t border-secondary-200 flex items-center justify-between">
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => addLine(editScope.level)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                  <Button variant="outline" onClick={() => resetDefaults(editScope.level)}>
                    Reset to Defaults
                  </Button>
                </div>
                <Button onClick={() => setShowEditor(false)} className="bg-primary-600 hover:bg-primary-700">
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Resources() {
  const { isAuthenticated } = useAuth();
  
  // Fetch countries for authenticated header
  const { data: countries = [] } = useQuery({
    queryKey: ["/api/countries"],
    enabled: isAuthenticated,
  });

  // Public layout for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="">
          <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-6">Resources</h1>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            Powerful tools and resources to help you navigate global employment and contracting decisions with confidence.
          </p>
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Cost Calculator - Featured */}
          <Card className="lg:col-span-2 border-primary-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calculator className="w-8 h-8 text-primary-600" />
              </div>
              <CardTitle className="text-2xl text-primary-600">Cost of Employment Calculator</CardTitle>
              <CardDescription className="text-lg">
                Calculate the true cost of hiring across 17 countries with jurisdiction-specific rates and regulations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">17</div>
                  <div className="text-sm text-secondary-600">Countries</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-600">50+</div>
                  <div className="text-sm text-secondary-600">Jurisdictions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary-600">Real-time</div>
                  <div className="text-sm text-secondary-600">Calculations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">Editable</div>
                  <div className="text-sm text-secondary-600">Assumptions</div>
                </div>
              </div>
              <p className="text-secondary-600 mb-4">
                Our comprehensive calculator includes country-specific employment costs, state/province overlays, 
                and employer on-costs for both employees and contractors. All assumptions are fully editable and 
                calculations persist locally.
              </p>
            </CardContent>
          </Card>

          {/* Additional Resources */}
          <div className="space-y-6">
            <Card 
              className="border-accent-200 shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
              onClick={() => window.location.href = '/country-guides'}
            >
              <CardHeader>
                <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-accent-200 transition-colors">
                  <FileText className="w-6 h-6 text-accent-600" />
                </div>
                <CardTitle className="text-accent-600 group-hover:text-accent-700 transition-colors">Country Guides</CardTitle>
                <CardDescription>
                  Detailed employment guides for each jurisdiction covering legal requirements, benefits, and compliance for 17 countries.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-secondary-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center mb-3">
                  <Download className="w-6 h-6 text-secondary-600" />
                </div>
                <CardTitle className="text-secondary-600">Export Tools</CardTitle>
                <CardDescription>
                  Export your calculations to CSV for financial planning and share with your finance team.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>


        </div>

        {/* Cost Calculator Component */}
        <EmploymentCostCalculator />

        {/* Blog and Articles Section */}
        <div className="mt-16 mb-16">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-accent-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-secondary-900">Blog & Articles</h2>
            </div>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              Expert insights on global employment, payroll compliance, and international hiring strategies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Global Talent Article */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/attached-assets/Global_talent_acquisition_illustration_c1b45844.png?v=5" 
                  alt="Global talent acquisition" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Global Talent
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 text-secondary-900">Global Talent Advantage</h3>
                <div className="flex items-center gap-2 mb-3 text-sm text-secondary-500">
                  <Clock className="w-4 h-4" />
                  <span>5 min read</span>
                  <User className="w-4 h-4 ml-2" />
                  <span>SDP Experts</span>
                </div>
                <p className="text-secondary-600 mb-4 leading-relaxed text-sm">
                  Discover why smart companies are tapping into global talent pools and how SDP Global Pay makes international hiring seamless, compliant, and cost-effective.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => alert('Coming soon: Learn how companies are accessing global talent pools to solve skill shortages and drive growth through international hiring.')}
                >
                  Read Article
                </Button>
              </CardContent>
            </Card>

            {/* Compliance Article */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/attached-assets/Payroll_compliance_and_trust_364fce56.png?v=2" 
                  alt="Payroll compliance and trust" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Compliance
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 text-secondary-900">Payroll Compliance Trust</h3>
                <div className="flex items-center gap-2 mb-3 text-sm text-secondary-500">
                  <Clock className="w-4 h-4" />
                  <span>6 min read</span>
                  <User className="w-4 h-4 ml-2" />
                  <span>Compliance Team</span>
                </div>
                <p className="text-secondary-600 mb-4 leading-relaxed text-sm">
                  Explore why payroll accuracy and employment compliance are fundamental to maintaining trust with employees, contractors, and regulatory authorities.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => alert('Coming soon: Learn how companies are accessing global talent pools to solve skill shortages and drive growth through international hiring.')}
                >
                  Read Article
                </Button>
              </CardContent>
            </Card>

            {/* Misclassification Article */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/attached-assets/Employee_contractor_classification_risks_ee95c6c8.png?v=2" 
                  alt="Employee contractor classification" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Classification
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 text-secondary-900">Misclassification Risks</h3>
                <div className="flex items-center gap-2 mb-3 text-sm text-secondary-500">
                  <Clock className="w-4 h-4" />
                  <span>7 min read</span>
                  <User className="w-4 h-4 ml-2" />
                  <span>Legal Experts</span>
                </div>
                <p className="text-secondary-600 mb-4 leading-relaxed text-sm">
                  Understanding the critical differences between employees and contractors, and the severe consequences of misclassification for businesses.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => alert('Coming soon: Learn how companies are accessing global talent pools to solve skill shortages and drive growth through international hiring.')}
                >
                  Read Article
                </Button>
              </CardContent>
            </Card>

            {/* Payroll Data Article */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/attached-assets/HR_data_analytics_insights_80139ab9.png?v=2" 
                  alt="HR data analytics insights" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Data Insights
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 text-secondary-900">Hidden Data Value</h3>
                <div className="flex items-center gap-2 mb-3 text-sm text-secondary-500">
                  <Clock className="w-4 h-4" />
                  <span>5 min read</span>
                  <User className="w-4 h-4 ml-2" />
                  <span>Data Analytics</span>
                </div>
                <p className="text-secondary-600 mb-4 leading-relaxed text-sm">
                  Discover how payroll and HR data can drive strategic business decisions, improve employee retention, and optimize costs.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => alert('Coming soon: Learn how companies are accessing global talent pools to solve skill shortages and drive growth through international hiring.')}
                >
                  Read Article
                </Button>
              </CardContent>
            </Card>

            {/* Outsourcing Article */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/attached-assets/Payroll_outsourcing_efficiency_illustration_716cbb7a.png?v=2" 
                  alt="Payroll outsourcing efficiency" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Outsourcing
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 text-secondary-900">Payroll Outsourcing Benefits</h3>
                <div className="flex items-center gap-2 mb-3 text-sm text-secondary-500">
                  <Clock className="w-4 h-4" />
                  <span>6 min read</span>
                  <User className="w-4 h-4 ml-2" />
                  <span>Operations Team</span>
                </div>
                <p className="text-secondary-600 mb-4 leading-relaxed text-sm">
                  Learn why successful businesses choose to outsource payroll operations and how it drives efficiency, reduces risk, and enables growth.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => alert('Coming soon: Learn how companies are accessing global talent pools to solve skill shortages and drive growth through international hiring.')}
                >
                  Read Article
                </Button>
              </CardContent>
            </Card>

            {/* Recruitment Expansion Article */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/attached-assets/Recruitment_global_expansion_services_a5132be3.png?v=2" 
                  alt="Recruitment global expansion" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Recruitment
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 text-secondary-900">Recruitment Global Expansion</h3>
                <div className="flex items-center gap-2 mb-3 text-sm text-secondary-500">
                  <Clock className="w-4 h-4" />
                  <span>8 min read</span>
                  <User className="w-4 h-4 ml-2" />
                  <span>Partnership Team</span>
                </div>
                <p className="text-secondary-600 mb-4 leading-relaxed text-sm">
                  Discover how recruitment agencies can leverage SDP Global Pay to expand beyond their home country and unlock international opportunities.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => alert('Coming soon: Learn how companies are accessing global talent pools to solve skill shortages and drive growth through international hiring.')}
                >
                  Read Article
                </Button>
              </CardContent>
            </Card>
          </div>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated layout with sidebar and header (resources is not in AuthenticatedLayout wrapper)
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Resources" 
          description="Powerful tools and resources to help you navigate global employment and contracting decisions with confidence."
          accessibleCountries={countries}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8">
            {/* Resources Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Cost Calculator - Featured */}
          <Card className="lg:col-span-2 border-primary-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calculator className="w-8 h-8 text-primary-600" />
              </div>
              <CardTitle className="text-2xl text-primary-600">Cost of Employment Calculator</CardTitle>
              <CardDescription className="text-lg">
                Calculate the true cost of hiring across 17 countries with jurisdiction-specific rates and regulations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">17</div>
                  <div className="text-sm text-secondary-600">Countries</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-600">50+</div>
                  <div className="text-sm text-secondary-600">Jurisdictions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary-600">Real-time</div>
                  <div className="text-sm text-secondary-600">Calculations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">Editable</div>
                  <div className="text-sm text-secondary-600">Assumptions</div>
                </div>
              </div>
              <p className="text-secondary-600 mb-4">
                Our comprehensive calculator includes country-specific employment costs, state/province overlays, 
                and employer on-costs for both employees and contractors. All assumptions are fully editable and 
                calculations persist locally.
              </p>
            </CardContent>
          </Card>

          {/* Additional Resources */}
          <div className="space-y-6">
            <Card 
              className="border-accent-200 shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
              onClick={() => window.location.href = '/country-guides'}
            >
              <CardHeader>
                <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-accent-200 transition-colors">
                  <FileText className="w-6 h-6 text-accent-600" />
                </div>
                <CardTitle className="text-accent-600 group-hover:text-accent-700 transition-colors">Country Guides</CardTitle>
                <CardDescription>
                  Detailed employment guides for each jurisdiction covering legal requirements, benefits, and compliance for 17 countries.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-secondary-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center mb-3">
                  <Download className="w-6 h-6 text-secondary-600" />
                </div>
                <CardTitle className="text-secondary-600">Export Tools</CardTitle>
                <CardDescription>
                  Export your calculations to CSV for financial planning and share with your finance team.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Cost Calculator Component */}
        <EmploymentCostCalculator />

        {/* Blog and Articles Section */}
        <div className="mt-16 mb-16">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-accent-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-secondary-900">Blog & Articles</h2>
            </div>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              Expert insights on global employment, payroll compliance, and international hiring strategies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Global Talent Article */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/attached-assets/Global_talent_acquisition_illustration_c1b45844.png?v=5" 
                  alt="Global talent acquisition" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Global Talent
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 text-secondary-900">Global Talent Advantage</h3>
                <div className="flex items-center gap-2 mb-3 text-sm text-secondary-500">
                  <Clock className="w-4 h-4" />
                  <span>5 min read</span>
                  <User className="w-4 h-4 ml-2" />
                  <span>SDP Experts</span>
                </div>
                <p className="text-secondary-600 mb-4 leading-relaxed text-sm">
                  Discover why smart companies are tapping into global talent pools and how SDP Global Pay makes international hiring seamless, compliant, and cost-effective.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => alert('Coming soon: Learn how companies are accessing global talent pools to solve skill shortages and drive growth through international hiring.')}
                >
                  Read Article
                </Button>
              </CardContent>
            </Card>

            {/* Compliance Article */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/attached-assets/Payroll_compliance_and_trust_364fce56.png?v=2" 
                  alt="Payroll compliance and trust" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Compliance
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 text-secondary-900">Payroll Compliance Trust</h3>
                <div className="flex items-center gap-2 mb-3 text-sm text-secondary-500">
                  <Clock className="w-4 h-4" />
                  <span>6 min read</span>
                  <User className="w-4 h-4 ml-2" />
                  <span>Compliance Team</span>
                </div>
                <p className="text-secondary-600 mb-4 leading-relaxed text-sm">
                  Explore why payroll accuracy and employment compliance are fundamental to maintaining trust with employees, contractors, and regulatory authorities.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => alert('Coming soon: Learn how companies are accessing global talent pools to solve skill shortages and drive growth through international hiring.')}
                >
                  Read Article
                </Button>
              </CardContent>
            </Card>

            {/* Misclassification Article */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/attached-assets/Employee_contractor_classification_risks_ee95c6c8.png?v=2" 
                  alt="Employee contractor classification" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Classification
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 text-secondary-900">Misclassification Risks</h3>
                <div className="flex items-center gap-2 mb-3 text-sm text-secondary-500">
                  <Clock className="w-4 h-4" />
                  <span>7 min read</span>
                  <User className="w-4 h-4 ml-2" />
                  <span>Legal Experts</span>
                </div>
                <p className="text-secondary-600 mb-4 leading-relaxed text-sm">
                  Understanding the critical differences between employees and contractors, and the severe consequences of misclassification for businesses.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => alert('Coming soon: Learn how companies are accessing global talent pools to solve skill shortages and drive growth through international hiring.')}
                >
                  Read Article
                </Button>
              </CardContent>
            </Card>

            {/* Payroll Data Article */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/attached-assets/HR_data_analytics_insights_80139ab9.png?v=2" 
                  alt="HR data analytics insights" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Data Insights
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 text-secondary-900">Hidden Data Value</h3>
                <div className="flex items-center gap-2 mb-3 text-sm text-secondary-500">
                  <Clock className="w-4 h-4" />
                  <span>5 min read</span>
                  <User className="w-4 h-4 ml-2" />
                  <span>Data Analytics</span>
                </div>
                <p className="text-secondary-600 mb-4 leading-relaxed text-sm">
                  Discover how payroll and HR data can drive strategic business decisions, improve employee retention, and optimize costs.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => alert('Coming soon: Learn how companies are accessing global talent pools to solve skill shortages and drive growth through international hiring.')}
                >
                  Read Article
                </Button>
              </CardContent>
            </Card>

            {/* Outsourcing Article */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/attached-assets/Payroll_outsourcing_efficiency_illustration_716cbb7a.png?v=2" 
                  alt="Payroll outsourcing efficiency" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Outsourcing
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 text-secondary-900">Payroll Outsourcing Benefits</h3>
                <div className="flex items-center gap-2 mb-3 text-sm text-secondary-500">
                  <Clock className="w-4 h-4" />
                  <span>6 min read</span>
                  <User className="w-4 h-4 ml-2" />
                  <span>Operations Team</span>
                </div>
                <p className="text-secondary-600 mb-4 leading-relaxed text-sm">
                  Learn why successful businesses choose to outsource payroll operations and how it drives efficiency, reduces risk, and enables growth.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => alert('Coming soon: Learn how companies are accessing global talent pools to solve skill shortages and drive growth through international hiring.')}
                >
                  Read Article
                </Button>
              </CardContent>
            </Card>

            {/* Recruitment Expansion Article */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/attached-assets/Recruitment_global_expansion_services_a5132be3.png?v=2" 
                  alt="Recruitment global expansion" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Recruitment
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 text-secondary-900">Recruitment Global Expansion</h3>
                <div className="flex items-center gap-2 mb-3 text-sm text-secondary-500">
                  <Clock className="w-4 h-4" />
                  <span>8 min read</span>
                  <User className="w-4 h-4 ml-2" />
                  <span>Partnership Team</span>
                </div>
                <p className="text-secondary-600 mb-4 leading-relaxed text-sm">
                  Discover how recruitment agencies can leverage SDP Global Pay to expand beyond their home country and unlock international opportunities.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => alert('Coming soon: Learn how companies are accessing global talent pools to solve skill shortages and drive growth through international hiring.')}
                >
                  Read Article
                </Button>
              </CardContent>
            </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}