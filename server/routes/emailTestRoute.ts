import type { Express } from "express";
import { emailService } from "../emailService";

export function registerEmailTestRoutes(app: Express) {
  // Test route for verifying Resend email service
  app.post('/api/test-email', async (req, res) => {
    try {
      const { to, type = 'welcome' } = req.body;
      
      if (!to) {
        return res.status(400).json({ error: 'Email address is required' });
      }

      let success = false;
      
      switch (type) {
        case 'welcome':
          success = await emailService.sendWelcomeEmail(to, 'Test User', 'SDP Global Pay');
          break;
          
        case 'invoice-approved':
          success = await emailService.sendInvoiceApprovedEmail(to, 'Test User', 'INV-001', 'AUD $1,500.00');
          break;
          
        case 'invoice-rejected':
          success = await emailService.sendInvoiceRejectedEmail(to, 'Test User', 'INV-001', 'Missing timesheet documentation');
          break;
          
        case 'contract-ready':
          success = await emailService.sendContractReadyEmail(to, 'Test User', 'SDP Global Pay', 'Contractor Agreement');
          break;
          
        case 'business-registration':
          success = await emailService.sendBusinessRegistrationConfirmation(to, 'Test User', 'enterprise');
          break;
          
        case 'contractor-registration':
          success = await emailService.sendContractorRegistrationConfirmation(to, 'Test User');
          break;
          
        default:
          return res.status(400).json({ error: 'Invalid email type' });
      }

      if (success) {
        res.json({ message: 'Test email sent successfully' });
      } else {
        res.status(500).json({ error: 'Failed to send test email' });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Test connection route
  app.get('/api/test-email-connection', async (req, res) => {
    try {
      const isConnected = await emailService.testConnection();
      res.json({ 
        connected: isConnected,
        provider: 'Resend',
        configured: !!process.env.RESEND_API_KEY
      });
    } catch (error) {
      console.error('Error testing email connection:', error);
      res.status(500).json({ error: 'Failed to test email connection' });
    }
  });
}