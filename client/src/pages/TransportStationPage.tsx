import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TransportStationSearch from '@/components/TransportStationSearch';

const TransportStationPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <TransportStationSearch />
      </main>
      <Footer />
    </div>
  );
};

export default TransportStationPage;