import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import SalesPage from "@/pages/sales";
import AdminPage from "@/pages/admin";
import CustomersPage from "@/pages/customers";
import AnalyticsPage from "@/pages/analytics";
import SegmentsPage from "@/pages/segments";
import TargetsPage from "@/pages/targets";
import TasksPage from "@/pages/tasks";
import ReportsPage from "@/pages/reports";
import UserDetailsPage from "@/pages/user-details";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  const { user } = useAuth();
  
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between h-16 px-4 border-b shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            <Switch>
              <Route path="/">
                <Redirect to="/dashboard" />
              </Route>
              <Route path="/dashboard">
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </Route>
              <Route path="/sales">
                <ProtectedRoute>
                  <SalesPage />
                </ProtectedRoute>
              </Route>
              <Route path="/admin">
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              </Route>
              <Route path="/customers">
                <ProtectedRoute>
                  <CustomersPage />
                </ProtectedRoute>
              </Route>
              <Route path="/analytics">
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              </Route>
              <Route path="/segments">
                <ProtectedRoute>
                  <SegmentsPage />
                </ProtectedRoute>
              </Route>
              <Route path="/targets">
                <ProtectedRoute>
                  <TargetsPage />
                </ProtectedRoute>
              </Route>
              <Route path="/user-details/:userId">
                <AdminRoute>
                  <UserDetailsPage />
                </AdminRoute>
              </Route>
              <Route path="/tasks">
                <ProtectedRoute>
                  <TasksPage />
                </ProtectedRoute>
              </Route>
              <Route path="/reports">
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              </Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route>
        {user ? <AuthenticatedApp /> : <Redirect to="/auth" />}
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
