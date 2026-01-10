import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Calculator, DollarSign, TrendingUp, Home, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface MortgageInput {
  propertyPrice: number;
  monthlyIncome: number;
  monthlyDebt: number;
  downPayment: number;
  employmentStatus: 'employed' | 'self-employed' | 'unemployed';
  employmentYears: number;
  creditScore?: number;
  isFirstProperty?: boolean;
  propertyCount?: number;
}

interface MortgageResult {
  eligibilityStatus: 'eligible' | 'conditional' | 'not-eligible';
  maxLoanAmount: number;
  monthlyPayment: number;
  debtToIncomeRatio: number;
  loanToValueRatio: number;
  interestRate: number;
  loanTerm: number;
  recommendations: string[];
  bankSuggestions: string[];
  issues?: string[];
}

interface MortgageEligibilityCheckerProps {
  propertyPrice?: number;
  propertyId?: string;
  onClose?: () => void;
}

export default function MortgageEligibilityChecker({ 
  propertyPrice: initialPropertyPrice, 
  propertyId,
  onClose 
}: MortgageEligibilityCheckerProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<MortgageInput>({
    propertyPrice: initialPropertyPrice || 0,
    monthlyIncome: 0,
    monthlyDebt: 0,
    downPayment: initialPropertyPrice ? Math.round(initialPropertyPrice * 0.1) : 0,
    employmentStatus: 'employed',
    employmentYears: 2,
    creditScore: undefined,
    isFirstProperty: true,
    propertyCount: 1,
  });
  
  const [result, setResult] = useState<MortgageResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const checkEligibilityMutation = useMutation({
    mutationFn: async (data: MortgageInput & { propertyId?: string }): Promise<MortgageResult> => {
      const response = await apiRequest("POST", "/api/mortgage/check", data);
      return await response.json();
    },
    onSuccess: (data: MortgageResult) => {
      setResult(data);
      toast({
        title: "Eligibility Check Complete",
        description: `Status: ${data.eligibilityStatus}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to check mortgage eligibility",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof MortgageInput, value: string | number | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate down payment percentage if property price changes
      if (field === 'propertyPrice' && typeof value === 'number') {
        updated.downPayment = Math.round(value * 0.1); // 10% default
      }
      
      return updated;
    });
  };

  const handleSubmit = () => {
    if (!formData.propertyPrice || !formData.monthlyIncome || !formData.downPayment) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    checkEligibilityMutation.mutate({
      ...formData,
      propertyId,
    });
  };

  const formatCurrency = (amount: number) => {
    return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'eligible':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'conditional':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'not-eligible':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Calculator className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'eligible':
        return 'bg-green-500';
      case 'conditional':
        return 'bg-yellow-500';
      case 'not-eligible':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Malaysian Mortgage Eligibility Calculator</CardTitle>
                <CardDescription>
                  Get instant pre-approval assessment based on Bank Negara Malaysia (BNM) guidelines
                </CardDescription>
              </div>
            </div>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="propertyPrice">Property Price (RM) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-sm text-gray-400">RM</span>
                <Input
                  id="propertyPrice"
                  type="number"
                  placeholder="500000"
                  value={formData.propertyPrice || ''}
                  onChange={(e) => handleInputChange('propertyPrice', Number(e.target.value))}
                  className="pl-12"
                  data-testid="input-property-price"
                />
              </div>
              <p className="text-xs text-gray-500">
                Example: RM500,000 (affects LTV ratio)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyIncome">Monthly Gross Income (RM) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-sm text-gray-400">RM</span>
                <Input
                  id="monthlyIncome"
                  type="number"
                  placeholder="8000"
                  value={formData.monthlyIncome || ''}
                  onChange={(e) => handleInputChange('monthlyIncome', Number(e.target.value))}
                  className="pl-12"
                  data-testid="input-monthly-income"
                />
              </div>
              <p className="text-xs text-gray-500">
                Before EPF, tax deductions (DSR limit: 70%)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="downPayment">Down Payment (RM) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-sm text-gray-400">RM</span>
                <Input
                  id="downPayment"
                  type="number"
                  placeholder="50000"
                  value={formData.downPayment || ''}
                  onChange={(e) => handleInputChange('downPayment', Number(e.target.value))}
                  className="pl-12"
                  data-testid="input-down-payment"
                />
              </div>
              {formData.propertyPrice > 0 && (
                <p className="text-sm text-gray-500">
                  {((formData.downPayment / formData.propertyPrice) * 100).toFixed(1)}% of property price
                  {formData.propertyPrice < 500000 && formData.downPayment >= formData.propertyPrice * 0.1 ? ' ✓ Min 10%' : ''}
                  {formData.propertyPrice >= 500000 && formData.downPayment >= formData.propertyPrice * 0.2 ? ' ✓ Min 20%' : ''}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyDebt">Existing Monthly Debt (RM)</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-sm text-gray-400">RM</span>
                <Input
                  id="monthlyDebt"
                  type="number"
                  placeholder="0"
                  value={formData.monthlyDebt || ''}
                  onChange={(e) => handleInputChange('monthlyDebt', Number(e.target.value))}
                  className="pl-12"
                  data-testid="input-monthly-debt"
                />
              </div>
              <p className="text-xs text-gray-500">
                Car loans, credit cards, personal loans, etc.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employmentStatus">Employment Status *</Label>
              <Select
                value={formData.employmentStatus}
                onValueChange={(value) => handleInputChange('employmentStatus', value)}
                data-testid="select-employment-status"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="self-employed">Self-Employed</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employmentYears">Years of Employment *</Label>
              <Input
                id="employmentYears"
                type="number"
                placeholder="2"
                value={formData.employmentYears || ''}
                onChange={(e) => handleInputChange('employmentYears', Number(e.target.value))}
                data-testid="input-employment-years"
              />
              <p className="text-xs text-gray-500">
                Minimum: 2 years (employed), 3 years (self-employed)
              </p>
            </div>
          </div>

          {/* Advanced Options */}
          <div>
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="mb-4"
              data-testid="button-advanced-options"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </Button>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="creditScore">CCRIS/CTOS Score (Optional)</Label>
                  <Input
                    id="creditScore"
                    type="number"
                    placeholder="750"
                    value={formData.creditScore || ''}
                    onChange={(e) => handleInputChange('creditScore', Number(e.target.value))}
                    data-testid="input-credit-score"
                  />
                  <p className="text-xs text-gray-500">Range: 300-850 (Higher is better)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="isFirstProperty">First Property?</Label>
                  <Select
                    value={formData.isFirstProperty ? 'yes' : 'no'}
                    onValueChange={(value) => handleInputChange('isFirstProperty', value === 'yes')}
                    data-testid="select-first-property"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes, First Property</SelectItem>
                      <SelectItem value="no">No, Not First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propertyCount">Number of Properties Owned</Label>
                  <Input
                    id="propertyCount"
                    type="number"
                    placeholder="1"
                    value={formData.propertyCount || ''}
                    onChange={(e) => handleInputChange('propertyCount', Number(e.target.value))}
                    data-testid="input-property-count"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Calculate Button */}
          {/* Malaysian Info Banner */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm">
              <strong>🇲🇾 Malaysian Mortgage Guidelines:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>DSR Limit: 70% (total debt ÷ income)</li>
                <li>LTV: Up to 90% (first property &lt; RM500k)</li>
                <li>Interest Rate: 4.6% - 6.5% (varies by bank & profile)</li>
                <li>Max Loan Term: 35 years</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleSubmit}
            disabled={checkEligibilityMutation.isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            data-testid="button-calculate-eligibility"
          >
            {checkEligibilityMutation.isPending ? 'Calculating...' : 'Check Eligibility Now'}
          </Button>

          {/* Results */}
          {result && (
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center gap-2">
                {getStatusIcon(result.eligibilityStatus)}
                <h3 className="text-lg font-semibold">Eligibility Result</h3>
                <Badge className={getStatusColor(result.eligibilityStatus)}>
                  {result.eligibilityStatus.toUpperCase()}
                </Badge>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Max Loan Amount</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {formatCurrency(result.maxLoanAmount)}
                  </p>
                </div>
                
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Monthly Payment</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(result.monthlyPayment)}
                  </p>
                </div>
                
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Interest Rate</p>
                  <p className="text-lg font-semibold text-yellow-600">
                    {result.interestRate.toFixed(2)}%
                  </p>
                </div>
                
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Debt Service Ratio</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {(result.debtToIncomeRatio * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Issues */}
              {result.issues && result.issues.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-semibold">Issues to Address:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {result.issues.map((issue, index) => (
                          <li key={index} className="text-sm">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Recommendations:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {result.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Separator />

              {/* Bank Suggestions */}
              {result.bankSuggestions.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Suggested Banks:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {result.bankSuggestions.map((bank, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-gray-50">
                        <p className="text-sm">{bank}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                <strong>⚠️ Disclaimer:</strong> This is an estimate based on Bank Negara Malaysia (BNM) guidelines and typical Malaysian bank requirements. 
                Actual approval, interest rates, and terms may vary by bank. Please consult with licensed mortgage advisors and banks for official applications.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}