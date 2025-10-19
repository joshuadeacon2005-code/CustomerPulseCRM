import { DollarSign, BarChart3, LogOut, Users, PieChart, Target, TrendingUp, CheckSquare, FileText, Link2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@shared/schema";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const getRoleDisplayName = (role: UserRole): string => {
    switch (role) {
      case "ceo":
        return "CEO";
      case "admin":
        return "Admin";
      case "manager":
        return "Manager";
      case "salesman":
        return "Salesman";
      default:
        return role;
    }
  };

  const ceoNav = [
    {
      title: "Admin Dashboard",
      url: "/admin",
      icon: BarChart3,
    },
    {
      title: "Log Sales",
      url: "/sales",
      icon: DollarSign,
    },
    {
      title: "Customers",
      url: "/customers",
      icon: Users,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: PieChart,
    },
    {
      title: "Segments",
      url: "/segments",
      icon: Target,
    },
    {
      title: "Monthly Targets",
      url: "/targets",
      icon: TrendingUp,
    },
    {
      title: "Action Items",
      url: "/tasks",
      icon: CheckSquare,
    },
    {
      title: "Sales Reports",
      url: "/reports",
      icon: FileText,
    },
    {
      title: "Basecamp",
      url: "/basecamp",
      icon: Link2,
    },
  ];

  const adminNav = [
    {
      title: "Admin Dashboard",
      url: "/admin",
      icon: BarChart3,
    },
    {
      title: "Log Sales",
      url: "/sales",
      icon: DollarSign,
    },
    {
      title: "Customers",
      url: "/customers",
      icon: Users,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: PieChart,
    },
    {
      title: "Segments",
      url: "/segments",
      icon: Target,
    },
    {
      title: "Monthly Targets",
      url: "/targets",
      icon: TrendingUp,
    },
    {
      title: "Action Items",
      url: "/tasks",
      icon: CheckSquare,
    },
    {
      title: "Sales Reports",
      url: "/reports",
      icon: FileText,
    },
    {
      title: "Basecamp",
      url: "/basecamp",
      icon: Link2,
    },
  ];

  const managerNav = [
    {
      title: "Manager Dashboard",
      url: "/admin",
      icon: BarChart3,
    },
    {
      title: "Customers",
      url: "/customers",
      icon: Users,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: PieChart,
    },
    {
      title: "Segments",
      url: "/segments",
      icon: Target,
    },
    {
      title: "Monthly Targets",
      url: "/targets",
      icon: TrendingUp,
    },
    {
      title: "Action Items",
      url: "/tasks",
      icon: CheckSquare,
    },
    {
      title: "Sales Reports",
      url: "/reports",
      icon: FileText,
    },
    {
      title: "Basecamp",
      url: "/basecamp",
      icon: Link2,
    },
  ];

  const salesmanNav = [
    {
      title: "Log Sales",
      url: "/sales",
      icon: DollarSign,
    },
    {
      title: "Customers",
      url: "/customers",
      icon: Users,
    },
    {
      title: "Monthly Targets",
      url: "/targets",
      icon: TrendingUp,
    },
    {
      title: "Action Items",
      url: "/tasks",
      icon: CheckSquare,
    },
    {
      title: "Sales Reports",
      url: "/reports",
      icon: FileText,
    },
    {
      title: "Basecamp",
      url: "/basecamp",
      icon: Link2,
    },
  ];

  const getNavigationForRole = (role: UserRole | undefined) => {
    if (!role) return salesmanNav;
    
    switch (role) {
      case "ceo":
        return ceoNav;
      case "admin":
        return adminNav;
      case "manager":
        return managerNav;
      case "salesman":
        return salesmanNav;
      default:
        return salesmanNav;
    }
  };

  const navigation = getNavigationForRole(user?.role as UserRole);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <DollarSign className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Bloom & Grow</h2>
            <p className="text-xs text-muted-foreground">Sales Management</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        <div className="text-xs text-muted-foreground">
          Logged in as: {user?.name} ({user?.role ? getRoleDisplayName(user.role as UserRole) : ''})
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => logout()}
          className="w-full"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
