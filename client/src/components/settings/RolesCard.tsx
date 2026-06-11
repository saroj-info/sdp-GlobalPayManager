import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Briefcase, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";

const ROLE_LABEL: Record<string, string> = {
  business_user: "Business",
  worker: "Worker",
};

/**
 * Dual-role: lets a user add their second role (worker<->business) and shows the
 * status when they already have one. The active-role SWITCHER itself lives in the
 * header; this card is the self-service provisioning + info surface.
 */
export function RolesCard() {
  const { toast } = useToast();
  const { user, activeRole, availableRoles, switchRole } = useAuth();
  const primaryRole = (user as any)?.primaryRole as string | undefined;

  const [open, setOpen] = useState<null | "business" | "worker">(null);
  const [submitting, setSubmitting] = useState(false);
  const [bizForm, setBizForm] = useState({ name: "", country: "" });
  const [workerForm, setWorkerForm] = useState({ phoneNumber: "", country: "" });

  const { data: rawCountries = [] } = useQuery<any[]>({ queryKey: ["/api/countries"] });
  const countries = (() => {
    const seen = new Set<string>();
    return rawCountries.filter((c: any) => {
      const key = (c.code || "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  // SDP users are never dual-role.
  if (primaryRole === "sdp_internal") return null;

  const hasAddedRole = availableRoles.length > 1;
  const addedRole = availableRoles.find((r) => r !== primaryRole);

  async function submitSetup(kind: "business" | "worker") {
    setSubmitting(true);
    try {
      const url = kind === "business" ? "/api/auth/setup-business" : "/api/auth/setup-worker";
      const body = kind === "business" ? { name: bizForm.name, country: bizForm.country } : workerForm;
      const res = await apiRequest("POST", url, body);
      const data = await res.json();
      if (data?.token) localStorage.setItem("authToken", data.token);
      // Strict isolation: wipe all cached data, then land in the newly-created role.
      queryClient.clear();
      toast({ title: "Role added", description: `Your ${kind === "business" ? "business" : "worker profile"} is set up. You're now in the ${kind === "business" ? "Business" : "Worker"} view.` });
      window.location.href = "/";
    } catch (error: any) {
      setSubmitting(false);
      toast({ title: "Setup failed", description: error?.message || "Could not set up the role.", variant: "destructive" });
    }
  }

  async function handleSwitch() {
    if (!addedRole) return;
    try {
      await switchRole(activeRole === primaryRole ? addedRole : (primaryRole as string));
      window.location.href = "/";
    } catch (error: any) {
      toast({ title: "Switch failed", description: error?.message || "Could not switch view.", variant: "destructive" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5" />
          Roles &amp; Views
        </CardTitle>
        <CardDescription>
          Operate as both a business and a worker from this single login. Each view keeps its
          contracts, timesheets and invoices completely separate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasAddedRole ? (
          <div className="flex items-start gap-3 rounded-md border p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                You have a {ROLE_LABEL[primaryRole || ""]} account and a {ROLE_LABEL[addedRole || ""]} profile.
              </p>
              <p className="text-sm text-muted-foreground">
                Currently active: <span className="font-medium">{ROLE_LABEL[activeRole || ""] || activeRole} View</span>.
                Use the account menu (top right) or the button below to switch.
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={handleSwitch} data-testid="button-roles-switch">
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Switch to {ROLE_LABEL[(activeRole === primaryRole ? addedRole : primaryRole) || ""]} View
              </Button>
            </div>
          </div>
        ) : primaryRole === "worker" ? (
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Add a business</p>
              <p className="text-sm text-muted-foreground">
                Set up a business to hire workers and onhire services, alongside your worker profile.
              </p>
            </div>
            <Button onClick={() => setOpen("business")} data-testid="button-setup-business">
              <Building2 className="mr-2 h-4 w-4" />
              Set up a business
            </Button>
          </div>
        ) : primaryRole === "business_user" ? (
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Add a worker profile</p>
              <p className="text-sm text-muted-foreground">
                Set up a worker profile to personally provide services to other businesses.
              </p>
            </div>
            <Button onClick={() => setOpen("worker")} data-testid="button-setup-worker">
              <Briefcase className="mr-2 h-4 w-4" />
              Set up a worker profile
            </Button>
          </div>
        ) : null}
      </CardContent>

      {/* Business setup dialog */}
      <Dialog open={open === "business"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Set up a business</DialogTitle>
            <DialogDescription>Create a business account. You can switch into it any time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="biz-name">Business name</Label>
              <Input id="biz-name" value={bizForm.name} onChange={(e) => setBizForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. J2 Pty Ltd" data-testid="input-biz-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-country">Country</Label>
              <select id="biz-country" className="w-full rounded-md border bg-background p-2 text-sm" value={bizForm.country} onChange={(e) => setBizForm((f) => ({ ...f, country: e.target.value }))} data-testid="select-biz-country">
                <option value="">Select a country (optional)</option>
                {countries.map((c: any) => (<option key={c.id} value={c.code}>{c.name}</option>))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)} disabled={submitting}>Cancel</Button>
            <Button onClick={() => submitSetup("business")} disabled={submitting || !bizForm.name.trim()} data-testid="button-confirm-setup-business">
              {submitting ? "Creating…" : "Create business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Worker setup dialog */}
      <Dialog open={open === "worker"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Set up a worker profile</DialogTitle>
            <DialogDescription>Create an independent worker profile. You can switch into it any time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="wk-phone">Phone number</Label>
              <Input id="wk-phone" value={workerForm.phoneNumber} onChange={(e) => setWorkerForm((f) => ({ ...f, phoneNumber: e.target.value }))} placeholder="Optional" data-testid="input-wk-phone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wk-country">Country</Label>
              <select id="wk-country" className="w-full rounded-md border bg-background p-2 text-sm" value={workerForm.country} onChange={(e) => setWorkerForm((f) => ({ ...f, country: e.target.value }))} data-testid="select-wk-country">
                <option value="">Select a country (optional)</option>
                {countries.map((c: any) => (<option key={c.id} value={c.code}>{c.name}</option>))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)} disabled={submitting}>Cancel</Button>
            <Button onClick={() => submitSetup("worker")} disabled={submitting} data-testid="button-confirm-setup-worker">
              {submitting ? "Creating…" : "Create worker profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
