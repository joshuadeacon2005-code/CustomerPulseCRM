import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  const userRole = user.role?.toLowerCase();
  if (userRole !== "ceo" && userRole !== "admin" && userRole !== "sales_director" && userRole !== "marketing_director" && userRole !== "regional_manager" && userRole !== "manager") {
    return <Redirect to="/sales" />;
  }

  return <>{children}</>;
}
