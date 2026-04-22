
import { useState, useMemo, Fragment, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, isToday, isPast, parseISO } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  User,
  TrendingUp,
  DollarSign,
  Target as TargetIcon,
  ArrowLeft,
  CheckCircle2,
  Circle,
  AlertCircle,
  Filter,
  Building2,
  MessageSquare,
  Plus,
  Clock,
  BarChart3,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  Customer,
  MonthlyTarget,
  MonthlySalesTracking,
  ActionItem,
  Interaction,
  User as UserType,
  Currency,
  CustomerWithDetails,
  UpdateCustomer,
  InsertInteraction,
  CustomerMonthlyTarget,
} from "@shared/schema";
import { CalendarView } from "@/components/calendar-view";
import { CustomerDetailModal } from "@/components/customer-detail-modal";
import { CURRENCY_SYMBOLS, formatCompactCurrency } from "@/lib/currency";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STAGES = [
  { id: "lead", name: "Leads", color: "bg-blue-500" },
  { id: "prospect", name: "Prospects", color: "bg-amber-500" },
  { id: "customer", name: "Customers", color: "bg-green-500" },
];

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899"];

export default function UserDetailsPage() {
  const [, params] = useRoute("/admin/user-details/:userId");
  const userId = params?.userId;
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const [filterCustomer, setFilterCustomer] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [salesHistoryYear, setSalesHistoryYear] = useState<string>(String(new Date().getFullYear()));
  const [salesHistoryCustomer, setSalesHistoryCustomer] = useState<string>("all");

  const [analyticsYear, setAnalyticsYear] = useState<string>(String(new Date().getFullYear()));
  const [showYearlyTargets, setShowYearlyTargets] = useState(false);

  const [customerTargetMonth, setCustomerTargetMonth] = useState<number>(new Date().getMonth() + 1);
  const [customerTargetYear, setCustomerTargetYear] = useState<number>(new Date().getFullYear());
  const [expandedCustomerTargets, setExpandedCustomerTargets] = useState<Set<string>>(new Set());
  const hasAutoSelectedMonth = useRef(false);

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

  const { data: allUsers = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: !!userId,
  });

  const { data: customerTargetsData } = useQuery<{ customers: Customer[]; targets: CustomerMonthlyTarget[] }>({
    queryKey: [`/api/admin/user-details/${userId}/customer-targets`],
    enabled: !!userId,
  });

  // Auto-select the most recent month with targets if the current month has none
  useEffect(() => {
    if (!customerTargetsData || hasAutoSelectedMonth.current) return;
    hasAutoSelectedMonth.current = true;
    const targets = customerTargetsData.targets;
    if (!targets.length) return;
    const currentM = new Date().getMonth() + 1;
    const currentY = new Date().getFullYear();
    const hasTargetsThisMonth = targets.some(t => t.month === currentM && t.year === currentY);
    if (!hasTargetsThisMonth) {
      const sorted = [...targets].sort((a, b) => a.year !== b.year ? b.year - a.year : b.month - a.month);
      setCustomerTargetMonth(sorted[0].month);
      setCustomerTargetYear(sorted[0].year);
    }
  }, [customerTargetsData]);

  // Reset auto-selection flag when userId changes
  useEffect(() => {
    hasAutoSelectedMonth.current = false;
    setCustomerTargetMonth(new Date().getMonth() + 1);
    setCustomerTargetYear(new Date().getFullYear());
  }, [userId]);

  const userCurrency = (userInfo?.user?.preferredCurrency || "HKD") as Currency;
  const currencySymbol = CURRENCY_SYMBOLS[userCurrency] || "HK$";

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  const { data: selectedCustomerDetail } = useQuery<CustomerWithDetails>({
    queryKey: ["/api/customers", selectedCustomerId],
    enabled: !!selectedCustomerId,
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomer }) =>
      apiRequest("PATCH", `/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
  });

  const addInteractionMutation = useMutation({
    mutationFn: async (data: InsertInteraction) => {
      const response = await apiRequest("POST", "/api/interactions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
    },
  });

  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case "ceo": return "CEO";
      case "admin": return "Admin";
      case "sales_director": return "Sales Director";
      case "regional_manager": return "Regional Manager";
      case "manager": return "Manager";
      case "salesman": return "Salesman";
      default: return role;
    }
  };

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const userCustomers = customers.filter(c => c.assignedTo === userId);
  const userCustomerIds = userCustomers.map(c => c.id);

  const userActionItems = actionItems.filter(item => userCustomerIds.includes(item.customerId));
  const userInteractions = interactions.filter(i => userCustomerIds.includes(i.customerId));

  const currentMonthTarget = monthlyTargets.find(t =>
    t.month === currentMonth &&
    t.year === currentYear &&
    t.targetType === "personal" &&
    t.salesmanId === userId
  );

  const currentMonthSales = monthlySales
    .filter(s =>
      userCustomerIds.includes(s.customerId) &&
      s.month === currentMonth &&
      s.year === currentYear
    )
    .reduce((sum, s) => sum + (s.actual ? Number(s.actual) : 0), 0);

  const currentMonthSalesBase = monthlySales
    .filter(s =>
      userCustomerIds.includes(s.customerId) &&
      s.month === currentMonth &&
      s.year === currentYear
    )
    .reduce((sum, s) => sum + (s.actualBaseCurrencyAmount ? Number(s.actualBaseCurrencyAmount) : 0), 0);

  const currentMonthInteractions = userInteractions.filter(interaction => {
    const interactionDate = new Date(interaction.date);
    return interactionDate.getMonth() === currentMonth - 1 && interactionDate.getFullYear() === currentYear;
  });

  const newCustomersThisMonth = userCustomers.filter(customer => {
    if (!customer.dateOfFirstContact) return false;
    const firstContactDate = new Date(customer.dateOfFirstContact);
    return firstContactDate.getMonth() === currentMonth - 1 && firstContactDate.getFullYear() === currentYear;
  });

  const targetAmount = currentMonthTarget?.targetAmount
    ? Number(currentMonthTarget.targetAmount)
    : 0;
  const targetCurrency = (currentMonthTarget?.currency as Currency) || userCurrency;
  const targetBaseAmount = currentMonthTarget?.baseCurrencyAmount
    ? Number(currentMonthTarget.baseCurrencyAmount)
    : 0;

  const progressPercent = targetBaseAmount > 0
    ? Math.round((currentMonthSalesBase / targetBaseAmount) * 100)
    : 0;

  const handleCustomerClick = (customerId: string) => {
    setSelectedCustomerId(customerId);
  };

  const renderCustomerName = (customer: Customer) => (
    <span
      className="text-primary hover:underline cursor-pointer"
      onClick={() => handleCustomerClick(customer.id)}
      data-testid={`link-customer-${customer.id}`}
    >
      {customer.name}
    </span>
  );

  const getSalesHistoryData = () => {
    const year = parseInt(salesHistoryYear);
    return monthlySales
      .filter(s => {
        if (!userCustomerIds.includes(s.customerId)) return false;
        if (s.year !== year) return false;
        if (salesHistoryCustomer !== "all" && s.customerId !== salesHistoryCustomer) return false;
        return true;
      })
      .sort((a, b) => a.month - b.month || a.customerId.localeCompare(b.customerId));
  };

  const getSalesHistoryMetrics = () => {
    const data = getSalesHistoryData();
    const totalSales = data.reduce((sum, s) => sum + (s.actual ? Number(s.actual) : 0), 0);
    const monthsWithSales = new Set(data.filter(s => s.actual && Number(s.actual) > 0).map(s => s.month)).size;
    const avgMonthly = monthsWithSales > 0 ? totalSales / monthsWithSales : 0;

    const monthTotals: Record<number, number> = {};
    data.forEach(s => {
      if (s.actual) {
        monthTotals[s.month] = (monthTotals[s.month] || 0) + Number(s.actual);
      }
    });

    let bestMonth = "";
    let bestAmount = 0;
    Object.entries(monthTotals).forEach(([month, amount]) => {
      if (amount > bestAmount) {
        bestAmount = amount;
        bestMonth = months[parseInt(month) - 1];
      }
    });

    return { totalSales, avgMonthly, bestMonth, bestAmount };
  };

  const getMonthlyTrendData = () => {
    const year = parseInt(analyticsYear);
    const trendData: { month: string; sales: number; target: number }[] = [];

    for (let m = 1; m <= 12; m++) {
      const monthSales = monthlySales
        .filter(s => userCustomerIds.includes(s.customerId) && s.month === m && s.year === year)
        .reduce((sum, s) => sum + (s.actual ? Number(s.actual) : 0), 0);

      const monthTarget = monthlyTargets.find(t =>
        t.month === m && t.year === year &&
        t.targetType === "personal" &&
        t.salesmanId === userId
      );

      trendData.push({
        month: months[m - 1],
        sales: Math.round(monthSales),
        target: monthTarget ? Math.round(Number(monthTarget.targetAmount)) : 0,
      });
    }

    return trendData;
  };

  const getCustomerBreakdownData = () => {
    const year = parseInt(analyticsYear);
    const customerTotals: Record<string, { name: string; total: number }> = {};

    monthlySales
      .filter(s => userCustomerIds.includes(s.customerId) && s.year === year && s.actual)
      .forEach(s => {
        const customer = userCustomers.find(c => c.id === s.customerId);
        if (customer) {
          if (!customerTotals[s.customerId]) {
            customerTotals[s.customerId] = { name: customer.name, total: 0 };
          }
          customerTotals[s.customerId].total += Number(s.actual!);
        }
      });

    return Object.values(customerTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map(item => ({ ...item, total: Math.round(item.total) }));
  };

  const getAnalyticsKPIs = () => {
    const year = parseInt(analyticsYear);
    const yearSales = monthlySales
      .filter(s => userCustomerIds.includes(s.customerId) && s.year === year && s.actual)
      .reduce((sum, s) => sum + Number(s.actual!), 0);

    const yearSalesBase = monthlySales
      .filter(s => userCustomerIds.includes(s.customerId) && s.year === year && s.actual)
      .reduce((sum, s) => sum + (s.actualBaseCurrencyAmount ? Number(s.actualBaseCurrencyAmount) : 0), 0);

    const salesCount = monthlySales
      .filter(s => userCustomerIds.includes(s.customerId) && s.year === year && s.actual && Number(s.actual) > 0)
      .length;

    const avgDealSize = salesCount > 0 ? yearSales / salesCount : 0;

    const yearTargetBase = monthlyTargets
      .filter(t => t.year === year && t.targetType === "personal" && t.salesmanId === userId)
      .reduce((sum, t) => sum + Number(t.baseCurrencyAmount || t.targetAmount), 0);

    const targetAchievement = yearTargetBase > 0 ? Math.round((yearSalesBase / yearTargetBase) * 100) : 0;

    const activeCustomers = userCustomers.filter(c => c.stage === "customer").length;

    return { yearSales, avgDealSize, targetAchievement, activeCustomers };
  };

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    monthlySales.forEach(s => {
      if (userCustomerIds.includes(s.customerId)) {
        years.add(s.year);
      }
    });
    monthlyTargets.forEach(t => {
      if (t.targetType === "personal" && t.salesmanId === userId) {
        years.add(t.year);
      }
    });
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [monthlySales, monthlyTargets, userCustomerIds, userId, currentYear]);

  const customersByStage = useMemo(() => {
    return STAGES.reduce((acc, stage) => {
      acc[stage.id] = userCustomers.filter(c => c.stage === stage.id);
      return acc;
    }, {} as Record<string, Customer[]>);
  }, [userCustomers]);

  if (!userId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-destructive">Error loading user details</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userInfo) {
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="sm" data-testid="button-back-to-admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <User className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-user-name">
              {userInfo.user.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                  <span className="text-sm text-muted-foreground">|</span>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-user-details">
        <TabsList className="flex flex-wrap" data-testid="tabs-list">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="targets" data-testid="tab-targets">Targets &amp; Customers</TabsTrigger>
          <TabsTrigger value="sales-history" data-testid="tab-sales-history">Sales History</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="pipeline" data-testid="tab-pipeline">Pipeline</TabsTrigger>
        </TabsList>

        {/* Tab 1: Dashboard */}
        <TabsContent value="dashboard" className="space-y-6" data-testid="tab-content-dashboard">
          <div>
            <h2 className="text-xl font-semibold mb-4">Current Month Performance</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card
                className="hover-elevate relative overflow-visible cursor-pointer"
                data-testid="card-target"
                onClick={() => setShowYearlyTargets(!showYearlyTargets)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl pointer-events-none" />
                <CardHeader className="relative pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TargetIcon className="h-4 w-4 text-primary" />
                    Target
                    {showYearlyTargets ? (
                      <ChevronUp className="h-3 w-3 ml-auto" />
                    ) : (
                      <ChevronDown className="h-3 w-3 ml-auto" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold" data-testid="text-target-amount">
                    {formatCompactCurrency(targetAmount, targetCurrency)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(), "MMMM yyyy")} — click to view all
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate relative overflow-visible" data-testid="card-sales">
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl pointer-events-none" />
                <CardHeader className="relative pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-secondary" />
                    Sales to Date
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-sales-amount">
                    {currencySymbol}{currentMonthSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    As of {format(new Date(), "MMM d")}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate relative overflow-visible" data-testid="card-progress">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl pointer-events-none" />
                <CardHeader className="relative pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold" data-testid="text-progress-percent">
                    {progressPercent}%
                  </div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      data-testid="progress-bar"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover-elevate relative overflow-visible" data-testid="card-interactions">
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl pointer-events-none" />
                <CardHeader className="relative pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-secondary" />
                    Interactions
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold text-secondary" data-testid="text-interaction-count">
                    {currentMonthInteractions.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">This month</p>
                </CardContent>
              </Card>

              <Card className="hover-elevate relative overflow-visible" data-testid="card-new-customers">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl pointer-events-none" />
                <CardHeader className="relative pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    New Customers
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold text-primary" data-testid="text-new-customers-count">
                    {newCustomersThisMonth.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Added this month</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {showYearlyTargets && (
            <Card data-testid="card-yearly-targets-expanded">
              <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TargetIcon className="h-5 w-5" />
                    {currentYear} Personal Targets
                  </CardTitle>
                  <CardDescription>Monthly breakdown for the year</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowYearlyTargets(false)}
                  data-testid="button-close-yearly-targets"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {(() => {
                  const yearTargets = monthlyTargets
                    .filter(t => t.salesmanId === userId && t.targetType === "personal" && t.year === currentYear)
                    .sort((a, b) => a.month - b.month);
                  if (yearTargets.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <TargetIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">No personal targets set for {currentYear}</p>
                      </div>
                    );
                  }
                  const totalTarget = yearTargets.reduce((sum, t) => sum + Number(t.targetAmount), 0);
                  const totalActual = yearTargets.reduce((sum, t) => {
                    return sum + monthlySales
                      .filter(s => userCustomerIds.includes(s.customerId) && s.month === t.month && s.year === t.year)
                      .reduce((s, sale) => s + (sale.actual ? Number(sale.actual) : 0), 0);
                  }, 0);
                  const tCurrency = (yearTargets[0]?.currency as Currency) || userCurrency;
                  return (
                    <Table data-testid="table-yearly-targets">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Target</TableHead>
                          <TableHead className="text-right">Actual</TableHead>
                          <TableHead className="text-right">Variance</TableHead>
                          <TableHead className="text-right">Progress</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {yearTargets.map((target) => {
                          const tc = (target.currency as Currency) || userCurrency;
                          const tAmt = Number(target.targetAmount);
                          const tBase = Number(target.baseCurrencyAmount || target.targetAmount);
                          const salesBase = monthlySales
                            .filter(s => userCustomerIds.includes(s.customerId) && s.month === target.month && s.year === target.year)
                            .reduce((sum, s) => sum + (s.actualBaseCurrencyAmount ? Number(s.actualBaseCurrencyAmount) : 0), 0);
                          const salesActual = monthlySales
                            .filter(s => userCustomerIds.includes(s.customerId) && s.month === target.month && s.year === target.year)
                            .reduce((sum, s) => sum + (s.actual ? Number(s.actual) : 0), 0);
                          const prog = tBase > 0 ? Math.round((salesBase / tBase) * 100) : 0;
                          const vari = salesActual - tAmt;
                          const isCurrent = target.month === currentMonth && target.year === currentYear;
                          const isPast = target.year < currentYear || (target.year === currentYear && target.month < currentMonth);
                          return (
                            <TableRow
                              key={target.id}
                              className={isCurrent ? "bg-primary/5" : ""}
                              data-testid={`yearly-target-row-${target.month}`}
                            >
                              <TableCell className="font-medium">
                                {months[target.month - 1]}
                                {isCurrent && <Badge variant="outline" className="ml-2 text-xs">Now</Badge>}
                              </TableCell>
                              <TableCell className="text-right">{formatCompactCurrency(tAmt, tc)}</TableCell>
                              <TableCell className="text-right">{formatCompactCurrency(salesActual, tc)}</TableCell>
                              <TableCell className="text-right">
                                <span className={vari >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                  {vari >= 0 ? "+" : "-"}{formatCompactCurrency(Math.abs(vari), tc)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center gap-2 justify-end">
                                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        prog >= 100 ? "bg-green-600" : prog >= 75 ? "bg-blue-600" : prog >= 50 ? "bg-amber-600" : "bg-red-600"
                                      }`}
                                      style={{ width: `${Math.min(prog, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm w-10 text-right">{prog}%</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {isPast ? (
                                  prog >= 100 ? (
                                    <Badge variant="default" className="bg-green-600" data-testid={`badge-yearly-achieved-${target.month}`}>Achieved</Badge>
                                  ) : (
                                    <Badge variant="destructive" data-testid={`badge-yearly-missed-${target.month}`}>Missed</Badge>
                                  )
                                ) : isCurrent ? (
                                  <Badge variant="secondary" data-testid={`badge-yearly-inprogress-${target.month}`}>In Progress</Badge>
                                ) : (
                                  <Badge variant="outline" data-testid={`badge-yearly-upcoming-${target.month}`}>Upcoming</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="font-semibold bg-muted/50" data-testid="yearly-target-total-row">
                          <TableCell>Year Total</TableCell>
                          <TableCell className="text-right">{formatCompactCurrency(totalTarget, tCurrency)}</TableCell>
                          <TableCell className="text-right">{formatCompactCurrency(totalActual, tCurrency)}</TableCell>
                          <TableCell className="text-right">
                            <span className={totalActual - totalTarget >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                              {totalActual - totalTarget >= 0 ? "+" : "-"}{formatCompactCurrency(Math.abs(totalActual - totalTarget), tCurrency)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {totalTarget > 0 && (
                              <span className="text-sm">{Math.round((totalActual / totalTarget) * 100)}%</span>
                            )}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          <Card className="hover-elevate relative overflow-visible" data-testid="card-customer-performance">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 rounded-xl pointer-events-none" />
            <CardHeader className="relative">
              <CardTitle className="text-lg">Customer Performance</CardTitle>
              <CardDescription>Monthly progress with each customer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userCustomers.map((customer) => {
                  const customerSales = monthlySales.filter(s =>
                    s.customerId === customer.id &&
                    s.month === currentMonth &&
                    s.year === currentYear
                  );
                  const mstBudget = customerSales.length > 0 ? Number(customerSales[0].budget) : 0;
                  // Fallback to customer_monthly_targets if no MST budget
                  const cmtTarget = (customerTargetsData?.targets || []).find(
                    t => t.customerId === customer.id && t.month === currentMonth && t.year === currentYear
                  );
                  const budget = mstBudget > 0 ? mstBudget : (cmtTarget ? Number(cmtTarget.targetAmount) : 0);
                  const budgetCurrency = (mstBudget > 0
                    ? customerSales[0]?.budgetCurrency
                    : cmtTarget?.currency) as Currency || userCurrency;
                  const budgetSym = CURRENCY_SYMBOLS[budgetCurrency] || currencySymbol;

                  const actual = customerSales.length > 0 && customerSales[0].actual ? Number(customerSales[0].actual) : 0;
                  const progress = budget > 0 ? Math.round((actual / budget) * 100) : 0;
                  const variance = actual - budget;

                  if (budget === 0) return null;

                  return (
                    <div key={customer.id} className="space-y-2" data-testid={`customer-progress-${customer.id}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex-1">
                          <p className="font-medium">{renderCustomerName(customer)}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                            <span>Target: {budgetSym}{budget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <span>Actual: {budgetSym}{actual.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <span className={variance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                              {variance >= 0 ? "+" : ""}{budgetSym}{Math.abs(variance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                            progress >= 100 ? "bg-green-600" :
                            progress >= 75 ? "bg-blue-600" :
                            progress >= 50 ? "bg-amber-600" :
                            "bg-red-600"
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
                  const mstBudget = customerSales.length > 0 ? Number(customerSales[0].budget) : 0;
                  const cmtTarget = (customerTargetsData?.targets || []).find(
                    t => t.customerId === customer.id && t.month === currentMonth && t.year === currentYear
                  );
                  return mstBudget === 0 && !cmtTarget;
                }) && (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No targets set for this month</p>
                    <p className="text-xs text-muted-foreground mt-1">Targets can be set per customer in the Targets tab</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <CalendarView
            actionItems={userActionItems}
            interactions={userInteractions}
            customers={userCustomers}
          />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-lg">Action Items</CardTitle>
                <CardDescription>Manage all action items</CardDescription>
              </div>
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
            </CardHeader>
            <CardContent>
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
                  .slice(0, 20)
                  .map((item) => {
                    const customer = userCustomers.find(c => c.id === item.customerId);
                    const isOverdue = !item.completedAt && item.dueDate && isPast(parseISO(item.dueDate.toString())) && !isToday(parseISO(item.dueDate.toString()));
                    const isDueToday = !item.completedAt && item.dueDate && isToday(parseISO(item.dueDate.toString()));

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-md hover-elevate flex-wrap"
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
                            <p className={`font-medium ${item.completedAt ? "line-through text-muted-foreground" : ""}`}>
                              {item.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {customer && (
                                <span className="text-sm">{renderCustomerName(customer)}</span>
                              )}
                              {item.dueDate && (
                                <>
                                  <span className="text-sm text-muted-foreground">|</span>
                                  <span className={`text-sm ${isOverdue ? "text-red-600 dark:text-red-400 font-medium" : isDueToday ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}>
                                    {format(parseISO(item.dueDate.toString()), "MMM d, yyyy")}
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
        </TabsContent>

        {/* Tab 2: Targets & Customers */}
        <TabsContent value="targets" className="space-y-6" data-testid="tab-content-targets">

          {/* Section 1: Personal Monthly Targets */}
          <Card data-testid="card-monthly-targets-overview">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TargetIcon className="h-5 w-5" />
                  Personal Monthly Targets
                </CardTitle>
                <CardDescription>All personal monthly targets set for this user across all months</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(() => {
                const userTargets = monthlyTargets
                  .filter(t => t.salesmanId === userId && t.targetType === "personal")
                  .sort((a, b) => {
                    if (a.year !== b.year) return a.year - b.year;
                    return a.month - b.month;
                  });
                if (userTargets.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <TargetIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">No personal monthly targets set</p>
                    </div>
                  );
                }
                return (
                  <Table data-testid="table-monthly-targets">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Target</TableHead>
                        <TableHead className="text-right">Actual Sales</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead className="text-right">Progress</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userTargets.map((target) => {
                        const tCurrency = (target.currency as Currency) || userCurrency;
                        const tAmount = Number(target.targetAmount);
                        const tBaseAmount = Number(target.baseCurrencyAmount || target.targetAmount);
                        const monthSalesBase = monthlySales
                          .filter(s =>
                            userCustomerIds.includes(s.customerId) &&
                            s.month === target.month &&
                            s.year === target.year
                          )
                          .reduce((sum, s) => sum + (s.actualBaseCurrencyAmount ? Number(s.actualBaseCurrencyAmount) : 0), 0);
                        const monthSalesActual = monthlySales
                          .filter(s =>
                            userCustomerIds.includes(s.customerId) &&
                            s.month === target.month &&
                            s.year === target.year
                          )
                          .reduce((sum, s) => sum + (s.actual ? Number(s.actual) : 0), 0);
                        const progress = tBaseAmount > 0 ? Math.round((monthSalesBase / tBaseAmount) * 100) : 0;
                        const variance = monthSalesActual - tAmount;
                        const isCurrentMonth = target.month === currentMonth && target.year === currentYear;
                        const isPastMonth = target.year < currentYear || (target.year === currentYear && target.month < currentMonth);
                        return (
                          <TableRow
                            key={target.id}
                            className={isCurrentMonth ? "bg-primary/5" : ""}
                            data-testid={`monthly-target-row-${target.month}-${target.year}`}
                          >
                            <TableCell className="font-medium">
                              {months[target.month - 1]} {target.year}
                              {isCurrentMonth && (
                                <Badge variant="outline" className="ml-2 text-xs">Current</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCompactCurrency(tAmount, tCurrency)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCompactCurrency(monthSalesActual, tCurrency)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={variance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                {variance >= 0 ? "+" : ""}{formatCompactCurrency(Math.abs(variance), tCurrency)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      progress >= 100 ? "bg-green-600" :
                                      progress >= 75 ? "bg-blue-600" :
                                      progress >= 50 ? "bg-amber-600" :
                                      "bg-red-600"
                                    }`}
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                  />
                                </div>
                                <span className="text-sm w-10 text-right">{progress}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {isPastMonth ? (
                                progress >= 100 ? (
                                  <Badge variant="default" className="bg-green-600" data-testid={`badge-status-achieved-${target.month}-${target.year}`}>Achieved</Badge>
                                ) : (
                                  <Badge variant="destructive" data-testid={`badge-status-missed-${target.month}-${target.year}`}>Missed</Badge>
                                )
                              ) : isCurrentMonth ? (
                                <Badge variant="secondary" data-testid={`badge-status-inprogress-${target.month}-${target.year}`}>In Progress</Badge>
                              ) : (
                                <Badge variant="outline" data-testid={`badge-status-upcoming-${target.month}-${target.year}`}>Upcoming</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                );
              })()}
            </CardContent>
          </Card>

          {/* Section 2: Per-Customer Targets */}
          <Card data-testid="card-customer-monthly-targets">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Per-Customer Targets &amp; Progress
                </CardTitle>
                <CardDescription>
                  Individual targets set per customer with actual sales progress. Select a month to view, or expand a customer to see all months.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={String(customerTargetMonth)}
                  onValueChange={v => setCustomerTargetMonth(Number(v))}
                >
                  <SelectTrigger className="w-[120px]" data-testid="select-customer-target-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(customerTargetYear)}
                  onValueChange={v => setCustomerTargetYear(Number(v))}
                >
                  <SelectTrigger className="w-[100px]" data-testid="select-customer-target-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set([
                      currentYear - 1,
                      currentYear,
                      currentYear + 1,
                      ...(customerTargetsData?.targets || []).map(t => t.year),
                    ])).sort((a, b) => b - a).map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(() => {
                const allCusTargets = customerTargetsData?.targets || [];
                const allCusFromApi = customerTargetsData?.customers || userCustomers;

                const customersWithAnyTarget = allCusFromApi.filter(c =>
                  allCusTargets.some(t => t.customerId === c.id)
                );
                const customersWithoutTarget = allCusFromApi.filter(c =>
                  !allCusTargets.some(t => t.customerId === c.id)
                );

                const selectedMonthTargets = allCusTargets.filter(
                  t => t.month === customerTargetMonth && t.year === customerTargetYear
                );

                // MST budget fallback: for customers with no CMT target, check monthly_sales_tracking.budget
                const getMstBudgetForCustomerMonth = (customerId: string, month: number, year: number) => {
                  const mstRecord = monthlySales.find(
                    s => s.customerId === customerId && s.month === month && s.year === year && s.budget && Number(s.budget) > 0
                  );
                  return mstRecord || null;
                };

                // Get unique months that have targets, sorted desc
                const monthsWithTargets = Array.from(
                  new Set(allCusTargets.map(t => `${t.year}-${String(t.month).padStart(2, "0")}`))
                ).sort().reverse().map(key => {
                  const [y, m] = key.split("-");
                  return { month: Number(m), year: Number(y) };
                });

                const hasTargetsThisMonth = selectedMonthTargets.length > 0 ||
                  allCusFromApi.some(c => getMstBudgetForCustomerMonth(c.id, customerTargetMonth, customerTargetYear));
                const hasTargetsOtherMonths = allCusTargets.length > 0 || monthsWithTargets.length > 0;

                const allCustomersForView = [
                  ...allCusFromApi.filter(c =>
                    selectedMonthTargets.some(t => t.customerId === c.id) ||
                    !!getMstBudgetForCustomerMonth(c.id, customerTargetMonth, customerTargetYear)
                  ),
                  ...allCusFromApi.filter(c =>
                    !selectedMonthTargets.some(t => t.customerId === c.id) &&
                    !getMstBudgetForCustomerMonth(c.id, customerTargetMonth, customerTargetYear)
                  ),
                ];

                const toggleExpand = (customerId: string) => {
                  setExpandedCustomerTargets(prev => {
                    const next = new Set(prev);
                    if (next.has(customerId)) {
                      next.delete(customerId);
                    } else {
                      next.add(customerId);
                    }
                    return next;
                  });
                };

                const getActualForCustomerMonth = (customerId: string, month: number, year: number) => {
                  return monthlySales
                    .filter(s => s.customerId === customerId && s.month === month && s.year === year)
                    .reduce((sum, s) => sum + (s.actual ? Number(s.actual) : 0), 0);
                };

                const getStatusBadge = (progress: number, month: number, year: number) => {
                  const isMonthPast = year < currentYear || (year === currentYear && month < currentMonth);
                  const isCurrent = month === currentMonth && year === currentYear;
                  if (isMonthPast) {
                    return progress >= 100
                      ? <Badge variant="default" className="bg-green-600">Achieved</Badge>
                      : <Badge variant="destructive">Missed</Badge>;
                  }
                  if (isCurrent) return <Badge variant="secondary">In Progress</Badge>;
                  return <Badge variant="outline">Upcoming</Badge>;
                };

                if (allCusFromApi.length === 0) {
                  return (
                    <div className="text-center py-10">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">No customers assigned to this user</p>
                    </div>
                  );
                }

                return (
                  <div>
                    {/* Notice when selected month has no targets but other months do */}
                    {!hasTargetsThisMonth && hasTargetsOtherMonths && (
                      <div className="mx-4 mt-4 mb-2 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            No targets set for {months[customerTargetMonth - 1]} {customerTargetYear}
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                            Targets are available for:&nbsp;
                            {monthsWithTargets.slice(0, 6).map((mwt, idx) => (
                              <span key={`${mwt.year}-${mwt.month}`}>
                                {idx > 0 && ", "}
                                <button
                                  className="underline underline-offset-2 hover:no-underline font-medium"
                                  onClick={() => { setCustomerTargetMonth(mwt.month); setCustomerTargetYear(mwt.year); }}
                                >
                                  {months[mwt.month - 1]} {mwt.year}
                                </button>
                              </span>
                            ))}
                            {monthsWithTargets.length > 6 && ` and ${monthsWithTargets.length - 6} more`}
                          </p>
                        </div>
                      </div>
                    )}
                    <Table data-testid="table-customer-targets">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8" />
                          <TableHead>Customer</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead className="text-right">Target ({months[customerTargetMonth - 1]} {customerTargetYear})</TableHead>
                          <TableHead className="text-right">Actual Sales</TableHead>
                          <TableHead className="text-right">Variance</TableHead>
                          <TableHead className="text-right">Progress</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allCustomersForView.map((customer) => {
                          const monthTarget = selectedMonthTargets.find(t => t.customerId === customer.id);
                          // Fallback to MST budget when no CMT target exists
                          const mstBudgetRecord = !monthTarget ? getMstBudgetForCustomerMonth(customer.id, customerTargetMonth, customerTargetYear) : null;
                          const hasTarget = !!monthTarget || !!mstBudgetRecord;
                          const tAmount = monthTarget
                            ? Number(monthTarget.targetAmount)
                            : mstBudgetRecord ? Number(mstBudgetRecord.budget) : 0;
                          const tBase = monthTarget
                            ? Number(monthTarget.baseCurrencyAmount || monthTarget.targetAmount)
                            : mstBudgetRecord ? Number(mstBudgetRecord.budgetBaseCurrencyAmount || mstBudgetRecord.budget) : 0;
                          const tCurrency = monthTarget
                            ? (monthTarget.currency as Currency)
                            : mstBudgetRecord ? (mstBudgetRecord.budgetCurrency as Currency || userCurrency) : userCurrency;
                          const actual = getActualForCustomerMonth(customer.id, customerTargetMonth, customerTargetYear);
                          const actualBase = monthlySales
                            .filter(s => s.customerId === customer.id && s.month === customerTargetMonth && s.year === customerTargetYear)
                            .reduce((sum, s) => sum + (s.actualBaseCurrencyAmount ? Number(s.actualBaseCurrencyAmount) : 0), 0);
                          const progress = tBase > 0 ? Math.round((actualBase / tBase) * 100) : 0;
                          const variance = actual - tAmount;
                          const isExpanded = expandedCustomerTargets.has(customer.id);
                          const customerAllTargets = allCusTargets
                            .filter(t => t.customerId === customer.id)
                            .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
                          const hasAnyTarget = customerAllTargets.length > 0;

                          return (
                            <Fragment key={customer.id}>
                              <TableRow
                                className={`${hasTarget ? "bg-primary/3" : ""} ${hasAnyTarget ? "cursor-pointer hover-elevate" : ""}`}
                                onClick={() => hasAnyTarget && toggleExpand(customer.id)}
                                data-testid={`customer-target-row-${customer.id}`}
                              >
                                <TableCell className="text-center p-2">
                                  {hasAnyTarget ? (
                                    isExpanded
                                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <span className="text-muted-foreground/30 text-xs">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <span className="font-medium">{renderCustomerName(customer)}</span>
                                    {hasAnyTarget && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {customerAllTargets.length} month{customerAllTargets.length !== 1 ? "s" : ""} with targets
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={customer.stage === "customer" ? "default" : customer.stage === "prospect" ? "secondary" : "outline"}
                                    data-testid={`badge-cust-stage-${customer.id}`}
                                  >
                                    {customer.stage}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {hasTarget ? (
                                    <div className="flex items-center gap-1 justify-end">
                                      <span className="font-medium">{formatCompactCurrency(tAmount, tCurrency)}</span>
                                      {mstBudgetRecord && !monthTarget && (
                                        <span className="text-xs text-muted-foreground">(budget)</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">No target</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {hasTarget ? (
                                    <span>{formatCompactCurrency(actual, tCurrency)}</span>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {hasTarget ? (
                                    <span className={variance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                      {variance >= 0 ? "+" : ""}{formatCompactCurrency(Math.abs(variance), tCurrency)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {hasTarget ? (
                                    <div className="flex items-center gap-2 justify-end">
                                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${
                                            progress >= 100 ? "bg-green-600" :
                                            progress >= 75 ? "bg-blue-600" :
                                            progress >= 50 ? "bg-amber-600" :
                                            "bg-red-600"
                                          }`}
                                          style={{ width: `${Math.min(progress, 100)}%` }}
                                        />
                                      </div>
                                      <span className="text-sm w-10 text-right">{progress}%</span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {hasTarget ? getStatusBadge(progress, customerTargetMonth, customerTargetYear) : (
                                    <span className="text-muted-foreground text-sm">—</span>
                                  )}
                                </TableCell>
                              </TableRow>

                              {/* Expanded: all monthly targets for this customer */}
                              {isExpanded && customerAllTargets.map((ct) => {
                                const ctActual = getActualForCustomerMonth(customer.id, ct.month, ct.year);
                                const ctActualBase = monthlySales
                                  .filter(s => s.customerId === customer.id && s.month === ct.month && s.year === ct.year)
                                  .reduce((sum, s) => sum + (s.actualBaseCurrencyAmount ? Number(s.actualBaseCurrencyAmount) : 0), 0);
                                const ctBase = Number(ct.baseCurrencyAmount || ct.targetAmount);
                                const ctAmt = Number(ct.targetAmount);
                                const ctCurrency = (ct.currency as Currency) || userCurrency;
                                const ctProg = ctBase > 0 ? Math.round((ctActualBase / ctBase) * 100) : 0;
                                const ctVariance = ctActual - ctAmt;
                                const isThisMonth = ct.month === customerTargetMonth && ct.year === customerTargetYear;

                                return (
                                  <TableRow
                                    key={ct.id}
                                    className={`bg-muted/30 ${isThisMonth ? "ring-1 ring-inset ring-primary/30" : ""}`}
                                    data-testid={`customer-target-expanded-${customer.id}-${ct.month}-${ct.year}`}
                                  >
                                    <TableCell className="p-2" />
                                    <TableCell className="pl-6 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {months[ct.month - 1]} {ct.year}
                                        {isThisMonth && <Badge variant="outline" className="ml-1 text-xs py-0">Viewing</Badge>}
                                      </span>
                                    </TableCell>
                                    <TableCell />
                                    <TableCell className="text-right text-sm">{formatCompactCurrency(ctAmt, ctCurrency)}</TableCell>
                                    <TableCell className="text-right text-sm">{formatCompactCurrency(ctActual, ctCurrency)}</TableCell>
                                    <TableCell className="text-right text-sm">
                                      <span className={ctVariance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                        {ctVariance >= 0 ? "+" : ""}{formatCompactCurrency(Math.abs(ctVariance), ctCurrency)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center gap-2 justify-end">
                                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all ${
                                              ctProg >= 100 ? "bg-green-600" :
                                              ctProg >= 75 ? "bg-blue-600" :
                                              ctProg >= 50 ? "bg-amber-600" :
                                              "bg-red-600"
                                            }`}
                                            style={{ width: `${Math.min(ctProg, 100)}%` }}
                                          />
                                        </div>
                                        <span className="text-sm w-10 text-right">{ctProg}%</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {getStatusBadge(ctProg, ct.month, ct.year)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <div className="px-4 py-3 border-t bg-muted/20 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span data-testid="text-customers-with-targets">
                        <span className="font-medium text-foreground">{customersWithAnyTarget.length}</span> customers with targets
                      </span>
                      <span>|</span>
                      <span data-testid="text-customers-without-targets">
                        <span className="font-medium text-foreground">{customersWithoutTarget.length}</span> without targets
                      </span>
                      <span>|</span>
                      <span data-testid="text-targets-this-month">
                        <span className="font-medium text-foreground">
                          {allCusFromApi.filter(c =>
                            selectedMonthTargets.some(t => t.customerId === c.id) ||
                            !!getMstBudgetForCustomerMonth(c.id, customerTargetMonth, customerTargetYear)
                          ).length}
                        </span> with targets for {months[customerTargetMonth - 1]} {customerTargetYear}
                      </span>
                      {monthsWithTargets.length > 0 && (
                        <>
                          <span>|</span>
                          <span>
                            Targets set across <span className="font-medium text-foreground">{monthsWithTargets.length}</span> month{monthsWithTargets.length !== 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Sales History */}
        <TabsContent value="sales-history" className="space-y-6" data-testid="tab-content-sales-history">
          {(() => {
            const metrics = getSalesHistoryMetrics();
            return (
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="hover-elevate relative overflow-visible" data-testid="card-total-sales-history">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl pointer-events-none" />
                  <CardHeader className="relative pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-2xl font-bold" data-testid="text-total-sales-history">
                      {currencySymbol}{metrics.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover-elevate relative overflow-visible" data-testid="card-avg-monthly">
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl pointer-events-none" />
                  <CardHeader className="relative pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Average Monthly</CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-2xl font-bold" data-testid="text-avg-monthly">
                      {currencySymbol}{metrics.avgMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover-elevate relative overflow-visible" data-testid="card-best-month">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl pointer-events-none" />
                  <CardHeader className="relative pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Best Month</CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-2xl font-bold" data-testid="text-best-month">
                      {metrics.bestMonth || "N/A"}
                    </div>
                    {metrics.bestAmount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {currencySymbol}{metrics.bestAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
            <Select value={salesHistoryYear} onValueChange={setSalesHistoryYear}>
              <SelectTrigger className="w-[140px]" data-testid="select-sales-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={salesHistoryCustomer} onValueChange={setSalesHistoryCustomer}>
              <SelectTrigger className="w-[200px]" data-testid="select-sales-customer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {userCustomers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table data-testid="table-sales-history">
                <TableHeader>
                  <TableRow>
                    <TableHead>Month/Year</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSalesHistoryData().map(sale => {
                    const customer = userCustomers.find(c => c.id === sale.customerId);
                    const budget = Number(sale.budget);
                    const actual = sale.actual ? Number(sale.actual) : 0;
                    const variance = actual - budget;

                    return (
                      <TableRow key={sale.id} data-testid={`sales-row-${sale.id}`}>
                        <TableCell>{months[sale.month - 1]} {sale.year}</TableCell>
                        <TableCell>
                          {customer ? renderCustomerName(customer) : "Unknown"}
                        </TableCell>
                        <TableCell className="text-right">
                          {currencySymbol}{budget.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right">
                          {currencySymbol}{actual.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={variance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                            {variance >= 0 ? "+" : ""}{currencySymbol}{variance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {getSalesHistoryData().length === 0 && (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No sales records found for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Analytics */}
        <TabsContent value="analytics" className="space-y-6" data-testid="tab-content-analytics">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Year:</span>
            </div>
            <Select value={analyticsYear} onValueChange={setAnalyticsYear}>
              <SelectTrigger className="w-[140px]" data-testid="select-analytics-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(() => {
            const kpis = getAnalyticsKPIs();
            return (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover-elevate relative overflow-visible" data-testid="card-ytd-sales">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl pointer-events-none" />
                  <CardHeader className="relative pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      Total YTD Sales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-2xl font-bold" data-testid="text-ytd-sales">
                      {currencySymbol}{kpis.yearSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover-elevate relative overflow-visible" data-testid="card-avg-deal">
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl pointer-events-none" />
                  <CardHeader className="relative pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-secondary" />
                      Avg Deal Size
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-2xl font-bold" data-testid="text-avg-deal">
                      {currencySymbol}{kpis.avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover-elevate relative overflow-visible" data-testid="card-target-achievement">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl pointer-events-none" />
                  <CardHeader className="relative pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TargetIcon className="h-4 w-4 text-primary" />
                      Target Achievement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-2xl font-bold" data-testid="text-target-achievement">
                      {kpis.targetAchievement}%
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover-elevate relative overflow-visible" data-testid="card-active-customers">
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl pointer-events-none" />
                  <CardHeader className="relative pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4 text-secondary" />
                      Active Customers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-2xl font-bold" data-testid="text-active-customers">
                      {kpis.activeCustomers}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card data-testid="card-sales-trend">
              <CardHeader>
                <CardTitle className="text-lg">Monthly Sales Trend</CardTitle>
                <CardDescription>Sales performance over the year</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getMonthlyTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
                      <Legend />
                      <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} name="Sales" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-target-vs-actual">
              <CardHeader>
                <CardTitle className="text-lg">Target vs Actual</CardTitle>
                <CardDescription>Monthly comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getMonthlyTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="target" fill="hsl(var(--secondary))" name="Target" />
                      <Bar dataKey="sales" fill="#22c55e" name="Actual" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-customer-breakdown">
            <CardHeader>
              <CardTitle className="text-lg">Top Customers by Sales</CardTitle>
              <CardDescription>Customer breakdown for {analyticsYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {getCustomerBreakdownData().length > 0 ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getCustomerBreakdownData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="total"
                          nameKey="name"
                          label={({ name, percent }) => `${name.length > 12 ? name.substring(0, 12) + "..." : name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {getCustomerBreakdownData().map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getCustomerBreakdownData()} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" name="Sales" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No sales data available for this year</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Pipeline */}
        <TabsContent value="pipeline" className="space-y-6" data-testid="tab-content-pipeline">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STAGES.map(stage => {
              const stageCustomers = customersByStage[stage.id] || [];

              return (
                <div key={stage.id} data-testid={`pipeline-column-${stage.id}`}>
                  <Card className="flex flex-col">
                    <CardHeader className={`${stage.color} text-white rounded-t-lg pb-3`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <CardTitle className="text-lg">{stage.name}</CardTitle>
                        <Badge variant="secondary" className="bg-white/20 text-white">
                          {stageCustomers.length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 pt-4 space-y-3">
                      {stageCustomers.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                          No customers in this stage
                        </div>
                      ) : (
                        stageCustomers.map(customer => {
                          const daysSinceContact = customer.lastContactDate
                            ? Math.floor((Date.now() - new Date(customer.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
                            : null;

                          return (
                            <Card
                              key={customer.id}
                              className="hover-elevate cursor-pointer"
                              data-testid={`pipeline-card-${customer.id}`}
                              onClick={() => handleCustomerClick(customer.id)}
                            >
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm">
                                    {renderCustomerName(customer)}
                                  </h4>
                                  {customer.country && (
                                    <div className="text-xs text-muted-foreground">
                                      {customer.country}
                                    </div>
                                  )}
                                  {daysSinceContact !== null && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      <span className={daysSinceContact > 30 ? "text-red-600 dark:text-red-400" : ""}>
                                        Last contact: {daysSinceContact}d ago
                                      </span>
                                    </div>
                                  )}
                                  {daysSinceContact === null && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      <span>No contact recorded</span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {selectedCustomerId && selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomerDetail || (selectedCustomer as CustomerWithDetails)}
          open={!!selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
          onUpdate={(data) => {
            if (selectedCustomerId) {
              updateCustomerMutation.mutate({ id: selectedCustomerId, data });
            }
          }}
          onAddInteraction={(data) => {
            if (selectedCustomerId) {
              addInteractionMutation.mutate({ ...data, customerId: selectedCustomerId });
            }
          }}
          isUpdating={updateCustomerMutation.isPending}
          isAddingInteraction={addInteractionMutation.isPending}
        />
      )}
    </div>
  );
}
