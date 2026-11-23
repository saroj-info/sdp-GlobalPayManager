/**
 * "Convert quote to contract": the contract wizard's prefill built from a saved
 * quote. The mapping is the documented one (`deriveContractFields` in
 * shared/quotes.ts). When the quote names an employee with an email, step 1
 * preselects them (`quoteWorker`; the wizard swaps the placeholder for the
 * existing worker with that email, else creates the worker on submit and the
 * server emails their login). Otherwise the wizard asks for the worker, and for
 * the business when the quote is not linked to one.
 */
import type { Quote } from "@shared/schema";
import { deriveContractFields } from "@shared/quotes";
import { QUOTE_WORKER_ID, type ContractWizardPrefill } from "@/components/modals/contract-wizard-modal";
import { draftToInput, quoteRowToDraft } from "./quote-draft";

export function quoteToWizardPrefill(q: Quote): ContractWizardPrefill {
  const f = deriveContractFields(draftToInput(quoteRowToDraft(q)), q.comparisonCurrency);
  const annual = f.rateType === "annual";
  const email = q.workerEmail?.trim().toLowerCase() || "";
  const quoteWorker =
    email && q.workerFirstName?.trim() && q.workerLastName?.trim()
      ? { firstName: q.workerFirstName.trim(), lastName: q.workerLastName.trim(), email, workerType: f.workerType, workerId: q.workerId ?? null }
      : null;
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
      ...(quoteWorker ? { workerId: QUOTE_WORKER_ID } : {}),
    },
    quoteWorker,
  };
}
