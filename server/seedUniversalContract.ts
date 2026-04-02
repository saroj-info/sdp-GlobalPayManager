import { storage } from "./storage";

// Universal Independent Contractor Agreement Template
const universalContractTemplate = {
  name: "Universal Independent Contractor Agreement",
  employmentType: "contractor" as const,
  countryId: null, // Universal template (not country-specific)
  variables: JSON.stringify([
    "businessName", "businessAddress", "businessRegistrationNumber", "businessTaxId",
    "contractorName", "contractorAddress", "contractorEmail", "contractorBusinessName",
    "serviceDescription", "startDate", "endDate", "rateAmount", "rateCurrency", "rateType",
    "sdpEntityName", "sdpRegistrationNumber", "sdpAddress", "sdpTaxId", "sdpCountry",
    "governingLaw", "disputeVenue", "agreementDate", "businessContactEmail", "businessContactPhone"
  ]),
  template: `
UNIVERSAL INDEPENDENT CONTRACTOR AGREEMENT

This Independent Contractor Agreement ("Agreement") is entered into on {{agreementDate}} between:

**BUSINESS PARTY:**
{{businessName}}
Registration Number: {{businessRegistrationNumber}}
Tax ID: {{businessTaxId}}
Address: {{businessAddress}}
Email: {{businessContactEmail}}
Phone: {{businessContactPhone}}
("Business")

**CONTRACTOR PARTY:**
{{contractorName}}
{{#contractorBusinessName}}Trading as: {{contractorBusinessName}}{{/contractorBusinessName}}
Address: {{contractorAddress}}
Email: {{contractorEmail}}
("Contractor")

**FACILITATOR AND PAYMENT AGENT:**
{{sdpEntityName}}
Registration Number: {{sdpRegistrationNumber}}
Address: {{sdpAddress}}
Tax ID: {{sdpTaxId}}
("SDP Global" or "Facilitator")

## 1. PARTIES AND DEFINITIONS

1.1 **Business**: The entity engaging the Contractor's services as an independent contractor.

1.2 **Contractor**: The independent contractor providing services to Business.

1.3 **SDP Global**: Acts solely as facilitator and payment agent for Business. SDP Global is not a party to the services contract between Business and Contractor, and has no responsibility for the services provided. SDP Global facilitates contract management, invoicing, and payments on behalf of Business.

1.4 **Services**: The work and deliverables described in Section 2.

1.5 **Deliverables**: All work product, materials, documents, software, data, and intellectual property created or developed by Contractor in performance of the Services.

## 2. SERVICES AND DELIVERABLES

2.1 **Scope of Services**: Contractor agrees to provide the following services:
{{serviceDescription}}

2.2 **Performance Standards**: Contractor shall perform Services with professional skill and care, in accordance with industry best practices and Business's reasonable requirements.

2.3 **Acceptance**: Business shall have 7 business days to review and accept Deliverables. Acceptance may not be unreasonably withheld.

## 3. TERM AND TERMINATION

3.1 **Term**: This Agreement commences on {{startDate}}{{#endDate}} and continues until {{endDate}}{{/endDate}}{{^endDate}} and continues until terminated in accordance with this Agreement{{/endDate}}.

3.2 **Termination for Convenience**: Either party may terminate this Agreement with 30 days' written notice.

3.3 **Termination for Cause**: Either party may terminate immediately upon written notice if the other party materially breaches this Agreement and fails to cure within 15 days of written notice.

3.4 **Post-Termination**: Upon termination, Contractor shall promptly return all Business property and Confidential Information. Sections 4, 5, 6, 7, 8, 11, 12, 13, 14, and 15 shall survive termination.

## 4. FEES AND PAYMENT

4.1 **Payment Structure**: Business agrees to pay Contractor {{rateAmount}} {{rateCurrency}} per {{rateType}} for Services performed.

4.2 **Payment Process**: Business shall pay fees to SDP Global as agent, and SDP Global shall remit payment to Contractor, less applicable taxes, withholdings, and SDP Global's facilitation fees.

4.3 **Invoicing**: Contractor shall submit invoices through SDP Global's platform. Payment terms are net 30 days from invoice approval.

4.4 **Taxes**: Each party is responsible for their own taxes. Contractor acknowledges responsibility for all income taxes, social security contributions, and other applicable taxes on amounts received.

4.5 **Currency**: All payments shall be made in {{rateCurrency}} unless otherwise agreed in writing.

## 5. INTELLECTUAL PROPERTY TRANSFER

**5.1 ASSIGNMENT OF IP**: Contractor hereby assigns, transfers, and conveys to Business all right, title, and interest in and to all Deliverables and intellectual property created, conceived, developed, or reduced to practice by Contractor in performance of this Agreement, including but not limited to:
(a) Patents, copyrights, trademarks, trade secrets, and moral rights
(b) Software, source code, documentation, processes, and methodologies  
(c) Data, databases, and data structures
(d) All improvements, modifications, and derivative works

**5.2 PRESENT AND FUTURE ASSIGNMENT**: This assignment is effective immediately upon creation of any intellectual property and covers all intellectual property created during the term of this Agreement.

**5.3 WORK MADE FOR HIRE**: To the extent applicable under law, all Deliverables shall be deemed "work made for hire" for Business.

**5.4 AUTOMATIC ASSIGNMENT**: If any intellectual property cannot be assigned as work made for hire, it is hereby automatically assigned to Business upon creation.

**5.5 FURTHER ASSURANCES**: Contractor agrees to execute any additional documents reasonably necessary to perfect Business's ownership rights, including patent applications and copyright registrations.

**5.6 WAIVER OF MORAL RIGHTS**: To the fullest extent permitted by law, Contractor waives all moral rights in the Deliverables.

**5.7 NON-ASSIGNABLE RIGHTS**: If any rights cannot be assigned, Contractor grants Business an irrevocable, exclusive, worldwide, royalty-free license to use, modify, and sublicense such rights.

**5.8 BACKGROUND IP**: Contractor retains ownership of pre-existing intellectual property ("Background IP"). Contractor grants Business a perpetual, royalty-free license to use Background IP solely to the extent necessary to exploit the Deliverables.

## 6. CONFIDENTIALITY AND DATA PROTECTION

6.1 **Confidential Information**: Each party shall maintain in confidence all proprietary and confidential information received from the other party.

6.2 **Data Protection**: Contractor shall comply with applicable data protection laws, including GDPR where applicable, and Business's data protection policies.

6.3 **Return of Information**: Upon termination, Contractor shall return or destroy all Confidential Information and Business property.

## 7. INDEPENDENT CONTRACTOR STATUS

7.1 **Independent Relationship**: Contractor is an independent contractor, not an employee or agent of Business. This Agreement does not create an employment, partnership, or joint venture relationship.

7.2 **No Authority**: Contractor has no authority to bind Business or make commitments on Business's behalf.

7.3 **Compliance**: Contractor is responsible for compliance with all applicable laws, including tax obligations, labor laws, and regulatory requirements.

7.4 **Insurance**: Contractor shall maintain appropriate professional liability and general liability insurance.

## 8. WARRANTIES AND REPRESENTATIONS

8.1 **Authority**: Each party represents that it has full authority to enter into this Agreement.

8.2 **Non-Infringement**: Contractor warrants that Deliverables will not infringe third-party intellectual property rights.

8.3 **Originality**: Contractor warrants that all Deliverables will be original work, except for Background IP properly licensed.

8.4 **Quality**: Contractor warrants that Services will be performed in a professional and workmanlike manner.

## 9. INDEMNIFICATION

9.1 **Contractor Indemnity**: Contractor shall indemnify Business against claims arising from:
(a) Intellectual property infringement by Deliverables
(b) Breach of warranties or representations
(c) Negligent or wrongful acts of Contractor
(d) Violation of applicable laws

9.2 **Business Indemnity**: Business shall indemnify Contractor against claims arising from Business's use of Deliverables in accordance with this Agreement.

## 10. LIABILITY LIMITATION

10.1 **Limitation**: Each party's total liability shall be limited to the fees paid under this Agreement in the twelve months preceding the claim.

10.2 **Exceptions**: The limitation does not apply to:
(a) Intellectual property infringement
(b) Breach of confidentiality obligations  
(c) Fraud or willful misconduct
(d) Death or personal injury

10.3 **Consequential Damages**: Neither party shall be liable for indirect, consequential, or punitive damages.

## 11. SDP GLOBAL'S ROLE AND LIMITATIONS

11.1 **Facilitator Only**: SDP Global acts solely as facilitator and payment agent. SDP Global is not responsible for the Services or the performance of this Agreement between Business and Contractor.

11.2 **Payment Agent**: SDP Global collects payments from Business and remits to Contractor as agent for Business.

11.3 **No Employment**: SDP Global is not Contractor's employer and has no employment obligations to Contractor.

11.4 **KYC/AML**: SDP Global may perform know-your-customer and anti-money laundering procedures as required by law.

11.5 **Platform Services**: SDP Global may provide contract management, invoicing, and payment processing services through its platform.

## 12. COMPLIANCE AND REGULATORY

12.1 **Anti-Bribery**: Each party shall comply with all applicable anti-bribery and anti-corruption laws.

12.2 **Sanctions**: Neither party shall engage in activities prohibited by applicable economic sanctions.

12.3 **Export Controls**: Contractor shall comply with all applicable export control laws.

12.4 **Subcontracting**: Contractor may not subcontract Services without Business's prior written consent.

## 13. GENERAL PROVISIONS

13.1 **Governing Law**: This Agreement shall be governed by the laws of {{governingLaw}}.

13.2 **Dispute Resolution**: Any disputes shall be resolved in the courts of {{disputeVenue}}.

13.3 **Assignment**: This Agreement may not be assigned without the other party's written consent, except Business may assign to affiliates or in connection with a merger or acquisition.

13.4 **Force Majeure**: Neither party shall be liable for delays caused by circumstances beyond their reasonable control.

13.5 **Notices**: All notices shall be in writing and delivered to the addresses specified above.

13.6 **Entire Agreement**: This Agreement constitutes the entire agreement and supersedes all prior agreements relating to the subject matter.

13.7 **Severability**: If any provision is found invalid, the remainder shall remain in effect.

13.8 **Electronic Signatures**: This Agreement may be executed by electronic signature.

13.9 **Amendment**: This Agreement may only be amended in writing signed by both parties.

13.10 **Counterparts**: This Agreement may be executed in counterparts, each of which shall be deemed an original.

## SIGNATURES

**BUSINESS:**
{{businessName}}

By: _________________________
Name: 
Title: 
Date: 

**CONTRACTOR:**
{{contractorName}}{{#contractorBusinessName}}
{{contractorBusinessName}}{{/contractorBusinessName}}

By: _________________________  
Name: {{contractorName}}
Date: 

**ACKNOWLEDGMENT BY SDP GLOBAL:**
SDP Global acknowledges its role as facilitator and payment agent under this Agreement.

{{sdpEntityName}}

By: _________________________
Name: 
Title: 
Date: 

---
*This agreement is facilitated by SDP Global in {{sdpCountry}}. SDP Global entity details are specific to the country where the Business operates.*
`,
  uploadedBy: null, // Will be set to super admin user ID when created
  isActive: true
};

