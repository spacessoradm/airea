import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { TransportProximitySearch } from "@/components/TransportProximitySearch";

export default function TransportProximitySearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="py-8">
        <TransportProximitySearch />
      </main>
      <Footer />
    </div>
  );
}