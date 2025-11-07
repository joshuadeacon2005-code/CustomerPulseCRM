import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Building2
} from "lucide-react";
import type { Customer, MonthlyTarget, ActionItem, User, MonthlySalesTracking, Interaction } from "@shared/schema";
import { format, isToday, isPast } from "date-fns";
import { CalendarView } from "@/components/calendar-view";

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
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

  // Find target for current user (or selected team member)
  const currentMonthTarget = monthlyTargets.find(
    t => t.month === currentMonth && 
         t.year === currentYear &&
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

  // Role-based view rendering
  const isIndividual = user?.role === "salesman";
  const isManager = user?.role === "manager" || user?.role === "sales_director" || user?.role === "regional_manager";
  const isCEO = user?.role === "ceo" || user?.role === "sales_director";

  // Get the name of the user being viewed
  const viewedUserName = selectedUserId 
    ? teamMembers.find(m => m.id === selectedUserId)?.name 
    : user?.name;

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

      {/* Statistics - Current Month */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {isViewingOwnDashboard ? "Current Month Performance" : `${viewedUserName}'s Current Month Performance`}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
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

      {/* Calendar View - Replaces To Do List */}
      <CalendarView 
        actionItems={userActionItems} 
        interactions={interactions.filter(i => userCustomerIds.includes(i.customerId))}
        customers={customers}
      />
    </div>
  );
}
