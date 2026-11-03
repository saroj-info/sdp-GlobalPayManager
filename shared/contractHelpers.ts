export interface Contract {
  id: string;
  signedAt?: Date | null;
  emailSentAt?: Date | null;
  signatureText?: string | null;
  signingToken?: string | null;
  endDate?: Date | null;
  status: string;
}

/**
 * The unit ("tracking unit") that a worker should record on their timesheet,
 * AND that the auto-invoice customer-billing calculation uses to multiply by.
 *
 * Rule (deliberately narrow — DO NOT broaden without explicit ask):
 *   - For HOURLY or DAILY contracts: always use the worker's `rateType`. These
 *     contracts already match their billing unit; nothing to override.
 *   - For ANNUAL salary contracts that are also for a host client AND have a
 *     `customerBillingRateType` set: use the customer's billing unit. This is
 *     the only case where the worker's rateType ('annual') doesn't map to a
 *     per-period unit, so we have to derive the tracking unit from the client
 *     side. (Salary worker placed at a host client billed hourly → log HOURS.)
 *   - Anything else: fall back to the worker's `rateType` (with a default of
 *     'hourly' for safety).
 */
export type TimesheetTrackingUnit = 'hourly' | 'daily' | 'annual';

export function getTrackingUnit(
  contract: {
    rateType?: string | null;
    isForClient?: boolean | null;
    customerBillingRateType?: string | null;
  } | null | undefined,
): TimesheetTrackingUnit {
  if (!contract) return 'hourly';
  // Only annual contracts borrow the customer's billing unit. Hourly/daily contracts
  // already track in their own unit and must NOT be overridden.
  if (
    contract.rateType === 'annual'
    && contract.isForClient
    && contract.customerBillingRateType
  ) {
    return contract.customerBillingRateType === 'daily' ? 'daily' : 'hourly';
  }
  const rt = (contract.rateType || 'hourly') as TimesheetTrackingUnit;
  return rt === 'daily' || rt === 'annual' || rt === 'hourly' ? rt : 'hourly';
}

export interface ContractInstance {
  id: string;
  signatureStatus: string;
  workerSignedAt?: Date | null;
  businessSignedAt?: Date | null;
  sentAt?: Date | null;
  expiresAt?: Date | null;
  declinedAt?: Date | null;
  createdAt: Date;
}

export interface DerivedContractStatus {
  signatureStatus: 'signed' | 'pending' | 'expired' | 'declined' | 'draft' | 'ready_to_issue';
  termExpired: boolean;
  sourceInstance?: ContractInstance;
}

/**
 * Derives contract status based on architect specifications
 * Prioritizes contractInstances for signature workflow states with clear precedence
 * Tracks term expiry separately from signature status
 */
export function getDerivedContractStatus(
  contract: Contract,
  instances: ContractInstance[]
): DerivedContractStatus {
  const now = new Date();
  
  // Check term expiry independently (separate from signature status)
  const termExpired = contract.endDate != null && 
    contract.endDate < now && 
    ['active', 'pending', 'completed'].includes(contract.status);

  // If no instances exist, fall back to contracts audit fields
  if (!instances || instances.length === 0) {
    // Fallback logic for legacy single-record flow
    if (contract.signedAt || (contract.signatureText && !contract.signingToken)) {
      return { signatureStatus: 'signed', termExpired };
    }
    
    if (contract.emailSentAt && !contract.signedAt) {
      return { signatureStatus: 'pending', termExpired };
    }
    
    // For ready_to_issue status, preserve the actual status instead of defaulting to draft
    if (contract.status === 'ready_to_issue') {
      return { signatureStatus: 'ready_to_issue', termExpired };
    }
    
    return { signatureStatus: 'draft', termExpired };
  }

  // Sort instances by sentAt desc, then createdAt desc to get the latest
  const sortedInstances = [...instances].sort((a, b) => {
    const aSentAt = a.sentAt ? new Date(a.sentAt).getTime() : 0;
    const bSentAt = b.sentAt ? new Date(b.sentAt).getTime() : 0;
    
    if (aSentAt !== bSentAt) {
      return bSentAt - aSentAt; // sentAt desc
    }
    
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // createdAt desc
  });

  const latestInstance = sortedInstances[0];

  // Evaluate latest contractInstance with precedence:
  // fully_signed > declined > expired > partially_signed > sent_for_signature > draft
  
  // Signed: signatureStatus == 'fully_signed' AND both signatures exist
  if (latestInstance.signatureStatus === 'fully_signed' && 
      latestInstance.workerSignedAt && 
      latestInstance.businessSignedAt) {
    return { signatureStatus: 'signed', termExpired, sourceInstance: latestInstance };
  }

  // Declined
  if (latestInstance.signatureStatus === 'declined' || latestInstance.declinedAt) {
    return { signatureStatus: 'declined', termExpired, sourceInstance: latestInstance };
  }

  // Expired: signatureStatus == 'expired' OR (expiresAt < now AND not fully_signed/declined)
  if (latestInstance.signatureStatus === 'expired' || 
      (latestInstance.expiresAt && 
       latestInstance.expiresAt < now && 
       !['fully_signed', 'declined'].includes(latestInstance.signatureStatus))) {
    return { signatureStatus: 'expired', termExpired, sourceInstance: latestInstance };
  }

  // Pending: signatureStatus IN ('sent_for_signature', 'partially_signed') 
  // AND not declined AND not expired
  if (['sent_for_signature', 'partially_signed'].includes(latestInstance.signatureStatus) &&
      !latestInstance.declinedAt &&
      (!latestInstance.expiresAt || latestInstance.expiresAt >= now)) {
    return { signatureStatus: 'pending', termExpired, sourceInstance: latestInstance };
  }

  // Default to draft
  return { signatureStatus: 'draft', termExpired, sourceInstance: latestInstance };
}

