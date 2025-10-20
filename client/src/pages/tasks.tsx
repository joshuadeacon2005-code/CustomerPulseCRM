import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isToday, isPast, startOfDay } from "date-fns";
import { Plus, CheckCircle2, Calendar as CalendarIcon, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertActionItemSchema, type ActionItemWithCustomer, type Customer } from "@shared/schema";
import { cn } from "@/lib/utils";
import { z } from "zod";

const formSchema = insertActionItemSchema.extend({
  dueDate: z.date().optional().nullable(),
  visitDate: z.date().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

export default function Tasks() {
  const [activeTab, setActiveTab] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: allTasks = [], isLoading: isLoadingAll } = useQuery<ActionItemWithCustomer[]>({
    queryKey: ["/api/action-items?filter=all"],
  });

  const { data: overdueTasks = [], isLoading: isLoadingOverdue } = useQuery<ActionItemWithCustomer[]>({
    queryKey: ["/api/action-items?filter=overdue"],
  });

  const { data: todayTasks = [], isLoading: isLoadingToday } = useQuery<ActionItemWithCustomer[]>({
    queryKey: ["/api/action-items?filter=today"],
  });

  const { data: upcomingTasks = [], isLoading: isLoadingUpcoming } = useQuery<ActionItemWithCustomer[]>({
    queryKey: ["/api/action-items?filter=upcoming"],
  });

  const completedTasks = allTasks.filter(task => task.completedAt);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      description: "",
      dueDate: null,
      visitDate: null,
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        customerId: data.customerId,
        description: data.description,
        dueDate: data.dueDate || undefined,
        visitDate: data.visitDate || undefined,
      };
      return apiRequest("POST", "/api/action-items", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "To-do created",
        description: "The to-do has been successfully created.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create to-do. Please try again.",
        variant: "destructive",
      });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/action-items/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-items"] });
      toast({
        title: "To-do completed",
        description: "The to-do has been marked as complete.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete to-do. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createTaskMutation.mutate(data);
  };

  const getTaskBadge = (task: ActionItemWithCustomer) => {
    if (task.completedAt) {
      return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>;
    }
    
    if (!task.dueDate) {
      return null;
    }

    const dueDate = new Date(task.dueDate);
    if (isPast(dueDate) && !isToday(dueDate)) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    
    if (isToday(dueDate)) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">Due Today</Badge>;
    }

    return <Badge variant="outline">Upcoming</Badge>;
  };

  const TaskCard = ({ task }: { task: ActionItemWithCustomer }) => (
    <Card data-testid={`task-card-${task.id}`}>
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox
              data-testid={`checkbox-complete-${task.id}`}
              checked={!!task.completedAt}
              onCheckedChange={() => !task.completedAt && completeTaskMutation.mutate(task.id)}
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={cn(
                  "font-medium",
                  task.completedAt && "line-through text-muted-foreground"
                )} data-testid={`text-description-${task.id}`}>
                  {task.description}
                </p>
                {getTaskBadge(task)}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span data-testid={`text-customer-${task.id}`}>{task.customerName}</span>
                {task.dueDate && (
                  <span data-testid={`text-due-date-${task.id}`}>Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
                )}
                {task.visitDate && (
                  <span data-testid={`text-visit-date-${task.id}`}>Visit: {format(new Date(task.visitDate), 'MMM dd, yyyy')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );

  const TaskList = ({ tasks, isLoading }: { tasks: ActionItemWithCustomer[], isLoading: boolean }) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      );
    }

    if (tasks.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <ListTodo className="mx-auto h-12 w-12 mb-3 opacity-50" />
          <p>No tasks found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">To Do List</h1>
          <p className="text-muted-foreground mt-1">Manage your customer action items</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-task">
          <Plus className="mr-2 h-4 w-4" />
          Add To-Do
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList data-testid="tabs-task-filters">
          <TabsTrigger value="all" data-testid="tab-all">
            All ({allTasks.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" data-testid="tab-overdue">
            Overdue ({overdueTasks.length})
          </TabsTrigger>
          <TabsTrigger value="today" data-testid="tab-today">
            Today ({todayTasks.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" data-testid="tab-upcoming">
            Upcoming ({upcomingTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <TaskList tasks={allTasks} isLoading={isLoadingAll} />
        </TabsContent>

        <TabsContent value="overdue">
          <TaskList tasks={overdueTasks} isLoading={isLoadingOverdue} />
        </TabsContent>

        <TabsContent value="today">
          <TaskList tasks={todayTasks} isLoading={isLoadingToday} />
        </TabsContent>

        <TabsContent value="upcoming">
          <TaskList tasks={upcomingTasks} isLoading={isLoadingUpcoming} />
        </TabsContent>

        <TabsContent value="completed">
          <TaskList tasks={completedTasks} isLoading={false} />
        </TabsContent>
      </Tabs>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-task">
          <DialogHeader>
            <DialogTitle>Add New To-Do</DialogTitle>
            <DialogDescription>
              Create a new action item for a customer
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-customer">
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id} data-testid={`option-customer-${customer.id}`}>
                            {customer.name}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter to-do description"
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-due-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visitDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visit Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-visit-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createTaskMutation.isPending}
                  data-testid="button-submit"
                >
                  {createTaskMutation.isPending ? "Creating..." : "Create To-Do"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
