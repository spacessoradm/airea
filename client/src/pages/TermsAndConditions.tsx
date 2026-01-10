import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Terms and Conditions</h1>
          <p className="text-gray-600 mt-2">Last Updated: January 2025</p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-gray max-w-none">
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-4">
              By accessing and using Airea's platform and services, you accept and agree to be bound by these Terms and Conditions. 
              If you do not agree to these terms, please do not use our services.
            </p>
            <p className="text-gray-600">
              These terms constitute a legally binding agreement between you and Airea, operating in Malaysia.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Services Provided</h2>
            <p className="text-gray-600 mb-4">
              Airea provides an AI-powered property search and listing platform connecting property seekers with property agents 
              and owners in Malaysia. Our services include:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1 mb-4">
              <li>Property search with AI-powered natural language queries</li>
              <li>Property listings and detailed information</li>
              <li>Communication facilitation between users and agents</li>
              <li>Market insights and property analytics</li>
              <li>Agent portal for property listing management</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">3.1 Registration</h3>
            <p className="text-gray-600 mb-4">
              You may need to create an account to access certain features. You agree to provide accurate, current, and complete 
              information during registration and to update such information to keep it accurate.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">3.2 Account Security</h3>
            <p className="text-gray-600 mb-4">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities under 
              your account. Notify us immediately of any unauthorized use of your account.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">3.3 Account Termination</h3>
            <p className="text-gray-600">
              We reserve the right to suspend or terminate your account if you violate these terms or engage in fraudulent, 
              illegal, or harmful activities.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Conduct</h2>
            <p className="text-gray-600 mb-2">You agree not to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Use the platform for any illegal or unauthorized purpose</li>
              <li>Post false, misleading, or fraudulent property information</li>
              <li>Harass, abuse, or harm other users or agents</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Scrape, copy, or extract data from our platform using automated means</li>
              <li>Interfere with or disrupt the platform's functionality</li>
              <li>Impersonate any person or entity</li>
              <li>Upload malicious code or viruses</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Property Listings</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">5.1 For Agents</h3>
            <p className="text-gray-600 mb-4">
              Property agents using our platform must be licensed under Malaysian law and comply with all relevant regulations. 
              Agents are responsible for the accuracy and legality of their property listings.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">5.2 Listing Accuracy</h3>
            <p className="text-gray-600 mb-4">
              All property listings must be accurate, current, and not misleading. We reserve the right to remove listings 
              that violate our content policies or applicable laws.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">5.3 No Guarantee</h3>
            <p className="text-gray-600">
              We do not guarantee the availability, accuracy, or quality of listed properties. Users should conduct their own 
              due diligence before entering any property transaction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
            <p className="text-gray-600 mb-4">
              All content on Airea, including text, graphics, logos, software, and AI models, is the property of Airea or 
              its licensors and is protected by Malaysian and international intellectual property laws.
            </p>
            <p className="text-gray-600">
              You may not copy, modify, distribute, or create derivative works from our content without express written permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Third-Party Services</h2>
            <p className="text-gray-600 mb-4">
              Our platform may integrate with third-party services (e.g., mapping services, payment processors). Your use of 
              these services is subject to their respective terms and conditions.
            </p>
            <p className="text-gray-600">
              We are not responsible for the availability, accuracy, or functionality of third-party services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Disclaimers</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">8.1 No Warranty</h3>
            <p className="text-gray-600 mb-4">
              Our platform is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either express or implied. 
              We do not warrant that the platform will be uninterrupted, error-free, or secure.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">8.2 Property Transactions</h3>
            <p className="text-gray-600 mb-4">
              Airea is a platform connecting property seekers with agents. We are not a party to any property transactions and 
              do not provide real estate, legal, or financial advice. Consult appropriate professionals before making property decisions.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">8.3 AI Features</h3>
            <p className="text-gray-600">
              Our AI-powered search and recommendations are tools to assist your property search. Results may not be 100% accurate 
              and should be used as guidance, not definitive information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-600 mb-4">
              To the fullest extent permitted by Malaysian law, Airea shall not be liable for any indirect, incidental, special, 
              consequential, or punitive damages, including loss of profits, data, or goodwill, arising from:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1 mb-4">
              <li>Your use or inability to use the platform</li>
              <li>Any property transactions or disputes</li>
              <li>Unauthorized access to your data</li>
              <li>Errors or omissions in content</li>
              <li>Actions of third parties</li>
            </ul>
            <p className="text-gray-600">
              Our total liability shall not exceed the amount you paid to us (if any) in the 12 months preceding the claim.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Indemnification</h2>
            <p className="text-gray-600">
              You agree to indemnify and hold harmless Airea, its affiliates, and their respective officers, directors, employees, 
              and agents from any claims, losses, damages, liabilities, and expenses arising from your use of the platform, 
              violation of these terms, or infringement of any third-party rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Privacy</h2>
            <p className="text-gray-600">
              Your use of our platform is also governed by our <Link href="/privacy-policy" className="text-gray-900 underline">Privacy Policy</Link>, 
              which explains how we collect, use, and protect your personal information in accordance with the Personal Data Protection Act 2010 (PDPA).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Fees and Payments</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">12.1 User Fees</h3>
            <p className="text-gray-600 mb-4">
              Basic property search is free for users. Premium features, if any, may require payment. Fees will be clearly 
              communicated before purchase.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">12.2 Agent Fees</h3>
            <p className="text-gray-600 mb-4">
              Property agents may be subject to listing fees or subscription charges. Payment terms will be outlined in 
              separate agent agreements.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">12.3 Refund Policy</h3>
            <p className="text-gray-600">
              All fees are non-refundable unless otherwise specified in writing or required by Malaysian law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Termination</h2>
            <p className="text-gray-600 mb-4">
              We may suspend or terminate your access to our platform at any time, with or without cause or notice, including 
              for violation of these terms.
            </p>
            <p className="text-gray-600">
              You may terminate your account at any time by contacting us. Upon termination, your right to use the platform 
              ceases immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Governing Law and Dispute Resolution</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">14.1 Governing Law</h3>
            <p className="text-gray-600 mb-4">
              These Terms and Conditions shall be governed by and construed in accordance with the laws of Malaysia.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">14.2 Jurisdiction</h3>
            <p className="text-gray-600 mb-4">
              Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of Malaysia.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">14.3 Dispute Resolution</h3>
            <p className="text-gray-600">
              Before initiating legal proceedings, parties agree to attempt to resolve disputes through good faith negotiation 
              and, if necessary, mediation in accordance with Malaysian mediation practices.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Changes to Terms</h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon 
              posting on our platform. Your continued use of the platform after changes constitutes acceptance of the modified terms.
            </p>
            <p className="text-gray-600">
              We will notify users of significant changes via email or platform notification where practical.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Severability</h2>
            <p className="text-gray-600">
              If any provision of these terms is found to be invalid or unenforceable by a court, the remaining provisions 
              shall continue in full force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. Entire Agreement</h2>
            <p className="text-gray-600">
              These Terms and Conditions, together with our Privacy Policy, constitute the entire agreement between you and 
              Airea regarding the use of our platform and supersede all prior agreements and understandings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">18. Contact Information</h2>
            <p className="text-gray-600 mb-4">
              For questions or concerns about these Terms and Conditions, please contact us:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-900 font-semibold mb-2">Legal Department</p>
              <p className="text-gray-600">Airea</p>
              <p className="text-gray-600">Level 10, Menara Airea</p>
              <p className="text-gray-600">Jalan Ampang, 50450 Kuala Lumpur</p>
              <p className="text-gray-600">Malaysia</p>
              <p className="text-gray-600 mt-2">Email: <a href="mailto:legal@airea.my" className="text-gray-900 underline">legal@airea.my</a></p>
            </div>
          </section>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-8">
            <p className="text-sm text-gray-700">
              <strong>Important:</strong> By using Airea's platform, you acknowledge that you have read, understood, and agree 
              to be bound by these Terms and Conditions. If you do not agree, please discontinue use of our services immediately.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
