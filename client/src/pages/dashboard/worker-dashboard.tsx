/**
 * Worker dashboard — personal analytics: work submitted trend, pay/invoice
 * picture, live contracts, leave. Employee vs contractor variants come from
 * the summary's workerType. All numbers are real; empty states otherwise.
 */

import { useLocation } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from "recharts";
import {
  FileText, ClipboardList, Send, CheckCircle2, CalendarDays, Receipt, UserRound, BarChart3, Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { PageLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { getContractStatusLabel, getContractStatusVariant } from "@shared/contractHelpers";
import type { WorkerDashboardSummary } from "@shared/dashboard";
import { GreetingBand, timeGreeting } from "@/components/dashboard/greeting-band";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  useDashboardSummary, formatMonthTick, formatMonthLong, formatMoney,
} from "@/components/dashboard/use-dashboard-summary";

const INVOICE_STATUS_ORDER = ["draft", "submitted", "under_review", "approved", "rejected", "paid"];

function statusTitle(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export function WorkerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  usePageHeader(`Welcome back, ${user?.firstName ?? ""}`.trim(), "Your work, pay and contracts at a glance");

  const { data, isLoading, error } = useDashboardSummary();

  if (isLoading) return <PageLoader label="Loading dashboard" />;

  if (error || !data || data.role !== "worker") {
    const notSetUp = error instanceof Error && error.message.startsWith("404");
    return (
      <div className="min-h-full bg-muted/30">
        <div className="mx-auto max-w-[1400px] p-6">
          <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
            <UserRound className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-3 text-base font-semibold">
              {notSetUp ? "Your worker profile isn't set up yet" : "Couldn't load your dashboard"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {notSetUp
                ? "Complete your details so contracts and timesheets can be linked to you."
                : "Please try again in a moment."}
            </p>
            {notSetUp && (
              <Button className="mt-4" onClick={() => setLocation("/my-details")} data-testid="button-setup-profile">
                Go to My Details
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const summary: WorkerDashboardSummary = data;
  const isEmployee = summary.workerType === "employee";

  // Work trend: chart whichever unit this worker actually tracks.
  const totalHours = summary.workMonthly.reduce((s, m) => s + m.hours, 0);
  const totalDays = summary.workMonthly.reduce((s, m) => s + m.days, 0);
  const workKey = totalDays > totalHours ? "days" : "hours";
  const hasWork = totalHours > 0 || totalDays > 0;
  const workConfig = {
    hours: { label: "Hours", color: "var(--chart-1)" },
    days: { label: "Days", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  // Net pay chart (employees): one line per currency, fixed slot order.
  const payCurrencies = summary.payslipsMonthly?.currencies ?? [];
  const payData = (summary.payslipsMonthly?.rows ?? []).map(r => ({ month: r.month, ...r.totals }));
  const payConfig: ChartConfig = Object.fromEntries(
    payCurrencies.map((c, i) => [c, { label: c, color: `var(--chart-${(i % 8) + 1})` }]),
  );

  // Invoice rows (contractors): fixed status order, per-currency amounts.
  const invoiceRows = INVOICE_STATUS_ORDER
    .map(status => {
      const rows = (summary.invoiceTotals ?? []).filter(r => r.status === status);
      return {
        status,
        count: rows.reduce((s, r) => s + r.count, 0),
        amounts: rows.map(r => formatMoney(r.total, r.currency)),
      };
    })
    .filter(r => r.count > 0);

  return (
    <div className="min-h-full bg-muted/30">
      <div className="mx-auto max-w-[1400px] space-y-6 p-6">
        <GreetingBand
          greeting={timeGreeting(summary.firstName)}
          chip={isEmployee ? "Employee" : "Contractor"}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => setLocation("/timesheets")} data-testid="button-quick-timesheets">
                <ClipboardList className="mr-1.5 h-4 w-4" /> My Timesheets
              </Button>
              {isEmployee ? (
                <Button variant="outline" size="sm" onClick={() => setLocation("/leave")} data-testid="button-quick-leave">
                  <CalendarDays className="mr-1.5 h-4 w-4" /> My Leave
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setLocation("/worker-invoices")} data-testid="button-quick-invoices">
                  <Receipt className="mr-1.5 h-4 w-4" /> My Invoices
                </Button>
              )}
            </>
          }
        />

        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          <StatCard label="Active Contracts" value={summary.kpis.activeContracts} icon={FileText}
            onClick={() => setLocation("/contracts")} testId="dashboard-kpi-active-contracts" />
          <StatCard label="Draft Timesheets" value={summary.kpis.draftTimesheets} icon={ClipboardList}
            hint="Not yet submitted" onClick={() => setLocation("/timesheets")} testId="dashboard-kpi-draft-timesheets" />
          <StatCard label="Submitted" value={summary.kpis.submittedTimesheets} icon={Send}
            hint="Awaiting approval" onClick={() => setLocation("/timesheets")} testId="dashboard-kpi-submitted-timesheets" />
          <StatCard label="Approved" value={summary.kpis.approvedTimesheets} icon={CheckCircle2}
            hint="All time" onClick={() => setLocation("/timesheets")} testId="dashboard-kpi-approved-timesheets" />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <ChartCard
            title="Work Submitted — Last 12 Months"
            subtitle={workKey === "hours" ? "Hours per month, submitted and approved timesheets" : "Days per month, submitted and approved timesheets"}
            linkTo="/timesheets"
            className="lg:col-span-8"
            testId="dashboard-chart-work-monthly"
          >
            {hasWork ? (
              <ChartContainer config={workConfig} className="aspect-auto h-[280px] w-full">
                <BarChart data={summary.workMonthly} margin={{ left: -12, right: 4, top: 4 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={formatMonthTick} tickLine={false} axisLine={false} fontSize={11} minTickGap={16} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={44} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatMonthLong(String(v))} />} />
                  <Bar dataKey={workKey} fill={`var(--color-${workKey})`} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px]">
                <EmptyState icon={BarChart3} message="No timesheets submitted yet" ctaLabel="Go to timesheets" ctaTo="/timesheets" />
              </div>
            )}
          </ChartCard>

          {isEmployee ? (
            <ChartCard title="Leave" subtitle="Your leave requests" linkTo="/leave" className="lg:col-span-4" testId="dashboard-chart-leave">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-semibold tabular-nums">{summary.leave?.pending ?? 0}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-semibold tabular-nums">{summary.leave?.approved ?? 0}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </ChartCard>
          ) : (
            <ChartCard title="Invoices by Status" subtitle="All your invoices" linkTo="/worker-invoices" className="lg:col-span-4" testId="dashboard-chart-invoice-status">
              {invoiceRows.length > 0 ? (
                <ul className="space-y-2.5">
                  {invoiceRows.map(r => (
                    <li key={r.status} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{statusTitle(r.status)}</span>
                      <span className="text-right">
                        <span className="font-medium tabular-nums">{r.count}</span>
                        <span className="ml-2 text-xs text-muted-foreground tabular-nums">{r.amounts.join(" · ")}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Receipt} message="No invoices yet" ctaLabel="Create an invoice" ctaTo="/worker-invoices" />
              )}
            </ChartCard>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {isEmployee && (
            <ChartCard
              title="Net Pay — Last 12 Months"
              subtitle={payCurrencies.length === 1 ? `Net pay per month (${payCurrencies[0]})` : "Net pay per month, one line per currency"}
              linkTo="/payslips"
              className="lg:col-span-7"
              testId="dashboard-chart-net-pay"
            >
              {payCurrencies.length > 0 ? (
                <ChartContainer config={payConfig} className="aspect-auto h-[280px] w-full">
                  <LineChart data={payData} margin={{ left: -4, right: 4, top: 4 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickFormatter={formatMonthTick} tickLine={false} axisLine={false} fontSize={11} minTickGap={16} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} width={52}
                      tickFormatter={(v) => new Intl.NumberFormat(undefined, { notation: "compact" }).format(Number(v))} />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatMonthLong(String(v))} />} />
                    {payCurrencies.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
                    {payCurrencies.map(c => (
                      <Line key={c} dataKey={c} stroke={`var(--color-${c})`} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    ))}
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-[280px]">
                  <EmptyState icon={Wallet} message="No payslips yet" />
                </div>
              )}
            </ChartCard>
          )}

          <ChartCard
            title="My Contracts"
            subtitle="Live contracts, newest first"
            linkTo="/contracts"
            className={isEmployee ? "lg:col-span-5" : "lg:col-span-12"}
            testId="dashboard-chart-contracts"
          >
            {summary.contracts.length > 0 ? (
              <ul className="divide-y">
                {summary.contracts.map(c => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {c.contractName || c.businessName || "Contract"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.businessName ? `${c.businessName} · ` : ""}
                        {statusTitle(c.rateType)} · {new Date(c.startDate).toLocaleDateString()}
                        {c.endDate ? ` – ${new Date(c.endDate).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!c.signedAt && c.hasSigningToken && (
                        <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Awaiting signature
                        </span>
                      )}
                      <Badge variant={getContractStatusVariant(c.status)}>{getContractStatusLabel(c.status)}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={FileText} message="No live contracts" />
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
