import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AdminDashboardStats } from "@shared/schema";
import { format } from "date-fns";
import { UserPlus } from "lucide-react";

export default function AdminPage() {
  const { toast } = useToast();
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    name: "",
    role: "salesman" as "admin" | "salesman",
  });

  const { data: stats, isLoading } = useQuery<AdminDashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
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
      setNewUser({ username: "", password: "", name: "", role: "salesman" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
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

  if (isLoading) {
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
        <p className="text-muted-foreground">Manage users and view statistics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New User
          </CardTitle>
          <CardDescription>Create new salesman or admin accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                onValueChange={(value) => setNewUser({ ...newUser, role: value as "admin" | "salesman" })}
              >
                <SelectTrigger id="new-role" data-testid="select-new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salesman" data-testid="option-new-salesman">Salesman</SelectItem>
                  <SelectItem value="admin" data-testid="option-new-admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <Button
                type="submit"
                disabled={createUserMutation.isPending}
                data-testid="button-create-user"
              >
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Sales</CardTitle>
            <CardDescription>All sales across all salesmen</CardDescription>
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
            <CardDescription>Total revenue across all salesmen</CardDescription>
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
          <CardTitle>Salesmen Performance</CardTitle>
          <CardDescription>Individual salesman statistics</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.salesmenStats.length === 0 ? (
            <div className="text-center text-muted-foreground">No salesmen registered yet</div>
          ) : (
            <div className="space-y-6">
              {stats?.salesmenStats.map((salesman) => (
                <div key={salesman.salesmanId} className="space-y-3" data-testid={`salesman-${salesman.salesmanId}`}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold" data-testid={`text-salesman-name-${salesman.salesmanId}`}>
                      {salesman.salesmanName}
                    </h3>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
