import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PropertyRecommendations from '@/components/PropertyRecommendations';

const AIRecommendationsPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <PropertyRecommendations />
      </main>
      <Footer />
    </div>
  );
};

export default AIRecommendationsPage;