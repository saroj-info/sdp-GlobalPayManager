/**
 * Emails after a renewal, mirroring POST /api/contracts in routes.ts: the
 * "contract request" email to every SDP user when the new contract needs SDP
 * review, and the salary-contract notification for annual contracts created
 * by a business. Best effort: the service catches and logs failures.
 */
import { storage } from "../../storage";
import { emailService } from "../../emailService";
import type { Business, Contract, Worker } from "@shared/schema";

export async function notifySdpOfContractRequest(contract: Contract, business: Business, worker: Worker, requesterUserId: string): Promise<void> {
  const [roleTitle, requester, sdpUsers] = await Promise.all([
    contract.roleTitleId ? storage.getRoleTitle(contract.roleTitleId) : Promise.resolve(null),
    storage.getUser(requesterUserId),
    storage.getUsersByType('sdp_internal'),
  ]);
  const contractTypeDisplay = String(contract.employmentType ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
  const roleName = roleTitle?.title || contract.customRoleTitle || 'Unknown Role';
  const requestorName = requester ? `${requester.firstName} ${requester.lastName}` : 'Unknown User';
  for (const sdpUser of sdpUsers) {
    if (!sdpUser.email) continue;
    await emailService.sendContractRequestEmail(
      sdpUser.email,
      business.name,
      `${worker.firstName} ${worker.lastName}`,
      contractTypeDisplay,
      roleName,
      requestorName,
    );
  }
}

export async function notifySalaryContract(contract: Contract, business: Business, worker: Worker): Promise<void> {
  await emailService.sendSalaryContractNotification(contract, business, worker);
}
