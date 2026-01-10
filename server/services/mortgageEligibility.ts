import { 
  type MortgageEligibilityCheck, 
  type InsertMortgageEligibilityCheckInput 
} from "@shared/schema";

// Malaysian mortgage calculation constants
const MORTGAGE_CONSTANTS = {
  // Maximum loan-to-value ratios by property value (Malaysia guidelines)
  MAX_LTV: {
    FIRST_PROPERTY_LOW: 0.9,   // Below RM500k (first property)
    FIRST_PROPERTY_HIGH: 0.8,  // RM500k and above (first property)
    SECOND_PROPERTY: 0.7,      // Second property onwards
    THIRD_PROPERTY: 0.6,       // Third property onwards
  },
  
  // Maximum debt-to-income ratio (Malaysia guidelines)
  MAX_DSR: 0.7, // 70% debt service ratio
  
  // Base interest rates (indicative, varies by bank)
  INTEREST_RATES: {
    EMPLOYED_GOOD_CREDIT: 4.6,      // Good credit, employed
    EMPLOYED_AVERAGE_CREDIT: 5.2,   // Average credit, employed
    SELF_EMPLOYED: 5.8,             // Self-employed
    HIGH_RISK: 6.5,                 // High risk applicants
  },
  
  // Property value thresholds
  PROPERTY_VALUE_THRESHOLD: 500000, // RM500k threshold for LTV calculation
  
  // Employment requirements
  MIN_EMPLOYMENT_YEARS: {
    EMPLOYED: 2,
    SELF_EMPLOYED: 3,
  },
  
  // Minimum down payment percentages
  MIN_DOWN_PAYMENT: {
    FIRST_PROPERTY: 0.1,  // 10% minimum for first property
    SUBSEQUENT: 0.3,      // 30% minimum for subsequent properties
  }
};

// Malaysian banks with their typical offerings
const MALAYSIAN_BANKS = [
  { name: "Maybank", specialization: "General lending, competitive rates" },
  { name: "CIMB Bank", specialization: "First-time buyers, flexible terms" },
  { name: "Public Bank", specialization: "Conservative lending, stable rates" },
  { name: "RHB Bank", specialization: "Young professionals, digital banking" },
  { name: "Hong Leong Bank", specialization: "Property investment, premium banking" },
  { name: "Alliance Bank", specialization: "SME owners, business banking" },
  { name: "AmBank", specialization: "Expatriate lending, foreign income" },
  { name: "Bank Rakyat", specialization: "Government servants, cooperative members" },
  { name: "OCBC Bank", specialization: "High-net-worth, luxury properties" },
  { name: "Standard Chartered", specialization: "Expat professionals, foreign currency" }
];

export interface MortgageEligibilityInput {
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

export interface MortgageEligibilityResult {
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

export class MortgageEligibilityService {
  
  /**
   * Calculate mortgage eligibility for a property
   */
  static calculateEligibility(input: MortgageEligibilityInput): MortgageEligibilityResult {
    const {
      propertyPrice,
      monthlyIncome,
      monthlyDebt,
      downPayment,
      employmentStatus,
      employmentYears,
      creditScore,
      isFirstProperty = true,
      propertyCount = 1
    } = input;

    // Determine interest rate based on employment and credit
    const interestRate = this.determineInterestRate(employmentStatus, creditScore);
    
    // Calculate loan amount
    const loanAmount = propertyPrice - downPayment;
    
    // Calculate loan-to-value ratio
    const ltvRatio = loanAmount / propertyPrice;
    
    // Calculate maximum allowable loan based on LTV limits
    const maxLtvRatio = this.getMaxLTV(propertyPrice, isFirstProperty, propertyCount);
    const maxLoanByLTV = propertyPrice * maxLtvRatio;
    
    // Calculate maximum loan based on income (DSR)
    const maxLoanByIncome = this.calculateMaxLoanByIncome(monthlyIncome, monthlyDebt, interestRate);
    
    // Final maximum loan is the lower of the two limits
    const maxLoanAmount = Math.min(maxLoanByLTV, maxLoanByIncome);
    
    // Calculate monthly payment for the requested loan
    const monthlyPayment = this.calculateMonthlyPayment(loanAmount, interestRate, 30);
    
    // Calculate debt-to-income ratio including new loan
    const totalMonthlyDebt = monthlyDebt + monthlyPayment;
    const debtToIncomeRatio = totalMonthlyDebt / monthlyIncome;
    
    // Determine eligibility status
    const eligibilityResult = this.determineEligibility({
      loanAmount,
      maxLoanAmount,
      ltvRatio,
      maxLtvRatio,
      debtToIncomeRatio,
      employmentStatus,
      employmentYears,
      downPayment,
      propertyPrice,
      creditScore
    });

    return {
      eligibilityStatus: eligibilityResult.status,
      maxLoanAmount,
      monthlyPayment,
      debtToIncomeRatio,
      loanToValueRatio: ltvRatio,
      interestRate,
      loanTerm: 30,
      recommendations: eligibilityResult.recommendations,
      bankSuggestions: this.suggestBanks(employmentStatus, creditScore, propertyPrice),
      issues: eligibilityResult.issues
    };
  }

