import Header from "@/components/Header";
import { MortgageCalculator } from "@/components/MortgageCalculator";

export default function MortgageTools() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MortgageCalculator />
      </main>
    </div>
  );
}