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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerMonthlyTargetSchema, type CustomerMonthlyTarget, type MonthlySalesTracking } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Target, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const targetFormSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2099),
  targetAmount: z.string().min(1, "Target amount is required"),
});

type TargetFormValues = z.infer<typeof targetFormSchema>;

interface CustomerTargetsProps {
  customerId: string;
}

export function CustomerTargets({ customerId }: CustomerTargetsProps) {
  const [isAddingTarget, setIsAddingTarget] = useState(false);
  const [editingTarget, setEditingTarget] = useState<CustomerMonthlyTarget | null>(null);
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

  // Helper to get actual sales for a given month/year
  const getActualSales = (month: number, year: number): number => {
    const salesRecord = monthlySales.find(s => s.month === month && s.year === year);
    return salesRecord ? parseFloat(salesRecord.actual || '0') : 0;
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
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/customers', customerId, 'targets'] });
      
      // Snapshot the previous value
      const previousTargets = queryClient.getQueryData<CustomerMonthlyTarget[]>(['/api/customers', customerId, 'targets']);
      
      // Optimistically update to remove the target
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
      // Rollback on error
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            Monthly Targets
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Set and track monthly sales targets for this customer
          </p>
        </div>
        <Dialog open={isAddingTarget} onOpenChange={setIsAddingTarget}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-target">
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

      {isLoading || isLoadingSales ? (
        <div className="text-center py-8 text-muted-foreground">Loading targets...</div>
      ) : sortedTargets.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No monthly targets set yet.</p>
              <p className="text-sm mt-1">Click "Add Target" to set a target for this customer.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sortedTargets.map((target) => {
            const targetAmount = parseFloat(target.targetAmount);
            const actualAmount = getActualSales(target.month, target.year);
            const progressPercent = targetAmount > 0 ? Math.min((actualAmount / targetAmount) * 100, 100) : 0;
            const variance = actualAmount - targetAmount;
            const isOnTrack = actualAmount >= targetAmount;
            
            return (
              <Card key={target.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-center min-w-[100px]">
                        <div className="text-sm text-muted-foreground">
                          {monthNames[target.month - 1]}
                        </div>
                        <div className="text-lg font-semibold">{target.year}</div>
                      </div>
                      <div className="border-l pl-4 flex-1">
                        <div className="flex items-center gap-6 mb-2">
                          <div>
                            <div className="text-sm text-muted-foreground">Target</div>
                            <div className="text-lg font-bold" data-testid={`text-target-amount-${target.id}`}>
                              ${targetAmount.toLocaleString('en-US', { 
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2 
                              })}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Actual
                            </div>
                            <div className={`text-lg font-bold ${isOnTrack ? 'text-green-600' : actualAmount > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} data-testid={`text-actual-amount-${target.id}`}>
                              ${actualAmount.toLocaleString('en-US', { 
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2 
                              })}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Variance</div>
                            <div className={`text-lg font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-500'}`} data-testid={`text-variance-${target.id}`}>
                              {variance >= 0 ? '+' : ''}${variance.toLocaleString('en-US', { 
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2 
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={progressPercent} className="flex-1 h-2" />
                          <span className={`text-sm font-medium min-w-[50px] text-right ${isOnTrack ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {progressPercent.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(target)}
                        data-testid={`button-edit-target-${target.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(target.id)}
                        disabled={deleteTargetMutation.isPending}
                        data-testid={`button-delete-target-${target.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
    </div>
  );
}
