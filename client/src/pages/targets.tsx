import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMonthlyTargetSchema } from "@shared/schema";
import type { MonthlyTarget } from "@shared/schema";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, TrendingUp } from "lucide-react";

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

export default function TargetsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [editingTarget, setEditingTarget] = useState<MonthlyTarget | null>(null);

  const { data: targets = [], isLoading } = useQuery<MonthlyTarget[]>({
    queryKey: ["/api/targets"],
  });

  const currentYearTargets = useMemo(() => 
    targets.filter(t => t.year === currentYear),
    [targets, currentYear]
  );

  const selectedMonthTarget = useMemo(() => 
    currentYearTargets.find(t => t.month === selectedMonth && t.year === currentYear),
    [currentYearTargets, selectedMonth, currentYear]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      month: selectedMonth,
      year: currentYear,
      targetAmount: "",
    },
  });

  // Update form when selected month changes or when editing a target
  useMemo(() => {
    if (editingTarget) {
      form.reset({
        month: editingTarget.month,
        year: editingTarget.year,
        targetAmount: editingTarget.targetAmount,
      });
    } else if (selectedMonthTarget) {
      form.reset({
        month: selectedMonthTarget.month,
        year: selectedMonthTarget.year,
        targetAmount: selectedMonthTarget.targetAmount,
      });
    } else {
      form.reset({
        month: selectedMonth,
        year: currentYear,
        targetAmount: "",
      });
    }
  }, [selectedMonth, selectedMonthTarget, editingTarget, currentYear, form]);

  const createTargetMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/targets", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      form.reset({
        month: selectedMonth,
        year: currentYear,
        targetAmount: "",
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

  const handleSubmit = (data: FormValues) => {
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
  };

  const totalTargetAmount = currentYearTargets.reduce(
    (sum, target) => sum + parseFloat(target.targetAmount),
    0
  );

  const monthName = months.find(m => m.value === selectedMonth)?.label || "";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-targets-title">Monthly Targets</h1>
          <p className="text-muted-foreground">Set and track your monthly sales targets for {currentYear}</p>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span className="text-2xl font-bold" data-testid="text-year-total">
            ${totalTargetAmount.toFixed(2)}
          </span>
        </div>
      </div>

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
            <CardTitle>
              {selectedMonthTarget || editingTarget ? `Edit Target for ${monthName}` : `Set Target for ${monthName}`}
            </CardTitle>
            <CardDescription>
              {selectedMonthTarget || editingTarget 
                ? `Update your sales target for ${monthName} ${currentYear}`
                : `Set your sales target for ${monthName} ${currentYear}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetAmount">Target Amount ($)</Label>
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
                data-testid="button-save-target"
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
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : selectedMonthTarget ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Month</span>
                  <span className="text-lg font-semibold" data-testid="text-selected-month">
                    {monthName} {currentYear}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Target Amount</span>
                  <span className="text-2xl font-bold text-primary" data-testid="text-selected-target">
                    ${parseFloat(selectedMonthTarget.targetAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8" data-testid="text-no-target">
                No target set for {monthName} {currentYear}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Targets for {currentYear}</CardTitle>
          <CardDescription>View and manage all your monthly targets</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : currentYearTargets.length === 0 ? (
            <div className="text-center text-muted-foreground py-8" data-testid="text-no-targets">
              No targets set for {currentYear} yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-targets">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Month</th>
                    <th className="text-left py-3 px-4 font-semibold">Year</th>
                    <th className="text-right py-3 px-4 font-semibold">Target Amount</th>
                    <th className="text-right py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentYearTargets
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
                          <td className="py-3 px-4 text-right font-semibold" data-testid={`text-amount-${target.id}`}>
                            ${parseFloat(target.targetAmount).toFixed(2)}
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
  );
}
