import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { User as UserIcon, Mail, LogOut, Settings, HelpCircle, FileText } from "lucide-react";
import type { User } from "@shared/schema";
import Header from "@/components/Header";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch current user
  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  const handleSignOut = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
      setLocation('/');
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const getUserInitials = (user: User) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error loading profile</h2>
          <p className="text-gray-500 mb-6">Unable to load your profile. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to view your profile</h2>
          <p className="text-gray-500 mb-6">Access your account settings and preferences</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
            data-testid="button-sign-in"
          >
            Sign In
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">My Profile</h1>

          {/* Profile Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={(user as any)?.profileImageUrl} alt={user.firstName || 'User'} />
                <AvatarFallback className="text-xl">
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-gray-900" data-testid="text-user-name">
                  {user.firstName} {user.lastName}
                </h2>
                <div className="flex items-center gap-2 text-gray-600 text-sm mt-1">
                  <Mail className="w-4 h-4" />
                  <span data-testid="text-user-email">{user.email}</span>
                </div>
                {(user as any)?.role === 'agent' && (
                  <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Agent
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
            <button
              onClick={() => setLocation('/account-settings')}
              className="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
              data-testid="button-account-settings"
            >
              <Settings className="w-5 h-5 text-gray-600" />
              <span className="flex-1 text-left font-medium text-gray-900">Account Settings</span>
            </button>
            <button
              onClick={() => setLocation('/privacy-policy')}
              className="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
              data-testid="button-privacy-policy"
            >
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="flex-1 text-left font-medium text-gray-900">Privacy Policy</span>
            </button>
            <button
              onClick={() => setLocation('/contact')}
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
            className="w-full bg-white rounded-lg border border-gray-200 px-6 py-4 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors text-red-600 font-semibold"
            data-testid="button-sign-out"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
