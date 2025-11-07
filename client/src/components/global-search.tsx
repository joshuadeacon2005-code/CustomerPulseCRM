import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Building2, MessageSquare, ClipboardList, Search } from "lucide-react";
import { useLocation } from "wouter";
import type { Customer, Interaction, ActionItem } from "@shared/schema";
import { format } from "date-fns";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: open,
  });

  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: ["/api/interactions"],
    enabled: open,
  });

  const { data: actionItems = [] } = useQuery<ActionItem[]>({
    queryKey: ["/api/action-items"],
    enabled: open,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (path: string) => {
    setOpen(false);
    setLocation(path);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border rounded-md hover-elevate"
        data-testid="button-global-search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Global search">
        <CommandInput placeholder="Search customers, interactions, and tasks..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          {customers.length > 0 && (
            <CommandGroup heading="Customers">
              {customers.slice(0, 5).map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={`customer-${customer.name}-${customer.country}`}
                  onSelect={() => handleSelect("/customers")}
                  data-testid={`search-result-customer-${customer.id}`}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{customer.name}</span>
                    <span className="text-xs text-muted-foreground">{customer.country}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {interactions.length > 0 && (
            <CommandGroup heading="Recent Interactions">
              {interactions.slice(0, 5).map((interaction) => {
                const customer = customers.find(c => c.id === interaction.customerId);
                return (
                  <CommandItem
                    key={interaction.id}
                    value={`interaction-${interaction.description}-${customer?.name}`}
                    onSelect={() => handleSelect("/customers")}
                    data-testid={`search-result-interaction-${interaction.id}`}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="line-clamp-1">{interaction.description}</span>
                      <span className="text-xs text-muted-foreground">
                        {customer?.name} - {format(new Date(interaction.date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {actionItems.length > 0 && (
            <CommandGroup heading="Tasks">
              {actionItems.slice(0, 5).map((item) => {
                const customer = customers.find(c => c.id === item.customerId);
                return (
                  <CommandItem
                    key={item.id}
                    value={`task-${item.description}-${customer?.name}`}
                    onSelect={() => handleSelect("/tasks")}
                    data-testid={`search-result-task-${item.id}`}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="line-clamp-1">{item.description}</span>
                      <span className="text-xs text-muted-foreground">
                        {customer?.name} {item.dueDate && `- Due ${format(new Date(item.dueDate), 'MMM d')}`}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
