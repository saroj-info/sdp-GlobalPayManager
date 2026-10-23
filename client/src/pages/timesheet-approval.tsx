/**
 * Public confirm page behind the Approve / Reject buttons in the "timesheet awaiting
 * approval" email: /timesheet-approval/:token?action=approve|reject
 *
 * No sign-in. The token in the URL is single-use and bound to one submission; the server
 * never changes state on the GET, only on the confirm POST below (mail scanners open links).
 * Server side: server/modules/timesheet-approval/{tokens,controller}.ts.
 */

import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Navigation } from "@/components/layout/navigation";
import {
  AlertTriangle, CalendarDays, CheckCircle, Clock, FileText, Loader2, User, XCircle,
} from "lucide-react";

type DayRow = {
  date: string;
  label: string;
  weekday: string;
  isWeekend: boolean;
  hasEntry: boolean;
  valueLabel: string;
  startTime: string | null;
  endTime: string | null;
  breakHours: string | null;
  description: string | null;
};

type Summary = {
  timesheetId: string;
  status: string;
  workerName: string;
  contractLabel: string;
  periodLabel: string;
  unit: "hourly" | "daily" | "annual";
  rows: DayRow[];
  capped: boolean;
  totals: { hours: number; days: number; present: number; label: string };
  notes: string | null;
};

type LinkState = "pending" | "used" | "expired" | "not_pending" | "invalid";

type LinkData = {
  state: LinkState;
  code?: string;
  message?: string;
  timesheetId?: string;
  approverRole?: string;
  expiresAt?: string;
  usedAction?: string | null;
  usedAt?: string | null;
  summary?: Summary;
};

type Action = "approve" | "reject";

function readAction(): Action {
  try {
    return new URLSearchParams(window.location.search).get("action") === "reject" ? "reject" : "approve";
  } catch {
    return "approve";
  }
}

