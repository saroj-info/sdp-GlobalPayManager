/**
 * SDP admin: edit a customer business's details (country, address,
 * registration number, tax number) from the Businesses page.
 * Saves with PATCH /api/businesses/:id/profile.
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BusinessDetailsForm, type BusinessDetailsFormBusiness } from "@/components/business/business-details-form";
import { apiRequest, extractApiErrorMessage, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UpdateBusinessProfileInput } from "@shared/businessProfile";
import type { Business } from "@shared/schema";

interface BusinessDetailsDialogProps {
  business: (BusinessDetailsFormBusiness & { id: string }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BusinessDetailsDialog({ business, open, onOpenChange }: BusinessDetailsDialogProps) {
  const { toast } = useToast();

  const { data: countries = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/countries"],
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: UpdateBusinessProfileInput) => {
      const res = await apiRequest("PATCH", `/api/businesses/${business!.id}/profile`, values);
      return (await res.json()) as Business;
    },
    onSuccess: (updated) => {
      toast({ title: "Business details saved", description: `${updated.name} has been updated.` });
      queryClient.invalidateQueries({
        predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/businesses"),
      });
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={(next) => { if (!saveMutation.isPending) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-testid="dialog-business-details">
        <DialogHeader>
          <DialogTitle>Edit business details</DialogTitle>
          <DialogDescription>
            The registered details of {business?.name ?? "this business"}. Contracts for the business cannot be
            created until the country, address and registration number are saved.
          </DialogDescription>
        </DialogHeader>
        {business && (
          <BusinessDetailsForm
            key={business.id}
            business={business}
            countries={countries}
            onSubmit={(values) => saveMutation.mutate(values)}
            isSaving={saveMutation.isPending}
            secondaryAction={
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saveMutation.isPending}
                data-testid="button-cancel-business-details"
              >
                Cancel
              </Button>
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
