import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Mail, Phone, Calendar, Briefcase, Edit2, Save, X } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import Header from "@/components/Header";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function AccountSettings() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");

  // Fetch current user
  const { data: user, isLoading } = useQuery<UserType>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Initialize form fields when user data loads
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setNickname((user as any)?.nickname || "");
    }
  }, [user]);

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; nickname: string }) => {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Your profile has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const getUserInitials = (user: UserType) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const handleSave = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Error",
        description: "First name and last name are required",
        variant: "destructive",
      });
      return;
    }
    
    updateMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      nickname: nickname.trim(),
    });
  };

  const handleCancel = () => {
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setNickname((user as any)?.nickname || "");
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-gray-500">Please sign in to view account settings</p>
        </div>
      </>
    );
  }

  const isAgent = (user as any)?.role === 'agent';

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-page="account-settings">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          {!isEditing ? (
            <Button 
              onClick={() => setIsEditing(true)} 
              variant="outline" 
              size="sm"
              data-testid="button-edit-profile"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                onClick={handleSave} 
                size="sm" 
                disabled={updateMutation.isPending}
                data-testid="button-save"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button 
                onClick={handleCancel} 
                variant="outline" 
                size="sm" 
                disabled={updateMutation.isPending}
                data-testid="button-cancel"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Profile Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={(user as any)?.profileImageUrl} alt={user.firstName || 'User'} />
              <AvatarFallback className="text-2xl">
                {getUserInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">Nickname (optional)</label>
                    <Input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Enter your nickname"
                      className="max-w-sm"
                      data-testid="input-nickname"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  {(user as any)?.nickname && (
                    <p className="text-lg text-gray-600 mb-1" data-testid="text-nickname">
                      @{(user as any).nickname}
                    </p>
                  )}
                  <h2 className="text-2xl font-bold text-gray-900" data-testid="text-user-name">
                    {user.firstName} {user.lastName}
                  </h2>
                  {isAgent && (
                    <div className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                      Agent Account
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="space-y-4">
            {isEditing ? (
              <>
                <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                  <User className="w-5 h-5 text-gray-400 mt-2.5" />
                  <div className="flex-1">
                    <label className="text-sm text-gray-500 block mb-2">Full Name</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First name"
                          data-testid="input-first-name"
                        />
                      </div>
                      <div>
                        <Input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last name"
                          data-testid="input-last-name"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium text-gray-900 mt-1" data-testid="text-full-name">
                    {user.firstName} {user.lastName}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium text-gray-900 mt-1" data-testid="text-email">
                  {user.email}
                </p>
              </div>
            </div>

            {(user as any)?.phoneNumber && (
              <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium text-gray-900 mt-1" data-testid="text-phone">
                    {(user as any).phoneNumber}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Member Since</p>
                <p className="font-medium text-gray-900 mt-1" data-testid="text-member-since">
                  {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Information */}
        {isAgent && (user as any)?.agentNickname && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Information</h3>
            <div className="flex items-start gap-3">
              <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Agent Nickname</p>
                <p className="font-medium text-gray-900 mt-1" data-testid="text-agent-nickname">
                  {(user as any).agentNickname}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  This name appears on all your property listings
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Account Type */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Type</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900" data-testid="text-account-type">
                {isAgent ? 'Agent Account' : 'User Account'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {isAgent ? 'You can list properties and manage inquiries' : 'Standard user account for browsing properties'}
              </p>
            </div>
          </div>
        </div>

        {/* Account ID */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Account ID</h3>
          <p className="text-xs font-mono text-gray-600 break-all" data-testid="text-account-id">
            {user.id}
          </p>
        </div>
      </div>
    </>
  );
}
