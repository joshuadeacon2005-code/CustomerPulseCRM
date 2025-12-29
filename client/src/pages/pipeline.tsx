
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Customer } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, DollarSign, Clock, Target } from "lucide-react";
import { format, differenceInDays } from "date-fns";

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

function PipelineCard({ customer }: { customer: Customer }) {
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

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="mb-3 cursor-move hover-elevate" data-testid={`pipeline-card-${customer.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{customer.name}</h4>
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

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

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
      acc[stage.id] = customers.filter(c => c.stage === stage.id);
      return acc;
    }, {} as Record<string, Customer[]>);
  }, [customers]);

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
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-pipeline-title">Sales Pipeline</h1>
        <p className="text-muted-foreground mt-1">Drag and drop customers to move them through stages</p>
      </div>

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
                          <PipelineCard key={customer.id} customer={customer} />
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
    </div>
  );
}
