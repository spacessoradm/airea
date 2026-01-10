import PropertySearchResults from '@/components/PropertySearchResults';

// Simple demo page to test PropertySearchResults with no results
export default function PropertySearchResultsDemo() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">PropertySearchResults Demo - No Results State</h1>
        
        {/* Test with no results to trigger the "Ask AI Assistant" button */}
        <PropertySearchResults 
          properties={[]}
          count={0}
          isLoading={false}
          searchLocation={{ lat: 3.139, lng: 101.6869, name: "Kuala Lumpur" }}
        />
      </div>
    </div>
  );
}