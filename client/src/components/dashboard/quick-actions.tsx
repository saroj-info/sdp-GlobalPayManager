/**
 * Add Worker / New Contract quick actions for the business and SDP
 * dashboards. The contract wizard's workers list is fetched lazily (only
 * once the wizard opens) so the dashboard itself stays light.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthenticatedLayout } from "@/contexts/AuthenticatedLayoutContext";
import { AddWorkerModal, ContractWizardModal } from "@/components/modals";
import { BusinessProfileRequiredDialog } from "@/components/modals/business-profile-required-dialog";
import { useMissingBusinessDetails } from "@/hooks/useBusinessProfile";

export function DashboardQuickActions() {
  const { countries } = useAuthenticatedLayout();
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showProfileRequired, setShowProfileRequired] = useState(false);
  // A business user cannot create a contract while business details are missing.
  const { isIncomplete: businessProfileIncomplete } = useMissingBusinessDetails();

  const { data: workers = [] } = useQuery<any[]>({
    queryKey: ["/api/workers"],
    enabled: showWizard,
  });

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowAddWorker(true)} data-testid="button-quick-add-worker">
        <UserPlus className="mr-1.5 h-4 w-4" /> Add Worker
      </Button>
      <Button
        size="sm"
        onClick={() => (businessProfileIncomplete ? setShowProfileRequired(true) : setShowWizard(true))}
        data-testid="button-quick-new-contract"
      >
        <FilePlus2 className="mr-1.5 h-4 w-4" /> New Contract
      </Button>

      <AddWorkerModal open={showAddWorker} onOpenChange={setShowAddWorker} countries={countries ?? []} />
      {showWizard && (
        <ContractWizardModal
          open={showWizard}
          onOpenChange={setShowWizard}
          workers={workers}
          countries={countries ?? []}
        />
      )}
      <BusinessProfileRequiredDialog open={showProfileRequired} onOpenChange={setShowProfileRequired} />
    </>
  );
}
