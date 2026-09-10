import { useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Globe } from "lucide-react";
import { useAuthenticatedLayout } from "@/contexts/AuthenticatedLayoutContext";
import { usePersistent } from "@/hooks/usePersistent";
import { canonicaliseCountry } from "@shared/countryEmploymentData";
import { CountryIntelPanel } from "@/components/contract-wizard/country-intel-panel";

interface CountryIntelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Standalone Country Intelligence modal, opened from the header. Reuses the
 * contract wizard's CountryIntelPanel wholesale — curated on-costs/notes,
 * the Ask AI chat, and its saved-conversation history all come with it.
 * Countries without curated data are filtered out of the picker.
 */
export function CountryIntelModal({ open, onOpenChange }: CountryIntelModalProps) {
  const { countries } = useAuthenticatedLayout();
  const [countryId, setCountryId] = usePersistent<string>("country_intel_country", "");
  const [engagement, setEngagement] = usePersistent<string>("country_intel_engagement", "permanent");

  const curatedCountries = useMemo(
    () => (countries ?? []).filter((c: any) => !!canonicaliseCountry(c.code)),
    [countries],
  );

  const selectedCountry = curatedCountries.find((c: any) => c.id === countryId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Country Intelligence
          </DialogTitle>
          <DialogDescription>
            Employer costs, employment notes and AI Q&A for the countries SDP operates in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label className="text-xs text-secondary-600 mb-1 block">Country</Label>
            <Select value={countryId} onValueChange={setCountryId}>
              <SelectTrigger data-testid="select-country-intel-country">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {curatedCountries.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-44">
            <Label className="text-xs text-secondary-600 mb-1 block">Engagement</Label>
            <Select value={engagement} onValueChange={setEngagement}>
              <SelectTrigger data-testid="select-country-intel-engagement">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permanent">Employee</SelectItem>
                <SelectItem value="contractor">Contractor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedCountry ? (
          <CountryIntelPanel
            key={selectedCountry.id}
            country={selectedCountry}
            employmentType={engagement}
            defaultOpen
          />
        ) : (
          <div className="text-center py-10 text-secondary-500">
            <Globe className="mx-auto h-10 w-10 text-secondary-300 mb-3" />
            <p className="text-sm">Pick a country to see its employment intelligence.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
