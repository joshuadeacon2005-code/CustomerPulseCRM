
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format, isToday, isPast, parseISO } from "date-fns";
import { 
  User, 
  TrendingUp, 
  CheckSquare, 
  DollarSign, 
  Target as TargetIcon,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  Filter,
  Building2,
  MessageSquare,
  Plus
} from "lucide-react";
import { Link } from "wouter";
import type { 
  UserRole, 
  MonthlyTarget, 
  Sale, 
  ActionItem, 
  Customer, 
  MonthlySalesTracking, 
  Interaction 
} from "@shared/schema";
import { CalendarView } from "@/components/calendar-view";

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
  const [, params] = useRoute("/admin/user-details/:userId");
  const userId = params?.userId;
  const [filterCustomer, setFilterCustomer] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch individual data sources for comprehensive dashboard view
  const { data: userInfo } = useQuery<any>({
    queryKey: [`/api/admin/user-details/${userId}`],
    enabled: !!userId,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: !!userId,
  });

  const { data: monthlyTargets = [] } = useQuery<MonthlyTarget[]>({
    queryKey: ["/api/targets"],
    enabled: !!userId,
  });

  const { data: monthlySales = [] } = useQuery<MonthlySalesTracking[]>({
    queryKey: ["/api/monthly-sales"],
    enabled: !!userId,
  });

  const { data: actionItems = [] } = useQuery<ActionItem[]>({
    queryKey: ["/api/action-items"],
    enabled: !!userId,
  });

  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: ["/api/interactions"],
    enabled: !!userId,
  });

  const isLoading = !userInfo;
  const error = !userId;

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

  if (error || !userInfo) {
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

  // Calculate current month/year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Filter customers assigned to this user
  const userCustomers = customers.filter(c => c.assignedTo === userId);
  const userCustomerIds = userCustomers.map(c => c.id);

  // Filter action items for this user's customers
  const userActionItems = actionItems.filter(item => userCustomerIds.includes(item.customerId));

  // Filter interactions for this user's customers  
  const userInteractions = interactions.filter(i => userCustomerIds.includes(i.customerId));

  // Get current month target (with fallback to general target)
  const currentMonthTarget = monthlyTargets.find(t => 
    t.month === currentMonth && 
    t.year === currentYear &&
    (t.salesmanId === userId || (t.targetType === "general" && !t.salesmanId))
  );

  // Calculate current month sales
  const currentMonthSales = monthlySales
    .filter(s => 
      userCustomerIds.includes(s.customerId) &&
      s.month === currentMonth &&
      s.year === currentYear
    )
    .reduce((sum, s) => sum + (s.actual ? Number(s.actual) : 0), 0);

  // Calculate monthly interaction count
  const currentMonthInteractions = userInteractions.filter(interaction => {
    const interactionDate = new Date(interaction.date);
    return interactionDate.getMonth() === currentMonth - 1 && interactionDate.getFullYear() === currentYear;
  });

  // Calculate new customers this month
  const newCustomersThisMonth = userCustomers.filter(customer => {
    if (!customer.dateOfFirstContact) return false;
    const firstContactDate = new Date(customer.dateOfFirstContact);
    return firstContactDate.getMonth() === currentMonth - 1 && firstContactDate.getFullYear() === currentYear;
  });

  // Filter leads
  const userLeads = userCustomers.filter(c => c.stage === "lead");

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="sm" data-testid="button-back-to-admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <User className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-user-name">
              {userInfo.user.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" data-testid="badge-user-role">
                {getRoleDisplayName(userInfo.user.role)}
              </Badge>
              {userInfo.manager && (
                <span className="text-sm text-muted-foreground">
                  Manager: {userInfo.manager.name}
                </span>
              )}
              {userInfo.user.regionalOffice && (
                <>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {userInfo.user.regionalOffice}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <CalendarView 
        actionItems={userActionItems} 
        interactions={userInteractions}
        customers={userCustomers}
      />

      {/* Performance Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Current Month Performance</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Target</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="text-target-amount">
                ${currentMonthTarget?.targetAmount ? Number(currentMonthTarget.targetAmount).toLocaleString() : '0'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(), 'MMMM yyyy')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sales to Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-sales-amount">
                ${currentMonthSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                As of {format(new Date(), 'MMM d')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="text-progress-percent">
                {currentMonthTarget?.targetAmount
                  ? Math.round((currentMonthSales / Number(currentMonthTarget.targetAmount)) * 100)
                  : 0}%
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ 
                    width: `${currentMonthTarget?.targetAmount ? Math.min((currentMonthSales / Number(currentMonthTarget.targetAmount)) * 100, 100) : 0}%` 
                  }}
                  data-testid="progress-bar"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Interactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400" data-testid="text-interaction-count">
                {currentMonthInteractions.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">New Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-new-customers-count">
                {newCustomersThisMonth.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Added this month
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer-Specific Progress Bars */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer Performance</CardTitle>
          <CardDescription>
            Monthly progress with each customer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userCustomers.map((customer) => {
              // Get current month sales tracking for this customer
              const customerSales = monthlySales.filter(s => 
                s.customerId === customer.id &&
                s.month === currentMonth &&
                s.year === currentYear
              );
              
              const budget = customerSales.length > 0 ? Number(customerSales[0].budget) : 0;
              const actual = customerSales.length > 0 && customerSales[0].actual ? Number(customerSales[0].actual) : 0;
              const progress = budget > 0 ? Math.round((actual / budget) * 100) : 0;
              const variance = actual - budget;

              // Skip customers with no budget set
              if (budget === 0) return null;

              return (
                <div key={customer.id} className="space-y-2" data-testid={`customer-progress-${customer.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{customer.name}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>Target: ${budget.toLocaleString()}</span>
                        <span>•</span>
                        <span>Actual: ${actual.toLocaleString()}</span>
                        <span>•</span>
                        <span className={variance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                          {variance >= 0 ? '+' : ''}{variance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <Badge variant={progress >= 100 ? "default" : progress >= 75 ? "secondary" : "outline"}>
                      {progress}%
                    </Badge>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        progress >= 100 ? 'bg-green-600' : 
                        progress >= 75 ? 'bg-blue-600' : 
                        progress >= 50 ? 'bg-amber-600' : 
                        'bg-red-600'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                      data-testid={`progress-bar-${customer.id}`}
                    />
                  </div>
                </div>
              );
            }).filter(Boolean)}

            {userCustomers.every(customer => {
              const customerSales = monthlySales.filter(s => 
                s.customerId === customer.id &&
                s.month === currentMonth &&
                s.year === currentYear
              );
              const budget = customerSales.length > 0 ? Number(customerSales[0].budget) : 0;
              return budget === 0;
            }) && (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No customer budgets set for this month</p>
                <p className="text-xs text-muted-foreground mt-1">Add monthly sales budgets to track customer progress</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Items List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-lg">Action Items</CardTitle>
            <CardDescription>
              Manage all action items
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" data-testid="badge-action-items-count">
              {userActionItems.filter(item => {
                if (filterStatus === "pending") return !item.completedAt;
                if (filterStatus === "completed") return item.completedAt;
                if (filterStatus === "overdue") return !item.completedAt && item.dueDate && isPast(parseISO(item.dueDate.toString())) && !isToday(parseISO(item.dueDate.toString()));
                return true;
              }).filter(item => {
                if (filterCustomer === "all") return true;
                return item.customerId === filterCustomer;
              }).length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCustomer} onValueChange={setFilterCustomer}>
              <SelectTrigger className="w-[200px]" data-testid="select-filter-customer">
                <SelectValue placeholder="Filter by customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {userCustomers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Items List */}
          <div className="space-y-2">
            {userActionItems
              .filter(item => {
                if (filterStatus === "pending") return !item.completedAt;
                if (filterStatus === "completed") return item.completedAt;
                if (filterStatus === "overdue") return !item.completedAt && item.dueDate && isPast(parseISO(item.dueDate.toString())) && !isToday(parseISO(item.dueDate.toString()));
                return true;
              })
              .filter(item => {
                if (filterCustomer === "all") return true;
                return item.customerId === filterCustomer;
              })
              .slice(0, 10)
              .map((item) => {
                const customer = userCustomers.find(c => c.id === item.customerId);
                const isOverdue = !item.completedAt && item.dueDate && isPast(parseISO(item.dueDate.toString())) && !isToday(parseISO(item.dueDate.toString()));
                const isDueToday = !item.completedAt && item.dueDate && isToday(parseISO(item.dueDate.toString()));

                return (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-md hover-elevate"
                    data-testid={`action-item-${item.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {item.completedAt ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      ) : isOverdue ? (
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                      ) : isDueToday ? (
                        <Circle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${item.completedAt ? 'line-through text-muted-foreground' : ''}`}>
                          {item.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-sm text-muted-foreground">{customer?.name}</span>
                          {item.dueDate && (
                            <>
                              <span className="text-sm text-muted-foreground">•</span>
                              <span className={`text-sm ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : isDueToday ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground'}`}>
                                {format(parseISO(item.dueDate.toString()), 'MMM d, yyyy')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.completedAt ? (
                        <Badge variant="default" className="bg-green-600">Completed</Badge>
                      ) : isOverdue ? (
                        <Badge variant="destructive">Overdue</Badge>
                      ) : isDueToday ? (
                        <Badge className="bg-amber-600">Due Today</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                  </div>
                );
              })}

            {userActionItems.filter(item => {
              if (filterStatus === "pending") return !item.completedAt;
              if (filterStatus === "completed") return item.completedAt;
              if (filterStatus === "overdue") return !item.completedAt && item.dueDate && isPast(parseISO(item.dueDate.toString())) && !isToday(parseISO(item.dueDate.toString()));
              return true;
            }).filter(item => {
              if (filterCustomer === "all") return true;
              return item.customerId === filterCustomer;
            }).length === 0 && (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No action items found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
