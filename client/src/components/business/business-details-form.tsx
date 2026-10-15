/**
 * The business details form (country, address, registration number, optional
 * tax number) shared by the business's own profile page and the SDP admin's
 * "Edit details" dialog. Presentational: the caller owns the mutation, the
 * toast and whatever happens after a save.
 */

import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getBusinessNumberLabels,
  updateBusinessProfileSchema,
  type UpdateBusinessProfileInput,
} from "@shared/businessProfile";

export interface BusinessDetailsFormBusiness {
  name: string;
  address?: string | null;
  registrationCountryId?: string | null;
  registrationNumber?: string | null;
  taxNumber?: string | null;
}

interface BusinessDetailsFormProps {
  business: BusinessDetailsFormBusiness;
  countries: Array<{ id: string; name: string }>;
  onSubmit: (values: UpdateBusinessProfileInput) => void;
  isSaving: boolean;
  submitLabel?: string;
  /** Rendered left of the submit button (e.g. "Skip for now", "Cancel"). */
  secondaryAction?: ReactNode;
}

export function BusinessDetailsForm({
  business,
  countries,
  onSubmit,
  isSaving,
  submitLabel = "Save details",
  secondaryAction,
}: BusinessDetailsFormProps) {
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => onSubmit(values))} className="space-y-5">
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
                    <SelectValue placeholder="Select the country the business is registered in" />
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
          {secondaryAction}
          <Button type="submit" disabled={isSaving} data-testid="button-save-business-profile">
            {isSaving ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
