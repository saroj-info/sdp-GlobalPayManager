export interface Contract {
  id: string;
  signedAt?: Date | null;
  emailSentAt?: Date | null;
  signatureText?: string | null;
  signingToken?: string | null;
  endDate?: Date | null;
  status: string;
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
 * Adds human-readable labels for contract statuses
 */
export function getContractStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'signed': 'Signed',
    'pending': 'Pending Signature',
    'expired': 'Signature Expired',
    'declined': 'Declined',
    'draft': 'Draft',
    'ready_to_issue': 'Ready to Issue',
    'pending_sdp_review': 'Pending SDP Review'
  };
  
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