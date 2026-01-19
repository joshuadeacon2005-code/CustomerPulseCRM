import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMonthlySalesTrackingSchema, updateMonthlySalesTrackingSchema } from "@shared/schema";
import type { MonthlySalesTracking, Customer } from "@shared/schema";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, TrendingUp, Filter as FilterIcon } from "lucide-react";

const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

type FormValues = z.infer<typeof insertMonthlySalesTrackingSchema>;

type MonthlySalesWithCustomer = MonthlySalesTracking & {
  customerName?: string;
};

export default function ReportsPage() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [editingRecord, setEditingRecord] = useState<MonthlySalesTracking | null>(null);
  const [filterCustomer, setFilterCustomer] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");

  const { data: salesRecords = [], isLoading: isLoadingSales } = useQuery<MonthlySalesTracking[]>({
    queryKey: ["/api/monthly-sales"],
  });

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const customersMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach(customer => {
      map.set(customer.id, customer.name);
    });
    return map;
  }, [customers]);

  const salesWithCustomerNames: MonthlySalesWithCustomer[] = useMemo(() => {
    return salesRecords.map(record => ({
      ...record,
      customerName: customersMap.get(record.customerId) || "Unknown",
    }));
  }, [salesRecords, customersMap]);

  const filteredRecords = useMemo(() => {
    return salesWithCustomerNames.filter(record => {
      const matchesCustomer = filterCustomer === "all" || record.customerId === filterCustomer;
      const matchesMonth = filterMonth === "all" || record.month.toString() === filterMonth;
      const matchesYear = filterYear === "all" || record.year.toString() === filterYear;
      return matchesCustomer && matchesMonth && matchesYear;
    });
  }, [salesWithCustomerNames, filterCustomer, filterMonth, filterYear]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    salesRecords.forEach(record => years.add(record.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [salesRecords]);

  const form = useForm<FormValues>({
    resolver: zodResolver(insertMonthlySalesTrackingSchema),
    defaultValues: {
      customerId: "",
      month: currentMonth,
      year: currentYear,
      budget: "",
      actual: "",
    },
  });

  useMemo(() => {
    if (editingRecord) {
      form.reset({
        customerId: editingRecord.customerId,
        month: editingRecord.month,
        year: editingRecord.year,
        budget: editingRecord.budget,
        actual: editingRecord.actual || "",
      });
    } else {
      form.reset({
        customerId: "",
        month: currentMonth,
        year: currentYear,
        budget: "",
        actual: "",
      });
    }
  }, [editingRecord, currentMonth, currentYear, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/monthly-sales", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-sales"] });
      form.reset({
        customerId: "",
        month: currentMonth,
        year: currentYear,
        budget: "",
        actual: "",
      });
      setEditingRecord(null);
      toast({
        title: "Success",
        description: "Sales data saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save sales data",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormValues> }) => {
      const response = await apiRequest("PATCH", `/api/monthly-sales/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-sales"] });
      setEditingRecord(null);
      form.reset({
        customerId: "",
        month: currentMonth,
        year: currentYear,
        budget: "",
        actual: "",
      });
      toast({
        title: "Success",
        description: "Sales data updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sales data",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: FormValues) => {
    if (editingRecord) {
      const updateData: Partial<FormValues> = {
        month: data.month,
        year: data.year,
        budget: data.budget,
        actual: data.actual,
      };
      updateMutation.mutate({ id: editingRecord.id, data: updateData });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (record: MonthlySalesTracking) => {
    setEditingRecord(record);
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    form.reset({
      customerId: "",
      month: currentMonth,
      year: currentYear,
      budget: "",
      actual: "",
    });
  };

  const clearFilters = () => {
    setFilterCustomer("all");
    setFilterMonth("all");
    setFilterYear("all");
  };

  const calculateVariance = (budget: string, actual: string | null): number => {
    if (!actual) return 0;
    return parseFloat(actual) - parseFloat(budget);
  };

  const calculatePercentage = (budget: string, actual: string | null): number => {
    if (!actual || parseFloat(budget) === 0) return 0;
    return (parseFloat(actual) / parseFloat(budget)) * 100;
  };

  const formatCurrency = (value: string | null): string => {
    if (!value) return "$0.00";
    return `$${parseFloat(value).toFixed(2)}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-reports-title">
            Sales Performance Reports
          </h1>
          <p className="text-muted-foreground">Track monthly sales budget vs actual performance</p>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold" data-testid="text-total-records">
            {salesRecords.length} Records
          </span>
        </div>
      </div>

      <Tabs defaultValue="form" className="space-y-6" data-testid="tabs-main">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form" data-testid="tab-form">
            Add/Update Sales Data
          </TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">
            Performance View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="form" data-testid="content-form">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingRecord ? "Edit Sales Data" : "Add Sales Data"}
              </CardTitle>
              <CardDescription>
                {editingRecord 
                  ? "Update monthly sales tracking information"
                  : "Enter monthly sales tracking information"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customerId">Customer *</Label>
                    {isLoadingCustomers ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select
                        value={form.watch("customerId")}
                        onValueChange={(value) => form.setValue("customerId", value)}
                        disabled={!!editingRecord}
                      >
                        <SelectTrigger data-testid="select-customer">
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {form.formState.errors.customerId && (
                      <p className="text-sm text-destructive" data-testid="error-customer">
                        {form.formState.errors.customerId.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="month">Month *</Label>
                    <Select
                      value={form.watch("month").toString()}
                      onValueChange={(value) => form.setValue("month", parseInt(value))}
                    >
                      <SelectTrigger data-testid="input-month">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.month && (
                      <p className="text-sm text-destructive" data-testid="error-month">
                        {form.formState.errors.month.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Year *</Label>
                    <Input
                      id="year"
                      data-testid="input-year"
                      type="number"
                      placeholder={currentYear.toString()}
                      {...form.register("year", { valueAsNumber: true })}
                    />
                    {form.formState.errors.year && (
                      <p className="text-sm text-destructive" data-testid="error-year">
                        {form.formState.errors.year.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget Amount ($) *</Label>
                    <Input
                      id="budget"
                      data-testid="input-budget"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...form.register("budget")}
                    />
                    {form.formState.errors.budget && (
                      <p className="text-sm text-destructive" data-testid="error-budget">
                        {form.formState.errors.budget.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actual">Actual Amount ($)</Label>
                    <Input
                      id="actual"
                      data-testid="input-actual"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...form.register("actual")}
                    />
                    {form.formState.errors.actual && (
                      <p className="text-sm text-destructive" data-testid="error-actual">
                        {form.formState.errors.actual.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-sales"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : editingRecord
                      ? "Update Sales Data"
                      : "Save Sales Data"}
                  </Button>
                  {editingRecord && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      data-testid="button-cancel-edit"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" data-testid="content-performance">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
                <CardDescription>Filter performance data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="filter-customer">Customer</Label>
                    <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                      <SelectTrigger data-testid="filter-customer">
                        <FilterIcon className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All Customers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <Label htmlFor="filter-month">Month</Label>
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                      <SelectTrigger data-testid="filter-month">
                        <SelectValue placeholder="All Months" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <Label htmlFor="filter-year">Year</Label>
                    <Select value={filterYear} onValueChange={setFilterYear}>
                      <SelectTrigger data-testid="filter-year">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {availableYears.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      data-testid="button-clear-filters"
                    >
                      Show All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Data</CardTitle>
                <CardDescription>
                  Budget vs actual performance for all customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSales ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8" data-testid="text-no-records">
                    {salesRecords.length === 0
                      ? "No sales data yet. Add your first record in the form tab."
                      : "No records match the selected filters."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table data-testid="table-performance">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer Name</TableHead>
                          <TableHead>Month/Year</TableHead>
                          <TableHead className="text-right">Budget Amount</TableHead>
                          <TableHead className="text-right">Actual Amount</TableHead>
                          <TableHead className="text-right">Variance</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords
                          .sort((a, b) => {
                            if (a.year !== b.year) return b.year - a.year;
                            return b.month - a.month;
                          })
                          .map((record) => {
                            const variance = calculateVariance(record.budget, record.actual);
                            const percentage = calculatePercentage(record.budget, record.actual);
                            const monthLabel = months.find(m => m.value === record.month)?.label || "";

                            return (
                              <TableRow 
                                key={record.id}
                                className="hover-elevate"
                                data-testid={`row-sales-${record.id}`}
                              >
                                <TableCell 
                                  className="font-medium"
                                  data-testid={`text-customer-${record.id}`}
                                >
                                  {record.customerName}
                                </TableCell>
                                <TableCell data-testid={`text-date-${record.id}`}>
                                  {monthLabel} {record.year}
                                </TableCell>
                                <TableCell 
                                  className="text-right font-semibold"
                                  data-testid={`text-budget-${record.id}`}
                                >
                                  {formatCurrency(record.budget)}
                                </TableCell>
                                <TableCell 
                                  className="text-right font-semibold"
                                  data-testid={`text-actual-${record.id}`}
                                >
                                  {formatCurrency(record.actual)}
                                </TableCell>
                                <TableCell 
                                  className={`text-right font-semibold ${
                                    variance > 0 
                                      ? "text-green-600 dark:text-green-400" 
                                      : variance < 0 
                                      ? "text-red-600 dark:text-red-400" 
                                      : ""
                                  }`}
                                  data-testid={`text-variance-${record.id}`}
                                >
                                  {variance > 0 ? "+" : ""}{formatCurrency(variance.toFixed(2))}
                                </TableCell>
                                <TableCell 
                                  className={`text-right font-semibold ${
                                    percentage >= 100 
                                      ? "text-green-600 dark:text-green-400" 
                                      : percentage > 0 
                                      ? "text-red-600 dark:text-red-400" 
                                      : ""
                                  }`}
                                  data-testid={`text-percentage-${record.id}`}
                                >
                                  {percentage.toFixed(2)}%
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEdit(record)}
                                    data-testid={`button-edit-sales-${record.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
