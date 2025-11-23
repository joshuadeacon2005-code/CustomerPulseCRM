import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardStats, Customer, User } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { Users as UsersIcon, Target, Activity, UserCheck, Building2, TrendingUp, TrendingDown, DollarSign, Award, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format } from "date-fns";

const STAGE_COLORS = {
  lead: "hsl(var(--chart-4))",
  prospect: "hsl(var(--chart-3))",
  customer: "hsl(var(--chart-2))",
};

const REGIONAL_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

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
  const [view, setView] = useState<"monthly" | "overall">("overall");
  const [showAllTeams, setShowAllTeams] = useState(false);
  
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

  // Regional office breakdown
  const regionalData = customers?.reduce((acc, customer) => {
    const office = customer.country || "Unknown";
    if (!acc[office]) {
      acc[office] = { leads: 0, prospects: 0, customers: 0, total: 0 };
    }
    acc[office].total++;
    if (customer.stage === "lead") acc[office].leads++;
    if (customer.stage === "prospect") acc[office].prospects++;
    if (customer.stage === "customer") acc[office].customers++;
    return acc;
  }, {} as Record<string, { leads: number; prospects: number; customers: number; total: number }>);

  const regionalChartData = regionalData
    ? Object.entries(regionalData)
        .map(([name, data]) => ({
          name,
          ...data,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8)
    : [];

  // Fix: Use user names instead of IDs
  const assignmentData = customers?.reduce((acc, customer) => {
    if (customer.assignedTo && userMap) {
      const userName = userMap[customer.assignedTo] || customer.assignedTo;
      acc[userName] = (acc[userName] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const assignmentChartData = assignmentData 
    ? Object.entries(assignmentData)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    : [];

  // Calculate additional metrics
  const activeCustomers = customers?.filter(c => c.stage === "customer").length || 0;
  const totalLeads = customers?.filter(c => c.stage === "lead").length || 0;
  const conversionRate = stats?.totalCustomers 
    ? ((stats.customerCount / stats.totalCustomers) * 100)
    : 0;

  const isLoading = statsLoading || customersLoading || usersLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-96" />
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
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-analytics-title">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into customer data, team performance, and sales metrics
            {isCEO && " across all teams"}
            {isManager && " for your team"}
          </p>
        </div>
        
        <Tabs value={view} onValueChange={(v) => setView(v as "monthly" | "overall")}>
          <TabsList data-testid="tabs-analytics-view">
            <TabsTrigger value="overall" data-testid="tab-overall">Overall</TabsTrigger>
            <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "monthly" && (
        <div className="flex justify-end">
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
            <SelectTrigger className="w-[220px]" data-testid="select-month">
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
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Customers</h3>
            <UsersIcon className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-customers">{stats?.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-primary font-medium">{activeCustomers} active</span>
              <span>•</span>
              <span>Across all stages</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Conversion Rate</h3>
            <Target className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-conversion-rate">
              {conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {conversionRate >= 30 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500 font-medium">Excellent</span>
                </>
              ) : conversionRate >= 15 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-yellow-500" />
                  <span className="text-yellow-500 font-medium">Good</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500 font-medium">Needs improvement</span>
                </>
              )}
              <span>•</span>
              <span>Lead to customer</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {view === "monthly" ? "Monthly Activity" : "Recent Activity"}
            </h3>
            <Activity className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-recent-activity">{stats?.recentInteractions || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {view === "monthly" ? "Interactions this month" : "Interactions in last 7 days"}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">New Leads</h3>
            <Award className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-leads">{totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {view === "monthly" ? "This month" : "Total pipeline"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Customer Distribution by Stage
            </CardTitle>
            <CardDescription>Overview of your sales funnel</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={stageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {regionalChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Regional Distribution
              </CardTitle>
              <CardDescription>Customer breakdown by location</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={regionalChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="customers" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Customers" />
                  <Bar dataKey="prospects" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Prospects" />
                  <Bar dataKey="leads" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Team Structure - Only for CEO and Regional Managers */}
      {(isCEO || isManager) && visibleTeams && visibleTeams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Team Structure & Performance
            </CardTitle>
            <CardDescription>
              {isCEO ? "All teams and their performance metrics" : "Your team members and their performance"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {visibleTeams.slice(0, showAllTeams ? visibleTeams.length : 3).map((team, teamIndex) => {
              const isThirdTeam = !showAllTeams && teamIndex === 2 && visibleTeams.length > 2;
              return (
                <div 
                  key={team.manager.id} 
                  className={`space-y-4 pb-6 border-b last:border-0 last:pb-0 ${isThirdTeam ? 'opacity-50 relative overflow-hidden' : ''}`}
                  style={isThirdTeam ? { maxHeight: '50%', clipPath: 'inset(0 0 50% 0)' } : {}}
                  data-testid={`team-${team.manager.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCheck className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold" data-testid={`text-manager-name-${team.manager.id}`}>{team.manager.name}</h3>
                        <p className="text-sm text-muted-foreground">{team.manager.role} • {team.manager.regionalOffice || "No office"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary" data-testid={`text-team-customers-${team.manager.id}`}>{team.customerCount}</div>
                      <p className="text-xs text-muted-foreground">Team Customers</p>
                    </div>
                  </div>
                  
                  {team.members.length > 0 && (
                    <div className="ml-15 space-y-3 bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm font-medium">Team Members ({team.members.length})</p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {team.members.map((member) => {
                          const memberCustomers = customers?.filter(c => c.assignedTo === member.id).length || 0;
                          return (
                            <div 
                              key={member.id}
                              className="flex items-center justify-between bg-background p-3 rounded-md border"
                              data-testid={`badge-member-${member.id}`}
                            >
                              <span className="font-medium text-sm">{member.name}</span>
                              <Badge variant="secondary" className="ml-2">
                                {memberCustomers}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Show More/Less Button */}
            {visibleTeams.length > 2 && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowAllTeams(!showAllTeams)}
                  className="text-primary hover:text-primary/80"
                  data-testid="button-toggle-teams"
                >
                  {showAllTeams ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show More
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Individual salespeople without teams */}
            {isCEO && individualSalespeople.length > 0 && (
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-semibold">Independent Salespeople ({individualSalespeople.length})</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {individualSalespeople.map((person) => {
                    const personCustomers = customers?.filter(c => c.assignedTo === person.id).length || 0;
                    return (
                      <div 
                        key={person.id}
                        className="flex items-center justify-between bg-muted/50 p-3 rounded-md border"
                        data-testid={`badge-independent-${person.id}`}
                      >
                        <span className="font-medium text-sm">{person.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {personCustomers}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sales Rep Performance Chart */}
      {assignmentChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Top Performers
            </CardTitle>
            <CardDescription>Customer distribution across sales team (top 10)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
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
                  width={180}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} name="Customers" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
