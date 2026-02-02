
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Customer, User, COUNTRIES, CustomerWithDetails, InsertInteraction, UpdateCustomer } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, DollarSign, Clock, Target, Filter, X } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CustomerDetailModal } from "@/components/customer-detail-modal";

const STAGES = [
  { id: "lead", name: "Leads", color: "bg-blue-500" },
  { id: "prospect", name: "Prospects", color: "bg-amber-500" },
  { id: "customer", name: "Customers", color: "bg-green-500" },
];

function getInitials(name: string) {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function PipelineCard({ customer, onClick, assignedUserName }: { customer: Customer; onClick?: () => void; assignedUserName?: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: customer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const daysSinceContact = customer.lastContactDate 
    ? differenceInDays(new Date(), new Date(customer.lastContactDate))
    : null;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card 
        className="mb-3 cursor-move hover-elevate" 
        data-testid={`pipeline-card-${customer.id}`}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{customer.name}</h4>
              {customer.country && (
                <div className="text-xs text-muted-foreground">{customer.country}</div>
              )}
              {customer.quarterlySoftTargetBaseCurrency && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <DollarSign className="h-3 w-3" />
                  <span>${Number(customer.quarterlySoftTargetBaseCurrency).toLocaleString()}</span>
                </div>
              )}
              {daysSinceContact !== null && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3" />
                  <span className={daysSinceContact > 30 ? "text-red-500" : ""}>
                    {daysSinceContact}d ago
                  </span>
                </div>
              )}
              {assignedUserName && (
                <div className="text-xs text-muted-foreground mt-1">
                  Assigned: {assignedUserName}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`flex-1 min-h-[200px] ${isOver ? 'bg-muted/50 rounded-lg' : ''}`}
    >
      {children}
    </div>
  );
}

