import { storage } from './storage';

const usaAtWillEmploymentTemplate = {
  name: "USA At-Will Employment Agreement",
  employmentType: "at_will" as const,
  countryId: "us", // USA-specific template
  variables: JSON.stringify([
    "businessName", "businessAddress", "businessRegistrationNumber", "federalEIN",
    "employeeName", "employeeAddress", "employeeEmail", "employeeSSNLast4",
    "jobTitle", "jobDescription", "startDate", "salaryAmount", "salaryFrequency",
    "benefitsDescription", "workSchedule", "reportingManager", "flsaClassification", "overtimeEligibilityText",
    "sdpEntityName", "sdpRegistrationNumber", "sdpAddress", "sdpTaxId",
    "agreementDate", "businessContactEmail", "businessContactPhone",
    "stateOfEmployment", "stateWorkersCompPolicy", "nonCompeteMonths", "nonCompeteGeography"
  ]),
  template: `
USA AT-WILL EMPLOYMENT AGREEMENT

This At-Will Employment Agreement ("Agreement") is entered into on {{agreementDate}} between:

**EMPLOYER:**
{{businessName}}
Federal EIN: {{federalEIN}}
Registration Number: {{businessRegistrationNumber}}
Address: {{businessAddress}}
Email: {{businessContactEmail}}
Phone: {{businessContactPhone}}
("Company" or "Employer")

**EMPLOYEE:**
{{employeeName}}
SSN (Last 4 digits): ****-**-{{employeeSSNLast4}}
Address: {{employeeAddress}}
Email: {{employeeEmail}}
("Employee")

**PAYROLL AND HR FACILITATOR:**
{{sdpEntityName}}
Registration Number: {{sdpRegistrationNumber}}
Address: {{sdpAddress}}
Tax ID: {{sdpTaxId}}
("SDP Global" or "Facilitator")

## 1. EMPLOYMENT RELATIONSHIP

1.1 **Employment Start Date**: Employee's employment shall commence on {{startDate}}.

1.2 **Position and Duties**: Employee is hired as {{jobTitle}} and agrees to perform the following duties and responsibilities:
{{jobDescription}}

1.3 **Reporting Relationship**: Employee will report directly to {{reportingManager}} or their designated representative.

1.4 **Work Schedule**: Employee's standard work schedule shall be {{workSchedule}}, subject to Company's business needs and applicable labor laws.

1.5 **Work Location**: Employee will primarily work at {{businessAddress}} or such other location as Company may designate, including remote work arrangements as approved by Company.

1.6 **FLSA Classification**: Employee is classified as {{flsaClassification}} under the Fair Labor Standards Act and {{overtimeEligibilityText}}.

## 2. AT-WILL EMPLOYMENT

2.1 **Employment At-Will**: This is an at-will employment relationship. Either Employee or Company may terminate this employment relationship at any time, with or without cause, and with or without notice, subject to applicable federal and state laws.

2.2 **No Contract for Specific Term**: This Agreement does not create an employment contract for any specific period of time. No one other than the Company's authorized representatives has authority to modify this at-will relationship or enter into any agreement contrary to this provision.

2.3 **Survival of Certain Provisions**: Termination of employment shall not affect any obligations under Sections 6 (Confidentiality), 7 (Intellectual Property), or 8 (Non-Compete and Non-Solicitation) of this Agreement.

## 3. COMPENSATION AND BENEFITS

3.1 **Base Salary**: Employee's annual base salary shall be {{salaryAmount}} USD, payable {{salaryFrequency}} in accordance with Company's standard payroll practices.

3.2 **Benefits**: Employee shall be eligible for the following benefits, subject to the terms and conditions of the applicable benefit plans:
{{benefitsDescription}}

3.3 **Payroll Processing**: SDP Global will process payroll on behalf of Company, including withholding applicable federal, state, and local taxes, Social Security, Medicare, and other required deductions.

3.4 **Workers' Compensation**: Employee is covered under Company's workers' compensation insurance policy {{stateWorkersCompPolicy}} as required by {{stateOfEmployment}} law.

## 4. PERFORMANCE EXPECTATIONS

4.1 **Professional Standards**: Employee agrees to perform all duties with professional competence, integrity, and in accordance with Company policies and procedures.

4.2 **Compliance**: Employee must comply with all applicable federal, state, and local laws, regulations, and Company policies.

4.3 **Performance Reviews**: Employee's performance will be evaluated periodically in accordance with Company's standard review procedures.

## 5. EMPLOYMENT POLICIES

5.1 **Employee Handbook**: Employee acknowledges receipt of and agrees to comply with Company's Employee Handbook, which may be modified from time to time.

5.2 **Anti-Discrimination**: Company is an equal opportunity employer and prohibits discrimination based on race, color, religion, sex, national origin, age, disability, genetic information, or any other protected characteristic.

5.3 **Workplace Safety**: Employee agrees to follow all safety policies and procedures and report any workplace hazards or injuries immediately.

## 6. CONFIDENTIALITY

6.1 **Confidential Information**: Employee acknowledges that during employment, Employee may have access to and become acquainted with confidential and proprietary information of Company, including but not limited to trade secrets, customer lists, financial information, business strategies, and technical data.

6.2 **Non-Disclosure**: Employee agrees not to disclose any confidential information to third parties and to use such information solely for Company's benefit during and after employment.

6.3 **Return of Materials**: Upon termination, Employee agrees to return all Company property, including documents, electronic files, and equipment.

## 7. INTELLECTUAL PROPERTY

7.1 **Work Made for Hire**: All work product, inventions, discoveries, and intellectual property created by Employee within the scope of employment shall be considered "work made for hire" and shall belong exclusively to Company.

7.2 **Assignment**: Employee assigns to Company all rights, title, and interest in any intellectual property created during employment that relates to Company's business or uses Company resources.

## 8. POST-EMPLOYMENT RESTRICTIONS

8.1 **Non-Compete** (if enforceable under {{stateOfEmployment}} law): For a period of {{nonCompeteMonths}} months following termination, Employee agrees not to directly compete with Company's business within {{nonCompeteGeography}} or solicit Company's customers.

8.2 **Non-Solicitation**: For {{nonCompeteMonths}} months following termination, Employee agrees not to solicit Company's employees to leave their employment or solicit Company's customers for competitive purposes.

*Note: The enforceability of non-compete clauses varies by state. This provision is only enforceable to the extent permitted by {{stateOfEmployment}} law.*

## 9. TERMINATION

9.1 **Voluntary Resignation**: Employee may resign at any time by providing two (2) weeks written notice to Company.

9.2 **Termination by Company**: Company may terminate Employee's employment at any time, with or without cause, subject to applicable laws and Company policies.

9.3 **Final Pay**: Upon termination, Employee will receive all earned but unpaid wages and benefits as required by applicable law.

## 10. SDP GLOBAL'S ROLE

10.1 **Facilitator Only**: SDP Global acts solely as a payroll and HR facilitator for Company. SDP Global is not Employee's employer and has no responsibility for employment decisions, workplace conditions, or Employee's performance.

10.2 **Services**: SDP Global provides the following services to Company:
- Payroll processing and tax withholding
- Benefits administration (if applicable)
- Employment law compliance support
- HR documentation management

10.3 **Limitation of Liability**: SDP Global's liability is limited to its role as facilitator and does not extend to employment-related claims between Company and Employee.

## 11. MISCELLANEOUS

11.1 **Governing Law**: This Agreement shall be governed by the laws of {{stateOfEmployment}} and the United States, without regard to conflict of law principles.

11.2 **Jurisdiction**: Any disputes arising under this Agreement shall be resolved in the state and federal courts of {{stateOfEmployment}}.

11.3 **Severability**: If any provision of this Agreement is deemed invalid or unenforceable, the remaining provisions shall continue in full force and effect.

11.4 **Entire Agreement**: This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements.

11.5 **Modification**: This Agreement may only be modified in writing, signed by both parties.

11.6 **Electronic Signatures**: The parties agree that electronic signatures shall be valid and enforceable.

## ACKNOWLEDGMENT AND SIGNATURES

By signing below, the parties acknowledge that they have read, understood, and agree to be bound by this Agreement.

**EMPLOYER:**
{{businessName}}

By: _________________________  
Name: 
Title: 
Date: 

**EMPLOYEE:**

By: _________________________  
Name: {{employeeName}}
Date: 

**ACKNOWLEDGMENT BY SDP GLOBAL:**
SDP Global acknowledges its role as payroll and HR facilitator under this Agreement.

{{sdpEntityName}}

By: _________________________
Name: 
Title: 
Date: 

---
*This agreement is facilitated by SDP Global. SDP Global provides payroll and HR services but is not the employer. The employment relationship exists solely between Company and Employee.*

**IMPORTANT LEGAL NOTICES:**

1. **At-Will Employment**: This is an at-will employment relationship that can be terminated by either party at any time.

2. **State-Specific Laws**: Employment laws vary by state. This agreement is subject to {{stateOfEmployment}} employment laws and regulations.

3. **Workers' Compensation**: Employee is covered under the employer's workers' compensation insurance as required by state law.

4. **Equal Opportunity**: This employer is an equal opportunity employer and complies with all applicable federal and state anti-discrimination laws.

5. **Wage and Hour Laws**: Employee is entitled to all wages, overtime, and breaks as required by federal and {{stateOfEmployment}} labor laws.
`,
  uploadedBy: null, // Will be set to super admin user ID when created
  isActive: true
};

// Function to seed the USA At-Will Employment template
export async function seedUSAAtWillEmployment() {
  try {
    console.log('Seeding USA At-Will Employment template...');
    
    // Check if template already exists
    const existingTemplates = await storage.getContractTemplates();
    const existingTemplate = existingTemplates.find(t => 
      t.name === usaAtWillEmploymentTemplate.name && 
      t.employmentType === usaAtWillEmploymentTemplate.employmentType &&
      t.countryId === usaAtWillEmploymentTemplate.countryId
    );
    
    if (existingTemplate) {
      console.log('USA At-Will Employment template already exists, updating...');
      // Update existing template
      await storage.updateContractTemplate(existingTemplate.id, usaAtWillEmploymentTemplate);
    } else {
      console.log('Creating new USA At-Will Employment template...');
      // Create new template
      await storage.createContractTemplate(usaAtWillEmploymentTemplate);
    }
    
    console.log('USA At-Will Employment template seeded successfully');
  } catch (error) {
    console.error('Error seeding USA At-Will Employment template:', error);
    throw error;
  }
}

// Auto-execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedUSAAtWillEmployment()
    .then(() => {
      console.log('USA At-Will Employment template seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to seed USA At-Will Employment template:', error);
      process.exit(1);
    });
}