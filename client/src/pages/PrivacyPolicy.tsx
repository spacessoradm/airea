import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Privacy Policy</h1>
          <p className="text-gray-600 mt-2">Last Updated: January 2025</p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-gray max-w-none">
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              Welcome to Airea. This Privacy Policy explains how we collect, use, disclose, and protect your personal information 
              in accordance with the Personal Data Protection Act 2010 (PDPA) of Malaysia and other applicable laws.
            </p>
            <p className="text-gray-600">
              By using our services, you consent to the collection and use of your information as described in this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">2.1 Personal Information</h3>
            <p className="text-gray-600 mb-2">We may collect the following personal information:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1 mb-4">
              <li>Name and contact details (email address, phone number)</li>
              <li>Account credentials and login information</li>
              <li>Property preferences and search history</li>
              <li>Communication records with our agents</li>
              <li>Transaction and inquiry history</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">2.2 Usage Information</h3>
            <p className="text-gray-600 mb-2">We automatically collect:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1 mb-4">
              <li>IP address and device information</li>
              <li>Browser type and version</li>
              <li>Pages visited and time spent on our platform</li>
              <li>Search queries and interactions with our AI features</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">2.3 Location Information</h3>
            <p className="text-gray-600">
              With your permission, we may collect precise location data to provide location-based property search results 
              and personalized recommendations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 mb-2">We use your personal information for the following purposes:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>To provide and improve our property search and listing services</li>
              <li>To personalize your experience with AI-powered recommendations</li>
              <li>To facilitate communication between you and property agents</li>
              <li>To send you relevant property updates and notifications</li>
              <li>To process transactions and maintain your account</li>
              <li>To comply with legal obligations and enforce our Terms and Conditions</li>
              <li>To analyze platform usage and improve our services</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">4.1 With Property Agents</h3>
            <p className="text-gray-600 mb-4">
              When you express interest in a property or contact an agent, we share your relevant contact information 
              with the respective property agent to facilitate communication.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">4.2 Service Providers</h3>
            <p className="text-gray-600 mb-4">
              We may share information with trusted third-party service providers who assist us in operating our platform, 
              including cloud hosting, payment processing, and analytics services.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">4.3 Legal Requirements</h3>
            <p className="text-gray-600 mb-4">
              We may disclose your information when required by Malaysian law or in response to valid requests by 
              government authorities, courts, or law enforcement agencies.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">4.4 Business Transfers</h3>
            <p className="text-gray-600">
              In the event of a merger, acquisition, or sale of assets, your personal information may be transferred 
              to the acquiring entity.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-600 mb-4">
              We implement appropriate technical and organizational measures to protect your personal information against 
              unauthorized access, loss, misuse, or alteration. These measures include:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1 mb-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Employee training on data protection</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights Under PDPA</h2>
            <p className="text-gray-600 mb-2">Under the Personal Data Protection Act 2010, you have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li><strong>Access:</strong> Request a copy of your personal information we hold</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Withdraw Consent:</strong> Withdraw your consent to the processing of your personal data</li>
              <li><strong>Limit Processing:</strong> Request limitation of processing in certain circumstances</li>
              <li><strong>Data Portability:</strong> Request transfer of your data to another service provider</li>
            </ul>
            <p className="text-gray-600">
              To exercise these rights, please contact us at <a href="mailto:privacy@airea.my" className="text-gray-900 underline">privacy@airea.my</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
            <p className="text-gray-600">
              We retain your personal information only for as long as necessary to fulfill the purposes outlined in this 
              Privacy Policy, unless a longer retention period is required by law. When your information is no longer needed, 
              we will securely delete or anonymize it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cookies and Tracking</h2>
            <p className="text-gray-600 mb-4">
              Our platform uses cookies and similar tracking technologies to enhance your experience. You can control 
              cookie preferences through your browser settings, though disabling cookies may affect platform functionality.
            </p>
            <p className="text-gray-600">
              We use cookies for session management, analytics, personalization, and security purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Third-Party Links</h2>
            <p className="text-gray-600">
              Our platform may contain links to third-party websites. We are not responsible for the privacy practices 
              of these external sites. We encourage you to review their privacy policies before providing any personal information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
            <p className="text-gray-600">
              Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal 
              information from children. If we become aware of such collection, we will take steps to delete the information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. International Data Transfers</h2>
            <p className="text-gray-600">
              Your information may be transferred to and processed in countries outside Malaysia. We ensure appropriate 
              safeguards are in place to protect your information in accordance with this Privacy Policy and Malaysian law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Updates to Privacy Policy</h2>
            <p className="text-gray-600">
              We may update this Privacy Policy from time to time. We will notify you of significant changes through 
              our platform or via email. The "Last Updated" date at the top indicates when the policy was last revised.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Information</h2>
            <p className="text-gray-600 mb-4">
              If you have questions, concerns, or complaints about this Privacy Policy or our data practices, please contact:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-900 font-semibold mb-2">Data Protection Officer</p>
              <p className="text-gray-600">Airea</p>
              <p className="text-gray-600">Level 10, Menara Airea</p>
              <p className="text-gray-600">Jalan Ampang, 50450 Kuala Lumpur</p>
              <p className="text-gray-600">Malaysia</p>
              <p className="text-gray-600 mt-2">Email: <a href="mailto:privacy@airea.my" className="text-gray-900 underline">privacy@airea.my</a></p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Complaints</h2>
            <p className="text-gray-600">
              If you are not satisfied with our response to your privacy concerns, you have the right to lodge a complaint 
              with the Personal Data Protection Commissioner of Malaysia.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
