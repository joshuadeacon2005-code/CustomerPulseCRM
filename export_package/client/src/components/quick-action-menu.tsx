import { useState } from "react";
import { Plus, MessageSquare, DollarSign, Users, Target as TargetIcon, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

export function QuickActionMenu() {
  const [, setLocation] = useLocation();

  const actions = [
    {
      icon: MessageSquare,
      label: "Log Interaction",
      description: "Record customer call/visit",
      path: "/customers?action=interaction",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: DollarSign,
      label: "Log Sale",
      description: "Record a new sale",
      path: "/sales",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      icon: Users,
      label: "Add Customer",
      description: "Create new customer",
      path: "/customers?action=new",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: TargetIcon,
      label: "Add Lead",
      description: "Create new prospect",
      path: "/customers?action=lead",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: ClipboardList,
      label: "Create Task",
      description: "Add to-do item",
      path: "/tasks",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="rounded-full shadow-lg hover:shadow-xl transition-shadow aspect-square"
            data-testid="button-quick-action"
            aria-label="Quick actions menu"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-2 py-2">
            <p className="text-sm font-semibold mb-2">Quick Actions</p>
          </div>
          <DropdownMenuSeparator />
          {actions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              className="cursor-pointer p-3"
              onClick={() => setLocation(action.path)}
              data-testid={`menu-item-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`p-2 rounded-lg ${action.bgColor}`}>
                  <action.icon className={`h-4 w-4 ${action.color}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
