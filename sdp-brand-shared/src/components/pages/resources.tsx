import { useMemo, useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Calculator, FileText, Download, BookOpen, Clock, User } from "lucide-react";
import { formatCurrency, CURRENCIES } from "../../lib/utils";

// =============================================================
//  Global Total Cost of Employment (TCOE) — SDP
//  Now with: Employment type toggle, jurisdiction selectors,
//  state-specific overlays, and improved calculation types.
//  Assumptions are editable and persist in the browser.
// =============================================================

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

function usePersistent(key: any, fallback: any) {
  const [val, setVal] = useState(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(val));
  }, [key, val]);
  return [val, setVal];
}

// ---------- Country-level default assumptions ----------
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

// Contractor baseline (generic, editable)
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
  "Australia", "USA", "New Zealand", "Ireland", "Philippines", "Japan", 
  "Canada", "UK", "Romania", "Singapore", "Malaysia", "Vietnam", 
  "India", "Brazil", "Pakistan", "Sri Lanka", "Germany",
];

// ---------- Jurisdiction overlays (examples + editable) ----------
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

function EmploymentCostCalculator() {
  const [employmentType, setEmploymentType] = usePersistent("tcoe_employment_type", "Employee");
  const [country, setCountry] = usePersistent("tcoe_country", "Australia");
  const [salary, setSalary] = usePersistent("tcoe_salary", 120000);
  const [assumptionsEmployee] = usePersistent("tcoe_emp_defaults_v2", DEFAULT_EMPLOYEE);
  const [assumptionsContractor] = usePersistent("tcoe_con_defaults_v1", DEFAULT_CONTRACTOR);
  const [jurisdictions] = usePersistent("tcoe_juris_v1", DEFAULT_JURISDICTIONS);
  const [jurisdictionKey, setJurisdictionKey] = usePersistent("tcoe_selected_juris", { Australia: "New South Wales", USA: "California" });

  const currency = (CURRENCIES as any)[country]?.code || "USD";
  const baseLines = employmentType === "Employee" ? (assumptionsEmployee[country] || []) : (assumptionsContractor[country] || []);
  const jurisOptions = jurisdictions[country] ? Object.keys(jurisdictions[country]) : [];
  const activeJurisName = jurisOptions.includes(jurisdictionKey[country]) ? jurisdictionKey[country] : undefined;
  const jurisLines = activeJurisName ? (jurisdictions[country]?.[activeJurisName] || []) : [];

  // merge: country base + jurisdiction overlay
  const mergedLines = useMemo(() => {
    const map = new Map();
    baseLines.forEach((l: any) => map.set(l.id, { ...l }));
    jurisLines.forEach((l: any) => map.set(l.id, { ...l, isJurisdiction: true }));
    return Array.from(map.values());
  }, [baseLines, jurisLines]);

  const totalCost = useMemo(() => {
    const oncosts = mergedLines.map((line: any) => calcLine(line, salary));
    return salary + sum(oncosts);
  }, [mergedLines, salary]);

  const csvExport = () => {
    const lines = [
      ["Item", "Type", "Value", "Amount", "Note"],
      ["Base salary", "flat", salary, salary, "Input amount"],
      ...mergedLines.map((line: any) => [
        line.name,
        line.type,
        line.value,
        calcLine(line, salary),
        line.note || ""
      ]),
      ["", "", "", "", ""],
      ["Total Cost", "", "", totalCost, "Final result"]
    ];
    
    const csvContent = lines.map(row => 
      row.map(cell => `"${cell}"`).join(",")
    ).join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employment-cost-${country}-${employmentType}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Calculator className="w-6 h-6 text-primary-600" />
            Cost of Employment Calculator
          </CardTitle>
          <CardDescription>
            Calculate total employment costs including all statutory contributions and employer obligations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Employment Type Toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Employment Type</label>
              <div className="flex rounded-lg border p-1">
                <Button
                  variant={employmentType === "Employee" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setEmploymentType("Employee")}
                  data-testid="button-employee-type"
                >
                  Employee
                </Button>
                <Button
                  variant={employmentType === "Contractor" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setEmploymentType("Contractor")}
                  data-testid="button-contractor-type"
                >
                  Contractor
                </Button>
              </div>
            </div>

            {/* Country Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Country</label>
              <select
                className="w-full p-2 border rounded-lg"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                data-testid="select-country"
              >
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Jurisdiction Selector */}
            {jurisOptions.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">State/Province</label>
                <select
                  className="w-full p-2 border rounded-lg"
                  value={activeJurisName || ""}
                  onChange={(e) => setJurisdictionKey({...jurisdictionKey, [country]: e.target.value})}
                  data-testid="select-jurisdiction"
                >
                  <option value="">None selected</option>
                  {jurisOptions.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Salary Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Annual Salary ({currency})</label>
            <input
              type="number"
              className="w-full p-2 border rounded-lg"
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
              placeholder="Enter annual salary"
              data-testid="input-salary"
            />
          </div>

          {/* Results Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Cost Breakdown</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={csvExport}
                    data-testid="button-export-csv"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    CSV
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="divide-y">
              {/* Base Salary */}
              <div className="grid grid-cols-4 gap-4 p-4">
                <div className="font-medium">Base Salary</div>
                <div className="text-sm text-gray-600">flat</div>
                <div className="text-sm">{salary}</div>
                <div className="font-medium text-right" data-testid="text-base-salary">
                  {formatCurrency(salary, currency)}
                </div>
              </div>

              {/* Cost Lines */}
              {mergedLines.map((line: any, idx: number) => (
                <div key={line.id} className="grid grid-cols-4 gap-4 p-4">
                  <div className={`${line.isJurisdiction ? 'text-blue-600' : ''}`}>
                    {line.name}
                    {line.isJurisdiction && <span className="ml-1 text-xs">(State)</span>}
                  </div>
                  <div className="text-sm text-gray-600">{line.type}</div>
                  <div className="text-sm">
                    {line.type === 'flat' ? formatCurrency(line.value, currency) : `${line.value}%`}
                  </div>
                  <div className="font-medium text-right" data-testid={`text-cost-${idx}`}>
                    {formatCurrency(calcLine(line, salary), currency)}
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-primary-50 font-semibold">
                <div>Total Employment Cost</div>
                <div></div>
                <div></div>
                <div className="text-right text-primary-600" data-testid="text-total-cost">
                  {formatCurrency(totalCost, currency)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ResourcesPageProps {
  /** Optional asset path prefix for images */
  assetPath?: string;
  /** Whether to show the Country Guides link */
  showCountryGuides?: boolean;
  /** Custom navigation function for Country Guides */
  onNavigateToCountryGuides?: () => void;
}

export function ResourcesPage({ 
  assetPath = "/assets", 
  showCountryGuides = true,
  onNavigateToCountryGuides
}: ResourcesPageProps) {
  const handleCountryGuidesClick = () => {
    if (onNavigateToCountryGuides) {
      onNavigateToCountryGuides();
    } else {
      window.location.href = '/country-guides';
    }
  };

  return (
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
                <div className="text-2xl font-bold text-primary-600">Industry-standard</div>
                <div className="text-sm text-secondary-600">Defaults</div>
              </div>
            </div>
            <p className="text-secondary-600 mb-4">
              Our comprehensive calculator includes country-specific employment costs, state/province overlays, 
              and employer on-costs for both employees and contractors. Assumptions use industry-standard defaults 
              and calculations persist locally for your session.
            </p>
          </CardContent>
        </Card>

        {/* Additional Resources */}
        <div className="space-y-6">
          {showCountryGuides && (
            <Card 
              className="border-accent-200 shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
              onClick={handleCountryGuidesClick}
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
          )}

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
          {/* Blog Articles */}
          {[
            {
              image: "Global_talent_acquisition_illustration_c1b45844.png",
              category: "Global Talent",
              title: "Global Talent Advantage",
              readTime: "5 min read",
              author: "SDP Experts",
              description: "Discover why smart companies are tapping into global talent pools and how SDP Global Pay makes international hiring seamless, compliant, and cost-effective.",
              color: "blue"
            },
            {
              image: "Payroll_compliance_and_trust_364fce56.png",
              category: "Compliance",
              title: "Payroll Compliance Trust",
              readTime: "6 min read",
              author: "Compliance Team",
              description: "Explore why payroll accuracy and employment compliance are fundamental to maintaining trust with employees, contractors, and regulatory authorities.",
              color: "green"
            },
            {
              image: "Employee_contractor_classification_risks_ee95c6c8.png",
              category: "Classification",
              title: "Misclassification Risks",
              readTime: "7 min read",
              author: "Legal Experts",
              description: "Understanding the critical differences between employees and contractors, and the severe consequences of misclassification for businesses.",
              color: "purple"
            },
            {
              image: "HR_data_analytics_insights_80139ab9.png",
              category: "Data Insights",
              title: "Hidden Data Value",
              readTime: "5 min read",
              author: "Data Analytics",
              description: "Discover how payroll and HR data can drive strategic business decisions, improve employee retention, and optimize costs.",
              color: "orange"
            },
            {
              image: "Payroll_outsourcing_efficiency_illustration_716cbb7a.png",
              category: "Outsourcing",
              title: "Payroll Outsourcing Benefits",
              readTime: "6 min read",
              author: "Operations Team",
              description: "Learn why successful businesses choose to outsource payroll operations and how it drives efficiency, reduces risk, and enables growth.",
              color: "green"
            },
            {
              image: "Recruitment_global_expansion_services_a5132be3.png",
              category: "Recruitment",
              title: "Recruitment Global Expansion",
              readTime: "8 min read",
              author: "Partnership Team",
              description: "Discover how recruitment agencies can leverage SDP Global Pay to expand beyond their home country and unlock international opportunities.",
              color: "blue"
            }
          ].map((article, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={`${assetPath}/${article.image}?v=5`}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
                <div className={`absolute top-4 left-4 bg-${article.color}-600 text-white px-3 py-1 rounded-full text-sm font-semibold`}>
                  {article.category}
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3 text-secondary-900">{article.title}</h3>
                <div className="flex items-center gap-2 mb-3 text-sm text-secondary-500">
                  <Clock className="w-4 h-4" />
                  <span>{article.readTime}</span>
                  <User className="w-4 h-4 ml-2" />
                  <span>{article.author}</span>
                </div>
                <p className="text-secondary-600 mb-4 leading-relaxed text-sm">
                  {article.description}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => alert('Coming soon: Expert insights on global employment and payroll strategies.')}
                >
                  Read Article
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}