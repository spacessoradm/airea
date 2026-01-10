import { Home, Heart, User } from "lucide-react";
import { useLocation } from "wouter";

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/simple", testId: "nav-home" },
    { icon: Heart, label: "Saved", path: "/simple/saved", testId: "nav-saved" },
    { icon: User, label: "Profile", path: "/simple/profile", testId: "nav-profile" },
  ];

  return (
    <div className="bottom-nav-fixed">
      <nav className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-around" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className="flex flex-col items-center justify-center py-2 px-6 rounded-lg transition-colors"
                data-testid={item.testId}
              >
                <Icon 
                  className={`w-6 h-6 mb-1 ${
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  }`}
                />
                <span 
                  className={`text-xs font-medium ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
