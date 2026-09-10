import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ExternalLink, Globe } from "lucide-react";
import {
  canonicaliseCountry,
  COUNTRY_CURRENCIES,
  COUNTRY_EMPLOYMENT_NOTES,
  DEFAULT_CONTRACTOR_ONCOSTS,
  DEFAULT_EMPLOYER_ONCOSTS,
  DEFAULT_JURISDICTIONS_OVERLAY,
  type OnCostItem,
} from "@shared/countryEmploymentData";
import { CountryIntelChat } from "./country-intel-chat";

interface CountryIntelPanelProps {
  country?: { id: string; name: string; code: string; currency?: string } | null;
  employmentType?: string;
  defaultOpen?: boolean;
}

const CONTRACTOR_ENGAGEMENT_TYPES = ["contractor", "gig_worker", "third_party_worker"];

function formatOnCostValue(item: OnCostItem, currencySymbol: string): string {
  if (item.type === "flat") return `${currencySymbol}${item.value.toLocaleString()}`;
  return `${item.value}%`;
}

function onCostQualifier(item: OnCostItem, currencySymbol: string): string | null {
  if (item.type === "percent_with_cap" && item.capAmount) {
    return `capped at ${currencySymbol}${item.capAmount.toLocaleString()}`;
  }
  if (item.type === "percent_above_threshold" && item.thresholdAmount) {
    return `above ${currencySymbol}${item.thresholdAmount.toLocaleString()} threshold`;
  }
  return null;
}

/**
 * Curated country intelligence for the contract wizard — deterministic render
 * from @shared/countryEmploymentData (same source as /resources). No AI call.
 * Renders nothing for countries outside the curated set.
 */
export function CountryIntelPanel({ country, employmentType, defaultOpen }: CountryIntelPanelProps) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  const canonical = country ? canonicaliseCountry(country.code) : null;
  if (!country || !canonical) return null;

  const isContractorSet = CONTRACTOR_ENGAGEMENT_TYPES.includes(employmentType ?? "");
  const onCosts = (isContractorSet ? DEFAULT_CONTRACTOR_ONCOSTS : DEFAULT_EMPLOYER_ONCOSTS)[canonical] ?? [];
  const currency = COUNTRY_CURRENCIES[canonical];
  const symbol = currency?.symbol ?? "";
  const notes = COUNTRY_EMPLOYMENT_NOTES[canonical];
  const jurisdictionCount = Object.keys(DEFAULT_JURISDICTIONS_OVERLAY[canonical] ?? {}).length;

  const percentTotal = onCosts
    .filter((i) => i.type === "percent")
    .reduce((sum, i) => sum + i.value, 0);
  const conditionalCount = onCosts.filter((i) => i.type !== "percent" && i.type !== "flat").length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-blue-50 border border-blue-200 rounded-lg" data-testid="panel-country-intel">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-2 p-4 text-left"
            data-testid="button-toggle-country-intel"
          >
            <Globe className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-medium text-blue-900">
              Country intelligence — {canonical}
            </span>
            {currency && (
              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-white">
                {currency.code} {currency.symbol}
              </Badge>
            )}
            <span className="flex-1" />
            {!open && (
              <span className="text-xs text-blue-700">
                {onCosts.length} on-cost{onCosts.length === 1 ? "" : "s"}
                {percentTotal > 0 ? ` · ~${percentTotal.toFixed(2).replace(/\.?0+$/, "")}% typical` : ""}
              </span>
            )}
            {open
              ? <ChevronUp className="h-4 w-4 text-blue-600 flex-shrink-0" />
              : <ChevronDown className="h-4 w-4 text-blue-600 flex-shrink-0" />}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* On-cost table, tailored to the engagement type */}
            <div>
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                  {isContractorSet ? "Contractor engagement on-costs" : "Employer statutory on-costs"}
                </p>
                {percentTotal > 0 && (
                  <p className="text-xs text-blue-800">
                    ~{percentTotal.toFixed(2).replace(/\.?0+$/, "")}% typical total
                    {conditionalCount > 0
                      ? ` (excludes ${conditionalCount} capped/threshold item${conditionalCount === 1 ? "" : "s"})`
                      : ""}
                  </p>
                )}
              </div>
              <div className="mt-2 divide-y divide-blue-100">
                {onCosts.map((item) => {
                  const qualifier = onCostQualifier(item, symbol);
                  return (
                    <div key={item.id} className="py-1.5 flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-sm text-secondary-800">{item.name}</span>
                        {(qualifier || item.note) && (
                          <span className="block text-xs text-secondary-500">
                            {[qualifier, item.note].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-secondary-900 flex-shrink-0">
                        {formatOnCostValue(item, symbol)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {jurisdictionCount > 0 && (
              <p className="text-xs text-blue-800">
                Rates vary by state/province — {jurisdictionCount} jurisdiction{jurisdictionCount === 1 ? "" : "s"} tracked.
                Pick the jurisdiction in the /resources calculator for exact figures.
              </p>
            )}

            {notes && (
              <div>
                <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">
                  Employment notes
                </p>
                <p className="whitespace-pre-line text-sm text-secondary-700 leading-relaxed">
                  {notes}
                </p>
              </div>
            )}

            <p className="text-xs text-secondary-500 flex items-center gap-1 flex-wrap">
              SDP-maintained defaults — verify against current statutory rules.
              <a
                href="/resources"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium"
                data-testid="link-resources-calculator"
              >
                Open cost calculator
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>

            <CountryIntelChat countryName={canonical} employmentType={employmentType} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
