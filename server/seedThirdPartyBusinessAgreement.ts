import { storage } from "./storage";

// Universal 3rd Party Business Worker Agreement Template
const thirdPartyBusinessAgreement = {
  name: "Universal 3rd Party Business Worker Agreement",
  employmentType: "third_party_worker" as const,
  countryId: null, // Universal template (not country-specific)
  variables: JSON.stringify([
    "businessName", "businessAddress", "businessRegistrationNumber", "businessTaxId",
    "thirdPartyBusinessName", "thirdPartyAddress", "thirdPartyRegistrationNumber", "thirdPartyTaxId",
    "thirdPartyContactEmail", "thirdPartyContactPhone",
    "workerName", "workerRole", "workerSkills", "serviceDescription",
    "startDate", "endDate", "rateAmount", "rateCurrency", "rateType",
    "sdpEntityName", "sdpRegistrationNumber", "sdpAddress", "sdpTaxId", "sdpCountry",
    "governingLaw", "disputeVenue", "agreementDate", "businessContactEmail", "businessContactPhone",
    "hostClientName"
  ]),
  template: `
UNIVERSAL 3RD PARTY BUSINESS WORKER AGREEMENT

This Business-to-Business Worker Agreement ("Agreement") is entered into on {{agreementDate}} between:

**HOST CLIENT:**
{{businessName}}
Registration Number: {{businessRegistrationNumber}}
Tax ID: {{businessTaxId}}
Address: {{businessAddress}}
Email: {{businessContactEmail}}
Phone: {{businessContactPhone}}
("Host Client")

**3RD PARTY BUSINESS:**
{{thirdPartyBusinessName}}
Registration Number: {{thirdPartyRegistrationNumber}}
Tax ID: {{thirdPartyTaxId}}
Address: {{thirdPartyAddress}}
Email: {{thirdPartyContactEmail}}
Phone: {{thirdPartyContactPhone}}
("Service Provider")

**FACILITATOR AND PAYMENT AGENT:**
{{sdpEntityName}}
Registration Number: {{sdpRegistrationNumber}}
Address: {{sdpAddress}}
Tax ID: {{sdpTaxId}}
("SDP Entity" or "Facilitator")

**WORKER:**
{{workerName}}
Role: {{workerRole}}
("Worker")

## 1. PARTIES AND DEFINITIONS

1.1 **Host Client**: The entity engaging the Service Provider's worker through this B2B arrangement.

1.2 **Service Provider**: The third-party business entity that employs or contracts the Worker and is responsible for all employment-related obligations.

1.3 **SDP Entity**: Acts as facilitator, payment agent, and contract administrator. SDP Entity facilitates this B2B arrangement but is not responsible for employment obligations or worker performance.

1.4 **Worker**: The individual employed or contracted by Service Provider who will perform services for Host Client.

1.5 **Services**: The work and deliverables described in Section 2, to be performed by Worker under Service Provider's direction.

1.6 **Deliverables**: All work product, materials, documents, software, data, and intellectual property created by Worker in performance of Services.

## 2. SERVICES AND WORKER ASSIGNMENT

2.1 **Scope of Services**: Service Provider agrees to provide Worker to perform the following services for Host Client:
{{serviceDescription}}

2.2 **Worker Qualifications**: Worker possesses the following skills and qualifications:
{{workerSkills}}

2.3 **Performance Standards**: Service Provider warrants that Worker will perform Services with professional skill and care, in accordance with industry best practices and Host Client's reasonable requirements.

2.4 **Worker Management**: Service Provider retains full responsibility for Worker's management, direction, and employment obligations. Host Client may provide work assignments and feedback but does not establish an employment relationship with Worker.

2.5 **Acceptance**: Host Client shall have 7 business days to review and accept Deliverables. Acceptance may not be unreasonably withheld.

## 3. TERM AND TERMINATION

3.1 **Term**: This Agreement commences on {{startDate}}{{#endDate}} and continues until {{endDate}}{{/endDate}}{{^endDate}} and continues until terminated in accordance with this Agreement{{/endDate}}.

3.2 **Termination for Convenience**: Either party may terminate this Agreement with 30 days' written notice.

3.3 **Termination for Cause**: Either party may terminate immediately upon written notice if the other party materially breaches this Agreement and fails to cure within 15 days of written notice.

3.4 **Worker Replacement**: Service Provider may replace Worker with Host Client's consent (not to be unreasonably withheld) provided replacement has equivalent qualifications.

3.5 **Post-Termination**: Upon termination, Service Provider shall ensure Worker returns all Host Client property and Confidential Information. Sections 4, 5, 6, 7, 8, 9, 12, 13, 14, 15, and 16 shall survive termination.

## 4. FEES AND PAYMENT

4.1 **Payment Structure**: Host Client agrees to pay Service Provider {{rateAmount}} {{rateCurrency}} per {{rateType}} for Services performed by Worker.

4.2 **Payment Process**: Host Client shall pay fees to SDP Entity as agent, and SDP Entity shall remit payment to Service Provider, less applicable taxes, withholdings, and SDP Entity's facilitation fees.

4.3 **Invoicing**: Service Provider shall submit invoices through SDP Entity's platform. Payment terms are net 30 days from invoice approval.

4.4 **Service Provider Responsibilities**: Service Provider is responsible for all Worker-related costs including but not limited to:
   - Salaries, wages, and benefits
   - Employment taxes and contributions
   - Workers' compensation insurance
   - Professional liability insurance
   - Training and development costs

4.5 **Currency**: All payments shall be made in {{rateCurrency}} unless otherwise agreed in writing.

## 5. INTELLECTUAL PROPERTY TRANSFER

**5.1 ASSIGNMENT TO HOST CLIENT**: Service Provider hereby assigns, transfers, and conveys to Host Client all right, title, and interest in and to all Deliverables and intellectual property created by Worker in performance of this Agreement, including:
(a) Patents, copyrights, trademarks, trade secrets, and moral rights
(b) Software, source code, documentation, processes, and methodologies
(c) Data, databases, and data structures
(d) All improvements, modifications, and derivative works

**5.2 WORKER ASSIGNMENT**: Service Provider warrants that Worker has assigned or will assign all intellectual property rights in Deliverables to Service Provider, which are then assigned to Host Client under this Agreement.

**5.3 WORK MADE FOR HIRE**: To the extent applicable under law, all Deliverables shall be deemed "work made for hire" for Host Client.

**5.4 FURTHER ASSURANCES**: Service Provider agrees to execute any additional documents reasonably necessary to perfect Host Client's ownership rights and ensure Worker executes similar documents.

**5.5 BACKGROUND IP**: Service Provider and Worker retain ownership of pre-existing intellectual property. Service Provider grants Host Client a perpetual, royalty-free license to use such Background IP solely to exploit the Deliverables.

## 6. EMPLOYMENT OBLIGATIONS AND LIABILITIES

6.1 **Service Provider Responsibility**: Service Provider acknowledges and agrees that it is solely responsible for:
   - All employment law compliance regarding Worker
   - Payment of wages, salaries, and benefits
   - Employment taxes, social security contributions, and statutory obligations
   - Workers' compensation, disability, and unemployment insurance
   - Leave entitlements (annual leave, sick leave, parental leave, etc.)
   - Health and safety obligations
   - Anti-discrimination and equal opportunity compliance
   - Termination procedures and severance obligations

6.2 **No Employment Relationship**: Host Client and Worker do not have an employment relationship. Worker remains employed by or contracted to Service Provider at all times.

6.3 **Compliance with Laws**: Service Provider warrants compliance with all applicable employment, labor, tax, and social security laws in the jurisdiction where Worker is employed.

## 7. CONFIDENTIALITY AND DATA PROTECTION

7.1 **Confidential Information**: Service Provider shall ensure Worker maintains in confidence all proprietary and confidential information received from Host Client.

7.2 **Data Protection**: Service Provider and Worker shall comply with applicable data protection laws, including GDPR where applicable, and Host Client's data protection policies.

7.3 **Return of Information**: Upon termination, Service Provider shall ensure Worker returns or destroys all Confidential Information and Host Client property.

## 8. SDP ENTITY AUDIT RIGHTS

8.1 **Audit Authority**: SDP Entity reserves the right to audit Service Provider's compliance with this Agreement, employment law obligations, and Worker management practices.

8.2 **Audit Scope**: Audits may include review of:
   - Employment contracts and Worker status
   - Payment of wages and statutory obligations
   - Tax compliance and withholdings
   - Insurance coverage and workers' compensation
   - Health and safety procedures

8.3 **Audit Cooperation**: Service Provider agrees to cooperate fully with SDP Entity audits and provide requested documentation within 10 business days.

8.4 **Remedial Action**: If audits reveal non-compliance, Service Provider must remedy issues within timeframes specified by SDP Entity.

## 9. WARRANTIES AND REPRESENTATIONS

9.1 **Authority**: Each party represents that it has full authority to enter into this Agreement.

9.2 **Service Provider Warranties**: Service Provider warrants that:
   - It has the legal right to employ or contract Worker
   - Worker has appropriate work authorization
   - All employment obligations will be fulfilled
   - Services will not infringe third-party rights

9.3 **Worker Qualifications**: Service Provider warrants Worker possesses the skills and qualifications necessary to perform Services.

9.4 **Compliance**: Service Provider warrants compliance with all applicable laws and regulations.

## 10. INDEMNIFICATION

10.1 **Service Provider Indemnity**: Service Provider shall indemnify and hold harmless Host Client and SDP Entity against all claims, damages, and expenses arising from:
   (a) Employment-related claims by Worker
   (b) Breach of employment law obligations
   (c) Worker's negligent or wrongful acts
   (d) Intellectual property infringement by Deliverables
   (e) Breach of warranties or representations
   (f) Tax obligations and statutory contributions
   (g) Workers' compensation claims
   (h) Violation of applicable laws

10.2 **Host Client Indemnity**: Host Client shall indemnify Service Provider against claims arising solely from Host Client's use of Deliverables in accordance with this Agreement.

10.3 **SDP Entity Indemnity**: Service Provider shall indemnify SDP Entity against all claims arising from this Agreement, except for SDP Entity's own negligence or willful misconduct.

## 11. LIABILITY LIMITATION

11.1 **Limitation**: Each party's total liability shall be limited to the fees paid under this Agreement in the twelve months preceding the claim.

11.2 **Exceptions**: The limitation does not apply to:
   (a) Employment law violations
   (b) Intellectual property infringement
   (c) Breach of confidentiality obligations
   (d) Fraud or willful misconduct
   (e) Death or personal injury
   (f) Indemnification obligations

11.3 **Consequential Damages**: Neither party shall be liable for indirect, consequential, or punitive damages, except as required for employment law compliance.

## 12. SDP ENTITY'S ROLE AND LIMITATIONS

12.1 **Facilitator Role**: SDP Entity acts as facilitator, payment agent, and contract administrator. SDP Entity is not responsible for employment obligations or Worker performance.

12.2 **Payment Agent**: SDP Entity collects payments from Host Client and remits to Service Provider as agent.

12.3 **Compliance Monitoring**: SDP Entity may monitor compliance with this Agreement and applicable employment laws.

12.4 **Platform Services**: SDP Entity provides contract management, invoicing, payment processing, and compliance monitoring through its platform.

## 13. COMPLIANCE AND REGULATORY

13.1 **Employment Law**: Service Provider shall comply with all applicable employment, labor, and tax laws in Worker's jurisdiction.

13.2 **Anti-Bribery**: Each party shall comply with all applicable anti-bribery and anti-corruption laws.

13.3 **Sanctions**: No party shall engage in activities prohibited by applicable economic sanctions.

13.4 **Tax Compliance**: Service Provider is responsible for all tax obligations related to Worker and Services.

## 14. GENERAL PROVISIONS

14.1 **Governing Law**: This Agreement shall be governed by the laws of {{governingLaw}}.

14.2 **Dispute Resolution**: Any disputes shall be resolved in the courts of {{disputeVenue}}.

14.3 **Assignment**: Service Provider may not assign this Agreement without Host Client's written consent. Host Client may assign to affiliates or in connection with merger or acquisition.

14.4 **Force Majeure**: Neither party shall be liable for delays caused by circumstances beyond their reasonable control.

14.5 **Notices**: All notices shall be in writing and delivered to the addresses specified above.

14.6 **Entire Agreement**: This Agreement constitutes the entire agreement and supersedes all prior agreements relating to the subject matter.

14.7 **Severability**: If any provision is found invalid, the remainder shall remain in effect.

14.8 **Electronic Signatures**: This Agreement may be executed by electronic signature.

14.9 **Amendment**: This Agreement may only be amended in writing signed by both parties.

14.10 **Counterparts**: This Agreement may be executed in counterparts, each of which shall be deemed an original.

## SIGNATURES

**HOST CLIENT:**
{{businessName}}

By: _________________________
Name: 
Title: 
Date: 

**SERVICE PROVIDER:**
{{thirdPartyBusinessName}}

By: _________________________
Name: 
Title: 
Date: 

**ACKNOWLEDGMENT BY SDP ENTITY:**
SDP Entity acknowledges its role as facilitator, payment agent, and compliance monitor under this Agreement.

{{sdpEntityName}}

By: _________________________
Name: 
Title: 
Date: 

---
*This business-to-business agreement is facilitated by SDP Entity in {{sdpCountry}}. The Service Provider remains solely responsible for all employment obligations and liabilities related to the Worker.*
`,
  uploadedBy: null, // Will be set to super admin user ID when created
  isActive: true
};

