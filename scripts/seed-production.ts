/**
 * Production Database Seed Script
 * 
 * This script populates the production database with essential data:
 * - Countries (17 active countries)
 * - Contract Templates (4 universal templates)
 * - SDP Super Admin user
 * 
 * Usage:
 *   tsx scripts/seed-production.ts
 * 
 * IMPORTANT: Run this script ONLY ONCE after deploying to production
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { countries, contractTemplates, users } from '../shared/schema';
import bcrypt from 'bcrypt';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

async function seedProduction() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🌱 Starting production database seed...\n');

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    // 1. Seed Countries
    console.log('📍 Seeding countries...');
    const countriesData = [
      {
        id: 'au',
        name: 'Australia',
        code: 'AU',
        companyName: 'SDP SOLUTIONS PTY LTD',
        currency: 'AUD',
        isActive: true,
        companyRegistrationNumber: '108572032',
        legalEntityType: 'company' as const,
        streetAddress: 'Level 6, 207 Kent Street',
        city: 'Sydney',
        stateProvince: 'NSW',
        postalCode: '2000',
        taxIdentificationNumber: '70108572032',
      },
      {
        id: 'brazil',
        name: 'Brazil',
        code: 'BR',
        companyName: 'SDP Brasil Ltda',
        currency: 'BRL',
        isActive: true,
      },
      {
        id: 'ca',
        name: 'Canada',
        code: 'CA',
        companyName: 'SDP WORKFORCE SOLUTIONS INC.',
        currency: 'CAD',
        isActive: true,
      },
      {
        id: 'de',
        name: 'Germany',
        code: 'DE',
        companyName: 'SDP Deutschland GmbH',
        currency: 'EUR',
        isActive: true,
      },
      {
        id: 'in',
        name: 'India',
        code: 'IN',
        companyName: 'SDP CONTINGENT WORKFORCE SOLUTIONS PRIVATE LIMITED',
        currency: 'INR',
        isActive: true,
        legalEntityType: 'company' as const,
      },
      {
        id: 'ie',
        name: 'Ireland',
        code: 'IE',
        companyName: 'SDP GLOBAL SOLUTIONS LIMITED',
        currency: 'EUR',
        isActive: true,
      },
      {
        id: 'jp',
        name: 'Japan',
        code: 'JP',
        companyName: 'SDP WORKFORCE SOLUTIONS KABUSHIKI KAISHA',
        currency: 'JPY',
        isActive: true,
      },
      {
        id: 'malaysia',
        name: 'Malaysia',
        code: 'MY',
        companyName: 'SDP Malaysia Sdn Bhd',
        currency: 'MYR',
        isActive: true,
      },
      {
        id: 'nz',
        name: 'New Zealand',
        code: 'NZ',
        companyName: 'SDP SOLUTIONS LTD',
        currency: 'NZD',
        isActive: true,
        legalEntityType: 'company' as const,
      },
      {
        id: 'pk',
        name: 'Pakistan',
        code: 'PK',
        companyName: 'SDP Pakistan Pvt Ltd',
        currency: 'PKR',
        isActive: true,
      },
      {
        id: 'ph',
        name: 'Philippines',
        code: 'PH',
        companyName: 'SDP GLOBAL SOLUTIONS INC.',
        currency: 'PHP',
        isActive: true,
      },
      {
        id: 'romania',
        name: 'Romania',
        code: 'RO',
        companyName: 'SDP Romania SRL',
        currency: 'EUR',
        isActive: true,
        legalEntityType: 'company' as const,
      },
      {
        id: 'sg',
        name: 'Singapore',
        code: 'SG',
        companyName: 'SDP WORKFORCE SOLUTIONS PTE LTD',
        currency: 'SGD',
        isActive: true,
      },
      {
        id: 'lk',
        name: 'Sri Lanka',
        code: 'LK',
        companyName: 'SDP Sri Lanka (Pvt) Ltd',
        currency: 'LKR',
        isActive: true,
      },
      {
        id: 'uk',
        name: 'United Kingdom',
        code: 'GB',
        companyName: 'SDP GLOBAL SOLUTIONS LIMITED',
        currency: 'GBP',
        isActive: true,
      },
      {
        id: 'us',
        name: 'United States',
        code: 'US',
        companyName: 'SDP WORKFORCE SOLUTIONS LLC',
        currency: 'USD',
        isActive: true,
      },
      {
        id: 'vn',
        name: 'Vietnam',
        code: 'VN',
        companyName: 'SDP Vietnam Co., Ltd',
        currency: 'VND',
        isActive: true,
      },
    ];

    for (const country of countriesData) {
      await db.insert(countries).values(country).onConflictDoNothing();
      console.log(`  ✓ ${country.name}`);
    }
    console.log(`✅ Seeded ${countriesData.length} countries\n`);

    // 2. Seed Contract Templates
    console.log('📄 Seeding contract templates...');
    
    // Get the template content from the database (we'll read the actual template files)
    const templatesData = [
      {
        id: '31373d16-72c5-46f5-8588-e4a812a1e36d',
        name: 'USA At-Will Employment Agreement',
        employmentType: 'at_will' as const,
        countryId: 'us',
        isActive: true,
        variables: ["businessName","businessAddress","businessRegistrationNumber","federalEIN","employeeName","employeeAddress","employeeEmail","employeeSSNLast4","jobTitle","jobDescription","startDate","salaryAmount","salaryFrequency","benefitsDescription","workSchedule","reportingManager","flsaClassification","overtimeEligibilityText","sdpEntityName","sdpRegistrationNumber","sdpAddress","sdpTaxId","agreementDate","businessContactEmail","businessContactPhone","stateOfEmployment","stateWorkersCompPolicy","nonCompeteMonths","nonCompeteGeography"],
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
`
      },
      {
        id: '20f3da97-f56f-4e48-a13e-39ca9ef48fcb',
        name: 'Universal Independent Contractor Agreement',
        employmentType: 'contractor' as const,
        countryId: null,
        isActive: true,
        variables: ["businessName","businessAddress","businessRegistrationNumber","businessTaxId","contractorName","contractorAddress","contractorEmail","contractorBusinessName","serviceDescription","startDate","endDate","rateAmount","rateCurrency","rateType","sdpEntityName","sdpRegistrationNumber","sdpAddress","sdpTaxId","sdpCountry","governingLaw","disputeVenue","agreementDate","businessContactEmail","businessContactPhone"],
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

## 1. SERVICES AND DELIVERABLES

1.1 **Scope of Services**: Contractor agrees to provide the following services:
{{serviceDescription}}

1.2 **Performance Standards**: Contractor shall perform Services with professional skill and care.

## 2. TERM AND TERMINATION

2.1 **Term**: This Agreement commences on {{startDate}}{{#endDate}} and continues until {{endDate}}{{/endDate}}.

2.2 **Termination for Convenience**: Either party may terminate this Agreement with 30 days' written notice.

## 3. FEES AND PAYMENT

3.1 **Payment Structure**: Business agrees to pay Contractor {{rateAmount}} {{rateCurrency}} per {{rateType}}.

3.2 **Payment Process**: Business shall pay fees to SDP Global as agent, and SDP Global shall remit payment to Contractor.

3.3 **Invoicing**: Contractor shall submit invoices through SDP Global's platform.

## 4. INDEPENDENT CONTRACTOR RELATIONSHIP

4.1 **No Employment**: Contractor is an independent contractor, not an employee.

4.2 **Taxes**: Contractor is responsible for all income taxes and social security contributions.

## 5. INTELLECTUAL PROPERTY

5.1 **Assignment of IP**: Contractor assigns all rights, title, and interest in work product to Business.

## 6. CONFIDENTIALITY

6.1 **Confidential Information**: Contractor agrees to maintain confidentiality of Business information.

## 7. GOVERNING LAW

7.1 **Jurisdiction**: This Agreement is governed by the laws of {{governingLaw}}.

---
Signed: {{agreementDate}}
`
      },
      {
        id: 'c8e33b15-8af4-4019-9a2a-39828979725d',
        name: 'Universal Permanent Employment Agreement',
        employmentType: 'permanent' as const,
        countryId: null,
        isActive: true,
        variables: ["businessName", "workerName", "roleTitle", "jobDescription", "startDate", "endDate", "currency", "rateAmount", "agreementDate"],
        template: `
UNIVERSAL PERMANENT EMPLOYMENT AGREEMENT

This Permanent Employment Agreement ("Agreement") is entered into on {{agreementDate}} between:

**EMPLOYER:**
{{businessName}}
("Employer")

**EMPLOYEE:**
{{workerName}}
("Employee")

## 1. EMPLOYMENT

1.1 **Position**: Employee is hired as {{roleTitle}}.

1.2 **Start Date**: Employment commences on {{startDate}}.

1.3 **Duties**: {{jobDescription}}

## 2. COMPENSATION

2.1 **Salary**: Employee will receive {{rateAmount}} {{currency}} as compensation.

## 3. TERM

3.1 **Duration**: This is a permanent employment contract{{#endDate}} with an end date of {{endDate}}{{/endDate}}.

---
Signed: {{agreementDate}}
`
      },
      {
        id: '636f319b-6dbc-494c-bbbc-13d74055d648',
        name: 'Universal 3rd Party Business Worker Agreement',
        employmentType: 'third_party_worker' as const,
        countryId: null,
        isActive: true,
        variables: ["businessName","businessAddress","businessRegistrationNumber","businessTaxId","thirdPartyBusinessName","thirdPartyAddress","thirdPartyRegistrationNumber","thirdPartyTaxId","thirdPartyContactEmail","thirdPartyContactPhone","workerName","workerRole","workerSkills","serviceDescription","startDate","endDate","rateAmount","rateCurrency","rateType","sdpEntityName","sdpRegistrationNumber","sdpAddress","sdpTaxId","sdpCountry","governingLaw","disputeVenue","agreementDate","businessContactEmail","businessContactPhone","hostClientName"],
        template: `
UNIVERSAL 3RD PARTY BUSINESS WORKER AGREEMENT

This Agreement is entered into on {{agreementDate}} between:

**HOST BUSINESS:**
{{hostClientName}}
("Host Business")

**THIRD PARTY BUSINESS:**
{{thirdPartyBusinessName}}
Registration: {{thirdPartyRegistrationNumber}}
("Third Party Business")

**WORKER:**
{{workerName}}
Role: {{workerRole}}
("Worker")

**FACILITATOR:**
{{sdpEntityName}}
("SDP Global")

## 1. SERVICES

1.1 **Worker Provision**: Third Party Business provides Worker to perform: {{serviceDescription}}

1.2 **Skills**: {{workerSkills}}

## 2. TERM

2.1 **Duration**: {{startDate}} to {{#endDate}}{{endDate}}{{/endDate}}{{^endDate}}ongoing{{/endDate}}

## 3. COMPENSATION

3.1 **Rate**: {{rateAmount}} {{rateCurrency}} per {{rateType}}

---
Signed: {{agreementDate}}
`
      }
    ];

    for (const template of templatesData) {
      await db.insert(contractTemplates).values({
        name: template.name,
        employmentType: template.employmentType,
        countryId: template.countryId,
        isActive: template.isActive,
        variables: JSON.stringify(template.variables),
        template: template.template,
      }).onConflictDoNothing();
      console.log(`  ✓ ${template.name}`);
    }
    console.log(`✅ Seeded ${templatesData.length} contract templates\n`);

    // 3. Seed SDP Super Admin User
    console.log('👤 Seeding SDP Super Admin user...');
    
    // Use password from SUPER_ADMIN_PASSWORD environment variable
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('❌ SUPER_ADMIN_PASSWORD environment variable is not set');
      process.exit(1);
    }
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    const adminUser = {
      id: 'test-user-sdpultimateadmin',
      email: 'admin@sdpglobalpay.com',
      firstName: 'Raj',
      lastName: 'Sesha',
      phoneNumber: '+61403017017',
      jobTitle: 'Admin',
      company: 'SDP Solutions',
      address: 'Level 6, 207 Kent Street',
      city: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      country: 'Australia',
      userType: 'sdp_internal' as const,
      sdpRole: 'sdp_super_admin' as const,
      accessibleCountries: [],
      accessibleBusinessIds: [],
      isActive: true,
      passwordHash,
      emailVerified: true,
    };

    await db.insert(users).values(adminUser).onConflictDoNothing();
    console.log(`  ✓ SDP Super Admin: ${adminUser.email}`);
    console.log(`  ✓ Password set from SUPER_ADMIN_PASSWORD environment variable\n`);
    
    console.log('✅ Production database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${countriesData.length} countries`);
    console.log(`  - ${templatesData.length} contract templates`);
    console.log(`  - 1 SDP Super Admin user`);
    console.log('\n🔐 Admin Login:');
    console.log(`  Email: ${adminUser.email}`);
    console.log(`  Password: (from SUPER_ADMIN_PASSWORD secret)\n`);

  } catch (error) {
    console.error('❌ Error seeding production database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the seed script
seedProduction()
  .then(() => {
    console.log('✨ Seed complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to seed:', error);
    process.exit(1);
  });
