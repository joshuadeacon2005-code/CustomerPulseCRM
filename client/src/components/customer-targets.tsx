import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerMonthlyTargetSchema, type CustomerMonthlyTarget, type MonthlySalesTracking, type Sale } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Target, TrendingUp, ChevronDown, ChevronRight, DollarSign, CheckCircle2, AlertCircle, Receipt } from "lucide-react";
import { format } from "date-fns";

const targetFormSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2099),
  targetAmount: z.string().min(1, "Target amount is required"),
});

type TargetFormValues = z.infer<typeof targetFormSchema>;

interface CustomerTargetsProps {
  customerId: string;
  customerName?: string;
}

export function CustomerTargets({ customerId, customerName }: CustomerTargetsProps) {
  const [isAddingTarget, setIsAddingTarget] = useState(false);
  const [editingTarget, setEditingTarget] = useState<CustomerMonthlyTarget | null>(null);
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const { data: targets = [], isLoading } = useQuery<CustomerMonthlyTarget[]>({
    queryKey: ['/api/customers', customerId, 'targets'],
    enabled: !!customerId,
  });

  // Fetch monthly sales tracking for this customer
  const { data: monthlySales = [], isLoading: isLoadingSales } = useQuery<MonthlySalesTracking[]>({
    queryKey: ['/api/monthly-sales', customerId],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-sales?customerId=${customerId}`);
      if (!res.ok) throw new Error('Failed to fetch sales');
      return res.json();
    },
    enabled: !!customerId,
  });

  // Fetch individual sales for this customer (by name)
  const { data: individualSales = [] } = useQuery<Sale[]>({
    queryKey: ['/api/sales/by-customer', customerName],
    queryFn: async () => {
      if (!customerName) return [];
      const res = await fetch(`/api/sales/by-customer/${encodeURIComponent(customerName)}`);
      if (!res.ok) throw new Error('Failed to fetch sales');
      return res.json();
    },
    enabled: !!customerName,
  });

  // Helper to get actual sales for a given month/year
  const getActualSales = (month: number, year: number): number => {
    const salesRecord = monthlySales.find(s => s.month === month && s.year === year);
    return salesRecord ? parseFloat(salesRecord.actual || '0') : 0;
  };

  // Helper to get individual sales for a given month/year
  const getSalesForMonth = (month: number, year: number): Sale[] => {
    return individualSales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() + 1 === month && saleDate.getFullYear() === year;
    });
  };

  const toggleExpanded = (targetId: string) => {
    const newExpanded = new Set(expandedTargets);
    if (newExpanded.has(targetId)) {
      newExpanded.delete(targetId);
    } else {
      newExpanded.add(targetId);
    }
    setExpandedTargets(newExpanded);
  };

  const form = useForm<TargetFormValues>({
    resolver: zodResolver(targetFormSchema),
    defaultValues: {
      month: currentMonth,
      year: currentYear,
      targetAmount: "",
    },
  });

  const createTargetMutation = useMutation({
    mutationFn: async (data: TargetFormValues) => {
      return await apiRequest('POST', `/api/customers/${customerId}/targets`, {
        month: data.month,
        year: data.year,
        targetAmount: data.targetAmount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'targets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId] });
      toast({ title: "Target created successfully" });
      setIsAddingTarget(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create target", variant: "destructive" });
    },
  });

  const updateTargetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TargetFormValues }) => {
      return await apiRequest('PATCH', `/api/customers/${customerId}/targets/${id}`, {
        month: data.month,
        year: data.year,
        targetAmount: data.targetAmount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'targets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId] });
      toast({ title: "Target updated successfully" });
      setEditingTarget(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update target", variant: "destructive" });
    },
  });

  const deleteTargetMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/customers/${customerId}/targets/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['/api/customers', customerId, 'targets'] });
      const previousTargets = queryClient.getQueryData<CustomerMonthlyTarget[]>(['/api/customers', customerId, 'targets']);
      queryClient.setQueryData<CustomerMonthlyTarget[]>(
        ['/api/customers', customerId, 'targets'],
        (old) => old?.filter((t) => t.id !== id) ?? []
      );
      return { previousTargets };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'targets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId] });
      toast({ title: "Target deleted successfully" });
    },
    onError: (_err, _id, context) => {
      if (context?.previousTargets) {
        queryClient.setQueryData(['/api/customers', customerId, 'targets'], context.previousTargets);
      }
      toast({ title: "Failed to delete target", variant: "destructive" });
    },
  });

  const handleSubmit = (data: TargetFormValues) => {
    if (editingTarget) {
      updateTargetMutation.mutate({ id: editingTarget.id, data });
    } else {
      createTargetMutation.mutate(data);
    }
  };

  const handleEdit = (target: CustomerMonthlyTarget) => {
    setEditingTarget(target);
    form.reset({
      month: target.month,
      year: target.year,
      targetAmount: target.targetAmount,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this target?")) {
      deleteTargetMutation.mutate(id);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const sortedTargets = [...targets].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  // Calculate summary stats
  const totalTarget = sortedTargets.reduce((sum, t) => sum + parseFloat(t.targetAmount), 0);
  const totalActual = sortedTargets.reduce((sum, t) => sum + getActualSales(t.month, t.year), 0);
  const targetsOnTrack = sortedTargets.filter(t => getActualSales(t.month, t.year) >= parseFloat(t.targetAmount)).length;
  const overallProgress = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

  return (
    <Card className="border-2 border-primary/20" data-testid="card-customer-targets">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Sales Performance
            </CardTitle>
            <CardDescription className="mt-1">
              Monthly targets and actual sales tracking
            </CardDescription>
          </div>
          <Dialog open={isAddingTarget} onOpenChange={setIsAddingTarget}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-target">
                <Plus className="h-4 w-4 mr-1" />
                Add Target
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Monthly Target</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="month"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Month</FormLabel>
                          <Select
                            value={field.value?.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-month">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {monthNames.map((name, idx) => (
                                <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <Select
                            value={field.value?.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-year">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 10 }, (_, i) => currentYear - 2 + i).map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="targetAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Amount ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            data-testid="input-target-amount"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddingTarget(false);
                        form.reset();
                      }}
                      data-testid="button-cancel-target"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createTargetMutation.isPending}
                      data-testid="button-submit-target"
                    >
                      {createTargetMutation.isPending ? "Creating..." : "Create Target"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        {isLoading || isLoadingSales ? (
          <div className="text-center py-8 text-muted-foreground">Loading targets...</div>
        ) : sortedTargets.length === 0 ? (
          <div className="py-8">
            <div className="text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No monthly targets set yet.</p>
              <p className="text-sm mt-1">Click "Add Target" to set a target for this customer.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3" data-testid="targets-summary">
              <Card className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-primary" data-testid="text-total-target">
                    ${totalTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Target</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <div className={`text-2xl font-bold ${totalActual >= totalTarget ? 'text-green-600' : 'text-orange-500'}`} data-testid="text-total-actual">
                    ${totalActual.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Actual</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <div className={`text-2xl font-bold ${overallProgress >= 100 ? 'text-green-600' : 'text-blue-500'}`} data-testid="text-overall-progress">
                    {overallProgress.toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Overall Progress</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold flex items-center justify-center gap-1" data-testid="text-targets-on-track">
                    {targetsOnTrack >= sortedTargets.length ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                    )}
                    {targetsOnTrack}/{sortedTargets.length}
                  </div>
                  <div className="text-xs text-muted-foreground">On Track</div>
                </CardContent>
              </Card>
            </div>

            {/* Target List with Sales Breakdown */}
            <div className="space-y-2">
              {sortedTargets.map((target) => {
                const targetAmount = parseFloat(target.targetAmount);
                const actualAmount = getActualSales(target.month, target.year);
                const progressPercent = targetAmount > 0 ? Math.min((actualAmount / targetAmount) * 100, 100) : 0;
                const variance = actualAmount - targetAmount;
                const isOnTrack = actualAmount >= targetAmount;
                const isExpanded = expandedTargets.has(target.id);
                const monthSales = getSalesForMonth(target.month, target.year);
                
                return (
                  <Card key={target.id} className={isOnTrack ? 'border-green-200 bg-green-50/30 dark:bg-green-950/10' : ''}>
                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(target.id)}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left hover-elevate rounded px-2 py-1 -ml-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div className="min-w-[90px]">
                              <div className="font-medium">
                                {monthNames[target.month - 1]} {target.year}
                              </div>
                              {monthSales.length > 0 && (
                                <Badge variant="secondary" className="text-xs mt-0.5">
                                  <Receipt className="h-3 w-3 mr-1" />
                                  {monthSales.length} sale{monthSales.length !== 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </CollapsibleTrigger>
                          
                          <div className="flex items-center gap-6 flex-1 mx-4">
                            <div className="text-center min-w-[80px]">
                              <div className="text-xs text-muted-foreground">Target</div>
                              <div className="font-semibold" data-testid={`text-target-amount-${target.id}`}>
                                ${targetAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </div>
                            </div>
                            <div className="text-center min-w-[80px]">
                              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Actual
                              </div>
                              <div className={`font-semibold ${isOnTrack ? 'text-green-600' : actualAmount > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} data-testid={`text-actual-amount-${target.id}`}>
                                ${actualAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </div>
                            </div>
                            <div className="text-center min-w-[80px]">
                              <div className="text-xs text-muted-foreground">Variance</div>
                              <div className={`font-semibold ${variance >= 0 ? 'text-green-600' : 'text-red-500'}`} data-testid={`text-variance-${target.id}`}>
                                {variance >= 0 ? '+' : ''}${variance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </div>
                            </div>
                            <div className="flex-1 max-w-[150px]">
                              <div className="flex items-center gap-2">
                                <Progress value={progressPercent} className="flex-1 h-2" />
                                <span className={`text-xs font-medium min-w-[35px] text-right ${isOnTrack ? 'text-green-600' : 'text-muted-foreground'}`}>
                                  {progressPercent.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); handleEdit(target); }}
                              data-testid={`button-edit-target-${target.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); handleDelete(target.id); }}
                              disabled={deleteTargetMutation.isPending}
                              data-testid={`button-delete-target-${target.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <CollapsibleContent>
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-sm font-medium mb-2 flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              Individual Sales Breakdown
                            </div>
                            {monthSales.length === 0 ? (
                              <div className="text-sm text-muted-foreground py-2 text-center bg-muted/30 rounded">
                                No individual sales recorded for this month
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {monthSales.map((sale) => (
                                  <div
                                    key={sale.id}
                                    className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded text-sm"
                                    data-testid={`sale-item-${sale.id}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="text-xs text-muted-foreground min-w-[70px]">
                                        {format(new Date(sale.date), 'MMM d, yyyy')}
                                      </div>
                                      <div>{sale.product || 'General Sale'}</div>
                                      {sale.description && (
                                        <span className="text-muted-foreground text-xs">
                                          - {sale.description}
                                        </span>
                                      )}
                                    </div>
                                    <div className="font-medium text-green-600">
                                      ${parseFloat(sale.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      {sale.currency && sale.currency !== 'USD' && (
                                        <span className="text-xs text-muted-foreground ml-1">
                                          {sale.currency}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                <div className="flex items-center justify-between py-2 px-3 bg-primary/5 rounded text-sm font-medium border border-primary/10">
                                  <div>Month Total</div>
                                  <div className="text-primary">
                                    ${monthSales.reduce((sum, s) => sum + parseFloat(s.amount), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </CardContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      {/* Edit Target Dialog */}
      <Dialog open={!!editingTarget} onOpenChange={(open) => !open && setEditingTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Monthly Target</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Month</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-month">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {monthNames.map((name, idx) => (
                            <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-year">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => currentYear - 2 + i).map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="targetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        data-testid="input-edit-target-amount"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingTarget(null);
                    form.reset();
                  }}
                  data-testid="button-cancel-edit-target"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateTargetMutation.isPending}
                  data-testid="button-update-target"
                >
                  {updateTargetMutation.isPending ? "Updating..." : "Update Target"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
