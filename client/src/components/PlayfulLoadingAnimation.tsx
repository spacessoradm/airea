import { useState, useEffect } from "react";
import { 
  Search, 
  Home, 
  MapPin, 
  Sparkles, 
  Brain, 
  Target, 
  Loader2,
  Building,
  Key,
  Camera,
  Calculator
} from "lucide-react";

interface PlayfulLoadingAnimationProps {
  searchQuery?: string;
  searchType?: 'rent' | 'buy';
}

export function PlayfulLoadingAnimation({ 
  searchQuery = "", 
  searchType = 'rent' 
}: PlayfulLoadingAnimationProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Loading stages with icons and messages
  const loadingStages = [
    {
      icon: Brain,
      title: "🧠 AI Understanding",
      messages: [
        "Analyzing your search request...",
        "Understanding your preferences...",
        "Processing natural language..."
      ],
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      duration: 2000
    },
    {
      icon: Search,
      title: "🔍 Smart Matching",
      messages: [
        "Searching through property database...",
        "Finding the perfect matches...",
        "Comparing property features..."
      ],
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      duration: 2000
    },
    {
      icon: MapPin,
      title: "📍 Location Analysis",
      messages: [
        "Analyzing location preferences...",
        "Calculating distances to amenities...",
        "Checking transport connectivity..."
      ],
      color: "text-green-600",
      bgColor: "bg-green-100",
      duration: 1500
    },
    {
      icon: Target,
      title: "🎯 Precision Scoring",
      messages: [
        "Scoring property matches...",
        "Ranking by relevance...",
        "Finalizing recommendations..."
      ],
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      duration: 1500
    }
  ];

  // Fun search-specific messages
  const getSearchSpecificMessages = () => {
    if (!searchQuery) return [];
    
    const query = searchQuery.toLowerCase();
    const isRental = searchType === 'rent';
    
    if (query.includes('near mrt') || query.includes('near lrt')) {
      return [
        "🚇 Checking transport connectivity...",
        "📍 Finding properties near stations...",
        isRental ? "💰 Analyzing rental prices..." : "💰 Checking sale prices..."
      ];
    }
    
    if (query.includes('condo') || query.includes('condominium')) {
      return [
        "🏢 Searching condominium listings...",
        "🏊‍♂️ Checking amenities and facilities...",
        "🔒 Verifying security features..."
      ];
    }
    
    if (query.includes('family') || query.includes('children')) {
      return [
        "👨‍👩‍👧‍👦 Finding family-friendly properties...",
        "🏫 Checking nearby schools...",
        "🎮 Looking for kid-friendly amenities..."
      ];
    }
    
    if (query.includes('investment') || query.includes('yield')) {
      return [
        "📊 Analyzing investment potential...",
        "📈 Calculating rental yields...",
        "💹 Checking market trends..."
      ];
    }
    
    return [
      isRental ? "🏠 Finding perfect rental matches..." : "🏠 Finding perfect properties for sale...",
      "✨ Applying AI intelligence...",
      "🎯 Personalizing results..."
    ];
  };

  useEffect(() => {
    let stageTimer: NodeJS.Timeout;
    let messageTimer: NodeJS.Timeout;

    const startStageTimer = () => {
      stageTimer = setTimeout(() => {
        setCurrentStage(prev => {
          const nextStage = (prev + 1) % loadingStages.length;
          setCurrentMessageIndex(0);
          return nextStage;
        });
      }, loadingStages[currentStage]?.duration || 2000);
    };

    const startMessageTimer = () => {
      messageTimer = setTimeout(() => {
        setCurrentMessageIndex(prev => {
          const messages = loadingStages[currentStage]?.messages || [];
          return (prev + 1) % messages.length;
        });
      }, 800);
    };

    startStageTimer();
    startMessageTimer();

    const messageInterval = setInterval(() => {
      setCurrentMessageIndex(prev => {
        const messages = loadingStages[currentStage]?.messages || [];
        return (prev + 1) % messages.length;
      });
    }, 800);

    return () => {
      clearTimeout(stageTimer);
      clearTimeout(messageTimer);
      clearInterval(messageInterval);
    };
  }, [currentStage]);

  const currentStageData = loadingStages[currentStage];
  const CurrentIcon = currentStageData?.icon || Search;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      {/* Main Loading Animation */}
      <div className="relative mb-8">
        {/* Animated Background Circles */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 animate-pulse"></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-200 to-blue-200 animate-ping"></div>
        </div>
        
        {/* Main Icon Container */}
        <div className={`relative z-10 w-20 h-20 ${currentStageData?.bgColor} rounded-full flex items-center justify-center shadow-lg transform transition-all duration-500 hover:scale-110`}>
          <CurrentIcon className={`w-10 h-10 ${currentStageData?.color} animate-bounce`} />
        </div>

        {/* Floating Icons Animation */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <Home className="absolute top-2 right-2 w-4 h-4 text-blue-400 animate-float animation-delay-100" />
          <Building className="absolute bottom-2 left-2 w-4 h-4 text-purple-400 animate-float animation-delay-300" />
          <Key className="absolute top-8 left-0 w-3 h-3 text-green-400 animate-float animation-delay-500" />
          <Camera className="absolute bottom-8 right-0 w-3 h-3 text-orange-400 animate-float animation-delay-700" />
        </div>
      </div>

      {/* Stage Title */}
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {currentStageData?.title}
        </h3>
        
        {/* Progress Dots */}
        <div className="flex space-x-2 justify-center mb-4">
          {loadingStages.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStage 
                  ? 'bg-blue-600 scale-125' 
                  : index < currentStage 
                  ? 'bg-green-500' 
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Dynamic Message */}
      <div className="text-center min-h-[50px] flex items-center justify-center">
        <p className="text-gray-600 text-lg animate-fade-in-up">
          {currentStageData?.messages[currentMessageIndex]}
        </p>
      </div>

      {/* Search Query Display */}
      {searchQuery && (
        <div className="mt-6 px-6 py-3 bg-blue-50 rounded-full border border-blue-200">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-blue-800 font-medium">Searching: "{searchQuery}"</span>
          </div>
        </div>
      )}

      {/* Fun Facts or Tips */}
      <div className="mt-8 max-w-md text-center">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
          <p className="text-sm text-gray-600">
            💡 <strong>Did you know?</strong> Our AI analyzes over 15 factors including location, 
            amenities, transport connectivity, and market trends to find your perfect property match!
          </p>
        </div>
      </div>

      {/* Fun Loading Messages */}
      <div className="mt-4 text-center">
        <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce animation-delay-100"></div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce animation-delay-300"></div>
          <span className="ml-2">AI working its magic...</span>
        </div>
      </div>

      {/* Loading Bar */}
      <div className="mt-6 w-64 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-loading-bar"></div>
      </div>
    </div>
  );
}

// Additional CSS classes for custom animations (add to global CSS)
export const playfulLoadingStyles = `
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(5deg); }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes loading-bar {
  0% { width: 0%; }
  50% { width: 70%; }
  100% { width: 100%; }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

.animate-fade-in-up {
  animation: fade-in-up 0.5s ease-out;
}

.animate-loading-bar {
  animation: loading-bar 8s ease-in-out infinite;
}

.animation-delay-100 {
  animation-delay: 0.1s;
}

.animation-delay-300 {
  animation-delay: 0.3s;
}

.animation-delay-500 {
  animation-delay: 0.5s;
}

.animation-delay-700 {
  animation-delay: 0.7s;
}
`;