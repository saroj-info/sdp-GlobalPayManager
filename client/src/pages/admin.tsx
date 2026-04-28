import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

// Email template content mapping
function getEmailTemplateContent(key: string): string {
  const templates: Record<string, string> = {
    welcome_after_signup: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to SDP Global Pay</h1>
          <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">Global Contracting Made Easy</p>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #1e40af; margin-bottom: 20px;">Hello {{workerName}},</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Congratulations! Your onboarding with <strong>{{businessName}}</strong> through SDP Global Pay has been completed successfully.
          </p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">What's Next?</h3>
            <ul style="color: #374151; line-height: 1.6;">
              <li>Access your dashboard to view contracts and submit timesheets</li>
              <li>Upload invoices and track payment status</li>
              <li>Manage your personal and business information</li>
              <li>Submit leave requests when needed</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" 
               style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Access Your Dashboard
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If you have any questions, please don't hesitate to contact our support team at {{supportEmail}}.
          </p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p>© 2025 SDP Global Pay. Making global contracting and employment easy.</p>
        </div>
      </div>
    `,
    email_verification: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Email</h1>
          <p style="color: #ddd6fe; margin: 10px 0 0 0; font-size: 16px;">Secure your SDP Global Pay account</p>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #7c3aed; margin-bottom: 20px;">Hello {{firstName}},</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Welcome to SDP Global Pay! Please verify your email address to complete your account setup.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{verificationLink}}" 
               style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            If the button doesn't work, copy and paste this link: {{verificationLink}}
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            This verification link will expire in 24 hours. If you didn't create this account, please ignore this email.
          </p>
        </div>
      </div>
    `,
    invoice_approved: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Invoice Approved</h1>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #059669; margin-bottom: 20px;">Great news, {{workerName}}!</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Your invoice <strong>#{{invoiceNumber}}</strong> for <strong>{{amount}} {{currency}}</strong> has been approved and is now being processed for payment.
          </p>
          
          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
            <p style="color: #374151; margin: 0;">
              <strong>Payment Timeline:</strong> Payments are typically processed within 3-5 business days after approval. Expected payment date: {{paymentDate}}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{invoicesUrl}}" 
               style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Invoice Details
            </a>
          </div>
        </div>
      </div>
    `,
    invoice_rejected: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Invoice Review Required</h1>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #dc2626; margin-bottom: 20px;">Hello {{workerName}},</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Your invoice <strong>#{{invoiceNumber}}</strong> requires some adjustments before it can be processed.
          </p>
          
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
            <p style="color: #374151; margin: 0;">
              <strong>Reason:</strong> {{reason}}
            </p>
          </div>
          
          <p style="color: #374151; line-height: 1.6;">
            Please review and resubmit your invoice with the necessary corrections. Contact {{supportEmail}} if you need assistance.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{invoicesUrl}}" 
               style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Review Invoice
            </a>
          </div>
        </div>
      </div>
    `,
    contract_ready: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Contract Ready</h1>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #1e40af; margin-bottom: 20px;">Hello {{workerName}},</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Your {{contractType}} contract with <strong>{{businessName}}</strong> has been prepared and is ready for your review and signature.
          </p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Next Steps:</h3>
            <ol style="color: #374151; line-height: 1.6;">
              <li>Review the contract terms carefully</li>
              <li>Contact us if you have any questions</li>
              <li>Sign the contract electronically</li>
              <li>Begin working once the contract is executed</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{signingLink}}" 
               style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Review Contract
            </a>
          </div>
        </div>
      </div>
    `,
    contract_request_notification: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Contract Request Submitted</h1>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #f59e0b; margin-bottom: 20px;">SDP Team,</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            A new contract request has been submitted by <strong>{{requestorName}}</strong> from <strong>{{businessName}}</strong> and requires your review.
          </p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin-top: 0;">Contract Details:</h3>
            <ul style="color: #92400e; line-height: 1.6; margin-bottom: 0;">
              <li><strong>Worker:</strong> {{workerName}}</li>
              <li><strong>Business:</strong> {{businessName}}</li>
              <li><strong>Contract Type:</strong> {{contractType}}</li>
              <li><strong>Role:</strong> {{roleName}}</li>
              <li><strong>Submitted by:</strong> {{requestorName}}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{contractsUrl}}" 
               style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Review Contract Request
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Please log into the SDP dashboard to review and process this contract request.
          </p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p>© 2025 SDP Global Pay. Making global contracting and employment easy.</p>
        </div>
      </div>
    `,
    password_reset: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Reset Your Password</h1>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #f59e0b; margin-bottom: 20px;">Hello {{firstName}},</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            You requested a password reset for your SDP Global Pay account. Click the button below to create a new password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetLink}}" 
               style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            This reset link will expire in {{expiryTime}}. If you didn't request this reset, please ignore this email.
          </p>
        </div>
      </div>
    `,
    user_invite_sdp: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">SDP Team Invitation</h1>
          <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">Join the SDP Global Pay Internal Team</p>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #1e40af; margin-bottom: 20px;">Hello {{inviteeName}},</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            <strong>{{inviterName}}</strong> has invited you to join the SDP Global Pay internal team as a <strong>{{role}}</strong>.
          </p>
          
          <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0;">
            <p style="color: #1e40af; margin: 0; font-weight: bold;">
              Role: {{role}}
            </p>
            <p style="color: #374151; margin: 10px 0 0 0;">
              This invitation expires on {{expiryDate}}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{setupLink}}" 
               style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
        </div>
      </div>
    `,
    registration_confirmation: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Registration Successful</h1>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #059669; margin-bottom: 20px;">Welcome {{firstName}} {{lastName}}!</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Your {{accountType}} account has been successfully created on SDP Global Pay.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{loginLink}}" 
               style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Login to Your Account
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            You can now access all features available to your account type.
          </p>
        </div>
      </div>
    `,
    business_invitation: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Business Partnership Invitation</h1>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #7c3aed; margin-bottom: 20px;">Hello {{contactName}},</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            <strong>{{inviterName}}</strong> has invited <strong>{{businessName}}</strong> to partner with SDP Global Pay for global workforce management.
          </p>
          
          <div style="background: #faf5ff; border-left: 4px solid #8b5cf6; padding: 20px; margin: 20px 0;">
            <h3 style="color: #7c3aed; margin-top: 0;">Partnership Benefits:</h3>
            <ul style="color: #374151; line-height: 1.6;">
              <li>Global contractor and employee management</li>
              <li>Automated compliance across 10+ countries</li>
              <li>Streamlined onboarding and payments</li>
              <li>Professional contract generation</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{setupLink}}" 
               style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Get Started
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            This invitation expires on {{expiryDate}}
          </p>
        </div>
      </div>
    `,
    worker_approval_request: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Worker Approval Required</h1>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #f59e0b; margin-bottom: 20px;">{{businessName}} Team,</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            <strong>{{workerName}}</strong> has completed their onboarding as a <strong>{{workerType}}</strong> and requires your approval to begin working.
          </p>
          
          <div style="background: #fffbeb; border-left: 4px solid #fbbf24; padding: 20px; margin: 20px 0;">
            <h3 style="color: #f59e0b; margin-top: 0;">Worker Details:</h3>
            <div style="color: #374151;">{{workerDetails}}</div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{approvalLink}}" 
               style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Review & Approve
            </a>
          </div>
        </div>
      </div>
    `,
    business_user_invite: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Team Invitation</h1>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #0891b2; margin-bottom: 20px;">Hello {{inviteeName}},</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            <strong>{{inviterName}}</strong> has invited you to join <strong>{{businessName}}</strong> on SDP Global Pay as a <strong>{{role}}</strong>.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{setupLink}}" 
               style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Join {{businessName}}
            </a>
          </div>
        </div>
      </div>
    `,
    report_generation: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Report Ready</h1>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #0f172a; margin-bottom: 20px;">Hello {{recipientName}},</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Your requested <strong>{{reportName}}</strong> ({{reportType}}) has been generated and is ready for download.
          </p>
          
          <div style="background: #f8fafc; border-left: 4px solid #1e293b; padding: 20px; margin: 20px 0;">
            <p style="color: #374151; margin: 0;">
              <strong>Generated:</strong> {{generationDate}}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{downloadLink}}" 
               style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Download Report
            </a>
          </div>
        </div>
      </div>
    `
  };
  
  return templates[key] || `<p>Template content for ${key} not found</p>`;
}

function getEmailTemplatePreview(key: string): string {
  const content = getEmailTemplateContent(key);
  
  // Replace variables with sample data for preview
  const sampleData: Record<string, string> = {
    workerName: "John Smith",
    businessName: "Acme Corporation",
    firstName: "John",
    lastName: "Smith",
    invoiceNumber: "INV-2025-001",
    amount: "$2,500.00",
    currency: "USD",
    paymentDate: "March 15, 2025",
    contractType: "Employment Contract",
    reason: "Missing timesheet details",
    supportEmail: "support@sdpglobalpay.com",
    dashboardUrl: "https://sdpglobalpay.replit.app/dashboard",
    invoicesUrl: "https://sdpglobalpay.replit.app/invoices",
    verificationLink: "https://sdpglobalpay.replit.app/verify-email/sample-token",
    resetLink: "https://sdpglobalpay.replit.app/reset-password/sample-token",
    signingLink: "https://sdpglobalpay.replit.app/contracts/sign/sample-id",
    expiryTime: "2 hours",
    inviteeName: "Sarah Johnson",
    inviterName: "Michael Chen",
    role: "Senior Administrator",
    setupLink: "https://sdpglobalpay.replit.app/setup/invite-token",
    expiryDate: "March 31, 2025",
    accountType: "Business Account",
    loginLink: "https://sdpglobalpay.replit.app/login",
    contactName: "David Wilson",
    workerType: "Independent Contractor",
    approvalLink: "https://sdpglobalpay.replit.app/workers/approve/sample-id",
    workerDetails: "Full-stack developer with 5+ years experience in React and Node.js",
    reportName: "Monthly Payroll Summary",
    reportType: "Payroll Report",
    generationDate: "March 1, 2025",
    downloadLink: "https://sdpglobalpay.replit.app/reports/download/sample-id",
    recipientName: "Alex Rodriguez"
  };
  
  let preview = content;
  Object.entries(sampleData).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    preview = preview.replace(regex, value);
  });
  
  return preview;
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Upload, Edit, Trash2, Eye, Users, Building2, MapPin, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { VariableHelper } from "@/components/VariableHelper";

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  employmentType: z.enum(["contractor", "permanent", "fixed_term", "casual", "third_party_worker", "zero_hours", "at_will", "gig_worker", "on_call", "seasonal", "part_time"]),
  countryId: z.string().nullable().optional(), // Allow null for global templates
  template: z.string().min(1, "Template content is required"),
  variables: z.string().optional(),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

interface ContractTemplate {
  id: string;
  name: string;
  employmentType: string;
  countryId: string | null; // Allow null for global templates
  template: string;
  templateFileUrl?: string;
  variables?: string;
  uploadedBy?: string;
  isActive: boolean;
  createdAt: string;
  country?: { name: string };
  uploadedByUser?: { firstName: string; lastName: string; email: string };
}

interface Country {
  id: string;
  name: string;
  code: string;
}

export default function AdminPage() {
  usePageHeader("Administrator Dashboard", "Manage contract templates and system configuration");
  
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [isEmailTemplateDialogOpen, setIsEmailTemplateDialogOpen] = useState(false);
  const [editingEmailTemplate, setEditingEmailTemplate] = useState<any>(null);
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [previewEmailHtml, setPreviewEmailHtml] = useState<string>('');
  const [isJurisdictionDialogOpen, setIsJurisdictionDialogOpen] = useState(false);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<any>(null);
  const [jurisdictionForm, setJurisdictionForm] = useState({
    countryId: '',
    calculationType: 'percent'
  });
  const [jurisdictionCountryFilter, setJurisdictionCountryFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      variables: "workerName,businessName,startDate,endDate,salaryAmount,currency",
      countryId: null, // Default to global template
    },
  });

  // Fetch contract templates
  const { data: templates, isLoading: isLoadingTemplates } = useQuery<any[]>({
    queryKey: ['/api/contract-templates'],
  });

  // Fetch countries
  const { data: countries, isLoading: isLoadingCountries } = useQuery<any[]>({
    queryKey: ['/api/countries'],
  });

  // Fetch email template definitions
  const { data: emailDefinitions, isLoading: isLoadingEmailDefinitions } = useQuery<any[]>({
    queryKey: ['/api/admin/email-template-definitions'],
  });

  // Fetch jurisdictions
  const { data: jurisdictions, isLoading: isLoadingJurisdictions } = useQuery<any[]>({
    queryKey: ['/api/admin/jurisdictions'],
  });

  // Create/Update template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: (data: TemplateFormData) => {
      const url = editingTemplate 
        ? `/api/contract-templates/${editingTemplate.id}` 
        : '/api/contract-templates';
      const method = editingTemplate ? 'PUT' : 'POST';
      
      return apiRequest(method, url, data);
    },
    onSuccess: () => {
      toast({
        title: editingTemplate ? "Template Updated" : "Template Created",
        description: `Contract template has been ${editingTemplate ? 'updated' : 'created'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contract-templates'] });
      setIsTemplateDialogOpen(false);
      setEditingTemplate(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingTemplate ? 'update' : 'create'} template`,
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: string) =>
      apiRequest('DELETE', `/api/contract-templates/${templateId}`),
    onSuccess: () => {
      toast({
        title: "Template Deleted",
        description: "Contract template has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contract-templates'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    saveTemplateMutation.mutate(data);
  };

  const handleEdit = (template: ContractTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      employmentType: template.employmentType as any,
      countryId: template.countryId || null, // Handle null for global templates
      template: template.template,
      variables: template.variables || "workerName,businessName,startDate,endDate,salaryAmount,currency",
    });
    setIsTemplateDialogOpen(true);
  };

  const handleDelete = (templateId: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(templateId);
    }
  };

  // Jurisdiction mutations
  const saveJurisdictionMutation = useMutation({
    mutationFn: (data: any) => {
      const url = selectedJurisdiction 
        ? `/api/admin/jurisdictions/${selectedJurisdiction.id}` 
        : '/api/admin/jurisdictions';
      const method = selectedJurisdiction ? 'PATCH' : 'POST';
      return apiRequest(method, url, data);
    },
    onSuccess: () => {
      toast({
        title: selectedJurisdiction ? "Jurisdiction Updated" : "Jurisdiction Created",
        description: selectedJurisdiction 
          ? "Jurisdiction rule has been updated successfully." 
          : "Jurisdiction rule has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/jurisdictions'] });
      setIsJurisdictionDialogOpen(false);
      setSelectedJurisdiction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save jurisdiction",
        variant: "destructive",
      });
    },
  });

  const deleteJurisdictionMutation = useMutation({
    mutationFn: (jurisdictionId: string) =>
      apiRequest('DELETE', `/api/admin/jurisdictions/${jurisdictionId}`),
    onSuccess: () => {
      toast({
        title: "Jurisdiction Deleted",
        description: "Jurisdiction rule has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/jurisdictions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete jurisdiction",
        variant: "destructive",
      });
    },
  });

  const handleDeleteJurisdiction = (jurisdictionId: string) => {
    if (confirm("Are you sure you want to delete this jurisdiction rule?")) {
      deleteJurisdictionMutation.mutate(jurisdictionId);
    }
  };

  const handleSaveJurisdiction = () => {
    const formData = {
      countryId: jurisdictionForm.countryId,
      stateProvince: (document.getElementById('stateProvince') as HTMLInputElement)?.value || '',
      name: (document.getElementById('name') as HTMLInputElement)?.value || '',
      calculationType: jurisdictionForm.calculationType,
      value: parseFloat((document.getElementById('value') as HTMLInputElement)?.value) || null,
      capAmount: parseFloat((document.getElementById('capAmount') as HTMLInputElement)?.value) || null,
      thresholdAmount: parseFloat((document.getElementById('thresholdAmount') as HTMLInputElement)?.value) || null,
      note: (document.getElementById('note') as HTMLTextAreaElement)?.value || '',
    };

    saveJurisdictionMutation.mutate(formData);
  };

  const handleOpenJurisdictionDialog = (jurisdiction: any = null) => {
    setSelectedJurisdiction(jurisdiction);
    setJurisdictionForm({
      countryId: jurisdiction?.countryId || '',
      calculationType: jurisdiction?.calculationType || 'percent'
    });
    setIsJurisdictionDialogOpen(true);
  };

  const getEmploymentTypeBadge = (type: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline", color: string }> = {
      contractor: { variant: "outline", color: "text-blue-600" },
      permanent: { variant: "default", color: "text-green-600" },
      fixed_term: { variant: "secondary", color: "text-orange-600" },
      casual: { variant: "outline", color: "text-purple-600" },
      third_party_worker: { variant: "outline", color: "text-indigo-600" },
      zero_hours: { variant: "secondary", color: "text-pink-600" },
      at_will: { variant: "outline", color: "text-teal-600" },
      gig_worker: { variant: "outline", color: "text-cyan-600" },
      on_call: { variant: "secondary", color: "text-amber-600" },
      seasonal: { variant: "outline", color: "text-lime-600" },
      part_time: { variant: "secondary", color: "text-violet-600" },
    };
    
    const config = variants[type] || variants.contractor;
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Contract Templates</TabsTrigger>
          <TabsTrigger value="email-templates">Email Templates</TabsTrigger>
          <TabsTrigger value="jurisdiction-data">Jurisdiction Data</TabsTrigger>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          {/* Templates Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">Contract Templates</h2>
              <p className="text-muted-foreground">
                Manage contract templates for different employment types and countries
              </p>
            </div>
            
            <Dialog open={isTemplateDialogOpen} onOpenChange={(open) => {
              setIsTemplateDialogOpen(open);
              if (!open) {
                setEditingTemplate(null);
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <DialogHeader className="pr-8">
                  <DialogTitle>
                    {editingTemplate ? "Edit Contract Template" : "Create New Contract Template"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTemplate
                      ? "Update the contract template details and content."
                      : "Create a new contract template that can be assigned to countries and employment types."
                    }
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                      {/* Left Column: Form Fields */}
                      <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Australia Fixed Term Employment Contract" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="employmentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employment Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'permanent'}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select employment type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="contractor">Contractor</SelectItem>
                                <SelectItem value="permanent">Permanent</SelectItem>
                                <SelectItem value="fixed_term">Fixed Term</SelectItem>
                                <SelectItem value="casual">Casual Employee</SelectItem>
                                <SelectItem value="third_party_worker">3rd Party Business Worker</SelectItem>
                                <SelectItem value="zero_hours">Zero-Hours Contract</SelectItem>
                                <SelectItem value="at_will">At-Will Employment</SelectItem>
                                <SelectItem value="gig_worker">Gig Worker</SelectItem>
                                <SelectItem value="on_call">On-Call Employee</SelectItem>
                                <SelectItem value="seasonal">Seasonal Worker</SelectItem>
                                <SelectItem value="part_time">Part-Time Employee</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="countryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value === "global" ? null : value)} value={field.value === null ? "global" : field.value || "global"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-country">
                                <SelectValue placeholder="Select country or global" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="global">🌍 Global Template (All Countries)</SelectItem>
                              {isLoadingCountries ? (
                                <SelectItem value="loading" disabled>Loading countries...</SelectItem>
                              ) : (
                                countries?.map((country: Country) => (
                                  <SelectItem key={country.id} value={country.id}>
                                    {country.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Global templates can be used across all countries. Country-specific templates are only available for that country.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="variables"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Variables</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="workerName,businessName,startDate,endDate,salaryAmount,currency" 
                              {...field} 
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Comma-separated list of variables that can be used in the template (e.g., workerName will be replaced with actual worker name)
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                        <FormField
                          control={form.control}
                          name="template"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contract Template Content</FormLabel>
                              <FormControl>
                                <Textarea 
                                  className="min-h-[400px] font-mono text-sm"
                                  placeholder={`EMPLOYMENT AGREEMENT

This Employment Agreement is entered into between {{businessName}} ("Company") and {{workerName}} ("Employee").

1. POSITION AND DUTIES
The Employee agrees to serve as {{contractTitle}} and to perform the duties and responsibilities as assigned.

2. TERM OF EMPLOYMENT
This agreement shall commence on {{startDate}} and ${editingTemplate?.employmentType === 'fixed_term' ? 'shall terminate on {{endDate}}' : 'shall continue until terminated'}.

3. COMPENSATION
The Employee shall receive compensation in the amount of {{currency}} {{salaryAmount}} per ${editingTemplate?.employmentType === 'contractor' ? 'hour/day' : 'annum'}.

4. TERMINATION
[Termination clauses specific to country and employment type]

Use variables from the helper panel on the right to customize your template.`}
                                  {...field} 
                                  data-testid="textarea-template-content"
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                Use double curly braces for variables: {`{{variableName}}`}. Click variables from the helper panel to copy them.
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* Right Column: Variable Helper */}
                      <div className="lg:col-span-1">
                        <VariableHelper 
                          onVariableSelect={(variable) => {
                            const currentValue = form.getValues('template');
                            const textarea = document.querySelector('[data-testid="textarea-template-content"]') as HTMLTextAreaElement;
                            if (textarea) {
                              const cursorPosition = textarea.selectionStart;
                              const newValue = currentValue.slice(0, cursorPosition) + variable + currentValue.slice(cursorPosition);
                              form.setValue('template', newValue);
                              // Set cursor position after the inserted variable
                              setTimeout(() => {
                                textarea.setSelectionRange(cursorPosition + variable.length, cursorPosition + variable.length);
                                textarea.focus();
                              }, 0);
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 lg:col-span-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsTemplateDialogOpen(false);
                          setEditingTemplate(null);
                          form.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saveTemplateMutation.isPending}>
                        {saveTemplateMutation.isPending 
                          ? (editingTemplate ? "Updating..." : "Creating...") 
                          : (editingTemplate ? "Update Template" : "Create Template")
                        }
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Templates Grid */}
          {isLoadingTemplates ? (
            <div className="animate-pulse space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-48 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates?.map((template: ContractTemplate) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg leading-tight">
                          {template.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {getEmploymentTypeBadge(template.employmentType)}
                          {!template.isActive && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Country:</span>
                        <span className="font-medium">
                          {template.country?.name || (
                            <Badge variant="secondary" className="text-xs">
                              Global Template
                            </Badge>
                          )}
                        </span>
                      </div>
                      
                      {template.uploadedByUser && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Created by:</span>
                          <span className="font-medium">
                            {template.uploadedByUser.firstName} {template.uploadedByUser.lastName}
                          </span>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(template.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {templates?.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <CardTitle className="text-xl mb-2">No Contract Templates</CardTitle>
                <CardDescription className="mb-4">
                  Create your first contract template to enable contract generation for different countries and employment types.
                </CardDescription>
                <Button onClick={() => setIsTemplateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Template
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="email-templates" className="space-y-6">
          {/* Email Templates Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">Email Template Management</h2>
              <p className="text-muted-foreground">
                Manage email templates for automated communications across the platform
              </p>
            </div>
          </div>

          {/* Email Template Definitions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Email Template Definitions
              </CardTitle>
              <CardDescription>
                All 12 email types used across the SDP Global Pay platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingEmailDefinitions ? (
                <div className="animate-pulse space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="h-32 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : (emailDefinitions?.length ?? 0) > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {emailDefinitions!.map((definition: any) => (
                    <Card key={definition.key} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base leading-tight">
                          {definition.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs w-fit">
                          {definition.key}
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {definition.description}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          <strong>Screen:</strong> {definition.triggeredFromScreen}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <strong>Category:</strong> {definition.category}
                        </div>
                        {definition.allowedVariables && definition.allowedVariables.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <strong>Variables:</strong> {definition.allowedVariables.join(', ')}
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              setEditingEmailTemplate(definition);
                              setIsEmailTemplateDialogOpen(true);
                            }}
                          >
                            <Edit className="mr-1 h-3 w-3" />
                            Edit Template
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const sampleHtml = getEmailTemplatePreview(definition.key);
                              setPreviewEmailHtml(sampleHtml);
                              setIsEmailPreviewOpen(true);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No email template definitions found. Please run the seeding script.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Global Email Settings
              </CardTitle>
              <CardDescription>
                Configure global email behavior and defaults
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="default-from-name">Default From Name</Label>
                  <Input id="default-from-name" defaultValue="SDP Global Pay" disabled />
                </div>
                <div>
                  <Label htmlFor="default-from-email">Default From Email</Label>
                  <Input id="default-from-email" defaultValue="onboard@sdpglobalpay.com" disabled />
                </div>
                <div>
                  <Label htmlFor="reply-to-email">Reply-To Email</Label>
                  <Input id="reply-to-email" defaultValue="support@sdpglobalpay.com" disabled />
                </div>
                <div>
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input id="support-email" defaultValue="support@sdpglobalpay.com" disabled />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => toast({ title: "Settings Saved", description: "Email settings have been updated successfully." })}>Update Settings</Button>
              </div>
            </CardContent>
          </Card>

          {/* Template Testing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Template Testing & Preview
              </CardTitle>
              <CardDescription>
                Test email templates with sample data and send test emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="test-template">Template Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template to test" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="welcome_after_signup">Welcome Email</SelectItem>
                      <SelectItem value="email_verification">Email Verification</SelectItem>
                      <SelectItem value="invoice_approved">Invoice Approved</SelectItem>
                      <SelectItem value="contract_ready">Contract Ready</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="test-email">Test Email Address</Label>
                  <Input id="test-email" type="email" placeholder="your@email.com" />
                </div>
                <div className="flex items-end">
                  <Button className="w-full">Send Test Email</Button>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Preview Area</h4>
                <p className="text-sm text-muted-foreground">
                  Select a template above to see a live preview with sample data
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Template Editing Dialog */}
        <Dialog open={isEmailTemplateDialogOpen} onOpenChange={(open) => {
          setIsEmailTemplateDialogOpen(open);
          if (!open) {
            setEditingEmailTemplate(null);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Edit Email Template: {editingEmailTemplate?.name}
              </DialogTitle>
              <DialogDescription>
                Customize the email template content, subject, and settings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email-subject">Email Subject</Label>
                  <Input 
                    id="email-subject" 
                    placeholder="Enter email subject..."
                    defaultValue={`${editingEmailTemplate?.name} - SDP Global Pay`}
                  />
                </div>
                <div>
                  <Label htmlFor="email-from">From Name</Label>
                  <Input 
                    id="email-from" 
                    defaultValue="SDP Global Pay"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email-content">Email Content (HTML)</Label>
                <Textarea 
                  id="email-content"
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Enter email HTML content..."
                  defaultValue={editingEmailTemplate ? getEmailTemplateContent(editingEmailTemplate.key) : ''}
                />
              </div>

              {editingEmailTemplate?.allowedVariables && (
                <div>
                  <Label>Available Variables</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingEmailTemplate.allowedVariables.map((variable: string) => (
                      <Badge key={variable} variant="secondary" className="cursor-pointer">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Click on any variable above to copy it. Use double curly braces in your template.
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEmailTemplateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    toast({ 
                      title: "Template Saved", 
                      description: `${editingEmailTemplate?.name} template has been updated successfully.` 
                    });
                    setIsEmailTemplateDialogOpen(false);
                  }}
                >
                  Save Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Email Preview Dialog */}
        <Dialog open={isEmailPreviewOpen} onOpenChange={setIsEmailPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
              <DialogDescription>
                This is how the email will appear to recipients
              </DialogDescription>
            </DialogHeader>
            
            <div className="border rounded-lg overflow-hidden">
              <div 
                dangerouslySetInnerHTML={{ __html: previewEmailHtml }}
                style={{ backgroundColor: '#f9fafb', padding: '20px' }}
              />
            </div>
            
            <div className="flex justify-end">
              <Button onClick={() => setIsEmailPreviewOpen(false)}>
                Close Preview
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <TabsContent value="jurisdiction-data" className="space-y-6">
          {/* Jurisdiction Data Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">Jurisdiction Data Management</h2>
              <p className="text-muted-foreground">
                Manage employment cost calculation rules for different countries and states/provinces
              </p>
            </div>
            <Button onClick={() => handleOpenJurisdictionDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Jurisdiction Rule
            </Button>
          </div>

          {/* Country Filter */}
          <div className="flex items-center gap-4">
            <Label htmlFor="countryFilter">Filter by Country:</Label>
            <Select value={jurisdictionCountryFilter} onValueChange={setJurisdictionCountryFilter}>
              <SelectTrigger id="countryFilter" className="w-64" data-testid="select-jurisdiction-filter">
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="au">Australia</SelectItem>
                <SelectItem value="nz">New Zealand</SelectItem>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
                <SelectItem value="sg">Singapore</SelectItem>
                <SelectItem value="ie">Ireland</SelectItem>
                <SelectItem value="in">India</SelectItem>
                <SelectItem value="ph">Philippines</SelectItem>
                <SelectItem value="ca">Canada</SelectItem>
                <SelectItem value="jp">Japan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Jurisdictions List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Jurisdiction Rules
                {jurisdictionCountryFilter !== 'all' && (
                  <Badge variant="secondary" className="ml-2">
                    Filtered
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Employment cost calculation rules by country and state/province
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingJurisdictions ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (jurisdictions?.length ?? 0) > 0 ? (
                (() => {
                  const filteredJurisdictions = jurisdictions!.filter((j: any) =>
                    jurisdictionCountryFilter === 'all' || j.countryId === jurisdictionCountryFilter
                  );
                  
                  return filteredJurisdictions.length > 0 ? (
                    <div className="space-y-4">
                      {filteredJurisdictions.map((jurisdiction: any) => (
                        <div key={jurisdiction.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {jurisdiction.countryId}
                              </Badge>
                              <span className="font-medium">{jurisdiction.stateProvince}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900">{jurisdiction.name}</p>
                            <p className="text-xs text-gray-500">{jurisdiction.note}</p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              <span>Type: {jurisdiction.calculationType}</span>
                              {jurisdiction.value && <span>Value: {jurisdiction.value}%</span>}
                              {jurisdiction.capAmount && <span>Cap: ${jurisdiction.capAmount}</span>}
                              {jurisdiction.thresholdAmount && <span>Threshold: ${jurisdiction.thresholdAmount}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenJurisdictionDialog(jurisdiction)}
                              data-testid={`button-edit-jurisdiction-${jurisdiction.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteJurisdiction(jurisdiction.id)}
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-delete-jurisdiction-${jurisdiction.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Filter className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Rules for Selected Country</h3>
                      <p className="text-muted-foreground mb-4">
                        No jurisdiction rules found for the selected country filter
                      </p>
                      <Button variant="outline" onClick={() => setJurisdictionCountryFilter('all')}>
                        Clear Filter
                      </Button>
                    </div>
                  );
                })()
                
              ) : (
                <div className="text-center py-12">
                  <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Jurisdiction Rules</h3>
                  <p className="text-muted-foreground mb-4">
                    Create jurisdiction rules to power the employment cost calculator
                  </p>
                  <Button onClick={() => handleOpenJurisdictionDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Rule
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Configure global system settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">System settings panel coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Jurisdiction Dialog */}
      <Dialog open={isJurisdictionDialogOpen} onOpenChange={setIsJurisdictionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedJurisdiction ? 'Edit Jurisdiction Rule' : 'Add Jurisdiction Rule'}
            </DialogTitle>
            <DialogDescription>
              {selectedJurisdiction ? 'Update the jurisdiction calculation rule.' : 'Create a new jurisdiction calculation rule.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="countryId">Country</Label>
                <Select 
                  value={jurisdictionForm.countryId} 
                  onValueChange={(value) => setJurisdictionForm({...jurisdictionForm, countryId: value})}
                >
                  <SelectTrigger id="countryId" data-testid="select-jurisdiction-country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="au">Australia</SelectItem>
                    <SelectItem value="nz">New Zealand</SelectItem>
                    <SelectItem value="us">United States</SelectItem>
                    <SelectItem value="uk">United Kingdom</SelectItem>
                    <SelectItem value="sg">Singapore</SelectItem>
                    <SelectItem value="ie">Ireland</SelectItem>
                    <SelectItem value="in">India</SelectItem>
                    <SelectItem value="ph">Philippines</SelectItem>
                    <SelectItem value="ca">Canada</SelectItem>
                    <SelectItem value="jp">Japan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="stateProvince">State/Province</Label>
                <Input
                  id="stateProvince"
                  placeholder="e.g., New South Wales"
                  defaultValue={selectedJurisdiction?.stateProvince || ''}
                  data-testid="input-jurisdiction-state"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                placeholder="e.g., Payroll tax (NSW)"
                defaultValue={selectedJurisdiction?.name || ''}
                data-testid="input-jurisdiction-name"
              />
            </div>
            <div>
              <Label htmlFor="calculationType">Calculation Type</Label>
              <Select 
                value={jurisdictionForm.calculationType}
                onValueChange={(value) => setJurisdictionForm({...jurisdictionForm, calculationType: value})}
              >
                <SelectTrigger data-testid="select-jurisdiction-type">
                  <SelectValue placeholder="Select calculation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Amount</SelectItem>
                  <SelectItem value="percent">Percentage</SelectItem>
                  <SelectItem value="percent_with_cap">Percentage with Cap</SelectItem>
                  <SelectItem value="percent_above_threshold">Percentage Above Threshold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="value">Value (%)</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  placeholder="5.45"
                  defaultValue={selectedJurisdiction?.value || ''}
                  data-testid="input-jurisdiction-value"
                />
              </div>
              <div>
                <Label htmlFor="capAmount">Cap Amount</Label>
                <Input
                  id="capAmount"
                  type="number"
                  placeholder="7000"
                  defaultValue={selectedJurisdiction?.capAmount || ''}
                  data-testid="input-jurisdiction-cap"
                />
              </div>
              <div>
                <Label htmlFor="thresholdAmount">Threshold</Label>
                <Input
                  id="thresholdAmount"
                  type="number"
                  placeholder="1000000"
                  defaultValue={selectedJurisdiction?.thresholdAmount || ''}
                  data-testid="input-jurisdiction-threshold"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                placeholder="Example: 5.45% above A$1m — edit to current"
                defaultValue={selectedJurisdiction?.note || ''}
                data-testid="input-jurisdiction-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsJurisdictionDialogOpen(false);
              setSelectedJurisdiction(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveJurisdiction}
              disabled={saveJurisdictionMutation.isPending}
              data-testid="button-save-jurisdiction"
            >
              {saveJurisdictionMutation.isPending 
                ? 'Saving...' 
                : (selectedJurisdiction ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}