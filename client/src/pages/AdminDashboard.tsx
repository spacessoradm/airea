import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Mail, Phone, Calendar, User } from "lucide-react";

interface PendingApplication {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  agentApplicationDate: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || user?.role !== 'admin') {
        setLocation('/agent/login');
      }
    }
  }, [isAuthenticated, isLoading, user, setLocation]);

  // Fetch pending applications
  const { data: applications, isLoading: applicationsLoading } = useQuery<PendingApplication[]>({
    queryKey: ['/api/admin/agent-applications'],
    enabled: !!user && user.role === 'admin',
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('POST', `/api/admin/agent-applications/${userId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/agent-applications'] });
      toast({
        title: "Application Approved",
        description: "The agent application has been approved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve application",
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('POST', `/api/admin/agent-applications/${userId}/reject`, {
        reason: "Application rejected by admin"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/agent-applications'] });
      toast({
        title: "Application Rejected",
        description: "The agent application has been rejected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject application",
        variant: "destructive",
      });
    },
  });

  if (isLoading || applicationsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Manage pending agent applications</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Pending Agent Applications</CardTitle>
            <CardDescription>
              Review and approve or reject agent applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!applications || applications.length === 0 ? (
              <div className="text-center py-12 text-gray-500" data-testid="text-no-applications">
                No pending applications
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <div
                    key={application.id}
                    className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
                    data-testid={`application-${application.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="bg-gray-100 p-2 rounded-lg">
                            <User className="h-5 w-5 text-gray-700" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900" data-testid="text-applicant-name">
                              {application.firstName} {application.lastName}
                            </h3>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Mail className="h-4 w-4" />
                            <span data-testid="text-applicant-email">{application.email}</span>
                          </div>
                          {application.phone && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Phone className="h-4 w-4" />
                              <span data-testid="text-applicant-phone">{application.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Applied: {new Date(application.agentApplicationDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Registered: {new Date(application.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 ml-4">
                        <Button
                          onClick={() => approveMutation.mutate(application.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          data-testid={`button-approve-${application.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {approveMutation.isPending ? "Approving..." : "Approve"}
                        </Button>
                        <Button
                          onClick={() => rejectMutation.mutate(application.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          data-testid={`button-reject-${application.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>Users register and apply to become agents</li>
              <li>Applications appear here for admin review</li>
              <li>Approve applications to grant agent access and 500 AI credits</li>
              <li>Reject applications to deny agent access</li>
              <li>Approved agents can immediately access the agent dashboard and create listings</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
