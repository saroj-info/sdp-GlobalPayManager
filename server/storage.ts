import {
  users,
  businesses,
  countries,
  roleTitles,
  workers,
  contracts,
  remunerationLines,
  contractRateLines,
  contractBillingLines,
  purchaseOrders,
  contractTemplates,
  contractInstances,
  timesheets,
  timesheetEntries,
  timesheetAttachments,
  timesheetExpenses,
  leaveRequests,
  payslips,
  invoices,
  sdpInvoices,
  sdpInvoiceLineItems,
  sdpInvoiceTimesheets,
  marginPayments,
  thirdPartyBusinesses,
  sdpUserInvites,
  businessUserInvites,
  businessInvitations,
  workerBusinessAssociations,
  workerApprovals,
  emailTemplateDefinitions,
  emailTemplates,
  emailTemplateVersions,
  emailSettings,
  countryParties,
  countryPartyContacts,
  countryAdvisorFees,
  countryDocuments,
  jurisdictions,
  userTwoFactorAuth,
  type User,
  type UpsertUser,
  type Business,
  type InsertBusiness,
  type Country,
  type InsertCountry,
  type RoleTitle,
  type InsertRoleTitle,
  type Worker,
  type InsertWorker,
  type InsertThirdPartyBusiness,
  type ThirdPartyBusiness,
  type Contract,
  type InsertContract,
  type RemunerationLine,
  type InsertRemunerationLineType,
  type ContractTemplate,
  type InsertContractTemplate,
  type ContractInstance,
  type InsertContractInstance,
  type Timesheet,
  type InsertTimesheet,
  type TimesheetEntry,
  type InsertTimesheetEntry,
  type TimesheetAttachment,
  type InsertTimesheetAttachment,
  type TimesheetExpense,
  type InsertTimesheetExpense,
  type LeaveRequest,
  type InsertLeaveRequest,
  type Payslip,
  type InsertPayslip,
  type Invoice,
  type InsertInvoice,
  type SelectSdpInvoiceType,
  type InsertSdpInvoiceType,
  type SelectSdpInvoiceLineItemType,
  type InsertSdpInvoiceLineItemType,
  type SelectMarginPaymentType,
  type InsertMarginPaymentType,
  type InsertSdpUserInviteType,
  type InsertBusinessUserInviteType,
  type BusinessInvitation,
  type InsertBusinessInvitation,
  type WorkerBusinessAssociation,
  type InsertWorkerBusinessAssociation,
  type WorkerApproval,
  type InsertWorkerApproval,
  type SelectEmailTemplateDefinitionType,
  type SelectEmailTemplateType,
  type SelectEmailTemplateVersionType,
  type SelectEmailSettingsType,
  type InsertEmailTemplateDefinitionType,
  type InsertEmailTemplateType,
  type InsertEmailTemplateVersionType,
  type InsertEmailSettingsType,
  type SelectCountryPartyType,
  type SelectCountryPartyContactType,
  type SelectCountryAdvisorFeeType,
  type SelectCountryDocumentType,
  type InsertCountryPartyType,
  type InsertCountryPartyContactType,
  type InsertCountryAdvisorFeeType,
  type InsertCountryDocumentType,
  type InsertJurisdictionType,
  type SelectJurisdictionType,
  type SelectContractRateLine,
  type InsertContractRateLine,
  type SelectContractBillingLine,
  type InsertContractBillingLine,
  type SelectPurchaseOrder,
  type InsertPurchaseOrder,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, inArray, sql, isNull, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByEmailVerificationToken(token: string): Promise<User | undefined>;
  getUsersByType(userType: string): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: any): Promise<User>;
  
  // SDP User Management
  getSdpUsers(): Promise<User[]>;
  getSdpUserById(id: string): Promise<User | undefined>;
  updateSdpUser(id: string, updates: any): Promise<User>;
  
  // Business User Management
  getBusinessUsersByCountry(countryId?: string): Promise<any[]>;
  getBusinessUsersOverview(): Promise<any[]>;
  
  // SDP User Invitations
  createSdpUserInvite(invite: InsertSdpUserInviteType & { token: string; expiresAt: Date }): Promise<any>;
  getSdpUserInviteById(id: string): Promise<any>;
  getSdpUserInviteByEmail(email: string): Promise<any>;
  getSdpUserInviteByToken(token: string): Promise<any>;
  getPendingSdpUserInvites(): Promise<any[]>;
  updateSdpUserInvite(id: string, updates: any): Promise<any>;
  
  // Business User Invitations
  createBusinessUserInvite(invite: InsertBusinessUserInviteType & { token: string; expiresAt: Date }): Promise<any>;
  getBusinessUserInviteByEmail(email: string): Promise<any>;
  getBusinessUserInviteByToken(token: string): Promise<any>;
  updateBusinessUserInvite(id: string, updates: any): Promise<any>;
  getBusinessUserInvitesByBusiness(businessId: string): Promise<any[]>;

  // Business Invitations (Contractor-initiated)
  createBusinessInvitation(invitation: InsertBusinessInvitation & { token: string; expiresAt: Date }): Promise<BusinessInvitation>;
  getBusinessInvitationByToken(token: string): Promise<BusinessInvitation | undefined>;
  getBusinessInvitationsByContractor(contractorId: string): Promise<BusinessInvitation[]>;
  updateBusinessInvitation(id: string, updates: Partial<BusinessInvitation>): Promise<BusinessInvitation>;

  // Worker Business Associations
  createWorkerBusinessAssociation(association: InsertWorkerBusinessAssociation): Promise<WorkerBusinessAssociation>;
  getWorkerBusinessAssociations(workerId: string): Promise<WorkerBusinessAssociation[]>;
  getBusinessWorkerAssociations(businessId: string): Promise<WorkerBusinessAssociation[]>;
  updateWorkerBusinessAssociation(id: string, updates: Partial<WorkerBusinessAssociation>): Promise<WorkerBusinessAssociation>;
  removeWorkerBusinessAssociation(workerId: string, businessId: string): Promise<void>;

  // Worker Approvals
  createWorkerApproval(approval: InsertWorkerApproval & { token: string; expiresAt: Date }): Promise<WorkerApproval>;
  getWorkerApprovalByToken(token: string): Promise<WorkerApproval | undefined>;
  updateWorkerApproval(id: string, updates: Partial<WorkerApproval>): Promise<WorkerApproval>;
  
  // Business operations
  createBusiness(business: InsertBusiness): Promise<Business>;
  getBusinessByOwnerId(ownerId: string): Promise<Business | undefined>;
  getBusinessById(businessId: string): Promise<Business | undefined>;
  getBusinessesForUser(userId: string): Promise<Business[]>;
  getPrimaryBusinessForUser(userId: string): Promise<Business | undefined>;
  updateBusinessCountryAccess(businessId: string, countries: string[]): Promise<void>;
  getHostClientsForBusiness(parentBusinessId: string): Promise<Business[]>;
  createHostClient(data: { name: string; contactEmail?: string; contactName?: string; parentBusinessId: string; ownerId: string }): Promise<Business>;
  
  // Country operations
  getAllCountries(): Promise<Country[]>;
  getAllCountriesAdmin(): Promise<Country[]>; // includes inactive for admin
  getCountriesByIds(ids: string[]): Promise<Country[]>;
  getCountryById(id: string): Promise<Country | undefined>;
  createCountry(data: InsertCountry): Promise<Country>;
  updateCountry(id: string, data: Partial<InsertCountry>): Promise<Country>;
  deleteCountry(id: string): Promise<void>; // soft delete
  activateCountry(id: string): Promise<Country>;
  initializeCountries(): Promise<void>;
  
  // Country Entity Management operations
  // Country parties (shareholders, directors, tax advisors)
  getCountryParties(countryId: string): Promise<SelectCountryPartyType[]>;
  getCountryPartiesByType(countryId: string, type: 'shareholder' | 'director' | 'tax_advisor'): Promise<SelectCountryPartyType[]>;
  getCountryPartyById(id: string): Promise<SelectCountryPartyType | undefined>;
  createCountryParty(party: InsertCountryPartyType): Promise<SelectCountryPartyType>;
  updateCountryParty(id: string, updates: Partial<InsertCountryPartyType>): Promise<SelectCountryPartyType>;
  deleteCountryParty(id: string): Promise<void>;
  
  // Country party contacts
  getCountryPartyContacts(partyId: string): Promise<SelectCountryPartyContactType[]>;
  getCountryPartyContactById(id: string): Promise<SelectCountryPartyContactType | undefined>;
  createCountryPartyContact(contact: InsertCountryPartyContactType): Promise<SelectCountryPartyContactType>;
  updateCountryPartyContact(id: string, updates: Partial<InsertCountryPartyContactType>): Promise<SelectCountryPartyContactType>;
  deleteCountryPartyContact(id: string): Promise<void>;
  
  // Country advisor fees
  getCountryAdvisorFees(partyId: string): Promise<SelectCountryAdvisorFeeType[]>;
  getCountryAdvisorFeeById(id: string): Promise<SelectCountryAdvisorFeeType | undefined>;
  createCountryAdvisorFee(fee: InsertCountryAdvisorFeeType): Promise<SelectCountryAdvisorFeeType>;
  updateCountryAdvisorFee(id: string, updates: Partial<InsertCountryAdvisorFeeType>): Promise<SelectCountryAdvisorFeeType>;
  deleteCountryAdvisorFee(id: string): Promise<void>;
  
  // Country documents
  getCountryDocuments(countryId: string): Promise<SelectCountryDocumentType[]>;
  getCountryDocumentsByCategory(countryId: string, category: string): Promise<SelectCountryDocumentType[]>;
  getCountryDocumentById(id: string): Promise<SelectCountryDocumentType | undefined>;
  createCountryDocument(document: InsertCountryDocumentType): Promise<SelectCountryDocumentType>;
  deleteCountryDocument(id: string): Promise<void>;
  
  // Country with complete entity information
  getCountryWithParties(countryId: string): Promise<Country & {
    parties: (SelectCountryPartyType & {
      contacts: SelectCountryPartyContactType[];
      fees: SelectCountryAdvisorFeeType[];
    })[];
    documents: SelectCountryDocumentType[];
  } | undefined>;
  
  // Country entity notes
  updateCountryNotes(countryId: string, notes: string): Promise<Country>;

  // Jurisdiction management
  getJurisdictions(): Promise<SelectJurisdictionType[]>;
  getJurisdictionsByCountry(countryId: string): Promise<SelectJurisdictionType[]>;
  getJurisdictionById(id: string): Promise<SelectJurisdictionType | undefined>;
  createJurisdiction(jurisdiction: InsertJurisdictionType): Promise<SelectJurisdictionType>;
  updateJurisdiction(id: string, updates: Partial<InsertJurisdictionType>): Promise<SelectJurisdictionType>;
  deleteJurisdiction(id: string): Promise<void>;
  
  // Role title operations
  getRoleTitle(id: string): Promise<RoleTitle | undefined>;
  getRoleTitlesByBusiness(businessId: string): Promise<RoleTitle[]>;
  getGlobalRoleTitles(): Promise<RoleTitle[]>;
  getAllRoleTitles(): Promise<RoleTitle[]>;
  createRoleTitle(roleTitle: InsertRoleTitle): Promise<RoleTitle>;
  
  // Worker operations
  getWorkersByBusiness(businessId: string): Promise<(Worker & { country: Country })[]>;
  getAllWorkers(): Promise<(Worker & { country: Country; business: Business })[]>;
  createWorker(worker: InsertWorker): Promise<Worker>;
  getWorkerById(id: string): Promise<Worker | undefined>;
  getWorkerByUserId(userId: string): Promise<Worker | undefined>;
  getWorkerByInvitationToken(tokenHash: string): Promise<Worker | undefined>;
  updateWorkerProfile(workerId: string, updates: Partial<Worker>): Promise<Worker>;
  
  // Contract operations
  getContractsByBusiness(businessId: string): Promise<(Contract & { worker: Worker; country: Country; roleTitle?: RoleTitle })[]>;
  getContractsByWorker(workerId: string): Promise<(Contract & { business: Business; country: Country; roleTitle?: RoleTitle })[]>;
  getAllContracts(): Promise<(Contract & { worker: Worker; business: Business; country: Country; roleTitle?: RoleTitle })[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  getContractById(id: string): Promise<Contract | undefined>;
  updateContract(id: string, updates: Partial<InsertContract>): Promise<Contract>;
  updateContractStatus(id: string, status: string): Promise<void>;
  getContract(id: string): Promise<Contract | undefined>;
  
  // Remuneration Line operations
  createRemunerationLines(lines: InsertRemunerationLineType[]): Promise<void>;
  getRemunerationLinesByContractId(contractId: string): Promise<RemunerationLine[]>;
  deleteRemunerationLinesByContractId(contractId: string): Promise<void>;
  createRemunerationLine(line: InsertRemunerationLineType): Promise<RemunerationLine>;
  updateRemunerationLine(id: string, data: Partial<InsertRemunerationLineType>): Promise<RemunerationLine>;
  deleteRemunerationLine(id: string): Promise<void>;

  // Contract Rate Lines
  getContractRateLines(contractId: string): Promise<SelectContractRateLine[]>;
  createContractRateLine(data: InsertContractRateLine): Promise<SelectContractRateLine>;
  updateContractRateLine(id: string, data: Partial<InsertContractRateLine>): Promise<SelectContractRateLine>;
  deleteContractRateLine(id: string): Promise<void>;
  replaceContractRateLines(contractId: string, lines: InsertContractRateLine[]): Promise<SelectContractRateLine[]>;

  // Contract Billing Lines (SDP-only)
  getContractBillingLines(contractId: string): Promise<SelectContractBillingLine[]>;
  createContractBillingLine(data: InsertContractBillingLine): Promise<SelectContractBillingLine>;
  updateContractBillingLine(id: string, data: Partial<InsertContractBillingLine>): Promise<SelectContractBillingLine>;
  deleteContractBillingLine(id: string): Promise<void>;
  replaceContractBillingLines(contractId: string, lines: InsertContractBillingLine[]): Promise<SelectContractBillingLine[]>;

  // Purchase Orders
  getPurchaseOrdersByContract(contractId: string): Promise<SelectPurchaseOrder[]>;
  getPurchaseOrdersForBusiness(businessId: string): Promise<(SelectPurchaseOrder & { contractWorkerName?: string; businessName?: string })[]>;
  getAllPurchaseOrders(filters?: { businessId?: string; status?: string }): Promise<(SelectPurchaseOrder & { contractWorkerName?: string; businessName?: string })[]>;
  createPurchaseOrder(data: InsertPurchaseOrder): Promise<SelectPurchaseOrder>;
  updatePurchaseOrder(id: string, data: Partial<InsertPurchaseOrder>): Promise<SelectPurchaseOrder>;
  deletePurchaseOrder(id: string): Promise<void>;
  
  // Contract Template operations
  getContractTemplates(): Promise<(ContractTemplate & { country?: Country; uploadedByUser?: User })[]>;
  getContractTemplatesByCountry(countryId: string, employmentType?: string): Promise<(ContractTemplate & { country?: Country; uploadedByUser?: User })[]>;
  createContractTemplate(template: InsertContractTemplate): Promise<ContractTemplate>;
  getContractTemplateById(id: string): Promise<ContractTemplate | undefined>;
  updateContractTemplate(id: string, updates: Partial<ContractTemplate>): Promise<ContractTemplate>;
  deleteContractTemplate(id: string): Promise<void>;
  getContractTemplateByType(employmentType: string, countryId?: string): Promise<ContractTemplate | undefined>;
  
  // Contract Instance operations
  getContractInstances(): Promise<(ContractInstance & { template: ContractTemplate; worker: Worker; business: Business; country: Country })[]>;
  getContractInstancesByBusinessId(businessId: string): Promise<(ContractInstance & { template: ContractTemplate; worker: Worker; country: Country })[]>;
  getContractInstancesByWorkerId(workerId: string): Promise<(ContractInstance & { template: ContractTemplate; business: Business; country: Country })[]>;
  createContractInstance(instance: InsertContractInstance): Promise<ContractInstance>;
  updateContractInstanceStatus(id: string, updates: Partial<ContractInstance>): Promise<void>;
  generateContractContent(template: ContractTemplate, variables: Record<string, string>): Promise<string>;
  generateUniversalContract(templateId: string, businessId: string, workerId: string, contractData: any): Promise<{ content: string; variables: Record<string, string> }>;
  
  // Contract operations for host client / customer business
  getContractsByCustomerBusiness(customerBusinessId: string): Promise<(Contract & { worker: Worker; business: Business; country: Country })[]>;

  // Timesheet operations
  getTimesheetsByWorker(workerId: string): Promise<(Timesheet & { entries: TimesheetEntry[]; attachments: TimesheetAttachment[] })[]>;
  getTimesheetsByBusiness(businessId: string): Promise<(Timesheet & { worker: Worker; entries: TimesheetEntry[]; attachments: TimesheetAttachment[] })[]>;
  getTimesheetsByCustomerBusiness(customerBusinessId: string): Promise<(Timesheet & { worker: Worker; entries: TimesheetEntry[]; attachments: TimesheetAttachment[]; providedByBusinessName: string })[]>;
  getAllTimesheets(): Promise<(Timesheet & { worker: Worker; business: Business; entries: TimesheetEntry[]; attachments: TimesheetAttachment[] })[]>;
  getTimesheetById(id: string): Promise<(Timesheet & { worker?: Worker; entries: TimesheetEntry[]; attachments: TimesheetAttachment[] }) | undefined>;
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  createTimesheetWithEntries(data: any): Promise<Timesheet>;
  updateTimesheetStatus(timesheetId: string, status: string, approvedBy?: string, rejectionReason?: string): Promise<void>;
  updateTimesheet(timesheetId: string, data: Partial<InsertTimesheet>): Promise<Timesheet>;
  deleteTimesheet(timesheetId: string): Promise<void>;
  createTimesheetEntry(entry: InsertTimesheetEntry): Promise<TimesheetEntry>;
  updateTimesheetEntry(entryId: string, hoursWorked: string, description?: string): Promise<void>;
  
  // Timesheet attachment operations
  createTimesheetAttachment(attachment: InsertTimesheetAttachment): Promise<TimesheetAttachment>;
  getTimesheetAttachments(timesheetId: string): Promise<TimesheetAttachment[]>;
  deleteTimesheetAttachment(attachmentId: string): Promise<void>;

  // Timesheet expense operations
  getExpensesByTimesheetId(timesheetId: string): Promise<TimesheetExpense[]>;
  createTimesheetExpense(data: Omit<InsertTimesheetExpense, 'date'> & { date: Date | string }): Promise<TimesheetExpense>;
  updateTimesheetExpense(id: string, data: Partial<InsertTimesheetExpense>): Promise<TimesheetExpense>;
  deleteTimesheetExpense(id: string): Promise<void>;
  
  // Leave request operations  
  getLeaveRequestsByWorker(workerId: string): Promise<LeaveRequest[]>;
  getLeaveRequestsByBusiness(businessId: string): Promise<(LeaveRequest & { worker: Worker })[]>;
  getAllLeaveRequests(): Promise<(LeaveRequest & { worker: Worker; business: Business })[]>;
  createLeaveRequest(leaveRequest: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequestStatus(requestId: string, status: string, approvedBy?: string, rejectionReason?: string): Promise<void>;
  
  // Payslip operations for SDP internal users
  getPayslipsByWorker(workerId: string): Promise<(Payslip & { uploadedByUser: User })[]>;
  getPayslipsByBusiness(businessId: string): Promise<(Payslip & { worker: Worker; uploadedByUser: User })[]>;
  getPayslipsByCountries(countryIds: string[]): Promise<(Payslip & { worker: Worker & { country: Country }; business: Business; uploadedByUser: User })[]>;
  createPayslip(payslip: InsertPayslip): Promise<Payslip>;
  getPayslipById(id: string): Promise<Payslip | undefined>;

  // Analytics operations
  getBusinessAnalytics(businessId: string): Promise<{
    workersByCountry: { countryId: string; countryName: string; employees: number; contractors: number; total: number }[];
    pendingTimesheets: number;
    spendByCountryAndYear: { countryId: string; countryName: string; year: number; totalSpend: number }[];
    totalActiveWorkers: number;
    totalActiveContracts: number;
  }>;
  
  // SDP internal user analytics
  getSDPInternalAnalytics(countryIds: string[]): Promise<{
    totalPayslipsProcessed: number;
    totalWorkers: number;
    totalBusinesses: number;
    monthlyPayrollByCountry: { countryId: string; countryName: string; totalPayroll: number; currency: string }[];
  }>;

  // Invoice operations
  getInvoicesByBusiness(businessId: string): Promise<(Invoice & { contractor: Worker & { country: Country }; business: Business })[]>;
  getInvoicesByContractor(contractorId: string): Promise<(Invoice & { contractor: Worker & { country: Country }; business: Business })[]>;
  getAllInvoices(): Promise<(Invoice & { contractor: Worker & { country: Country }; business: Business })[]>; // For SDP internal users
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoiceStatus(id: string, status: string, reviewedBy?: string): Promise<void>;
  createInvoiceFromTimesheet(timesheetId: string, invoiceData: Partial<InsertInvoice>): Promise<Invoice>;
  getInvoiceById(id: string): Promise<Invoice | undefined>;

  // SDP Invoice operations - for invoices FROM SDP entities TO businesses
  getSdpInvoicesByBusiness(businessId: string): Promise<(SelectSdpInvoiceType & { fromCountry: Country; toBusiness: Business; createdByUser: User })[]>;
  getSdpInvoicesByCountry(countryId: string): Promise<(SelectSdpInvoiceType & { fromCountry: Country; toBusiness: Business; createdByUser: User })[]>;
  getAllSdpInvoices(): Promise<(SelectSdpInvoiceType & { fromCountry: Country; toBusiness: Business; createdByUser: User; fromBusiness: Business | null })[]>;
  
  // Report operations
  getSdpInvoiceReport(filters: { from?: string; to?: string; countryId?: string; businessId?: string; }): Promise<any[]>;
  getTimesheetReport(filters: { from?: string; to?: string; countryId?: string; businessId?: string; }): Promise<any[]>;
  getPayslipReport(filters: { from?: string; to?: string; countryId?: string; businessId?: string; }): Promise<any[]>;
  createSdpInvoice(invoice: InsertSdpInvoiceType): Promise<SelectSdpInvoiceType>;
  updateSdpInvoiceStatus(id: string, status: string, notes?: string): Promise<void>;
  createSdpInvoiceFromTimesheet(timesheetId: string, invoiceData: Partial<InsertSdpInvoiceType>): Promise<SelectSdpInvoiceType>;
  getSdpInvoiceById(id: string): Promise<SelectSdpInvoiceType | undefined>;
  getSdpInvoiceByToken(token: string): Promise<SelectSdpInvoiceType | undefined>;
  generateSdpInvoiceNumber(countryId: string): Promise<string>;
  // New methods for invoice editing, sending, and payment tracking
  updateSdpInvoice(id: string, updates: Partial<InsertSdpInvoiceType>): Promise<SelectSdpInvoiceType>;
  markSdpInvoiceAsSent(id: string): Promise<void>;
  markSdpInvoiceAsPaid(id: string, paidAmount: string, paidDate?: Date): Promise<void>;
  
  // SDP Invoice Line Items operations
  getSdpInvoiceLineItems(invoiceId: string): Promise<SelectSdpInvoiceLineItemType[]>;
  createSdpInvoiceLineItems(invoiceId: string, lineItems: InsertSdpInvoiceLineItemType[]): Promise<SelectSdpInvoiceLineItemType[]>;
  updateSdpInvoiceLineItems(invoiceId: string, lineItems: InsertSdpInvoiceLineItemType[]): Promise<SelectSdpInvoiceLineItemType[]>;
  deleteSdpInvoiceLineItems(invoiceId: string): Promise<void>;

  // SDP Invoice Timesheets junction (consolidated invoices)
  getSdpInvoiceTimesheets(invoiceId: string): Promise<{ timesheetId: string }[]>;
  linkTimesheetsToSdpInvoice(invoiceId: string, timesheetIds: string[]): Promise<void>;
  getTimesheetSdpInvoiceLink(timesheetId: string): Promise<{ invoiceId: string; invoiceStatus: string } | null>;
  deleteSdpInvoiceById(id: string): Promise<void>;

  // Purchase Order helpers
  getPurchaseOrderById(id: string): Promise<SelectPurchaseOrder | undefined>;
  updatePurchaseOrderInvoicedAmount(id: string, delta: number): Promise<void>;

  // Margin Payment operations
  getMarginPaymentsByInvoice(invoiceId: string): Promise<SelectMarginPaymentType[]>;
  getMarginPaymentsByBusiness(businessId: string): Promise<SelectMarginPaymentType[]>;
  getAllMarginPayments(): Promise<SelectMarginPaymentType[]>;
  createMarginPayment(payment: InsertMarginPaymentType): Promise<SelectMarginPaymentType>;
  updateMarginPayment(id: string, updates: Partial<InsertMarginPaymentType>): Promise<SelectMarginPaymentType>;
  deleteMarginPayment(id: string): Promise<void>;

  // Additional methods needed by routes
  getContracts(): Promise<Contract[]>;
  getWorkers(): Promise<Worker[]>;
  getCountries(): Promise<Country[]>;
  getCountryById(id: string): Promise<Country | undefined>;
  getBusinessById(id: string): Promise<Business | undefined>;
  getAllUsers(): Promise<User[]>;
  getBusinesses(): Promise<Business[]>;

  // Email Template Management Operations
  // Template Definitions
  getEmailTemplateDefinitions(): Promise<SelectEmailTemplateDefinitionType[]>;
  getEmailTemplateDefinitionByKey(key: string): Promise<SelectEmailTemplateDefinitionType | undefined>;
  createEmailTemplateDefinition(definition: InsertEmailTemplateDefinitionType): Promise<SelectEmailTemplateDefinitionType>;
  updateEmailTemplateDefinition(id: string, updates: Partial<InsertEmailTemplateDefinitionType>): Promise<SelectEmailTemplateDefinitionType>;
  
  // Email Templates
  getEmailTemplates(): Promise<SelectEmailTemplateType[]>;
  getEmailTemplatesByDefinition(definitionId: string): Promise<SelectEmailTemplateType[]>;
  getPublishedEmailTemplate(key: string, locale?: string, scopeType?: string, scopeId?: string): Promise<SelectEmailTemplateType | undefined>;
  createEmailTemplate(template: InsertEmailTemplateType & { createdByUserId: string }): Promise<SelectEmailTemplateType>;
  updateEmailTemplate(id: string, updates: Partial<InsertEmailTemplateType>): Promise<SelectEmailTemplateType>;
  publishEmailTemplate(id: string, publishedByUserId: string): Promise<SelectEmailTemplateType>;
  
  // Email Template Versions
  getEmailTemplateVersions(templateId: string): Promise<SelectEmailTemplateVersionType[]>;
  createEmailTemplateVersion(version: InsertEmailTemplateVersionType & { createdByUserId: string }): Promise<SelectEmailTemplateVersionType>;
  
  // Email Settings
  getEmailSettings(): Promise<SelectEmailSettingsType | undefined>;
  updateEmailSettings(updates: Partial<InsertEmailSettingsType>): Promise<SelectEmailSettingsType>;
  
  // Template Rendering Support
  renderEmailTemplate(key: string, variables: Record<string, any>, options?: { locale?: string; scopeType?: string; scopeId?: string }): Promise<{ subject: string; html: string; text?: string; fromDisplayName?: string; fromLocalPart?: string } | undefined>;

  // Two-Factor Authentication Operations
  upsertUserTwoFactorAuth(data: { userId: string; method: string; totpSecret: string; isEnabled: boolean }): Promise<any>;
  enableUserTwoFactorAuth(userId: string, hashedBackupCodes: string[]): Promise<any>;
  disableUserTwoFactorAuth(userId: string): Promise<any>;
  updateBackupCodes(userId: string, hashedBackupCodes: string[]): Promise<any>;
  removeUsedBackupCode(userId: string, usedIndex: number): Promise<any>;
  
  // Password Reset Operations
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  resetPassword(token: string, newPasswordHash: string): Promise<boolean>;
  clearPasswordResetToken(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByEmailVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user;
  }

  async getUsersByType(userType: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.userType, userType));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(userData: any): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  // SDP User Management
  async getSdpUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.userType, 'sdp_internal'));
  }

  async getSdpUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.id, id),
        eq(users.userType, 'sdp_internal')
      )
    );
    return user;
  }

  async updateSdpUser(id: string, updates: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // SDP User Invitations
  async createSdpUserInvite(invite: any): Promise<any> {
    const [created] = await db.insert(sdpUserInvites).values(invite).returning();
    return created;
  }

  async getSdpUserInviteById(id: string): Promise<any> {
    const [invite] = await db.select().from(sdpUserInvites).where(eq(sdpUserInvites.id, id));
    return invite;
  }

  async getSdpUserInviteByEmail(email: string): Promise<any> {
    const [invite] = await db.select().from(sdpUserInvites).where(eq(sdpUserInvites.email, email));
    return invite;
  }

  async getSdpUserInviteByToken(token: string): Promise<any> {
    const [invite] = await db.select().from(sdpUserInvites).where(eq(sdpUserInvites.token, token));
    return invite;
  }

  async getPendingSdpUserInvites(): Promise<any[]> {
    const invites = await db.select().from(sdpUserInvites).where(isNull(sdpUserInvites.acceptedAt));
    return invites;
  }

  async updateSdpUserInvite(id: string, updates: any): Promise<any> {
    const [invite] = await db
      .update(sdpUserInvites)
      .set(updates)
      .where(eq(sdpUserInvites.id, id))
      .returning();
    return invite;
  }

  // Business User Invitation operations
  async createBusinessUserInvite(invite: any): Promise<any> {
    const [created] = await db.insert(businessUserInvites).values(invite).returning();
    return created;
  }

  async getBusinessUserInviteByEmail(email: string): Promise<any> {
    const [invite] = await db.select().from(businessUserInvites).where(eq(businessUserInvites.email, email));
    return invite;
  }

  async getBusinessUserInviteByToken(token: string): Promise<any> {
    const [invite] = await db.select().from(businessUserInvites).where(eq(businessUserInvites.token, token));
    return invite;
  }

  async updateBusinessUserInvite(id: string, updates: any): Promise<any> {
    const [invite] = await db
      .update(businessUserInvites)
      .set(updates)
      .where(eq(businessUserInvites.id, id))
      .returning();
    return invite;
  }

  async getBusinessUserInvitesByBusiness(businessId: string): Promise<any[]> {
    const invites = await db
      .select()
      .from(businessUserInvites)
      .where(eq(businessUserInvites.businessId, businessId));
    return invites;
  }

  // Business Invitation operations (Contractor-initiated)
  async createBusinessInvitation(invitation: InsertBusinessInvitation & { token: string; expiresAt: Date }): Promise<BusinessInvitation> {
    const [created] = await db.insert(businessInvitations).values(invitation).returning();
    return created;
  }

  async getBusinessInvitationByToken(token: string): Promise<BusinessInvitation | undefined> {
    const [invitation] = await db.select().from(businessInvitations).where(eq(businessInvitations.token, token));
    return invitation;
  }

  async getBusinessInvitationsByContractor(contractorId: string): Promise<BusinessInvitation[]> {
    const invitations = await db
      .select()
      .from(businessInvitations)
      .where(eq(businessInvitations.contractorId, contractorId));
    return invitations;
  }

  async updateBusinessInvitation(id: string, updates: Partial<BusinessInvitation>): Promise<BusinessInvitation> {
    const [updated] = await db
      .update(businessInvitations)
      .set({...updates, updatedAt: new Date()})
      .where(eq(businessInvitations.id, id))
      .returning();
    return updated;
  }

  // Worker Business Association operations
  async createWorkerBusinessAssociation(association: InsertWorkerBusinessAssociation): Promise<WorkerBusinessAssociation> {
    const [created] = await db.insert(workerBusinessAssociations).values(association).returning();
    return created;
  }

  async getWorkerBusinessAssociations(workerId: string): Promise<WorkerBusinessAssociation[]> {
    const associations = await db
      .select()
      .from(workerBusinessAssociations)
      .where(and(
        eq(workerBusinessAssociations.workerId, workerId),
        eq(workerBusinessAssociations.status, 'active')
      ));
    return associations;
  }

  async getBusinessWorkerAssociations(businessId: string): Promise<WorkerBusinessAssociation[]> {
    const associations = await db
      .select()
      .from(workerBusinessAssociations)
      .where(and(
        eq(workerBusinessAssociations.businessId, businessId),
        eq(workerBusinessAssociations.status, 'active')
      ));
    return associations;
  }

  async updateWorkerBusinessAssociation(id: string, updates: Partial<WorkerBusinessAssociation>): Promise<WorkerBusinessAssociation> {
    const [updated] = await db
      .update(workerBusinessAssociations)
      .set({...updates, updatedAt: new Date()})
      .where(eq(workerBusinessAssociations.id, id))
      .returning();
    return updated;
  }

  async removeWorkerBusinessAssociation(workerId: string, businessId: string): Promise<void> {
    await db
      .update(workerBusinessAssociations)
      .set({
        status: 'removed',
        updatedAt: new Date()
      })
      .where(and(
        eq(workerBusinessAssociations.workerId, workerId),
        eq(workerBusinessAssociations.businessId, businessId)
      ));
  }

  // Worker Approval operations
  async createWorkerApproval(approval: InsertWorkerApproval & { token: string; expiresAt: Date }): Promise<WorkerApproval> {
    const [created] = await db.insert(workerApprovals).values(approval).returning();
    return created;
  }

  async getWorkerApprovalByToken(token: string): Promise<WorkerApproval | undefined> {
    const [approval] = await db.select().from(workerApprovals).where(eq(workerApprovals.token, token));
    return approval;
  }

  async updateWorkerApproval(id: string, updates: Partial<WorkerApproval>): Promise<WorkerApproval> {
    const [updated] = await db
      .update(workerApprovals)
      .set({...updates, updatedAt: new Date()})
      .where(eq(workerApprovals.id, id))
      .returning();
    return updated;
  }

  // Business operations
  async createBusiness(business: InsertBusiness): Promise<Business> {
    const [created] = await db.insert(businesses).values(business).returning();
    return created;
  }

  async getBusinessByOwnerId(ownerId: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.ownerId, ownerId));
    return business;
  }

  async getBusinessById(businessId: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
    return business;
  }

  // Get businesses a user has access to (either as owner or through accessibleBusinessIds)
  async getBusinessesForUser(userId: string): Promise<Business[]> {
    // Get user to check their accessibleBusinessIds
    const user = await this.getUser(userId);
    if (!user) return [];

    // Find businesses where user is owner
    const ownedBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, userId));
    
    // Find businesses user has access to via accessibleBusinessIds
    let accessibleBusinesses: Business[] = [];
    if (user.accessibleBusinessIds && user.accessibleBusinessIds.length > 0) {
      accessibleBusinesses = await db
        .select()
        .from(businesses)
        .where(inArray(businesses.id, user.accessibleBusinessIds));
    }

    // Combine and deduplicate businesses
    const allBusinesses = [...ownedBusinesses, ...accessibleBusinesses];
    const uniqueBusinesses = allBusinesses.filter((business, index, self) => 
      self.findIndex(b => b.id === business.id) === index
    );
    
    return uniqueBusinesses;
  }

  // Get business users (non-SDP users) optionally filtered by country
  async getBusinessUsersByCountry(countryId?: string): Promise<(User & { country?: Country; business?: Business })[]> {
    const query = db
      .select({
        user: users,
        country: countries,
        business: businesses
      })
      .from(users)
      .leftJoin(countries, eq(users.country, countries.id))
      .leftJoin(businesses, eq(businesses.ownerId, users.id))
      .where(
        and(
          inArray(users.userType, ['business_user', 'worker', 'third_party_business']),
          countryId ? eq(users.country, countryId) : undefined
        )
      )
      .orderBy(users.firstName, users.lastName);

    const result = await query;
    
    return result.map(row => ({
      ...row.user,
      country: row.country || undefined,
      business: row.business || undefined
    }));
  }

  async getBusinessUsersOverview(): Promise<any[]> {
    // Get all business users with their countries and businesses
    const query = db
      .select({
        user: users,
        country: countries,
        business: businesses
      })
      .from(users)
      .leftJoin(countries, eq(users.country, countries.id))
      .leftJoin(businesses, eq(businesses.ownerId, users.id))
      .where(
        inArray(users.userType, ['business_user', 'worker', 'third_party_business'])
      )
      .orderBy(countries.name, users.firstName, users.lastName);

    const result = await query;
    
    // Group users by country
    const groupedByCountry = result.reduce((acc: any, row: any) => {
      const countryId = row.country?.id || 'unknown';
      if (!acc[countryId]) {
        acc[countryId] = {
          country: row.country || { id: 'unknown', name: 'Unknown Country', code: 'XX' },
          users: [],
          businessCount: 0,
          activeUserCount: 0,
          businessIds: new Set()
        };
      }
      
      const userData = {
        ...row.user,
        business: row.business || null,
        country: row.country || null
      };
      
      acc[countryId].users.push(userData);
      
      if (row.user.isActive) {
        acc[countryId].activeUserCount += 1;
      }
      
      if (row.business?.id) {
        acc[countryId].businessIds.add(row.business.id);
      }
      
      return acc;
    }, {});

    // Convert to array format and calculate business counts
    return Object.values(groupedByCountry).map((country: any) => ({
      country: country.country,
      users: country.users,
      businessCount: country.businessIds.size,
      activeUserCount: country.activeUserCount
    }));
  }

  // Helper method to get primary business for a user (for backwards compatibility)
  async getPrimaryBusinessForUser(userId: string): Promise<Business | undefined> {
    const businesses = await this.getBusinessesForUser(userId);
    
    // First check if user owns a business
    const ownedBusiness = businesses.find(b => b.ownerId === userId);
    if (ownedBusiness) return ownedBusiness;
    
    // Otherwise return the first accessible business
    return businesses[0];
  }

  async updateBusinessCountryAccess(businessId: string, countryIds: string[]): Promise<void> {
    await db
      .update(businesses)
      .set({
        accessibleCountries: countryIds,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, businessId));
  }

  async getHostClientsForBusiness(parentBusinessId: string): Promise<Business[]> {
    return await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.parentBusinessId, parentBusinessId),
          eq(businesses.isRegistered, false)
        )
      );
  }

  async createHostClient(data: { name: string; contactEmail?: string; contactName?: string; parentBusinessId: string; ownerId: string }): Promise<Business> {
    const [hostClient] = await db
      .insert(businesses)
      .values({
        name: data.name,
        ownerId: data.ownerId,
        isRegistered: false,
        parentBusinessId: data.parentBusinessId,
        contactEmail: data.contactEmail || null,
        contactName: data.contactName || null,
        accessibleCountries: [],
      })
      .returning();
    return hostClient;
  }

  // Country operations
  async getAllCountries(): Promise<Country[]> {
    return await db.select().from(countries).where(eq(countries.isActive, true));
  }

  async getCountriesByIds(ids: string[]): Promise<Country[]> {
    if (ids.length === 0) return [];
    return await db.select().from(countries).where(inArray(countries.id, ids));
  }

  async initializeCountries(): Promise<void> {
    const defaultCountries: InsertCountry[] = [
      { id: 'au', name: 'Australia', code: 'AU', companyName: 'SDP AU Pty Ltd', currency: 'AUD' },
      { id: 'nz', name: 'New Zealand', code: 'NZ', companyName: 'SDP NZ Limited', currency: 'NZD' },
      { id: 'us', name: 'United States', code: 'US', companyName: 'SDP US LLC', currency: 'USD' },
      { id: 'uk', name: 'United Kingdom', code: 'GB', companyName: 'SDP UK Ltd', currency: 'GBP' },
      { id: 'sg', name: 'Singapore', code: 'SG', companyName: 'SDP SG Pte Ltd', currency: 'SGD' },
      { id: 'ie', name: 'Ireland', code: 'IE', companyName: 'SDP IE Ltd', currency: 'EUR' },
      { id: 'in', name: 'India', code: 'IN', companyName: 'SDP IN Pvt Ltd', currency: 'INR' },
      { id: 'ph', name: 'Philippines', code: 'PH', companyName: 'SDP PH Inc', currency: 'PHP' },
      { id: 'ca', name: 'Canada', code: 'CA', companyName: 'SDP CA Corp', currency: 'CAD' },
      { id: 'jp', name: 'Japan', code: 'JP', companyName: 'SDP JP KK', currency: 'JPY' },
    ];

    for (const country of defaultCountries) {
      await db.insert(countries).values(country).onConflictDoNothing();
    }
  }

  // Admin country operations for super admin
  async getAllCountriesAdmin(): Promise<Country[]> {
    return await db.select().from(countries); // includes all countries, active and inactive
  }

  async getCountryById(id: string): Promise<Country | undefined> {
    const [country] = await db.select().from(countries).where(eq(countries.id, id));
    return country;
  }

  async createCountry(data: InsertCountry): Promise<Country> {
    const [country] = await db.insert(countries).values({
      ...data,
      isActive: true, // ensure new countries are active by default
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return country;
  }

  async updateCountry(id: string, data: Partial<InsertCountry>): Promise<Country> {
    const [country] = await db
      .update(countries)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(countries.id, id))
      .returning();
    
    if (!country) {
      throw new Error(`Country with id ${id} not found`);
    }
    
    return country;
  }

  async deleteCountry(id: string): Promise<void> {
    // Soft delete - set isActive to false
    const [country] = await db
      .update(countries)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(countries.id, id))
      .returning();
    
    if (!country) {
      throw new Error(`Country with id ${id} not found`);
    }
  }

  async activateCountry(id: string): Promise<Country> {
    const [country] = await db
      .update(countries)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(countries.id, id))
      .returning();
    
    if (!country) {
      throw new Error(`Country with id ${id} not found`);
    }
    
    return country;
  }

  // Country Entity Management operations
  // Country parties (shareholders, directors, tax advisors)
  async getCountryParties(countryId: string): Promise<SelectCountryPartyType[]> {
    return await db.select().from(countryParties).where(eq(countryParties.countryId, countryId));
  }

  async getCountryPartiesByType(countryId: string, type: 'shareholder' | 'director' | 'tax_advisor'): Promise<SelectCountryPartyType[]> {
    return await db.select().from(countryParties).where(
      and(eq(countryParties.countryId, countryId), eq(countryParties.type, type))
    );
  }

  async getCountryPartyById(id: string): Promise<SelectCountryPartyType | undefined> {
    const [party] = await db.select().from(countryParties).where(eq(countryParties.id, id));
    return party;
  }

  async createCountryParty(party: InsertCountryPartyType): Promise<SelectCountryPartyType> {
    const [newParty] = await db.insert(countryParties).values({
      ...party,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newParty;
  }

  async updateCountryParty(id: string, updates: Partial<InsertCountryPartyType>): Promise<SelectCountryPartyType> {
    const [party] = await db
      .update(countryParties)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(countryParties.id, id))
      .returning();
    
    if (!party) {
      throw new Error(`Country party with id ${id} not found`);
    }
    
    return party;
  }

  async deleteCountryParty(id: string): Promise<void> {
    await db.delete(countryParties).where(eq(countryParties.id, id));
  }

  // Country party contacts
  async getCountryPartyContacts(partyId: string): Promise<SelectCountryPartyContactType[]> {
    return await db.select().from(countryPartyContacts).where(eq(countryPartyContacts.partyId, partyId));
  }

  async getCountryPartyContactById(id: string): Promise<SelectCountryPartyContactType | undefined> {
    const [contact] = await db.select().from(countryPartyContacts).where(eq(countryPartyContacts.id, id));
    return contact;
  }

  async createCountryPartyContact(contact: InsertCountryPartyContactType): Promise<SelectCountryPartyContactType> {
    const [newContact] = await db.insert(countryPartyContacts).values({
      ...contact,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newContact;
  }

  async updateCountryPartyContact(id: string, updates: Partial<InsertCountryPartyContactType>): Promise<SelectCountryPartyContactType> {
    const [contact] = await db
      .update(countryPartyContacts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(countryPartyContacts.id, id))
      .returning();
    
    if (!contact) {
      throw new Error(`Country party contact with id ${id} not found`);
    }
    
    return contact;
  }

  async deleteCountryPartyContact(id: string): Promise<void> {
    await db.delete(countryPartyContacts).where(eq(countryPartyContacts.id, id));
  }

  // Country advisor fees
  async getCountryAdvisorFees(partyId: string): Promise<SelectCountryAdvisorFeeType[]> {
    return await db.select().from(countryAdvisorFees).where(eq(countryAdvisorFees.partyId, partyId));
  }

  async getCountryAdvisorFeeById(id: string): Promise<SelectCountryAdvisorFeeType | undefined> {
    const [fee] = await db.select().from(countryAdvisorFees).where(eq(countryAdvisorFees.id, id));
    return fee;
  }

  async createCountryAdvisorFee(fee: InsertCountryAdvisorFeeType): Promise<SelectCountryAdvisorFeeType> {
    const [newFee] = await db.insert(countryAdvisorFees).values({
      ...fee,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newFee;
  }

  async updateCountryAdvisorFee(id: string, updates: Partial<InsertCountryAdvisorFeeType>): Promise<SelectCountryAdvisorFeeType> {
    const [fee] = await db
      .update(countryAdvisorFees)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(countryAdvisorFees.id, id))
      .returning();
    
    if (!fee) {
      throw new Error(`Country advisor fee with id ${id} not found`);
    }
    
    return fee;
  }

  async deleteCountryAdvisorFee(id: string): Promise<void> {
    await db.delete(countryAdvisorFees).where(eq(countryAdvisorFees.id, id));
  }

  // Country documents
  async getCountryDocuments(countryId: string): Promise<SelectCountryDocumentType[]> {
    return await db.select().from(countryDocuments).where(eq(countryDocuments.countryId, countryId));
  }

  async getCountryDocumentsByCategory(countryId: string, category: string): Promise<SelectCountryDocumentType[]> {
    return await db.select().from(countryDocuments).where(
      and(eq(countryDocuments.countryId, countryId), eq(countryDocuments.category, category))
    );
  }

  async getCountryDocumentById(id: string): Promise<SelectCountryDocumentType | undefined> {
    const [document] = await db.select().from(countryDocuments).where(eq(countryDocuments.id, id));
    return document;
  }

  async createCountryDocument(document: InsertCountryDocumentType): Promise<SelectCountryDocumentType> {
    const [newDocument] = await db.insert(countryDocuments).values({
      ...document,
      createdAt: new Date(),
    }).returning();
    return newDocument;
  }

  async deleteCountryDocument(id: string): Promise<void> {
    await db.delete(countryDocuments).where(eq(countryDocuments.id, id));
  }

  // Country with complete entity information
  async getCountryWithParties(countryId: string): Promise<Country & {
    parties: (SelectCountryPartyType & {
      contacts: SelectCountryPartyContactType[];
      fees: SelectCountryAdvisorFeeType[];
    })[];
    documents: SelectCountryDocumentType[];
  } | undefined> {
    // Get country
    const country = await this.getCountryById(countryId);
    if (!country) {
      return undefined;
    }

    // Get all parties for this country
    const parties = await this.getCountryParties(countryId);
    
    // Get contacts and fees for each party
    const partiesWithDetails = await Promise.all(
      parties.map(async (party) => {
        const contacts = await this.getCountryPartyContacts(party.id);
        const fees = party.type === 'tax_advisor' ? await this.getCountryAdvisorFees(party.id) : [];
        
        return {
          ...party,
          contacts,
          fees,
        };
      })
    );

    // Get documents
    const documents = await this.getCountryDocuments(countryId);

    return {
      ...country,
      parties: partiesWithDetails,
      documents,
    };
  }

  // Country entity notes
  async updateCountryNotes(countryId: string, notes: string): Promise<Country> {
    const [country] = await db
      .update(countries)
      .set({
        entityNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(countries.id, countryId))
      .returning();
    
    if (!country) {
      throw new Error(`Country with id ${countryId} not found`);
    }
    
    return country;
  }

  // Jurisdiction management
  async getJurisdictions(): Promise<SelectJurisdictionType[]> {
    return await db.select().from(jurisdictions).where(eq(jurisdictions.isActive, true));
  }

  async getJurisdictionsByCountry(countryId: string): Promise<SelectJurisdictionType[]> {
    return await db.select().from(jurisdictions).where(
      and(eq(jurisdictions.countryId, countryId), eq(jurisdictions.isActive, true))
    );
  }

  async getJurisdictionById(id: string): Promise<SelectJurisdictionType | undefined> {
    const [jurisdiction] = await db.select().from(jurisdictions).where(eq(jurisdictions.id, id));
    return jurisdiction;
  }

  async createJurisdiction(jurisdiction: InsertJurisdictionType): Promise<SelectJurisdictionType> {
    const [newJurisdiction] = await db.insert(jurisdictions).values(jurisdiction).returning();
    return newJurisdiction;
  }

  async updateJurisdiction(id: string, updates: Partial<InsertJurisdictionType>): Promise<SelectJurisdictionType> {
    const [updatedJurisdiction] = await db
      .update(jurisdictions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(jurisdictions.id, id))
      .returning();
    
    if (!updatedJurisdiction) {
      throw new Error(`Jurisdiction with id ${id} not found`);
    }
    
    return updatedJurisdiction;
  }

  async deleteJurisdiction(id: string): Promise<void> {
    // Soft delete by setting isActive to false
    await db
      .update(jurisdictions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(jurisdictions.id, id));
  }

  // Role title operations
  async getRoleTitle(id: string): Promise<RoleTitle | undefined> {
    const [roleTitle] = await db.select().from(roleTitles).where(eq(roleTitles.id, id));
    return roleTitle;
  }

  async getRoleTitlesByBusiness(businessId: string): Promise<RoleTitle[]> {
    return await db.select().from(roleTitles).where(eq(roleTitles.businessId, businessId));
  }

  async getGlobalRoleTitles(): Promise<RoleTitle[]> {
    return await db.select().from(roleTitles).where(sql`${roleTitles.businessId} IS NULL`);
  }

  async getAllRoleTitles(): Promise<RoleTitle[]> {
    return await db.select().from(roleTitles);
  }

  async getRoleTitleByName(title: string, businessId: string): Promise<RoleTitle | undefined> {
    const [roleTitle] = await db
      .select()
      .from(roleTitles)
      .where(and(
        eq(roleTitles.title, title),
        eq(roleTitles.businessId, businessId)
      ));
    return roleTitle;
  }

  // Contract signing methods
  async getContractBySigningToken(token: string): Promise<Contract | undefined> {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.signingToken, token));
    
    return contract;
  }

  async updateContractSigningInfo(contractId: string, data: {
    signingToken: string;
    emailSentAt: Date;
  }): Promise<void> {
    await db
      .update(contracts)
      .set({
        signingToken: data.signingToken,
        emailSentAt: data.emailSentAt,
        updatedAt: new Date()
      })
      .where(eq(contracts.id, contractId));
  }

  async recordContractView(contractId: string, data: {
    ipAddress: string;
    location: string;
    userAgent: string;
  }): Promise<void> {
    await db
      .update(contracts)
      .set({
        emailViewedAt: new Date(),
        signingIpAddress: data.ipAddress,
        signingLocation: data.location,
        signingUserAgent: data.userAgent,
        updatedAt: new Date()
      })
      .where(eq(contracts.id, contractId));
  }

  async signContract(contractId: string, data: {
    signature: string;
    ipAddress: string;
    location: string;
    userAgent: string;
  }): Promise<void> {
    await db
      .update(contracts)
      .set({
        signedAt: new Date(),
        signatureText: data.signature,
        signingIpAddress: data.ipAddress,
        signingLocation: data.location,
        signingUserAgent: data.userAgent,
        status: 'active', // Change status to active when signed
        updatedAt: new Date()
      })
      .where(eq(contracts.id, contractId));
  }

  async getPendingSignatureContracts(workerId: string): Promise<Contract[]> {
    const pendingContracts = await db
      .select()
      .from(contracts)
      .where(and(
        eq(contracts.workerId, workerId),
        isNotNull(contracts.emailSentAt), // Email was sent
        isNull(contracts.signedAt) // Not yet signed
      ))
      .leftJoin(businesses, eq(contracts.businessId, businesses.id))
      .leftJoin(roleTitles, eq(contracts.roleTitleId, roleTitles.id))
      .leftJoin(countries, eq(contracts.countryId, countries.id));

    return pendingContracts.map(row => ({
      ...row.contracts,
      business: row.businesses,
      roleTitle: row.role_titles,
      country: row.countries
    }));
  }

  async createRoleTitle(roleTitle: InsertRoleTitle): Promise<RoleTitle> {
    const [created] = await db.insert(roleTitles).values(roleTitle).returning();
    return created;
  }

  // Third-party business operations
  async createThirdPartyBusiness(thirdPartyBusiness: InsertThirdPartyBusiness): Promise<ThirdPartyBusiness> {
    const [created] = await db.insert(thirdPartyBusinesses).values(thirdPartyBusiness).returning();
    return created;
  }

  async getThirdPartyBusinessByDetails(
    name: string, 
    email: string, 
    employingBusinessId: string
  ): Promise<ThirdPartyBusiness | undefined> {
    const [business] = await db
      .select()
      .from(thirdPartyBusinesses)
      .where(
        and(
          eq(thirdPartyBusinesses.name, name),
          eq(thirdPartyBusinesses.email, email),
          eq(thirdPartyBusinesses.employingBusinessId, employingBusinessId)
        )
      );
    return business;
  }

  async getThirdPartyBusinessesByEmployingBusiness(employingBusinessId: string): Promise<ThirdPartyBusiness[]> {
    return await db
      .select()
      .from(thirdPartyBusinesses)
      .where(eq(thirdPartyBusinesses.employingBusinessId, employingBusinessId));
  }

  // Worker operations
  async getWorkersByBusiness(businessId: string): Promise<(Worker & { country: Country })[]> {
    const result = await db
      .select()
      .from(workers)
      .innerJoin(countries, eq(workers.countryId, countries.id))
      .where(eq(workers.businessId, businessId));

    return result.map(row => ({
      ...row.workers,
      country: row.countries
    }));
  }

  async getAllWorkers(): Promise<(Worker & { country: Country; business: Business })[]> {
    const result = await db
      .select()
      .from(workers)
      .innerJoin(countries, eq(workers.countryId, countries.id))
      .innerJoin(businesses, eq(workers.businessId, businesses.id));

    return result.map(row => ({
      ...row.workers,
      country: row.countries,
      business: row.businesses
    }));
  }

  async createWorker(worker: InsertWorker): Promise<Worker> {
    const [created] = await db.insert(workers).values(worker).returning();
    return created;
  }

  async getWorkerById(id: string): Promise<Worker | undefined> {
    const [worker] = await db.select().from(workers).where(eq(workers.id, id));
    return worker;
  }

  async getWorkerByUserId(userId: string): Promise<Worker | undefined> {
    const [worker] = await db.select().from(workers).where(eq(workers.userId, userId));
    return worker;
  }

  async getWorkerByInvitationToken(tokenHash: string): Promise<Worker | undefined> {
    const [worker] = await db.select().from(workers).where(eq(workers.invitationToken, tokenHash));
    return worker;
  }

  async updateWorkerProfile(workerId: string, updates: Partial<Worker>): Promise<Worker> {
    const [updated] = await db
      .update(workers)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(workers.id, workerId))
      .returning();
    return updated;
  }

  // Contract operations
  async getContractsByBusiness(businessId: string): Promise<(Contract & { worker: Worker; country: Country; roleTitle?: RoleTitle; thirdPartyBusinessName?: string })[]> {
    const result = await db
      .select()
      .from(contracts)
      .innerJoin(workers, eq(contracts.workerId, workers.id))
      .innerJoin(countries, eq(contracts.countryId, countries.id))
      .leftJoin(roleTitles, eq(contracts.roleTitleId, roleTitles.id))
      .leftJoin(thirdPartyBusinesses, eq(contracts.thirdPartyBusinessId, thirdPartyBusinesses.id))
      .where(eq(contracts.businessId, businessId));

    return result.map(row => ({
      ...row.contracts,
      worker: row.workers,
      country: row.countries,
      roleTitle: row.role_titles || undefined,
      thirdPartyBusinessName: row.third_party_businesses?.name || undefined
    }));
  }

  async getContractsByWorker(workerId: string): Promise<(Contract & { business: Business; country: Country; roleTitle?: RoleTitle })[]> {
    const result = await db
      .select()
      .from(contracts)
      .innerJoin(businesses, eq(contracts.businessId, businesses.id))
      .innerJoin(countries, eq(contracts.countryId, countries.id))
      .leftJoin(roleTitles, eq(contracts.roleTitleId, roleTitles.id))
      .where(eq(contracts.workerId, workerId));

    return result.map(row => ({
      ...row.contracts,
      business: row.businesses,
      country: row.countries,
      roleTitle: row.role_titles || undefined
    }));
  }

  async getAllContracts(): Promise<(Contract & { worker: Worker; business: Business; country: Country; roleTitle?: RoleTitle; thirdPartyBusinessName?: string })[]> {
    const result = await db
      .select()
      .from(contracts)
      .innerJoin(workers, eq(contracts.workerId, workers.id))
      .innerJoin(businesses, eq(contracts.businessId, businesses.id))
      .innerJoin(countries, eq(contracts.countryId, countries.id))
      .leftJoin(roleTitles, eq(contracts.roleTitleId, roleTitles.id))
      .leftJoin(thirdPartyBusinesses, eq(contracts.thirdPartyBusinessId, thirdPartyBusinesses.id));

    return result.map(row => ({
      ...row.contracts,
      worker: row.workers,
      business: row.businesses,
      country: row.countries,
      roleTitle: row.role_titles || undefined,
      thirdPartyBusinessName: row.third_party_businesses?.name || undefined
    }));
  }

  async getContractsByCustomerBusiness(customerBusinessId: string): Promise<(Contract & { worker: Worker; business: Business; country: Country })[]> {
    const result = await db
      .select()
      .from(contracts)
      .innerJoin(workers, eq(contracts.workerId, workers.id))
      .innerJoin(businesses, eq(contracts.businessId, businesses.id))
      .innerJoin(countries, eq(contracts.countryId, countries.id))
      .where(eq(contracts.customerBusinessId, customerBusinessId));

    return result.map(row => ({
      ...row.contracts,
      worker: row.workers,
      business: row.businesses,
      country: row.countries,
    }));
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [created] = await db.insert(contracts).values(contract).returning();
    return created;
  }

  async getContractById(id: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }

  async updateContract(id: string, updates: Partial<InsertContract>): Promise<Contract> {
    const [updated] = await db
      .update(contracts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, id))
      .returning();
    return updated;
  }

  async getContract(id: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }

  async updateContractStatus(id: string, status: string): Promise<void> {
    await db
      .update(contracts)
      .set({
        status: status as any,
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, id));
  }

  // Remuneration Line operations
  async createRemunerationLines(lines: InsertRemunerationLineType[]): Promise<void> {
    if (lines.length === 0) return;
    await db.insert(remunerationLines).values(lines);
  }

  async getRemunerationLinesByContractId(contractId: string): Promise<RemunerationLine[]> {
    return await db
      .select()
      .from(remunerationLines)
      .where(eq(remunerationLines.contractId, contractId));
  }

  async deleteRemunerationLinesByContractId(contractId: string): Promise<void> {
    await db
      .delete(remunerationLines)
      .where(eq(remunerationLines.contractId, contractId));
  }

  async createRemunerationLine(line: InsertRemunerationLineType): Promise<RemunerationLine> {
    const [created] = await db.insert(remunerationLines).values(line).returning();
    return created;
  }

  async updateRemunerationLine(id: string, data: Partial<InsertRemunerationLineType>): Promise<RemunerationLine> {
    const [updated] = await db
      .update(remunerationLines)
      .set(data)
      .where(eq(remunerationLines.id, id))
      .returning();
    return updated;
  }

  async deleteRemunerationLine(id: string): Promise<void> {
    await db
      .delete(remunerationLines)
      .where(eq(remunerationLines.id, id));
  }

  // Contract Rate Lines
  async getContractRateLines(contractId: string): Promise<SelectContractRateLine[]> {
    return await db
      .select()
      .from(contractRateLines)
      .where(eq(contractRateLines.contractId, contractId))
      .orderBy(contractRateLines.sortOrder);
  }

  async createContractRateLine(data: InsertContractRateLine): Promise<SelectContractRateLine> {
    const [line] = await db.insert(contractRateLines).values(data).returning();
    return line;
  }

  async updateContractRateLine(id: string, data: Partial<InsertContractRateLine>): Promise<SelectContractRateLine> {
    const [line] = await db
      .update(contractRateLines)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contractRateLines.id, id))
      .returning();
    return line;
  }

  async deleteContractRateLine(id: string): Promise<void> {
    await db.delete(contractRateLines).where(eq(contractRateLines.id, id));
  }

  async replaceContractRateLines(contractId: string, lines: InsertContractRateLine[]): Promise<SelectContractRateLine[]> {
    await db.delete(contractRateLines).where(eq(contractRateLines.contractId, contractId));
    if (lines.length === 0) return [];
    return await db.insert(contractRateLines).values(lines).returning();
  }

  // Contract Billing Lines (SDP-only)
  async getContractBillingLines(contractId: string): Promise<SelectContractBillingLine[]> {
    return await db
      .select()
      .from(contractBillingLines)
      .where(eq(contractBillingLines.contractId, contractId))
      .orderBy(contractBillingLines.sortOrder);
  }

  async createContractBillingLine(data: InsertContractBillingLine): Promise<SelectContractBillingLine> {
    const [line] = await db.insert(contractBillingLines).values(data).returning();
    return line;
  }

  async updateContractBillingLine(id: string, data: Partial<InsertContractBillingLine>): Promise<SelectContractBillingLine> {
    const [line] = await db
      .update(contractBillingLines)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contractBillingLines.id, id))
      .returning();
    return line;
  }

  async deleteContractBillingLine(id: string): Promise<void> {
    await db.delete(contractBillingLines).where(eq(contractBillingLines.id, id));
  }

  async replaceContractBillingLines(contractId: string, lines: InsertContractBillingLine[]): Promise<SelectContractBillingLine[]> {
    await db.delete(contractBillingLines).where(eq(contractBillingLines.contractId, contractId));
    if (lines.length === 0) return [];
    return await db.insert(contractBillingLines).values(lines).returning();
  }

  // Purchase Orders
  async getPurchaseOrdersByContract(contractId: string): Promise<SelectPurchaseOrder[]> {
    return await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.contractId, contractId))
      .orderBy(purchaseOrders.createdAt);
  }

  async getPurchaseOrdersForBusiness(businessId: string): Promise<(SelectPurchaseOrder & { contractWorkerName?: string; businessName?: string })[]> {
    const rows = await db
      .select({
        po: purchaseOrders,
        workerFirstName: workers.firstName,
        workerLastName: workers.lastName,
        businessName: businesses.name,
      })
      .from(purchaseOrders)
      .innerJoin(contracts, eq(purchaseOrders.contractId, contracts.id))
      .innerJoin(workers, eq(contracts.workerId, workers.id))
      .innerJoin(businesses, eq(contracts.businessId, businesses.id))
      .where(eq(contracts.businessId, businessId));
    return rows.map(r => ({
      ...r.po,
      contractWorkerName: `${r.workerFirstName} ${r.workerLastName}`.trim(),
      businessName: r.businessName,
    }));
  }

  async getAllPurchaseOrders(filters?: { businessId?: string; status?: string }): Promise<(SelectPurchaseOrder & { contractWorkerName?: string; businessName?: string })[]> {
    const rows = await db
      .select({
        po: purchaseOrders,
        workerFirstName: workers.firstName,
        workerLastName: workers.lastName,
        businessName: businesses.name,
      })
      .from(purchaseOrders)
      .innerJoin(contracts, eq(purchaseOrders.contractId, contracts.id))
      .innerJoin(workers, eq(contracts.workerId, workers.id))
      .innerJoin(businesses, eq(contracts.businessId, businesses.id));
    return rows.map(r => ({
      ...r.po,
      contractWorkerName: `${r.workerFirstName} ${r.workerLastName}`.trim(),
      businessName: r.businessName,
    }));
  }

  async createPurchaseOrder(data: InsertPurchaseOrder): Promise<SelectPurchaseOrder> {
    const [po] = await db.insert(purchaseOrders).values(data).returning();
    return po;
  }

  async updatePurchaseOrder(id: string, data: Partial<InsertPurchaseOrder>): Promise<SelectPurchaseOrder> {
    const [po] = await db
      .update(purchaseOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id))
      .returning();
    return po;
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
  }

  // Timesheet operations
  async getTimesheetsByWorker(workerId: string): Promise<(Timesheet & { entries: TimesheetEntry[]; attachments: TimesheetAttachment[]; countryId?: string; countryName?: string })[]> {
    const customerBusinesses = alias(businesses, 'customer_businesses');
    const timesheetData = await db
      .select({
        timesheets,
        timesheet_entries: timesheetEntries,
        timesheet_attachments: timesheetAttachments,
        countryId: countries.id,
        countryName: countries.name,
      })
      .from(timesheets)
      .leftJoin(timesheetEntries, eq(timesheets.id, timesheetEntries.timesheetId))
      .leftJoin(timesheetAttachments, eq(timesheets.id, timesheetAttachments.timesheetId))
      .leftJoin(workers, eq(timesheets.workerId, workers.id))
      .leftJoin(countries, eq(workers.countryId, countries.id))
      .where(eq(timesheets.workerId, workerId));
    
    const timesheetMap = new Map<string, Timesheet & { entries: TimesheetEntry[]; attachments: TimesheetAttachment[]; countryId?: string; countryName?: string }>();
    
    for (const row of timesheetData) {
      if (!timesheetMap.has(row.timesheets.id)) {
        timesheetMap.set(row.timesheets.id, {
          ...row.timesheets,
          entries: [],
          attachments: [],
          countryId: row.countryId ?? undefined,
          countryName: row.countryName ?? undefined,
        });
      }
      if (row.timesheet_entries) {
        const existing = timesheetMap.get(row.timesheets.id)!;
        if (!existing.entries.find(e => e.id === row.timesheet_entries!.id)) {
          existing.entries.push(row.timesheet_entries);
        }
      }
      if (row.timesheet_attachments) {
        const existing = timesheetMap.get(row.timesheets.id)!;
        if (!existing.attachments.find(a => a.id === row.timesheet_attachments!.id)) {
          existing.attachments.push(row.timesheet_attachments);
        }
      }
    }
    
    return Array.from(timesheetMap.values());
  }

  async getTimesheetsByBusiness(businessId: string): Promise<(Timesheet & { worker: Worker; entries: TimesheetEntry[]; attachments: TimesheetAttachment[]; countryId?: string; countryName?: string; customerBusinessId?: string; customerBusinessName?: string })[]> {
    const customerBusinesses = alias(businesses, 'customer_businesses');
    const timesheetData = await db
      .select({
        timesheets,
        workers,
        timesheet_entries: timesheetEntries,
        timesheet_attachments: timesheetAttachments,
        countryId: countries.id,
        countryName: countries.name,
        customerBusinessId: contracts.customerBusinessId,
        customerBusinessName: customerBusinesses.name,
      })
      .from(timesheets)
      .leftJoin(workers, eq(timesheets.workerId, workers.id))
      .leftJoin(timesheetEntries, eq(timesheets.id, timesheetEntries.timesheetId))
      .leftJoin(timesheetAttachments, eq(timesheets.id, timesheetAttachments.timesheetId))
      .leftJoin(countries, eq(workers.countryId, countries.id))
      .leftJoin(contracts, eq(timesheets.contractId, contracts.id))
      .leftJoin(customerBusinesses, eq(contracts.customerBusinessId, customerBusinesses.id))
      .where(eq(timesheets.businessId, businessId));
    
    const timesheetMap = new Map<string, Timesheet & { worker: Worker; entries: TimesheetEntry[]; attachments: TimesheetAttachment[]; countryId?: string; countryName?: string; customerBusinessId?: string; customerBusinessName?: string }>();
    
    for (const row of timesheetData) {
      if (!timesheetMap.has(row.timesheets.id)) {
        timesheetMap.set(row.timesheets.id, { 
          ...row.timesheets, 
          worker: row.workers!, 
          entries: [],
          attachments: [],
          countryId: row.countryId ?? undefined,
          countryName: row.countryName ?? undefined,
          customerBusinessId: row.customerBusinessId ?? undefined,
          customerBusinessName: row.customerBusinessName ?? undefined,
        });
      }
      if (row.timesheet_entries) {
        const existing = timesheetMap.get(row.timesheets.id)!;
        if (!existing.entries.find(e => e.id === row.timesheet_entries!.id)) {
          existing.entries.push(row.timesheet_entries);
        }
      }
      if (row.timesheet_attachments) {
        const existing = timesheetMap.get(row.timesheets.id)!;
        if (!existing.attachments.find(a => a.id === row.timesheet_attachments!.id)) {
          existing.attachments.push(row.timesheet_attachments);
        }
      }
    }
    
    return Array.from(timesheetMap.values());
  }

  async getTimesheetsByCustomerBusiness(customerBusinessId: string): Promise<(Timesheet & { worker: Worker; entries: TimesheetEntry[]; attachments: TimesheetAttachment[]; providedByBusinessName: string })[]> {
    // Find all contracts where this business is the host client (customerBusinessId)
    const contractsForCustomer = await db
      .select()
      .from(contracts)
      .innerJoin(businesses, eq(contracts.businessId, businesses.id))
      .where(eq(contracts.customerBusinessId, customerBusinessId));

    if (contractsForCustomer.length === 0) return [];

    // Build a map: workerId -> providing business name (from the contract's businessId)
    const workerToProviderMap = new Map<string, string>();
    const workerToBusinessIdMap = new Map<string, string>();
    for (const r of contractsForCustomer) {
      workerToProviderMap.set(r.contracts.workerId, r.businesses.name);
      workerToBusinessIdMap.set(r.contracts.workerId, r.contracts.businessId);
    }
    const workerIdSet = new Set(workerToProviderMap.keys());
    const businessIdSet = new Set(workerToBusinessIdMap.values());

    if (workerIdSet.size === 0) return [];

    // Fetch timesheets across all relevant businesses for these workers
    // Using inArray requires drizzle's inArray helper
    const { inArray } = await import('drizzle-orm');
    const timesheetData = await db
      .select()
      .from(timesheets)
      .leftJoin(workers, eq(timesheets.workerId, workers.id))
      .leftJoin(timesheetEntries, eq(timesheets.id, timesheetEntries.timesheetId))
      .leftJoin(timesheetAttachments, eq(timesheets.id, timesheetAttachments.timesheetId))
      .where(inArray(timesheets.businessId, [...businessIdSet]));

    // Filter to only timesheets for workers provided to this customer
    const filteredTimesheetData = timesheetData.filter(row =>
      row.timesheets.workerId && workerIdSet.has(row.timesheets.workerId)
    );

    const timesheetMap = new Map<string, Timesheet & { worker: Worker; entries: TimesheetEntry[]; attachments: TimesheetAttachment[]; providedByBusinessName: string }>();

    for (const row of filteredTimesheetData) {
      if (!timesheetMap.has(row.timesheets.id)) {
        timesheetMap.set(row.timesheets.id, {
          ...row.timesheets,
          worker: row.workers!,
          entries: [],
          attachments: [],
          providedByBusinessName: workerToProviderMap.get(row.timesheets.workerId || '') || 'Unknown Business',
        });
      }
      if (row.timesheet_entries) {
        const existing = timesheetMap.get(row.timesheets.id)!;
        if (!existing.entries.find(e => e.id === row.timesheet_entries!.id)) {
          existing.entries.push(row.timesheet_entries);
        }
      }
      if (row.timesheet_attachments) {
        const existing = timesheetMap.get(row.timesheets.id)!;
        if (!existing.attachments.find(a => a.id === row.timesheet_attachments!.id)) {
          existing.attachments.push(row.timesheet_attachments);
        }
      }
    }

    return Array.from(timesheetMap.values());
  }

  async createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet> {
    const [created] = await db.insert(timesheets).values(timesheet).returning();
    return created;
  }

  async updateTimesheetStatus(timesheetId: string, status: string, approvedBy?: string, rejectionReason?: string): Promise<void> {
    const updateData: any = {
      status: status as any,
      updatedAt: new Date(),
    };

    if (status === 'approved' && approvedBy) {
      updateData.approvedAt = new Date();
      updateData.approvedBy = approvedBy;
    } else if (status === 'rejected') {
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = rejectionReason;
    } else if (status === 'submitted') {
      updateData.submittedAt = new Date();
    }

    await db
      .update(timesheets)
      .set(updateData)
      .where(eq(timesheets.id, timesheetId));
  }

  async createTimesheetEntry(entry: InsertTimesheetEntry): Promise<TimesheetEntry> {
    const [created] = await db.insert(timesheetEntries).values(entry).returning();
    return created;
  }

  async updateTimesheetEntry(entryId: string, hoursWorked: string, description?: string): Promise<void> {
    await db
      .update(timesheetEntries)
      .set({
        hoursWorked,
        description,
        updatedAt: new Date(),
      })
      .where(eq(timesheetEntries.id, entryId));
  }

  async updateTimesheet(timesheetId: string, data: Partial<InsertTimesheet>): Promise<Timesheet> {
    return await db.transaction(async (tx) => {
      // Extract entries if present to handle separately
      const { entries, ...timesheetData } = data as any;
      
      // Update the timesheet itself
      const [updatedTimesheet] = await tx
        .update(timesheets)
        .set({
          ...timesheetData,
          updatedAt: new Date(),
        })
        .where(eq(timesheets.id, timesheetId))
        .returning();
      
      // If entries are provided, update them by deleting old ones and inserting new ones
      if (entries && Array.isArray(entries)) {
        // Delete existing entries
        await tx.delete(timesheetEntries).where(eq(timesheetEntries.timesheetId, timesheetId));
        
        // Insert new entries
        if (entries.length > 0) {
          await tx.insert(timesheetEntries).values(
            entries.map((entry: any) => ({
              ...entry,
              timesheetId,
            }))
          );
        }
      }
      
      return updatedTimesheet;
    });
  }

  async deleteTimesheet(timesheetId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete related entries and attachments first (due to foreign key constraints)
      await tx.delete(timesheetEntries).where(eq(timesheetEntries.timesheetId, timesheetId));
      await tx.delete(timesheetAttachments).where(eq(timesheetAttachments.timesheetId, timesheetId));
      
      // Delete the timesheet
      await tx.delete(timesheets).where(eq(timesheets.id, timesheetId));
    });
  }

  async getAllTimesheets(): Promise<(Timesheet & { worker: Worker; business: Business; entries: TimesheetEntry[]; attachments: TimesheetAttachment[]; countryId?: string; countryName?: string; customerBusinessId?: string; customerBusinessName?: string })[]> {
    const customerBusinesses = alias(businesses, 'customer_businesses');
    const timesheetData = await db
      .select({
        timesheets,
        workers,
        businesses,
        timesheet_entries: timesheetEntries,
        timesheet_attachments: timesheetAttachments,
        countryId: countries.id,
        countryName: countries.name,
        customerBusinessId: contracts.customerBusinessId,
        customerBusinessName: customerBusinesses.name,
      })
      .from(timesheets)
      .leftJoin(workers, eq(timesheets.workerId, workers.id))
      .leftJoin(businesses, eq(timesheets.businessId, businesses.id))
      .leftJoin(timesheetEntries, eq(timesheets.id, timesheetEntries.timesheetId))
      .leftJoin(timesheetAttachments, eq(timesheets.id, timesheetAttachments.timesheetId))
      .leftJoin(countries, eq(workers.countryId, countries.id))
      .leftJoin(contracts, eq(timesheets.contractId, contracts.id))
      .leftJoin(customerBusinesses, eq(contracts.customerBusinessId, customerBusinesses.id));
    
    const timesheetMap = new Map<string, Timesheet & { worker: Worker; business: Business; entries: TimesheetEntry[]; attachments: TimesheetAttachment[]; countryId?: string; countryName?: string; customerBusinessId?: string; customerBusinessName?: string }>();
    
    for (const row of timesheetData) {
      if (!timesheetMap.has(row.timesheets.id)) {
        timesheetMap.set(row.timesheets.id, { 
          ...row.timesheets, 
          worker: row.workers!, 
          business: row.businesses!,
          entries: [],
          attachments: [],
          countryId: row.countryId ?? undefined,
          countryName: row.countryName ?? undefined,
          customerBusinessId: row.customerBusinessId ?? undefined,
          customerBusinessName: row.customerBusinessName ?? undefined,
        });
      }
      if (row.timesheet_entries) {
        const existing = timesheetMap.get(row.timesheets.id)!;
        if (!existing.entries.find(e => e.id === row.timesheet_entries!.id)) {
          existing.entries.push(row.timesheet_entries);
        }
      }
      if (row.timesheet_attachments) {
        const existing = timesheetMap.get(row.timesheets.id)!;
        if (!existing.attachments.find(a => a.id === row.timesheet_attachments!.id)) {
          existing.attachments.push(row.timesheet_attachments);
        }
      }
    }
    
    return Array.from(timesheetMap.values());
  }

  async createTimesheetWithEntries(data: any): Promise<Timesheet> {
    return await db.transaction(async (tx) => {
      // Calculate total hours from entries (only count non-null hoursWorked values)
      const totalHours = data.entries.reduce((sum: number, entry: any) => {
        const h = parseFloat(entry.hoursWorked);
        return sum + (isNaN(h) ? 0 : h);
      }, 0);

      // Calculate total days from entries (only count non-null daysWorked values)

      // Create the timesheet
      const [timesheet] = await tx.insert(timesheets).values({
        contractId: data.contractId,
        workerId: data.workerId,
        businessId: data.businessId,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        totalHours: totalHours > 0 ? totalHours.toString() : '0',
        status: 'draft',
        notes: data.notes,
        createdBy: data.createdBy,
      }).returning();

      // Create the timesheet entries
      if (data.entries && data.entries.length > 0) {
        const entryData = data.entries.map((entry: any) => ({
          timesheetId: timesheet.id,
          date: new Date(entry.date),
          hoursWorked: (entry.hoursWorked !== undefined && entry.hoursWorked !== null)
            ? entry.hoursWorked.toString()
            : null,
          daysWorked: (entry.daysWorked !== undefined && entry.daysWorked !== null)
            ? entry.daysWorked.toString()
            : null,
          description: entry.description || null,
          startTime: entry.startTime || null,
          endTime: entry.endTime || null,
          breakHours: (entry.breakHours !== undefined && entry.breakHours !== null)
            ? entry.breakHours.toString()
            : null,
          projectRateLineId: entry.projectRateLineId || null,
        }));
        
        await tx.insert(timesheetEntries).values(entryData);
      }
      
      return timesheet;
    });
  }

  // Timesheet attachment operations
  async createTimesheetAttachment(attachment: InsertTimesheetAttachment): Promise<TimesheetAttachment> {
    const [created] = await db.insert(timesheetAttachments).values(attachment).returning();
    return created;
  }

  async getTimesheetAttachments(timesheetId: string): Promise<TimesheetAttachment[]> {
    return await db.select().from(timesheetAttachments).where(eq(timesheetAttachments.timesheetId, timesheetId));
  }

  async deleteTimesheetAttachment(attachmentId: string): Promise<void> {
    await db.delete(timesheetAttachments).where(eq(timesheetAttachments.id, attachmentId));
  }

  async getExpensesByTimesheetId(timesheetId: string): Promise<TimesheetExpense[]> {
    return await db.select().from(timesheetExpenses).where(eq(timesheetExpenses.timesheetId, timesheetId));
  }

  async createTimesheetExpense(data: Omit<InsertTimesheetExpense, 'date'> & { date: Date | string }): Promise<TimesheetExpense> {
    const insertData = {
      ...data,
      date: data.date instanceof Date ? data.date : new Date(data.date),
    };
    const [created] = await db.insert(timesheetExpenses).values(insertData as any).returning();
    return created;
  }

  async updateTimesheetExpense(id: string, data: Partial<InsertTimesheetExpense>): Promise<TimesheetExpense> {
    const [updated] = await db
      .update(timesheetExpenses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(timesheetExpenses.id, id))
      .returning();
    return updated;
  }

  async deleteTimesheetExpense(id: string): Promise<void> {
    await db.delete(timesheetExpenses).where(eq(timesheetExpenses.id, id));
  }

  async getTimesheetById(id: string): Promise<(Timesheet & { worker?: Worker; entries: TimesheetEntry[]; attachments: TimesheetAttachment[] }) | undefined> {
    const rows = await db
      .select()
      .from(timesheets)
      .leftJoin(workers, eq(timesheets.workerId, workers.id))
      .leftJoin(timesheetEntries, eq(timesheets.id, timesheetEntries.timesheetId))
      .leftJoin(timesheetAttachments, eq(timesheets.id, timesheetAttachments.timesheetId))
      .where(eq(timesheets.id, id));
    
    if (rows.length === 0) return undefined;
    
    const first = rows[0];
    const result: Timesheet & { worker?: Worker; entries: TimesheetEntry[]; attachments: TimesheetAttachment[] } = {
      ...first.timesheets,
      worker: first.workers || undefined,
      entries: [],
      attachments: [],
    };
    
    const seenEntries = new Set<string>();
    const seenAttachments = new Set<string>();
    for (const row of rows) {
      if (row.timesheet_entries && !seenEntries.has(row.timesheet_entries.id)) {
        seenEntries.add(row.timesheet_entries.id);
        result.entries.push(row.timesheet_entries);
      }
      if (row.timesheet_attachments && !seenAttachments.has(row.timesheet_attachments.id)) {
        seenAttachments.add(row.timesheet_attachments.id);
        result.attachments.push(row.timesheet_attachments);
      }
    }
    
    return result;
  }

  // Leave request operations
  async getLeaveRequestsByWorker(workerId: string): Promise<LeaveRequest[]> {
    return await db.select().from(leaveRequests).where(eq(leaveRequests.workerId, workerId));
  }

  async getLeaveRequestsByBusiness(businessId: string): Promise<(LeaveRequest & { worker: Worker })[]> {
    return await db
      .select()
      .from(leaveRequests)
      .leftJoin(workers, eq(leaveRequests.workerId, workers.id))
      .where(eq(leaveRequests.businessId, businessId))
      .then(rows => rows.map(row => ({ ...row.leave_requests, worker: row.workers! })));
  }

  async createLeaveRequest(leaveRequest: InsertLeaveRequest): Promise<LeaveRequest> {
    const [created] = await db.insert(leaveRequests).values(leaveRequest).returning();
    return created;
  }

  async updateLeaveRequestStatus(requestId: string, status: string, approvedBy?: string, rejectionReason?: string): Promise<void> {
    const updateData: any = {
      status: status as any,
      updatedAt: new Date(),
    };

    if (status === 'approved' && approvedBy) {
      updateData.approvedAt = new Date();
      updateData.approvedBy = approvedBy;
    } else if (status === 'rejected') {
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = rejectionReason;
    }

    await db
      .update(leaveRequests)
      .set(updateData)
      .where(eq(leaveRequests.id, requestId));
  }

  async getAllLeaveRequests(): Promise<(LeaveRequest & { worker: Worker; business: Business })[]> {
    return await db
      .select()
      .from(leaveRequests)
      .leftJoin(workers, eq(leaveRequests.workerId, workers.id))
      .leftJoin(businesses, eq(leaveRequests.businessId, businesses.id))
      .then(rows => rows.map(row => ({
        ...row.leave_requests,
        worker: row.workers!,
        business: row.businesses!
      })));
  }

  // Analytics operations
  async getBusinessAnalytics(businessId: string): Promise<{
    workersByCountry: { countryId: string; countryName: string; employees: number; contractors: number; total: number }[];
    pendingTimesheets: number;
    spendByCountryAndYear: { countryId: string; countryName: string; year: number; totalSpend: number }[];
    totalActiveWorkers: number;
    totalActiveContracts: number;
  }> {
    // Get workers by country
    const workersWithCountry = await db
      .select()
      .from(workers)
      .leftJoin(countries, eq(workers.countryId, countries.id))
      .where(eq(workers.businessId, businessId));

    const workersByCountry = workersWithCountry.reduce((acc, row) => {
      const countryId = row.workers.countryId;
      const countryName = row.countries?.name || 'Unknown';
      
      // Skip workers without a countryId
      if (!countryId) return acc;
      
      if (!acc[countryId]) {
        acc[countryId] = { countryId, countryName, employees: 0, contractors: 0, total: 0 };
      }
      
      if (row.workers.workerType === 'employee') {
        acc[countryId].employees++;
      } else if (row.workers.workerType === 'contractor') {
        acc[countryId].contractors++;
      }
      acc[countryId].total++;
      
      return acc;
    }, {} as Record<string, { countryId: string; countryName: string; employees: number; contractors: number; total: number }>);

    // Get pending timesheets count
    const pendingTimesheetsResult = await db
      .select()
      .from(timesheets)
      .where(and(
        eq(timesheets.businessId, businessId),
        eq(timesheets.status, 'submitted')
      ));

    // Get contract instances with spend data by country and year
    const contractsWithCountry = await db
      .select()
      .from(contractInstances)
      .leftJoin(countries, eq(contractInstances.countryId, countries.id))
      .where(and(
        eq(contractInstances.businessId, businessId),
        eq(contractInstances.signatureStatus, 'fully_signed')
      ));

    // Calculate spend by country and year (simplified calculation based on contract rates)
    const spendByCountryAndYear = contractsWithCountry.reduce((acc, row) => {
      const countryId = row.contract_instances.countryId;
      const countryName = row.countries?.name || 'Unknown';
      const currentYear = new Date().getFullYear();
      const rate = parseFloat(row.contract_instances.salaryAmount || '0') || 0;
      
      // Simplified annual spend calculation based on salary amount
      const annualSpend = rate;

      const key = `${countryId}-${currentYear}`;
      if (!acc[key]) {
        acc[key] = { countryId, countryName, year: currentYear, totalSpend: 0 };
      }
      acc[key].totalSpend += annualSpend;
      
      return acc;
    }, {} as Record<string, { countryId: string; countryName: string; year: number; totalSpend: number }>);

    // Get active workers and contracts count
    const activeWorkers = await db
      .select()
      .from(workers)
      .where(eq(workers.businessId, businessId));

    const activeContracts = await db
      .select()
      .from(contractInstances)
      .where(and(
        eq(contractInstances.businessId, businessId),
        eq(contractInstances.signatureStatus, 'fully_signed')
      ));

    return {
      workersByCountry: Object.values(workersByCountry),
      pendingTimesheets: pendingTimesheetsResult.length,
      spendByCountryAndYear: Object.values(spendByCountryAndYear),
      totalActiveWorkers: activeWorkers.length,
      totalActiveContracts: activeContracts.length,
    };
  }

  // Payslip operations for SDP internal users
  async getPayslipsByWorker(workerId: string): Promise<(Payslip & { uploadedByUser: User })[]> {
    return await db
      .select()
      .from(payslips)
      .leftJoin(users, eq(payslips.uploadedBy, users.id))
      .where(eq(payslips.workerId, workerId))
      .then(rows => rows.map(row => ({ ...row.payslips, uploadedByUser: row.users! })));
  }

  async getPayslipsByBusiness(businessId: string): Promise<(Payslip & { worker: Worker; uploadedByUser: User })[]> {
    return await db
      .select()
      .from(payslips)
      .leftJoin(workers, eq(payslips.workerId, workers.id))
      .leftJoin(users, eq(payslips.uploadedBy, users.id))
      .where(eq(payslips.businessId, businessId))
      .then(rows => rows.map(row => ({ ...row.payslips, worker: row.workers!, uploadedByUser: row.users! })));
  }

  async getPayslipsByCountries(countryIds: string[]): Promise<(Payslip & { worker: Worker & { country: Country }; business: Business; uploadedByUser: User })[]> {
    return await db
      .select()
      .from(payslips)
      .leftJoin(workers, eq(payslips.workerId, workers.id))
      .leftJoin(countries, eq(workers.countryId, countries.id))
      .leftJoin(businesses, eq(payslips.businessId, businesses.id))
      .leftJoin(users, eq(payslips.uploadedBy, users.id))
      .where(inArray(workers.countryId, countryIds))
      .then(rows => rows.map(row => ({ 
        ...row.payslips, 
        worker: { ...row.workers!, country: row.countries! }, 
        business: row.businesses!,
        uploadedByUser: row.users! 
      })));
  }

  async createPayslip(payslip: InsertPayslip): Promise<Payslip> {
    const [created] = await db.insert(payslips).values(payslip).returning();
    return created;
  }

  async getPayslipById(id: string): Promise<Payslip | undefined> {
    const [payslip] = await db.select().from(payslips).where(eq(payslips.id, id));
    return payslip;
  }

  // SDP internal user analytics
  async getSDPInternalAnalytics(countryIds: string[]): Promise<{
    totalPayslipsProcessed: number;
    totalWorkers: number;
    totalBusinesses: number;
    monthlyPayrollByCountry: { countryId: string; countryName: string; totalPayroll: number; currency: string }[];
  }> {
    // Get total payslips processed for accessible countries
    const payslipsInCountries = await db
      .select()
      .from(payslips)
      .leftJoin(workers, eq(payslips.workerId, workers.id))
      .where(inArray(workers.countryId, countryIds));

    // Get total workers in accessible countries
    const workersInCountries = await db
      .select()
      .from(workers)
      .where(inArray(workers.countryId, countryIds));

    // Get total businesses with workers in accessible countries
    const businessesInCountries = await db
      .select()
      .from(businesses)
      .leftJoin(workers, eq(businesses.id, workers.businessId))
      .where(inArray(workers.countryId, countryIds));

    const uniqueBusinesses = new Set(businessesInCountries.map(row => row.businesses.id));

    // Calculate monthly payroll by country
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyPayrollData = await db
      .select()
      .from(payslips)
      .leftJoin(workers, eq(payslips.workerId, workers.id))
      .leftJoin(countries, eq(workers.countryId, countries.id))
      .where(inArray(workers.countryId, countryIds));

    const monthlyPayrollByCountry = monthlyPayrollData
      .filter(row => {
        const payDate = new Date(row.payslips.payDate);
        return payDate.getMonth() === currentMonth && payDate.getFullYear() === currentYear;
      })
      .reduce((acc, row) => {
        const countryId = row.workers!.countryId;
        const countryName = row.countries!.name;
        const currency = row.countries!.currency;
        const netPay = parseFloat(row.payslips.netPay) || 0;

        // Skip if countryId is null
        if (!countryId) return acc;

        const existing = acc.find(item => item.countryId === countryId);
        if (existing) {
          existing.totalPayroll += netPay;
        } else {
          acc.push({
            countryId,
            countryName,
            totalPayroll: netPay,
            currency,
          });
        }
        return acc;
      }, [] as { countryId: string; countryName: string; totalPayroll: number; currency: string }[]);

    return {
      totalPayslipsProcessed: payslipsInCountries.length,
      totalWorkers: workersInCountries.length,
      totalBusinesses: uniqueBusinesses.size,
      monthlyPayrollByCountry,
    };
  }

  // Invoice operations
  async getInvoicesByBusiness(businessId: string): Promise<(Invoice & { contractor: Worker & { country: Country }; business: Business })[]> {
    const result = await db
      .select()
      .from(invoices)
      .leftJoin(workers, eq(invoices.contractorId, workers.id))
      .leftJoin(countries, eq(workers.countryId, countries.id))
      .leftJoin(businesses, eq(invoices.businessId, businesses.id))
      .where(eq(invoices.businessId, businessId));

    return result.map(row => ({
      ...row.invoices,
      contractor: {
        ...row.workers!,
        country: row.countries!,
      },
      business: row.businesses!,
    }));
  }

  async getInvoicesByContractor(contractorId: string): Promise<(Invoice & { contractor: Worker & { country: Country }; business: Business })[]> {
    const result = await db
      .select()
      .from(invoices)
      .leftJoin(workers, eq(invoices.contractorId, workers.id))
      .leftJoin(countries, eq(workers.countryId, countries.id))
      .leftJoin(businesses, eq(invoices.businessId, businesses.id))
      .where(eq(invoices.contractorId, contractorId));

    return result.map(row => ({
      ...row.invoices,
      contractor: {
        ...row.workers!,
        country: row.countries!,
      },
      business: row.businesses!,
    }));
  }

  async getAllInvoices(): Promise<(Invoice & { contractor: Worker & { country: Country }; business: Business })[]> {
    const result = await db
      .select()
      .from(invoices)
      .leftJoin(workers, eq(invoices.contractorId, workers.id))
      .leftJoin(countries, eq(workers.countryId, countries.id))
      .leftJoin(businesses, eq(invoices.businessId, businesses.id));

    return result.map(row => ({
      ...row.invoices,
      contractor: {
        ...row.workers!,
        country: row.countries!,
      },
      business: row.businesses!,
    }));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db
      .insert(invoices)
      .values({
        ...invoice,
        submittedAt: invoice.status === 'submitted' ? new Date() : null,
      })
      .returning();
    return created;
  }

  async updateInvoiceStatus(id: string, status: string, reviewedBy?: string): Promise<void> {
    await db
      .update(invoices)
      .set({
        status: status as any,
        reviewedAt: new Date(),
        reviewedBy,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id));
  }

  async createInvoiceFromTimesheet(timesheetId: string, invoiceData: Partial<InsertInvoice>): Promise<Invoice> {
    // Get timesheet data
    const [timesheet] = await db
      .select()
      .from(timesheets)
      .leftJoin(workers, eq(timesheets.workerId, workers.id))
      .leftJoin(contracts, eq(timesheets.contractId, contracts.id))
      .where(eq(timesheets.id, timesheetId));

    if (!timesheet) {
      throw new Error('Timesheet not found');
    }

    const worker = timesheet.workers!;
    const contract = timesheet.contracts!;
    const timesheetData = timesheet.timesheets;

    // Get timesheet entries to calculate total hours
    const entries = await db
      .select()
      .from(timesheetEntries)
      .where(eq(timesheetEntries.timesheetId, timesheetId));

    const rateType = contract.rateType || 'hourly';
    const rate = parseFloat(contract.rate) || 0;
    let subtotal = 0;

    if (rateType === 'daily') {
      const totalDays = entries.reduce((sum, entry) => sum + (parseFloat(entry.daysWorked || '0') || 0), 0);
      subtotal = totalDays * rate;
    } else if (rateType === 'annual') {
      const daysPresent = entries.filter((e) => e.isPresent).length;
      subtotal = daysPresent * (rate / 260);
    } else {
      const totalHours = entries.reduce((sum, entry) => sum + (parseFloat(entry.hoursWorked || '0') || 0), 0);
      subtotal = totalHours * rate;
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    const invoice: InsertInvoice = {
      contractorId: worker.id,
      businessId: timesheetData.businessId,
      invoiceNumber,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      periodStart: timesheetData.periodStart,
      periodEnd: timesheetData.periodEnd,
      description: `Services rendered for ${timesheetData.periodStart.toISOString().split('T')[0]} to ${timesheetData.periodEnd.toISOString().split('T')[0]}`,
      hoursWorked: totalHours.toString(),
      hourlyRate: hourlyRate.toString(),
      subtotal: subtotal.toString(),
      taxAmount: '0',
      totalAmount: subtotal.toString(),
      currency: 'USD',
      status: 'draft',
      timesheetId,
      ...invoiceData,
    };

    return await this.createInvoice(invoice);
  }

  // Contract Template operations
  async getContractTemplates(): Promise<(ContractTemplate & { country?: Country; uploadedByUser?: User })[]> {
    return await db
      .select()
      .from(contractTemplates)
      .leftJoin(countries, eq(contractTemplates.countryId, countries.id))
      .leftJoin(users, eq(contractTemplates.uploadedBy, users.id))
      .then(rows => rows.map(row => ({ 
        ...row.contract_templates, 
        country: row.countries || undefined,
        uploadedByUser: row.users || undefined
      })));
  }

  async getContractTemplatesByCountry(countryId: string, employmentType?: string): Promise<(ContractTemplate & { country?: Country; uploadedByUser?: User })[]> {
    const conditions = [
      or(
        eq(contractTemplates.countryId, countryId), // Country-specific templates
        isNull(contractTemplates.countryId)         // Global templates (null countryId)
      ),
      eq(contractTemplates.isActive, true) // Only show active templates
    ];

    if (employmentType) {
      conditions.push(eq(contractTemplates.employmentType, employmentType as any));
    }

    return await db
      .select()
      .from(contractTemplates)
      .leftJoin(countries, eq(contractTemplates.countryId, countries.id))
      .leftJoin(users, eq(contractTemplates.uploadedBy, users.id))
      .where(and(...conditions))
      .then(rows => rows.map(row => ({ 
        ...row.contract_templates, 
        country: row.countries || undefined,
        uploadedByUser: row.users || undefined
      })));
  }

  async createContractTemplate(template: InsertContractTemplate): Promise<ContractTemplate> {
    const [created] = await db.insert(contractTemplates).values(template).returning();
    return created;
  }

  async getContractTemplateById(id: string): Promise<ContractTemplate | undefined> {
    const [template] = await db.select().from(contractTemplates).where(eq(contractTemplates.id, id));
    return template;
  }

  async updateContractTemplate(id: string, updates: Partial<ContractTemplate>): Promise<ContractTemplate> {
    const [updated] = await db
      .update(contractTemplates)
      .set(updates)
      .where(eq(contractTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteContractTemplate(id: string): Promise<void> {
    await db.delete(contractTemplates).where(eq(contractTemplates.id, id));
  }

  async getContractTemplateByType(employmentType: string, countryId?: string): Promise<ContractTemplate | undefined> {
    const conditions = [eq(contractTemplates.employmentType, employmentType as any)];
    
    if (countryId) {
      conditions.push(eq(contractTemplates.countryId, countryId));
    }

    const [template] = await db
      .select()
      .from(contractTemplates)
      .where(and(...conditions));
      
    return template;
  }

  // Contract Instance operations
  async getContractInstances(): Promise<(ContractInstance & { template: ContractTemplate; worker: Worker; business: Business; country: Country })[]> {
    return await db
      .select()
      .from(contractInstances)
      .leftJoin(contractTemplates, eq(contractInstances.templateId, contractTemplates.id))
      .leftJoin(workers, eq(contractInstances.workerId, workers.id))
      .leftJoin(businesses, eq(contractInstances.businessId, businesses.id))
      .leftJoin(countries, eq(contractInstances.countryId, countries.id))
      .then(rows => rows.map(row => ({ 
        ...row.contract_instances, 
        template: row.contract_templates!,
        worker: row.workers!,
        business: row.businesses!,
        country: row.countries!
      })));
  }

  async getContractInstancesByBusinessId(businessId: string): Promise<(ContractInstance & { template: ContractTemplate; worker: Worker; country: Country })[]> {
    return await db
      .select()
      .from(contractInstances)
      .leftJoin(contractTemplates, eq(contractInstances.templateId, contractTemplates.id))
      .leftJoin(workers, eq(contractInstances.workerId, workers.id))
      .leftJoin(countries, eq(contractInstances.countryId, countries.id))
      .where(eq(contractInstances.businessId, businessId))
      .then(rows => rows.map(row => ({ 
        ...row.contract_instances, 
        template: row.contract_templates!,
        worker: row.workers!,
        country: row.countries!
      })));
  }

  async getContractInstancesByWorkerId(workerId: string): Promise<(ContractInstance & { template: ContractTemplate; business: Business; country: Country })[]> {
    return await db
      .select()
      .from(contractInstances)
      .leftJoin(contractTemplates, eq(contractInstances.templateId, contractTemplates.id))
      .leftJoin(businesses, eq(contractInstances.businessId, businesses.id))
      .leftJoin(countries, eq(contractInstances.countryId, countries.id))
      .where(eq(contractInstances.workerId, workerId))
      .then(rows => rows.map(row => ({ 
        ...row.contract_instances, 
        template: row.contract_templates!,
        business: row.businesses!,
        country: row.countries!
      })));
  }

  async createContractInstance(instance: InsertContractInstance): Promise<ContractInstance> {
    const [created] = await db.insert(contractInstances).values(instance).returning();
    return created;
  }

  async updateContractInstanceStatus(id: string, updates: Partial<ContractInstance>): Promise<void> {
    await db
      .update(contractInstances)
      .set(updates)
      .where(eq(contractInstances.id, id));
  }

  async generateContractContent(template: ContractTemplate, variables: Record<string, string>): Promise<string> {
    let content = template.template;
    
    // Replace simple template variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      content = content.replace(regex, value || '');
    });

    // Handle conditional blocks {{#key}}...{{/key}}
    Object.entries(variables).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        // Show content if variable has value
        const conditionalRegex = new RegExp(`{{#\\s*${key}\\s*}}([\\s\\S]*?){{\\/${key}\\s*}}`, 'g');
        content = content.replace(conditionalRegex, '$1');
      } else {
        // Remove content if variable is empty
        const conditionalRegex = new RegExp(`{{#\\s*${key}\\s*}}[\\s\\S]*?{{\\/${key}\\s*}}`, 'g');
        content = content.replace(conditionalRegex, '');
      }
    });

    // Handle inverted conditional blocks {{^key}}...{{/key}} (show if empty)
    Object.entries(variables).forEach(([key, value]) => {
      if (!value || value.trim() === '') {
        // Show content if variable is empty
        const invertedRegex = new RegExp(`{{\\^\\s*${key}\\s*}}([\\s\\S]*?){{\\/${key}\\s*}}`, 'g');
        content = content.replace(invertedRegex, '$1');
      } else {
        // Remove content if variable has value
        const invertedRegex = new RegExp(`{{\\^\\s*${key}\\s*}}[\\s\\S]*?{{\\/${key}\\s*}}`, 'g');
        content = content.replace(invertedRegex, '');
      }
    });

    return content;
  }

  // Enhanced contract generation with country-specific overrides and complete data merging
  async generateUniversalContract(
    templateId: string,
    businessId: string,
    workerId: string,
    contractData: any
  ): Promise<{ content: string; variables: Record<string, string> }> {
    // Get all required data
    const template = await this.getContractTemplateById(templateId);
    const business = await this.getBusinessById(businessId);
    const worker = await this.getWorkerById(workerId);
    
    if (!template || !business || !worker) {
      throw new Error('Template, business, or worker not found');
    }

    // Get country data for business location (for SDP entity details)
    const country = await this.getCountryById(business.accessibleCountries?.[0] || 'us');
    if (!country) {
      throw new Error('Country data not found');
    }

    // Format notice period
    let noticePeriod = '';
    let noticePeriodDays = '';
    if (contractData.noticePeriodDays) {
      const days = parseInt(contractData.noticePeriodDays);
      if (!isNaN(days) && days > 0) {
        noticePeriodDays = days.toString();
        noticePeriod = `${days} day${days === 1 ? '' : 's'} notice`;
      }
    }

    // Fetch remuneration lines if contractId is provided
    let remunerationLines = '';
    let remunerationLinesTable = '';
    let baseSalary = '';
    let bonus = '';
    let commission = '';
    let allowance = '';
    
    if (contractData.contractId) {
      const lines = await this.getRemunerationLinesByContractId(contractData.contractId);
      
      if (lines && lines.length > 0) {
        // Format as HTML table for PDF rendering
        remunerationLinesTable = `
<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
  <thead>
    <tr>
      <th>Type</th>
      <th>Description</th>
      <th>Amount</th>
      <th>Frequency</th>
    </tr>
  </thead>
  <tbody>
${lines.map(line => `    <tr>
      <td>${this.formatRemunerationType(line.type)}</td>
      <td>${line.description}</td>
      <td>${line.currency} ${parseFloat(line.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td>${this.formatRemunerationFrequency(line.frequency)}</td>
    </tr>`).join('\n')}
  </tbody>
</table>`;

        // Format as simple text list for non-HTML templates
        remunerationLines = lines.map(line => 
          `• ${this.formatRemunerationType(line.type)}: ${line.description} - ${line.currency} ${parseFloat(line.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${this.formatRemunerationFrequency(line.frequency)})`
        ).join('\n');

        // Extract individual common remuneration types for easy template access
        lines.forEach(line => {
          const formattedAmount = `${line.currency} ${parseFloat(line.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${this.formatRemunerationFrequency(line.frequency)}`;
          
          switch (line.type) {
            case 'base_salary':
              baseSalary = formattedAmount;
              break;
            case 'bonus':
              bonus = formattedAmount;
              break;
            case 'commission':
              commission = formattedAmount;
              break;
            case 'allowance':
              allowance = formattedAmount;
              break;
          }
        });
      }
    }

    // Merge all template variables
    const variables: Record<string, string> = {
      // Agreement details
      agreementDate: contractData.agreementDate || new Date().toLocaleDateString(),
      
      // Business information
      businessName: business.name,
      businessAddress: contractData.businessAddress || '',
      businessRegistrationNumber: contractData.businessRegistrationNumber || '',
      businessTaxId: contractData.businessTaxId || '',
      businessContactEmail: contractData.businessContactEmail || '',
      businessContactPhone: contractData.businessContactPhone || '',
      
      // Contractor information
      contractorName: `${worker.firstName} ${worker.lastName}`,
      contractorAddress: `${worker.streetAddress || ''}, ${worker.suburb || ''}, ${worker.state || ''} ${worker.postcode || ''}`.trim(),
      contractorEmail: worker.email,
      contractorBusinessName: worker.businessName || '',
      
      // Service details
      serviceDescription: contractData.serviceDescription || '',
      startDate: contractData.startDate || '',
      endDate: contractData.endDate || '',
      rateAmount: contractData.rateAmount || '',
      rateCurrency: contractData.rateCurrency || country.currency,
      rateType: contractData.rateType || 'hour',
      
      // Notice period
      noticePeriod: noticePeriod,
      noticePeriodDays: noticePeriodDays,
      
      // Remuneration details
      remunerationLines: remunerationLines,
      remunerationLinesTable: remunerationLinesTable,
      baseSalary: baseSalary,
      bonus: bonus,
      commission: commission,
      allowance: allowance,
      
      // SDP Entity details (from country where business operates)
      sdpEntityName: country.companyName,
      sdpRegistrationNumber: country.companyRegistrationNumber || '',
      sdpAddress: `${country.streetAddress || ''}, ${country.city || ''}, ${country.stateProvince || ''} ${country.postalCode || ''}`.trim(),
      sdpTaxId: country.taxIdentificationNumber || '',
      sdpCountry: country.name,
      
      // Legal jurisdiction (default to business country, can be overridden)
      governingLaw: contractData.governingLaw || `the laws of ${country.name}`,
      disputeVenue: contractData.disputeVenue || country.name,
    };

    // Generate final contract content
    const content = await this.generateContractContent(template, variables);

    return { content, variables };
  }

  // Helper method to format remuneration type for display
  private formatRemunerationType(type: string): string {
    const typeMap: Record<string, string> = {
      'base_salary': 'Base Salary',
      'bonus': 'Bonus',
      'commission': 'Commission',
      'allowance': 'Allowance',
      'overtime': 'Overtime',
      'other': 'Other'
    };
    return typeMap[type] || type;
  }

  // Helper method to format remuneration frequency for display
  private formatRemunerationFrequency(frequency: string): string {
    const frequencyMap: Record<string, string> = {
      'annual': 'Annual',
      'monthly': 'Monthly',
      'per_occurrence': 'Per Occurrence',
      'hourly': 'Hourly',
      'daily': 'Daily'
    };
    return frequencyMap[frequency] || frequency;
  }

  // Additional method implementations
  async getInvoiceById(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  // SDP Invoice operations - for invoices FROM SDP entities TO businesses
  async getSdpInvoicesByBusiness(businessId: string): Promise<(SelectSdpInvoiceType & { fromCountry: Country; toBusiness: Business; createdByUser: User; workerName?: string; poNumber?: string; poProjectName?: string })[]> {
    const workerAlias = alias(workers, 'inv_worker');
    const poAlias = alias(purchaseOrders, 'inv_po');
    const result = await db
      .select()
      .from(sdpInvoices)
      .leftJoin(countries, eq(sdpInvoices.fromCountryId, countries.id))
      .leftJoin(businesses, eq(sdpInvoices.toBusinessId, businesses.id))
      .leftJoin(users, eq(sdpInvoices.createdBy, users.id))
      .leftJoin(workerAlias, eq((sdpInvoices as any).workerId, workerAlias.id))
      .leftJoin(poAlias, eq((sdpInvoices as any).purchaseOrderId, poAlias.id))
      .where(eq(sdpInvoices.toBusinessId, businessId));

    return result.map(row => ({
      ...row.sdp_invoices,
      fromCountry: row.countries!,
      toBusiness: row.businesses!,
      createdByUser: row.users!,
      workerName: row.inv_worker ? `${row.inv_worker.firstName} ${row.inv_worker.lastName}` : undefined,
      poNumber: row.inv_po?.poNumber ?? undefined,
      poProjectName: row.inv_po?.projectName ?? undefined,
    }));
  }

  async getSdpInvoicesByCountry(countryId: string): Promise<(SelectSdpInvoiceType & { fromCountry: Country; toBusiness: Business; createdByUser: User; workerName?: string; poNumber?: string; poProjectName?: string })[]> {
    const workerAlias = alias(workers, 'inv_worker');
    const poAlias = alias(purchaseOrders, 'inv_po');
    const result = await db
      .select()
      .from(sdpInvoices)
      .leftJoin(countries, eq(sdpInvoices.fromCountryId, countries.id))
      .leftJoin(businesses, eq(sdpInvoices.toBusinessId, businesses.id))
      .leftJoin(users, eq(sdpInvoices.createdBy, users.id))
      .leftJoin(workerAlias, eq((sdpInvoices as any).workerId, workerAlias.id))
      .leftJoin(poAlias, eq((sdpInvoices as any).purchaseOrderId, poAlias.id))
      .where(eq(sdpInvoices.fromCountryId, countryId));

    return result.map(row => ({
      ...row.sdp_invoices,
      fromCountry: row.countries!,
      toBusiness: row.businesses!,
      createdByUser: row.users!,
      workerName: row.inv_worker ? `${row.inv_worker.firstName} ${row.inv_worker.lastName}` : undefined,
      poNumber: row.inv_po?.poNumber ?? undefined,
      poProjectName: row.inv_po?.projectName ?? undefined,
    }));
  }

  async getAllSdpInvoices(): Promise<(SelectSdpInvoiceType & { fromCountry: Country; toBusiness: Business; createdByUser: User; fromBusiness: Business | null; workerName?: string; poNumber?: string; poProjectName?: string })[]> {
    const fromBusinesses = alias(businesses, 'from_business');
    const workerAlias = alias(workers, 'inv_worker');
    const poAlias = alias(purchaseOrders, 'inv_po');
    const result = await db
      .select()
      .from(sdpInvoices)
      .leftJoin(countries, eq(sdpInvoices.fromCountryId, countries.id))
      .leftJoin(businesses, eq(sdpInvoices.toBusinessId, businesses.id))
      .leftJoin(fromBusinesses, eq(sdpInvoices.fromBusinessId, fromBusinesses.id))
      .leftJoin(users, eq(sdpInvoices.createdBy, users.id))
      .leftJoin(workerAlias, eq((sdpInvoices as any).workerId, workerAlias.id))
      .leftJoin(poAlias, eq((sdpInvoices as any).purchaseOrderId, poAlias.id));

    return result.map(row => ({
      ...row.sdp_invoices,
      fromCountry: row.countries!,
      toBusiness: row.businesses!,
      createdByUser: row.users!,
      fromBusiness: row.from_business ?? null,
      workerName: row.inv_worker ? `${row.inv_worker.firstName} ${row.inv_worker.lastName}` : undefined,
      poNumber: row.inv_po?.poNumber ?? undefined,
      poProjectName: row.inv_po?.projectName ?? undefined,
    }));
  }

  // Report Methods
  async getSdpInvoiceReport(filters: { from?: string; to?: string; countryId?: string; businessId?: string; }): Promise<any[]> {
    const conditions = [];
    
    if (filters.from) {
      conditions.push(sql`${sdpInvoices.invoiceDate} >= ${filters.from}`);
    }
    if (filters.to) {
      conditions.push(sql`${sdpInvoices.invoiceDate} <= ${filters.to}`);
    }
    if (filters.countryId && filters.countryId !== 'all') {
      conditions.push(eq(sdpInvoices.fromCountryId, filters.countryId));
    }
    if (filters.businessId && filters.businessId !== 'all') {
      conditions.push(eq(sdpInvoices.toBusinessId, filters.businessId));
    }

    const query = db
      .select({
        id: sdpInvoices.id,
        invoiceNumber: sdpInvoices.invoiceNumber,
        sdpEntity: countries.companyName,
        businessName: businesses.name,
        serviceType: sdpInvoices.serviceType,
        invoiceDate: sdpInvoices.invoiceDate,
        dueDate: sdpInvoices.dueDate,
        subtotal: sdpInvoices.subtotal,
        gstVatAmount: sdpInvoices.gstVatAmount,
        totalAmount: sdpInvoices.totalAmount,
        currency: sdpInvoices.currency,
        status: sdpInvoices.status,
      })
      .from(sdpInvoices)
      .leftJoin(countries, eq(sdpInvoices.fromCountryId, countries.id))
      .leftJoin(businesses, eq(sdpInvoices.toBusinessId, businesses.id));

    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }

    return await query;
  }

  async getTimesheetReport(filters: { from?: string; to?: string; countryId?: string; businessId?: string; }): Promise<any[]> {
    const conditions = [inArray(timesheets.status, ['submitted', 'approved'])];
    
    if (filters.from) {
      conditions.push(sql`${timesheets.submittedAt} >= ${filters.from}`);
    }
    if (filters.to) {
      conditions.push(sql`${timesheets.submittedAt} <= ${filters.to}`);
    }
    if (filters.countryId && filters.countryId !== 'all') {
      conditions.push(eq(workers.countryId, filters.countryId));
    }
    if (filters.businessId && filters.businessId !== 'all') {
      conditions.push(eq(timesheets.businessId, filters.businessId));
    }

    return await db
      .select({
        id: timesheets.id,
        workerName: sql`CONCAT(${workers.firstName}, ' ', ${workers.lastName})`.as('workerName'),
        businessName: businesses.name,
        periodStart: timesheets.periodStart,
        periodEnd: timesheets.periodEnd,
        totalHours: timesheets.totalHours,
        status: timesheets.status,
        submittedAt: timesheets.submittedAt,
      })
      .from(timesheets)
      .leftJoin(workers, eq(timesheets.workerId, workers.id))
      .leftJoin(businesses, eq(timesheets.businessId, businesses.id))
      .leftJoin(countries, eq(workers.countryId, countries.id))
      .where(and(...conditions));
  }

  async getPayslipReport(filters: { from?: string; to?: string; countryId?: string; businessId?: string; }): Promise<any[]> {
    const conditions = [];
    
    if (filters.from) {
      conditions.push(sql`${payslips.payDate} >= ${filters.from}`);
    }
    if (filters.to) {
      conditions.push(sql`${payslips.payDate} <= ${filters.to}`);
    }
    if (filters.countryId && filters.countryId !== 'all') {
      conditions.push(eq(workers.countryId, filters.countryId));
    }
    if (filters.businessId && filters.businessId !== 'all') {
      conditions.push(eq(payslips.businessId, filters.businessId));
    }

    const query = db
      .select({
        id: payslips.id,
        workerName: sql`CONCAT(${workers.firstName}, ' ', ${workers.lastName})`.as('workerName'),
        businessName: businesses.name,
        sdpEntity: countries.companyName,
        payDate: payslips.payDate,
        payPeriodStart: payslips.payPeriodStart,
        payPeriodEnd: payslips.payPeriodEnd,
        grossTaxableWages: payslips.grossTaxableWages,
        tax: payslips.tax,
        netPay: payslips.netPay,
      })
      .from(payslips)
      .leftJoin(workers, eq(payslips.workerId, workers.id))
      .leftJoin(businesses, eq(payslips.businessId, businesses.id))
      .leftJoin(countries, eq(workers.countryId, countries.id));

    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }

    return await query;
  }

  async createSdpInvoice(invoice: InsertSdpInvoiceType): Promise<SelectSdpInvoiceType> {
    const [created] = await db
      .insert(sdpInvoices)
      .values({
        ...invoice,
        issuedAt: invoice.status === 'issued' ? new Date() : null,
      })
      .returning();
    return created;
  }

  async updateSdpInvoiceStatus(id: string, status: string, notes?: string): Promise<void> {
    const updates: any = {
      status: status as any,
      updatedAt: new Date(),
    };

    if (status === 'issued') {
      updates.issuedAt = new Date();
    } else if (status === 'paid') {
      updates.paidAt = new Date();
    }

    if (notes) {
      updates.notes = notes;
    }

    await db
      .update(sdpInvoices)
      .set(updates)
      .where(eq(sdpInvoices.id, id));
  }

  async getSdpInvoiceById(id: string): Promise<SelectSdpInvoiceType | undefined> {
    const [invoice] = await db.select().from(sdpInvoices).where(eq(sdpInvoices.id, id));
    return invoice;
  }

  async getSdpInvoiceByToken(token: string): Promise<SelectSdpInvoiceType | undefined> {
    const [invoice] = await db.select().from(sdpInvoices).where(eq((sdpInvoices as any).viewToken, token));
    return invoice;
  }

  async generateSdpInvoiceNumber(countryId: string): Promise<string> {
    // Get country info for prefix
    const [country] = await db.select().from(countries).where(eq(countries.id, countryId));
    const prefix = country?.invoicePrefix || country?.code.toUpperCase() || 'SDP';
    
    // Get the next sequential number for this country
    const lastInvoice = await db
      .select({ invoiceNumber: sdpInvoices.invoiceNumber })
      .from(sdpInvoices)
      .where(eq(sdpInvoices.fromCountryId, countryId))
      .orderBy(sql`${sdpInvoices.createdAt} DESC`)
      .limit(1);

    let nextNumber = 1;
    if (lastInvoice.length > 0) {
      const lastNumber = lastInvoice[0].invoiceNumber.split('-').pop();
      nextNumber = parseInt(lastNumber || '0') + 1;
    }

    return `${prefix}-${nextNumber.toString().padStart(6, '0')}`;
  }

  async createSdpInvoiceFromTimesheet(timesheetId: string, invoiceData: Partial<InsertSdpInvoiceType>): Promise<SelectSdpInvoiceType> {
    // Get timesheet with related contract and business data
    const [timesheet] = await db
      .select()
      .from(timesheets)
      .leftJoin(contracts, eq(timesheets.contractId, contracts.id))
      .leftJoin(workers, eq(timesheets.workerId, workers.id))
      .leftJoin(businesses, eq(timesheets.businessId, businesses.id))
      .where(eq(timesheets.id, timesheetId));

    if (!timesheet) {
      throw new Error('Timesheet not found');
    }

    const contract = timesheet.contracts!;
    const worker = timesheet.workers!;
    const business = timesheet.businesses!;
    const timesheetData = timesheet.timesheets;

    // Get timesheet entries to calculate total hours
    const entries = await db
      .select()
      .from(timesheetEntries)
      .where(eq(timesheetEntries.timesheetId, timesheetId));

    const rateType = contract.rateType || 'hourly';
    const rate = parseFloat(contract.rate);
    if (!contract.rate || isNaN(rate) || rate <= 0) {
      throw new Error(`Contract ${contract.id} has no valid rate set — cannot generate invoice`);
    }
    let subtotal = 0;

    if (rateType === 'daily') {
      const totalDays = entries.reduce((sum, entry) => {
        const d = parseFloat(entry.daysWorked || '0');
        return sum + (isNaN(d) ? 0 : d);
      }, 0);
      if (totalDays <= 0) {
        throw new Error(`Timesheet ${timesheetId} has no daysWorked recorded in entries — cannot generate invoice`);
      }
      subtotal = totalDays * rate;
    } else if (rateType === 'annual') {
      const daysPresent = entries.filter((e) => e.isPresent).length;
      subtotal = daysPresent * (rate / 260);
    } else {
      const totalHours = entries.reduce((sum, entry) => {
        const h = parseFloat(entry.hoursWorked || '0');
        return sum + (isNaN(h) ? 0 : h);
      }, 0);
      if (totalHours <= 0) {
        throw new Error(`Timesheet ${timesheetId} has no hoursWorked recorded in entries — cannot generate invoice`);
      }
      subtotal = totalHours * rate;
    }

    // Fetch SDP billing lines (commission/fees) for this contract
    const contractBillingLines = await this.getContractBillingLines(contract.id);
    const activeBillingLines = contractBillingLines.filter((bl: any) => bl.isActive);

    // Add billing line amounts to subtotal
    let billingLinesTotal = 0;
    const lineItems: { description: string; quantity: string; unitPrice: string; amount: string; sortOrder: number }[] = [];

    // Worker cost as first line item
    const unit = rateType === 'daily' ? 'day' : 'hr';
    const qty = rateType === 'daily'
      ? entries.reduce((sum, e) => { const d = parseFloat(e.daysWorked || '0'); return sum + (isNaN(d) ? 0 : d); }, 0)
      : entries.reduce((sum, e) => { const h = parseFloat(e.hoursWorked || '0'); return sum + (isNaN(h) ? 0 : h); }, 0);
    lineItems.push({
      description: `Worker cost — ${qty}${unit} @ ${contract.currency} ${rate}/${unit}`,
      quantity: qty.toString(),
      unitPrice: rate.toFixed(2),
      amount: subtotal.toFixed(2),
      sortOrder: 0,
    });

    // Add each active billing line
    let sortIdx = 1;
    for (const bl of activeBillingLines) {
      let blAmount = 0;
      if (bl.lineType === 'percentage_of_pay') {
        blAmount = subtotal * (parseFloat(bl.rate || '0') / 100);
      } else if (bl.lineType === 'fixed_percentage') {
        blAmount = subtotal * (parseFloat(bl.rate || '0') / 100);
      } else {
        blAmount = parseFloat(bl.amount || bl.rate || '0');
      }
      billingLinesTotal += blAmount;
      lineItems.push({
        description: bl.description,
        quantity: '1',
        unitPrice: blAmount.toFixed(2),
        amount: blAmount.toFixed(2),
        sortOrder: sortIdx++,
      });
    }

    const invoiceSubtotal = subtotal + billingLinesTotal;

    // Determine SDP entity (country) - use worker's country as default
    const fromCountryId = worker.countryId || contract.countryId;
    if (!fromCountryId) {
      throw new Error('Unable to determine SDP entity country');
    }

    // Generate invoice number
    const invoiceNumber = await this.generateSdpInvoiceNumber(fromCountryId);

    // Get business country for GST calculation
    const businessCountry = business.accessibleCountries?.[0]; // Use first accessible country as business location
    const isCrossBorder = businessCountry && businessCountry !== fromCountryId;

    // Calculate GST/VAT if applicable
    let gstVatAmount = 0;
    let gstVatRate = 0;
    if (!isCrossBorder) {
      const countryGstRates: Record<string, number> = { 'au': 10, 'nz': 15, 'gb': 20, 'sg': 8, 'ie': 23, 'ca': 5 };
      gstVatRate = countryGstRates[fromCountryId.toLowerCase()] || 10;
      gstVatAmount = invoiceSubtotal * (gstVatRate / 100);
    }

    const totalAmount = invoiceSubtotal + gstVatAmount;

    const invoice: InsertSdpInvoiceType = {
      // Allow caller to override non-financial fields (e.g. invoiceDate, dueDate, purchaseOrderId)
      ...invoiceData,
      // Calculated financial fields always take precedence — never let req.body override them
      invoiceNumber,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      fromCountryId,
      toBusinessId: business.id,
      subtotal: invoiceSubtotal.toString(),
      gstVatAmount: gstVatAmount.toString(),
      gstVatRate: gstVatRate.toString(),
      totalAmount: totalAmount.toString(),
      currency: contract.currency,
      description: `Employment services for ${worker.firstName} ${worker.lastName} - Period: ${timesheetData.periodStart.toISOString().split('T')[0]} to ${timesheetData.periodEnd.toISOString().split('T')[0]}`,
      serviceType: 'timesheet_processing',
      periodStart: timesheetData.periodStart,
      periodEnd: timesheetData.periodEnd,
      isCrossBorder: !!isCrossBorder,
      businessCountry,
      timesheetId,
      contractId: contract.id,
      workerId: worker.id,
      status: 'draft',
      createdBy: invoiceData.createdBy!,
    };

    const created = await this.createSdpInvoice(invoice);

    // Save line items (worker cost + billing lines)
    if (lineItems.length > 0) {
      await this.createSdpInvoiceLineItems(created.id, lineItems);
    }

    return created;
  }

  // New SDP Invoice methods for editing, sending, and payment tracking
  async updateSdpInvoice(id: string, updates: Partial<InsertSdpInvoiceType>): Promise<SelectSdpInvoiceType> {
    const [updated] = await db
      .update(sdpInvoices)
      .set({ 
        ...updates, 
        lastModified: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(sdpInvoices.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`SDP Invoice with id ${id} not found`);
    }
    
    return updated;
  }

  async markSdpInvoiceAsSent(id: string): Promise<void> {
    console.log(`Marking invoice ${id} as sent...`);
    const [updated] = await db
      .update(sdpInvoices)
      .set({ 
        status: 'sent',
        sentAt: new Date(),
        lastModified: new Date(),
        updatedAt: new Date()
      })
      .where(eq(sdpInvoices.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Failed to mark invoice ${id} as sent - invoice not found`);
    }
    
    console.log(`Invoice ${id} marked as sent successfully, new status: ${updated.status}`);
  }

  async markSdpInvoiceAsPaid(id: string, paidAmount: string, paidDate?: Date): Promise<void> {
    console.log(`Marking invoice ${id} as paid...`);
    const [updated] = await db
      .update(sdpInvoices)
      .set({ 
        status: 'paid',
        paidAt: paidDate || new Date(),
        paidAmount: paidAmount,
        lastModified: new Date(),
        updatedAt: new Date()
      })
      .where(eq(sdpInvoices.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Failed to mark invoice ${id} as paid - invoice not found`);
    }
    
    console.log(`Invoice ${id} marked as paid successfully, new status: ${updated.status}`);
  }

  // SDP Invoice Line Items operations
  async getSdpInvoiceLineItems(invoiceId: string): Promise<SelectSdpInvoiceLineItemType[]> {
    return await db
      .select()
      .from(sdpInvoiceLineItems)
      .where(eq(sdpInvoiceLineItems.invoiceId, invoiceId))
      .orderBy(sdpInvoiceLineItems.sortOrder);
  }

  async createSdpInvoiceLineItems(invoiceId: string, lineItems: InsertSdpInvoiceLineItemType[]): Promise<SelectSdpInvoiceLineItemType[]> {
    if (lineItems.length === 0) return [];
    
    const itemsWithInvoiceId = lineItems.map((item, index) => ({
      ...item,
      invoiceId,
      sortOrder: item.sortOrder ?? index,
    }));

    return await db
      .insert(sdpInvoiceLineItems)
      .values(itemsWithInvoiceId)
      .returning();
  }

  async updateSdpInvoiceLineItems(invoiceId: string, lineItems: InsertSdpInvoiceLineItemType[]): Promise<SelectSdpInvoiceLineItemType[]> {
    // Delete existing line items and insert new ones (atomic operation)
    await db.delete(sdpInvoiceLineItems).where(eq(sdpInvoiceLineItems.invoiceId, invoiceId));
    return await this.createSdpInvoiceLineItems(invoiceId, lineItems);
  }

  async deleteSdpInvoiceLineItems(invoiceId: string): Promise<void> {
    await db.delete(sdpInvoiceLineItems).where(eq(sdpInvoiceLineItems.invoiceId, invoiceId));
  }

  // SDP Invoice Timesheets junction (consolidated invoices)
  async getSdpInvoiceTimesheets(invoiceId: string): Promise<{ timesheetId: string }[]> {
    return await db
      .select({ timesheetId: sdpInvoiceTimesheets.timesheetId })
      .from(sdpInvoiceTimesheets)
      .where(eq(sdpInvoiceTimesheets.invoiceId, invoiceId));
  }

  async linkTimesheetsToSdpInvoice(invoiceId: string, timesheetIds: string[]): Promise<void> {
    if (timesheetIds.length === 0) return;
    await db.insert(sdpInvoiceTimesheets).values(
      timesheetIds.map((timesheetId) => ({ invoiceId, timesheetId }))
    );
  }

  async getTimesheetSdpInvoiceLink(timesheetId: string): Promise<{ invoiceId: string; invoiceStatus: string } | null> {
    const rows = await db
      .select({
        invoiceId: sdpInvoiceTimesheets.invoiceId,
        invoiceStatus: sdpInvoices.status,
      })
      .from(sdpInvoiceTimesheets)
      .leftJoin(sdpInvoices, eq(sdpInvoiceTimesheets.invoiceId, sdpInvoices.id))
      .where(eq(sdpInvoiceTimesheets.timesheetId, timesheetId))
      .limit(1);
    if (rows.length === 0) return null;
    return { invoiceId: rows[0].invoiceId, invoiceStatus: rows[0].invoiceStatus ?? '' };
  }

  async deleteSdpInvoiceById(id: string): Promise<void> {
    await db.delete(sdpInvoices).where(eq(sdpInvoices.id, id));
  }

  // Purchase Order helpers
  async getPurchaseOrderById(id: string): Promise<SelectPurchaseOrder | undefined> {
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return po;
  }

  async updatePurchaseOrderInvoicedAmount(id: string, delta: number): Promise<void> {
    const po = await this.getPurchaseOrderById(id);
    if (!po) return;
    const newInvoiced = parseFloat(po.invoicedToDate ?? '0') + delta;
    const authorised = parseFloat(po.authorisedValue ?? '0');
    const newStatus = newInvoiced >= authorised ? 'exhausted' : (po.status === 'exhausted' && newInvoiced < authorised ? 'open' : po.status);
    await db.update(purchaseOrders).set({
      invoicedToDate: newInvoiced.toFixed(2),
      status: newStatus as any,
    }).where(eq(purchaseOrders.id, id));
  }

  // Margin Payment operations
  async getMarginPaymentsByInvoice(invoiceId: string): Promise<SelectMarginPaymentType[]> {
    return await db
      .select()
      .from(marginPayments)
      .where(eq(marginPayments.sdpInvoiceId, invoiceId))
      .orderBy(marginPayments.createdAt);
  }

  async getMarginPaymentsByBusiness(businessId: string): Promise<SelectMarginPaymentType[]> {
    return await db
      .select()
      .from(marginPayments)
      .where(eq(marginPayments.businessId, businessId))
      .orderBy(marginPayments.createdAt);
  }

  async getAllMarginPayments(): Promise<SelectMarginPaymentType[]> {
    return await db
      .select()
      .from(marginPayments)
      .orderBy(marginPayments.createdAt);
  }

  async createMarginPayment(payment: InsertMarginPaymentType): Promise<SelectMarginPaymentType> {
    const [created] = await db
      .insert(marginPayments)
      .values(payment)
      .returning();
    return created;
  }

  async updateMarginPayment(id: string, updates: Partial<InsertMarginPaymentType>): Promise<SelectMarginPaymentType> {
    const [updated] = await db
      .update(marginPayments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(marginPayments.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Margin payment ${id} not found`);
    }
    
    return updated;
  }

  async deleteMarginPayment(id: string): Promise<void> {
    await db.delete(marginPayments).where(eq(marginPayments.id, id));
  }

  async getContracts(): Promise<Contract[]> {
    return await db.select().from(contracts);
  }

  async getWorkers(): Promise<Worker[]> {
    return await db.select().from(workers);
  }

  async getCountries(): Promise<Country[]> {
    return await db.select().from(countries);
  }


  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getBusinesses(): Promise<Business[]> {
    return await db.select().from(businesses);
  }

  // Email Template Management Implementation
  // =======================================

  // Template Definitions
  async getEmailTemplateDefinitions(): Promise<SelectEmailTemplateDefinitionType[]> {
    return await db.select().from(emailTemplateDefinitions);
  }

  async getEmailTemplateDefinitionByKey(key: string): Promise<SelectEmailTemplateDefinitionType | undefined> {
    const [definition] = await db.select().from(emailTemplateDefinitions).where(eq(emailTemplateDefinitions.key, key));
    return definition;
  }

  async createEmailTemplateDefinition(definition: InsertEmailTemplateDefinitionType): Promise<SelectEmailTemplateDefinitionType> {
    const [created] = await db.insert(emailTemplateDefinitions).values(definition).returning();
    return created;
  }

  async updateEmailTemplateDefinition(id: string, updates: Partial<InsertEmailTemplateDefinitionType>): Promise<SelectEmailTemplateDefinitionType> {
    const [updated] = await db
      .update(emailTemplateDefinitions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailTemplateDefinitions.id, id))
      .returning();
    return updated;
  }

  // Email Templates
  async getEmailTemplates(): Promise<SelectEmailTemplateType[]> {
    return await db.select().from(emailTemplates);
  }

  async getEmailTemplatesByDefinition(definitionId: string): Promise<SelectEmailTemplateType[]> {
    return await db.select().from(emailTemplates).where(eq(emailTemplates.definitionId, definitionId));
  }

  async getPublishedEmailTemplate(key: string, locale = 'en', scopeType = 'global', scopeId?: string): Promise<SelectEmailTemplateType | undefined> {
    // Join with definitions to filter by key, then look for published templates
    // Priority: business > country > global scope
    const templates = await db
      .select({
        id: emailTemplates.id,
        definitionId: emailTemplates.definitionId,
        locale: emailTemplates.locale,
        scopeType: emailTemplates.scopeType,
        scopeId: emailTemplates.scopeId,
        subjectTemplate: emailTemplates.subjectTemplate,
        htmlTemplate: emailTemplates.htmlTemplate,
        textTemplate: emailTemplates.textTemplate,
        fromDisplayName: emailTemplates.fromDisplayName,
        fromLocalPart: emailTemplates.fromLocalPart,
        status: emailTemplates.status,
        versionNumber: emailTemplates.versionNumber,
        publishedAt: emailTemplates.publishedAt,
        publishedByUserId: emailTemplates.publishedByUserId,
        createdByUserId: emailTemplates.createdByUserId,
        createdAt: emailTemplates.createdAt,
        updatedAt: emailTemplates.updatedAt,
      })
      .from(emailTemplates)
      .innerJoin(emailTemplateDefinitions, eq(emailTemplates.definitionId, emailTemplateDefinitions.id))
      .where(
        and(
          eq(emailTemplateDefinitions.key, key),
          eq(emailTemplates.locale, locale),
          eq(emailTemplates.status, 'published')
        )
      );

    // Find the highest priority template (business > country > global)
    let bestTemplate = templates.find(t => t.scopeType === 'business' && t.scopeId === scopeId);
    if (!bestTemplate) {
      bestTemplate = templates.find(t => t.scopeType === 'country' && t.scopeId === scopeId);
    }
    if (!bestTemplate) {
      bestTemplate = templates.find(t => t.scopeType === 'global');
    }

    // Fallback to 'en' locale if no template found for requested locale
    if (!bestTemplate && locale !== 'en') {
      return this.getPublishedEmailTemplate(key, 'en', scopeType, scopeId);
    }

    return bestTemplate;
  }

  async createEmailTemplate(template: InsertEmailTemplateType & { createdByUserId: string }): Promise<SelectEmailTemplateType> {
    const [created] = await db.insert(emailTemplates).values(template).returning();
    return created;
  }

  async updateEmailTemplate(id: string, updates: Partial<InsertEmailTemplateType>): Promise<SelectEmailTemplateType> {
    const [updated] = await db
      .update(emailTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return updated;
  }

  async publishEmailTemplate(id: string, publishedByUserId: string): Promise<SelectEmailTemplateType> {
    const [published] = await db
      .update(emailTemplates)
      .set({
        status: 'published',
        publishedAt: new Date(),
        publishedByUserId,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, id))
      .returning();
    return published;
  }

  // Email Template Versions
  async getEmailTemplateVersions(templateId: string): Promise<SelectEmailTemplateVersionType[]> {
    return await db
      .select()
      .from(emailTemplateVersions)
      .where(eq(emailTemplateVersions.templateId, templateId))
      .orderBy(emailTemplateVersions.createdAt);
  }

  async createEmailTemplateVersion(version: InsertEmailTemplateVersionType & { createdByUserId: string }): Promise<SelectEmailTemplateVersionType> {
    const [created] = await db.insert(emailTemplateVersions).values(version).returning();
    return created;
  }

  // Email Settings
  async getEmailSettings(): Promise<SelectEmailSettingsType | undefined> {
    const [settings] = await db.select().from(emailSettings).where(eq(emailSettings.id, 'singleton'));
    return settings;
  }

  async updateEmailSettings(updates: Partial<InsertEmailSettingsType>): Promise<SelectEmailSettingsType> {
    // Upsert pattern for singleton settings
    const [updated] = await db
      .insert(emailSettings)
      .values({ ...updates, id: 'singleton' })
      .onConflictDoUpdate({
        target: emailSettings.id,
        set: { ...updates, updatedAt: new Date() },
      })
      .returning();
    return updated;
  }

  // Template Rendering Support
  async renderEmailTemplate(
    key: string,
    variables: Record<string, any>,
    options?: { locale?: string; scopeType?: string; scopeId?: string }
  ): Promise<{ subject: string; html: string; text?: string; fromDisplayName?: string; fromLocalPart?: string } | undefined> {
    const template = await this.getPublishedEmailTemplate(
      key,
      options?.locale,
      options?.scopeType,
      options?.scopeId
    );

    if (!template) {
      return undefined;
    }

    const settings = await this.getEmailSettings();

    // Simple template variable replacement (using {{variable}} syntax)
    const renderTemplate = (templateString: string) => {
      return templateString.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return variables[varName] || match; // Leave unmatched variables as-is
      });
    };

    return {
      subject: renderTemplate(template.subjectTemplate),
      html: renderTemplate(template.htmlTemplate),
      text: template.textTemplate ? renderTemplate(template.textTemplate) : undefined,
      fromDisplayName: template.fromDisplayName || settings?.defaultFromDisplayName || 'SDP Global Pay',
      fromLocalPart: template.fromLocalPart || settings?.defaultFromLocalPart || 'onboard',
    };
  }

  // Two-Factor Authentication Operations
  async upsertUserTwoFactorAuth(data: { userId: string; method: string; totpSecret: string; isEnabled: boolean }): Promise<any> {
    const [result] = await db
      .insert(userTwoFactorAuth)
      .values({
        userId: data.userId,
        method: data.method,
        totpSecret: data.totpSecret,
        isEnabled: data.isEnabled,
      })
      .onConflictDoUpdate({
        target: userTwoFactorAuth.userId,
        set: {
          method: data.method,
          totpSecret: data.totpSecret,
          isEnabled: data.isEnabled,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async enableUserTwoFactorAuth(userId: string, hashedBackupCodes: string[]): Promise<any> {
    const [result] = await db
      .update(userTwoFactorAuth)
      .set({
        isEnabled: true,
        enabledAt: new Date(),
        backupCodes: hashedBackupCodes,
        updatedAt: new Date(),
      })
      .where(eq(userTwoFactorAuth.userId, userId))
      .returning();
    return result;
  }

  async disableUserTwoFactorAuth(userId: string): Promise<any> {
    const [result] = await db
      .update(userTwoFactorAuth)
      .set({
        isEnabled: false,
        totpSecret: null,
        backupCodes: null,
        updatedAt: new Date(),
      })
      .where(eq(userTwoFactorAuth.userId, userId))
      .returning();
    return result;
  }

  async updateBackupCodes(userId: string, hashedBackupCodes: string[]): Promise<any> {
    const [result] = await db
      .update(userTwoFactorAuth)
      .set({
        backupCodes: hashedBackupCodes,
        updatedAt: new Date(),
      })
      .where(eq(userTwoFactorAuth.userId, userId))
      .returning();
    return result;
  }

  async removeUsedBackupCode(userId: string, usedIndex: number): Promise<any> {
    // Get current 2FA record
    const [current] = await db
      .select()
      .from(userTwoFactorAuth)
      .where(eq(userTwoFactorAuth.userId, userId));

    if (!current || !current.backupCodes) {
      return null;
    }

    // Remove the used backup code
    const updatedBackupCodes = current.backupCodes.filter((_, index) => index !== usedIndex);

    // Update with remaining codes
    const [result] = await db
      .update(userTwoFactorAuth)
      .set({
        backupCodes: updatedBackupCodes,
        updatedAt: new Date(),
      })
      .where(eq(userTwoFactorAuth.userId, userId))
      .returning();
    return result;
  }

  // Password Reset Operations
  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token));
    return user;
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    // Block super admin from password reset - their password is managed via SUPER_ADMIN_PASSWORD secret
    if (userId === 'test-user-sdpultimateadmin' || userId === 'sdpultimateadmin') {
      console.log('Password reset token creation blocked for super admin user');
      return; // Silently ignore - request endpoint handles the user-facing message
    }
    
    await db
      .update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpiresAt: expiresAt,
        passwordResetRequestedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async resetPassword(token: string, newPasswordHash: string): Promise<boolean> {
    // Check if token exists and is valid
    const user = await this.getUserByPasswordResetToken(token);
    
    if (!user || !user.passwordResetExpiresAt) {
      return false;
    }

    // Block super admin from password reset - their password is managed via SUPER_ADMIN_PASSWORD secret
    if (user.id === 'test-user-sdpultimateadmin' || user.id === 'sdpultimateadmin') {
      console.log('Password reset blocked for super admin user');
      return false;
    }

    // Check if token has expired
    if (user.passwordResetExpiresAt < new Date()) {
      return false;
    }

    // Update password and clear reset token
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        passwordResetRequestedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return true;
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        passwordResetRequestedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
