import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AdminDashboardStats, User, UserRole, Sale, UserDetails, Customer, Office, OfficeAssignment } from "@shared/schema";
import { format } from "date-fns";
import { UserPlus, Users as UsersIcon, Trash2, Edit, DollarSign, Eye, Sparkles, Loader2, Award, Medal, Trophy, TrendingUp, Building2, Plus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [allUsersOpen, setAllUsersOpen] = useState(true);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    name: "",
    role: "salesman" as UserRole,
    managerId: "",
    regionalOffice: "",
  });
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Omit<User, 'password'> | null>(null);
  const [editUserData, setEditUserData] = useState({
    username: "",
    password: "",
    name: "",
    role: "salesman" as UserRole,
    managerId: "",
    regionalOffice: "",
  });
  const [editSaleDialog, setEditSaleDialog] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editSaleData, setEditSaleData] = useState({
    customerName: "",
    product: "",
    amount: "",
    date: "",
  });
  const [aiSummaryDialog, setAiSummaryDialog] = useState(false);
  const [selectedUserForAI, setSelectedUserForAI] = useState<Omit<User, 'password'> | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  
  // User list filters
  const [userNameFilter, setUserNameFilter] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userOfficeFilter, setUserOfficeFilter] = useState<string>("all");
  const [userManagerFilter, setUserManagerFilter] = useState<string>("all");

  // Customer assignments filters
  const [customerSalesmanFilter, setCustomerSalesmanFilter] = useState<string>("all");
  const [customerNameFilter, setCustomerNameFilter] = useState("");
  const [customerOfficeFilter, setCustomerOfficeFilter] = useState<string>("all");

  // Comparative analytics state
  const [selectedRegion1, setSelectedRegion1] = useState<string>("all");
  const [selectedRegion2, setSelectedRegion2] = useState<string>("all");
  const [selectedRep1, setSelectedRep1] = useState<string>("all");
  const [selectedRep2, setSelectedRep2] = useState<string>("all");

  // Office management state
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);
  const [assignUserDialogOpen, setAssignUserDialogOpen] = useState(false);
  const [assignmentUserId, setAssignmentUserId] = useState<string>("");
  const [assignmentRoleType, setAssignmentRoleType] = useState<string>("salesman");

  const { data: stats, isLoading: isLoadingStats } = useQuery<AdminDashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: allUsers = [] } = useQuery<Omit<User, 'password'>[]>({
    queryKey: ["/api/users"],
  });

  const { data: allSales = [] } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: userDetails, isLoading: isLoadingUserDetails } = useQuery<UserDetails>({
    queryKey: ["/api/admin/user-details", selectedUserId],
    enabled: !!selectedUserId && userDetailsOpen,
  });

  // Office queries
  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ["/api/offices"],
  });

  const { data: officeUsers = [] } = useQuery<(User & { roleType: string })[]>({
    queryKey: ["/api/offices", selectedOffice, "users"],
    enabled: !!selectedOffice,
  });

  const { data: allAssignments = [] } = useQuery<(OfficeAssignment & { userName?: string; officeName?: string })[]>({
    queryKey: ["/api/office-assignments"],
  });

  const managers = allUsers.filter(u => u.role === "sales_director" || u.role === "regional_manager" || u.role === "manager");

  // Comparative analytics data
  const regions = useMemo(() => {
    const uniqueRegions = new Set(customers.map(c => c.country).filter((c): c is string => c !== null && c !== undefined));
    return Array.from(uniqueRegions).sort();
  }, [customers]);

  const salesReps = useMemo(() => {
    return allUsers.filter(u => u.role === "salesman" || u.role === "manager");
  }, [allUsers]);

  // Filtered customers for Assignments tab
  const filteredCustomersForAssignments = useMemo(() => {
    return customers.filter(customer => {
      // Salesman filter
      if (customerSalesmanFilter === "unassigned") {
        if (customer.assignedTo) return false;
      } else if (customerSalesmanFilter !== "all" && customer.assignedTo !== customerSalesmanFilter) {
        return false;
      }
      // Name filter
      if (customerNameFilter && !customer.name.toLowerCase().includes(customerNameFilter.toLowerCase())) {
        return false;
      }
      // Office filter
      if (customerOfficeFilter !== "all" && customer.officeId !== customerOfficeFilter) {
        return false;
      }
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, customerSalesmanFilter, customerNameFilter, customerOfficeFilter]);

  // Get office by ID helper
  const getOfficeById = (id: string) => offices.find(o => o.id === id);

  const regionalComparison = useMemo(() => {
    const getRegionStats = (region: string) => {
      const regionCustomers = region === "all" 
        ? customers 
        : customers.filter(c => c.country === region);
      
      return {
        totalCustomers: regionCustomers.length,
        leads: regionCustomers.filter(c => c.stage === "lead").length,
        prospects: regionCustomers.filter(c => c.stage === "prospect").length,
        customers: regionCustomers.filter(c => c.stage === "customer").length,
        avgTarget: regionCustomers.reduce((sum, c) => sum + (Number(c.quarterlySoftTargetBaseCurrency) || 0), 0) / (regionCustomers.length || 1),
        conversionRate: regionCustomers.filter(c => c.stage === "customer").length / (regionCustomers.length || 1) * 100,
      };
    };

    const region1Stats = getRegionStats(selectedRegion1);
    const region2Stats = getRegionStats(selectedRegion2);

    return [
      {
        metric: "Total Customers",
        [selectedRegion1 === "all" ? "All Regions" : selectedRegion1]: region1Stats.totalCustomers,
        [selectedRegion2 === "all" ? "All Regions" : selectedRegion2]: region2Stats.totalCustomers,
      },
      {
        metric: "Leads",
        [selectedRegion1 === "all" ? "All Regions" : selectedRegion1]: region1Stats.leads,
        [selectedRegion2 === "all" ? "All Regions" : selectedRegion2]: region2Stats.leads,
      },
      {
        metric: "Prospects",
        [selectedRegion1 === "all" ? "All Regions" : selectedRegion1]: region1Stats.prospects,
        [selectedRegion2 === "all" ? "All Regions" : selectedRegion2]: region2Stats.prospects,
      },
      {
        metric: "Customers",
        [selectedRegion1 === "all" ? "All Regions" : selectedRegion1]: region1Stats.customers,
        [selectedRegion2 === "all" ? "All Regions" : selectedRegion2]: region2Stats.customers,
      },
    ];
  }, [customers, selectedRegion1, selectedRegion2]);

  const repComparison = useMemo(() => {
    const getRepStats = (repId: string) => {
      const repCustomers = repId === "all" 
        ? customers 
        : customers.filter(c => c.assignedTo === repId);
      
      const repInteractions = 0; // Interactions are fetched separately
      
      return {
        totalCustomers: repCustomers.length,
        leads: repCustomers.filter(c => c.stage === "lead").length,
        prospects: repCustomers.filter(c => c.stage === "prospect").length,
        customers: repCustomers.filter(c => c.stage === "customer").length,
        interactions: repInteractions,
        conversionRate: repCustomers.filter(c => c.stage === "customer").length / (repCustomers.length || 1) * 100,
      };
    };

    const rep1Stats = getRepStats(selectedRep1);
    const rep2Stats = getRepStats(selectedRep2);

    const rep1Name = selectedRep1 === "all" ? "All Reps" : allUsers.find(u => u.id === selectedRep1)?.name || "Rep 1";
    const rep2Name = selectedRep2 === "all" ? "All Reps" : allUsers.find(u => u.id === selectedRep2)?.name || "Rep 2";

    return [
      {
        metric: "Total Customers",
        [rep1Name]: rep1Stats.totalCustomers,
        [rep2Name]: rep2Stats.totalCustomers,
      },
      {
        metric: "Active Customers",
        [rep1Name]: rep1Stats.customers,
        [rep2Name]: rep2Stats.customers,
      },
      {
        metric: "Prospects",
        [rep1Name]: rep1Stats.prospects,
        [rep2Name]: rep2Stats.prospects,
      },
      {
        metric: "Leads",
        [rep1Name]: rep1Stats.leads,
        [rep2Name]: rep2Stats.leads,
      },
      {
        metric: "Interactions",
        [rep1Name]: rep1Stats.interactions,
        [rep2Name]: rep2Stats.interactions,
      },
    ];
  }, [customers, allUsers, selectedRep1, selectedRep2]);

  const getUserById = (userId: string | null) => {
    if (!userId) return null;
    return allUsers.find(u => u.id === userId);
  };

  const getRoleDisplayName = (role: UserRole): string => {
    switch (role) {
      case "ceo":
        return "CEO";
      case "sales_director":
        return "Sales Director";
      case "marketing_director":
        return "Marketing Director";
      case "regional_manager":
        return "Regional Manager";
      case "manager":
        return "Manager";
      case "salesman":
        return "Salesman";
      default:
        return role;
    }
  };
  
  const getRoleRank = (role: UserRole): number => {
    switch (role) {
      case "ceo": return 6;
      case "sales_director": return 5;
      case "marketing_director": return 5;
      case "regional_manager": return 4;
      case "manager": return 3;
      case "salesman": return 1;
      default: return 0;
    }
  };
  
  // Get unique regional offices
  const regionalOffices = Array.from(new Set(allUsers.map(u => u.regionalOffice).filter(Boolean))) as string[];
  
  // Filter and sort users
  const filteredUsers = allUsers
    .filter(user => {
      // Name filter
      if (userNameFilter && !user.name.toLowerCase().includes(userNameFilter.toLowerCase())) {
        return false;
      }
      
      // Role filter
      if (userRoleFilter !== "all" && user.role !== userRoleFilter) {
        return false;
      }
      
      // Regional office filter
      if (userOfficeFilter !== "all" && user.regionalOffice !== userOfficeFilter) {
        return false;
      }
      
      // Manager filter
      if (userManagerFilter !== "all" && user.managerId !== userManagerFilter) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by role rank (highest to lowest)
      const rankDiff = getRoleRank(b.role as UserRole) - getRoleRank(a.role as UserRole);
      if (rankDiff !== 0) return rankDiff;
      
      // Then by name
      return a.name.localeCompare(b.name);
    });
  
  // Calculate select-all checkbox state
  const selectableFilteredUserIds = filteredUsers
    .filter(u => u.id !== currentUser?.id)
    .map(u => u.id);
  const allFilteredSelected = selectableFilteredUserIds.length > 0 && 
    selectableFilteredUserIds.every(id => selectedUserIds.includes(id));
  const someFilteredSelected = selectableFilteredUserIds.some(id => selectedUserIds.includes(id));
  const isIndeterminate = someFilteredSelected && !allFilteredSelected;

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const requestData = {
        ...userData,
        managerId: userData.role === "salesman" && userData.managerId ? userData.managerId : undefined,
        regionalOffice: userData.regionalOffice || undefined,
      };
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setNewUser({ username: "", password: "", name: "", role: "salesman", managerId: "", regionalOffice: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(newUser);
  };

  const handleEditUser = (user: Omit<User, 'password'>) => {
    setEditingUser(user);
    setEditUserData({
      username: user.username,
      password: "", // Leave empty - only update if user enters new password
      name: user.name,
      role: user.role as UserRole,
      managerId: user.managerId || "",
      regionalOffice: user.regionalOffice || "",
    });
    setEditUserOpen(true);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    editUserMutation.mutate({ id: editingUser.id, data: editUserData });
  };

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editUserData }) => {
      const requestData: any = {
        username: data.username,
        name: data.name,
        role: data.role,
        // Always include managerId: set to actual value for salesman, null for others to clear stale assignments
        managerId: data.role === "salesman" && data.managerId ? data.managerId : null,
        regionalOffice: data.regionalOffice || undefined,
      };
      
      // Only include password if it was changed (not empty)
      if (data.password) {
        requestData.password = data.password;
      }
      
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to update user");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setEditUserOpen(false);
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteUsersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      return await apiRequest("POST", "/api/users/bulk-delete", { ids: userIds });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: `${data.deletedCount} user(s) deleted successfully`,
      });
      setSelectedUserIds([]);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete users",
        variant: "destructive",
      });
    },
  });

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleAllUsers = () => {
    const selectableUsers = filteredUsers.filter(u => u.id !== currentUser?.id);
    const allFilteredSelected = selectableUsers.every(u => selectedUserIds.includes(u.id));
    
    if (allFilteredSelected) {
      // Deselect all filtered users
      setSelectedUserIds(prev => prev.filter(id => !selectableUsers.some(u => u.id === id)));
    } else {
      // Select all filtered users (add to existing selections)
      const newSelections = selectableUsers.map(u => u.id);
      setSelectedUserIds(prev => Array.from(new Set([...prev, ...newSelections])));
    }
  };

  const updateSaleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/sales/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sale updated successfully",
      });
      setEditSaleDialog(false);
      setEditingSale(null);
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sale",
        variant: "destructive",
      });
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (saleId: string) => {
      return await apiRequest("DELETE", `/api/sales/${saleId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sale deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sale",
        variant: "destructive",
      });
    },
  });

  const generateUserAISummaryMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/ai/user-performance/${userId}`);
      return response.json();
    },
    onSuccess: (data) => {
      setAiSummary(data.summary);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate AI summary",
        variant: "destructive",
      });
    },
  });

  // Office assignment mutations
  const assignUserToOfficeMutation = useMutation({
    mutationFn: async ({ userId, officeId, roleType }: { userId: string; officeId: string; roleType: string }) => {
      return await apiRequest("POST", "/api/office-assignments", { userId, officeId, roleType });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User assigned to office successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/office-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/offices"] });
      setAssignUserDialogOpen(false);
      setAssignmentUserId("");
      setAssignmentRoleType("salesman");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign user to office",
        variant: "destructive",
      });
    },
  });

  const removeUserFromOfficeMutation = useMutation({
    mutationFn: async ({ userId, officeId }: { userId: string; officeId: string }) => {
      return await apiRequest("DELETE", "/api/office-assignments", { userId, officeId });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User removed from office",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/office-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/offices"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user from office",
        variant: "destructive",
      });
    },
  });

  const handleGenerateUserAISummary = (user: Omit<User, 'password'>) => {
    setSelectedUserForAI(user);
    setAiSummary(null);
    setAiSummaryDialog(true);
    generateUserAISummaryMutation.mutate(user.id);
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setEditSaleData({
      customerName: sale.customerName,
      product: sale.product,
      amount: sale.amount,
      date: new Date(sale.date).toISOString().split('T')[0],
    });
    setEditSaleDialog(true);
  };

  const handleUpdateSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    updateSaleMutation.mutate({
      id: editingSale.id,
      data: editSaleData,
    });
  };

  if (isLoadingStats) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          {currentUser?.role === "sales_director" || currentUser?.role === "ceo" ? "Manage all users and view company-wide statistics" : "Manage your team and view team statistics"}
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full max-w-xl grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-admin-overview">Overview</TabsTrigger>
          <TabsTrigger value="assignments" data-testid="tab-admin-assignments">Assignments</TabsTrigger>
          <TabsTrigger value="offices" data-testid="tab-admin-offices">Offices</TabsTrigger>
          <TabsTrigger value="comparative" data-testid="tab-admin-comparative">Comparative</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Sales</CardTitle>
            <CardDescription>
              {currentUser?.role === "sales_director" || currentUser?.role === "ceo" ? "All sales across all team members" : "Sales from your team"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold" data-testid="text-admin-total-sales">
              {stats?.totalSales || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
            <CardDescription>
              {currentUser?.role === "sales_director" || currentUser?.role === "ceo" ? "Total revenue across all team members" : "Revenue from your team"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold" data-testid="text-admin-total-revenue">
              ${stats?.totalRevenue || "0.00"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Collapsible open={allUsersOpen} onOpenChange={setAllUsersOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover-elevate">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UsersIcon className="h-5 w-5" />
                    All Users
                  </CardTitle>
                  <CardDescription>Manage system users</CardDescription>
                </div>
                <Button variant="ghost" size="sm" data-testid="button-toggle-all-users">
                  {allUsersOpen ? "Hide" : "Show"}
                </Button>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardHeader className="pt-0">
              <div className="flex items-center justify-end flex-wrap gap-4">
            {selectedUserIds.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    data-testid="button-delete-selected-users"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedUserIds.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Selected Users</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {selectedUserIds.length} user(s)? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => bulkDeleteUsersMutation.mutate(selectedUserIds)}
                      data-testid="button-confirm-bulk-delete"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-name-filter">Search by Name</Label>
                <Input
                  id="user-name-filter"
                  placeholder="Filter by name..."
                  value={userNameFilter}
                  onChange={(e) => setUserNameFilter(e.target.value)}
                  data-testid="input-filter-user-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user-role-filter">Filter by Position</Label>
                <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                  <SelectTrigger id="user-role-filter" data-testid="select-filter-user-role">
                    <SelectValue placeholder="All positions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    <SelectItem value="ceo">CEO</SelectItem>
                    <SelectItem value="sales_director">Sales Director</SelectItem>
                    <SelectItem value="marketing_director">Marketing Director</SelectItem>
                    <SelectItem value="regional_manager">Regional Manager</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="salesman">Salesman</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user-office-filter">Filter by Office</Label>
                <Select value={userOfficeFilter} onValueChange={setUserOfficeFilter}>
                  <SelectTrigger id="user-office-filter" data-testid="select-filter-user-office">
                    <SelectValue placeholder="All offices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Offices</SelectItem>
                    {regionalOffices.map(office => (
                      <SelectItem key={office} value={office}>{office}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user-manager-filter">Filter by Manager</Label>
                <Select value={userManagerFilter} onValueChange={setUserManagerFilter}>
                  <SelectTrigger id="user-manager-filter" data-testid="select-filter-user-manager">
                    <SelectValue placeholder="All managers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {managers.map(manager => (
                      <SelectItem key={manager.id} value={manager.id}>{manager.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Showing {filteredUsers.length} of {allUsers.length} users
            </div>
          </div>
          
          {allUsers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No users found
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 mt-4">
              No users match the current filters
            </div>
          ) : (
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={toggleAllUsers}
                      data-testid="checkbox-select-all-users"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Regional Office</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const managerUser = user.managerId ? getUserById(user.managerId) : null;
                  const isCurrentUser = user.id === currentUser?.id;
                  return (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUserIds.includes(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                          disabled={isCurrentUser}
                          data-testid={`checkbox-user-${user.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-user-name-${user.id}`}>
                        {user.name}
                      </TableCell>
                      <TableCell data-testid={`text-user-username-${user.id}`}>
                        {user.username}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-user-role-${user.id}`}>
                          {getRoleDisplayName(user.role as UserRole)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-user-regional-office-${user.id}`}>
                        {user.regionalOffice || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-user-manager-${user.id}`}>
                        {managerUser ? managerUser.name : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            data-testid={`button-view-user-${user.id}`}
                          >
                            <Link href={`/admin/user-details/${user.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleGenerateUserAISummary(user)}
                            data-testid={`button-ai-summary-${user.id}`}
                            title="Generate AI Performance Summary"
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            disabled={isCurrentUser}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isCurrentUser}
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {user.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid="button-cancel-delete-user">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUserMutation.mutate(user.id)}
                                  data-testid="button-confirm-delete-user"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            All Sales
          </CardTitle>
          <CardDescription>Edit and manage sales records</CardDescription>
        </CardHeader>
        <CardContent>
          {allSales.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No sales found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Salesperson</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allSales.map((sale) => {
                  const salesperson = allUsers.find(u => u.id === sale.salesmanId);
                  return (
                    <TableRow key={sale.id} data-testid={`sale-row-${sale.id}`}>
                      <TableCell data-testid={`text-sale-date-${sale.id}`}>
                        {format(new Date(sale.date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell data-testid={`text-sale-salesman-${sale.id}`}>
                        {salesperson?.name || "Unknown"}
                      </TableCell>
                      <TableCell data-testid={`text-sale-customer-${sale.id}`}>
                        {sale.customerName}
                      </TableCell>
                      <TableCell data-testid={`text-sale-product-${sale.id}`}>
                        {sale.product}
                      </TableCell>
                      <TableCell data-testid={`text-sale-amount-${sale.id}`}>
                        ${parseFloat(sale.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditSale(sale)}
                            data-testid={`button-edit-sale-${sale.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-delete-sale-${sale.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Sale</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this sale? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid="button-cancel-delete-sale">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteSaleMutation.mutate(sale.id)}
                                  data-testid="button-confirm-delete-sale"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Collapsible open={addUserOpen} onOpenChange={setAddUserOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover-elevate">
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-sm" />
                  Add New User
                </div>
                <Button variant="ghost" size="sm" data-testid="button-toggle-add-user">
                  {addUserOpen ? "Hide" : "Show"}
                </Button>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-3 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="new-name" className="text-sm">Full Name</Label>
                  <Input
                    id="new-name"
                    data-testid="input-new-name"
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-username" className="text-sm">Username</Label>
                  <Input
                    id="new-username"
                    data-testid="input-new-username"
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm">Password</Label>
                  <Input
                    id="new-password"
                    data-testid="input-new-password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-role" className="text-sm">Role</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value, managerId: "" })}
                  >
                    <SelectTrigger id="new-role" data-testid="select-new-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ceo" data-testid="option-new-ceo">CEO</SelectItem>
                      <SelectItem value="sales_director" data-testid="option-new-sales-director">Sales Director</SelectItem>
                      <SelectItem value="marketing_director" data-testid="option-new-marketing-director">Marketing Director</SelectItem>
                      <SelectItem value="regional_manager" data-testid="option-new-regional-manager">Regional Manager</SelectItem>
                      <SelectItem value="manager" data-testid="option-new-manager">Manager</SelectItem>
                      <SelectItem value="salesman" data-testid="option-new-salesman">Salesman</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-regional-office" className="text-sm">Regional Office</Label>
                  <Select
                    value={newUser.regionalOffice}
                    onValueChange={(value) => setNewUser({ ...newUser, regionalOffice: value })}
                  >
                    <SelectTrigger id="new-regional-office" data-testid="select-new-regional-office">
                      <SelectValue placeholder="Select regional office" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hong Kong">Hong Kong</SelectItem>
                      <SelectItem value="Singapore">Singapore</SelectItem>
                      <SelectItem value="Shanghai">Shanghai</SelectItem>
                      <SelectItem value="Australia/New Zealand">Australia/New Zealand</SelectItem>
                      <SelectItem value="Indonesia">Indonesia</SelectItem>
                      <SelectItem value="Malaysia">Malaysia</SelectItem>
                      <SelectItem value="Guangzhou">Guangzhou</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newUser.role === "salesman" && (
                  <div className="space-y-2">
                    <Label htmlFor="new-manager" className="text-sm">Manager</Label>
                    <Select
                      value={newUser.managerId}
                      onValueChange={(value) => setNewUser({ ...newUser, managerId: value })}
                    >
                      <SelectTrigger id="new-manager" data-testid="select-new-manager">
                        <SelectValue placeholder="Select a manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id} data-testid={`option-new-manager-${manager.id}`}>
                            {manager.name} ({getRoleDisplayName(manager.role as UserRole)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  data-testid="button-create-user"
                  size="sm"
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </form>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Team Member Details
          </CardTitle>
          <CardDescription>View detailed information about team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select onValueChange={(userId) => window.open(`/user-details/${userId}`, '_blank')}>
              <SelectTrigger data-testid="select-team-member">
                <SelectValue placeholder="Select a team member to view details" />
              </SelectTrigger>
              <SelectContent>
                {allUsers
                  .filter(u => {
                    if (currentUser?.role === "sales_director" || currentUser?.role === "ceo") return true;
                    if (currentUser?.role === "manager" || currentUser?.role === "regional_manager") {
                      return u.managerId === currentUser.id || u.id === currentUser.id;
                    }
                    return false;
                  })
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id} data-testid={`option-team-member-${user.id}`}>
                      {user.name} ({getRoleDisplayName(user.role as UserRole)})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Select a team member to view their sales targets, action items, and sales history in detail.
            </p>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-primary" />
                Customer Assignments
              </CardTitle>
              <CardDescription>View which customers are assigned to each salesman</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="customer-salesman-filter">Filter by Salesman</Label>
                  <Select value={customerSalesmanFilter} onValueChange={setCustomerSalesmanFilter}>
                    <SelectTrigger id="customer-salesman-filter" data-testid="select-filter-customer-salesman">
                      <SelectValue placeholder="All Salesmen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Salesmen</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {allUsers
                        .filter(u => u.role === "salesman" || u.role === "manager")
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customer-name-filter">Search by Customer Name</Label>
                  <Input
                    id="customer-name-filter"
                    placeholder="Filter by customer name..."
                    value={customerNameFilter}
                    onChange={(e) => setCustomerNameFilter(e.target.value)}
                    data-testid="input-filter-customer-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customer-office-filter">Filter by Office</Label>
                  <Select value={customerOfficeFilter} onValueChange={setCustomerOfficeFilter}>
                    <SelectTrigger id="customer-office-filter" data-testid="select-filter-customer-office">
                      <SelectValue placeholder="All Offices" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Offices</SelectItem>
                      {offices.map((office) => (
                        <SelectItem key={office.id} value={office.id}>
                          {office.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground mb-4">
                Showing {filteredCustomersForAssignments.length} of {customers.length} customers
              </div>
              
              {filteredCustomersForAssignments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No customers match the current filters
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Office</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Country</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomersForAssignments.map((customer) => {
                      const assignedUser = customer.assignedTo ? getUserById(customer.assignedTo) : null;
                      const office = customer.officeId ? getOfficeById(customer.officeId) : null;
                      return (
                        <TableRow key={customer.id} data-testid={`row-customer-assignment-${customer.id}`}>
                          <TableCell className="font-medium">
                            <Link href={`/customers?id=${customer.id}`} className="hover:underline text-primary">
                              {customer.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {assignedUser ? (
                              <span data-testid={`text-assigned-${customer.id}`}>{assignedUser.name}</span>
                            ) : (
                              <span className="text-muted-foreground italic">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {office ? (
                              <Badge variant="outline">{office.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={customer.stage === "customer" ? "default" : customer.stage === "prospect" ? "secondary" : "outline"}
                            >
                              {customer.stage}
                            </Badge>
                          </TableCell>
                          <TableCell>{customer.country || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Office Management
              </CardTitle>
              <CardDescription>Assign salesmen and managers to regional offices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Office List */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Regional Offices</h3>
                  <div className="space-y-2">
                    {offices.map((office) => {
                      const officeAssignmentCount = allAssignments.filter(a => a.officeId === office.id).length;
                      return (
                        <div
                          key={office.id}
                          className={`p-4 border rounded-lg cursor-pointer hover-elevate ${selectedOffice === office.id ? 'border-primary bg-primary/5' : ''}`}
                          onClick={() => setSelectedOffice(office.id)}
                          data-testid={`card-office-${office.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{office.name}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="font-mono">{office.code}</span>
                                {office.region && <span>| {office.region}</span>}
                              </div>
                            </div>
                            <Badge variant="secondary" data-testid={`badge-office-users-${office.id}`}>
                              <UsersIcon className="h-3 w-3 mr-1" />
                              {officeAssignmentCount} {officeAssignmentCount === 1 ? 'user' : 'users'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                    {offices.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No offices found
                      </div>
                    )}
                  </div>
                </div>

                {/* Office Details */}
                <div className="space-y-4">
                  {selectedOffice ? (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">
                          {offices.find(o => o.id === selectedOffice)?.name} Staff
                        </h3>
                        <Button
                          size="sm"
                          onClick={() => setAssignUserDialogOpen(true)}
                          data-testid="button-assign-user-to-office"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Assign User
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {allAssignments
                          .filter(a => a.officeId === selectedOffice)
                          .map((assignment) => {
                            const user = allUsers.find(u => u.id === assignment.userId);
                            if (!user) return null;
                            return (
                              <div
                                key={assignment.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                                data-testid={`row-office-user-${user.id}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-sm font-medium text-primary">
                                      {user.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">{user.role}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={assignment.roleType === 'manager' ? 'default' : 'secondary'}>
                                    {assignment.roleType}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeUserFromOfficeMutation.mutate({ 
                                      userId: user.id, 
                                      officeId: selectedOffice 
                                    })}
                                    data-testid={`button-remove-user-${user.id}`}
                                  >
                                    <X className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        {allAssignments.filter(a => a.officeId === selectedOffice).length === 0 && (
                          <div className="text-center text-muted-foreground py-8 border rounded-lg">
                            No users assigned to this office yet
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground py-12">
                      Select an office to view and manage its staff
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assign User Dialog */}
          <Dialog open={assignUserDialogOpen} onOpenChange={setAssignUserDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign User to Office</DialogTitle>
                <DialogDescription>
                  Assign a team member to {offices.find(o => o.id === selectedOffice)?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select User</Label>
                  <Select value={assignmentUserId} onValueChange={setAssignmentUserId}>
                    <SelectTrigger data-testid="select-assignment-user">
                      <SelectValue placeholder="Choose a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers
                        .filter(u => !allAssignments.some(a => a.userId === u.id && a.officeId === selectedOffice))
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Role Type</Label>
                  <Select value={assignmentRoleType} onValueChange={setAssignmentRoleType}>
                    <SelectTrigger data-testid="select-assignment-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salesman">Salesman</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Salesmen can only be assigned to one office. Managers can view multiple offices.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedOffice && assignmentUserId) {
                      assignUserToOfficeMutation.mutate({
                        userId: assignmentUserId,
                        officeId: selectedOffice,
                        roleType: assignmentRoleType,
                      });
                    }
                  }}
                  disabled={!assignmentUserId || assignUserToOfficeMutation.isPending}
                  data-testid="button-confirm-assign-user"
                >
                  {assignUserToOfficeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Assign User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="comparative" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Regional Comparison
              </CardTitle>
              <CardDescription>Compare performance metrics between different regions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Region 1</label>
                  <Select value={selectedRegion1} onValueChange={setSelectedRegion1}>
                    <SelectTrigger data-testid="select-region-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {regions.map(region => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Region 2</label>
                  <Select value={selectedRegion2} onValueChange={setSelectedRegion2}>
                    <SelectTrigger data-testid="select-region-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {regions.map(region => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={regionalComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey={selectedRegion1 === "all" ? "All Regions" : selectedRegion1} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={selectedRegion2 === "all" ? "All Regions" : selectedRegion2} fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-primary" />
                Sales Rep Comparison
              </CardTitle>
              <CardDescription>Compare performance metrics between sales representatives</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Sales Rep 1</label>
                  <Select value={selectedRep1} onValueChange={setSelectedRep1}>
                    <SelectTrigger data-testid="select-rep-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reps</SelectItem>
                      {salesReps.map(rep => (
                        <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Sales Rep 2</label>
                  <Select value={selectedRep2} onValueChange={setSelectedRep2}>
                    <SelectTrigger data-testid="select-rep-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reps</SelectItem>
                      {salesReps.map(rep => (
                        <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={repComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey={repComparison[0] ? Object.keys(repComparison[0])[1] : ""} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={repComparison[0] ? Object.keys(repComparison[0])[2] : ""} fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editSaleDialog} onOpenChange={setEditSaleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sale</DialogTitle>
            <DialogDescription>Update the sale details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSale} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-customer">Customer Name</Label>
              <Input
                id="edit-customer"
                data-testid="input-edit-customer"
                value={editSaleData.customerName}
                onChange={(e) => setEditSaleData({ ...editSaleData, customerName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-product">Product</Label>
              <Input
                id="edit-product"
                data-testid="input-edit-product"
                value={editSaleData.product}
                onChange={(e) => setEditSaleData({ ...editSaleData, product: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                data-testid="input-edit-amount"
                type="number"
                step="0.01"
                value={editSaleData.amount}
                onChange={(e) => setEditSaleData({ ...editSaleData, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                data-testid="input-edit-date"
                type="date"
                value={editSaleData.date}
                onChange={(e) => setEditSaleData({ ...editSaleData, date: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditSaleDialog(false)}
                data-testid="button-cancel-edit-sale"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateSaleMutation.isPending}
                data-testid="button-save-edit-sale"
              >
                {updateSaleMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Leave password blank to keep current password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-user-name">Name</Label>
                <Input
                  id="edit-user-name"
                  data-testid="input-edit-user-name"
                  value={editUserData.name}
                  onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-username">Username</Label>
                <Input
                  id="edit-user-username"
                  data-testid="input-edit-user-username"
                  value={editUserData.username}
                  onChange={(e) => setEditUserData({ ...editUserData, username: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-password">Password (leave blank to keep current)</Label>
              <Input
                id="edit-user-password"
                data-testid="input-edit-user-password"
                type="password"
                value={editUserData.password}
                onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                placeholder="Enter new password or leave blank"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-user-role">Role</Label>
                <Select 
                  value={editUserData.role} 
                  onValueChange={(value) => {
                    const newRole = value as UserRole;
                    // Clear managerId when changing from salesman to another role
                    setEditUserData({ 
                      ...editUserData, 
                      role: newRole,
                      managerId: newRole !== "salesman" ? "" : editUserData.managerId
                    });
                  }}
                >
                  <SelectTrigger id="edit-user-role" data-testid="select-edit-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ceo">CEO</SelectItem>
                    <SelectItem value="sales_director">Sales Director</SelectItem>
                    <SelectItem value="marketing_director">Marketing Director</SelectItem>
                    <SelectItem value="regional_manager">Regional Manager</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="salesman">Salesman</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-regional-office">Regional Office</Label>
                <Select 
                  value={editUserData.regionalOffice || undefined} 
                  onValueChange={(value) => setEditUserData({ ...editUserData, regionalOffice: value })}
                >
                  <SelectTrigger id="edit-user-regional-office" data-testid="select-edit-user-regional-office">
                    <SelectValue placeholder="No office assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hong Kong">Hong Kong</SelectItem>
                    <SelectItem value="Singapore">Singapore</SelectItem>
                    <SelectItem value="Shanghai">Shanghai</SelectItem>
                    <SelectItem value="Australia/NZ">Australia/NZ</SelectItem>
                    <SelectItem value="Indonesia">Indonesia</SelectItem>
                    <SelectItem value="Malaysia">Malaysia</SelectItem>
                    <SelectItem value="Guangzhou">Guangzhou</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editUserData.role === "salesman" && (
              <div className="space-y-2">
                <Label htmlFor="edit-user-manager">Manager</Label>
                <Select 
                  value={editUserData.managerId || undefined} 
                  onValueChange={(value) => setEditUserData({ ...editUserData, managerId: value })}
                >
                  <SelectTrigger id="edit-user-manager" data-testid="select-edit-user-manager">
                    <SelectValue placeholder="No manager assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name} ({getRoleDisplayName(manager.role as UserRole)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditUserOpen(false)}
                data-testid="button-cancel-edit-user"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editUserMutation.isPending}
                data-testid="button-save-edit-user"
              >
                {editUserMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Performance Details</DialogTitle>
            <DialogDescription>
              Comprehensive overview of user performance and activity
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingUserDetails ? (
            <div className="py-8 text-center text-muted-foreground">Loading user details...</div>
          ) : userDetails ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium">User Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium" data-testid="text-detail-user-name">{userDetails.user.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Username</p>
                      <p className="font-medium" data-testid="text-detail-user-username">{userDetails.user.username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Role</p>
                      <Badge variant="outline" data-testid="badge-detail-user-role">
                        {getRoleDisplayName(userDetails.user.role as UserRole)}
                      </Badge>
                    </div>
                    {userDetails.manager && (
                      <div>
                        <p className="text-sm text-muted-foreground">Manager</p>
                        <p className="font-medium" data-testid="text-detail-user-manager">{userDetails.manager.name}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Sales</span>
                      <span className="font-medium" data-testid="text-detail-total-sales">{userDetails.metrics.totalSales}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Revenue</span>
                      <span className="font-medium" data-testid="text-detail-total-revenue">${userDetails.metrics.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Average Sale</span>
                      <span className="font-medium" data-testid="text-detail-average-sale">${userDetails.metrics.averageSale.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Pending Actions</span>
                      <span className="font-medium" data-testid="text-detail-pending-actions">{userDetails.metrics.pendingActionItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Completed Actions</span>
                      <span className="font-medium" data-testid="text-detail-completed-actions">{userDetails.metrics.completedActionItems}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Monthly Targets</CardTitle>
                </CardHeader>
                <CardContent>
                  {userDetails.monthlyTargets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No targets set</p>
                  ) : (
                    <div className="space-y-2">
                      {userDetails.monthlyTargets.map((target) => (
                        <div
                          key={target.id}
                          className="flex justify-between items-center p-2 bg-muted rounded-md"
                          data-testid={`target-${target.id}`}
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {format(new Date(target.year, target.month - 1), "MMMM yyyy")}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">{target.targetType}</p>
                          </div>
                          <p className="font-bold" data-testid={`text-target-amount-${target.id}`}>
                            ${parseFloat(target.targetAmount).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Action Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {userDetails.actionItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No action items</p>
                  ) : (
                    <div className="space-y-2">
                      {userDetails.actionItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-start p-3 bg-muted rounded-md gap-4"
                          data-testid={`action-item-${item.id}`}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium" data-testid={`text-action-description-${item.id}`}>
                              {item.description}
                            </p>
                            {item.customerName && (
                              <p className="text-xs text-muted-foreground mt-1" data-testid={`text-action-customer-${item.id}`}>
                                Customer: {item.customerName}
                              </p>
                            )}
                            {item.dueDate && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Due: {format(new Date(item.dueDate), "MMM dd, yyyy")}
                              </p>
                            )}
                          </div>
                          <Badge variant={item.completedAt ? "outline" : "default"} data-testid={`badge-action-status-${item.id}`}>
                            {item.completedAt ? "Completed" : "Pending"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sales History</CardTitle>
                </CardHeader>
                <CardContent>
                  {userDetails.sales.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No sales recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {userDetails.sales.slice(0, 10).map((sale) => (
                        <div
                          key={sale.id}
                          className="flex justify-between items-center p-2 bg-muted rounded-md"
                          data-testid={`detail-sale-${sale.id}`}
                        >
                          <div>
                            <p className="text-sm font-medium" data-testid={`text-detail-sale-customer-${sale.id}`}>
                              {sale.customerName}
                            </p>
                            <p className="text-xs text-muted-foreground" data-testid={`text-detail-sale-product-${sale.id}`}>
                              {sale.product}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold" data-testid={`text-detail-sale-amount-${sale.id}`}>
                              ${parseFloat(sale.amount).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(sale.date), "MMM dd, yyyy")}
                            </p>
                          </div>
                        </div>
                      ))}
                      {userDetails.sales.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          Showing 10 of {userDetails.sales.length} sales
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">User not found or unauthorized</div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Performance Summary Dialog */}
      <Dialog open={aiSummaryDialog} onOpenChange={setAiSummaryDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Performance Summary - {selectedUserForAI?.name}
            </DialogTitle>
            <DialogDescription>
              AI-generated analysis of performance trends, strengths, and areas for improvement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {generateUserAISummaryMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Analyzing performance data...</p>
              </div>
            ) : aiSummary ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {aiSummary.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className="text-sm mb-3 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No summary available
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAiSummaryDialog(false)}
              data-testid="button-close-ai-summary"
            >
              Close
            </Button>
            {aiSummary && (
              <Button
                onClick={() => generateUserAISummaryMutation.mutate(selectedUserForAI!.id)}
                disabled={generateUserAISummaryMutation.isPending}
                data-testid="button-regenerate-ai-summary"
              >
                {generateUserAISummaryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Regenerate
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
