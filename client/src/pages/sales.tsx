import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMonthlyTargetSchema } from "@shared/schema";
import type { Sale, MonthlyTarget, Customer, Currency } from "@shared/schema";
import { format } from "date-fns";
import { z } from "zod";
import { Edit, TrendingUp, Target as TargetIcon, FileText, Download, Check, ChevronsUpDown } from "lucide-react";
import { exportSalesReport } from "@/lib/export-utils";
import { formatCurrency } from "@/lib/currency";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const months = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" },
];

const formSchema = insertMonthlyTargetSchema.omit({ salesmanId: true });
type FormValues = z.infer<typeof formSchema>;

export default function SalesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [saleData, setSaleData] = useState({
    customerName: "",
    customerId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [editingTarget, setEditingTarget] = useState<MonthlyTarget | null>(null);
  const [targetView, setTargetView] = useState<"personal" | "general">("personal");

  const canSetGeneralTargets = user?.role === "ceo" || user?.role === "regional_manager";

  const { data: sales = [], isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const { data: targets = [], isLoading: targetsLoading } = useQuery<MonthlyTarget[]>({
    queryKey: ["/api/targets"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const createSaleMutation = useMutation({
    mutationFn: async (data: typeof saleData) => {
      const response = await apiRequest("POST", "/api/sales", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setSaleData({
        customerName: "",
        customerId: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
      });
      toast({
        title: "Success",
        description: "Sale logged successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSaleMutation.mutate(saleData);
  };

  const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.amount), 0);

  // Targets logic
  const currentYearTargets = useMemo(() => 
    targets.filter(t => t.year === currentYear),
    [targets, currentYear]
  );

  const personalTargets = useMemo(() => 
    currentYearTargets.filter(t => t.targetType === "personal" && t.salesmanId === user?.id),
    [currentYearTargets, user?.id]
  );

  const generalTargets = useMemo(() => 
    currentYearTargets.filter(t => t.targetType === "general"),
    [currentYearTargets]
  );

  const selectedMonthTarget = useMemo(() => {
    const targetsToSearch = targetView === "personal" ? personalTargets : generalTargets;
    return targetsToSearch.find(t => 
      t.month === selectedMonth && 
      t.year === currentYear
    );
  }, [personalTargets, generalTargets, selectedMonth, currentYear, targetView]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      month: selectedMonth,
      year: currentYear,
      targetAmount: "",
      targetType: targetView,
    },
  });

  // Use useEffect for form.reset side effect to avoid React warnings
  useEffect(() => {
    if (editingTarget) {
      form.reset({
        month: editingTarget.month,
        year: editingTarget.year,
        targetAmount: editingTarget.targetAmount,
        targetType: editingTarget.targetType as "personal" | "general",
      });
    } else if (selectedMonthTarget) {
      form.reset({
        month: selectedMonthTarget.month,
        year: selectedMonthTarget.year,
        targetAmount: selectedMonthTarget.targetAmount,
        targetType: selectedMonthTarget.targetType as "personal" | "general",
      });
    } else {
      form.reset({
        month: selectedMonth,
        year: currentYear,
        targetAmount: "",
        targetType: targetView as "personal" | "general",
      });
    }
  }, [selectedMonth, selectedMonthTarget, editingTarget, currentYear, targetView, form]);

  const createTargetMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const requestData = {
        ...data,
        targetType: targetView,
        salesmanId: targetView === "general" ? null : undefined,
      };
      const response = await apiRequest("POST", "/api/targets", requestData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      form.reset({
        month: selectedMonth,
        year: currentYear,
        targetAmount: "",
        targetType: targetView,
      });
      setEditingTarget(null);
      toast({
        title: "Success",
        description: "Target saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save target",
        variant: "destructive",
      });
    },
  });

  const updateTargetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormValues> }) => {
      const response = await apiRequest("PATCH", `/api/targets/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      setEditingTarget(null);
      toast({
        title: "Success",
        description: "Target updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update target",
        variant: "destructive",
      });
    },
  });

  const handleTargetSubmit = (data: FormValues) => {
    if (editingTarget || selectedMonthTarget) {
      const targetToUpdate = editingTarget || selectedMonthTarget;
      if (targetToUpdate) {
        updateTargetMutation.mutate({ 
          id: targetToUpdate.id, 
          data: { targetAmount: data.targetAmount } 
        });
      }
    } else {
      createTargetMutation.mutate(data);
    }
  };

  const handleEditTarget = (target: MonthlyTarget) => {
    setEditingTarget(target);
    setSelectedMonth(target.month);
    setTargetView(target.targetType as "personal" | "general");
  };

  const totalPersonalTargets = personalTargets.reduce(
    (sum, target) => sum + parseFloat(target.targetAmount),
    0
  );

  const totalGeneralTargets = generalTargets.reduce(
    (sum, target) => sum + parseFloat(target.targetAmount),
    0
  );

  const monthName = months.find(m => m.value === selectedMonth)?.label || "";
  const displayTargets = targetView === "personal" ? personalTargets : generalTargets;
  const totalTargetAmount = targetView === "personal" ? totalPersonalTargets : totalGeneralTargets;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sales Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const dateStr = format(new Date(), 'yyyy-MM-dd');
              exportSalesReport(sales, targets, `sales-report-${dateStr}`);
              toast({
                title: "Export Complete",
                description: "Sales report has been downloaded as Excel file",
              });
            }}
            data-testid="button-export-excel"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/reports")}
            data-testid="button-generate-report"
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Generate Sales Report
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover-elevate relative overflow-visible" data-testid="card-log-sale">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl pointer-events-none" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Log New Sale
            </CardTitle>
            <CardDescription>Record a new sale transaction</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerSearchOpen}
                      className="w-full justify-between font-normal"
                      data-testid="input-customer-name"
                    >
                      {saleData.customerName || "Search and select a customer..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Type customer name..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.name}
                              onSelect={() => {
                                setSaleData({ 
                                  ...saleData, 
                                  customerName: customer.name,
                                  customerId: customer.id 
                                });
                                setCustomerSearchOpen(false);
                              }}
                              data-testid={`option-customer-${customer.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  saleData.customerId === customer.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{customer.name}</span>
                                {customer.country && (
                                  <span className="text-xs text-muted-foreground">{customer.country}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  data-testid="input-amount"
                  type="number"
                  step="0.01"
                  value={saleData.amount}
                  onChange={(e) => setSaleData({ ...saleData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  data-testid="input-date"
                  type="date"
                  value={saleData.date}
                  onChange={(e) => setSaleData({ ...saleData, date: e.target.value })}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createSaleMutation.isPending}
                data-testid="button-log-sale"
              >
                {createSaleMutation.isPending ? "Logging..." : "Log Sale"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="hover-elevate relative overflow-visible" data-testid="card-statistics">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl pointer-events-none" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <TargetIcon className="h-5 w-5 text-secondary" />
              Your Statistics
            </CardTitle>
            <CardDescription>Your sales performance</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Total Sales
                </span>
                <span className="text-2xl font-bold" data-testid="text-total-sales">{sales.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/5">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <TargetIcon className="h-4 w-4 text-secondary" />
                  Total Revenue
                </span>
                <span className="text-2xl font-bold" data-testid="text-total-revenue">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="hover-elevate relative overflow-visible" data-testid="card-recent-sales">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 rounded-xl pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>Your recent sales transactions</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : sales.length === 0 ? (
            <div className="text-center text-muted-foreground">No sales logged yet</div>
          ) : (
            <div className="space-y-2">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex justify-between items-center p-3 border rounded-md"
                  data-testid={`sale-${sale.id}`}
                >
                  <div>
                    <p className="font-medium" data-testid={`text-customer-${sale.id}`}>{sale.customerName}</p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-product-${sale.id}`}>{sale.product}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" data-testid={`text-amount-${sale.id}`}>${parseFloat(sale.amount).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-date-${sale.id}`}>
                      {format(new Date(sale.date), "MMM dd, yyyy")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Targets Section */}
      <div className="space-y-6 border-t pt-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2" data-testid="text-targets-title">
              <TargetIcon className="h-6 w-6" />
              Monthly Targets
            </h2>
            <p className="text-muted-foreground">Set and track your monthly sales targets for {currentYear}</p>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-2xl font-bold" data-testid="text-year-total">
              {formatCurrency(totalTargetAmount, (displayTargets[0]?.currency as Currency) || "USD")}
            </span>
          </div>
        </div>

        {canSetGeneralTargets && (
          <Tabs value={targetView} onValueChange={(v) => setTargetView(v as "personal" | "general")}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="personal" data-testid="tab-personal-targets">
                Personal Targets
              </TabsTrigger>
              <TabsTrigger value="general" data-testid="tab-general-targets">
                General Targets
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <Tabs value={selectedMonth.toString()} onValueChange={(v) => {
          setSelectedMonth(parseInt(v));
          setEditingTarget(null);
        }}>
          <TabsList className="grid grid-cols-6 lg:grid-cols-12 w-full" data-testid="tabs-months">
            {months.map((month) => (
              <TabsTrigger 
                key={month.value} 
                value={month.value.toString()}
                data-testid={`tab-month-${month.value}`}
              >
                {month.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedMonthTarget || editingTarget ? `Edit ${targetView === "general" ? "General" : "Personal"} Target for ${monthName}` : `Set ${targetView === "general" ? "General" : "Personal"} Target for ${monthName}`}
                {targetView === "general" && <TargetIcon className="h-5 w-5" />}
              </CardTitle>
              <CardDescription>
                {selectedMonthTarget || editingTarget 
                  ? `Update your ${targetView} sales target for ${monthName} ${currentYear}`
                  : `Set your ${targetView} sales target for ${monthName} ${currentYear}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(handleTargetSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="targetAmount">Target Amount</Label>
                  <Input
                    id="targetAmount"
                    data-testid="input-target-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...form.register("targetAmount")}
                  />
                  {form.formState.errors.targetAmount && (
                    <p className="text-sm text-destructive" data-testid="error-target-amount">
                      {form.formState.errors.targetAmount.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createTargetMutation.isPending || updateTargetMutation.isPending}
                  data-testid={targetView === "general" ? "button-add-general-target" : "button-save-target"}
                >
                  {createTargetMutation.isPending || updateTargetMutation.isPending
                    ? "Saving..."
                    : selectedMonthTarget || editingTarget
                    ? "Update Target"
                    : "Save Target"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Selection</CardTitle>
              <CardDescription>Target details for {monthName} {currentYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {targetsLoading ? (
                <div className="text-center text-muted-foreground">Loading...</div>
              ) : selectedMonthTarget ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Month</span>
                    <span className="text-lg font-semibold" data-testid="text-selected-month">
                      {monthName} {currentYear}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <Badge variant={selectedMonthTarget.targetType === "general" ? "default" : "secondary"} data-testid="badge-target-type">
                      {selectedMonthTarget.targetType === "general" ? "General" : "Personal"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Target Amount</span>
                    <span className="text-2xl font-bold text-primary" data-testid="text-selected-target">
                      {formatCurrency(selectedMonthTarget.targetAmount, (selectedMonthTarget.currency as Currency) || "USD")}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8" data-testid="text-no-target">
                  No {targetView} target set for {monthName} {currentYear}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All {targetView === "general" ? "General" : "Personal"} Targets for {currentYear}</CardTitle>
            <CardDescription>View and manage all your {targetView} monthly targets</CardDescription>
          </CardHeader>
          <CardContent>
            {targetsLoading ? (
              <div className="text-center text-muted-foreground">Loading...</div>
            ) : displayTargets.length === 0 ? (
              <div className="text-center text-muted-foreground py-8" data-testid="text-no-targets">
                No {targetView} targets set for {currentYear} yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-targets">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Month</th>
                      <th className="text-left py-3 px-4 font-semibold">Year</th>
                      <th className="text-left py-3 px-4 font-semibold">Type</th>
                      <th className="text-right py-3 px-4 font-semibold">Target Amount</th>
                      <th className="text-right py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayTargets
                      .sort((a, b) => a.month - b.month)
                      .map((target) => {
                        const monthLabel = months.find(m => m.value === target.month)?.label || "";
                        return (
                          <tr 
                            key={target.id} 
                            className="border-b hover-elevate"
                            data-testid={`row-target-${target.id}`}
                          >
                            <td className="py-3 px-4" data-testid={`text-month-${target.id}`}>
                              {monthLabel}
                            </td>
                            <td className="py-3 px-4" data-testid={`text-year-${target.id}`}>
                              {target.year}
                            </td>
                            <td className="py-3 px-4">
                              <Badge 
                                variant={target.targetType === "general" ? "default" : "secondary"}
                                data-testid={`badge-target-type-${target.id}`}
                              >
                                {target.targetType === "general" ? "General" : "Personal"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold" data-testid={`text-amount-${target.id}`}>
                              {formatCurrency(target.targetAmount, (target.currency as Currency) || "USD")}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditTarget(target)}
                                data-testid={`button-edit-target-${target.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
