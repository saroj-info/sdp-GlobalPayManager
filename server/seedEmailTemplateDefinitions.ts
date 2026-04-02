import { storage } from "./storage";

// Define all 12 email template definitions with their metadata
const emailTemplateDefinitions = [
  {
    key: "welcome_after_signup",
    name: "Welcome Email",
    description: "Welcome email sent after worker completes onboarding process",
    category: "onboarding",
    triggeredFromScreen: "Worker onboarding completion page",
    allowedVariables: ["workerName", "businessName", "contractType", "supportEmail"],
  },
  {
    key: "email_verification",
    name: "Email Verification",
    description: "Email address verification for new user accounts",
    category: "authentication",
    triggeredFromScreen: "User registration form",
    allowedVariables: ["firstName", "verificationToken", "verificationLink"],
  },
  {
    key: "invoice_approved",
    name: "Invoice Approved",
    description: "Notification sent when an invoice is approved for payment",
    category: "invoicing",
    triggeredFromScreen: "Invoice management dashboard",
    allowedVariables: ["workerName", "invoiceNumber", "amount", "currency", "paymentDate"],
  },
  {
    key: "invoice_rejected",
    name: "Invoice Rejected",
    description: "Notification sent when an invoice is rejected",
    category: "invoicing",
    triggeredFromScreen: "Invoice management dashboard",
    allowedVariables: ["workerName", "invoiceNumber", "reason", "supportEmail"],
  },
  {
    key: "contract_ready",
    name: "Contract Ready",
    description: "Notification when a new contract is generated and ready for signing",
    category: "contracts",
    triggeredFromScreen: "Contract generation system",
    allowedVariables: ["workerName", "businessName", "contractType", "signingLink"],
  },
  {
    key: "contract_request_submitted",
    name: "Contract Request Submitted",
    description: "Notification to SDP team when a business user submits a new contract request",
    category: "contracts",
    triggeredFromScreen: "Contract creation wizard",
    allowedVariables: ["businessName", "workerName", "contractType", "roleName", "requestorName", "reviewLink"],
  },
  {
    key: "user_invite_sdp",
    name: "SDP User Invite",
    description: "Internal SDP team member invitation email",
    category: "user_management",
    triggeredFromScreen: "SDP admin user management panel",
    allowedVariables: ["inviteeName", "inviterName", "role", "setupLink", "expiryDate"],
  },
  {
    key: "registration_confirmation",
    name: "Registration Confirmation",
    description: "Account creation confirmation for new users",
    category: "authentication",
    triggeredFromScreen: "User registration completion",
    allowedVariables: ["firstName", "lastName", "accountType", "loginLink"],
  },
  {
    key: "business_invitation",
    name: "Business Invitation",
    description: "Business partnership invitation for new client businesses",
    category: "business_onboarding",
    triggeredFromScreen: "Business invitation form",
    allowedVariables: ["businessName", "contactName", "inviterName", "setupLink", "expiryDate"],
  },
  {
    key: "worker_approval_request",
    name: "Worker Approval Request",
    description: "Notification to business when worker requires approval",
    category: "worker_management",
    triggeredFromScreen: "Worker approval workflow",
    allowedVariables: ["workerName", "businessName", "workerType", "approvalLink", "workerDetails"],
  },
  {
    key: "business_user_invite",
    name: "Business User Invite",
    description: "Invitation for business team members to join their company account",
    category: "user_management",
    triggeredFromScreen: "Business user management panel",
    allowedVariables: ["inviteeName", "businessName", "inviterName", "role", "setupLink"],
  },
  {
    key: "report_generation",
    name: "Report Generation",
    description: "Notification when scheduled or requested reports are ready",
    category: "reporting",
    triggeredFromScreen: "Report generation system",
    allowedVariables: ["reportName", "reportType", "generationDate", "downloadLink", "recipientName"],
  },
  {
    key: "password_reset",
    name: "Password Reset",
    description: "Password reset instructions for user accounts",
    category: "authentication",
    triggeredFromScreen: "Password reset form",
    allowedVariables: ["firstName", "resetToken", "resetLink", "expiryTime"],
  },
  {
    key: "entity_information_sharing",
    name: "Entity Information Sharing",
    description: "Share country entity information including shareholders, directors, tax advisors, and compliance documents",
    category: "compliance",
    triggeredFromScreen: "Country Management - Entity & Compliance tab",
    allowedVariables: [
      "recipientName", 
      "senderName", 
      "countryName", 
      "countryCode", 
      "entityName", 
      "shareholders", 
      "directors", 
      "taxAdvisors", 
      "documentsCount", 
      "complianceNotes", 
      "lastUpdated", 
      "accessLink", 
      "supportEmail"
    ],
  },
];

// Seed function to populate email template definitions
async function seedEmailTemplateDefinitions() {
  console.log("🌱 Starting email template definitions seeding...");

  try {
    for (const definition of emailTemplateDefinitions) {
      console.log(`📧 Processing email template definition: ${definition.name} (${definition.key})`);

      // Check if definition already exists
      const existing = await storage.getEmailTemplateDefinitionByKey(definition.key);

      if (existing) {
        console.log(`📧 Definition '${definition.key}' already exists, updating...`);
        await storage.updateEmailTemplateDefinition(existing.id, {
          name: definition.name,
          description: definition.description,
          category: definition.category,
          triggeredFromScreen: definition.triggeredFromScreen,
          allowedVariables: definition.allowedVariables,
        });
        console.log(`✅ Updated email template definition: ${definition.name}`);
      } else {
        console.log(`📧 Creating new definition '${definition.key}'...`);
        await storage.createEmailTemplateDefinition(definition);
        console.log(`✅ Created email template definition: ${definition.name}`);
      }
    }

    console.log("🎉 Email template definitions seeding completed successfully!");
    console.log(`📊 Total definitions processed: ${emailTemplateDefinitions.length}`);
    
    // Display summary
    console.log("\n📋 Email Template Definitions Summary:");
    console.log("=====================================");
    
    const categories = Array.from(new Set(emailTemplateDefinitions.map(def => def.category)));
    for (const category of categories) {
      const categoryDefs = emailTemplateDefinitions.filter(def => def.category === category);
      console.log(`\n${category.toUpperCase().replace(/_/g, ' ')}:`);
      categoryDefs.forEach(def => {
        console.log(`  • ${def.name} (${def.key})`);
        console.log(`    Screen: ${def.triggeredFromScreen}`);
        console.log(`    Variables: ${def.allowedVariables.join(', ')}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding email template definitions:", error);
    process.exit(1);
  }
}

// Run the seeding if this file is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  seedEmailTemplateDefinitions();
}

export { seedEmailTemplateDefinitions, emailTemplateDefinitions };