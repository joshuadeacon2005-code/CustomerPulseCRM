import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isToday, isPast, startOfDay } from "date-fns";
import { Plus, CheckCircle2, Calendar as CalendarIcon, ListTodo, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  const [isBasecampProjectsDialogOpen, setIsBasecampProjectsDialogOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [basecampTodos, setBasecampTodos] = useState<any[]>([]);
  const [selectedTodos, setSelectedTodos] = useState<number[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
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

  const { data: basecampConnection } = useQuery<{ connected: boolean; basecampUserId?: string; basecampAccountId?: string }>({
    queryKey: ["/api/basecamp/connection"],
  });

  const { data: basecampProjects = [] } = useQuery<any[]>({
    queryKey: ["/api/basecamp/projects"],
    enabled: basecampConnection?.connected || false,
  });

  const connectBasecampMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/basecamp/auth");
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast({
          title: "Error",
          description: "Invalid response from server.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error("Basecamp connection error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to connect to Basecamp. Please try again.",
        variant: "destructive",
      });
    },
  });

  const disconnectBasecampMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/basecamp/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/basecamp/connection"] });
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from Basecamp.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to disconnect from Basecamp.",
        variant: "destructive",
      });
    },
  });

  const fetchTodosMutation = useMutation<any[], Error, number[]>({
    mutationFn: async (projectIds: number[]) => {
      console.log("=== FRONTEND: Fetching todos for projects:", projectIds);
      const response = await apiRequest("POST", "/api/basecamp/todos", { projectIds });
      const data = await response.json();
      console.log("=== FRONTEND: Received todos:", data);
      return data;
    },
    onSuccess: (data: any[]) => {
      console.log("=== FRONTEND: Success, got", data.length, "todos");
      setBasecampTodos(data);
      setIsBasecampProjectsDialogOpen(false);
      setIsSyncDialogOpen(true);
    },
    onError: (error) => {
      console.error("=== FRONTEND: Error fetching todos:", error);
      toast({
        title: "Error",
        description: "Failed to fetch Basecamp todos.",
        variant: "destructive",
      });
    },
  });

  const syncTodosMutation = useMutation<{ imported: number; skipped: number }, Error, { todos: any[]; customerId: string }>({
    mutationFn: async ({ todos, customerId }: { todos: any[]; customerId: string }) => {
      const response = await apiRequest("POST", "/api/basecamp/sync", { todos, customerId });
      return response.json();
    },
    onSuccess: (result: { imported: number; skipped: number }) => {
      // Invalidate all filter-specific queries
      queryClient.invalidateQueries({ queryKey: ["/api/action-items?filter=all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-items?filter=overdue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-items?filter=today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-items?filter=upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsSyncDialogOpen(false);
      setSelectedTodos([]);
      setSelectedCustomerId("");
      setBasecampTodos([]);
      toast({
        title: "Sync Complete",
        description: `Imported ${result.imported} todos. Skipped ${result.skipped} duplicates.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to sync todos.",
        variant: "destructive",
      });
    },
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
      // Invalidate all filter-specific queries
      queryClient.invalidateQueries({ queryKey: ["/api/action-items?filter=all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-items?filter=overdue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-items?filter=today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-items?filter=upcoming"] });
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
      // Invalidate all filter-specific queries
      queryClient.invalidateQueries({ queryKey: ["/api/action-items?filter=all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-items?filter=overdue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-items?filter=today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-items?filter=upcoming"] });
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

      {/* Basecamp Integration Card */}
      <Card className="mb-6" data-testid="card-basecamp">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Basecamp Integration</h2>
            </div>
            {basecampConnection?.connected ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => disconnectBasecampMutation.mutate()}
                disabled={disconnectBasecampMutation.isPending}
                data-testid="button-disconnect-basecamp"
              >
                <Unlink className="mr-2 h-4 w-4" />
                {disconnectBasecampMutation.isPending ? "Disconnecting..." : "Disconnect"}
              </Button>
            ) : (
              <Button 
                size="sm"
                onClick={() => connectBasecampMutation.mutate()}
                disabled={connectBasecampMutation.isPending}
                data-testid="button-connect-basecamp"
              >
                <Link2 className="mr-2 h-4 w-4" />
                {connectBasecampMutation.isPending ? "Connecting..." : "Connect to Basecamp"}
              </Button>
            )}
          </div>
        </CardHeader>
        {basecampConnection?.connected && (
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  Connected
                </Badge>
              </div>
              <Button 
                onClick={() => setIsBasecampProjectsDialogOpen(true)}
                className="w-full"
                data-testid="button-sync-basecamp"
              >
                <Plus className="mr-2 h-4 w-4" />
                Import from Basecamp
              </Button>
            </div>
          </CardContent>
        )}
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

      {/* Basecamp Project Selection Dialog */}
      <Dialog open={isBasecampProjectsDialogOpen} onOpenChange={setIsBasecampProjectsDialogOpen}>
        <DialogContent data-testid="dialog-basecamp-projects">
          <DialogHeader>
            <DialogTitle>Select Basecamp Projects</DialogTitle>
            <DialogDescription>
              Choose which projects to import todos from
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {basecampProjects.map((project: any) => (
              <div key={project.id} className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedProjects.includes(project.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedProjects([...selectedProjects, project.id]);
                    } else {
                      setSelectedProjects(selectedProjects.filter(id => id !== project.id));
                    }
                  }}
                  data-testid={`checkbox-project-${project.id}`}
                />
                <label className="text-sm font-medium leading-none cursor-pointer">
                  {project.name}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (selectedProjects.length === 0) {
                  toast({
                    title: "No projects selected",
                    description: "Please select at least one project",
                    variant: "destructive",
                  });
                  return;
                }
                fetchTodosMutation.mutate(selectedProjects);
              }}
              disabled={fetchTodosMutation.isPending || selectedProjects.length === 0}
              data-testid="button-fetch-todos"
            >
              {fetchTodosMutation.isPending ? "Fetching..." : "Fetch Todos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Basecamp Sync Dialog */}
      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent className="max-w-3xl" data-testid="dialog-sync-todos">
          <DialogHeader>
            <DialogTitle>Sync Basecamp Todos</DialogTitle>
            <DialogDescription>
              Select todos to import and assign them to a customer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Assign to Customer</label>
              <Select onValueChange={setSelectedCustomerId} value={selectedCustomerId}>
                <SelectTrigger data-testid="select-sync-customer">
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
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {basecampTodos.length} todos found
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedTodos.length === basecampTodos.length) {
                      setSelectedTodos([]);
                    } else {
                      setSelectedTodos(basecampTodos.map(t => t.id));
                    }
                  }}
                  data-testid="button-toggle-all-todos"
                >
                  {selectedTodos.length === basecampTodos.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              {basecampTodos.length > 0 && basecampTodos[0]?.debug && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded text-xs space-y-2 overflow-auto max-h-96">
                  <p className="font-bold text-yellow-600 dark:text-yellow-400">DEBUG MODE - Raw Basecamp API Response:</p>
                  <pre className="whitespace-pre-wrap">{JSON.stringify(basecampTodos[0], null, 2)}</pre>
                </div>
              )}
              {basecampTodos.filter((t: any) => !t.debug).map((todo: any) => (
                <Card key={todo.id} className="p-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      checked={selectedTodos.includes(todo.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTodos([...selectedTodos, todo.id]);
                        } else {
                          setSelectedTodos(selectedTodos.filter(id => id !== todo.id));
                        }
                      }}
                      data-testid={`checkbox-todo-${todo.id}`}
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{todo.content}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{todo.projectName}</span>
                        <span>•</span>
                        <span>{todo.todoListName}</span>
                        {todo.due_on && (
                          <>
                            <span>•</span>
                            <span>Due: {format(new Date(todo.due_on), 'MMM dd, yyyy')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!selectedCustomerId) {
                  toast({
                    title: "No customer selected",
                    description: "Please select a customer to assign todos to",
                    variant: "destructive",
                  });
                  return;
                }
                if (selectedTodos.length === 0) {
                  toast({
                    title: "No todos selected",
                    description: "Please select at least one todo to sync",
                    variant: "destructive",
                  });
                  return;
                }
                const todosToSync = basecampTodos.filter(t => selectedTodos.includes(t.id));
                syncTodosMutation.mutate({ todos: todosToSync, customerId: selectedCustomerId });
              }}
              disabled={syncTodosMutation.isPending || selectedTodos.length === 0 || !selectedCustomerId}
              data-testid="button-sync-todos"
            >
              {syncTodosMutation.isPending ? "Syncing..." : `Sync ${selectedTodos.length} Todos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