export async function seedThirdPartyBusinessAgreement() {
  try {
    console.log("Seeding Universal 3rd Party Business Worker Agreement template...");
    
    // Check if template already exists
    const existingTemplates = await storage.getContractTemplates();
    const existingTemplate = existingTemplates.find(t => 
      t.name === thirdPartyBusinessAgreement.name && 
      t.employmentType === thirdPartyBusinessAgreement.employmentType &&
      t.countryId === thirdPartyBusinessAgreement.countryId
    );
    
    let template;
    if (existingTemplate) {
      console.log("3rd Party Business Worker Agreement template already exists, updating...");
      // Update existing template
      template = await storage.updateContractTemplate(existingTemplate.id, thirdPartyBusinessAgreement);
    } else {
      console.log("Creating new 3rd Party Business Worker Agreement template...");
      // Create new template
      template = await storage.createContractTemplate(thirdPartyBusinessAgreement);
    }
    
    console.log("✅ Universal 3rd Party Business Worker Agreement template seeded successfully!");
    console.log("Template ID:", template.id);
    console.log("Template includes:");
    console.log("- B2B agreement structure between Host Client and Service Provider");
    console.log("- Service Provider responsibility for all employment obligations");
    console.log("- IP transfer to Host Client");
    console.log("- SDP Entity audit rights and compliance monitoring");
    console.log("- Comprehensive indemnification by Service Provider");
    console.log("- Tax, leave, and liability obligations on Service Provider");
    
    return template;
  } catch (error) {
    console.error("❌ Error seeding Universal 3rd Party Business Worker Agreement template:", error);
    throw error;
  }
}

// Export the template data for reference
export { thirdPartyBusinessAgreement };

// Auto-execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedThirdPartyBusinessAgreement()
    .then(() => {
      console.log("✅ 3rd Party Business Worker Agreement template seeding completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error seeding 3rd Party Business Worker Agreement template:", error);
      process.exit(1);
    });
}