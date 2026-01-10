import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AgentHeader from "@/components/AgentHeader";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  MessageSquare,
  Calendar,
  DollarSign,
  Users,
  Home,
  Clock,
  AlertTriangle,
  CheckCircle,
  Upload,
  Download,
  Plus,
  Settings,
  Bell,
  Filter,
  Search,
  MapPin,
  Star,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Mail,
  Phone,
  Briefcase,
  FileText,
  CalendarDays,
  CreditCard,
  Receipt,
  Building,
  Activity,
  Zap,
  ArrowLeft,
  ArrowRight,
  MoreVertical,
  Edit as EditIcon,
  Copy as CopyIcon,
  EyeOff,
} from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// Form schemas

const calendarEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  eventType: z.string(),
  location: z.string().optional(),
});

const savedSearchSchema = z.object({
  name: z.string().min(1, "Search name is required"),
  searchCriteria: z.string().min(1, "Search criteria is required"),
  alertEnabled: z.boolean().default(false),
});

export default function ComprehensiveAgentDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedStatus, setSelectedStatus] = useState<string>('online'); // Status filter state
  const [selectedListingType, setSelectedListingType] = useState<string>('all'); // Listing type filter (all/rent/sale)
  const [searchQuery, setSearchQuery] = useState<string>(''); // Search bar state
  const [currentPage, setCurrentPage] = useState<number>(1); // Pagination state
  const ITEMS_PER_PAGE = 20;
  const [readvertiseConfirmOpen, setReadvertiseConfirmOpen] = useState(false);
  const [selectedPropertyForReadvertise, setSelectedPropertyForReadvertise] = useState<string | null>(null);
  const [postConfirmOpen, setPostConfirmOpen] = useState(false);
  const [selectedPropertyForPost, setSelectedPropertyForPost] = useState<string | null>(null);
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false);
  const [selectedPropertyForCopy, setSelectedPropertyForCopy] = useState<string | null>(null);
  const [offlineConfirmOpen, setOfflineConfirmOpen] = useState(false);
  const [selectedPropertyForOffline, setSelectedPropertyForOffline] = useState<any>(null);
  const [boostConfirmOpen, setBoostConfirmOpen] = useState(false);
  const [selectedPropertyForBoost, setSelectedPropertyForBoost] = useState<any>(null);
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);
  const [selectedPropertyForRefresh, setSelectedPropertyForRefresh] = useState<any>(null);

  // Reset to page 1 when search query or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedListingType]);

  // Disable body scroll when any modal is open
  useEffect(() => {
    if (readvertiseConfirmOpen || postConfirmOpen || copyConfirmOpen || offlineConfirmOpen || boostConfirmOpen || refreshConfirmOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [readvertiseConfirmOpen, postConfirmOpen, copyConfirmOpen, offlineConfirmOpen, boostConfirmOpen, refreshConfirmOpen]);

  // Authentication and role check - redirect if not authenticated or not an agent
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        setLocation('/agent/login');
      } else if (user?.role !== 'agent') {
        setLocation('/agent/login');
      }
    }
  }, [isAuthenticated, isLoading, user, setLocation]);

  // Analytics Queries - with error handling for auth issues
  const { data: leadReports, isLoading: leadsLoading } = useQuery({
    queryKey: ['/api/analytics/leads'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/leads');
      if (!response.ok) throw new Error('Failed to fetch lead reports');
      return response.json();
    },
  });

  // Management Data Queries
  const { data: inquiries, isLoading: inquiriesLoading } = useQuery({
    queryKey: ['/api/inquiries'],
    queryFn: async () => {
      const response = await fetch('/api/inquiries');
      if (!response.ok) throw new Error('Failed to fetch inquiries');
      return response.json();
    },
  });

  const { data: calendarEvents } = useQuery({
    queryKey: ['/api/calendar/events'],
    queryFn: async () => {
      const response = await fetch('/api/calendar/events');
      if (!response.ok) throw new Error('Failed to fetch calendar events');
      return response.json();
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
  });

  const { data: savedSearches } = useQuery({
    queryKey: ['/api/saved-searches'],
    queryFn: async () => {
      const response = await fetch('/api/saved-searches');
      if (!response.ok) throw new Error('Failed to fetch saved searches');
      return response.json();
    },
  });

  // Agent Metrics Query
  const { data: agentMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/agent/metrics'],
    queryFn: async () => {
      const response = await fetch('/api/agent/metrics');
      if (!response.ok) throw new Error('Failed to fetch agent metrics');
      return response.json();
    },
    staleTime: 0, // Always fetch fresh credits data
    refetchOnMount: true, // Refetch when component mounts
  });

  // Pagination settings
  const itemsPerPage = 20;

  // Get paginated properties based on selected status
  const { data: propertiesResponse, isLoading: propertiesLoading } = useQuery({
    queryKey: ['/api/agent/properties', selectedStatus, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      if (selectedStatus) {
        params.append('status', selectedStatus);
      }
      const response = await fetch(`/api/agent/properties?${params}`);
      if (!response.ok) return { properties: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      return response.json();
    },
    retry: false,
    staleTime: 0, // Always fetch fresh data
  });

  const agentProperties = propertiesResponse?.properties || [];
  const pagination = propertiesResponse?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };

  // Fetch counts for all statuses (for the filter buttons)
  const { data: statusCounts = { online: 0, offline: 0, expired: 0, draft: 0 } } = useQuery({
    queryKey: ['/api/agent/properties/counts'],
    queryFn: async () => {
      const response = await fetch('/api/agent/properties/counts');
      if (!response.ok) {
        return { online: 0, offline: 0, expired: 0, draft: 0 };
      }
      return response.json();
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  // Form handlers

  const eventForm = useForm({
    resolver: zodResolver(calendarEventSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      eventType: "viewing",
      location: "",
    },
  });

  const searchForm = useForm({
    resolver: zodResolver(savedSearchSchema),
    defaultValues: {
      name: "",
      searchCriteria: "",
      alertEnabled: false,
    },
  });

  // Mutations

  const addEventMutation = useMutation({
    mutationFn: async (data: z.infer<typeof calendarEventSchema>) => {
      return apiRequest('/api/calendar/events', 'POST', {
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      });
    },
    onSuccess: () => {
      toast({ title: "Event scheduled successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      eventForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to schedule event", variant: "destructive" });
    },
  });

  const clonePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return apiRequest('POST', `/api/properties/${propertyId}/clone`, {});
    },
    onSuccess: () => {
      toast({ 
        title: "Listing Cloned Successfully!", 
        description: "A draft copy of your listing has been created. You can find it in the Draft tab." 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/properties'] });
    },
    onError: () => {
      toast({ title: "Failed to clone listing", variant: "destructive" });
    },
  });

  const readvertisePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return apiRequest('POST', `/api/properties/${propertyId}/readvertise`, {});
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Listing Readvertised Successfully!", 
        description: `Your listing is now at the top. ${data.creditDeducted} AI credits deducted. Remaining: ${data.remainingCredits} credits.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/credits'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to readvertise listing", 
        description: error?.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  // Feature Boost mutation (5 credits, 7 days)
  const boostPropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return apiRequest('POST', `/api/properties/${propertyId}/boost`, {});
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Listing Boosted Successfully! ✨", 
        description: `Your listing is now featured for 7 days! ${data.creditDeducted} AI credits deducted. Remaining: ${data.remainingCredits} credits.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/credits'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to boost listing", 
        description: error?.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  // Refresh mutation (1 credit, 24-hour cooldown)
  const refreshPropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return apiRequest('POST', `/api/properties/${propertyId}/refresh`, {});
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Listing Refreshed Successfully! 🔄", 
        description: `Your listing has been refreshed. ${data.creditDeducted} AI credit deducted. Remaining: ${data.remainingCredits} credits.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/credits'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to refresh listing", 
        description: error?.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  // Post listing mutation (for draft/offline)
  const postPropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return apiRequest('PUT', `/api/properties/${propertyId}/status`, { status: 'online' });
    },
    onSuccess: () => {
      toast({ 
        title: "Listing Posted Successfully!", 
        description: "Your listing is now online and visible to potential clients."
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/agent/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/properties/counts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/metrics'] });
      
      // Switch to Online tab automatically
      setSelectedStatus('online');
      setCurrentPage(1); // Reset to first page
    },
    onError: () => {
      toast({ title: "Failed to post listing", variant: "destructive" });
    },
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ propertyId, status }: { propertyId: string; status: string }) => {
      return apiRequest(`/api/properties/${propertyId}/status`, 'PUT', { status });
    },
    onSuccess: () => {
      toast({ title: "Property status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/metrics'] });
    },
    onError: () => {
      toast({ title: "Failed to update property status", variant: "destructive" });
    },
  });

  // Handle status change
  const handleStatusChange = (property: any, newStatus: string) => {
    updateStatusMutation.mutate({ propertyId: property.id, status: newStatus });
  };

  // Calculate metrics from agent metrics API
  const totalProperties = agentMetrics?.totalProperties || 0;
  const totalViews = agentMetrics?.totalViews || 0;
  const totalInquiries = agentMetrics?.totalInquiries || 0;
  const aiCredits = agentMetrics?.aiCredits || 500;
  const conversionRate = totalViews > 0 ? ((totalInquiries / totalViews) * 100).toFixed(1) : 0;
  
  const urgentInquiries = inquiries?.filter((inq: any) => inq.priority === 'high')?.length || 0;
  const pendingInquiries = inquiries?.filter((inq: any) => inq.status === 'pending')?.length || 0;

  const unreadNotifications = notifications?.filter((notif: any) => !notif.isRead)?.length || 0;

  const inquiriesByStatus: Record<string, number> = {};
  inquiries?.forEach((inquiry: any) => {
    inquiriesByStatus[inquiry.status] = (inquiriesByStatus[inquiry.status] || 0) + 1;
  });
  
  const inquiryChartData = Object.entries(inquiriesByStatus).map(([status, count]) => ({
    status,
    count,
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AgentHeader />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Business Intelligence Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Real-time analytics, financial management, and client insights</p>
          </div>
          <div className="flex items-center gap-4">
            {unreadNotifications > 0 && (
              <div className="relative">
                <Bell className="w-6 h-6 text-gray-600" />
                <Badge className="absolute -top-2 -right-2 px-1 min-w-[1.2rem] h-5 text-xs">
                  {unreadNotifications}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-total-properties">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProperties}</div>
              <p className="text-xs text-muted-foreground">Active listings</p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-views">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">This {selectedPeriod}</p>
            </CardContent>
          </Card>

          <Card data-testid="card-inquiries">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inquiries</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalInquiries}</div>
              <p className="text-xs text-muted-foreground">{conversionRate}% conversion rate</p>
            </CardContent>
          </Card>

          <Card data-testid="card-ai-credits">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Credits</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aiCredits}</div>
              <p className="text-xs text-muted-foreground">5 credits per listing</p>
            </CardContent>
          </Card>
        </div>

        {/* Alert Cards */}
        {(urgentInquiries > 0 || pendingInquiries > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {urgentInquiries > 0 && (
              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <CardHeader className="pb-2">
                  <CardTitle className="text-red-800 dark:text-red-200 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Urgent Inquiries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{urgentInquiries}</div>
                  <p className="text-sm text-red-700 dark:text-red-300">Require immediate attention</p>
                </CardContent>
              </Card>
            )}
            
            {pendingInquiries > 0 && (
              <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                <CardHeader className="pb-2">
                  <CardTitle className="text-yellow-800 dark:text-yellow-200 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Pending Inquiries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{pendingInquiries}</div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">Awaiting response</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="properties" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="properties" data-testid="tab-properties">Properties</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
            <TabsTrigger value="inquiries" data-testid="tab-inquiries">Inquiries</TabsTrigger>
            <TabsTrigger value="financial" data-testid="tab-financial">Financial</TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">Calendar</TabsTrigger>
            <TabsTrigger value="tools" data-testid="tab-tools">Tools</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <Select value={selectedPeriod} onValueChange={(value: 'month' | 'quarter' | 'year') => setSelectedPeriod(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="quarter">Quarterly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Listing Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Listing Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Properties</p>
                        <p className="text-2xl font-bold">{totalProperties}</p>
                      </div>
                      <Home className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Views</p>
                        <p className="text-2xl font-bold">{totalViews}</p>
                      </div>
                      <Eye className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="flex justify-between items-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Inquiries</p>
                        <p className="text-2xl font-bold">{totalInquiries}</p>
                      </div>
                      <MessageSquare className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Inquiry Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChartIcon className="w-5 h-5 mr-2" />
                    Inquiry Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={inquiryChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {inquiryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Listing Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Listing Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded">
                      <span className="text-sm font-medium">Online</span>
                      <span className="text-lg font-bold text-green-600">{statusCounts.online}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm font-medium">Offline</span>
                      <span className="text-lg font-bold text-gray-600">{statusCounts.offline}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded">
                      <span className="text-sm font-medium">Drafts</span>
                      <span className="text-lg font-bold text-yellow-600">{statusCounts.draft}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded">
                      <span className="text-sm font-medium">Expired</span>
                      <span className="text-lg font-bold text-red-600">{statusCounts.expired}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Credits & Capacity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Credits & Capacity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Available Credits</span>
                    <span className="text-lg font-bold text-primary">{aiCredits}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Can Post</span>
                    <span className="text-lg font-bold text-green-600">{Math.floor(aiCredits / 5)} listings</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-medium">Conversion Rate</span>
                      <span className="text-xl font-bold text-blue-600">
                        {conversionRate}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Inquiries / Views</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Listings</h2>
                <p className="text-gray-600">Manage your property listings</p>
              </div>
              <Button 
                onClick={() => window.location.href = '/agent/create-listing'} 
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-create-listing"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create listing
              </Button>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant={selectedStatus === 'online' ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedStatus('online');
                  setCurrentPage(1);
                }}
                className={selectedStatus === 'online' ? 'bg-blue-600' : ''}
                data-testid="button-status-online"
              >
                Online ({statusCounts.online})
              </Button>
              <Button
                variant={selectedStatus === 'draft' ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedStatus('draft');
                  setCurrentPage(1);
                }}
                className={selectedStatus === 'draft' ? 'bg-blue-600' : ''}
                data-testid="button-status-draft"
              >
                Draft ({statusCounts.draft})
              </Button>
              <Button
                variant={selectedStatus === 'offline' ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedStatus('offline');
                  setCurrentPage(1);
                }}
                className={selectedStatus === 'offline' ? 'bg-blue-600' : ''}
                data-testid="button-status-offline"
              >
                Offline ({statusCounts.offline})
              </Button>
              <Button
                variant={selectedStatus === 'expired' ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedStatus('expired');
                  setCurrentPage(1);
                }}
                className={selectedStatus === 'expired' ? 'bg-blue-600' : ''}
                data-testid="button-status-expired"
              >
                Expired ({statusCounts.expired})
              </Button>
            </div>

            {/* Property Listings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    All Listings
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by title or address..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-listings"
                    />
                  </div>

                  {/* Listing Type Filter Buttons */}
                  {agentProperties && agentProperties.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant={selectedListingType === 'rent' ? 'default' : 'outline'}
                        onClick={() => setSelectedListingType('rent')}
                        className={selectedListingType === 'rent' ? 'bg-blue-600' : ''}
                        data-testid="button-filter-rent"
                      >
                        Rent ({agentProperties.filter((p: any) => p.listingType === 'rent').length})
                      </Button>
                      <Button
                        variant={selectedListingType === 'sale' ? 'default' : 'outline'}
                        onClick={() => setSelectedListingType('sale')}
                        className={selectedListingType === 'sale' ? 'bg-blue-600' : ''}
                        data-testid="button-filter-sale"
                      >
                        Sale ({agentProperties.filter((p: any) => p.listingType === 'sale').length})
                      </Button>
                    </div>
                  )}

                  {propertiesLoading ? (
                    <div className="text-center py-8">Loading properties...</div>
                  ) : agentProperties && agentProperties.length > 0 ? (
                    <>
                      <div className="grid gap-4">
                        {(() => {
                          // Apply local filters (search and listing type) since server only handles status filter
                          const filteredProperties = agentProperties.filter((property: any) => {
                            // Search filter
                            if (searchQuery) {
                              const query = searchQuery.toLowerCase();
                              const matchesSearch = (
                                property.title?.toLowerCase().includes(query) ||
                                property.address?.toLowerCase().includes(query) ||
                                property.city?.toLowerCase().includes(query)
                              );
                              if (!matchesSearch) return false;
                            }
                            
                            // Listing type filter
                            if (selectedListingType !== 'all' && property.listingType !== selectedListingType) {
                              return false;
                            }
                            
                            return true;
                          });
                          
                          return filteredProperties.map((property: any) => (
                        <div key={property.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-4">
                            {/* Main Photo */}
                            <div className="flex-shrink-0">
                              {property.images && property.images.length > 0 ? (
                                <img 
                                  src={property.images[0]} 
                                  alt={property.title}
                                  className="w-32 h-32 object-cover rounded-lg"
                                  data-testid={`img-property-${property.id}`}
                                />
                              ) : (
                                <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <Building className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            {/* Property Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-lg truncate">{property.title}</h4>
                              </div>
                              <p className="text-gray-600 text-sm mb-2">{property.location}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                                <span>{property.bedrooms} bed</span>
                                <span>{property.bathrooms} bath</span>
                                <span>{(property.builtUpSize || property.squareFootage)?.toLocaleString()} sqft</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {property.viewCount || 0} views
                                </span>
                                <span>Listed {property.postedAt ? new Date(property.postedAt).toLocaleDateString('en-GB') : new Date(property.createdAt).toLocaleDateString('en-GB')}</span>
                                {property.expiryDate && (
                                  <span>Expires {new Date(property.expiryDate).toLocaleDateString('en-GB')}</span>
                                )}
                              </div>
                              
                              {/* Action Links */}
                              <div className="flex items-center gap-4 text-sm">
                                <button
                                  onClick={() => setLocation(`/agent/properties/edit/${property.id}`)}
                                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                  data-testid={`button-edit-${property.id}`}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    console.log("Copy button clicked!");
                                    setSelectedPropertyForCopy(property.id);
                                    setCopyConfirmOpen(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                  data-testid={`button-copy-${property.id}`}
                                  disabled={clonePropertyMutation.isPending}
                                >
                                  Copy
                                </button>
                                {property.status === 'online' && (
                                  <button
                                    onClick={() => {
                                      setSelectedPropertyForOffline(property);
                                      setOfflineConfirmOpen(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                    data-testid={`button-offline-${property.id}`}
                                  >
                                    Offline
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {/* Price and Actions */}
                            <div className="text-right flex-shrink-0">
                              <div className="text-2xl font-bold text-green-600 mb-2">
                                RM {parseFloat(property.price || 0).toLocaleString()}
                                <span className="text-sm text-gray-500 font-normal">
                                  {property.listingType === 'rent' ? '/month' : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {property.status === 'online' ? (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="default"
                                      onClick={() => {
                                        setSelectedPropertyForReadvertise(property.id);
                                        setReadvertiseConfirmOpen(true);
                                      }}
                                      data-testid={`button-readvertise-${property.id}`}
                                      disabled={readvertisePropertyMutation.isPending}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      Repost (3)
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="default"
                                      onClick={() => {
                                        setSelectedPropertyForBoost(property);
                                        setBoostConfirmOpen(true);
                                      }}
                                      data-testid={`button-boost-${property.id}`}
                                      disabled={boostPropertyMutation.isPending || (property.featured && property.featuredUntil && new Date(property.featuredUntil) > new Date())}
                                      className="bg-yellow-600 hover:bg-yellow-700"
                                      title={property.featured && property.featuredUntil && new Date(property.featuredUntil) > new Date() ? 'Already featured' : 'Feature boost for 7 days'}
                                    >
                                      ⭐ Boost (5)
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="default"
                                      onClick={() => {
                                        setSelectedPropertyForRefresh(property);
                                        setRefreshConfirmOpen(true);
                                      }}
                                      data-testid={`button-refresh-${property.id}`}
                                      disabled={refreshPropertyMutation.isPending || (property.lastRefreshedAt && (new Date().getTime() - new Date(property.lastRefreshedAt).getTime()) < 24 * 60 * 60 * 1000)}
                                      className="bg-green-600 hover:bg-green-700"
                                      title={
                                        property.lastRefreshedAt && (new Date().getTime() - new Date(property.lastRefreshedAt).getTime()) < 24 * 60 * 60 * 1000
                                          ? `Cooldown: ${Math.ceil(24 - (new Date().getTime() - new Date(property.lastRefreshedAt).getTime()) / (1000 * 60 * 60))} hours remaining`
                                          : 'Refresh listing position'
                                      }
                                    >
                                      🔄 Refresh (1)
                                    </Button>
                                  </>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    onClick={() => {
                                      console.log("Post button clicked! Property ID:", property.id);
                                      console.log("Property status:", property.status);
                                      setSelectedPropertyForPost(property.id);
                                      setPostConfirmOpen(true);
                                      console.log("Post dialog should open now");
                                    }}
                                    data-testid={`button-post-${property.id}`}
                                    disabled={postPropertyMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Post
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                          ));
                        })()}
                      </div>
                      
                      {/* Pagination Controls */}
                      {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between border-t pt-4 mt-4">
                          <div className="text-sm text-gray-600">
                            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} listings
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={pagination.page === 1}
                              data-testid="button-previous-page"
                            >
                              <ArrowLeft className="w-4 h-4 mr-1" />
                              Previous
                            </Button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(pagination.totalPages, 10) }, (_, i) => {
                                // Show first 3, last 3, and current page with neighbors for large page counts
                                const pageNum = i + 1;
                                if (pagination.totalPages <= 10) {
                                  return (
                                    <Button
                                      key={pageNum}
                                      variant={pageNum === pagination.page ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setCurrentPage(pageNum)}
                                      className="min-w-[40px]"
                                      data-testid={`button-page-${pageNum}`}
                                    >
                                      {pageNum}
                                    </Button>
                                  );
                                }
                                return null;
                              }).filter(Boolean)}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                              disabled={pagination.page === pagination.totalPages}
                              data-testid="button-next-page"
                            >
                              Next
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No properties listed yet</p>
                      <p className="text-sm">Create your first property listing to get started</p>
                      <Button 
                        className="mt-4" 
                        onClick={() => setLocation('/agent/create-listing')}
                        data-testid="button-create-first-listing"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Listing
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inquiries Tab */}
          <TabsContent value="inquiries" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Recent Inquiries
                  </span>
                  <Badge variant="secondary">{inquiries?.length || 0} total</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {inquiriesLoading ? (
                    <div className="text-center py-8">Loading inquiries...</div>
                  ) : inquiries?.length > 0 ? (
                    inquiries.slice(0, 10).map((inquiry: any) => (
                      <div key={inquiry.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{inquiry.clientName}</span>
                            <Badge variant={inquiry.priority === 'high' ? 'destructive' : 'secondary'}>
                              {inquiry.priority}
                            </Badge>
                            <Badge variant="outline">{inquiry.status}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{inquiry.message}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {inquiry.clientEmail}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {inquiry.clientPhone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(inquiry.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">Reply</Button>
                          <Button size="sm">View Property</Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">No inquiries found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab - AI Credits */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Credits Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    AI Credits Balance
                  </CardTitle>
                  <CardDescription>
                    Credits are used when posting property listings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-primary mb-2">{aiCredits}</div>
                    <p className="text-sm text-muted-foreground">Available Credits</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm">Cost per listing</span>
                      <span className="font-medium">5 credits</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm">Listings you can post</span>
                      <span className="font-medium">{Math.floor(aiCredits / 5)} listings</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm">Draft listings</span>
                      <span className="font-medium">{statusCounts.draft} saved</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button className="w-full" variant="outline" data-testid="button-buy-credits">
                      <Zap className="w-4 h-4 mr-2" />
                      Buy More Credits
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Credits Usage Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Maximize Your Credits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Save drafts for free</h4>
                        <p className="text-sm text-muted-foreground">
                          Create and save listing drafts without spending credits. Credits are only deducted when you publish.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Update listings anytime</h4>
                        <p className="text-sm text-muted-foreground">
                          Edit your published listings as many times as needed at no additional cost.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Set listings offline</h4>
                        <p className="text-sm text-muted-foreground">
                          Credits are spent when posting and won't be refunded. Reactivate offline listings anytime at no extra cost.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Listings expire after 3 months</h4>
                        <p className="text-sm text-muted-foreground">
                          Published listings automatically expire after 90 days. Re-posting will cost 5 credits.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add Event Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CalendarDays className="w-5 h-5 mr-2" />
                    Schedule Event
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...eventForm}>
                    <form onSubmit={eventForm.handleSubmit((data) => addEventMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={eventForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Event title" {...field} data-testid="input-event-title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={eventForm.control}
                        name="eventType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-event-type">
                                  <SelectValue placeholder="Select event type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="viewing">Property Viewing</SelectItem>
                                <SelectItem value="meeting">Client Meeting</SelectItem>
                                <SelectItem value="call">Follow-up Call</SelectItem>
                                <SelectItem value="signing">Document Signing</SelectItem>
                                <SelectItem value="inspection">Property Inspection</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={eventForm.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Time</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} data-testid="input-event-start" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={eventForm.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Time</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} data-testid="input-event-end" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={eventForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input placeholder="Event location" {...field} data-testid="input-event-location" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={eventForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Event details..."
                                {...field}
                                data-testid="textarea-event-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={addEventMutation.isPending} data-testid="button-schedule-event">
                        {addEventMutation.isPending ? "Scheduling..." : "Schedule Event"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Upcoming Events */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Upcoming Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {calendarEvents?.slice(0, 5).map((event: any) => (
                      <div key={event.id} className="p-3 border rounded">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{event.title}</div>
                          <Badge variant="outline">{event.eventType}</Badge>
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{event.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(event.startTime).toLocaleString()}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                    )) || <div className="text-center py-4">No upcoming events</div>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Saved Searches */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Search className="w-5 h-5 mr-2" />
                    Saved Searches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {savedSearches?.map((search: any) => (
                      <div key={search.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{search.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{search.searchCriteria}</div>
                          <div className="text-xs text-gray-500">
                            Last used: {new Date(search.lastUsed).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {search.alertEnabled && (
                            <Badge variant="secondary">
                              <Bell className="w-3 h-3 mr-1" />
                              Alert
                            </Badge>
                          )}
                          <Button size="sm" variant="outline">Run</Button>
                        </div>
                      </div>
                    )) || <div className="text-center py-4">No saved searches</div>}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" data-testid="button-export-data">
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                  <Button className="w-full justify-start" variant="outline" data-testid="button-generate-report">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button className="w-full justify-start" variant="outline" data-testid="button-sync-calendar">
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Sync Calendar
                  </Button>
                  <Button className="w-full justify-start" variant="outline" data-testid="button-backup-data">
                    <Building className="w-4 h-4 mr-2" />
                    Backup Data
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Dashboard Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Notification Preferences</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="email-notifications" defaultChecked />
                        <Label htmlFor="email-notifications">Email notifications</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="sms-notifications" />
                        <Label htmlFor="sms-notifications">SMS notifications</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="push-notifications" defaultChecked />
                        <Label htmlFor="push-notifications">Push notifications</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Dashboard Layout</Label>
                    <Select defaultValue="default">
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default Layout</SelectItem>
                        <SelectItem value="compact">Compact Layout</SelectItem>
                        <SelectItem value="expanded">Expanded Layout</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Default Time Period</Label>
                    <Select defaultValue="month">
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">Weekly</SelectItem>
                        <SelectItem value="month">Monthly</SelectItem>
                        <SelectItem value="quarter">Quarterly</SelectItem>
                        <SelectItem value="year">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button data-testid="button-save-settings">Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Readvertise Confirmation Dialog */}
      {readvertiseConfirmOpen && createPortal(
        <div 
          style={{ 
            position: 'absolute', 
            top: `${window.scrollY}px`,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999, 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }} 
          onClick={() => {
            console.log("Readvertise modal backdrop clicked");
            setReadvertiseConfirmOpen(false);
            setSelectedPropertyForReadvertise(null);
          }}
        >
          <div 
            style={{ 
              position: 'relative',
              backgroundColor: 'white', 
              borderRadius: '8px', 
              padding: '24px', 
              maxWidth: '28rem', 
              width: '100%',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              maxHeight: '90vh',
              overflow: 'auto'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">Repost Listing</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Reposting will update your listing's posting date to today and extend expiry by 3 months, moving it to the top of search results.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800">
                  Cost: 3 AI Credits
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Current balance: {aiCredits} credits
                </p>
                <p className="text-sm text-blue-700">
                  Remaining after: {Math.max(0, aiCredits - 3)} credits
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  * Credits are non-refundable
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReadvertiseConfirmOpen(false);
                    setSelectedPropertyForReadvertise(null);
                  }}
                  data-testid="button-cancel-readvertise"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    if (selectedPropertyForReadvertise) {
                      readvertisePropertyMutation.mutate(selectedPropertyForReadvertise);
                    }
                    setReadvertiseConfirmOpen(false);
                    setSelectedPropertyForReadvertise(null);
                  }}
                  disabled={readvertisePropertyMutation.isPending}
                  data-testid="button-confirm-readvertise"
                >
                  Confirm Readvertise
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Feature Boost Confirmation Dialog */}
      {boostConfirmOpen && createPortal(
        <div 
          style={{ 
            position: 'absolute', 
            top: `${window.scrollY}px`,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999, 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }} 
          onClick={() => {
            setBoostConfirmOpen(false);
            setSelectedPropertyForBoost(null);
          }}
        >
          <div 
            style={{ 
              position: 'relative',
              backgroundColor: 'white', 
              borderRadius: '8px', 
              padding: '24px', 
              maxWidth: '28rem', 
              width: '100%',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              maxHeight: '90vh',
              overflow: 'auto'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">⭐ Feature Boost Listing</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Boost your listing to the top of all search results for 7 days with a prominent FEATURED badge and gold border!
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-medium text-yellow-800">
                  Cost: 5 AI Credits
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Current balance: {aiCredits} credits
                </p>
                <p className="text-sm text-yellow-700">
                  Remaining after: {Math.max(0, aiCredits - 5)} credits
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  * Featured for 7 days · Credits are non-refundable
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBoostConfirmOpen(false);
                    setSelectedPropertyForBoost(null);
                  }}
                  data-testid="button-cancel-boost"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-yellow-600 hover:bg-yellow-700"
                  onClick={() => {
                    if (selectedPropertyForBoost) {
                      boostPropertyMutation.mutate(selectedPropertyForBoost.id);
                    }
                    setBoostConfirmOpen(false);
                    setSelectedPropertyForBoost(null);
                  }}
                  disabled={boostPropertyMutation.isPending}
                  data-testid="button-confirm-boost"
                >
                  Confirm Boost
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Refresh Confirmation Dialog */}
      {refreshConfirmOpen && createPortal(
        <div 
          style={{ 
            position: 'absolute', 
            top: `${window.scrollY}px`,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999, 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }} 
          onClick={() => {
            setRefreshConfirmOpen(false);
            setSelectedPropertyForRefresh(null);
          }}
        >
          <div 
            style={{ 
              position: 'relative',
              backgroundColor: 'white', 
              borderRadius: '8px', 
              padding: '24px', 
              maxWidth: '28rem', 
              width: '100%',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              maxHeight: '90vh',
              overflow: 'auto'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">🔄 Refresh Listing</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Refresh your listing to move it back to the top of search results without changing the posted date.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800">
                  Cost: 1 AI Credit
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Current balance: {aiCredits} credits
                </p>
                <p className="text-sm text-green-700">
                  Remaining after: {Math.max(0, aiCredits - 1)} credits
                </p>
                <p className="text-xs text-green-600 mt-2">
                  * 24-hour cooldown applies · Credits are non-refundable
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRefreshConfirmOpen(false);
                    setSelectedPropertyForRefresh(null);
                  }}
                  data-testid="button-cancel-refresh"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    if (selectedPropertyForRefresh) {
                      refreshPropertyMutation.mutate(selectedPropertyForRefresh.id);
                    }
                    setRefreshConfirmOpen(false);
                    setSelectedPropertyForRefresh(null);
                  }}
                  disabled={refreshPropertyMutation.isPending}
                  data-testid="button-confirm-refresh"
                >
                  Confirm Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Post Confirmation Dialog */}
      {postConfirmOpen && createPortal(
        <div 
          style={{ 
            position: 'absolute', 
            top: `${window.scrollY}px`,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999, 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }} 
          onClick={() => {
            setPostConfirmOpen(false);
            setSelectedPropertyForPost(null);
          }}
        >
          <div 
            style={{ 
              position: 'relative',
              backgroundColor: 'white', 
              borderRadius: '8px', 
              padding: '24px', 
              maxWidth: '28rem', 
              width: '100%',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              maxHeight: '90vh',
              overflow: 'auto'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">Post Listing</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to post this listing? It will become visible to all potential clients and appear in search results.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800">
                  ✓ No credits required
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Your listing will be set to "Online" status
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPostConfirmOpen(false);
                    setSelectedPropertyForPost(null);
                  }}
                  data-testid="button-cancel-post"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    if (selectedPropertyForPost) {
                      postPropertyMutation.mutate(selectedPropertyForPost);
                    }
                    setPostConfirmOpen(false);
                    setSelectedPropertyForPost(null);
                  }}
                  disabled={postPropertyMutation.isPending}
                  data-testid="button-confirm-post"
                >
                  Yes, Post Listing
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Copy Confirmation Dialog */}
      {copyConfirmOpen && createPortal(
        <div 
          style={{ 
            position: 'absolute', 
            top: `${window.scrollY}px`,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999, 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }} 
          onClick={() => {
            console.log("Copy modal backdrop clicked");
            setCopyConfirmOpen(false);
            setSelectedPropertyForCopy(null);
          }}
        >
          <div 
            style={{ 
              position: 'relative',
              backgroundColor: 'white', 
              borderRadius: '8px', 
              padding: '24px', 
              maxWidth: '28rem', 
              width: '100%',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              maxHeight: '90vh',
              overflow: 'auto'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">Copy Listing</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                This will create a copy of your listing as a draft. You can edit and publish it later from the Draft tab.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800">
                  The cloned listing will be saved as Draft
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  You can find it in the Draft tab and publish it when ready
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCopyConfirmOpen(false);
                    setSelectedPropertyForCopy(null);
                  }}
                  data-testid="button-cancel-copy"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedPropertyForCopy) {
                      clonePropertyMutation.mutate(selectedPropertyForCopy);
                    }
                    setCopyConfirmOpen(false);
                    setSelectedPropertyForCopy(null);
                  }}
                  disabled={clonePropertyMutation.isPending}
                  data-testid="button-confirm-copy"
                >
                  Confirm Copy
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Offline Confirmation Dialog */}
      {offlineConfirmOpen && createPortal(
        <div 
          style={{ 
            position: 'absolute', 
            top: `${window.scrollY}px`,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999, 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }} 
          onClick={() => {
            console.log("Offline modal backdrop clicked");
            setOfflineConfirmOpen(false);
            setSelectedPropertyForOffline(null);
          }}
        >
          <div 
            style={{ 
              position: 'relative',
              backgroundColor: 'white', 
              borderRadius: '8px', 
              padding: '24px', 
              maxWidth: '28rem', 
              width: '100%',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              maxHeight: '90vh',
              overflow: 'auto'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">Move Listing Offline</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Moving this listing offline will hide it from all search results and public listings.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm font-medium text-orange-800">
                  This listing will no longer be visible to potential buyers
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  You can move it back online anytime from the Offline tab
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOfflineConfirmOpen(false);
                    setSelectedPropertyForOffline(null);
                  }}
                  data-testid="button-cancel-offline"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedPropertyForOffline) {
                      handleStatusChange(selectedPropertyForOffline, 'offline');
                    }
                    setOfflineConfirmOpen(false);
                    setSelectedPropertyForOffline(null);
                  }}
                  data-testid="button-confirm-offline"
                >
                  Move Offline
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}