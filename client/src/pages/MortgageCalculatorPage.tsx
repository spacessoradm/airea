import { useEffect } from "react";
import MortgageEligibilityChecker from "@/components/MortgageEligibilityChecker";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function MortgageCalculatorPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "Mortgage Calculator - Airea";
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        {/* Page Content */}
        <MortgageEligibilityChecker />
      </div>
    </div>
  );
}
