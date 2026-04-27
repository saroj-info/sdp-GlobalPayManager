import { Resend } from 'resend';
import { storage } from './storage';

// Initialize Resend with API key from environment variables (only if available)
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private defaultFrom: string;
  private lastEmailAudit: any = null;

  constructor() {
    // Use EMAIL_FROM environment variable or default to Resend's onboarding email
    // Resend's onboarding@resend.dev requires no domain verification and works immediately
    const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    this.defaultFrom = `SDP Global Pay <${emailFrom}>`;
    
    // Log the effective email configuration on startup
    console.log(`📧 Email Service Configuration:`);
    console.log(`   Default From: ${this.defaultFrom}`);
    console.log(`   Domain: ${emailFrom.split('@')[1]}`);
    if (emailFrom.includes('resend.dev')) {
      console.log(`   Using Resend's onboarding email (no verification needed) ✅`);
    } else {
      console.log(`   Using custom domain - ensure it's verified in Resend dashboard`);
    }
  }

  // Database template rendering with fallback to hardcoded templates
  private async renderEmailFromDatabase(
    templateKey: string,
    variables: Record<string, any>,
    options?: { locale?: string; scopeType?: string; scopeId?: string }
  ): Promise<EmailTemplate | null> {
    try {
      const rendered = await storage.renderEmailTemplate(templateKey, variables, options);
      if (rendered) {
        return {
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        };
      }
    } catch (error) {
      console.warn(`⚠️ Failed to render template from database for key "${templateKey}":`, error);
      console.log(`   Falling back to hardcoded template...`);
    }
    return null;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!process.env.RESEND_API_KEY || !resend) {
      console.warn('RESEND_API_KEY not configured - email functionality disabled');
      return false;
    }

    try {
      const fromAddress = options.from || this.defaultFrom;
      
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: Array.isArray(options.to) ? options.to : [options.to],
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
        subject: options.subject,
        text: options.text || '',
        html: options.html,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
          contentType: att.contentType,
        })),
      });

      if (error) {
        console.error('Failed to send email:', error);
        return false;
      }

      console.log('Email sent successfully:', data?.id);
      
      // Track the email audit for diagnostics
      this.lastEmailAudit = {
        timestamp: new Date().toISOString(),
        from: fromAddress,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        domain: fromAddress.split('@')[1]?.split('>')[0],
        resendMessageId: data?.id,
        success: true
      };
      
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      
      // Track failed email audit for diagnostics
      const fromAddress = options.from || this.defaultFrom;
      this.lastEmailAudit = {
        timestamp: new Date().toISOString(),
        from: fromAddress,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        domain: fromAddress.split('@')[1]?.split('>')[0],
        error: error,
        success: false
      };
      
      return false;
    }
  }

  getLastEmailAudit() {
    return this.lastEmailAudit;
  }

  // Convenience methods for common email types
  async sendWelcomeEmail(to: string, workerName: string, businessName: string): Promise<boolean> {
    // Try database template first, fallback to hardcoded
    let template = await this.renderEmailFromDatabase('welcome_after_signup', {
      workerName,
      businessName,
    });
    
    if (!template) {
      template = getWelcomeEmailTemplate(workerName, businessName);
    }
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendInvoiceApprovedEmail(to: string, workerName: string, invoiceNumber: string, amount: string): Promise<boolean> {
    // Try database template first, fallback to hardcoded
    let template = await this.renderEmailFromDatabase('invoice_approved', {
      workerName,
      invoiceNumber,
      amount,
    });
    
    if (!template) {
      template = getInvoiceApprovedTemplate(workerName, invoiceNumber, amount);
    }
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendInvoiceRejectedEmail(to: string, workerName: string, invoiceNumber: string, reason: string): Promise<boolean> {
    // Try database template first, fallback to hardcoded
    let template = await this.renderEmailFromDatabase('invoice_rejected', {
      workerName,
      invoiceNumber,
      reason,
    });
    
    if (!template) {
      template = getInvoiceRejectedTemplate(workerName, invoiceNumber, reason);
    }
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendSdpInvoiceEmail(
    to: string, 
    businessName: string, 
    invoiceNumber: string, 
    amount: string, 
    currency: string, 
    dueDate: string,
    description: string,
    fromCountryName: string,
    viewLink?: string,
    stripePaymentLink?: string
  ): Promise<boolean> {
    // Try database template first, fallback to hardcoded
    let template = await this.renderEmailFromDatabase('sdp_invoice', {
      businessName,
      invoiceNumber,
      amount,
      currency,
      dueDate,
      description,
      fromCountryName,
      viewLink,
      stripePaymentLink,
    });
    
    if (!template) {
      template = getSdpInvoiceTemplate(
        businessName, 
        invoiceNumber, 
        amount, 
        currency, 
        dueDate, 
        description, 
        fromCountryName,
        viewLink,
        stripePaymentLink
      );
    }
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendContractReadyEmail(to: string, workerName: string, businessName: string, contractType: string): Promise<boolean> {
    // Try database template first, fallback to hardcoded
    let template = await this.renderEmailFromDatabase('contract_ready', {
      workerName,
      businessName,
      contractType,
    });
    
    if (!template) {
      template = getContractReadyTemplate(workerName, businessName, contractType);
    }
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendContractRequestEmail(to: string, businessName: string, workerName: string, contractType: string, roleName: string, requestorName: string): Promise<boolean> {
    // Try database template first, fallback to hardcoded
    let template = await this.renderEmailFromDatabase('contract_request_submitted', {
      businessName,
      workerName,
      contractType,
      roleName,
      requestorName,
    });
    
    if (!template) {
      template = getContractRequestTemplate(businessName, workerName, contractType, roleName, requestorName);
    }
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendReportEmail(options: {
    to: string[];
    subject?: string;
    message?: string;
    reportData: any[];
    reportType: string;
    format: string;
  }): Promise<boolean> {
    const template = getReportEmailTemplate(options.message, options.reportType, options.format);
    
    // Generate the report file content
    let attachmentContent: Buffer;
    let filename: string;
    let contentType: string;
    
    if (options.format === 'xlsx') {
      const XLSX = require('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(options.reportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, options.reportType);
      
      attachmentContent = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      filename = `${options.reportType}-report.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (options.format === 'pdf') {
      // For PDF, we'll use pdfkit which is Node.js compatible
      const PDFDocument = require('pdfkit');
      
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      
      // Capture PDF content in memory
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      
      // Create PDF content
      doc.fontSize(20);
      doc.text(`${options.reportType.toUpperCase()} Report`, 50, 50);
      doc.moveDown();
      
      if (options.reportData.length > 0) {
        doc.fontSize(12);
        
        // Add table headers
        const columns = Object.keys(options.reportData[0]);
        let currentY = doc.y + 20;
        
        // Simple table implementation
        columns.forEach((col, i) => {
          doc.text(col, 50 + (i * 100), currentY, { width: 100 });
        });
        
        currentY += 20;
        
        // Add data rows (limit to prevent oversized PDFs)
        const maxRows = Math.min(options.reportData.length, 50);
        for (let row = 0; row < maxRows; row++) {
          const rowData = options.reportData[row];
          columns.forEach((col, i) => {
            const value = rowData[col] || '';
            doc.text(String(value).substring(0, 15), 50 + (i * 100), currentY, { width: 100 });
          });
          currentY += 15;
          
          // Add new page if needed
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }
        }
        
        if (options.reportData.length > maxRows) {
          doc.text(`... and ${options.reportData.length - maxRows} more rows`, 50, currentY);
        }
      }
      
      // End the document and wait for completion
      await new Promise<void>((resolve) => {
        doc.on('end', resolve);
        doc.end();
      });
      
      attachmentContent = Buffer.concat(chunks);
      filename = `${options.reportType}-report.pdf`;
      contentType = 'application/pdf';
    } else {
      throw new Error(`Unsupported format: ${options.format}`);
    }
    
    return this.sendEmail({
      to: options.to,
      subject: options.subject || template.subject,
      html: template.html,
      text: template.text,
      attachments: [{
        filename,
        content: attachmentContent,
        contentType,
      }],
    });
  }

  async sendSdpUserInvite(to: string, inviteToken: string, invitedByName: string, sdpRole: string): Promise<boolean> {
    const template = getSdpUserInviteTemplate(inviteToken, invitedByName, sdpRole);
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendBusinessUserInvite(to: string, inviteToken: string, invitedByName: string, businessName: string): Promise<boolean> {
    const template = getBusinessUserInviteTemplate(inviteToken, invitedByName, businessName);
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendHostClientCredentialsEmail(to: string, firstName: string, businessName: string, tempPassword: string): Promise<boolean> {
    const loginLink = `${getEmailBaseUrl()}/login`;
    const safeName = firstName?.trim() || 'there';
    return this.sendEmail({
      to,
      subject: `Your SDP Global Pay account for ${businessName} is ready`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome, ${safeName}!</h2>
          <p>An account has been created for you on SDP Global Pay so that <strong>${businessName}</strong> can review and approve work performed for your business.</p>
          <p>You can sign in with the following temporary credentials:</p>
          <div style="background:#f3f4f6;padding:12px 16px;border-radius:6px;margin:12px 0;font-family:monospace;">
            <div><strong>Email:</strong> ${to}</div>
            <div><strong>Temporary password:</strong> ${tempPassword}</div>
          </div>
          <p>Please log in and change your password from <em>Settings → Change Password</em> as soon as possible.</p>
          <a href="${loginLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Log in to SDP Global Pay</a>
          <p style="margin-top:16px;color:#6b7280;font-size:14px;">If you did not expect this, you can safely ignore this email.</p>
        </div>
      `,
      text: `Welcome ${safeName}!\n\nAn account has been created for you on SDP Global Pay for ${businessName}.\n\nEmail: ${to}\nTemporary password: ${tempPassword}\n\nLog in: ${loginLink}\n\nPlease change your password after first login from Settings > Change Password.`,
    });
  }

  async sendWorkerInvitationEmail(to: string, firstName: string, inviteToken: string, businessName: string): Promise<boolean> {
    const signupLink = `${getEmailBaseUrl()}/signup?token=${inviteToken}&accountType=contractor`;
    return this.sendEmail({
      to,
      subject: `You've been invited to join ${businessName} on SDP Global Pay`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome, ${firstName}!</h2>
          <p>${businessName} has added you to SDP Global Pay.</p>
          <p>Please click the button below to set up your account and complete onboarding:</p>
          <a href="${signupLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Set Up My Account</a>
          <p style="margin-top:16px;color:#6b7280;font-size:14px;">This invitation link expires in 72 hours.</p>
          <p style="color:#6b7280;font-size:14px;">If you did not expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
      text: `Welcome ${firstName}!\n\n${businessName} has added you to SDP Global Pay.\n\nSet up your account here: ${signupLink}\n\nThis link expires in 72 hours.`,
    });
  }

  async sendBusinessRegistrationConfirmation(to: string, firstName: string, accountType: string): Promise<boolean> {
    const template = getBusinessRegistrationTemplate(firstName, accountType);
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendContractorRegistrationConfirmation(to: string, firstName: string, lastName?: string, phoneNumber?: string): Promise<boolean> {
    const template = getContractorRegistrationTemplate(firstName, lastName, to, phoneNumber);
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendEmailVerification(to: string, firstName: string, verificationToken: string): Promise<boolean> {
    // Try database template first, fallback to hardcoded
    let template = await this.renderEmailFromDatabase('email_verification', {
      firstName,
      verificationToken,
      verificationLink: `${getEmailBaseUrl()}/api/verify-email/${verificationToken}`,
    });
    
    if (!template) {
      template = getEmailVerificationTemplate(firstName, verificationToken);
    }
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendPasswordResetEmail(to: string, firstName: string, resetLink: string): Promise<boolean> {
    // Try database template first, fallback to hardcoded
    let template = await this.renderEmailFromDatabase('password_reset', {
      firstName,
      resetLink,
    });
    
    if (!template) {
      template = getPasswordResetTemplate(firstName, resetLink);
    }
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendSalaryContractNotification(contract: any, business: any, worker: any): Promise<boolean> {
    const notifyEmail = process.env.SDP_NOTIFY_EMAIL || 'onboard@sdpglobalpay.com';
    const workerName = `${worker.firstName || ''} ${worker.lastName || ''}`.trim();
    const businessName = business?.name || 'Unknown Business';
    const packageAmount = contract.totalPackageValue || contract.rate || '0';
    const currency = contract.currency || 'USD';
    const startDate = contract.startDate ? new Date(contract.startDate).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not specified';
    const employmentType = (contract.employmentType || '').replace(/_/g, ' ');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>New Salary Contract Requires Pay Breakdown</title></head>
<body style="font-family: Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background-color: #1e3a5f; padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px;">SDP Global Pay</h1>
      <p style="color: #93c5fd; margin: 8px 0 0 0; font-size: 14px;">Internal Notification</p>
    </div>
    <div style="padding: 32px 40px;">
      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <strong style="color: #92400e;">Action Required:</strong>
        <span style="color: #92400e;"> A new salary contract has been submitted and requires SDP to allocate the pay breakdown into remuneration lines and configure billing lines before the contract can be issued.</span>
      </div>
      <h2 style="color: #1e3a5f; font-size: 18px; margin: 0 0 20px 0;">New Salary Contract Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;">Worker</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${workerName}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Worker Email</td><td style="padding: 8px 0; color: #111827; font-size: 14px;">${worker.email || 'N/A'}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Country</td><td style="padding: 8px 0; color: #111827; font-size: 14px;">${worker.country || 'N/A'}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Business</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${businessName}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Employment Type</td><td style="padding: 8px 0; color: #111827; font-size: 14px; text-transform: capitalize;">${employmentType}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Total Annual Package (CTC)</td><td style="padding: 8px 0; color: #059669; font-size: 16px; font-weight: 700;">${currency} ${parseFloat(packageAmount).toLocaleString()}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Contract Start Date</td><td style="padding: 8px 0; color: #111827; font-size: 14px;">${startDate}</td></tr>
      </table>
      <div style="margin-top: 24px; padding: 16px; background-color: #f3f4f6; border-radius: 6px;">
        <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Next Steps:</strong></p>
        <ol style="margin: 8px 0 0 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.6;">
          <li>Log into the SDP Admin platform and locate this contract.</li>
          <li>Review the total package value and allocate the breakdown across remuneration lines (base salary, allowances, superannuation/pension).</li>
          <li>Configure the SDP billing lines (management fee, employer contributions, etc.).</li>
          <li>Move the contract from <em>Pending SDP Review</em> to <em>Ready to Issue</em> once complete.</li>
        </ol>
      </div>
    </div>
    <div style="background-color: #f3f4f6; padding: 16px 40px; text-align: center;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">SDP Global Pay — Internal Notification System</p>
    </div>
  </div>
</body>
</html>`;

    const text = `New Salary Contract Requires Pay Breakdown\n\nWorker: ${workerName}\nBusiness: ${businessName}\nTotal Package: ${currency} ${parseFloat(packageAmount).toLocaleString()}\nStart Date: ${startDate}\n\nPlease log into SDP Admin to allocate remuneration and billing lines.`;

    return this.sendEmail({
      to: notifyEmail,
      subject: `New Salary Contract Requires Pay Breakdown — ${workerName} at ${businessName}`,
      html,
      text,
    });
  }

  async sendContractSigningEmail(to: string, workerName: string, businessName: string, contractType: string, signingLink: string): Promise<boolean> {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Contract Ready for Signing</title></head>
<body style="font-family: Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background-color: #1e3a5f; padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px;">SDP Global Pay</h1>
      <p style="color: #93c5fd; margin: 8px 0 0 0; font-size: 14px;">Contract Signing</p>
    </div>
    <div style="padding: 32px 40px;">
      <p style="color: #111827; font-size: 16px; margin: 0 0 16px 0;">Hello ${workerName},</p>
      <p style="color: #374151; font-size: 14px; line-height: 1.6;">Your <strong>${contractType}</strong> contract with <strong>${businessName}</strong> is ready for your review and signature.</p>
      <p style="color: #374151; font-size: 14px; line-height: 1.6;">Please click the button below to review the contract details and sign electronically.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${signingLink}" style="display: inline-block; background-color: #1e3a5f; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600;">Review & Sign Contract</a>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">If the button above doesn't work, copy and paste this link into your browser:</p>
      <p style="color: #2563eb; font-size: 13px; word-break: break-all;">${signingLink}</p>
      <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-radius: 6px;">
        <p style="margin: 0; color: #92400e; font-size: 13px;"><strong>Important:</strong> This signing link is unique to you. Do not share it with anyone else. By signing, you agree to the terms outlined in the contract.</p>
      </div>
    </div>
    <div style="background-color: #f3f4f6; padding: 16px 40px; text-align: center;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">SDP Global Pay — Global Workforce Management</p>
    </div>
  </div>
</body>
</html>`;

    const text = `Hello ${workerName},\n\nYour ${contractType} contract with ${businessName} is ready for signing.\n\nPlease visit the following link to review and sign:\n${signingLink}\n\nThis link is unique to you — do not share it.\n\nSDP Global Pay`;

    return this.sendEmail({
      to,
      subject: `Action Required: Sign Your ${contractType} Contract with ${businessName}`,
      html,
      text,
    });
  }

  async testConnection(): Promise<boolean> {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return false;
    }

    try {
      // Test with a simple API call to verify the key
      const { error } = await resend!.domains.list();
      if (error) {
        console.error('Resend connection test failed:', error);
        return false;
      }
      console.log('Resend connection verified');
      return true;
    } catch (error) {
      console.error('Resend connection test failed:', error);
      return false;
    }
  }
}

// Email template functions for SDP Global Pay communications
// These will be used once an email provider is configured

export function getWelcomeEmailTemplate(workerName: string, businessName: string): EmailTemplate {
  return {
    subject: 'Welcome to SDP Global Pay - Your Onboarding is Complete',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: #1e40af; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: bold;">Welcome to SDP Global Pay</h1>
          <p style="color: #bfdbfe !important; margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">Global Contracting Made Easy</p>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e40af; margin-bottom: 20px; font-weight: bold;">Hello ${workerName},</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Congratulations! Your onboarding with <strong>${businessName}</strong> through SDP Global Pay has been completed successfully.
          </p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0; font-weight: bold;">What's Next?</h3>
            <ul style="color: #374151; line-height: 1.6;">
              <li>Access your dashboard to view contracts and submit timesheets</li>
              <li>Upload invoices and track payment status</li>
              <li>Manage your personal and business information</li>
              <li>Submit leave requests when needed</li>
            </ul>
          </div>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
              <td align="center">
                <a href="${getEmailBaseUrl()}/dashboard" 
                   style="display: inline-block; background-color: #1e40af; color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Access Your Dashboard
                </a>
              </td>
            </tr>
          </table>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If you have any questions, please don't hesitate to contact our support team.
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">© 2025 SDP Global Pay. Making global contracting and employment easy.</p>
        </div>
      </div>
    `,
    text: `Welcome to SDP Global Pay, ${workerName}!\n\nYour onboarding with ${businessName} has been completed successfully.\n\nYou can now access your dashboard at: ${getEmailBaseUrl()}/dashboard\n\nBest regards,\nSDP Global Pay Team`
  };
}

export function getInvoiceApprovedTemplate(workerName: string, invoiceNumber: string, amount: string): EmailTemplate {
  return {
    subject: `Invoice ${invoiceNumber} Approved - Payment Processing`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: #059669; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: bold;">Invoice Approved</h1>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #059669; margin-bottom: 20px; font-weight: bold;">Great news, ${workerName}!</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Your invoice <strong>#${invoiceNumber}</strong> for <strong>${amount}</strong> has been approved and is now being processed for payment.
          </p>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
            <p style="color: #374151; margin: 0;">
              <strong>Payment Timeline:</strong> Payments are typically processed within 3-5 business days after approval.
            </p>
          </div>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
              <td align="center">
                <a href="${getEmailBaseUrl()}/invoices" 
                   style="display: inline-block; background-color: #059669; color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  View Invoice Details
                </a>
              </td>
            </tr>
          </table>
        </div>
      </div>
    `,
    text: `Invoice Approved - ${workerName}\n\nYour invoice #${invoiceNumber} for ${amount} has been approved and is being processed for payment.\n\nView details: ${getEmailBaseUrl()}/invoices`
  };
}

export function getInvoiceRejectedTemplate(workerName: string, invoiceNumber: string, reason: string): EmailTemplate {
  return {
    subject: `Invoice ${invoiceNumber} Requires Attention`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: #dc2626; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: bold;">Invoice Review Required</h1>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #dc2626; margin-bottom: 20px; font-weight: bold;">Hello ${workerName},</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Your invoice <strong>#${invoiceNumber}</strong> requires some adjustments before it can be processed.
          </p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
            <p style="color: #374151; margin: 0;">
              <strong>Reason:</strong> ${reason}
            </p>
          </div>
          
          <p style="color: #374151; line-height: 1.6;">
            Please review and resubmit your invoice with the necessary corrections.
          </p>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
              <td align="center">
                <a href="${getEmailBaseUrl()}/invoices" 
                   style="display: inline-block; background-color: #dc2626; color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Review Invoice
                </a>
              </td>
            </tr>
          </table>
        </div>
      </div>
    `,
    text: `Invoice Review Required - ${workerName}\n\nYour invoice #${invoiceNumber} requires adjustments.\n\nReason: ${reason}\n\nReview: ${getEmailBaseUrl()}/invoices`
  };
}

export function getSdpInvoiceTemplate(
  businessName: string, 
  invoiceNumber: string, 
  amount: string, 
  currency: string, 
  dueDate: string,
  description: string,
  fromCountryName: string,
  viewLink?: string,
  stripePaymentLink?: string
): EmailTemplate {
  const viewInvoiceButton = viewLink
    ? `<a href="${viewLink}" style="display: inline-block; background-color: #1e40af; color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; margin-right: 10px;">View Invoice</a>`
    : `<a href="${getEmailBaseUrl()}/dashboard" style="display: inline-block; background-color: #1e40af; color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; margin-right: 10px;">View Invoice Online</a>`;
  
  const payNowButton = stripePaymentLink
    ? `<a href="${stripePaymentLink}" style="display: inline-block; background-color: #059669; color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Pay Now</a>`
    : `<a href="${getEmailBaseUrl()}/invoices" style="display: inline-block; background-color: #059669; color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Make Payment</a>`;

  return {
    subject: `SDP Global Pay Invoice ${invoiceNumber} - ${businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: #1e40af; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: bold;">SDP Global Pay</h1>
          <p style="color: #e5e7eb !important; margin: 10px 0 0 0; font-size: 16px;">Employment Services Invoice</p>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e40af; margin-bottom: 20px; font-weight: bold;">Invoice ${invoiceNumber}</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Dear ${businessName} Team,
          </p>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Please find your invoice for employment services provided by SDP Global Pay ${fromCountryName}.
          </p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Invoice Details</h3>
            <table style="width: 100%; color: #374151;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; font-weight: bold;">Invoice Number:</td>
                <td style="padding: 8px 0;">${invoiceNumber}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; font-weight: bold;">Amount:</td>
                <td style="padding: 8px 0; font-size: 18px; font-weight: bold; color: #1e40af;">${amount} ${currency}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; font-weight: bold;">Due Date:</td>
                <td style="padding: 8px 0;">${dueDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Services:</td>
                <td style="padding: 8px 0;">${description}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
            <p style="color: #374151; margin: 0;">
              <strong>Payment Instructions:</strong> Please remit payment by the due date to avoid any service interruptions.${stripePaymentLink ? ' Click <strong>Pay Now</strong> below to pay securely online — no account required.' : ' You can pay online through your SDP Global Pay dashboard or contact us for alternative payment methods.'}
            </p>
          </div>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
              <td align="center">
                ${viewInvoiceButton}
                ${payNowButton}
              </td>
            </tr>
          </table>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            For any questions regarding this invoice, please contact our billing team at billing@sdpglobalpay.com or through your dashboard.
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">© 2025 SDP Global Pay. Making global contracting and employment easy.</p>
          <p style="margin: 5px 0 0 0;">This invoice was generated automatically. Please do not reply to this email.</p>
        </div>
      </div>
    `,
    text: `SDP Global Pay Invoice ${invoiceNumber}

Dear ${businessName} Team,

Please find your invoice for employment services provided by SDP Global Pay ${fromCountryName}.

Invoice Details:
- Invoice Number: ${invoiceNumber}
- Amount: ${amount} ${currency}
- Due Date: ${dueDate}
- Services: ${description}

${viewLink ? `View invoice: ${viewLink}` : `View invoice online: ${getEmailBaseUrl()}/dashboard`}
${stripePaymentLink ? `Pay now: ${stripePaymentLink}` : `Make payment: ${getEmailBaseUrl()}/invoices`}

For questions, contact: billing@sdpglobalpay.com

© 2025 SDP Global Pay. Making global contracting and employment easy.`
  };
}

export function getContractReadyTemplate(workerName: string, businessName: string, contractType: string): EmailTemplate {
  return {
    subject: 'Your Contract is Ready for Review',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: #1e40af; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: bold;">Contract Ready</h1>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e40af; margin-bottom: 20px; font-weight: bold;">Hello ${workerName},</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Your ${contractType} contract with <strong>${businessName}</strong> has been prepared and is ready for your review and signature.
          </p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0; font-weight: bold;">Next Steps:</h3>
            <ol style="color: #374151; line-height: 1.6;">
              <li>Review the contract terms carefully</li>
              <li>Contact us if you have any questions</li>
              <li>Sign the contract electronically</li>
              <li>Begin working once the contract is executed</li>
            </ol>
          </div>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
              <td align="center">
                <a href="${getEmailBaseUrl()}/contracts" 
                   style="display: inline-block; background-color: #1e40af; color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Review Contract
                </a>
              </td>
            </tr>
          </table>
        </div>
      </div>
    `,
    text: `Contract Ready - ${workerName}\n\nYour ${contractType} contract with ${businessName} is ready for review.\n\nReview: ${getEmailBaseUrl()}/contracts`
  };
}

export function getContractRequestTemplate(businessName: string, workerName: string, contractType: string, roleName: string, requestorName: string): EmailTemplate {
  return {
    subject: 'New Contract Request Submitted',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: #f59e0b; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: bold;">Contract Request Submitted</h1>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #f59e0b; margin-bottom: 20px; font-weight: bold;">SDP Team,</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            A new contract request has been submitted by <strong>${requestorName}</strong> from <strong>${businessName}</strong> and requires your review.
          </p>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin-top: 0; font-weight: bold;">Contract Details:</h3>
            <ul style="color: #92400e; line-height: 1.6; margin-bottom: 0;">
              <li><strong>Worker:</strong> ${workerName}</li>
              <li><strong>Business:</strong> ${businessName}</li>
              <li><strong>Role:</strong> ${roleName}</li>
              <li><strong>Employment Type:</strong> ${contractType}</li>
              <li><strong>Requested by:</strong> ${requestorName}</li>
            </ul>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #f59e0b; margin-top: 0; font-weight: bold;">Required Actions:</h3>
            <ol style="color: #374151; line-height: 1.6;">
              <li>Review the contract request details</li>
              <li>Select appropriate contract template</li>
              <li>Add SDP Pay structuring if required</li>
              <li>Generate and issue the contract</li>
            </ol>
          </div>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
              <td align="center">
                <a href="${getEmailBaseUrl()}/contracts" 
                   style="display: inline-block; background-color: #f59e0b; color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Review Contract Requests
                </a>
              </td>
            </tr>
          </table>
        </div>
      </div>
    `,
    text: `New Contract Request - SDP Team\n\nA contract request from ${businessName} requires your review.\n\nWorker: ${workerName}\nRole: ${roleName}\nType: ${contractType}\nRequested by: ${requestorName}\n\nReview: ${getEmailBaseUrl()}/contracts`
  };
}

export function getSdpUserInviteTemplate(inviteToken: string, invitedByName: string, sdpRole: string): EmailTemplate {
  const roleDisplayNames: Record<string, string> = {
    'sdp_super_admin': 'Super Administrator',
    'sdp_admin': 'Administrator', 
    'sdp_agent': 'Agent'
  };
  
  const roleDisplayName = roleDisplayNames[sdpRole] || sdpRole;
  const inviteUrl = `${getEmailBaseUrl()}/invite/${inviteToken}`;
  
  return {
    subject: 'Invitation to Join SDP Global Pay Team',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with solid background for Outlook compatibility -->
        <div style="background-color: #7c3aed; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: bold;">Team Invitation</h1>
          <p style="color: #e9d5ff !important; margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">Join the SDP Global Pay Team</p>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #7c3aed; margin-bottom: 20px; font-weight: bold;">You're Invited!</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            <strong>${invitedByName}</strong> has invited you to join the SDP Global Pay team as a <strong>${roleDisplayName}</strong>.
          </p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #7c3aed; margin-top: 0; font-weight: bold;">Your Role:</h3>
            <p style="color: #374151; margin: 0; font-weight: bold;">${roleDisplayName}</p>
          </div>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Click the button below to accept your invitation and set up your account:
          </p>
          
          <!-- Button with table for Outlook compatibility -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
              <td align="center">
                <a href="${inviteUrl}" 
                   style="display: inline-block; background-color: #7c3aed; color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Accept Invitation
                </a>
              </td>
            </tr>
          </table>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; line-height: 1.5;">
            This invitation link will expire in 48 hours. If you have any questions, please contact your administrator.
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">© 2025 SDP Global Pay. Making global contracting and employment easy.</p>
        </div>
      </div>
    `,
    text: `Team Invitation - SDP Global Pay\n\n${invitedByName} has invited you to join the SDP Global Pay team as a ${roleDisplayName}.\n\nAccept your invitation: ${inviteUrl}\n\nThis link expires in 48 hours.\n\nBest regards,\nSDP Global Pay Team`
  };
}

export function getBusinessUserInviteTemplate(inviteToken: string, invitedByName: string, businessName: string): EmailTemplate {
  const inviteUrl = `${getEmailBaseUrl()}/invite/business/${inviteToken}`;
  
  return {
    subject: `Invitation to Join ${businessName} on SDP Global Pay`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with solid background for Outlook compatibility -->
        <div style="background-color: #1e40af; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: bold;">Business Invitation</h1>
          <p style="color: #bfdbfe !important; margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">Join ${businessName} on SDP Global Pay</p>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e40af; margin-bottom: 20px; font-weight: bold;">You're Invited!</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            <strong>${invitedByName}</strong> has invited you to join <strong>${businessName}</strong> on SDP Global Pay, the world's leading global employment and contractor management platform.
          </p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0; font-weight: bold;">What You'll Get Access To:</h3>
            <ul style="color: #374151; line-height: 1.6; margin: 10px 0;">
              <li>Manage global contractors and employees</li>
              <li>View and approve timesheets and invoices</li>
              <li>Handle contracts and compliance</li>
              <li>Access payroll and payment systems</li>
              <li>Generate analytics and reports</li>
            </ul>
          </div>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Click the button below to accept your invitation and create your account:
          </p>
          
          <!-- Button with table for Outlook compatibility -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
              <td align="center">
                <a href="${inviteUrl}" 
                   style="display: inline-block; background-color: #1e40af; color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Accept Invitation
                </a>
              </td>
            </tr>
          </table>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; line-height: 1.5;">
            This invitation link will expire in 7 days. If you have any questions, please contact ${invitedByName} directly.
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">© 2025 SDP Global Pay. Making global contracting and employment easy.</p>
        </div>
      </div>
    `,
    text: `Business Invitation - ${businessName}\n\n${invitedByName} has invited you to join ${businessName} on SDP Global Pay.\n\nSDP Global Pay is the world's leading global employment and contractor management platform.\n\nAccept your invitation: ${inviteUrl}\n\nThis link expires in 7 days.\n\nBest regards,\n${invitedByName} and the SDP Global Pay Team`
  };
}

export function getBusinessRegistrationTemplate(firstName: string, accountType: string): EmailTemplate {
  const accountTypeText = accountType === 'enterprise' ? 'Business / Enterprise' : 'Agency / Recruiter';
  
  return {
    subject: 'Welcome to SDP Global Pay - Your Account is Ready',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with solid background for Outlook compatibility -->
        <div style="background-color: #1e40af; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: bold;">Welcome to SDP Global Pay</h1>
          <p style="color: #bfdbfe !important; margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">Global Employment Made Easy</p>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e40af; margin-bottom: 20px; font-weight: bold;">Hello ${firstName},</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Congratulations! Your <strong>${accountTypeText}</strong> account with SDP Global Pay has been successfully created.
          </p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0; font-weight: bold;">What You Can Do Now:</h3>
            <ul style="color: #374151; line-height: 1.6;">
              <li>Hire employees and contractors globally across 10+ countries</li>
              <li>Manage contracts, compliance, and payroll seamlessly</li>
              <li>Create and approve timesheets and invoices</li>
              <li>Access comprehensive analytics and reporting</li>
              <li>Ensure full legal compliance in each jurisdiction</li>
            </ul>
          </div>
          
          <!-- Button with table for Outlook compatibility -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
              <td align="center">
                <a href="${getEmailBaseUrl()}/dashboard" 
                   style="display: inline-block; background-color: #1e40af; color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Access Your Dashboard
                </a>
              </td>
            </tr>
          </table>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; line-height: 1.5;">
            Ready to get started? Our team is here to help you every step of the way. Contact us if you have any questions about hiring globally with SDP Global Pay.
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">© 2025 SDP Global Pay. Making global contracting and employment easy.</p>
        </div>
      </div>
    `,
    text: `Welcome to SDP Global Pay, ${firstName}!\n\nYour ${accountTypeText} account has been successfully created.\n\nYou can now hire employees and contractors globally, manage contracts and compliance, and access comprehensive analytics.\n\nAccess your dashboard: ${getEmailBaseUrl()}/dashboard\n\nBest regards,\nSDP Global Pay Team`
  };
}

export function getEmailBaseUrl(): string {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  } 

  return 'https://sdpglobalpay.com';
}

export function getContractorRegistrationTemplate(firstName: string, lastName?: string, email?: string, phoneNumber?: string): EmailTemplate {
  // Build signup URL with pre-filled parameters
  const baseUrl = getEmailBaseUrl();
  const params = new URLSearchParams();
  if (firstName) params.append('firstName', firstName);
  if (lastName) params.append('lastName', lastName);
  if (email) params.append('email', email);
  if (phoneNumber) params.append('phoneNumber', phoneNumber);
  params.append('accountType', 'contractor');
  const signupUrl = `${baseUrl}/signup?${params.toString()}`;

  return {
    subject: 'Welcome to SDP Global Pay - Start Your Global Journey',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with solid background color for Outlook compatibility -->
        <div style="background-color: #059669; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: bold;">Welcome to SDP Global Pay</h1>
          <p style="color: #ffffff !important; margin: 10px 0 0 0; font-size: 16px; font-weight: 500; opacity: 0.9;">Your Gateway to Global Opportunities</p>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #059669; margin-bottom: 20px;">Hello ${firstName},</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Welcome to SDP Global Pay! Your contractor account has been successfully created and you're now ready to access global opportunities.
          </p>
          
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #059669; margin-top: 0;">Your Contractor Benefits:</h3>
            <ul style="color: #374151; line-height: 1.6;">
              <li>Access to global employment opportunities</li>
              <li>Streamlined contract and compliance management</li>
              <li>Easy timesheet submission and invoice tracking</li>
              <li>Secure and timely payments</li>
              <li>Professional support in multiple countries</li>
            </ul>
          </div>
          
          <!-- Button using table structure for better email client support -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
            <tr>
              <td align="center">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="background-color: #059669; border-radius: 6px;">
                      <a href="${signupUrl}" 
                         style="background-color: #059669; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; font-family: Arial, sans-serif;">
                        Get Started - Create Account
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; line-height: 1.6;">
            Complete your profile to start receiving contract opportunities from businesses worldwide. We're here to support your global contracting journey!
          </p>
        </div>
        
        <!-- Footer with dark text on light background -->
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center;">
          <p style="color: #6b7280 !important; font-size: 12px; margin: 0;">© 2025 SDP Global Pay. Making global contracting and employment easy.</p>
        </div>
      </div>
    `,
    text: `Welcome to SDP Global Pay, ${firstName}!\n\nYour contractor account has been successfully created.\n\nAccess global opportunities, streamlined contracts, easy timesheet submission, and secure payments.\n\nGet started - create your account: ${signupUrl}\n\nOnce registered, complete your profile to start receiving contract opportunities!\n\nBest regards,\nSDP Global Pay Team`
  };
}

// Business invitation template - when contractors invite businesses to register
export function getBusinessInvitationTemplate(contractorName: string, businessName: string, contractorMessage: string | null, invitationToken: string): EmailTemplate {
  return {
    subject: `${contractorName} has invited ${businessName} to join SDP Global Pay`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: #1e40af; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: bold;">You're Invited to SDP Global Pay</h1>
          <p style="color: #bfdbfe !important; margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">Global Employment Made Simple</p>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e40af; margin-bottom: 20px; font-weight: bold;">Hello ${businessName},</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            <strong>${contractorName}</strong> has indicated they would like to work with you and has invited you to register with <strong>SDP Global Pay</strong> to manage your global workforce easily.
          </p>
          
          ${contractorMessage ? `
          <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0; font-weight: bold;">Message from ${contractorName}:</h3>
            <p style="color: #374151; margin: 0; font-style: italic;">
              "${contractorMessage}"
            </p>
          </div>
          ` : ''}
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0; font-weight: bold;">Why Choose SDP Global Pay?</h3>
            <ul style="color: #374151; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Compliant employment across 10+ countries</li>
              <li>Automated contract generation and e-signatures</li>
              <li>Streamlined payroll and invoice management</li>
              <li>Transparent pricing with no setup fees</li>
              <li>24/7 support from our global team</li>
            </ul>
          </div>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
              <td align="center">
                <a href="${getEmailBaseUrl()}/invite/business/${invitationToken}" 
                   style="display: inline-block; background-color: #059669; color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Accept Invitation & Register
                </a>
              </td>
            </tr>
          </table>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            By registering through this invitation, you'll automatically be connected with ${contractorName} to begin your working relationship through SDP Global Pay.
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">© 2025 SDP Global Pay. Making global contracting and employment easy.</p>
        </div>
      </div>
    `,
    text: `You're Invited to SDP Global Pay\n\n${contractorName} has indicated they would like to work with you and has invited ${businessName} to register with SDP Global Pay.\n\n${contractorMessage ? `Message from ${contractorName}: "${contractorMessage}"\n\n` : ''}Accept your invitation: ${getEmailBaseUrl()}/invite/business/${invitationToken}\n\nWhy SDP Global Pay?\n- Compliant employment across 10+ countries\n- Automated contracts and e-signatures\n- Streamlined payroll and invoicing\n- Transparent pricing, no setup fees\n- 24/7 global support\n\nBest regards,\nSDP Global Pay Team`
  };
}

// Worker approval request template - when businesses register and workers need to approve the association
export function getWorkerApprovalRequestTemplate(workerName: string, businessName: string, businessContactEmail: string, approvalToken: string): EmailTemplate {
  return {
    subject: `${businessName} has registered - Approve to start working together`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: #059669; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: bold;">Great News!</h1>
          <p style="color: #d1fae5 !important; margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">Your Client Has Registered</p>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #059669; margin-bottom: 20px; font-weight: bold;">Hello ${workerName},</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Excellent news! <strong>${businessName}</strong> has successfully registered with SDP Global Pay using your invitation.
          </p>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
            <h3 style="color: #059669; margin-top: 0; font-weight: bold;">Next Step Required</h3>
            <p style="color: #374151; margin: 0;">
              To begin working with ${businessName}, please approve sharing your profile details with them. This will allow them to:
            </p>
            <ul style="color: #374151; line-height: 1.6; margin: 10px 0 0 20px;">
              <li>View your contact information and work history</li>
              <li>Create contracts and manage your employment</li>
              <li>Process payroll and payments</li>
            </ul>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #374151; margin: 0;"><strong>Business Contact:</strong> ${businessContactEmail}</p>
          </div>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
              <td align="center">
                <a href="${getEmailBaseUrl()}/api/worker-approval/${approvalToken}?action=approve" 
                   style="display: inline-block; background-color: #059669; color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Approve & Connect
                </a>
              </td>
            </tr>
          </table>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
            <a href="${getEmailBaseUrl()}/api/worker-approval/${approvalToken}?action=reject" 
               style="color: #dc2626; text-decoration: none; font-weight: bold;">
              Decline this invitation
            </a>
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Your approval connects you with ${businessName} for seamless contract management and payments through SDP Global Pay.
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">© 2025 SDP Global Pay. Making global contracting and employment easy.</p>
        </div>
      </div>
    `,
    text: `Great News! ${businessName} has registered with SDP Global Pay\n\nHello ${workerName},\n\n${businessName} has successfully registered using your invitation and would like to begin working with you.\n\nBusiness Contact: ${businessContactEmail}\n\nTo start working together, please approve sharing your details:\n\n✅ Approve: ${getEmailBaseUrl()}/api/worker-approval/${approvalToken}?action=approve\n\n❌ Decline: ${getEmailBaseUrl()}/api/worker-approval/${approvalToken}?action=reject\n\nBest regards,\nSDP Global Pay Team`
  };
}

export function getReportEmailTemplate(message?: string, reportType?: string, format?: string): EmailTemplate {
  const reportTypeDisplay = reportType?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Report';
  const formatDisplay = format?.toUpperCase() || 'File';
  
  return {
    subject: `SDP Global Pay ${reportTypeDisplay}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: #1e40af; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff !important; margin: 0; font-size: 28px; font-weight: bold;">SDP Global Pay Report</h1>
          <p style="color: #bfdbfe !important; margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">${reportTypeDisplay}</p>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e40af; margin-bottom: 20px; font-weight: bold;">Report Ready</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            ${message || `Your ${reportTypeDisplay} has been generated and is attached to this email.`}
          </p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0; font-weight: bold;">Report Details:</h3>
            <ul style="color: #374151; line-height: 1.6;">
              <li><strong>Type:</strong> ${reportTypeDisplay}</li>
              <li><strong>Format:</strong> ${formatDisplay} file</li>
              <li><strong>Generated:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            The report file is attached to this email. Please download and review the data as needed.
          </p>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
              <td align="center">
                <a href="${getEmailBaseUrl()}/reports" 
                   style="display: inline-block; background-color: #1e40af; color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Generate More Reports
                </a>
              </td>
            </tr>
          </table>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If you have any questions about this report, please contact our support team.
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">© 2025 SDP Global Pay. Making global contracting and employment easy.</p>
        </div>
      </div>
    `,
    text: `SDP Global Pay ${reportTypeDisplay}\n\n${message || `Your ${reportTypeDisplay} has been generated and is attached to this email.`}\n\nReport Details:\n- Type: ${reportTypeDisplay}\n- Format: ${formatDisplay} file\n- Generated: ${new Date().toLocaleString()}\n\nGenerate more reports: ${getEmailBaseUrl()}/reports\n\nBest regards,\nSDP Global Pay Team`
  };
}

// Email verification template
export function getEmailVerificationTemplate(firstName: string, verificationToken: string): EmailTemplate {
  const verificationUrl = `${getEmailBaseUrl()}/api/verify-email/${verificationToken}`;
  
  return {
    subject: 'Verify Your Email Address - SDP Global Pay',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <div style="background-color:#1e40af;padding:15px;text-align:center;">
      <h1 style="color:#ffffff !important;margin:0;font-size:24px;font-weight:bold;">SDP Global Pay</h1>
    </div>
    <div style="padding:0;">
      <h2 style="color:#1e40af;margin:0;padding:15px 15px 0 15px;font-size:18px;">Hello ${firstName},</h2>
      <p style="color:#374151;margin:0;padding:5px 15px;">Welcome to SDP Global Pay! Please verify your email:</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;">
        <tr>
          <td align="center" style="padding:15px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background-color:#059669;border-radius:4px;">
                  <a href="${verificationUrl}" style="background-color:#059669;color:#ffffff !important;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block;">Verify Email</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="color:#666;font-size:12px;margin:0;padding:0 15px 15px 15px;text-align:center;">
        Link expires in 24 hours. <a href="${verificationUrl}" style="color:#059669;">Click here if button doesn't work</a>
      </p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Verify Your Email Address - SDP Global Pay\n\nHello ${firstName},\n\nWelcome to SDP Global Pay! To complete your account setup and ensure secure communications, please verify your email address.\n\nVerify your email: ${verificationUrl}\n\nWhy verify your email?\n- Secure your account and protect your data\n- Receive important notifications about contracts and payments\n- Access all platform features without restrictions\n- Ensure smooth communication with clients and colleagues\n\nThis verification link will expire in 24 hours. If you didn't create an account with SDP Global Pay, please ignore this email.\n\nBest regards,\nSDP Global Pay Team`
  };
}

// Password reset template
export function getPasswordResetTemplate(firstName: string, resetLink: string): EmailTemplate {
  return {
    subject: 'Reset Your Password - SDP Global Pay',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <div style="background-color:#1e40af;padding:15px;text-align:center;">
      <h1 style="color:#ffffff !important;margin:0;font-size:24px;font-weight:bold;">SDP Global Pay</h1>
    </div>
    <div style="padding:0;">
      <h2 style="color:#1e40af;margin:0;padding:15px 15px 0 15px;font-size:18px;">Hello ${firstName},</h2>
      <p style="color:#374151;margin:0;padding:5px 15px;">We received a request to reset your password. Click the button below to create a new password:</p>
      <div style="text-align:center;padding:15px;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td style="background-color:#dc2626;border-radius:4px;">
              <a href="${resetLink}" style="background-color:#dc2626;color:#ffffff !important;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block;">Reset Password</a>
            </td>
          </tr>
        </table>
      </div>
      <p style="color:#666;font-size:12px;margin:0;padding:0 15px 15px 15px;text-align:center;">
        Link expires in 1 hour. If you didn't request this reset, please ignore this email. <a href="${resetLink}" style="color:#dc2626;">Click here if button doesn't work</a>
      </p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Reset Your Password - SDP Global Pay\n\nHello ${firstName},\n\nWe received a request to reset your password for your SDP Global Pay account.\n\nReset your password: ${resetLink}\n\nFor security:\n- This link will expire in 1 hour\n- If you didn't request this reset, please ignore this email\n- Your password will not change until you create a new one using this link\n\nNeed help? Contact our support team at support@sdpglobalpay.com\n\nBest regards,\nSDP Global Pay Team`
  };
}

// Export singleton instance
export const emailService = new EmailService();