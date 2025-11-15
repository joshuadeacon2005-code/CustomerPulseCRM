import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardStats, Customer, User, UserRole } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users as UsersIcon, Target, Activity, UserCheck, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format } from "date-fns";

const STAGE_COLORS = {
  lead: "hsl(var(--chart-4))",
  prospect: "hsl(var(--chart-3))",
  customer: "hsl(var(--chart-2))",
};

// Helper to generate month options for the last 12 months
function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      label: format(date, "MMMM yyyy"),
      month: date.getMonth(),
      year: date.getFullYear(),
      value: `${date.getFullYear()}-${date.getMonth()}`,
    });
  }
  return options;
}

export default function Analytics() {
  const { user: currentUser } = useAuth();
  const [view, setView] = useState<"monthly" | "overall">("monthly");
  
  // Current month by default
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  
  const monthOptions = getMonthOptions();
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats", view, selectedMonth, selectedYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (view === "monthly") {
        params.append("monthly", "true");
        params.append("month", selectedMonth.toString());
        params.append("year", selectedYear.toString());
      }
      const response = await fetch(`/api/stats?${params}`);
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<Omit<User, 'password'>[]>({
    queryKey: ["/api/users"],
  });

  // Create user ID to name mapping
  const userMap = users?.reduce((acc, user) => {
    acc[user.id] = user.name;
    return acc;
  }, {} as Record<string, string>);

  // Build team structure for CEOs and Regional Managers
  const teamStructure = users?.reduce((acc, user) => {
    if (user.role === "manager") {
      const teamMembers = users.filter(u => u.managerId === user.id);
      const teamCustomers = customers?.filter(c => 
        c.assignedTo === user.id || teamMembers.some(m => m.id === c.assignedTo)
      ) || [];
      
      acc.push({
        manager: user,
        members: teamMembers,
        customerCount: teamCustomers.length,
      });
    }
    return acc;
  }, [] as Array<{ manager: Omit<User, 'password'>, members: Omit<User, 'password'>[], customerCount: number }>);

  // Individual salespeople (including those without a manager)
  const individualSalespeople = users?.filter(u => 
    u.role === "salesman" && !u.managerId
  ) || [];

  const stageData = [
    { name: "Leads", value: stats?.leadCount || 0, fill: STAGE_COLORS.lead },
    { name: "Prospects", value: stats?.prospectCount || 0, fill: STAGE_COLORS.prospect },
    { name: "Customers", value: stats?.customerCount || 0, fill: STAGE_COLORS.customer },
  ];

  // Fix: Use user names instead of IDs
  const assignmentData = customers?.reduce((acc, customer) => {
    if (customer.assignedTo && userMap) {
      const userName = userMap[customer.assignedTo] || customer.assignedTo;
      acc[userName] = (acc[userName] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const assignmentChartData = assignmentData 
    ? Object.entries(assignmentData).map(([name, count]) => ({ name, count }))
    : [];

  const isLoading = statsLoading || customersLoading || usersLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  const isCEO = currentUser?.role === "sales_director" || currentUser?.role === "ceo" || currentUser?.role === "admin";
  const isManager = currentUser?.role === "manager";

  // Filter team structure based on role
  const visibleTeams = isManager 
    ? teamStructure?.filter(team => team.manager.id === currentUser?.id) 
    : teamStructure;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-analytics-title">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Analyze customer data, lead scores, and sales performance
          {isCEO && " across all teams"}
          {isManager && " for your team"}
        </p>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "monthly" | "overall")} className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList data-testid="tabs-analytics-view">
            <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
            <TabsTrigger value="overall" data-testid="tab-overall">Overall</TabsTrigger>
          </TabsList>
          
          {view === "monthly" && (
            <Select
              value={`${selectedYear}-${selectedMonth}`}
              onValueChange={(value) => {
                const option = monthOptions.find(opt => opt.value === value);
                if (option) {
                  setSelectedMonth(option.month);
                  setSelectedYear(option.year);
                }
              }}
            >
              <SelectTrigger className="w-[200px]" data-testid="select-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} data-testid={`option-month-${option.value}`}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value={view} className="space-y-6">

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Customers</h3>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-customers">{stats?.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all stages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Conversion Rate</h3>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-conversion-rate">
              {stats?.totalCustomers 
                ? ((stats.customerCount / stats.totalCustomers) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lead to customer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {view === "monthly" ? "Monthly Activity" : "Recent Activity"}
            </h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-recent-activity">{stats?.recentInteractions || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {view === "monthly" ? "This month" : "Last 7 days"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Structure - Only for CEO and Regional Managers */}
      {(isCEO || isManager) && visibleTeams && visibleTeams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Team Structure & Performance
            </CardTitle>
            <CardDescription>
              {isCEO ? "All teams and their performance metrics" : "Your team members and their performance"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleTeams.map((team) => (
              <div key={team.manager.id} className="space-y-3 pb-4 border-b last:border-0 last:pb-0" data-testid={`team-${team.manager.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold" data-testid={`text-manager-name-${team.manager.id}`}>{team.manager.name}</h3>
                      <p className="text-sm text-muted-foreground">Manager</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" data-testid={`text-team-customers-${team.manager.id}`}>{team.customerCount}</div>
                    <p className="text-xs text-muted-foreground">Team Customers</p>
                  </div>
                </div>
                
                {team.members.length > 0 && (
                  <div className="ml-8 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Team Members:</p>
                    <div className="flex flex-wrap gap-2">
                      {team.members.map((member) => {
                        const memberCustomers = customers?.filter(c => c.assignedTo === member.id).length || 0;
                        return (
                          <Badge 
                            key={member.id} 
                            variant="secondary" 
                            className="gap-2"
                            data-testid={`badge-member-${member.id}`}
                          >
                            <span>{member.name}</span>
                            <span className="text-muted-foreground">({memberCustomers})</span>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Individual salespeople without teams */}
            {isCEO && individualSalespeople.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-muted-foreground">Independent Salespeople</h3>
                <div className="flex flex-wrap gap-2">
                  {individualSalespeople.map((person) => {
                    const personCustomers = customers?.filter(c => c.assignedTo === person.id).length || 0;
                    return (
                      <Badge 
                        key={person.id} 
                        variant="outline" 
                        className="gap-2"
                        data-testid={`badge-independent-${person.id}`}
                      >
                        <span>{person.name}</span>
                        <span className="text-muted-foreground">({personCustomers})</span>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Distribution by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {assignmentChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customers by Sales Rep</CardTitle>
              <CardDescription>Customer distribution across team members</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={assignmentChartData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--foreground))' }}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--foreground))' }}
                    width={150}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
      </TabsContent>
      </Tabs>
    </div>
  );
}
