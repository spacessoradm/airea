import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { User, Mail, LogOut, ArrowLeft, Settings, HelpCircle, FileText } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";

export default function SimpleProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch current user
  const { data: user } = useQuery<UserType>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
      setLocation('/simple');
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const handleComingSoon = (feature: string) => {
    toast({
      title: "Coming Soon",
      description: `${feature} will be available soon!`,
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 with-bottom-nav">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation('/simple')}
                className="p-2 hover:bg-gray-100 rounded-full"
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Profile</h1>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to view your profile</h2>
          <p className="text-gray-500 mb-6">Access your account settings and preferences</p>
          <button
            onClick={() => setLocation('/login?redirect=/simple/profile')}
            className="px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700"
            data-testid="button-go-to-signin"
          >
            Go to Sign In
          </button>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 with-bottom-nav">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation('/simple')}
              className="p-2 hover:bg-gray-100 rounded-full"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Profile</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Profile Info */}
        <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900" data-testid="text-user-name">
                {user.firstName} {user.lastName}
              </h2>
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Mail className="w-4 h-4" />
                <span data-testid="text-user-email">{user.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4">
          <button
            onClick={() => setLocation('/simple/account-settings')}
            className="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
            data-testid="button-account-settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-left font-medium text-gray-900">Account Settings</span>
          </button>
          <button
            onClick={() => handleComingSoon("Privacy Policy")}
            className="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
            data-testid="button-privacy-policy"
          >
            <FileText className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-left font-medium text-gray-900">Privacy Policy</span>
          </button>
          <button
            onClick={() => handleComingSoon("Help & Support")}
            className="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
            data-testid="button-help-support"
          >
            <HelpCircle className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-left font-medium text-gray-900">Help & Support</span>
          </button>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full bg-white rounded-2xl px-6 py-4 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors shadow-sm text-red-600 font-semibold"
          data-testid="button-sign-out"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