// Country-specific overrides for legal variations
const countryOverrides = {
  // United States
  "us": {
    governingLaw: "the State of Delaware, United States",
    disputeVenue: "Delaware, United States",
    additionalClauses: {
      atWillClause: "This Agreement may be terminated by either party at any time, with or without cause, consistent with independent contractor status.",
      taxClause: "Contractor is responsible for all federal, state, and local taxes. Business may be required to issue Form 1099-NEC for payments exceeding $600 in a calendar year."
    }
  },
  // United Kingdom  
  "gb": {
    governingLaw: "the laws of England and Wales",
    disputeVenue: "the courts of England and Wales",
    additionalClauses: {
      ir35Clause: "The parties acknowledge that this Agreement is intended to establish a genuine contractor relationship outside IR35 regulations.",
      vatClause: "If Contractor is VAT registered, VAT shall be added to invoices as applicable."
    }
  },
  // Australia
  "au": {
    governingLaw: "the laws of New South Wales, Australia",
    disputeVenue: "New South Wales, Australia", 
    additionalClauses: {
      gstClause: "If Contractor is registered for GST, GST shall be added to invoices as applicable.",
      superannuationClause: "This Agreement is intended to establish a genuine independent contractor relationship. No superannuation contributions are required."
    }
  },
  // European Union (General)
  "eu": {
    governingLaw: "the laws of Ireland",
    disputeVenue: "Dublin, Ireland",
    additionalClauses: {
      gdprClause: "Both parties shall comply with the General Data Protection Regulation (GDPR) and applicable data protection laws.",
      vatClause: "VAT shall be applied in accordance with applicable EU VAT regulations."
    }
  },
  // Singapore
  "sg": {
    governingLaw: "the laws of Singapore", 
    disputeVenue: "Singapore",
    additionalClauses: {
      gstClause: "If applicable, GST shall be added to invoices in accordance with Singapore tax law.",
      workPassClause: "Contractor warrants that they have the right to work in Singapore if Services are performed in Singapore."
    }
  }
};

export async function seedUniversalContractTemplate() {
  try {
    console.log("Creating Universal Independent Contractor Agreement template...");
    
    // Create the universal template
    const template = await storage.createContractTemplate(universalContractTemplate);
    
    console.log("✅ Universal Independent Contractor Agreement template created successfully!");
    console.log("Template ID:", template.id);
    console.log("Template includes:");
    console.log("- Comprehensive IP transfer clauses");
    console.log("- SDP Global facilitator and payment agent provisions");
    console.log("- Universal legal framework suitable for multiple jurisdictions");
    console.log("- Placeholder variables for customization");
    
    return template;
  } catch (error) {
    console.error("❌ Error creating Universal Independent Contractor Agreement template:", error);
    throw error;
  }
}

// Export the template data for reference
export { universalContractTemplate, countryOverrides };

// Auto-execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedUniversalContractTemplate()
    .then(() => {
      console.log("✅ Universal contract template seeding completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error seeding universal contract template:", error);
      process.exit(1);
    });
}