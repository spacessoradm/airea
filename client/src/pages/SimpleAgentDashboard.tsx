import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Plus, 
  Eye, 
  MessageSquare, 
  Building, 
  TrendingUp,
  MapPin,
  Bed,
  Bath,
  Maximize,
  MoreVertical,
  Edit,
  EyeOff,
  Trash2,
  ChevronRight,
  Clock,
  CheckCircle,
  User as UserIcon,
  Settings,
  LogOut,
  Bell,
  HelpCircle,
  Shield
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AgentBottomNav from "@/components/AgentBottomNav";
import type { Property, User } from "@shared/schema";

type PageView = 'dashboard' | 'listings' | 'inquiries' | 'profile';

export default function SimpleAgentDashboard() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'all' | 'online' | 'draft' | 'offline'>('all');
  
  const currentView: PageView = location.includes('/listings') ? 'listings' 
    : location.includes('/inquiries') ? 'inquiries' 
    : location.includes('/profile') ? 'profile'
    : 'dashboard';

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  const { data: agentProperties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties/agent'],
    retry: false,
    enabled: !!user,
  });

  const formatPrice = (price: string | number, listingType: string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    const formatted = new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
    }).format(numPrice);
    return listingType === 'rent' ? `${formatted}/mo` : formatted;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'draft':
        return 'bg-yellow-100 text-yellow-700';
      case 'offline':
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      case 'expired':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredProperties = agentProperties?.filter(p => {
    if (activeTab === 'all') return true;
    return p.status === activeTab;
  }) || [];

  const stats = [
    { 
      label: "Listings", 
      value: agentProperties?.length || 0, 
      icon: Building, 
      color: "bg-blue-50 text-blue-600" 
    },
    { 
      label: "Views", 
      value: 0, 
      icon: Eye, 
      color: "bg-green-50 text-green-600" 
    },
    { 
      label: "Inquiries", 
      value: 12, 
      icon: MessageSquare, 
      color: "bg-purple-50 text-purple-600" 
    },
    { 
      label: "This Month", 
      value: "+8%", 
      icon: TrendingUp, 
      color: "bg-orange-50 text-orange-600" 
    },
  ];

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  // Demo mode - show dashboard without sign in for preview
  const displayUser = user || { firstName: 'Agent', lastName: 'Demo', email: 'demo@airea.com' };

  const renderPropertyCard = (property: Property) => (
    <div 
      key={property.id}
      className="bg-white rounded-xl p-4 shadow-sm"
    >
      <div className="flex gap-4">
        <div 
          className="w-24 h-24 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 cursor-pointer"
          onClick={() => setLocation(`/simple/property/${property.id}`)}
        >
          {property.images && property.images[0] ? (
            <img 
              src={property.images[0]} 
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building className="w-8 h-8 text-gray-300" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 
              className="font-semibold text-gray-900 truncate cursor-pointer"
              onClick={() => setLocation(`/simple/property/${property.id}`)}
            >
              {property.title}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-gray-100 rounded" data-testid={`menu-property-${property.id}`}>
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLocation(`/simple/agent/edit/${property.id}`)}>
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <EyeOff className="w-4 h-4 mr-2" /> Set Offline
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{property.city}, {property.state}</span>
          </div>
          
          <div className="flex items-center gap-3 text-gray-500 text-xs mt-2">
            {property.bedrooms !== undefined && property.bedrooms > 0 && (
              <span className="flex items-center gap-1">
                <Bed className="w-3 h-3" /> {property.bedrooms}
              </span>
            )}
            {property.bathrooms !== undefined && property.bathrooms > 0 && (
              <span className="flex items-center gap-1">
                <Bath className="w-3 h-3" /> {property.bathrooms}
              </span>
            )}
            {property.builtUpSize && (
              <span className="flex items-center gap-1">
                <Maximize className="w-3 h-3" /> {property.builtUpSize} sqft
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <p className="text-blue-600 font-bold">
              {formatPrice(property.price, property.listingType)}
            </p>
            <Badge className={`${getStatusColor(property.status || 'draft')} text-xs`}>
              {property.status || 'draft'}
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Eye className="w-4 h-4" /> -- views
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="w-4 h-4" /> -- inquiries
        </span>
      </div>
    </div>
  );

  const renderListingsView = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
          <p className="text-gray-500 text-sm">{agentProperties?.length || 0} properties</p>
        </div>
        <Button
          onClick={() => setLocation('/simple/agent/create')}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-add-listing"
        >
          <Plus className="w-4 h-4 mr-2" /> Add
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
        {(['all', 'online', 'draft', 'offline'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
            data-testid={`tab-${tab}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {propertiesLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900 mb-1">No listings yet</h3>
          <p className="text-gray-500 text-sm mb-4">Start by adding your first property</p>
          <Button
            onClick={() => setLocation('/simple/agent/create')}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-create-first-listing"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Listing
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProperties.map(renderPropertyCard)}
        </div>
      )}
    </>
  );

  const renderInquiriesView = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inquiries</h1>
          <p className="text-gray-500 text-sm">Manage your property inquiries</p>
        </div>
      </div>

      <div className="bg-white rounded-xl divide-y divide-gray-100">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">John D. interested in your condo</p>
              <p className="text-xs text-gray-500">Mont Kiara Condo • 2 hours ago</p>
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-700 text-xs">New</Badge>
        </div>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">Sarah L. viewing request</p>
              <p className="text-xs text-gray-500">KLCC Studio • Yesterday</p>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-700 text-xs">Replied</Badge>
        </div>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">Ahmad M. price negotiation</p>
              <p className="text-xs text-gray-500">Bangsar South House • 3 days ago</p>
            </div>
          </div>
          <Badge className="bg-yellow-100 text-yellow-700 text-xs">Pending</Badge>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded-xl text-center">
        <p className="text-gray-500 text-sm">Real-time inquiries coming soon</p>
      </div>
    </>
  );

  const renderDashboardView = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome back, {displayUser.firstName}</p>
        </div>
        <Button
          onClick={() => setLocation('/simple/agent/create')}
          className="bg-blue-600 hover:bg-blue-700 rounded-full h-12 w-12 p-0"
          data-testid="button-add-listing"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map((stat, index) => (
          <div 
            key={index}
            className="bg-white rounded-xl p-4 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">My Listings</h2>
          <button 
            onClick={() => setLocation('/simple/agent/listings')}
            className="text-blue-600 text-sm font-medium flex items-center gap-1"
            data-testid="button-view-all-listings"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {propertiesLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 mb-1">No listings yet</h3>
            <p className="text-gray-500 text-sm mb-4">Start by adding your first property</p>
            <Button
              onClick={() => setLocation('/simple/agent/create')}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-create-first-listing"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Listing
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProperties.slice(0, 3).map(renderPropertyCard)}
          </div>
        )}
      </div>

      <div className="mt-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Inquiries</h2>
          <button 
            onClick={() => setLocation('/simple/agent/inquiries')}
            className="text-blue-600 text-sm font-medium flex items-center gap-1"
            data-testid="button-view-all-inquiries"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-white rounded-xl divide-y divide-gray-100">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">John D. interested in your condo</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Sarah L. viewing request</p>
                <p className="text-xs text-gray-500">Yesterday</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    </>
  );

  const renderProfileView = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-10 h-10 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{displayUser.firstName} {displayUser.lastName}</h2>
            <p className="text-gray-500 text-sm">{displayUser.email}</p>
            <Badge className="bg-blue-100 text-blue-700 text-xs mt-2">Agent</Badge>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl divide-y divide-gray-100 shadow-sm mb-4">
        <button className="w-full p-4 flex items-center justify-between text-left" data-testid="profile-edit">
          <div className="flex items-center gap-3">
            <Edit className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">Edit Profile</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
        <button className="w-full p-4 flex items-center justify-between text-left" data-testid="profile-notifications">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">Notifications</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
        <button className="w-full p-4 flex items-center justify-between text-left" data-testid="profile-settings">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">Settings</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
        <button className="w-full p-4 flex items-center justify-between text-left" data-testid="profile-security">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">Security</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
        <button className="w-full p-4 flex items-center justify-between text-left" data-testid="profile-help">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">Help & Support</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <button 
        className="w-full bg-white rounded-xl p-4 flex items-center justify-center gap-2 text-red-600 font-medium shadow-sm"
        data-testid="profile-logout"
        onClick={() => setLocation('/simple')}
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 with-bottom-nav">
      <div className="px-4 pt-6 pb-4">
        {currentView === 'listings' && renderListingsView()}
        {currentView === 'inquiries' && renderInquiriesView()}
        {currentView === 'dashboard' && renderDashboardView()}
        {currentView === 'profile' && renderProfileView()}
      </div>

      <AgentBottomNav />
    </div>
  );
}
