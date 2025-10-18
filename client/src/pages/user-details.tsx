
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { User, TrendingUp, CheckSquare, DollarSign, Target as TargetIcon } from "lucide-react";
import type { UserRole, MonthlyTarget, Sale, ActionItem } from "@shared/schema";

type UserDetails = {
  user: {
    id: string;
    name: string;
    username: string;
    role: string;
    managerId: string | null;
  };
  manager: {
    id: string;
    name: string;
    role: string;
  } | null;
  sales: Sale[];
  targets: MonthlyTarget[];
  actionItems: ActionItem[];
  metrics: {
    totalSales: number;
    totalRevenue: string;
    averageSaleAmount: string;
    pendingActionItems: number;
    completedActionItems: number;
  };
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function UserDetailsPage() {
  const [, params] = useRoute("/user-details/:userId");
  const userId = params?.userId;

  const { data: userDetails, isLoading, error } = useQuery<UserDetails>({
    queryKey: [`/api/admin/user-details/${userId}`],
    enabled: !!userId,
  });

  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case "ceo":
        return "CEO";
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !userDetails) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-destructive">
              {error ? "Error loading user details" : "User not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <User className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-user-name">
              {userDetails.user.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" data-testid="badge-user-role">
                {getRoleDisplayName(userDetails.user.role)}
              </Badge>
              {userDetails.manager && (
                <span className="text-sm text-muted-foreground">
                  Manager: {userDetails.manager.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-sales">
              {userDetails.metrics.totalSales}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              ${userDetails.metrics.totalRevenue}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-average-sale">
              ${userDetails.metrics.averageSaleAmount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Items</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-tasks">
              {userDetails.metrics.pendingActionItems}
            </div>
            <p className="text-xs text-muted-foreground">
              {userDetails.metrics.completedActionItems} completed
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TargetIcon className="h-5 w-5" />
            Monthly Targets
          </CardTitle>
          <CardDescription>Sales targets and performance</CardDescription>
        </CardHeader>
        <CardContent>
          {userDetails.targets.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No targets set yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Target Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.targets.map((target) => (
                  <TableRow key={target.id} data-testid={`row-target-${target.id}`}>
                    <TableCell>{months[target.month - 1]}</TableCell>
                    <TableCell>{target.year}</TableCell>
                    <TableCell>
                      <Badge variant={target.targetType === "general" ? "default" : "secondary"}>
                        {target.targetType === "general" ? "General" : "Personal"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${parseFloat(target.targetAmount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Action Items
          </CardTitle>
          <CardDescription>Tasks and follow-ups</CardDescription>
        </CardHeader>
        <CardContent>
          {userDetails.actionItems.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No action items yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.actionItems.map((item) => (
                  <TableRow key={item.id} data-testid={`row-action-${item.id}`}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell>
                      {item.dueDate ? format(new Date(item.dueDate), "MMM dd, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.completedAt ? "default" : "secondary"}>
                        {item.completedAt ? "Completed" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.completedAt ? format(new Date(item.completedAt), "MMM dd, yyyy") : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Sales History
          </CardTitle>
          <CardDescription>Complete sales transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          {userDetails.sales.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No sales recorded yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.sales.map((sale) => (
                  <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                    <TableCell>{format(new Date(sale.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="font-medium">{sale.customerName}</TableCell>
                    <TableCell>{sale.product}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${parseFloat(sale.amount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
