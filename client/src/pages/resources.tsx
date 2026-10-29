import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/layout/navigation";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Calculator, FileText, Download, BookOpen, Clock, User, Database } from "lucide-react";
import { usePersistent } from "../hooks/usePersistent";
import { canonicaliseCountry, COUNTRY_EMPLOYMENT_NOTES as COUNTRY_NOTES } from "@shared/countryEmploymentData";
import { computeCostBreakdown, costItemsFor, jurisdictionsOf, type CountryCostItem } from "@shared/countryCosts";

// =============================================================
//  Global Total Cost of Employment (TCOE) — SDP
//  Employment type toggle, state / province selector and the breakdown.
//
//  Every rate comes from SDP's Cost Settings (`country_cost_items`, edited on
//  /platform-config → Cost Settings) through the public GET /api/country-costs,
//  the same items the Quotes page and the AI country tools use. The maths is
//  shared/countryCosts.ts `computeCostBreakdown`. Nothing is edited here.
// =============================================================

function fmtCurrency(value: any, currencyCode: any) {
  if (Number.isNaN(value)) return "-";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode || "USD",
      maximumFractionDigits: currencyCode === "VND" || currencyCode === "JPY" ? 0 : 2,
    }).format(value || 0);
  } catch (e) {
    return `${value?.toFixed?.(2) ?? value}`;
  }
}

const CALC_TYPE_LABEL: Record<string, string> = {
  percent: "% of pay",
  percent_with_cap: "% up to cap",
  flat: "Flat per year",
};

