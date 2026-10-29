import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ExternalLink, Globe } from "lucide-react";
import { canonicaliseCountry, COUNTRY_CURRENCIES, COUNTRY_EMPLOYMENT_NOTES } from "@shared/countryEmploymentData";
import { costItemsFor, jurisdictionsOf, type CountryCostItem, type CountryCostsResponse } from "@shared/countryCosts";
import { CountryIntelChat } from "./country-intel-chat";

interface CountryIntelPanelProps {
  country?: { id: string; name: string; code: string; currency?: string } | null;
  employmentType?: string;
  defaultOpen?: boolean;
}

const CONTRACTOR_ENGAGEMENT_TYPES = ["contractor", "gig_worker", "third_party_worker"];

function formatValue(item: CountryCostItem, currencySymbol: string): string {
  if (item.calcType === "flat") return `${currencySymbol}${item.value.toLocaleString()}`;
  return `${item.value}%`;
}

function qualifier(item: CountryCostItem, currencySymbol: string): string | null {
  if (item.calcType === "percent_with_cap" && item.capAmount) return `capped at ${currencySymbol}${item.capAmount.toLocaleString()}`;
  return null;
}

/**
 * Curated country intelligence for the contract wizard: the cost items SDP
 * maintains under Templates → Cost Settings (the same rows the Quotes page
 * seeds from) plus the static employment notes. No AI call.
 */
export function CountryIntelPanel({ country, employmentType, defaultOpen }: CountryIntelPanelProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const { data } = useQuery<CountryCostsResponse>({
    queryKey: ["/api/country-costs", country?.id ?? ""],
    enabled: !!country?.id,
    staleTime: 5 * 60_000,
  });
  if (!country || !data) return null;

  const canonical = canonicaliseCountry(country.code) ?? canonicaliseCountry(country.name);
  const isContractorSet = CONTRACTOR_ENGAGEMENT_TYPES.includes(employmentType ?? "");
  const category = isContractorSet ? "contractor_standard" : "employment";
  const onCosts = costItemsFor(data.items, { category, jurisdiction: null });
  const currency = canonical ? COUNTRY_CURRENCIES[canonical] : null;
  const symbol = currency?.symbol ?? (country.currency ? `${country.currency} ` : "");
  const notes = canonical ? COUNTRY_EMPLOYMENT_NOTES[canonical] : null;
  const stateCount = jurisdictionsOf(data.items).length;

  const percentTotal = onCosts.filter((i) => i.calcType === "percent").reduce((sum, i) => sum + i.value, 0);
  const conditionalCount = onCosts.filter((i) => i.calcType !== "percent" && i.calcType !== "flat").length;
  const fmtPct = (n: number) => n.toFixed(2).replace(/\.?0+$/, "");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-blue-50 border border-blue-200 rounded-lg" data-testid="panel-country-intel">
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full flex items-center gap-2 p-4 text-left" data-testid="button-toggle-country-intel">
            <Globe className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-medium text-blue-900">Country intelligence — {country.name}</span>
            {(currency || country.currency) && (
              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-white">
                {currency ? `${currency.code} ${currency.symbol}` : country.currency}
              </Badge>
            )}
            <span className="flex-1" />
            {!open && (
              <span className="text-xs text-blue-700">
                {onCosts.length} on-cost{onCosts.length === 1 ? "" : "s"}
                {percentTotal > 0 ? ` · ~${fmtPct(percentTotal)}% typical` : ""}
              </span>
            )}
            {open ? <ChevronUp className="h-4 w-4 text-blue-600 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-blue-600 flex-shrink-0" />}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <div>
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                  {isContractorSet ? "Contractor engagement on-costs" : "Employer statutory on-costs"}
                </p>
                {percentTotal > 0 && (
                  <p className="text-xs text-blue-800">
                    ~{fmtPct(percentTotal)}% typical total
                    {conditionalCount > 0 ? ` (excludes ${conditionalCount} capped item${conditionalCount === 1 ? "" : "s"})` : ""}
                  </p>
                )}
              </div>
              {onCosts.length === 0 ? (
                <p className="mt-2 text-xs text-secondary-500">No cost items are set up for this country yet (Templates → Cost Settings).</p>
              ) : (
                <div className="mt-2 divide-y divide-blue-100">
                  {onCosts.map((item) => {
                    const q = qualifier(item, symbol);
                    return (
                      <div key={item.id} className="py-1.5 flex items-baseline justify-between gap-3" data-testid={`country-intel-item-${item.itemKey}`}>
                        <div className="min-w-0">
                          <span className="text-sm text-secondary-800">{item.name}</span>
                          {(q || item.description) && (
                            <span className="block text-xs text-secondary-500">{[q, item.description].filter(Boolean).join(" · ")}</span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-secondary-900 flex-shrink-0">{formatValue(item, symbol)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {stateCount > 0 && (
              <p className="text-xs text-blue-800">
                Rates vary by state/province — {stateCount} state{stateCount === 1 ? "" : "s"} tracked. Pick the state on a quote or in the cost calculator for exact figures.
              </p>
            )}

            {notes && (
              <div>
                <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">Employment notes</p>
                <p className="whitespace-pre-line text-sm text-secondary-700 leading-relaxed">{notes}</p>
              </div>
            )}

            <p className="text-xs text-secondary-500 flex items-center gap-1 flex-wrap">
              SDP-maintained Cost Settings — verify against current statutory rules.
              <a href="/resources" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium" data-testid="link-resources-calculator">
                Open the cost calculator
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>

            <CountryIntelChat countryName={canonical ?? country.name} employmentType={employmentType} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
