import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateListingSimple() {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/agent/portal">
            <Button variant="outline">← Back to Portal</Button>
          </Link>
          <h1 className="text-2xl font-bold">Create New Listing - Test Page</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Step {step} of 9</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>Current Step: {step}</p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setStep(step > 1 ? step - 1 : 1)}
                  disabled={step === 1}
                >
                  Previous
                </Button>
                <Button 
                  onClick={() => setStep(step < 9 ? step + 1 : 9)}
                  disabled={step === 9}
                >
                  Next
                </Button>
              </div>
              
              {step === 5 && (
                <div className="p-4 bg-blue-50 rounded">
                  <h3 className="font-semibold mb-2">Step 5: Legal Information</h3>
                  <p>This step would contain the mandatory legal information fields:</p>
                  <ul className="list-disc ml-4 mt-2">
                    <li>Tenure (Freehold/Leasehold)</li>
                    <li>Title Type (Individual/Strata/Master)</li>
                    <li>Land Title Type (Residential/Commercial/Industrial/Agriculture)</li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}