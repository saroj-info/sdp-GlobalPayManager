import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-primary-600 hover:underline text-sm">← Back to home</Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-6">Terms of Service</h1>
        <Card>
          <CardContent className="p-6 prose max-w-none text-gray-700">
            <p className="text-sm text-gray-500">Last updated: April 7, 2026</p>
            <h2 className="text-xl font-semibold mt-6">1. Acceptance of Terms</h2>
            <p>By accessing or using SDP Global Pay ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
            <h2 className="text-xl font-semibold mt-6">2. Use of Service</h2>
            <p>You must use the Service in compliance with all applicable laws and regulations. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.</p>
            <h2 className="text-xl font-semibold mt-6">3. Accounts and Eligibility</h2>
            <p>You must provide accurate and complete information when creating an account, including a valid email address that you will verify before gaining full access.</p>
            <h2 className="text-xl font-semibold mt-6">4. Payments and Invoicing</h2>
            <p>Fees, commissions, and invoicing terms are governed by the contracts and billing arrangements configured within the platform between the relevant parties.</p>
            <h2 className="text-xl font-semibold mt-6">5. Termination</h2>
            <p>We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason at our sole discretion.</p>
            <h2 className="text-xl font-semibold mt-6">6. Limitation of Liability</h2>
            <p>The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, or consequential damages.</p>
            <h2 className="text-xl font-semibold mt-6">7. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
            <h2 className="text-xl font-semibold mt-6">8. Contact</h2>
            <p>For questions about these Terms, please contact us via the Contact page.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
