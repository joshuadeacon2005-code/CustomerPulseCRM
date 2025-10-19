import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isToday, isPast, startOfDay } from "date-fns";
import { Plus, CheckCircle2, Calendar as CalendarIcon, ListTodo, Link2, Trash2, RefreshCw, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
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

interface BasecampConnection {
  connected: boolean;
  accountId?: string;
  userName?: string;
  connectedAt?: Date;
}

interface BasecampTodo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  due_on?: string;
  project: string;
  todolist: string;
}

export default function Tasks() {
  const [activeTab, setActiveTab] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<BasecampTodo | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const { toast } = useToast();

  const { data: allTasks = [], isLoading: isLoadingAll } = useQuery<ActionItemWithCustomer[]>({
    queryKey: ["/api/action-items", "all"],
    queryFn: () => fetch("/api/action-items?filter=all").then(res => res.json()),
  });

  const { data: overdueTasks = [], isLoading: isLoadingOverdue } = useQuery<ActionItemWithCustomer[]>({
    queryKey: ["/api/action-items", "overdue"],
    queryFn: () => fetch("/api/action-items?filter=overdue").then(res => res.json()),
  });

  const { data: todayTasks = [], isLoading: isLoadingToday } = useQuery<ActionItemWithCustomer[]>({
    queryKey: ["/api/action-items", "today"],
    queryFn: () => fetch("/api/action-items?filter=today").then(res => res.json()),
  });

  const { data: upcomingTasks = [], isLoading: isLoadingUpcoming } = useQuery<ActionItemWithCustomer[]>({
    queryKey: ["/api/action-items", "upcoming"],
    queryFn: () => fetch("/api/action-items?filter=upcoming").then(res => res.json()),
  });

  const completedTasks = allTasks.filter(task => task.completedAt);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: connection, isLoading: connectionLoading } = useQuery<BasecampConnection>({
    queryKey: ["/api/basecamp/connection"],
  });

  const { data: basecampTodos = [], isLoading: todosLoading, refetch: refetchTodos } = useQuery<BasecampTodo[]>({
    queryKey: ["/api/basecamp/todos"],
    enabled: connection?.connected === true,
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

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/basecamp/connection"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/basecamp/connection"] });
      toast({
        title: "Basecamp disconnected",
        description: "Your Basecamp account has been disconnected",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to disconnect Basecamp",
        variant: "destructive",
      });
    },
  });

  const syncTodoMutation = useMutation({
    mutationFn: (data: { basecampTodoId: string; customerId: string; description: string; dueDate?: string }) =>
      apiRequest("POST", "/api/basecamp/sync-todo", data),
    onSuccess: () => {
      toast({
        title: "To-do synced",
        description: "Basecamp to-do has been added to your to-do list",
      });
      setSyncDialogOpen(false);
      setSelectedTodo(null);
      setSelectedCustomerId("");
      refetchTodos();
      queryClient.invalidateQueries({ queryKey: ["/api/action-items"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync to-do",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createTaskMutation.mutate(data);
  };

  const handleConnect = () => {
    window.location.href = "/api/basecamp/auth";
  };

  const handleDisconnect = () => {
    if (confirm("Are you sure you want to disconnect your Basecamp account?")) {
      disconnectMutation.mutate();
    }
  };

  const handleSyncTodo = (todo: BasecampTodo) => {
    setSelectedTodo(todo);
    setSyncDialogOpen(true);
  };

  const handleConfirmSync = () => {
    if (!selectedTodo || !selectedCustomerId) return;

    syncTodoMutation.mutate({
      basecampTodoId: selectedTodo.id,
      customerId: selectedCustomerId,
      description: selectedTodo.title,
      dueDate: selectedTodo.due_on,
    });
  };

  const getTaskStatusColor = (task: ActionItemWithCustomer) => {
    if (task.completedAt) return "text-muted-foreground";
    if (!task.dueDate) return "";
    
    const dueDate = new Date(task.dueDate);
    const today = startOfDay(new Date());
    const taskDueDate = startOfDay(dueDate);
    
    if (taskDueDate < today) return "text-destructive";
    if (taskDueDate.getTime() === today.getTime()) return "text-orange-500";
    return "";
  };

  const renderTaskCard = (task: ActionItemWithCustomer) => {
    const statusColor = getTaskStatusColor(task);
    
    return (
      <Card key={task.id} className={cn("hover-elevate", task.completedAt && "opacity-60")}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <p className={cn("font-medium", statusColor)} data-testid={`text-description-${task.id}`}>
                {task.description}
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span data-testid={`text-customer-${task.id}`}>
                  Customer: {task.customerName}
                </span>
                {task.dueDate && (
                  <span data-testid={`text-due-date-${task.id}`}>
                    Due: {format(new Date(task.dueDate), "MMM dd, yyyy")}
                  </span>
                )}
                {task.visitDate && (
                  <span data-testid={`text-visit-date-${task.id}`}>
                    Visit: {format(new Date(task.visitDate), "MMM dd, yyyy")}
                  </span>
                )}
              </div>
              {task.completedAt && (
                <p className="text-xs text-muted-foreground" data-testid={`text-completed-${task.id}`}>
                  Completed: {format(new Date(task.completedAt), "MMM dd, yyyy")}
                </p>
              )}
            </div>
            {!task.completedAt && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => completeTaskMutation.mutate(task.id)}
                disabled={completeTaskMutation.isPending}
                data-testid={`button-complete-task-${task.id}`}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTaskList = (tasks: ActionItemWithCustomer[], isLoading: boolean, emptyMessage: string) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      );
    }

    if (tasks.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <ListTodo className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{emptyMessage}</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {tasks.map(renderTaskCard)}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-todo-list-title">To Do List</h1>
          <p className="text-muted-foreground mt-1">
            Manage your tasks and follow-ups
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-task">
          <Plus className="h-4 w-4 mr-2" />
          Add To-Do
        </Button>
      </div>

      {/* Basecamp Integration Section */}
      {!connectionLoading && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {connection?.connected ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Basecamp Connected
                    </>
                  ) : (
                    <>
                      <Link2 className="h-5 w-5" />
                      Basecamp Integration
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {connection?.connected 
                    ? `Account: ${connection.userName} (ID: ${connection.accountId})`
                    : "Sync your Basecamp to-dos with your CRM"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {connection?.connected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchTodos()}
                      disabled={todosLoading}
                      data-testid="button-refresh-todos"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${todosLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDisconnect}
                      data-testid="button-disconnect-basecamp"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleConnect} size="sm" data-testid="button-connect-basecamp">
                    <Link2 className="mr-2 h-4 w-4" />
                    Connect Basecamp
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          {connection?.connected && basecampTodos.length > 0 && (
            <CardContent className="space-y-3">
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">
                  Basecamp To-Dos ({basecampTodos.length})
                </h4>
                {todosLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {basecampTodos.slice(0, 5).map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-start justify-between p-3 border rounded-md hover-elevate"
                        data-testid={`todo-${todo.id}`}
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            {todo.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <h4 className="font-medium text-sm" data-testid={`text-todo-title-${todo.id}`}>
                              {todo.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-project-${todo.id}`}>
                              {todo.project}
                            </Badge>
                            {todo.due_on && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  <span data-testid={`text-due-date-${todo.id}`}>{todo.due_on}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        {!todo.completed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSyncTodo(todo)}
                            data-testid={`button-sync-${todo.id}`}
                          >
                            Sync
                          </Button>
                        )}
                      </div>
                    ))}
                    {basecampTodos.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        Showing 5 of {basecampTodos.length} to-dos
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5" data-testid="tabs-filter">
          <TabsTrigger value="all" data-testid="tab-all">
            All ({allTasks.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" data-testid="tab-overdue" className="text-destructive data-[state=active]:text-destructive">
            Overdue ({overdueTasks.length})
          </TabsTrigger>
          <TabsTrigger value="today" data-testid="tab-today" className="text-orange-500 data-[state=active]:text-orange-500">
            Due Today ({todayTasks.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" data-testid="tab-upcoming">
            Upcoming ({upcomingTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {renderTaskList(allTasks, isLoadingAll, "No to-dos yet. Create your first task to get started.")}
        </TabsContent>

        <TabsContent value="overdue" className="mt-6">
          {renderTaskList(overdueTasks, isLoadingOverdue, "No overdue tasks. Great job staying on top of things!")}
        </TabsContent>

        <TabsContent value="today" className="mt-6">
          {renderTaskList(todayTasks, isLoadingToday, "No tasks due today. Enjoy your day!")}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6">
          {renderTaskList(upcomingTasks, isLoadingUpcoming, "No upcoming tasks scheduled.")}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {renderTaskList(completedTasks, false, "No completed tasks yet.")}
        </TabsContent>
      </Tabs>

      {/* Add To-Do Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-task">
          <DialogHeader>
            <DialogTitle>Add New To-Do</DialogTitle>
            <DialogDescription>Create a new to-do for a customer</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-customer">
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
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
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the to-do..."
                        {...field}
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
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
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
                  <FormItem className="flex flex-col">
                    <FormLabel>Visit Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
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

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  data-testid="button-submit-task"
                >
                  {createTaskMutation.isPending ? "Creating..." : "Create To-Do"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Basecamp Sync Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent data-testid="dialog-sync-todo">
          <DialogHeader>
            <DialogTitle>Sync To-Do to CRM</DialogTitle>
            <DialogDescription>
              Link this Basecamp to-do to a customer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">To-Do</label>
              <div className="p-3 border rounded-md bg-muted">
                <p className="font-medium" data-testid="text-selected-todo-title">
                  {selectedTodo?.title}
                </p>
                {selectedTodo?.due_on && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Due: {selectedTodo.due_on}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Customer</label>
              <Select
                value={selectedCustomerId}
                onValueChange={setSelectedCustomerId}
              >
                <SelectTrigger data-testid="select-customer">
                  <SelectValue placeholder="Choose a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem
                      key={customer.id}
                      value={customer.id}
                      data-testid={`option-customer-${customer.id}`}
                    >
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSyncDialogOpen(false)}
              data-testid="button-cancel-sync"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSync}
              disabled={!selectedCustomerId || syncTodoMutation.isPending}
              data-testid="button-confirm-sync"
            >
              {syncTodoMutation.isPending ? "Syncing..." : "Sync to CRM"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
