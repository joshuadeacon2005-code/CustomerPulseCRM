import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isToday, isPast, startOfDay } from "date-fns";
import { Plus, CheckCircle2, Calendar as CalendarIcon, ListTodo, Link2, RefreshCw, Circle, Settings, ExternalLink, CheckCircle, XCircle, AlertCircle } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertActionItemSchema, type ActionItemWithCustomer, type Customer, type BasecampSyncLog } from "@shared/schema";
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
  selectedProjectIds?: string[];
}

interface BasecampTodo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  due_on?: string;
  project: string;
  projectName: string;
  todolist: string;
}

interface BasecampProject {
  id: string;
  name: string;
  description?: string;
}

export default function Tasks() {
  const [activeTab, setActiveTab] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [selectedTodos, setSelectedTodos] = useState<string[]>([]);
  const [syncCustomerId, setSyncCustomerId] = useState<string>("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
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

  const { data: basecampConnection, isLoading: isLoadingConnection } = useQuery<BasecampConnection>({
    queryKey: ["/api/basecamp/connection"],
  });

  const { data: basecampProjects = [], isLoading: isLoadingProjects } = useQuery<BasecampProject[]>({
    queryKey: ["/api/basecamp/projects"],
    enabled: basecampConnection?.connected === true,
  });

  const { data: basecampTodos = [], isLoading: isLoadingBasecampTodos, refetch: refetchBasecampTodos } = useQuery<BasecampTodo[]>({
    queryKey: ["/api/basecamp/todos"],
    enabled: basecampConnection?.connected === true,
  });

  const { data: syncLogs = [], refetch: refetchSyncLogs } = useQuery<BasecampSyncLog[]>({
    queryKey: ["/api/basecamp/sync-logs"],
    enabled: basecampConnection?.connected === true,
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

  const disconnectBasecampMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/basecamp/connection"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/basecamp/connection"] });
      queryClient.invalidateQueries({ queryKey: ["/api/basecamp/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/basecamp/todos"] });
      toast({
        title: "Disconnected",
        description: "Basecamp account has been disconnected.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to disconnect Basecamp.",
        variant: "destructive",
      });
    },
  });

  const updateProjectsMutation = useMutation({
    mutationFn: (projectIds: string[]) => 
      apiRequest("POST", "/api/basecamp/projects/select", { projectIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/basecamp/connection"] });
      queryClient.invalidateQueries({ queryKey: ["/api/basecamp/todos"] });
      setIsProjectDialogOpen(false);
      toast({
        title: "Projects updated",
        description: "Selected projects have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update selected projects.",
        variant: "destructive",
      });
    },
  });

  const syncTodosMutation = useMutation({
    mutationFn: ({ todos, customerId }: { todos: BasecampTodo[], customerId: string }) =>
      apiRequest("POST", "/api/basecamp/sync", { todos, customerId }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/basecamp/sync-logs"] });
      setIsSyncDialogOpen(false);
      setSelectedTodos([]);
      setSyncCustomerId("");
      refetchSyncLogs();
      toast({
        title: "Sync completed",
        description: `Imported ${data.itemsImported} to-dos. ${data.itemsFailed > 0 ? `${data.itemsFailed} failed.` : ''}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to sync to-dos.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createTaskMutation.mutate(data);
  };

  const handleBasecampConnect = () => {
    window.open("/api/basecamp/auth", "_blank", "width=600,height=700");
    
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/basecamp/connection"] });
    }, 2000);
    
    setTimeout(() => clearInterval(interval), 60000);
  };

  const handleProjectSelection = () => {
    if (basecampConnection?.connected) {
      setSelectedProjectIds(basecampConnection.selectedProjectIds || []);
      setIsProjectDialogOpen(true);
    }
  };

  const handleSyncBasecampTodos = () => {
    if (selectedTodos.length === 0) {
      toast({
        title: "No to-dos selected",
        description: "Please select at least one to-do to sync.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncDialogOpen(true);
  };

  const confirmSync = () => {
    if (!syncCustomerId) {
      toast({
        title: "No customer selected",
        description: "Please select a customer to link the to-dos.",
        variant: "destructive",
      });
      return;
    }

    const todosToSync = basecampTodos.filter(todo => selectedTodos.includes(todo.id));
    syncTodosMutation.mutate({ todos: todosToSync, customerId: syncCustomerId });
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
                {task.basecampTodoId && (
                  <Badge variant="outline" className="gap-1">
                    <Link2 className="h-3 w-3" />
                    Basecamp
                  </Badge>
                )}
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

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "partial":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
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

      {/* Basecamp Connection Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Basecamp Integration
              </CardTitle>
              <CardDescription>
                Sync your Basecamp to-dos with CRM action items
              </CardDescription>
            </div>
            {basecampConnection?.connected && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleProjectSelection}
                data-testid="button-project-settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingConnection ? (
            <Skeleton className="h-20 w-full" />
          ) : basecampConnection?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Connected</p>
                    <p className="text-sm text-muted-foreground">{basecampConnection.userName}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectBasecampMutation.mutate()}
                  disabled={disconnectBasecampMutation.isPending}
                  data-testid="button-disconnect"
                >
                  Disconnect
                </Button>
              </div>

              {isLoadingBasecampTodos ? (
                <Skeleton className="h-40 w-full" />
              ) : basecampTodos.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Basecamp To-Dos ({basecampTodos.length})</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchBasecampTodos()}
                        data-testid="button-refresh-todos"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSyncBasecampTodos}
                        disabled={selectedTodos.length === 0}
                        data-testid="button-sync-todos"
                      >
                        Sync Selected ({selectedTodos.length})
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-3">
                    {basecampTodos.map(todo => (
                      <div
                        key={todo.id}
                        className="flex items-start gap-3 p-3 hover-elevate rounded-md cursor-pointer"
                        onClick={() => {
                          setSelectedTodos(prev =>
                            prev.includes(todo.id)
                              ? prev.filter(id => id !== todo.id)
                              : [...prev, todo.id]
                          );
                        }}
                        data-testid={`basecamp-todo-${todo.id}`}
                      >
                        <Checkbox
                          checked={selectedTodos.includes(todo.id)}
                          onCheckedChange={(checked) => {
                            setSelectedTodos(prev =>
                              checked
                                ? [...prev, todo.id]
                                : prev.filter(id => id !== todo.id)
                            );
                          }}
                          data-testid={`checkbox-basecamp-${todo.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{todo.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {todo.projectName}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{todo.todolist}</span>
                            {todo.due_on && (
                              <span className="text-xs text-muted-foreground">
                                Due: {format(new Date(todo.due_on), 'MMM dd')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ListTodo className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>No Basecamp to-dos found</p>
                  <p className="text-sm mt-1">
                    {basecampConnection.selectedProjectIds && basecampConnection.selectedProjectIds.length > 0
                      ? "Try selecting different projects"
                      : "Select projects to view to-dos"}
                  </p>
                </div>
              )}

              {/* Sync Activity */}
              {syncLogs.length > 0 && (
                <div className="space-y-2">
                  <p className="font-medium text-sm">Recent Sync Activity</p>
                  <div className="space-y-1">
                    {syncLogs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                        data-testid={`sync-log-${log.id}`}
                      >
                        <div className="flex items-center gap-2">
                          {getSyncStatusIcon(log.status)}
                          <span className="capitalize">{log.status}</span>
                          <span className="text-muted-foreground">
                            • {log.itemsImported} imported
                            {log.itemsFailed > 0 && `, ${log.itemsFailed} failed`}
                          </span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {format(new Date(log.createdAt), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Link2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium mb-2">Connect to Basecamp</p>
              <p className="text-sm text-muted-foreground mb-4">
                Sync your Basecamp to-dos to manage them alongside your CRM tasks
              </p>
              <Button onClick={handleBasecampConnect} data-testid="button-connect-basecamp">
                <Link2 className="mr-2 h-4 w-4" />
                Connect Basecamp
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Add To-Do Dialog */}
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

      {/* Project Selection Dialog */}
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent data-testid="dialog-project-selection">
          <DialogHeader>
            <DialogTitle>Select Basecamp Projects</DialogTitle>
            <DialogDescription>
              Choose which projects to sync to-dos from
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoadingProjects ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              basecampProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-3 p-3 hover-elevate rounded-md cursor-pointer"
                  onClick={() => {
                    setSelectedProjectIds(prev =>
                      prev.includes(project.id.toString())
                        ? prev.filter(id => id !== project.id.toString())
                        : [...prev, project.id.toString()]
                    );
                  }}
                  data-testid={`project-${project.id}`}
                >
                  <Checkbox
                    checked={selectedProjectIds.includes(project.id.toString())}
                    onCheckedChange={(checked) => {
                      setSelectedProjectIds(prev =>
                        checked
                          ? [...prev, project.id.toString()]
                          : prev.filter(id => id !== project.id.toString())
                      );
                    }}
                    data-testid={`checkbox-project-${project.id}`}
                  />
                  <div>
                    <p className="font-medium">{project.name}</p>
                    {project.description && (
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => updateProjectsMutation.mutate(selectedProjectIds)}
              disabled={updateProjectsMutation.isPending}
              data-testid="button-save-projects"
            >
              {updateProjectsMutation.isPending ? "Saving..." : "Save Selection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Dialog */}
      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent data-testid="dialog-sync">
          <DialogHeader>
            <DialogTitle>Sync to CRM</DialogTitle>
            <DialogDescription>
              Select a customer to link these {selectedTodos.length} to-do(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={syncCustomerId} onValueChange={setSyncCustomerId}>
              <SelectTrigger data-testid="select-sync-customer">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id} data-testid={`option-sync-customer-${customer.id}`}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              onClick={confirmSync}
              disabled={syncTodosMutation.isPending || !syncCustomerId}
              data-testid="button-confirm-sync"
            >
              {syncTodosMutation.isPending ? "Syncing..." : "Sync To-Dos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
