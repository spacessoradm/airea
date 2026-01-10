import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Calendar, CreditCard, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import AgentHeader from "@/components/AgentHeader";

export default function AgentProfile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "A";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AgentHeader />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/comprehensive-agent">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          {/* Profile Header */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Profile</CardTitle>
              <CardDescription>
                View your agent information and account details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "Agent"} />
                  <AvatarFallback className="text-2xl">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {user.nickname || `${user.firstName} ${user.lastName}`}
                      </h2>
                      <Badge variant="secondary">Property Agent</Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      Member since {new Date(user.createdAt || Date.now()).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Agent Nickname</p>
                    <p className="text-base text-gray-900">
                      {user.nickname || `${user.firstName} ${user.lastName}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      This name appears on your listings. Contact support to change.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-base text-gray-900">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Full Name</p>
                    <p className="text-base text-gray-900">
                      {user.firstName} {user.lastName}
                    </p>
                  </div>
                </div>

                {user.phone && (
                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Phone</p>
                      <p className="text-base text-gray-900">{user.phone}</p>
                    </div>
                  </div>
                )}
                
                {(user as any).company && (
                  <div className="flex items-start space-x-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Agency</p>
                      <p className="text-base text-gray-900">{(user as any).company}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-3">
                  <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">AI Credits</p>
                    <p className="text-base text-gray-900">{user.aiCredits || 0} credits</p>
                    <p className="text-xs text-gray-500 mt-1">5 credits per listing</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Agent Since</p>
                    <p className="text-base text-gray-900">
                      {user.agentApprovalDate 
                        ? new Date(user.agentApprovalDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Help Section */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>
                Contact our support team for assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  If you need to update your agent nickname or have any questions about your account, please contact our support team.
                </p>
                <Link href="/contact">
                  <Button variant="outline">
                    Contact Support
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
