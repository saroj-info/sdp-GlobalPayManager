/**
 * SDP admin editor for the SDP Billing Terms (Templates → System Settings).
 * Draft → preview → publish, with a version history. Server: modules/billingTerms.
 */
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Eye, History, Loader2, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, extractApiErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { BILLING_TERMS_PLACEHOLDERS } from "@shared/billingTerms";
import type { BillingTermsVersion } from "@shared/schema";
import { BILLING_TERMS_CURRENT_KEY } from "@/components/modals/billing-terms-dialog";

const ADMIN_KEY = "/api/admin/billing-terms";

export function BillingTermsAdminPanel() {
  const { user } = useAuth();
  const sdpRole = (user as any)?.sdpRole;
  const isAdmin = sdpRole === "sdp_super_admin" || sdpRole === "sdp_admin";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<{ published: BillingTermsVersion | null; draft: BillingTermsVersion | null }>({
    queryKey: [ADMIN_KEY],
    enabled: isAdmin,
  });
  const { data: versionsData } = useQuery<{ items: BillingTermsVersion[] }>({
    queryKey: [`${ADMIN_KEY}/versions`],
    enabled: isAdmin,
  });

  const [title, setTitle] = useState("SDP Billing Terms & Conditions");
  const [body, setBody] = useState("");
  const [changelog, setChangelog] = useState("");
  const [dirty, setDirty] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [viewVersion, setViewVersion] = useState<BillingTermsVersion | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Load the draft into the editor whenever the server copy changes and the
  // editor has no unsaved edits.
  const draft = data?.draft ?? null;
  useEffect(() => {
    if (dirty) return;
    if (draft) {
      setTitle(draft.title);
      setBody(draft.bodyTemplate);
      setChangelog(draft.changelog ?? "");
    } else if (data) {
      setTitle(data.published?.title ?? "SDP Billing Terms & Conditions");
      setBody(data.published?.bodyTemplate ?? "");
      setChangelog("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id, draft?.updatedAt, data?.published?.id]);

  const invalidate = () => {
    queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith(ADMIN_KEY) });
    queryClient.invalidateQueries({ queryKey: [BILLING_TERMS_CURRENT_KEY] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { title, bodyTemplate: body, changelog: changelog || null };
      const res = draft
        ? await apiRequest("PUT", `${ADMIN_KEY}/${draft.id}`, payload)
        : await apiRequest("POST", ADMIN_KEY, payload);
      return res.json();
    },
    onSuccess: () => {
      setDirty(false);
      invalidate();
      toast({ title: "Draft saved" });
    },
    onError: (err) => toast({ title: "Couldn't save the draft", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error("No draft to publish");
      const res = await apiRequest("POST", `${ADMIN_KEY}/${draft.id}/publish`, { changelog: changelog || null });
      return res.json() as Promise<BillingTermsVersion>;
    },
    onSuccess: (v) => {
      setPublishOpen(false);
      setDirty(false);
      invalidate();
      toast({ title: `Published v${v.versionNumber}`, description: "Businesses now accept this version on new contracts." });
    },
    onError: (err) => toast({ title: "Couldn't publish", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" }),
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `${ADMIN_KEY}/preview`, { bodyTemplate: body });
      return res.json() as Promise<{ text: string }>;
    },
    onSuccess: (r) => setPreviewText(r.text),
    onError: (err) => toast({ title: "Couldn't render the preview", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" }),
  });

  const insertPlaceholder = (name: string) => {
    const el = bodyRef.current;
    const token = `{{${name}}}`;
    if (!el) {
      setBody((b) => b + token);
      setDirty(true);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    setDirty(true);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SDP Billing Terms</CardTitle>
          <CardDescription>Only SDP super admins and admins can edit the billing terms.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const published = data?.published ?? null;
  const versions = versionsData?.items ?? [];
  const canPublish = !!draft && !dirty && !!draft.bodyTemplate.trim();

  return (
    <div className="space-y-6" data-testid="panel-billing-terms-admin">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">SDP Billing Terms &amp; Conditions</CardTitle>
          <CardDescription>
            The legal text a business accepts on every contract where SDP Global Pay acts as the billing entity
            ("SDP Global Pay as Billing Agent" and "Auto Invoice upon Approval"). Publishing creates a new version;
            earlier acceptances keep the text they were given.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error ? (
            <Alert variant="destructive"><AlertDescription>{extractApiErrorMessage(error, "Couldn't load the billing terms.")}</AlertDescription></Alert>
          ) : published ? (
            <Alert className="border-green-200 bg-green-50" data-testid="alert-billing-terms-published">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900 text-sm">
                Published: <span className="font-medium">v{published.versionNumber}</span> on{" "}
                {published.publishedAt ? new Date(published.publishedAt).toLocaleString() : "—"}.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-amber-300 bg-amber-50" data-testid="alert-billing-terms-unpublished">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900 text-sm">
                No published version. Contracts using "SDP Global Pay as Billing Agent" or "Auto Invoice upon Approval" are blocked until you publish.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-secondary-900">
                  {draft ? `Draft v${draft.versionNumber}` : "New draft"}
                  {dirty && <span className="ml-2 text-xs font-normal text-amber-700">unsaved changes</span>}
                </h3>
              </div>
              <div className="space-y-1">
                <Label htmlFor="bt-title">Title</Label>
                <Input id="bt-title" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} data-testid="input-billing-terms-title" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bt-body">Terms text</Label>
                <Textarea
                  id="bt-body"
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => { setBody(e.target.value); setDirty(true); }}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Paste the billing terms here. Use the placeholders on the right for the business and SDP entity names."
                  data-testid="textarea-billing-terms-body"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bt-changelog">What changed (shown in the version history)</Label>
                <Input id="bt-changelog" value={changelog} onChange={(e) => { setChangelog(e.target.value); setDirty(true); }} placeholder="e.g. Updated payment collection clause" data-testid="input-billing-terms-changelog" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !body.trim()} data-testid="button-billing-terms-save">
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save draft
                </Button>
                <Button type="button" variant="outline" onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending || !body.trim()} data-testid="button-billing-terms-preview">
                  <Eye className="h-4 w-4 mr-1" /> Preview
                </Button>
                <Button type="button" variant="secondary" onClick={() => setPublishOpen(true)} disabled={!canPublish} title={dirty ? "Save the draft first" : undefined} data-testid="button-billing-terms-publish">
                  <Upload className="h-4 w-4 mr-1" /> Publish
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-secondary-900">Placeholders</h4>
              <p className="text-xs text-muted-foreground">Click to insert at the cursor. They are replaced with the business and SDP entity details when shown.</p>
              <ul className="space-y-1">
                {BILLING_TERMS_PLACEHOLDERS.map((p) => (
                  <li key={p.name}>
                    <button type="button" className="w-full text-left rounded border px-2 py-1.5 hover:bg-secondary-50" onClick={() => insertPlaceholder(p.name)} data-testid={`button-placeholder-${p.name}`}>
                      <code className="text-xs text-accent-700">{`{{${p.name}}}`}</code>
                      <div className="text-xs text-muted-foreground">{p.description}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-4 w-4" /> Version history</CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No versions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-billing-terms-versions">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-secondary-600 border-b">
                    <th className="py-2 pr-3">Version</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Published</th>
                    <th className="py-2 pr-3">Changelog</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {versions.map((v) => (
                    <tr key={v.id}>
                      <td className="py-2 pr-3 font-medium">v{v.versionNumber}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={v.status === "published" ? "default" : "secondary"} className={v.status === "published" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>{v.status}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{v.publishedAt ? new Date(v.publishedAt).toLocaleString() : "—"}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{v.changelog || "—"}</td>
                      <td className="py-2 text-right">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setViewVersion(v)} data-testid={`button-billing-terms-view-v${v.versionNumber}`}>View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={publishOpen} onOpenChange={setPublishOpen}>
        <AlertDialogContent data-testid="dialog-billing-terms-publish">
          <AlertDialogHeader>
            <AlertDialogTitle>Publish v{draft?.versionNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              From now on every new contract using "SDP Global Pay as Billing Agent" or "Auto Invoice upon Approval" asks the business to accept this version.
              {published ? ` Version ${published.versionNumber} is superseded; acceptances already recorded keep their text.` : ""}
              {changelog ? ` Changelog: "${changelog}".` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-billing-terms-publish-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); publishMutation.mutate(); }} disabled={publishMutation.isPending} data-testid="button-billing-terms-publish-confirm">
              {publishMutation.isPending ? "Publishing…" : "Publish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={previewText !== null} onOpenChange={(o) => !o && setPreviewText(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0" data-testid="dialog-billing-terms-preview">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle>{title || "Preview"}</DialogTitle>
            <DialogDescription>Rendered with sample business and SDP entity details.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 whitespace-pre-wrap text-sm leading-6">{previewText}</div>
          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setPreviewText(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewVersion} onOpenChange={(o) => !o && setViewVersion(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0" data-testid="dialog-billing-terms-version">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle>{viewVersion?.title} · v{viewVersion?.versionNumber}</DialogTitle>
            <DialogDescription>Raw template with placeholders. Status: {viewVersion?.status}.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 whitespace-pre-wrap font-mono text-sm leading-6">{viewVersion?.bodyTemplate}</div>
          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setViewVersion(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