  /**
   * Determine interest rate based on employment status and credit score
   */
  private static determineInterestRate(employmentStatus: string, creditScore?: number): number {
    const creditCategory = this.categorizeCreditScore(creditScore);
    
    if (employmentStatus === 'self-employed') {
      return MORTGAGE_CONSTANTS.INTEREST_RATES.SELF_EMPLOYED;
    }
    
    if (employmentStatus === 'unemployed') {
      return MORTGAGE_CONSTANTS.INTEREST_RATES.HIGH_RISK;
    }
    
    // For employed individuals
    switch (creditCategory) {
      case 'excellent':
      case 'good':
        return MORTGAGE_CONSTANTS.INTEREST_RATES.EMPLOYED_GOOD_CREDIT;
      case 'fair':
        return MORTGAGE_CONSTANTS.INTEREST_RATES.EMPLOYED_AVERAGE_CREDIT;
      case 'poor':
      default:
        return MORTGAGE_CONSTANTS.INTEREST_RATES.HIGH_RISK;
    }
  }

  /**
   * Categorize credit score
   */
  private static categorizeCreditScore(creditScore?: number): string {
    if (!creditScore) return 'unknown';
    
    if (creditScore >= 750) return 'excellent';
    if (creditScore >= 700) return 'good';
    if (creditScore >= 650) return 'fair';
    return 'poor';
  }

  /**
   * Get maximum LTV ratio based on property value and buyer status
   */
  private static getMaxLTV(propertyPrice: number, isFirstProperty: boolean, propertyCount: number): number {
    if (propertyCount >= 3) {
      return MORTGAGE_CONSTANTS.MAX_LTV.THIRD_PROPERTY;
    }
    
    if (propertyCount === 2) {
      return MORTGAGE_CONSTANTS.MAX_LTV.SECOND_PROPERTY;
    }
    
    // First property
    if (propertyPrice < MORTGAGE_CONSTANTS.PROPERTY_VALUE_THRESHOLD) {
      return MORTGAGE_CONSTANTS.MAX_LTV.FIRST_PROPERTY_LOW;
    } else {
      return MORTGAGE_CONSTANTS.MAX_LTV.FIRST_PROPERTY_HIGH;
    }
  }

  /**
   * Calculate maximum loan amount based on income and DSR
   */
  private static calculateMaxLoanByIncome(
    monthlyIncome: number, 
    existingMonthlyDebt: number, 
    interestRate: number
  ): number {
    const maxTotalDebt = monthlyIncome * MORTGAGE_CONSTANTS.MAX_DSR;
    const availableForMortgage = maxTotalDebt - existingMonthlyDebt;
    
    if (availableForMortgage <= 0) return 0;
    
    // Calculate loan amount that would result in this monthly payment
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = 30 * 12; // 30 years
    
    if (monthlyRate === 0) {
      return availableForMortgage * numPayments;
    }
    
    const loanAmount = availableForMortgage * (Math.pow(1 + monthlyRate, numPayments) - 1) / 
                     (monthlyRate * Math.pow(1 + monthlyRate, numPayments));
    
    return Math.max(0, loanAmount);
  }

  /**
   * Calculate monthly payment for a loan
   */
  private static calculateMonthlyPayment(loanAmount: number, annualRate: number, years: number): number {
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = years * 12;
    
    if (monthlyRate === 0) {
      return loanAmount / numPayments;
    }
    
    const monthlyPayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    return monthlyPayment;
  }

