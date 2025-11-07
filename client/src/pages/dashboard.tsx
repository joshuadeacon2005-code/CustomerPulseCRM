import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { 
  Users, 
  DollarSign, 
  Target as TargetIcon, 
  MessageSquare, 
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Building2,
  Filter
} from "lucide-react";
import type { Customer, MonthlyTarget, ActionItem, User, MonthlySalesTracking, Interaction } from "@shared/schema";
import { format, isToday, isPast, parseISO } from "date-fns";
import { CalendarView } from "@/components/calendar-view";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [filterCustomer, setFilterCustomer] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Determine which user's data to show (for managers/CEOs viewing team member dashboards)
  const effectiveUserId = selectedUserId || user?.id;
  const isViewingOwnDashboard = !selectedUserId || selectedUserId === user?.id;
  
  // Fetch data based on role
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: monthlyTargets = [] } = useQuery<MonthlyTarget[]>({
    queryKey: ["/api/targets"],
  });

  const { data: monthlySales = [] } = useQuery<MonthlySalesTracking[]>({
    queryKey: ["/api/monthly-sales"],
  });

  const { data: actionItems = [] } = useQuery<ActionItem[]>({
    queryKey: ["/api/action-items"],
  });

  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: ["/api/interactions"],
  });

  const { data: teamMembers = [] } = useQuery<Omit<User, 'password'>[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "manager" || user?.role === "ceo" || user?.role === "sales_director" || user?.role === "regional_manager",
  });

  // Calculate current month stats
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Calculate previous month
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  // Find target for current user (or selected team member)
  const currentMonthTarget = monthlyTargets.find(
    t => t.month === currentMonth && 
         t.year === currentYear &&
         (t.salesmanId === effectiveUserId || (t.targetType === "general" && !t.salesmanId))
  );

  // Find previous month's target
  const previousMonthTarget = monthlyTargets.find(
    t => t.month === prevMonth && 
         t.year === prevYear &&
         (t.salesmanId === effectiveUserId || (t.targetType === "general" && !t.salesmanId))
  );

  // Calculate actual sales for current month
  // Filter sales by customers assigned to the effective user
  const userCustomers = customers.filter(c => c.assignedTo === effectiveUserId);
  const userCustomerIds = userCustomers.map(c => c.id);
  
  const currentMonthSalesData = monthlySales.filter(
    s => s.month === currentMonth && 
         s.year === currentYear &&
         userCustomerIds.includes(s.customerId)
  );

  const currentMonthSales = currentMonthSalesData.reduce((total, sale) => {
    return total + (sale.actual ? Number(sale.actual) : 0);
  }, 0);

  // Calculate previous month's sales
  const previousMonthSalesData = monthlySales.filter(
    s => s.month === prevMonth && 
         s.year === prevYear &&
         userCustomerIds.includes(s.customerId)
  );

  const previousMonthSales = previousMonthSalesData.reduce((total, sale) => {
    return total + (sale.actual ? Number(sale.actual) : 0);
  }, 0);

  // Calculate month-over-month changes
  const salesChange = previousMonthSales > 0 
    ? ((currentMonthSales - previousMonthSales) / previousMonthSales) * 100 
    : 0;
  const targetChange = previousMonthTarget?.targetAmount && currentMonthTarget?.targetAmount
    ? ((Number(currentMonthTarget.targetAmount) - Number(previousMonthTarget.targetAmount)) / Number(previousMonthTarget.targetAmount)) * 100
    : 0;

  // Filter leads for the effective user
  const userLeads = userCustomers.filter(c => c.stage === "lead");

  // Filter action items for the effective user's customers
  const userActionItems = actionItems.filter(item => 
    userCustomerIds.includes(item.customerId)
  );

  // Categorize action items
  const overdueTasks = userActionItems.filter(item => !item.completedAt && item.dueDate && isPast(new Date(item.dueDate)) && !isToday(new Date(item.dueDate)));
  const todayTasks = userActionItems.filter(item => !item.completedAt && item.dueDate && isToday(new Date(item.dueDate)));
  const upcomingTasks = userActionItems.filter(item => !item.completedAt && item.dueDate && !isPast(new Date(item.dueDate)) && !isToday(new Date(item.dueDate)));

  // Calculate monthly interaction count for effective user
  const userInteractions = interactions.filter(i => userCustomerIds.includes(i.customerId));
  const currentMonthInteractions = userInteractions.filter(interaction => {
    const interactionDate = new Date(interaction.date);
    return interactionDate.getMonth() === currentMonth - 1 && interactionDate.getFullYear() === currentYear;
  });

  // Calculate previous month interactions
  const previousMonthInteractions = userInteractions.filter(interaction => {
    const interactionDate = new Date(interaction.date);
    return interactionDate.getMonth() === prevMonth - 1 && interactionDate.getFullYear() === prevYear;
  });

  const interactionsChange = previousMonthInteractions.length > 0
    ? ((currentMonthInteractions.length - previousMonthInteractions.length) / previousMonthInteractions.length) * 100
    : 0;

  // Calculate new customers this month for effective user
  const newCustomersThisMonth = userCustomers.filter(customer => {
    if (!customer.dateOfFirstContact) return false;
    const firstContactDate = new Date(customer.dateOfFirstContact);
    return firstContactDate.getMonth() === currentMonth - 1 && firstContactDate.getFullYear() === currentYear;
  });

  // Calculate new customers previous month
  const newCustomersPreviousMonth = userCustomers.filter(customer => {
    if (!customer.dateOfFirstContact) return false;
    const firstContactDate = new Date(customer.dateOfFirstContact);
    return firstContactDate.getMonth() === prevMonth - 1 && firstContactDate.getFullYear() === prevYear;
  });

  const newCustomersChange = newCustomersPreviousMonth.length > 0
    ? ((newCustomersThisMonth.length - newCustomersPreviousMonth.length) / newCustomersPreviousMonth.length) * 100
    : 0;

  // Role-based view rendering
  const isIndividual = user?.role === "salesman";
  const isManager = user?.role === "manager" || user?.role === "sales_director" || user?.role === "regional_manager";
  const isCEO = user?.role === "ceo" || user?.role === "sales_director" || user?.role === "admin";

  // Get the name of the user being viewed
  const viewedUserName = selectedUserId 
    ? teamMembers.find(m => m.id === selectedUserId)?.name 
    : user?.name;

  // Calculate customers needing follow-up (not contacted in 14+ days)
  const customersNeedingFollowUp = userCustomers.filter(customer => {
    if (!customer.lastContactDate) return true; // Never contacted
    const daysSinceContact = Math.floor((Date.now() - new Date(customer.lastContactDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceContact >= 14;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">
            {isIndividual && "My Dashboard"}
            {isManager && !isCEO && (isViewingOwnDashboard ? "My Team Dashboard" : `${viewedUserName}'s Dashboard`)}
            {isCEO && (isViewingOwnDashboard ? "Sales Overview" : `${viewedUserName}'s Dashboard`)}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isIndividual && `Welcome back, ${user?.name}`}
            {isManager && !isCEO && (isViewingOwnDashboard ? "Manage your team's performance" : `Viewing ${viewedUserName}'s performance`)}
            {isCEO && (isViewingOwnDashboard ? "Monitor sales across all regions" : `Viewing ${viewedUserName}'s performance`)}
          </p>
          {isViewingOwnDashboard && user?.regionalOffice && (
            <div className="mt-2">
              <Badge variant="secondary" data-testid="badge-regional-office">
                {user.regionalOffice}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Team/Country Selector for Managers and CEOs */}
      {(isManager || isCEO) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">View Team Member</CardTitle>
            <CardDescription>Select a team member to view their dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Select value={selectedUserId || "myself"} onValueChange={(val) => setSelectedUserId(val === "myself" ? null : val)}>
                  <SelectTrigger data-testid="select-team-member">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="myself">Myself</SelectItem>
                    {teamMembers
                      .filter(member => member.id !== user?.id)
                      .map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} ({member.role})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today Summary Strip - Only show if there are items needing attention */}
      {(overdueTasks.length > 0 || todayTasks.length > 0 || customersNeedingFollowUp.length > 0) && (
        <Card className="bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent border-l-4 border-l-orange-500">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">Today's Priorities</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Overdue Tasks */}
              {overdueTasks.length > 0 && (
                <div className="space-y-2" data-testid="card-overdue-tasks">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Overdue Tasks</span>
                    <Badge variant="destructive" className="ml-2">
                      {overdueTasks.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {overdueTasks.slice(0, 3).map(task => {
                      const customer = customers.find(c => c.id === task.customerId);
                      return (
                        <div key={task.id} className="text-sm">
                          <Link href="/tasks" className="text-red-600 dark:text-red-400 hover:underline">
                            {customer?.name} - {task.description}
                          </Link>
                        </div>
                      );
                    })}
                    {overdueTasks.length > 3 && (
                      <Link href="/tasks">
                        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                          +{overdueTasks.length - 3} more
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Today's Tasks */}
              {todayTasks.length > 0 && (
                <div className="space-y-2" data-testid="card-today-tasks">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Due Today</span>
                    <Badge variant="secondary" className="ml-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                      {todayTasks.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {todayTasks.slice(0, 3).map(task => {
                      const customer = customers.find(c => c.id === task.customerId);
                      return (
                        <div key={task.id} className="text-sm">
                          <Link href="/tasks" className="text-blue-600 dark:text-blue-400 hover:underline">
                            {customer?.name} - {task.description}
                          </Link>
                        </div>
                      );
                    })}
                    {todayTasks.length > 3 && (
                      <Link href="/tasks">
                        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                          +{todayTasks.length - 3} more
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Customers Needing Follow-Up */}
              {customersNeedingFollowUp.length > 0 && (
                <div className="space-y-2" data-testid="card-followup-needed">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Need Follow-Up</span>
                    <Badge variant="secondary" className="ml-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                      {customersNeedingFollowUp.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {customersNeedingFollowUp.slice(0, 3).map(customer => {
                      const daysSinceContact = customer.lastContactDate 
                        ? Math.floor((Date.now() - new Date(customer.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
                        : null;
                      return (
                        <div key={customer.id} className="text-sm">
                          <Link href="/customers" className="text-amber-600 dark:text-amber-400 hover:underline">
                            {customer.name} {daysSinceContact && `(${daysSinceContact}d ago)`}
                          </Link>
                        </div>
                      );
                    })}
                    {customersNeedingFollowUp.length > 3 && (
                      <Link href="/customers">
                        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                          +{customersNeedingFollowUp.length - 3} more
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions - Only show for own dashboard */}
      {isViewingOwnDashboard && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/customers?action=interaction">
              <Card className="hover-elevate cursor-pointer" data-testid="card-log-interaction">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Log Customer Interaction</p>
                      <p className="text-sm text-muted-foreground">Record meeting or call</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/sales">
              <Card className="hover-elevate cursor-pointer" data-testid="card-log-sale">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold">Log New Sale</p>
                      <p className="text-sm text-muted-foreground">Record a sale</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/customers?action=new">
              <Card className="hover-elevate cursor-pointer" data-testid="card-add-customer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold">Log New Customer</p>
                      <p className="text-sm text-muted-foreground">Add new customer</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/customers?action=lead">
              <Card className="hover-elevate cursor-pointer" data-testid="card-add-lead">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-amber-500/10">
                      <TargetIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-semibold">Log New Lead</p>
                      <p className="text-sm text-muted-foreground">Add new prospect</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}

      {/* Calendar View - Shows action items and interactions */}
      <CalendarView 
        actionItems={userActionItems} 
        interactions={interactions.filter(i => userCustomerIds.includes(i.customerId))}
        customers={customers}
      />

      {/* Statistics - Current Month */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {isViewingOwnDashboard ? "Current Month Performance" : `${viewedUserName}'s Current Month Performance`}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Target Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Target</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold" data-testid="text-target-amount">
                  ${currentMonthTarget?.targetAmount ? Number(currentMonthTarget.targetAmount).toLocaleString() : '0'}
                </div>
                {targetChange !== 0 && (
                  <div className={`flex items-center gap-1 text-xs ${targetChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {targetChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{Math.abs(targetChange).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(), 'MMMM yyyy')}
              </p>
            </CardContent>
          </Card>

          {/* Sales Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sales to Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-sales-amount">
                  ${currentMonthSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className={`flex items-center gap-1 text-xs ${salesChange > 0 ? 'text-green-600 dark:text-green-400' : salesChange < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`} aria-label={`Trend: ${salesChange > 0 ? 'up' : salesChange < 0 ? 'down' : 'no change'} ${Math.abs(salesChange).toFixed(1)}%`}>
                  {salesChange > 0 ? <TrendingUp className="h-3 w-3" /> : salesChange < 0 ? <TrendingDown className="h-3 w-3" /> : <span className="h-3 w-3" />}
                  <span>{previousMonthSales > 0 ? `${Math.abs(salesChange).toFixed(1)}%` : '--'}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                vs ${previousMonthSales.toLocaleString(undefined, { maximumFractionDigits: 0 })} last month
              </p>
            </CardContent>
          </Card>

          {/* Progress Card with Color-Coded Bar */}
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
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={currentMonthTarget?.targetAmount ? Math.min((currentMonthSales / Number(currentMonthTarget.targetAmount)) * 100, 100) : 0} aria-valuemin={0} aria-valuemax={100}>
                <div 
                  className={`h-full rounded-full transition-all ${
                    currentMonthTarget?.targetAmount
                      ? (currentMonthSales / Number(currentMonthTarget.targetAmount)) >= 1.0
                        ? 'bg-green-600'
                        : (currentMonthSales / Number(currentMonthTarget.targetAmount)) >= 0.75
                        ? 'bg-blue-600'
                        : (currentMonthSales / Number(currentMonthTarget.targetAmount)) >= 0.5
                        ? 'bg-amber-600'
                        : 'bg-red-600'
                      : 'bg-muted'
                  }`}
                  style={{ 
                    width: `${currentMonthTarget?.targetAmount ? Math.min((currentMonthSales / Number(currentMonthTarget.targetAmount)) * 100, 100) : 0}%` 
                  }}
                  data-testid="progress-bar"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentMonthTarget?.targetAmount
                  ? (currentMonthSales / Number(currentMonthTarget.targetAmount)) >= 1.0
                    ? 'Target achieved!'
                    : (currentMonthSales / Number(currentMonthTarget.targetAmount)) >= 0.75
                    ? 'On track'
                    : (currentMonthSales / Number(currentMonthTarget.targetAmount)) >= 0.5
                    ? 'Behind pace'
                    : 'Needs attention'
                  : 'No target set'}
              </p>
            </CardContent>
          </Card>

          {/* Interactions Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Interactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400" data-testid="text-interaction-count">
                  {currentMonthInteractions.length}
                </div>
                {previousMonthInteractions.length > 0 && (
                  <div className={`flex items-center gap-1 text-xs ${interactionsChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {interactionsChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{Math.abs(interactionsChange).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {previousMonthInteractions.length} last month
              </p>
            </CardContent>
          </Card>

          {/* New Customers Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">New Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-new-customers-count">
                  {newCustomersThisMonth.length}
                </div>
                {newCustomersPreviousMonth.length > 0 && (
                  <div className={`flex items-center gap-1 text-xs ${newCustomersChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {newCustomersChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{Math.abs(newCustomersChange).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {newCustomersPreviousMonth.length} last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Historical Months */}
        <div className="mt-4">
          <Link href="/targets">
            <Button variant="outline" size="sm" data-testid="button-view-historical">
              <Calendar className="h-4 w-4 mr-2" />
              View Historical & Future Months
            </Button>
          </Link>
        </div>
      </div>

      {/* At-Risk Customers Widget */}
      {(() => {
        // Calculate at-risk customers
        const atRiskCustomers = userCustomers.filter(customer => {
          // Check if not contacted recently (14+ days)
          const needsFollowUp = !customer.lastContactDate || 
            Math.floor((Date.now() - new Date(customer.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)) >= 14;
          
          // Check if below monthly target
          const customerSales = monthlySales.filter(s => 
            s.customerId === customer.id &&
            s.month === currentMonth &&
            s.year === currentYear
          );
          const budget = customerSales.length > 0 ? Number(customerSales[0].budget) : 0;
          const actual = customerSales.length > 0 && customerSales[0].actual ? Number(customerSales[0].actual) : 0;
          const belowTarget = budget > 0 && actual < budget * 0.5; // Below 50% of target
          
          // Check if has overdue follow-ups
          const customerActionItems = userActionItems.filter(item => item.customerId === customer.id);
          const hasOverdueItems = customerActionItems.some(item => 
            !item.completedAt && item.dueDate && isPast(new Date(item.dueDate)) && !isToday(new Date(item.dueDate))
          );
          
          return needsFollowUp || belowTarget || hasOverdueItems;
        }).map(customer => {
          const needsFollowUp = !customer.lastContactDate || 
            Math.floor((Date.now() - new Date(customer.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)) >= 14;
          const customerSales = monthlySales.filter(s => 
            s.customerId === customer.id &&
            s.month === currentMonth &&
            s.year === currentYear
          );
          const budget = customerSales.length > 0 ? Number(customerSales[0].budget) : 0;
          const actual = customerSales.length > 0 && customerSales[0].actual ? Number(customerSales[0].actual) : 0;
          const belowTarget = budget > 0 && actual < budget * 0.5;
          const customerActionItems = userActionItems.filter(item => item.customerId === customer.id);
          const hasOverdueItems = customerActionItems.some(item => 
            !item.completedAt && item.dueDate && isPast(new Date(item.dueDate)) && !isToday(new Date(item.dueDate))
          );
          
          const reasons = [];
          if (needsFollowUp) reasons.push('No recent contact');
          if (belowTarget) reasons.push('Below target');
          if (hasOverdueItems) reasons.push('Overdue tasks');
          
          return { customer, reasons };
        });

        if (atRiskCustomers.length === 0) return null;

        return (
          <Card className="border-amber-500/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-lg">At-Risk Customers</CardTitle>
              </div>
              <CardDescription>
                Customers that need immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {atRiskCustomers.slice(0, 10).map(({ customer, reasons }) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg border hover-elevate" data-testid={`at-risk-customer-${customer.id}`}>
                    <div className="flex-1">
                      <Link href="/customers" className="font-medium hover:underline">
                        {customer.name}
                      </Link>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {reasons.map((reason, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Link href="/customers">
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
                {atRiskCustomers.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    +{atRiskCustomers.length - 10} more customers need attention
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Team Performance Summary - For CEOs and Managers viewing own dashboard */}
      {(isCEO || isManager) && isViewingOwnDashboard && teamMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Performance</CardTitle>
            <CardDescription>
              Your team's current month performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamMembers
                .filter(member => member.id !== user?.id)
                .map(member => {
                  const memberCustomers = customers.filter(c => c.assignedTo === member.id);
                  const memberCustomerIds = memberCustomers.map(c => c.id);
                  
                  const memberSales = monthlySales.filter(s => 
                    s.month === currentMonth && 
                    s.year === currentYear &&
                    memberCustomerIds.includes(s.customerId)
                  ).reduce((total, sale) => total + (sale.actual ? Number(sale.actual) : 0), 0);
                  
                  const memberTarget = monthlyTargets.find(
                    t => t.month === currentMonth && 
                         t.year === currentYear &&
                         (t.salesmanId === member.id || (t.targetType === "general" && !t.salesmanId))
                  );
                  
                  const progress = memberTarget?.targetAmount 
                    ? Math.round((memberSales / Number(memberTarget.targetAmount)) * 100)
                    : 0;
                  
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border hover-elevate" data-testid={`team-member-${member.id}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/user-details/${member.id}`} className="font-medium hover:underline">
                            {member.name}
                          </Link>
                          <Badge variant="outline" className="text-xs capitalize">{member.role}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>${memberSales.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ${memberTarget?.targetAmount ? Number(memberTarget.targetAmount).toLocaleString() : '0'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32">
                          <div className="h-2 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.min(progress, 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${member.name} progress`}>
                            <div 
                              className={`h-full rounded-full transition-all ${
                                progress >= 100 ? 'bg-green-600' : 
                                progress >= 75 ? 'bg-blue-600' : 
                                progress >= 50 ? 'bg-amber-600' : 
                                'bg-red-600'
                              }`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>
                        <Badge variant={progress >= 100 ? "default" : progress >= 75 ? "secondary" : "outline"}>
                          {progress}%
                        </Badge>
                      </div>
                    </div>
                  );
                })
                .slice(0, 8)}
              {teamMembers.length > 9 && (
                <Link href="/analytics">
                  <Button variant="outline" size="sm" className="w-full">
                    View Full Team Performance →
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer-Specific Progress Bars */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer Performance</CardTitle>
          <CardDescription>
            {isViewingOwnDashboard ? "Monthly progress with each customer" : `${viewedUserName}'s customer progress`}
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

      {/* Leads Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-lg">Leads</CardTitle>
            <CardDescription>
              {isViewingOwnDashboard ? "New opportunities to pursue" : `${viewedUserName}'s leads`}
            </CardDescription>
          </div>
          <Badge variant="secondary" data-testid="badge-lead-count">{userLeads.length}</Badge>
        </CardHeader>
        <CardContent>
          {userLeads.length > 0 ? (
            <div className="space-y-2">
              {userLeads.slice(0, 5).map((lead) => (
                <Link key={lead.id} href={`/customers?id=${lead.id}`}>
                  <div 
                    className="flex items-center justify-between p-3 rounded-md hover-elevate cursor-pointer"
                    data-testid={`item-lead-${lead.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">{lead.email}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {userLeads.length > 5 && (
                <Link href="/customers?stage=lead">
                  <Button variant="ghost" size="sm" className="w-full mt-2" data-testid="button-view-all-leads">
                    View All {userLeads.length} Leads
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <TargetIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No leads yet</p>
              {isViewingOwnDashboard && (
                <Link href="/customers?action=lead">
                  <Button variant="outline" size="sm" className="mt-4" data-testid="button-add-first-lead">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Lead
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overall Action Items List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-lg">Action Items</CardTitle>
            <CardDescription>
              {isViewingOwnDashboard ? "Manage all your action items" : `${viewedUserName}'s action items`}
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
                const customer = customers.find(c => c.id === item.customerId);
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

            {userActionItems.filter(item => {
              if (filterStatus === "pending") return !item.completedAt;
              if (filterStatus === "completed") return item.completedAt;
              if (filterStatus === "overdue") return !item.completedAt && item.dueDate && isPast(parseISO(item.dueDate.toString())) && !isToday(parseISO(item.dueDate.toString()));
              return true;
            }).filter(item => {
              if (filterCustomer === "all") return true;
              return item.customerId === filterCustomer;
            }).length > 10 && (
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="w-full mt-2" data-testid="button-view-all-actions">
                  View All Action Items
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
