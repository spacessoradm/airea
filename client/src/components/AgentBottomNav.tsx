import { LayoutDashboard, Building, Plus, MessageSquare, User } from "lucide-react";
import { useLocation } from "wouter";

export default function AgentBottomNav() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/simple/agent", testId: "nav-agent-dashboard" },
    { icon: Building, label: "Listings", path: "/simple/agent/listings", testId: "nav-agent-listings" },
    { icon: Plus, label: "Add", path: "/simple/agent/create", testId: "nav-agent-add", isAdd: true },
    { icon: MessageSquare, label: "Inquiries", path: "/simple/agent/inquiries", testId: "nav-agent-inquiries" },
    { icon: User, label: "Profile", path: "/simple/agent/profile", testId: "nav-agent-profile" },
  ];

  return (
    <div className="bottom-nav-fixed">
      <nav className="max-w-7xl mx-auto px-2">
        <div className="flex items-center justify-around" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || 
              (item.path === '/simple/agent' && location.startsWith('/simple/agent') && !navItems.slice(1).some(n => location === n.path));
            
            if (item.isAdd) {
              return (
                <button
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  className="flex flex-col items-center justify-center -mt-6"
                  data-testid={item.testId}
                >
                  <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                </button>
              );
            }
            
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className="flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors"
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
