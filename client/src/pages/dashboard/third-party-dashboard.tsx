/**
 * third_party_business dashboard — a static welcome page. This role has no
 * data scoping anywhere in the platform yet, so the page deliberately makes
 * ZERO API calls beyond the auth user already in cache.
 */

import { Link } from "wouter";
import { Handshake, Settings, ShieldCheck, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { GreetingBand, timeGreeting } from "@/components/dashboard/greeting-band";

export function ThirdPartyDashboard() {
  const { user } = useAuth();
  usePageHeader("Partner Portal", "Your SDP Global Pay partner account");

  return (
    <div className="min-h-full bg-muted/30">
      <div className="mx-auto max-w-[1400px] space-y-6 p-6">
        <GreetingBand greeting={timeGreeting(user?.firstName)} chip="Partner" />

        <section className="rounded-xl border bg-card text-card-foreground shadow-sm p-6" data-testid="dashboard-partner-welcome">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-3 text-primary">
              <Handshake className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold">Welcome to SDP Global Pay</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You're signed in as{" "}
                <span className="font-medium text-foreground">
                  {user?.firstName} {user?.lastName}
                </span>
                {user?.email ? <> ({user.email})</> : null} with a partner account. Your SDP contact
                will share workforce and contract details with you directly as engagements are set up.
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Link
            href="/settings"
            className="group rounded-xl border bg-card text-card-foreground shadow-sm p-5 transition-colors hover:border-primary/40"
            data-testid="dashboard-link-settings"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Settings className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Account Settings</p>
                  <p className="text-xs text-muted-foreground">Profile and preferences</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          <Link
            href="/security-settings"
            className="group rounded-xl border bg-card text-card-foreground shadow-sm p-5 transition-colors hover:border-primary/40"
            data-testid="dashboard-link-security"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <ShieldCheck className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Security</p>
                  <p className="text-xs text-muted-foreground">Password and two-factor auth</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
