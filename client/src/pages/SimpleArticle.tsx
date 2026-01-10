import { useLocation, useRoute } from "wouter";
import { ArrowLeft, BookOpen } from "lucide-react";
import BottomNav from "@/components/BottomNav";

// Malaysian articles data - matches SimpleLanding
const malaysianArticles = [
  {
    id: 1,
    title: "2025 Malaysian Property Market Outlook: Key Trends and Predictions",
    category: "Insights",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop",
    excerpt: "Expert analysis on what's shaping the Malaysian property landscape in 2025",
    content: `
      <h2>Understanding Malaysia's Property Market in 2025</h2>
      <p>The Malaysian property market continues to evolve with several key trends shaping the landscape. From changing buyer preferences to new government initiatives, understanding these trends is crucial for both investors and homebuyers.</p>
      
      <h3>Key Trends to Watch</h3>
      <ul>
        <li><strong>Sustainable Development:</strong> Increasing demand for eco-friendly and sustainable properties</li>
        <li><strong>Smart Homes:</strong> Integration of IoT and smart home technologies</li>
        <li><strong>Transit-Oriented Development:</strong> Properties near public transport hubs remain highly sought after</li>
        <li><strong>Affordable Housing:</strong> Government continues to push for more affordable housing options</li>
      </ul>

      <h3>Market Predictions</h3>
      <p>Experts predict moderate growth in the property sector with selective hotspots showing stronger performance. Areas along new MRT lines and established townships with good amenities are expected to perform well.</p>
    `
  },
  {
    id: 2,
    title: "Why Selangor Remains the Most Sought-After State for Property Investment",
    category: "Guides",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop",
    excerpt: "Exploring investment opportunities in Petaling Jaya, Subang Jaya, and beyond",
    content: `
      <h2>Selangor: The Investment Hub</h2>
      <p>Selangor continues to dominate Malaysia's property market with its strategic location, excellent infrastructure, and diverse economic opportunities.</p>
      
      <h3>Top Investment Areas</h3>
      <ul>
        <li><strong>Petaling Jaya:</strong> Established township with mature infrastructure and strong rental demand</li>
        <li><strong>Subang Jaya:</strong> Family-friendly area with excellent schools and amenities</li>
        <li><strong>Shah Alam:</strong> State capital with growing commercial and residential developments</li>
        <li><strong>Cyberjaya:</strong> Tech hub attracting young professionals and tech companies</li>
      </ul>

      <h3>Investment Considerations</h3>
      <p>When investing in Selangor, consider factors like accessibility to major highways, proximity to public transport, nearby amenities, and future development plans.</p>
    `
  },
  {
    id: 3,
    title: "First-Time Buyer's Guide: Navigating HOC 2025 in Malaysia",
    category: "Guides",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop",
    excerpt: "Everything you need to know about Home Ownership Campaign incentives",
    content: `
      <h2>Home Ownership Campaign 2025</h2>
      <p>The Home Ownership Campaign (HOC) offers various incentives to help Malaysians own their first home. Understanding these benefits is crucial for first-time buyers.</p>
      
      <h3>Key Benefits</h3>
      <ul>
        <li><strong>Stamp Duty Exemption:</strong> Full exemption on stamp duty for loan agreements and property transfers</li>
        <li><strong>Developer Discounts:</strong> Participating developers offer special discounts and packages</li>
        <li><strong>Lower Down Payments:</strong> Some banks offer lower down payment options</li>
      </ul>

      <h3>Eligibility Requirements</h3>
      <p>First-time buyers should check eligibility criteria with banks and developers. Typically, you need to be a Malaysian citizen with stable income and no prior property ownership.</p>
    `
  },
  {
    id: 4,
    title: "KL's Public Transport Expansion: How MRT3 Will Impact Property Values",
    category: "News",
    image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&auto=format&fit=crop",
    excerpt: "Understanding the property hotspots along the new MRT3 alignment",
    content: `
      <h2>MRT3 and Property Value Impact</h2>
      <p>The upcoming MRT3 line is set to transform property values along its alignment, creating new investment opportunities and enhancing connectivity.</p>
      
      <h3>Key Stations to Watch</h3>
      <ul>
        <li><strong>Bandar Malaysia:</strong> Major transport hub with significant development potential</li>
        <li><strong>Klang Valley:</strong> Improved accessibility to commercial centers</li>
        <li><strong>Suburban Areas:</strong> Previously less accessible areas gaining value</li>
      </ul>

      <h3>Investment Timeline</h3>
      <p>Property values typically start appreciating 2-3 years before MRT completion. Early investors in areas along the MRT3 alignment may see significant capital appreciation.</p>
    `
  },
  {
    id: 5,
    title: "Affordable Housing in Malaysia: Best Areas Under RM500,000 in 2025",
    category: "Guides",
    image: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&auto=format&fit=crop",
    excerpt: "Top locations offering value for money for young professionals and families",
    content: `
      <h2>Finding Affordable Quality Housing</h2>
      <p>Quality housing under RM500,000 is still available in Malaysia, especially in strategic locations with good growth potential.</p>
      
      <h3>Recommended Areas</h3>
      <ul>
        <li><strong>Rawang:</strong> Excellent value with improving infrastructure</li>
        <li><strong>Bangi:</strong> University town with strong rental potential</li>
        <li><strong>Nilai:</strong> Affordable options with accessibility to major highways</li>
        <li><strong>Sepang:</strong> Growing area near KLIA with development potential</li>
      </ul>

      <h3>Tips for Buyers</h3>
      <p>Look for properties in areas with upcoming development plans, good public transport access, and essential amenities nearby. Consider both current value and future appreciation potential.</p>
    `
  }
];

export default function SimpleArticle() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/simple/article/:id");

  const article = malaysianArticles.find(a => a.id === Number(params?.id));

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 with-bottom-nav flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h1>
          <button
            onClick={() => setLocation('/simple')}
            className="px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 with-bottom-nav">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation('/simple')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-900" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Article</h1>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Featured Image */}
        <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-6">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4">
            <span className="inline-block px-3 py-1 bg-white/90 backdrop-blur-sm text-blue-600 rounded-full text-sm font-semibold">
              {article.category}
            </span>
          </div>
        </div>

        {/* Article Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {article.title}
        </h1>

        {/* Article Excerpt */}
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          {article.excerpt}
        </p>

        {/* Article Body */}
        <div 
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
          style={{
            lineHeight: '1.8',
          }}
        />

        <style>{`
          .prose h2 {
            font-size: 1.875rem;
            font-weight: 700;
            color: #111827;
            margin-top: 2rem;
            margin-bottom: 1rem;
          }
          .prose h3 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #111827;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
          }
          .prose p {
            color: #4B5563;
            margin-bottom: 1rem;
          }
          .prose ul {
            list-style-type: disc;
            margin-left: 1.5rem;
            margin-bottom: 1rem;
          }
          .prose li {
            color: #4B5563;
            margin-bottom: 0.5rem;
          }
          .prose strong {
            color: #111827;
            font-weight: 600;
          }
        `}</style>

        {/* Back to Home Button */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <button
            onClick={() => setLocation('/simple')}
            className="flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            data-testid="button-back-to-home"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
