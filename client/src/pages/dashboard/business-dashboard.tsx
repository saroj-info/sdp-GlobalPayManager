/**
 * Business dashboard — analytics over the business's own scope: workforce by
 * country, contract status mix, invoices from SDP, timesheet pipeline, leave.
 * Same visual system as the SDP view, scoped data.
 */

import { useLocation } from "wouter";
import { Users, FileText, ClipboardList, CalendarDays, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { PageLoader } from "@/components/ui/loader";
import type { BusinessDashboardSummary } from "@shared/dashboard";
import { GreetingBand, timeGreeting } from "@/components/dashboard/greeting-band";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { PipelineBar } from "@/components/dashboard/pipeline-bar";
import { CurrencyAmounts } from "@/components/dashboard/currency-amounts";
import { ContractStatusDonut } from "@/components/dashboard/contract-status-donut";
import { WorkforceByCountryChart } from "@/components/dashboard/workforce-by-country-chart";
import { MonthlyMoneyChart } from "@/components/dashboard/monthly-money-chart";
import { DashboardQuickActions } from "@/components/dashboard/quick-actions";
import { useDashboardSummary } from "@/components/dashboard/use-dashboard-summary";

function leaveTypeTitle(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export function BusinessDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = useDashboardSummary();

  const summary = data && data.role === "business" ? (data as BusinessDashboardSummary) : null;
  usePageHeader(summary?.businessName ?? "Dashboard", "Workforce and billing overview");

  if (isLoading) return <PageLoader label="Loading dashboard" />;

  if (error || !summary) {
    const notSetUp = error instanceof Error && error.message.startsWith("404");
    return (
      <div className="min-h-full bg-muted/30">
        <div className="mx-auto max-w-[1400px] p-6">
          <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-3 text-base font-semibold">
              {notSetUp ? "Your business isn't set up yet" : "Couldn't load your dashboard"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {notSetUp
                ? "Finish your business setup to start managing your workforce."
                : "Please try again in a moment."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-muted/30">
      <div className="mx-auto max-w-[1400px] space-y-6 p-6">
        <GreetingBand
          greeting={timeGreeting(user?.firstName)}
          chip={summary.businessName}
          actions={<DashboardQuickActions />}
        />

        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          <StatCard label="Workers" value={summary.kpis.totalWorkers} icon={Users}
            onClick={() => setLocation("/workforce")} testId="dashboard-kpi-workers" />
          <StatCard label="Active Contracts" value={summary.kpis.activeContracts} icon={FileText}
            onClick={() => setLocation("/contracts")} testId="dashboard-kpi-active-contracts" />
          <StatCard label="Timesheets Awaiting Approval" value={summary.kpis.submittedTimesheets} icon={ClipboardList}
            hint={summary.kpis.submittedTimesheets > 0 ? "Require review" : "All up to date"}
            onClick={() => setLocation("/timesheets")} testId="dashboard-kpi-submitted-timesheets" />
          <StatCard label="Pending Leave" value={summary.kpis.pendingLeave} icon={CalendarDays}
            onClick={() => setLocation("/leave-requests")} testId="dashboard-kpi-pending-leave" />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <ChartCard
            title="Your Workforce by Country"
            subtitle="Employees and contractors across your locations"
            linkTo="/workforce"
            className="lg:col-span-7"
            testId="dashboard-chart-workforce"
          >
            <WorkforceByCountryChart data={summary.workforceByCountry} />
          </ChartCard>

          <ChartCard
            title="Contract Status Mix"
            subtitle="All your contracts by lifecycle status"
            linkTo="/contracts"
            className="lg:col-span-5"
            testId="dashboard-chart-contract-status"
          >
            <ContractStatusDonut data={summary.contractsByStatus} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <ChartCard
            title="Invoices from SDP — Last 12 Months"
            subtitle="Billed amounts per month, per currency"
            linkTo="/invoices"
            className="lg:col-span-7"
            testId="dashboard-chart-invoices-monthly"
          >
            <MonthlyMoneyChart data={summary.invoicesMonthly} variant="bar" emptyMessage="No invoices yet" />
            <div className="mt-4 border-t pt-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Outstanding</p>
              {summary.outstandingByCurrency.length > 0 ? (
                <CurrencyAmounts amounts={summary.outstandingByCurrency} />
              ) : (
                <p className="text-xs text-muted-foreground">Nothing outstanding</p>
              )}
            </div>
          </ChartCard>

          <div className="space-y-5 lg:col-span-5">
            <ChartCard
              title="Timesheet Pipeline"
              subtitle="All your timesheets by status"
              linkTo="/timesheets"
              testId="dashboard-chart-timesheet-pipeline"
            >
              <PipelineBar pipeline={summary.timesheetPipeline} />
            </ChartCard>

            <ChartCard
              title="Leave Snapshot"
              subtitle="Requests needing attention"
              linkTo="/leave-requests"
              testId="dashboard-chart-leave"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-semibold tabular-nums">{summary.leave.pending}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-semibold tabular-nums">{summary.leave.approvedUpcoming}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Approved upcoming</p>
                </div>
              </div>
              {summary.leave.byType.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {summary.leave.byType.map(t => (
                    <li key={t.leaveType} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{leaveTypeTitle(t.leaveType)}</span>
                      <span className="font-medium tabular-nums">{t.count} pending</span>
                    </li>
                  ))}
                </ul>
              )}
              {summary.leave.pending === 0 && summary.leave.approvedUpcoming === 0 && summary.leave.byType.length === 0 && (
                <p className="mt-3 text-center text-xs text-muted-foreground">No leave activity</p>
              )}
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  );
}
