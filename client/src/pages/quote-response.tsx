/**
 * Public page behind the Accept / Reject buttons in the quote email:
 * /quote-response/:token?action=accept|reject
 *
 * No sign-in. The token in the URL is single-use; the server never changes state
 * on the GET, only on the confirm POST (mail scanners open links). After an
 * acceptance the client may leave feedback once. Plain `fetch` on purpose:
 * `apiRequest` would send a bearer and log a signed-in visitor out on a 401.
 * Server side: server/modules/quotes/{service,controller}.ts.
 */
import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { AlertTriangle, CheckCircle, Clock, Loader2, MessageSquare, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Navigation } from "@/components/layout/navigation";
import { QuotePreviewPanel } from "@/components/quotes/quote-preview-panel";
import { draftFx, draftToInput, quoteRowToDraft } from "@/components/quotes/quote-draft";
import { downloadQuotePdf } from "@/lib/generateQuotePdf";
import { computeQuote, type QuoteResponseAction, type QuoteResponsePageData } from "@shared/quotes";

type Action = "accept" | "reject";

function readAction(): Action {
  try {
    return new URLSearchParams(window.location.search).get("action") === "reject" ? "reject" : "accept";
  } catch {
    return "accept";
  }
}

function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function QuoteResponse() {
  const [, params] = useRoute("/quote-response/:token");
  const token = params?.token || "";
  const api = `/api/quote-response/${encodeURIComponent(token)}`;

  const [action, setAction] = useState<Action>(readAction);
  const [data, setData] = useState<QuoteResponsePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState<QuoteResponseAction | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackDone, setFeedbackDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setData({ state: "invalid", message: "This quote link is incomplete." });
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(api, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok || body?.state) {
          setData(body as QuoteResponsePageData);
          if (body?.response?.feedbackGiven) setFeedbackDone(true);
        } else {
          setLoadError(body?.message || "Could not load this quote link.");
        }
      } catch {
        if (!cancelled) setLoadError("Could not load this quote link. Please check your connection and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, api]);

  const quote = data?.quote;
  const countryName = data?.countryName ?? "";
  const view = useMemo(() => {
    if (!quote) return null;
    const draft = quoteRowToDraft(quote);
    return { draft, result: computeQuote(draftToInput(draft), draftFx(draft)) };
  }, [quote]);

  const decide = async () => {
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action, note: action === "reject" ? note.trim() || undefined : undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(body?.action === "declined" ? "declined" : "accepted");
        return;
      }
      if (body?.state && body.state !== "pending") {
        // Answered from another tab, expired, or the quote changed while this page was open.
        setData((prev) => ({ ...(prev || { state: body.state }), ...body }));
        return;
      }
      setSubmitError(body?.message || "Could not record your answer. Please try again.");
    } catch {
      setSubmitError("Could not record your answer. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const sendFeedback = async () => {
    setFeedbackError("");
    if (!feedback.trim()) {
      setFeedbackError("Write a few words first.");
      return;
    }
    setFeedbackSending(true);
    try {
      const res = await fetch(`${api}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ feedback: feedback.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok || body?.code === "QUOTE_FEEDBACK_GIVEN") {
        setFeedbackDone(true);
        return;
      }
      setFeedbackError(body?.message || "Could not send your feedback. Please try again.");
    } catch {
      setFeedbackError("Could not send your feedback. Please check your connection and try again.");
    } finally {
      setFeedbackSending(false);
    }
  };

  const preview = view && quote ? (
    <QuotePreviewPanel
      title={`Quote ${quote.quoteNumber}`}
      draft={view.draft}
      result={view.result}
      countryName={countryName}
      onDownloadPdf={() => downloadQuotePdf({ draft: view.draft, result: view.result, countryName })}
    />
  ) : null;

  const feedbackBox = (
    <div className="rounded-lg border p-4 space-y-3" data-testid="quote-feedback">
      {feedbackDone ? (
        <p className="flex items-center gap-2 text-sm text-secondary-700" data-testid="quote-feedback-done">
          <CheckCircle className="h-4 w-4 text-green-600" /> Thanks for your feedback. SDP Global Pay has received it.
        </p>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm font-medium" htmlFor="quote-feedback">
            <MessageSquare className="h-4 w-4 text-primary-600" /> Anything you would like to add? (optional)
          </label>
          <Textarea
            id="quote-feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g. Please start the engagement on 1 February; our PO will follow."
            rows={3}
            maxLength={4000}
            data-testid="textarea-quote-feedback"
          />
          {feedbackError && <p className="text-sm text-red-600" data-testid="quote-feedback-error">{feedbackError}</p>}
          <Button type="button" variant="outline" disabled={feedbackSending} onClick={sendFeedback} data-testid="button-send-quote-feedback">
            {feedbackSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Send feedback
          </Button>
        </>
      )}
    </div>
  );

  const renderBody = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16 text-muted-foreground" data-testid="quote-response-loading">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading your quote…
        </div>
      );
    }
    if (loadError) {
      return (
        <div className="py-8 text-center space-y-3" data-testid="quote-response-error">
          <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Try again</Button>
        </div>
      );
    }
    if (!data) return null;

    if (done) {
      const accepted = done === "accepted";
      return (
        <div className="py-4 space-y-5" data-testid={`quote-response-done-${done}`}>
          <div className="text-center space-y-2">
            {accepted
              ? <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
              : <XCircle className="h-12 w-12 mx-auto text-red-600" />}
            <h2 className="text-xl font-semibold">{accepted ? "Thank you — quote accepted" : "Quote declined"}</h2>
            <p className="text-sm text-muted-foreground">
              {accepted
                ? `SDP Global Pay has been told that you accepted quote ${quote?.quoteNumber ?? ""} and will be in touch about the next steps.`
                : `SDP Global Pay has been told that you declined quote ${quote?.quoteNumber ?? ""}${note.trim() ? ", with your reason" : ""}.`}
            </p>
            <p className="text-xs text-muted-foreground">This link cannot be used to answer again.</p>
          </div>
          {accepted && feedbackBox}
        </div>
      );
    }

    if (data.state === "responded") {
      const accepted = data.response?.action === "accepted";
      return (
        <div className="py-4 space-y-5" data-testid="quote-response-state-responded">
          <div className="text-center space-y-2">
            {accepted
              ? <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
              : <XCircle className="h-12 w-12 mx-auto text-red-600" />}
            <h2 className="text-xl font-semibold">{accepted ? "Already accepted" : "Already declined"}</h2>
            <p className="text-sm text-muted-foreground">
              This quote was {accepted ? "accepted" : "declined"} on {fmtDateTime(data.response?.respondedAt)}.
            </p>
          </div>
          {accepted && feedbackBox}
        </div>
      );
    }

    if (data.state !== "pending") {
      const title = data.state === "expired"
        ? "This link has expired"
        : data.state === "superseded"
          ? "This quote has been updated"
          : "This link is not valid";
      return (
        <div className="py-6 text-center space-y-2" data-testid={`quote-response-state-${data.state}`}>
          <Clock className="h-12 w-12 mx-auto text-amber-500" />
          <h2 className="text-xl font-semibold">{title}</h2>
          {data.message && <p className="text-sm text-muted-foreground">{data.message}</p>}
        </div>
      );
    }

    return (
      <div className="rounded-lg border p-4 space-y-3" data-testid="quote-response-pending">
        <p className="text-sm text-secondary-700">Review the quote below, then let SDP Global Pay know your decision.</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={action === "accept" ? "default" : "outline"}
            className={action === "accept" ? "bg-green-600 hover:bg-green-700" : ""}
            onClick={() => { setAction("accept"); setSubmitError(""); }}
            data-testid="button-choose-accept"
          >
            <CheckCircle className="h-4 w-4 mr-1" /> Accept
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
            <label className="text-sm font-medium" htmlFor="quote-response-note">Let us know why (optional)</label>
            <Textarea
              id="quote-response-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. The monthly fee is above our budget for this role."
              rows={3}
              maxLength={2000}
              data-testid="textarea-quote-response-note"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Accepting tells SDP Global Pay to go ahead on the basis of this quote. You can add a note on the next screen.
          </p>
        )}

        {submitError && <p className="text-sm text-red-600" data-testid="quote-response-submit-error">{submitError}</p>}

        <Button
          type="button"
          className={`w-full ${action === "accept" ? "bg-green-600 hover:bg-green-700" : ""}`}
          variant={action === "reject" ? "destructive" : "default"}
          disabled={submitting}
          onClick={decide}
          data-testid="button-confirm-quote-response"
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {action === "accept" ? "Accept quote" : "Reject quote"}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          No sign-in needed. This link works once{data.expiresAt ? ` and expires on ${fmtDateTime(data.expiresAt)}` : ""}.
        </p>
      </div>
    );
  };

  const showPreview = !!preview && !!data && (data.state === "pending" || data.state === "responded" || !!done);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <Navigation />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{quote ? `Your quote from SDP Global Pay` : "Quote"}</CardTitle>
            <CardDescription>
              {quote ? `${quote.quoteNumber} · ${quote.title}` : "The quote behind the link in your email."}
            </CardDescription>
          </CardHeader>
          <CardContent>{renderBody()}</CardContent>
        </Card>
        {showPreview && preview}
      </div>
    </div>
  );
}
