import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import type { AdminDashboardStats, User, UserRole, Sale, UserDetails } from "@shared/schema";
import { format } from "date-fns";
import { UserPlus, Users as UsersIcon, Trash2, Edit, DollarSign, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
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
  
  // User list filters
  const [userNameFilter, setUserNameFilter] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userOfficeFilter, setUserOfficeFilter] = useState<string>("all");
  const [userManagerFilter, setUserManagerFilter] = useState<string>("all");

  const { data: stats, isLoading: isLoadingStats } = useQuery<AdminDashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: allUsers = [] } = useQuery<Omit<User, 'password'>[]>({
    queryKey: ["/api/users"],
  });

  const { data: allSales = [] } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const { data: userDetails, isLoading: isLoadingUserDetails } = useQuery<UserDetails>({
    queryKey: ["/api/admin/user-details", selectedUserId],
    enabled: !!selectedUserId && userDetailsOpen,
  });

  const managers = allUsers.filter(u => u.role === "sales_director" || u.role === "regional_manager" || u.role === "manager");

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
      case "ceo": return 5;
      case "sales_director": return 4;
      case "regional_manager": return 3;
      case "manager": return 2;
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

      <Collapsible open={addUserOpen} onOpenChange={setAddUserOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover-elevate">
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Add New User
                </div>
                <Button variant="ghost" size="sm" data-testid="button-toggle-add-user">
                  {addUserOpen ? "Hide" : "Show"}
                </Button>
              </CardTitle>
              <CardDescription>Create new team member accounts</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-name">Full Name</Label>
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
                <Label htmlFor="new-username">Username</Label>
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
                <Label htmlFor="new-password">Password</Label>
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
                <Label htmlFor="new-role">Role</Label>
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
                    <SelectItem value="regional_manager" data-testid="option-new-regional-manager">Regional Manager</SelectItem>
                    <SelectItem value="manager" data-testid="option-new-manager">Manager</SelectItem>
                    <SelectItem value="salesman" data-testid="option-new-salesman">Salesman</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-regional-office">Regional Office</Label>
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
                    <SelectItem value="Australia/NZ">Australia/NZ</SelectItem>
                    <SelectItem value="Indonesia">Indonesia</SelectItem>
                    <SelectItem value="Malaysia">Malaysia</SelectItem>
                    <SelectItem value="Guangzhou">Guangzhou</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newUser.role === "salesman" && (
                <div className="space-y-2">
                  <Label htmlFor="new-manager">Manager</Label>
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
            </div>
            <Button
              type="submit"
              disabled={createUserMutation.isPending}
              data-testid="button-create-user"
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
              </form>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            {currentUser?.role === "sales_director" || currentUser?.role === "ceo" ? "All Salespeople Performance" : "Team Performance"}
          </CardTitle>
          <CardDescription>Individual performance statistics</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.salesmenStats.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {currentUser?.role === "sales_director" || currentUser?.role === "ceo" ? "No salespeople registered yet" : "No team members yet"}
            </div>
          ) : (
            <div className="space-y-6">
              {stats?.salesmenStats.map((salesman) => {
                const salesmanUser = allUsers.find(u => u.id === salesman.salesmanId);
                const managerUser = salesmanUser?.managerId ? getUserById(salesmanUser.managerId) : null;
                
                return (
                  <div key={salesman.salesmanId} className="space-y-3" data-testid={`salesman-${salesman.salesmanId}`}>
                    <div className="flex justify-between items-start flex-wrap gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold" data-testid={`text-salesman-name-${salesman.salesmanId}`}>
                            {salesman.salesmanName}
                          </h3>
                          {salesmanUser && (
                            <Badge variant="outline" data-testid={`badge-role-${salesman.salesmanId}`}>
                              {getRoleDisplayName(salesmanUser.role as UserRole)}
                            </Badge>
                          )}
                        </div>
                        {managerUser && (
                          <p className="text-sm text-muted-foreground" data-testid={`text-manager-${salesman.salesmanId}`}>
                            Manager: {managerUser.name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold" data-testid={`text-salesman-total-${salesman.salesmanId}`}>
                          {salesman.totalSales} sales
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-salesman-amount-${salesman.salesmanId}`}>
                          ${salesman.totalAmount}
                        </p>
                      </div>
                    </div>
                    
                    {salesman.recentSales.length > 0 && (
                      <div className="pl-4 space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Recent Sales</p>
                        {salesman.recentSales.map((sale) => (
                          <div
                            key={sale.id}
                            className="flex justify-between items-center p-2 bg-muted rounded-md text-sm"
                            data-testid={`sale-${sale.id}`}
                          >
                            <div>
                              <p className="font-medium" data-testid={`text-customer-${sale.id}`}>
                                {sale.customerName}
                              </p>
                              <p className="text-xs text-muted-foreground" data-testid={`text-product-${sale.id}`}>
                                {sale.product}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold" data-testid={`text-amount-${sale.id}`}>
                                ${parseFloat(sale.amount).toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground" data-testid={`text-date-${sale.id}`}>
                                {format(new Date(sale.date), "MMM dd, yyyy")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                All Users
              </CardTitle>
              <CardDescription>Manage system users</CardDescription>
            </div>
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
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setUserDetailsOpen(true);
                            }}
                            data-testid={`button-view-user-${user.id}`}
                          >
                            <Eye className="h-4 w-4" />
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
      </Card>

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
    </div>
  );
}