/**
 * How the worker accepts a contract (`contracts.signingMode`):
 *   - 'electronic'     — generated from a template, signed on the platform (/sign/:token)
 *   - 'acknowledgment' — signed outside the platform; the worker acknowledges an emailed
 *                        summary of the key terms (/acknowledge/:token). The acknowledgment
 *                        writes the same columns as a signature (signedAt, signatureText,
 *                        status 'active'), so every gate that reads `signedAt` is unchanged;
 *                        only the words differ, and they all come from getSigningVocabulary.
 */
export type ContractSigningMode = 'electronic' | 'acknowledgment';

export const CONTRACT_SIGNING_MODES: readonly ContractSigningMode[] = ['electronic', 'acknowledgment'];

export interface SigningVocabulary {
  mode: ContractSigningMode;
  isAcknowledgment: boolean;
  /** Details-modal button: "Send for Signing" / "Send for Acknowledgment". */
  sendAction: string;
  sendingLabel: string;
  sentToast: string;
  /** Worker-side call to action: "Sign Contract" / "Acknowledge Contract". */
  workerAction: string;
  awaitingLabel: string;
  awaitingShort: string;
  doneLabel: string;
  lockedLabel: string;
  doneByLabel: string;
  activityTitle: string;
  verbPresent: string;
  verbPast: string;
  nounAction: string;
  modeLabel: string;
  /** Public page path prefix; the token is appended. */
  publicRoute: '/sign' | '/acknowledge';
}

export function isAcknowledgmentMode(mode: string | null | undefined): boolean {
  return mode === 'acknowledgment';
}

/** Every user-facing signing / acknowledgment word, by mode. Unknown or missing → electronic. */
export function getSigningVocabulary(mode: string | null | undefined): SigningVocabulary {
  if (isAcknowledgmentMode(mode)) {
    return {
      mode: 'acknowledgment',
      isAcknowledgment: true,
      sendAction: 'Send for Acknowledgment',
      sendingLabel: 'Sending...',
      sentToast: 'The contract summary has been sent to the worker for acknowledgment via email.',
      workerAction: 'Acknowledge Contract',
      awaitingLabel: 'Awaiting Acknowledgment',
      awaitingShort: 'Awaiting acknowledgment',
      doneLabel: 'Acknowledged',
      lockedLabel: 'Acknowledged & Locked',
      doneByLabel: 'Acknowledged By (typed)',
      activityTitle: 'Acknowledgment Activity',
      verbPresent: 'acknowledge',
      verbPast: 'acknowledged',
      nounAction: 'acknowledgment',
      modeLabel: 'Signed outside the platform — acknowledgment only',
      publicRoute: '/acknowledge',
    };
  }
  return {
    mode: 'electronic',
    isAcknowledgment: false,
    sendAction: 'Send for Signing',
    sendingLabel: 'Sending...',
    sentToast: 'The contract has been sent to the worker for signing via email.',
    workerAction: 'Sign Contract',
    awaitingLabel: 'Awaiting Signature',
    awaitingShort: 'Awaiting signature',
    doneLabel: 'Signed',
    lockedLabel: 'Signed & Locked',
    doneByLabel: 'Signed By (typed)',
    activityTitle: 'Signature Activity',
    verbPresent: 'sign',
    verbPast: 'signed',
    nounAction: 'signing',
    modeLabel: 'Electronic signature',
    publicRoute: '/sign',
  };
}

/**
 * Adds human-readable labels for contract statuses. With `signingMode = 'acknowledgment'`
 * the signature words become acknowledgment words ("Acknowledged", "Pending Acknowledgment").
 */
export function getContractStatusLabel(status: string, signingMode?: string | null): string {
  const labels: Record<string, string> = {
    'signed': 'Signed',
    'pending': 'Pending Signature',
    'expired': 'Signature Expired',
    'declined': 'Declined',
    'draft': 'Draft',
    'ready_to_issue': 'Ready to Issue',
    'pending_sdp_review': 'Pending SDP Review'
  };
  if (isAcknowledgmentMode(signingMode)) {
    labels.signed = 'Acknowledged';
    labels.pending = 'Pending Acknowledgment';
    labels.expired = 'Acknowledgment Expired';
  }

  return labels[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Gets appropriate status badge variant for UI display
 */
export function getContractStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    'signed': 'default',
    'pending': 'secondary', 
    'expired': 'destructive',
    'declined': 'destructive',
    'draft': 'outline',
    'ready_to_issue': 'secondary',
    'pending_sdp_review': 'secondary'
  };
  
  return variants[status] || 'outline';
}

/**
 * Calculate the first timesheet period start date based on contract configuration
 * This ensures consistency between contract wizard preview and timesheet calculations
 * 
 * For all weekly frequencies: Returns contract start date (first period may be partial)
 * For fortnightly: Returns contract start date (week_1/week_2 affects period END)
 * For monthly/semi-monthly: Returns contract start date
 */
export function calculateFirstTimesheetStartDate(
  contractStartDate: Date,
  frequency: 'weekly' | 'fortnightly' | 'semi_monthly' | 'monthly',
  calculationMethod?: string
): Date {
  // For all frequencies, the first period starts from the contract start date
  // The calculator will handle partial first periods and cycle alignment
  return new Date(contractStartDate);
}