function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function TimesheetApproval() {
  const [, params] = useRoute("/timesheet-approval/:token");
  const token = params?.token || "";

  const [action, setAction] = useState<Action>(readAction);
  const [data, setData] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setData({ state: "invalid", message: "This approval link is incomplete." });
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/timesheet-approval/${encodeURIComponent(token)}`, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok || body?.state) {
          setData(body as LinkData);
        } else {
          setLoadError(body?.message || "Could not load this approval link.");
        }
      } catch {
        if (!cancelled) setLoadError("Could not load this approval link. Please check your connection and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const signInHref = data?.timesheetId
    ? `/login?redirect=${encodeURIComponent(`/timesheets?open=${data.timesheetId}`)}`
    : "/login?redirect=%2Ftimesheets";

  const decide = async () => {
    setSubmitError("");
    const trimmed = reason.trim();
    if (action === "reject" && !trimmed) {
      setSubmitError("Please give a reason for rejecting this timesheet.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/timesheet-approval/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action, rejectionReason: action === "reject" ? trimmed : undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(body?.action === "rejected" ? "rejected" : "approved");
        return;
      }
      if (body?.state && body.state !== "pending") {
        // The link was used, expired or the timesheet moved on while this page was open.
        setData((prev) => ({ ...(prev || { state: body.state }), ...body }));
        return;
      }
      setSubmitError(body?.message || "Could not record your decision. Please try again.");
    } catch {
      setSubmitError("Could not record your decision. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const summary = data?.summary;

  const renderDays = () => {
    if (!summary) return null;
    return (
      <div className="rounded-lg border overflow-hidden" data-testid="approval-day-table">
        <div className="grid grid-cols-[7rem_1fr_5rem] sm:grid-cols-[8rem_7rem_1fr_6rem] gap-2 px-3 py-2 bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Day</span>
          <span className="hidden sm:block">Time</span>
          <span>Notes</span>
          <span className="text-right">{summary.unit === "hourly" ? "Hours" : "Days"}</span>
        </div>
        <div className="divide-y">
          {summary.rows.map((r, i) => (
            <div
              key={`${r.date}-${i}`}
              className={`grid grid-cols-[7rem_1fr_5rem] sm:grid-cols-[8rem_7rem_1fr_6rem] gap-2 px-3 py-2 text-sm ${r.hasEntry ? "" : "text-muted-foreground"} ${r.isWeekend ? "bg-muted/20" : ""}`}
              data-testid={`approval-day-${r.date}`}
            >
              <span className="font-medium">
                {r.label}
                {r.isWeekend && <span className="ml-1 text-[10px] uppercase text-muted-foreground">wknd</span>}
              </span>
              <span className="hidden sm:block text-xs text-muted-foreground self-center">
                {r.startTime && r.endTime ? `${r.startTime} – ${r.endTime}${r.breakHours ? ` · ${r.breakHours}h break` : ""}` : ""}
              </span>
              <span className="text-xs text-muted-foreground self-center truncate">
                {r.hasEntry ? (r.description || "") : (r.isWeekend ? "Weekend · nothing logged" : "Nothing logged")}
              </span>
              <span className={`text-right font-semibold tabular-nums ${r.hasEntry ? "text-primary" : "text-muted-foreground"}`}>{r.valueLabel}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 text-sm">
          <span className="font-medium">Total</span>
          <span className="font-bold tabular-nums" data-testid="approval-total">{summary.totals.label}</span>
        </div>
        {summary.capped && (
          <p className="px-3 py-2 text-xs text-muted-foreground">This period is longer than 31 days; only the days with time logged are listed.</p>
        )}
      </div>
    );
  };

  const renderHeader = () => summary && (
    <div className="grid gap-2 text-sm sm:grid-cols-3">
      <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{summary.workerName}</span></div>
      <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span className="truncate">{summary.contractLabel}</span></div>
      <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" /><span>{summary.periodLabel}</span></div>
    </div>
  );

  const renderBody = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16 text-muted-foreground" data-testid="approval-loading">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading timesheet…
        </div>
      );
    }
    if (loadError) {
      return (
        <div className="py-8 text-center space-y-3" data-testid="approval-error">
          <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Try again</Button>
        </div>
      );
    }
    if (!data) return null;

    if (done) {
      const approved = done === "approved";
      return (
        <div className="py-8 text-center space-y-3" data-testid={`approval-done-${done}`}>
          {approved
            ? <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
            : <XCircle className="h-12 w-12 mx-auto text-red-600" />}
          <h2 className="text-xl font-semibold">{approved ? "Timesheet approved" : "Timesheet rejected"}</h2>
          <p className="text-sm text-muted-foreground">
            {approved
              ? `Thank you. ${summary?.workerName || "The worker"}'s timesheet for ${summary?.periodLabel || "this period"} is now approved.`
              : `${summary?.workerName || "The worker"}'s timesheet for ${summary?.periodLabel || "this period"} has been rejected with your reason.`}
          </p>
          <p className="text-xs text-muted-foreground">You can close this page. This link cannot be used again.</p>
        </div>
      );
    }

    if (data.state !== "pending") {
      const title = data.state === "used"
        ? `Already ${data.usedAction === "rejected" ? "rejected" : "approved"}`
        : data.state === "expired"
          ? "This link has expired"
          : data.state === "not_pending"
            ? "No longer awaiting approval"
            : "This link is not valid";
      const detail = data.state === "used" && data.usedAt
        ? `This timesheet was ${data.usedAction === "rejected" ? "rejected" : "approved"} on ${fmtDateTime(data.usedAt)}.`
        : data.message || "";
      return (
        <div className="py-6 space-y-4" data-testid={`approval-state-${data.state}`}>
          <div className="text-center space-y-2">
            {data.state === "used"
              ? <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
              : <Clock className="h-12 w-12 mx-auto text-amber-500" />}
            <h2 className="text-xl font-semibold">{title}</h2>
            {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
          </div>
          {summary && (
            <div className="space-y-3">
              {renderHeader()}
              {renderDays()}
            </div>
          )}
          <div className="text-center">
            <Button asChild variant="outline">
              <a href={signInHref} data-testid="link-sign-in">Sign in to review it in SDP Global Pay</a>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5" data-testid="approval-pending">
        {renderHeader()}
        {renderDays()}
        {summary?.notes && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-sm">
            <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1">Worker's notes</div>
            <div className="whitespace-pre-wrap text-blue-900">{summary.notes}</div>
          </div>
        )}

        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={action === "approve" ? "default" : "outline"}
              className={action === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
              onClick={() => { setAction("approve"); setSubmitError(""); }}
              data-testid="button-choose-approve"
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Approve
            </Button>
            <Button
              type="button"
              variant={action === "reject" ? "destructive" : "outline"}
              onClick={() => { setAction("reject"); setSubmitError(""); }}
              data-testid="button-choose-reject"
            >
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
          </div>

          {action === "reject" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="rejection-reason">Reason for rejecting (shown to the worker)</label>
              <Textarea
                id="rejection-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Thursday should be 6 hours, not 8."
                rows={3}
                data-testid="input-rejection-reason"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Approving confirms the days and hours above. Where the contract bills a client, approval creates the invoice for this period.
            </p>
          )}

          {submitError && <p className="text-sm text-red-600" data-testid="approval-submit-error">{submitError}</p>}

          <Button
            type="button"
            className={`w-full ${action === "approve" ? "bg-green-600 hover:bg-green-700" : ""}`}
            variant={action === "reject" ? "destructive" : "default"}
            disabled={submitting}
            onClick={decide}
            data-testid="button-confirm-decision"
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {action === "approve" ? "Confirm approval" : "Confirm rejection"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            No sign-in needed. This link works once{data.expiresAt ? ` and expires on ${fmtDateTime(data.expiresAt)}` : ""}.{" "}
            <a href={signInHref} className="underline" data-testid="link-sign-in-pending">Prefer the app? Sign in.</a>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Timesheet awaiting your approval</CardTitle>
            <CardDescription>
              Review the days and hours below, then confirm your decision.
            </CardDescription>
          </CardHeader>
          <CardContent>{renderBody()}</CardContent>
        </Card>
      </div>
    </div>
  );
}
