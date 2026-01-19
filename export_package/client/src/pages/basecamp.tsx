import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link2, Trash2, RefreshCw, CheckCircle2, Circle, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Customer } from "@shared/schema";

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

export default function BasecampPage() {
  const { toast } = useToast();
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<BasecampTodo | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const { data: connection, isLoading: connectionLoading } = useQuery<BasecampConnection>({
    queryKey: ["/api/basecamp/connection"],
  });

  const { data: todos = [], isLoading: todosLoading, refetch: refetchTodos } = useQuery<BasecampTodo[]>({
    queryKey: ["/api/basecamp/todos"],
    enabled: connection?.connected === true,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: syncDialogOpen,
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("/api/basecamp/connection", "DELETE"),
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
      apiRequest("/api/basecamp/sync-todo", "POST", data),
    onSuccess: () => {
      toast({
        title: "Todo synced",
        description: "Basecamp todo has been added to your action items",
      });
      setSyncDialogOpen(false);
      setSelectedTodo(null);
      setSelectedCustomerId("");
      refetchTodos();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync todo",
        variant: "destructive",
      });
    },
  });

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

  if (connectionLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Basecamp Integration</h1>
          <p className="text-muted-foreground mt-1">
            Connect your Basecamp account to sync to-do lists with your CRM
          </p>
        </div>
      </div>

      {!connection?.connected ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect Basecamp</CardTitle>
            <CardDescription>
              Link your Basecamp account to sync to-do lists as action items in your CRM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleConnect} data-testid="button-connect-basecamp">
              <Link2 className="mr-2 h-4 w-4" />
              Connect Basecamp Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Connected to Basecamp
              </CardTitle>
              <CardDescription>
                Account: {connection.userName} (ID: {connection.accountId})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => refetchTodos()}
                  disabled={todosLoading}
                  data-testid="button-refresh-todos"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${todosLoading ? 'animate-spin' : ''}`} />
                  Refresh To-Dos
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  data-testid="button-disconnect-basecamp"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Basecamp To-Dos</CardTitle>
              <CardDescription>
                {todos.length} to-do{todos.length !== 1 ? 's' : ''} found across all projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todosLoading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : todos.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No to-dos found in your Basecamp account
                </div>
              ) : (
                <div className="space-y-2">
                  {todos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-start justify-between p-4 border rounded-md hover-elevate"
                      data-testid={`todo-${todo.id}`}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {todo.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <h4 className="font-medium" data-testid={`text-todo-title-${todo.id}`}>
                            {todo.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="secondary" data-testid={`badge-project-${todo.id}`}>
                            {todo.project}
                          </Badge>
                          <span>•</span>
                          <span data-testid={`text-todolist-${todo.id}`}>{todo.todolist}</span>
                          {todo.due_on && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span data-testid={`text-due-date-${todo.id}`}>{todo.due_on}</span>
                              </div>
                            </>
                          )}
                        </div>
                        {todo.description && (
                          <p className="text-sm text-muted-foreground" data-testid={`text-description-${todo.id}`}>
                            {todo.description}
                          </p>
                        )}
                      </div>
                      {!todo.completed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSyncTodo(todo)}
                          data-testid={`button-sync-${todo.id}`}
                        >
                          Sync to CRM
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent data-testid="dialog-sync-todo">
          <DialogHeader>
            <DialogTitle>Sync To-Do to CRM</DialogTitle>
            <DialogDescription>
              Link this Basecamp to-do to a customer as an action item
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
