import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, User, Mail, Phone, MapPin, Briefcase, Calendar, Edit2, Save, X } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function SimpleAccountSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");

  // Fetch current user
  const { data: user } = useQuery<UserType>({
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 with-bottom-nav">
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation('/simple/profile')}
                className="p-2 hover:bg-gray-100 rounded-full"
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Account Settings</h1>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-500">Please sign in to view account settings</p>
        </div>

        <BottomNav />
      </div>
    );
  }

  const isAgent = (user as any)?.role === 'agent';

  return (
    <div className="min-h-screen bg-gray-50 with-bottom-nav">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation('/simple/profile')}
                className="p-2 hover:bg-gray-100 rounded-full"
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Account Settings</h1>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                <Edit2 className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm" disabled={updateMutation.isPending}>
                  <Save className="w-4 h-4" />
                </Button>
                <Button onClick={handleCancel} variant="outline" size="sm" disabled={updateMutation.isPending}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">Nickname (optional)</label>
                    <Input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Enter your nickname"
                      data-testid="input-nickname"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  {(user as any)?.nickname && (
                    <p className="text-base text-gray-600 mb-1" data-testid="text-nickname">
                      @{(user as any).nickname}
                    </p>
                  )}
                  <h2 className="text-xl font-bold text-gray-900" data-testid="text-user-name">
                    {user.firstName} {user.lastName}
                  </h2>
                  {isAgent && (
                    <div className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      Agent Account
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="space-y-4">
            {isEditing ? (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-2.5" />
                <div className="flex-1">
                  <label className="text-sm text-gray-500 block mb-2">Full Name</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      data-testid="input-first-name"
                    />
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium text-gray-900" data-testid="text-full-name">
                    {user.firstName} {user.lastName}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900" data-testid="text-email">
                  {user.email}
                </p>
              </div>
            </div>

            {(user as any)?.phoneNumber && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium text-gray-900" data-testid="text-phone">
                    {(user as any).phoneNumber}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Member Since</p>
                <p className="font-medium text-gray-900" data-testid="text-member-since">
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
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Information</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Agent Nickname</p>
                  <p className="font-medium text-gray-900" data-testid="text-agent-nickname">
                    {(user as any).agentNickname}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    This name appears on all your property listings
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Type */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Type</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900" data-testid="text-account-type">
                {isAgent ? 'Agent Account' : 'User Account'}
              </p>
              <p className="text-sm text-gray-500">
                {isAgent ? 'You can list properties and manage inquiries' : 'Standard user account for browsing properties'}
              </p>
            </div>
          </div>
        </div>

        {/* Account ID (for reference) */}
        <div className="bg-gray-100 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Account ID</h3>
          <p className="text-xs font-mono text-gray-600 break-all" data-testid="text-account-id">
            {user.id}
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
