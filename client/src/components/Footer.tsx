import { Link } from "wouter";
// import { Calculator, DollarSign } from "lucide-react"; // Temporarily disabled with Tools section

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold mb-4 !text-gray-200">Airea</h3>
            <p className="!text-gray-500 mb-4 max-w-md">
              AI-driven real estate, tailored to you. Find your perfect property with our intelligent search and comprehensive market insights.
            </p>
            <p className="text-sm !text-gray-600">
              © 2025 Airea Enterprise 202503224882 (KT0597060-A). All rights reserved.
            </p>
          </div>
          
          {/* Tools - TEMPORARILY DISABLED - To reactivate: Uncomment the section below */}
          {/* 
          <div>
            <h4 className="text-lg font-semibold mb-4 !text-gray-300">Tools</h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/mortgage-calculator" 
                  className="!text-gray-500 hover:!text-gray-300 transition-colors cursor-pointer flex items-center"
                  data-testid="link-mortgage-calculator"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Mortgage Calculator
                </Link>
              </li>
              <li>
                <Link 
                  href="/loan-eligibility" 
                  className="!text-gray-500 hover:!text-gray-300 transition-colors cursor-pointer flex items-center"
                  data-testid="link-loan-eligibility"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Loan Eligibility
                </Link>
              </li>
            </ul>
          </div>
          */}
          
          {/* Support */}
          <div>
            <h4 className="text-lg font-semibold mb-4 !text-gray-300">Support</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/contact" className="!text-gray-500 hover:!text-gray-300 transition-colors" data-testid="link-contact">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="!text-gray-500 hover:!text-gray-300 transition-colors" data-testid="link-privacy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="!text-gray-500 hover:!text-gray-300 transition-colors" data-testid="link-terms">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-800 text-center">
          <p className="!text-gray-500 text-sm">
            Built with AI technology to revolutionize property search in Malaysia
          </p>
        </div>
      </div>
    </footer>
  );
}