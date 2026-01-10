import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Calculator, Home, TrendingUp, Calendar } from "lucide-react";

interface MortgageResult {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  principalAmount: number;
}

export function MortgageCalculator() {
  const [propertyPrice, setPropertyPrice] = useState<string>("500000");
  const [downPayment, setDownPayment] = useState<number>(90000);
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(18);
  const [loanTerm, setLoanTerm] = useState<string>("30");
  const [interestRate, setInterestRate] = useState<string>("4.5");
  const [result, setResult] = useState<MortgageResult | null>(null);

  const calculateMortgage = () => {
    const price = parseFloat(propertyPrice);
    const principal = price - downPayment;
    const monthlyRate = parseFloat(interestRate) / 100 / 12;
    const numberOfPayments = parseInt(loanTerm) * 12;

    if (principal <= 0 || monthlyRate <= 0 || numberOfPayments <= 0) {
      return;
    }

    // Calculate monthly payment using mortgage formula
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    
    const totalPayment = monthlyPayment * numberOfPayments;
    const totalInterest = totalPayment - principal;

    setResult({
      monthlyPayment,
      totalInterest,
      totalPayment,
      principalAmount: principal
    });
  };

  const handleDownPaymentChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    const price = parseFloat(propertyPrice) || 0;
    
    setDownPayment(amount);
    if (price > 0) {
      setDownPaymentPercent(Math.round((amount / price) * 100));
    }
  };

  const handleDownPaymentPercentChange = (percent: number[]) => {
    const newPercent = percent[0];
    const price = parseFloat(propertyPrice) || 0;
    const amount = (price * newPercent) / 100;
    
    setDownPaymentPercent(newPercent);
    setDownPayment(amount);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto" data-testid="mortgage-calculator">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-6 h-6 text-primary" />
          Mortgage Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Calculate your monthly mortgage payments and see how different factors affect your loan.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="property-price">Property Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  RM
                </span>
                <Input
                  id="property-price"
                  type="number"
                  value={propertyPrice}
                  onChange={(e) => setPropertyPrice(e.target.value)}
                  className="pl-12"
                  placeholder="500,000"
                  data-testid="input-property-price"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Down Payment</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        RM
                      </span>
                      <Input
                        type="number"
                        value={downPayment}
                        onChange={(e) => handleDownPaymentChange(e.target.value)}
                        className="pl-12"
                        data-testid="input-down-payment"
                      />
                    </div>
                  </div>
                  <div className="w-20 text-center">
                    <span className="text-sm font-medium">{downPaymentPercent}%</span>
                  </div>
                </div>
                <div className="px-2">
                  <Slider
                    value={[downPaymentPercent]}
                    onValueChange={handleDownPaymentPercentChange}
                    max={50}
                    min={5}
                    step={1}
                    className="w-full"
                    data-testid="slider-down-payment"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>5%</span>
                    <span>50%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loan-term">Loan Term</Label>
                <Select value={loanTerm} onValueChange={setLoanTerm}>
                  <SelectTrigger data-testid="select-loan-term">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 years</SelectItem>
                    <SelectItem value="20">20 years</SelectItem>
                    <SelectItem value="25">25 years</SelectItem>
                    <SelectItem value="30">30 years</SelectItem>
                    <SelectItem value="35">35 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest-rate">Interest Rate</Label>
                <div className="relative">
                  <Input
                    id="interest-rate"
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="pr-8"
                    data-testid="input-interest-rate"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            </div>

            <Button 
              onClick={calculateMortgage} 
              className="w-full"
              size="lg"
              data-testid="button-calculate"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Calculate Monthly Payment
            </Button>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            {result ? (
              <>
                <div className="grid grid-cols-1 gap-4">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Home className="w-5 h-5 text-primary" />
                          <span className="font-medium">Monthly Payment</span>
                        </div>
                        <span className="text-2xl font-bold text-primary" data-testid="result-monthly-payment">
                          {formatCurrency(result.monthlyPayment)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Principal</span>
                          </div>
                          <span className="text-lg font-semibold" data-testid="result-principal">
                            {formatCurrency(result.principalAmount)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Total Interest</span>
                          </div>
                          <span className="text-lg font-semibold" data-testid="result-total-interest">
                            {formatCurrency(result.totalInterest)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Total Payment</span>
                        <span className="text-xl font-bold" data-testid="result-total-payment">
                          {formatCurrency(result.totalPayment)}
                        </span>
                      </div>
                      <Separator className="my-3" />
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Property Price:</span>
                          <span>{formatCurrency(parseFloat(propertyPrice))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Down Payment:</span>
                          <span>{formatCurrency(downPayment)} ({downPaymentPercent}%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Loan Amount:</span>
                          <span>{formatCurrency(result.principalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Interest Rate:</span>
                          <span>{interestRate}% per year</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Loan Term:</span>
                          <span>{loanTerm} years</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Info */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Important Notes</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• This calculator provides estimates only</li>
                      <li>• Actual rates may vary based on your credit profile</li>
                      <li>• Additional costs like insurance and taxes not included</li>
                      <li>• Consult with a financial advisor for personalized advice</li>
                    </ul>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="p-8 text-center">
                  <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Enter your loan details and click calculate to see your monthly payment breakdown.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}