function EmploymentCostCalculator() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [employmentType, setEmploymentType] = usePersistent("tcoe_employment_type", "Employee");
  const [countryId, setCountryId] = usePersistent("tcoe_country_id", "au");
  const [salary, setSalary] = usePersistent("tcoe_salary", 120000);
  const [stateByCountry, setStateByCountry] = usePersistent<Record<string, string>>("tcoe_selected_state", {});

  // Both reads are public, so the calculator works logged out too.
  const { data: countriesData = [] } = useQuery<any[]>({ queryKey: ['/api/countries'] });
  const { data: costData, isLoading: isLoadingItems } = useQuery<{ items: CountryCostItem[] }>({
    queryKey: ['/api/country-costs'],
    staleTime: 5 * 60_000,
  });

  const countries = useMemo(() => (countriesData as any[]).filter((c) => c.isActive !== false), [countriesData]);
  const country = countries.find((c) => c.id === countryId) ?? countries[0] ?? null;
  const currency: string = country?.currency || "USD";
  const canonical = country ? canonicaliseCountry(country.code) ?? canonicaliseCountry(country.name) : null;
  const items = useMemo(() => (costData?.items ?? []).filter((i) => country && i.countryId === country.id), [costData, country]);
  const category = employmentType === "Employee" ? "employment" : "contractor_standard";

  const jurisOptions = jurisdictionsOf(items);
  const chosen = country ? stateByCountry[country.id] : undefined;
  const activeJurisName = chosen && jurisOptions.includes(chosen) ? chosen : jurisOptions[0];
  const applicable = useMemo(() => costItemsFor(items, { category, jurisdiction: activeJurisName ?? null }), [items, category, activeJurisName]);
  const breakdown = useMemo(() => computeCostBreakdown(applicable, Number(salary) || 0), [applicable, salary]);
  const oncostTotal = breakdown.onCostTotal;
  const totalCost = breakdown.totalEmployerCost;
  const oncostPct = breakdown.onCostPct;

  // SDP super admins and admins maintain the rates on the Cost Settings tab.
  const canEditSettings = (user as any)?.userType === 'sdp_internal' &&
    ((user as any)?.sdpRole === 'sdp_admin' || (user as any)?.sdpRole === 'sdp_super_admin');

  function exportCSV() {
    const rows = [
      ["Employment type", employmentType],
      ["Country", country?.name ?? ""],
      ["State / province", activeJurisName || "(none)"],
      ["Currency", currency],
      ["Base Salary", (Number(salary) || 0).toString()],
      [],
      ["Item", "Description", "Scope", "Type", "Rate/Value", "Cap", "Amount"],
      ...breakdown.lines.map((b) => [
        b.name,
        b.description,
        b.stateProvince ? `State: ${b.stateProvince}` : "Country",
        CALC_TYPE_LABEL[b.calcType] ?? b.calcType,
        b.calcType === "flat" ? b.value : `${b.value}%`,
        b.capAmount ? fmtCurrency(b.capAmount, currency) : "",
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
    a.download = `TCOE_${employmentType}_${country?.id ?? "country"}_${activeJurisName || "NA"}_${Date.now()}.csv`;
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
              <p className="text-secondary-600 mt-1">Employer on-costs per country, with state / province specific rates</p>
            </div>
          </div>
          <Card className="border-secondary-200 bg-white/80 backdrop-blur">
            <CardContent className="p-4">
              <p className="text-sm text-secondary-600 mb-2">
                Select the employment type, the country (and the state where rates differ), then enter the annual base salary to estimate employer on‑costs.
                The rates are the ones SDP maintains in its Cost Settings — the same figures a quote starts from.
              </p>
              <p className="text-xs text-secondary-500">
                <strong>Disclaimer:</strong> Planning tool only. Laws change; state/province rates and wage caps vary. Validate before making decisions.
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
                    data-testid={`button-tcoe-${t.toLowerCase()}`}
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
                value={country?.id ?? ""}
                onChange={(e) => setCountryId(e.target.value)}
                data-testid="select-tcoe-country"
              >
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">State / province</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <select
                className="w-full rounded-lg border border-secondary-300 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                value={activeJurisName || ""}
                onChange={(e) => country && setStateByCountry({ ...stateByCountry, [country.id]: e.target.value })}
                disabled={!jurisOptions.length}
                data-testid="select-tcoe-state"
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
              <CardDescription className="text-xs">{currency}</CardDescription>
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
          {canEditSettings && (
            <Button
              variant="outline"
              onClick={() => {
                setLocation('/platform-config');
                setTimeout(() => {
                  const tabTrigger = document.querySelector('[value="cost-settings"]');
                  if (tabTrigger) (tabTrigger as HTMLElement).click();
                }, 200);
              }}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
              data-testid="button-edit-cost-settings"
            >
              <Database className="w-4 h-4 mr-2" />
              Edit cost settings
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
              <div className="text-2xl font-bold text-accent-700" data-testid="tcoe-oncost-total">{fmtCurrency(oncostTotal, currency)}</div>
            </CardContent>
          </Card>
          <Card className="border-primary-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-primary-600">Total Employer Cost</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-primary-700" data-testid="tcoe-total-cost">{fmtCurrency(totalCost, currency)}</div>
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
              <table className="w-full text-sm" data-testid="tcoe-breakdown">
                <thead className="bg-secondary-50 text-secondary-700">
                  <tr>
                    <th className="text-left p-4 font-medium">Item</th>
                    <th className="text-left p-4 font-medium">Scope</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-right p-4 font-medium">Rate/Value</th>
                    <th className="text-right p-4 font-medium">Cap</th>
                    <th className="text-right p-4 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingItems && (
                    <tr><td colSpan={6} className="p-4 text-secondary-500">Loading cost items…</td></tr>
                  )}
                  {!isLoadingItems && breakdown.lines.length === 0 && (
                    <tr><td colSpan={6} className="p-4 text-secondary-500">No cost items are set up for this country yet.</td></tr>
                  )}
                  {breakdown.lines.map((b) => (
                    <tr key={b.id} className="border-t border-secondary-100 hover:bg-secondary-25" data-testid={`tcoe-line-${b.itemKey}`}>
                      <td className="p-4">
                        <div className="font-medium text-secondary-900">{b.name}</div>
                        {b.description && <div className="text-xs text-secondary-500 mt-1 max-w-xl">{b.description}</div>}
                      </td>
                      <td className="p-4 text-secondary-600">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          b.stateProvince ? "bg-accent-100 text-accent-700" : "bg-primary-100 text-primary-700"
                        }`}>
                          {b.stateProvince ? "State" : "Country"}
                        </span>
                      </td>
                      <td className="p-4 text-secondary-600">{CALC_TYPE_LABEL[b.calcType] ?? b.calcType}</td>
                      <td className="p-4 text-right font-medium">{b.calcType === "flat" ? fmtCurrency(b.value, currency) : `${b.value}%`}</td>
                      <td className="p-4 text-right">{b.capAmount ? fmtCurrency(b.capAmount, currency) : "—"}</td>
                      <td className="p-4 text-right font-bold text-secondary-900">{fmtCurrency(b.amount, currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-accent-50 border-t border-accent-200">
                    <td className="p-4 font-bold text-accent-900" colSpan={5}>On‑cost Total</td>
                    <td className="p-4 text-right font-bold text-accent-900">{fmtCurrency(oncostTotal, currency)}</td>
                  </tr>
                  <tr className="bg-primary-50 border-t border-primary-200">
                    <td className="p-4 font-bold text-primary-900" colSpan={5}>Total Employer Cost</td>
                    <td className="p-4 text-right font-bold text-primary-900">{fmtCurrency(totalCost, currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Country Info Section */}
        {canonical && COUNTRY_NOTES[canonical] && (
          <Card>
            <CardHeader>
              <CardTitle>Country Info & Employment Notes — {country?.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-line text-secondary-700 leading-relaxed">
                {COUNTRY_NOTES[canonical]}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function Resources() {
  const { isAuthenticated } = useAuth();

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
                  <div className="text-2xl font-bold text-primary-600">Maintained</div>
                  <div className="text-sm text-secondary-600">By SDP</div>
                </div>
              </div>
              <p className="text-secondary-600 mb-4">
                Our comprehensive calculator includes country-specific employment costs, state/province rates, 
                and employer on-costs for both employees and contractors, maintained by SDP and shared with 
                our quotes.
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

  // Authenticated users render inside the standard <AuthenticatedLayout>
  // (the route wraps this page in App.tsx) — no hand-rolled Sidebar/Header
  // here: Header needs AuthenticatedLayoutContext (⌘K command bar) and
  // crashes without the provider.
  return <AuthenticatedResources />;
}

function AuthenticatedResources() {
  usePageHeader(
    "Resources",
    "Powerful tools and resources to help you navigate global employment and contracting decisions with confidence.",
  );

  return (
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
                  <div className="text-2xl font-bold text-primary-600">Maintained</div>
                  <div className="text-sm text-secondary-600">By SDP</div>
                </div>
              </div>
              <p className="text-secondary-600 mb-4">
                Our comprehensive calculator includes country-specific employment costs, state/province rates, 
                and employer on-costs for both employees and contractors, maintained by SDP and shared with 
                our quotes.
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
  );
}