export default function Pipeline() {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [salesPersonFilter, setSalesPersonFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const salesReps = useMemo(() => {
    return users.filter(u => 
      u.role === "salesman" || u.role === "manager" || 
      u.role === "sales_director" || u.role === "regional_manager"
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const getUserName = (userId: string | null) => {
    if (!userId) return undefined;
    const user = users.find(u => u.id === userId);
    return user?.name;
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      if (countryFilter !== "all" && customer.country !== countryFilter) {
        return false;
      }
      if (salesPersonFilter !== "all") {
        if (salesPersonFilter === "unassigned") {
          if (customer.assignedTo) return false;
        } else if (customer.assignedTo !== salesPersonFilter) {
          return false;
        }
      }
      return true;
    });
  }, [customers, countryFilter, salesPersonFilter]);

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
  };
  
  // Query for detailed customer data when one is selected
  const { data: selectedCustomerDetail } = useQuery<CustomerWithDetails>({
    queryKey: ["/api/customers", selectedCustomer?.id],
    enabled: !!selectedCustomer?.id,
  });
  
  // Mutation for updating customer
  const updateDetailMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomer }) =>
      apiRequest("PATCH", `/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Customer updated",
        description: "The customer has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update customer. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for adding interaction
  const addInteractionMutation = useMutation({
    mutationFn: async (data: InsertInteraction) => {
      console.log('[Interaction] Saving interaction for customer:', data.customerId, 'Type:', data.type);
      const response = await apiRequest("POST", "/api/interactions", data);
      const result = await response.json();
      console.log('[Interaction] Server response:', result);
      return { result, originalData: data };
    },
    onSuccess: ({ result, originalData }) => {
      const customerName = selectedCustomer?.name || 'customer';
      console.log('[Interaction] Successfully saved interaction ID:', result.id);
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      toast({
        title: "Interaction Logged Successfully",
        description: `${originalData.type} interaction for "${customerName}" has been saved.`,
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      console.error('[Interaction] Failed to save interaction:', error);
      toast({
        title: "Failed to Save Interaction",
        description: error.message || "Could not save the interaction. Please check your connection and try again.",
        variant: "destructive",
        duration: 8000,
      });
    },
  });

  const handleUpdateCustomer = (data: UpdateCustomer) => {
    if (selectedCustomer) {
      updateDetailMutation.mutate({ id: selectedCustomer.id, data });
    }
  };

  const handleAddInteraction = (data: InsertInteraction) => {
    if (selectedCustomer) {
      addInteractionMutation.mutate({ ...data, customerId: selectedCustomer.id });
    }
  };

  const clearFilters = () => {
    setCountryFilter("all");
    setSalesPersonFilter("all");
  };

  const hasFilters = countryFilter !== "all" || salesPersonFilter !== "all";

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      await apiRequest("PATCH", `/api/customers/${id}`, { stage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Stage updated",
        description: "Customer moved to new stage successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update customer stage",
        variant: "destructive",
      });
    },
  });

  const customersByStage = useMemo(() => {
    return STAGES.reduce((acc, stage) => {
      acc[stage.id] = filteredCustomers.filter(c => c.stage === stage.id);
      return acc;
    }, {} as Record<string, Customer[]>);
  }, [filteredCustomers]);

  const stageMetrics = useMemo(() => {
    return STAGES.map(stage => {
      const stageCustomers = customersByStage[stage.id] || [];
      const totalValue = stageCustomers.reduce((sum, c) => sum + (Number(c.quarterlySoftTargetBaseCurrency) || 0), 0);
      const avgDaysInStage = stageCustomers.reduce((sum, c) => {
        const days = differenceInDays(new Date(), new Date(c.createdAt));
        return sum + days;
      }, 0) / (stageCustomers.length || 1);

      return {
        stage: stage.id,
        count: stageCustomers.length,
        value: totalValue,
        avgDays: Math.round(avgDaysInStage),
      };
    });
  }, [customersByStage]);

  const conversionMetrics = useMemo(() => {
    const leads = customersByStage["lead"]?.length || 0;
    const prospects = customersByStage["prospect"]?.length || 0;
    const activeCustomers = customersByStage["customer"]?.length || 0;
    
    const leadToProspect = leads > 0 ? (prospects / (leads + prospects)) * 100 : 0;
    const prospectToCustomer = prospects > 0 ? (activeCustomers / (prospects + activeCustomers)) * 100 : 0;
    const overallConversion = (leads + prospects) > 0 ? (activeCustomers / (leads + prospects + activeCustomers)) * 100 : 0;

    return {
      leadToProspect: leadToProspect.toFixed(1),
      prospectToCustomer: prospectToCustomer.toFixed(1),
      overall: overallConversion.toFixed(1),
    };
  }, [customersByStage]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const customerId = active.id as string;
    const overId = over.id as string;
    
    // Check if dropped on a stage column directly
    const validStages = STAGES.map(s => s.id);
    let newStage: string;
    
    if (validStages.includes(overId)) {
      // Dropped on a stage column
      newStage = overId;
    } else {
      // Dropped on another customer card - get that customer's stage
      const targetCustomer = customers.find(c => c.id === overId);
      if (!targetCustomer) {
        setActiveId(null);
        return;
      }
      newStage = targetCustomer.stage;
    }

    const customer = customers.find(c => c.id === customerId);
    if (customer && customer.stage !== newStage) {
      updateCustomerMutation.mutate({ id: customerId, stage: newStage });
    }

    setActiveId(null);
  }

  const activeCustomer = activeId ? customers.find(c => c.id === activeId) : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-pipeline-title">Sales Pipeline</h1>
          <p className="text-muted-foreground mt-1">Drag and drop customers to move them through stages. Click a card to view details.</p>
        </div>
      </div>

      {/* Filter Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-pipeline-country">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {COUNTRIES.map(country => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={salesPersonFilter} onValueChange={setSalesPersonFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-pipeline-salesperson">
              <SelectValue placeholder="All Salespeople" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Salespeople</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {salesReps.map(rep => (
                <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          {hasFilters && (
            <span className="text-sm text-muted-foreground">
              Showing {filteredCustomers.length} of {customers.length} customers
            </span>
          )}
        </div>
      </Card>

      {/* Pipeline Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover-elevate relative overflow-visible" data-testid="card-pipeline-total">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl pointer-events-none" />
          <CardHeader className="relative pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Total Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold">
              ${stageMetrics.reduce((sum, m) => sum + m.value, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="hover-elevate relative overflow-visible" data-testid="card-lead-prospect">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl pointer-events-none" />
          <CardHeader className="relative pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-secondary" />
              Lead → Prospect
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold">{conversionMetrics.leadToProspect}%</div>
          </CardContent>
        </Card>
        <Card className="hover-elevate relative overflow-visible" data-testid="card-prospect-customer">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl pointer-events-none" />
          <CardHeader className="relative pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Prospect → Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold">{conversionMetrics.prospectToCustomer}%</div>
          </CardContent>
        </Card>
        <Card className="hover-elevate relative overflow-visible" data-testid="card-overall-conversion">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl pointer-events-none" />
          <CardHeader className="relative pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-secondary" />
              Overall Conversion
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold">{conversionMetrics.overall}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STAGES.map(stage => {
            const metrics = stageMetrics.find(m => m.stage === stage.id);
            const stageCustomers = customersByStage[stage.id] || [];

            return (
              <SortableContext
                key={stage.id}
                id={stage.id}
                items={stageCustomers.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <Card className="flex flex-col h-[calc(100vh-320px)]">
                  <CardHeader className={`${stage.color} text-white rounded-t-lg pb-3`}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{stage.name}</CardTitle>
                      <Badge variant="secondary" className="bg-white/20 text-white">
                        {metrics?.count || 0}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div>
                        <div className="opacity-80">Value</div>
                        <div className="font-semibold">${(metrics?.value || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="opacity-80">Avg Days</div>
                        <div className="font-semibold">{metrics?.avgDays || 0}d</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto pt-4">
                    <DroppableColumn id={stage.id}>
                      {stageCustomers.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                          No customers in this stage
                        </div>
                      ) : (
                        stageCustomers.map(customer => (
                          <PipelineCard 
                            key={customer.id} 
                            customer={customer} 
                            onClick={() => handleCustomerClick(customer)}
                            assignedUserName={getUserName(customer.assignedTo)}
                          />
                        ))
                      )}
                    </DroppableColumn>
                  </CardContent>
                </Card>
              </SortableContext>
            );
          })}
        </div>

        <DragOverlay>
          {activeCustomer ? <PipelineCard customer={activeCustomer} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomerDetail || (selectedCustomer as CustomerWithDetails | null)}
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onUpdate={handleUpdateCustomer}
        onAddInteraction={handleAddInteraction}
        isUpdating={updateDetailMutation.isPending}
        isAddingInteraction={addInteractionMutation.isPending}
      />
    </div>
  );
}
