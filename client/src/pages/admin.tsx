import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import type { AdminDashboardStats, User, UserRole, Sale } from "@shared/schema";
import { format } from "date-fns";
import { UserPlus, Users as UsersIcon, Trash2, Edit, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    name: "",
    role: "salesman" as UserRole,
    managerId: "",
  });
  const [editSaleDialog, setEditSaleDialog] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editSaleData, setEditSaleData] = useState({
    customerName: "",
    product: "",
    amount: "",
    date: "",
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery<AdminDashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: allUsers = [] } = useQuery<Omit<User, 'password'>[]>({
    queryKey: ["/api/users"],
  });

  const { data: allSales = [] } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const managers = allUsers.filter(u => u.role === "admin" || u.role === "manager");

  const getUserById = (userId: string | null) => {
    if (!userId) return null;
    return allUsers.find(u => u.id === userId);
  };

  const getRoleDisplayName = (role: UserRole): string => {
    switch (role) {
      case "admin":
        return "Admin";
      case "manager":
        return "Manager";
      case "salesman":
        return "Salesman";
      default:
        return role;
    }
  };

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const requestData = {
        ...userData,
        managerId: userData.role === "salesman" && userData.managerId ? userData.managerId : undefined,
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
      setNewUser({ username: "", password: "", name: "", role: "salesman", managerId: "" });
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
          {currentUser?.role === "admin" ? "Manage all users and view company-wide statistics" : "Manage your team and view team statistics"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New User
          </CardTitle>
          <CardDescription>Create new team member accounts</CardDescription>
        </CardHeader>
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
                    <SelectItem value="admin" data-testid="option-new-admin">Admin</SelectItem>
                    <SelectItem value="manager" data-testid="option-new-manager">Manager</SelectItem>
                    <SelectItem value="salesman" data-testid="option-new-salesman">Salesman</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newUser.role === "salesman" && (
                <div className="space-y-2 md:col-span-2">
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
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Sales</CardTitle>
            <CardDescription>
              {currentUser?.role === "admin" ? "All sales across all team members" : "Sales from your team"}
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
              {currentUser?.role === "admin" ? "Total revenue across all team members" : "Revenue from your team"}
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
            {currentUser?.role === "admin" ? "All Salespeople Performance" : "Team Performance"}
          </CardTitle>
          <CardDescription>Individual performance statistics</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.salesmenStats.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {currentUser?.role === "admin" ? "No salespeople registered yet" : "No team members yet"}
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
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>Manage system users</CardDescription>
        </CardHeader>
        <CardContent>
          {allUsers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No users found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers.map((user) => {
                  const managerUser = user.managerId ? getUserById(user.managerId) : null;
                  return (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
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
                      <TableCell className="text-muted-foreground" data-testid={`text-user-manager-${user.id}`}>
                        {managerUser ? managerUser.name : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={user.id === currentUser?.id}
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
    </div>
  );
}
