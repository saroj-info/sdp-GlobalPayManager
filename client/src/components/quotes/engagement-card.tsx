/**
 * Card "Engagement": country, jurisdiction, engagement category, engagement
 * type (same list as the Create Contract wizard), where the worker works and
 * whether SDP acts as billing agent.
 */
import { Briefcase } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Country } from "@shared/schema";
import { getEngagementTypes } from "@shared/engagementTypes";
import {
  QUOTE_ENGAGEMENT_CATEGORIES,
  QUOTE_ENGAGEMENT_CATEGORY_DESCRIPTIONS,
  QUOTE_ENGAGEMENT_CATEGORY_LABELS,
  QUOTE_WORK_LOCATIONS,
  QUOTE_WORK_LOCATION_DESCRIPTIONS,
  QUOTE_WORK_LOCATION_LABELS,
  type QuoteEngagementCategory,
} from "@shared/quotes";
import type { QuoteDraft } from "./quote-draft";

interface EngagementCardProps {
  draft: QuoteDraft;
  countries: Country[];
  jurisdictions: string[];
  onChange: (patch: Partial<QuoteDraft>) => void;
}

interface Option {
  value: string;
  label: string;
  description: string;
}

function OptionCards({
  value,
  options,
  onChange,
  columns,
  testId,
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  columns: string;
  testId: string;
}) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className={cn("grid gap-3", columns)} data-testid={testId}>
      {options.map((opt) => {
        const selected = opt.value === value;
        const id = `${testId}-${opt.value}`;
        return (
          <Label
            key={opt.value}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
              selected ? "border-primary bg-primary-50" : "border-secondary-200 hover:bg-secondary-50",
            )}
            data-testid={`${testId}-${opt.value}`}
          >
            <RadioGroupItem value={opt.value} id={id} className="mt-0.5" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-secondary-900">{opt.label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-secondary-600">{opt.description}</span>
            </span>
          </Label>
        );
      })}
    </RadioGroup>
  );
}

export function EngagementCard({ draft, countries, jurisdictions, onChange }: EngagementCardProps) {
  const workerType = draft.engagementCategory === "employment" ? "employee" : "contractor";
  const engagementTypes = getEngagementTypes(draft.countryId, workerType);

  const setCategory = (value: string) => {
    const category = value as QuoteEngagementCategory;
    const types = getEngagementTypes(draft.countryId, category === "employment" ? "employee" : "contractor");
    const keep = types.some((t) => t.value === draft.employmentType);
    onChange({ engagementCategory: category, employmentType: keep ? draft.employmentType : (types[0]?.value ?? draft.employmentType) });
  };

  const setCountry = (countryId: string) => {
    const country = countries.find((c) => c.id === countryId);
    const types = getEngagementTypes(countryId, workerType);
    const keep = types.some((t) => t.value === draft.employmentType);
    onChange({
      countryId,
      currency: country?.currency ?? draft.currency,
      jurisdiction: "",
      employmentType: keep ? draft.employmentType : (types[0]?.value ?? draft.employmentType),
    });
  };

  const setWorkLocation = (value: string) => {
    const isForClient = value === "host_client";
    onChange({ isForClient, sdpIsBillingAgent: isForClient ? draft.sdpIsBillingAgent : false });
  };

  return (
    <Card data-testid="quote-engagement-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="h-4 w-4 text-primary-600" /> Engagement
        </CardTitle>
        <CardDescription>Country, engagement and where the worker works. These are the same choices the contract wizard uses.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="quote-country" className="mb-1 block text-xs font-medium text-secondary-600">Country</Label>
            <Select value={draft.countryId} onValueChange={setCountry}>
              <SelectTrigger id="quote-country" className="h-9" data-testid="select-quote-country">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.currency})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="quote-jurisdiction" className="mb-1 block text-xs font-medium text-secondary-600">State / province</Label>
            <Select
              value={draft.jurisdiction || "__none__"}
              onValueChange={(v) => onChange({ jurisdiction: v === "__none__" ? "" : v })}
              disabled={jurisdictions.length === 0}
            >
              <SelectTrigger id="quote-jurisdiction" className="h-9" data-testid="select-quote-jurisdiction">
                <SelectValue placeholder={jurisdictions.length ? "Select" : "None for this country"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{jurisdictions.length ? "None (country-wide only)" : "None for this country"}</SelectItem>
                {jurisdictions.map((j) => (
                  <SelectItem key={j} value={j}>{j}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="mb-2 block text-xs font-medium text-secondary-600">Engagement category</Label>
          <OptionCards
            value={draft.engagementCategory}
            onChange={setCategory}
            columns="grid-cols-1 md:grid-cols-3"
            testId="quote-category"
            options={QUOTE_ENGAGEMENT_CATEGORIES.map((c) => ({
              value: c,
              label: QUOTE_ENGAGEMENT_CATEGORY_LABELS[c],
              description: QUOTE_ENGAGEMENT_CATEGORY_DESCRIPTIONS[c],
            }))}
          />
        </div>

        <div>
          <Label className="mb-2 block text-xs font-medium text-secondary-600">Engagement type</Label>
          <OptionCards
            value={draft.employmentType}
            onChange={(v) => onChange({ employmentType: v })}
            columns="grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            testId="quote-engagement-type"
            options={engagementTypes}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <Label className="mb-2 block text-xs font-medium text-secondary-600">Where will the worker work?</Label>
            <OptionCards
              value={draft.isForClient ? "host_client" : "internal"}
              onChange={setWorkLocation}
              columns="grid-cols-1"
              testId="quote-work-location"
              options={QUOTE_WORK_LOCATIONS.map((w) => ({
                value: w,
                label: QUOTE_WORK_LOCATION_LABELS[w],
                description: QUOTE_WORK_LOCATION_DESCRIPTIONS[w],
              }))}
            />
          </div>
          <div className={cn(!draft.isForClient && "hidden lg:block lg:invisible")} data-testid="quote-billing-agent-block">
            <Label className="mb-2 block text-xs font-medium text-secondary-600">Does SDP Global Pay act as billing agent?</Label>
            <OptionCards
              value={draft.sdpIsBillingAgent ? "yes" : "no"}
              onChange={(v) => onChange({ sdpIsBillingAgent: v === "yes" })}
              columns="grid-cols-1"
              testId="quote-billing-agent"
              options={[
                { value: "yes", label: "Yes — SDP Global Pay as Billing Agent", description: "SDP invoices the host client directly on timesheet approval." },
                { value: "no", label: "No — the business invoices the host client", description: "The platform generates the business's invoice for the host client." },
              ]}
            />
            <p className="mt-2 text-xs text-secondary-500">SDP fees differ when SDP is the billing agent.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
