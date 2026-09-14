/**
 * SDP internal dashboard — "Operations Overview". Global analytics across all
 * tenants: workforce, contract mix and trends, billing, timesheet pipeline,
 * outstanding payments. All three sdpRoles see the same view (v1).
 */

import { useLocation } from "wouter";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Users, FileText, ClipboardList, Receipt, Globe2, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { PageLoader } from "@/components/ui/loader";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SdpDashboardSummary } from "@shared/dashboard";
import { GreetingBand, timeGreeting } from "@/components/dashboard/greeting-band";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PipelineBar } from "@/components/dashboard/pipeline-bar";
import { CurrencyAmounts } from "@/components/dashboard/currency-amounts";
import { ContractStatusDonut } from "@/components/dashboard/contract-status-donut";
import { WorkforceByCountryChart } from "@/components/dashboard/workforce-by-country-chart";
import { MonthlyMoneyChart } from "@/components/dashboard/monthly-money-chart";
import { DashboardQuickActions } from "@/components/dashboard/quick-actions";
import {
  useDashboardSummary, formatMonthTick, formatMonthLong,
} from "@/components/dashboard/use-dashboard-summary";

const MAX_COUNTRY_ROWS = 8;

const contractsMonthlyConfig = {
  count: { label: "Contracts", color: "var(--chart-1)" },
} satisfies ChartConfig;

const contractsByCountryConfig = {
  active: { label: "Active", color: "var(--chart-6)" },
  pending: { label: "In progress", color: "var(--chart-4)" },
  ended: { label: "Ended", color: "var(--chart-7)" },
} satisfies ChartConfig;

export function SdpDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  usePageHeader("Operations Overview", "Global workforce, contracts and billing at a glance");

  const { data, isLoading, error } = useDashboardSummary();

  if (isLoading) return <PageLoader label="Loading dashboard" />;

  if (error || !data || data.role !== "sdp") {
    return (
      <div className="min-h-full bg-muted/30">
        <div className="mx-auto max-w-[1400px] p-6">
          <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
            <Globe2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-3 text-base font-semibold">Couldn't load the operations overview</h3>
            <p className="mt-1 text-sm text-muted-foreground">Please try again in a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  const summary: SdpDashboardSummary = data;

  // Fold countries beyond the top 8 into "Other" so the bar stays readable.
  const topCountries = summary.contractsByCountry.slice(0, MAX_COUNTRY_ROWS);
  const restCountries = summary.contractsByCountry.slice(MAX_COUNTRY_ROWS);
  const countryRows = restCountries.length === 0 ? topCountries : [
    ...topCountries,
    restCountries.reduce(
      (acc, c) => ({
        ...acc,
        active: acc.active + c.active,
        pending: acc.pending + c.pending,
        ended: acc.ended + c.ended,
        total: acc.total + c.total,
      }),
      { countryId: "__other__", countryName: "Other", active: 0, pending: 0, ended: 0, total: 0 },
    ),
  ];

  const hasContractsMonthly = summary.contractsMonthly.some(m => m.count > 0);

  return (
    <div className="min-h-full bg-muted/30">
      <div className="mx-auto max-w-[1400px] space-y-6 p-6">
        <GreetingBand
          greeting={timeGreeting(user?.firstName)}
          chip="SDP Internal"
          actions={<DashboardQuickActions />}
        />

        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          <StatCard label="Total Workers" value={summary.kpis.totalWorkers} icon={Users}
            onClick={() => setLocation("/workforce")} testId="dashboard-kpi-workers" />
          <StatCard label="Active Contracts" value={summary.kpis.activeContracts} icon={FileText}
            onClick={() => setLocation("/contracts")} testId="dashboard-kpi-active-contracts" />
          <StatCard label="Timesheets Awaiting Approval" value={summary.kpis.submittedTimesheets} icon={ClipboardList}
            hint={summary.kpis.submittedTimesheets > 0 ? "Require review" : "All up to date"}
            onClick={() => setLocation("/timesheets")} testId="dashboard-kpi-submitted-timesheets" />
          <StatCard label="Open Invoices" value={summary.kpis.openSdpInvoices} icon={Receipt}
            hint="Issued, sent or overdue" onClick={() => setLocation("/sdp-invoices")} testId="dashboard-kpi-open-invoices" />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <ChartCard
            title="Workforce by Country"
            subtitle="Employees and contractors across all businesses"
            linkTo="/workforce"
            className="lg:col-span-7"
            testId="dashboard-chart-workforce"
          >
            <WorkforceByCountryChart data={summary.workforceByCountry} />
          </ChartCard>

          <ChartCard
            title="Contracts by Status"
            subtitle="Every contract on the platform"
            linkTo="/contracts"
            className="lg:col-span-5"
            testId="dashboard-chart-contract-status"
          >
            <ContractStatusDonut data={summary.contractsByStatus} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <ChartCard
            title="Contracts Created — Last 12 Months"
            subtitle="New contracts per month"
            linkTo="/contracts"
            className="lg:col-span-6"
            testId="dashboard-chart-contracts-monthly"
          >
            {hasContractsMonthly ? (
              <ChartContainer config={contractsMonthlyConfig} className="aspect-auto h-[280px] w-full">
                <AreaChart data={summary.contractsMonthly} margin={{ left: -12, right: 4, top: 4 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={formatMonthTick} tickLine={false} axisLine={false} fontSize={11} minTickGap={16} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={44} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatMonthLong(String(v))} />} />
                  <Area dataKey="count" stroke="var(--color-count)" strokeWidth={2} fill="var(--color-count)" fillOpacity={0.15} dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px]">
                <EmptyState icon={TrendingUp} message="No contracts created in the last 12 months" />
              </div>
            )}
          </ChartCard>

          <ChartCard
            title="Invoiced — Last 12 Months"
            subtitle="SDP invoice totals per month, per currency"
            linkTo="/sdp-invoices"
            className="lg:col-span-6"
            testId="dashboard-chart-invoices-monthly"
          >
            <MonthlyMoneyChart data={summary.invoicesMonthly} variant="line" emptyMessage="No invoices in the last 12 months" />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <ChartCard
            title="Contracts by Country"
            subtitle="Lifecycle mix per country"
            linkTo="/contracts"
            className="lg:col-span-7"
            testId="dashboard-chart-contracts-by-country"
          >
            {countryRows.length > 0 ? (
              <ChartContainer config={contractsByCountryConfig} className="aspect-auto h-[280px] w-full">
                <BarChart data={countryRows} layout="vertical" margin={{ left: 8, right: 8, top: 4 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="countryName" tickLine={false} axisLine={false} fontSize={11} width={96} interval={0} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="active" stackId="a" fill="var(--color-active)" maxBarSize={18} />
                  <Bar dataKey="pending" stackId="a" fill="var(--color-pending)" maxBarSize={18} />
                  <Bar dataKey="ended" stackId="a" fill="var(--color-ended)" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px]">
                <EmptyState icon={FileText} message="No contracts yet" />
              </div>
            )}
          </ChartCard>

          <div className="space-y-5 lg:col-span-5">
            <ChartCard
              title="Timesheet Pipeline"
              subtitle="All timesheets by status"
              linkTo="/timesheets"
              testId="dashboard-chart-timesheet-pipeline"
            >
              <PipelineBar pipeline={summary.timesheetPipeline} />
            </ChartCard>

            <ChartCard
              title="Outstanding Payments"
              subtitle="Unpaid balance on issued, sent and overdue invoices"
              linkTo="/sdp-invoices"
              testId="dashboard-chart-outstanding"
            >
              <CurrencyAmounts amounts={summary.outstandingByCurrency} />
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  );
}
