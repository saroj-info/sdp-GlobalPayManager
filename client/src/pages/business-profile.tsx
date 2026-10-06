/**
 * Business Profile — where a business user fills in their business address,
 * country, registration number and optional tax number.
 *
 * Business users land here after login while details are missing (the gate is
 * in pages/dashboard/index.tsx) and can skip; contracts cannot be created
 * until the details are saved. Rules for "missing" and the per-country labels
 * live in shared/businessProfile.ts.
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLoader } from "@/components/ui/loader";
import { apiRequest, extractApiErrorMessage, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { markPromptedForBusinessProfile } from "@/lib/businessProfilePrompt";
import {
  describeMissingBusinessDetails,
  getBusinessNumberLabels,
  getMissingBusinessDetails,
  requiresBusinessProfile,
  updateBusinessProfileSchema,
  type UpdateBusinessProfileInput,
} from "@shared/businessProfile";
import type { Business } from "@shared/schema";

export default function BusinessProfile() {
  const { user, isAuthenticated, authReady } = useAuth();
  const [, setLocation] = useLocation();
  usePageHeader("Business Profile", "Your business address and registration details");

  const isBusinessUser = user?.userType === "business_user";

  // Only for the business view; everyone else goes back to their dashboard.
  useEffect(() => {
    if (authReady && isAuthenticated && !isBusinessUser) {
      setLocation("/", { replace: true });
    }
  }, [authReady, isAuthenticated, isBusinessUser, setLocation]);

  // Reaching this page counts as this login's prompt, so "Skip for now" (or a
  // later dashboard visit) does not bounce straight back here.
  useEffect(() => {
    markPromptedForBusinessProfile();
  }, []);

  if (!authReady) return <PageLoader label="Loading business profile" />;

  if (!isAuthenticated || !user) {
    window.location.href = "/login";
    return null;
  }

  if (!isBusinessUser) return null;

  const business = user.business;
  // No business yet, or a host-client login: nothing to fill in here.
  if (!business || !requiresBusinessProfile(business)) {
    return (
      <div className="min-h-full bg-muted/30">
        <div className="mx-auto max-w-2xl p-6">
          <div className="rounded-xl border bg-card p-10 text-center shadow-sm" data-testid="notice-business-profile-unavailable">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-3 text-base font-semibold">
              {business ? "No business details to fill in" : "Your business isn't set up yet"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {business
                ? "Business details are not needed for this account."
                : "Business details can be added once your business has been set up."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <BusinessProfileForm business={business} />;
}

function BusinessProfileForm({ business }: { business: Business }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Same list (and cache entry) the app shell loads.
  const { data: countries = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/countries"],
  });

  const missing = getMissingBusinessDetails(business);
  const isIncomplete = missing.length > 0;

  const form = useForm<UpdateBusinessProfileInput>({
    resolver: zodResolver(updateBusinessProfileSchema),
    defaultValues: {
      address: business.address ?? "",
      registrationCountryId: business.registrationCountryId ?? "",
      registrationNumber: business.registrationNumber ?? "",
      taxNumber: business.taxNumber ?? "",
    },
  });

  const numberLabels = getBusinessNumberLabels(form.watch("registrationCountryId"));

  const saveMutation = useMutation({
    mutationFn: async (values: UpdateBusinessProfileInput) => {
      const res = await apiRequest("PATCH", "/api/businesses/me", values);
      return (await res.json()) as Business;
    },
    // Callbacks stay here, not on mutate(): updating the cached user re-renders
    // the router, which remounts this page (inline route components), and
    // per-call callbacks are dropped once the calling component is gone.
    onSuccess: (updated) => {
      const cachedUser = queryClient.getQueryData<{ business?: Business | null }>(["/api/auth/user"]);
      const wasIncomplete = getMissingBusinessDetails(cachedUser?.business).length > 0;

      toast({
        title: "Business details saved",
        description: wasIncomplete ? "Your business profile is complete." : "Your business profile has been updated.",
      });
      // Write the saved row into the cached user instead of refetching, so the
      // reminder bar and the contract block clear in the same step as the
      // move to the dashboard.
      queryClient.setQueryData(["/api/auth/user"], (old: any) => (old ? { ...old, business: updated } : old));
      queryClient.invalidateQueries({
        predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/businesses"),
      });
      if (wasIncomplete) setLocation("/dashboard");
    },
    onError: (err) => {
      toast({
        title: "Couldn't save business details",
        description: extractApiErrorMessage(err, "Please try again."),
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-full bg-muted/30">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {isIncomplete && (
          <Alert className="border-amber-200 bg-amber-50" data-testid="alert-business-profile-incomplete">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              Missing: {describeMissingBusinessDetails(missing, business.registrationCountryId)}. You cannot create
              contracts until these details are saved.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Business details</CardTitle>
            <CardDescription>The registered details of your business.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business name</Label>
                  <Input id="business-name" value={business.name} readOnly disabled data-testid="input-business-name" />
                </div>

                <FormField
                  control={form.control}
                  name="registrationCountryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-business-country">
                            <SelectValue placeholder="Select the country your business is registered in" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.id} value={country.id}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business address *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={3}
                          placeholder="Street, city, state or region, postcode"
                          data-testid="input-business-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="registrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{numberLabels.registration} *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-business-registration-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{numberLabels.tax} (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} data-testid="input-business-tax-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-wrap justify-end gap-3 pt-2">
                  {isIncomplete && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation("/dashboard")}
                      disabled={saveMutation.isPending}
                      data-testid="button-skip-business-profile"
                    >
                      Skip for now
                    </Button>
                  )}
                  <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-business-profile">
                    {saveMutation.isPending ? "Saving..." : "Save details"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