  /**
   * Determine overall eligibility status
   */
  private static determineEligibility(params: {
    loanAmount: number;
    maxLoanAmount: number;
    ltvRatio: number;
    maxLtvRatio: number;
    debtToIncomeRatio: number;
    employmentStatus: string;
    employmentYears: number;
    downPayment: number;
    propertyPrice: number;
    creditScore?: number;
  }) {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    const {
      loanAmount,
      maxLoanAmount,
      ltvRatio,
      maxLtvRatio,
      debtToIncomeRatio,
      employmentStatus,
      employmentYears,
      downPayment,
      propertyPrice,
      creditScore
    } = params;

    // Check employment requirements
    const minEmploymentYears = employmentStatus === 'self-employed' 
      ? MORTGAGE_CONSTANTS.MIN_EMPLOYMENT_YEARS.SELF_EMPLOYED
      : MORTGAGE_CONSTANTS.MIN_EMPLOYMENT_YEARS.EMPLOYED;
    
    if (employmentYears < minEmploymentYears) {
      issues.push(`Minimum ${minEmploymentYears} years employment required for ${employmentStatus} applicants`);
    }

    // Check DSR
    if (debtToIncomeRatio > MORTGAGE_CONSTANTS.MAX_DSR) {
      issues.push(`Debt service ratio of ${(debtToIncomeRatio * 100).toFixed(1)}% exceeds maximum 70%`);
      recommendations.push('Reduce existing debts or increase income to improve debt service ratio');
    }

    // Check LTV
    if (ltvRatio > maxLtvRatio) {
      issues.push(`Loan-to-value ratio of ${(ltvRatio * 100).toFixed(1)}% exceeds maximum ${(maxLtvRatio * 100).toFixed(1)}%`);
      const requiredDownPayment = propertyPrice * (1 - maxLtvRatio);
      recommendations.push(`Increase down payment to at least RM${requiredDownPayment.toLocaleString('en-MY')}`);
    }

    // Check if loan amount exceeds maximum
    if (loanAmount > maxLoanAmount) {
      issues.push(`Requested loan amount exceeds maximum eligible amount of RM${maxLoanAmount.toLocaleString('en-MY')}`);
    }

    // Add general recommendations
    if (!creditScore || creditScore < 700) {
      recommendations.push('Improve credit score for better interest rates');
    }

    if (downPayment < propertyPrice * 0.2) {
      recommendations.push('Consider increasing down payment to 20% for better loan terms');
    }

    // Determine status
    let status: 'eligible' | 'conditional' | 'not-eligible';
    
    if (employmentStatus === 'unemployed') {
      status = 'not-eligible';
      issues.push('Employment required for mortgage approval');
    } else if (issues.length === 0) {
      status = 'eligible';
    } else if (issues.length <= 2 && debtToIncomeRatio <= 0.8) {
      status = 'conditional';
      recommendations.push('Address the highlighted issues to improve eligibility');
    } else {
      status = 'not-eligible';
    }

    return { status, issues, recommendations };
  }

  /**
   * Suggest suitable banks based on applicant profile
   */
  private static suggestBanks(employmentStatus: string, creditScore?: number, propertyPrice?: number): string[] {
    const suggestions: string[] = [];
    
    // Default recommendations for different profiles
    if (employmentStatus === 'self-employed') {
      suggestions.push('Alliance Bank - Specializes in SME and business owners');
      suggestions.push('Hong Leong Bank - Flexible terms for entrepreneurs');
      suggestions.push('CIMB Bank - Good self-employed packages');
    } else if (creditScore && creditScore >= 750) {
      suggestions.push('Maybank - Competitive rates for excellent credit');
      suggestions.push('OCBC Bank - Premium banking benefits');
      suggestions.push('Public Bank - Stable rates for good credit');
    } else {
      suggestions.push('CIMB Bank - First-time buyer friendly');
      suggestions.push('RHB Bank - Young professional packages');
      suggestions.push('Maybank - General lending with good coverage');
    }

    // Add property-specific suggestions
    if (propertyPrice && propertyPrice > 1000000) {
      suggestions.push('Hong Leong Bank - Property investment specialist');
      suggestions.push('OCBC Bank - High-value property financing');
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  /**
   * Format currency for Malaysian Ringgit
   */
  static formatCurrency(amount: number): string {
    return `RM${amount.toLocaleString('en-MY', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })}`;
  }

  /**
   * Generate detailed eligibility report
   */
  static generateReport(result: MortgageEligibilityResult, input: MortgageEligibilityInput): string {
    const { propertyPrice, monthlyIncome, downPayment } = input;
    const loanAmount = propertyPrice - downPayment;
    
    let report = `MORTGAGE ELIGIBILITY ANALYSIS\n\n`;
    report += `Property Price: ${this.formatCurrency(propertyPrice)}\n`;
    report += `Down Payment: ${this.formatCurrency(downPayment)} (${((downPayment/propertyPrice)*100).toFixed(1)}%)\n`;
    report += `Loan Amount: ${this.formatCurrency(loanAmount)}\n`;
    report += `Monthly Income: ${this.formatCurrency(monthlyIncome)}\n\n`;
    
    report += `ELIGIBILITY STATUS: ${result.eligibilityStatus.toUpperCase()}\n\n`;
    
    report += `LOAN DETAILS:\n`;
    report += `- Maximum Loan: ${this.formatCurrency(result.maxLoanAmount)}\n`;
    report += `- Interest Rate: ${result.interestRate.toFixed(2)}% p.a.\n`;
    report += `- Monthly Payment: ${this.formatCurrency(result.monthlyPayment)}\n`;
    report += `- Loan Term: ${result.loanTerm} years\n`;
    report += `- Debt Service Ratio: ${(result.debtToIncomeRatio * 100).toFixed(1)}%\n`;
    report += `- Loan-to-Value: ${(result.loanToValueRatio * 100).toFixed(1)}%\n\n`;
    
    if (result.recommendations.length > 0) {
      report += `RECOMMENDATIONS:\n`;
      result.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
      report += `\n`;
    }
    
    if (result.bankSuggestions.length > 0) {
      report += `SUGGESTED BANKS:\n`;
      result.bankSuggestions.forEach((bank, index) => {
        report += `${index + 1}. ${bank}\n`;
      });
    }
    
    return report;
  }
}