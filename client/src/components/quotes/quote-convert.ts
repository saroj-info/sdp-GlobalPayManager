/**
 * "Convert quote to contract": the contract wizard's prefill built from a saved
 * quote. The mapping is the documented one (`deriveContractFields` in
 * shared/quotes.ts); the wizard still asks for the worker (a quote has none)
 * and, when the quote is not linked to a business, for the business.
 */
import type { Quote } from "@shared/schema";
import { deriveContractFields } from "@shared/quotes";
import type { ContractWizardPrefill } from "@/components/modals/contract-wizard-modal";
import { draftToInput, quoteRowToDraft } from "./quote-draft";

export function quoteToWizardPrefill(q: Quote): ContractWizardPrefill {
  const f = deriveContractFields(draftToInput(quoteRowToDraft(q)), q.comparisonCurrency);
  const annual = f.rateType === "annual";
  return {
    sourceQuoteId: q.id,
    formData: {
      contractName: q.title,
      countryId: f.countryId,
      employmentType: f.employmentType,
      contractorCompliance: f.contractorCompliance ?? false,
      isForClient: f.isForClient,
      // Host client work carries the quote's billing choice; internal work keeps
      // the wizard's own default (the quote's "direct" is not a wizard option).
      ...(f.isForClient
        ? { billingMode: f.billingMode, invoiceCustomer: f.billingMode === "invoice_through_platform" }
        : {}),
      rateType: f.rateType,
      rate: String(f.rate),
      currency: f.currency,
      ...(annual && f.totalPackageValue != null ? { totalPackageValue: String(f.totalPackageValue) } : {}),
      customerCurrency: f.customerCurrency,
      ...(q.businessId ? { onBehalf: true, selectedBusinessId: q.businessId } : {}),
    },
  };
}
