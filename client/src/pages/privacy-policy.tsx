import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-primary-600 hover:underline text-sm">← Back to home</Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-6">Privacy Policy</h1>
        <Card>
          <CardContent className="p-6 prose max-w-none text-gray-700">
            <p className="text-sm text-gray-500">Last updated: April 7, 2026</p>
            <h2 className="text-xl font-semibold mt-6">1. Information We Collect</h2>
            <p>We collect information you provide directly, such as your name, email address, company details, country, and any data you submit through contracts, timesheets, and invoices.</p>
            <h2 className="text-xl font-semibold mt-6">2. How We Use Information</h2>
            <p>We use your information to provide and improve the Service, process payments and invoices, communicate with you, verify your identity, and comply with legal obligations.</p>
            <h2 className="text-xl font-semibold mt-6">3. Sharing of Information</h2>
            <p>We do not sell your personal information. We may share data with the parties involved in your contracts (e.g., businesses, contractors, host clients) and with service providers who help us operate the platform.</p>
            <h2 className="text-xl font-semibold mt-6">4. Data Security</h2>
            <p>We implement reasonable technical and organizational measures to protect your information. However, no method of transmission or storage is 100% secure.</p>
            <h2 className="text-xl font-semibold mt-6">5. Data Retention</h2>
            <p>We retain your information for as long as needed to provide the Service and comply with our legal obligations.</p>
            <h2 className="text-xl font-semibold mt-6">6. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to access, correct, or delete your personal information. Contact us to exercise these rights.</p>
            <h2 className="text-xl font-semibold mt-6">7. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes through the Service or via email.</p>
            <h2 className="text-xl font-semibold mt-6">8. Contact</h2>
            <p>For privacy-related questions, please contact us via the Contact page.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
