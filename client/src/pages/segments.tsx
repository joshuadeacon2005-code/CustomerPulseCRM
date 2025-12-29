import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { Segment, Customer } from "@shared/schema";
import { Target, Users, TrendingUp, ArrowRight, Download, Filter, Plus, X, Star, Clock, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/export-utils";
import { differenceInDays } from "date-fns";

const segmentIcons = {
  "High-Value Leads": TrendingUp,
  "Active Prospects": Target,
  "New Customers": Users,
  "At-Risk Leads": Target,
};

interface DynamicFilter {
  stage?: string[];
  minTarget?: number;
  maxTarget?: number;
  daysSinceContact?: number;
  hasInteractions?: boolean;
  country?: string[];
}

export default function Segments() {
  const { toast } = useToast();
  const [dynamicFilter, setDynamicFilter] = useState<DynamicFilter>({});
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");

  const { data: segments, isLoading } = useQuery<Segment[]>({
    queryKey: ["/api/segments"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Apply dynamic filters
  const filteredCustomers = useMemo(() => {
    let filtered = [...customers];

    if (dynamicFilter.stage && dynamicFilter.stage.length > 0) {
      filtered = filtered.filter(c => dynamicFilter.stage!.includes(c.stage));
    }

    if (dynamicFilter.minTarget !== undefined) {
      filtered = filtered.filter(c => 
        Number(c.quarterlySoftTargetBaseCurrency) >= dynamicFilter.minTarget!
      );
    }

    if (dynamicFilter.maxTarget !== undefined) {
      filtered = filtered.filter(c => 
        Number(c.quarterlySoftTargetBaseCurrency) <= dynamicFilter.maxTarget!
      );
    }

    if (dynamicFilter.daysSinceContact !== undefined) {
      filtered = filtered.filter(c => {
        if (!c.lastContactDate) return true;
        const days = differenceInDays(new Date(), new Date(c.lastContactDate));
        return days >= dynamicFilter.daysSinceContact!;
      });
    }

    // Note: interactions are fetched separately, not on customer object
    // This filter is disabled as customer objects don't have interactions property
    // if (dynamicFilter.hasInteractions !== undefined) {
    //   filtered = filtered.filter(c => dynamicFilter.hasInteractions);
    // }

    if (dynamicFilter.country && dynamicFilter.country.length > 0) {
      filtered = filtered.filter(c => 
        c.country && dynamicFilter.country!.includes(c.country)
      );
    }

    return filtered;
  }, [customers, dynamicFilter]);

  const countries = useMemo(() => {
    return Array.from(new Set(customers.map(c => c.country).filter((c): c is string => c !== null))).sort();
  }, [customers]);

  const handleExportSegment = () => {
    const data = filteredCustomers.map(c => ({
      Name: c.name,
      Email: c.email,
      Phone: c.phone,
      Stage: c.stage,
      Country: c.country || "",
      Target: c.quarterlySoftTargetBaseCurrency || "",
      "Last Contact": c.lastContactDate || "",
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `segment-export-${Date.now()}.json`;
    a.click();

    toast({
      title: "Segment Exported",
      description: `Exported ${filteredCustomers.length} customers`,
    });
  };

  const handleBulkAction = () => {
    if (!bulkAction || selectedCustomers.size === 0) {
      toast({
        title: "No action selected",
        description: "Please select customers and an action",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Bulk Action",
      description: `${bulkAction} applied to ${selectedCustomers.size} customers`,
    });
  };

  const clearFilters = () => {
    setDynamicFilter({});
  };

  if (isLoading) {
    return (
      <div className="space-y-8 p-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  // Calculate segment stats
  const highValueCustomers = customers.filter(c => Number(c.quarterlySoftTargetBaseCurrency) >= 10000);
  const recentCustomers = customers.filter(c => c.stage === 'customer');
  const needsFollowUp = customers.filter(c => {
    if (!c.lastContactDate) return true;
    return differenceInDays(new Date(), new Date(c.lastContactDate)) >= 14;
  });
  const atRiskLeads = customers.filter(c => c.stage === 'lead' && (!c.lastContactDate || differenceInDays(new Date(), new Date(c.lastContactDate)) >= 30));

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-segments-title">Customer Segments</h1>
          <p className="text-muted-foreground mt-2">
            View and manage customer segments with dynamic filtering
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button data-testid="button-create-segment">
              <Plus className="h-4 w-4 mr-2" />
              Create Dynamic Segment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Dynamic Segment</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="filters">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="filters">Filters</TabsTrigger>
                <TabsTrigger value="preview">Preview ({filteredCustomers.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="filters" className="space-y-4 mt-4">
                <div>
                  <Label>Customer Stage</Label>
                  <div className="flex gap-2 mt-2">
                    {["lead", "prospect", "customer"].map(stage => (
                      <div key={stage} className="flex items-center gap-2">
                        <Checkbox
                          checked={dynamicFilter.stage?.includes(stage)}
                          onCheckedChange={(checked) => {
                            const current = dynamicFilter.stage || [];
                            setDynamicFilter({
                              ...dynamicFilter,
                              stage: checked
                                ? [...current, stage]
                                : current.filter(s => s !== stage),
                            });
                          }}
                        />
                        <label className="text-sm capitalize">{stage}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Min Target Value</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={dynamicFilter.minTarget || ""}
                      onChange={(e) => setDynamicFilter({
                        ...dynamicFilter,
                        minTarget: e.target.value ? Number(e.target.value) : undefined,
                      })}
                    />
                  </div>
                  <div>
                    <Label>Max Target Value</Label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={dynamicFilter.maxTarget || ""}
                      onChange={(e) => setDynamicFilter({
                        ...dynamicFilter,
                        maxTarget: e.target.value ? Number(e.target.value) : undefined,
                      })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Days Since Last Contact (min)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 30"
                    value={dynamicFilter.daysSinceContact || ""}
                    onChange={(e) => setDynamicFilter({
                      ...dynamicFilter,
                      daysSinceContact: e.target.value ? Number(e.target.value) : undefined,
                    })}
                  />
                </div>

                <div>
                  <Label>Countries</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {countries.map(country => (
                      <div key={country} className="flex items-center gap-2">
                        <Checkbox
                          checked={dynamicFilter.country?.includes(country)}
                          onCheckedChange={(checked) => {
                            const current = dynamicFilter.country || [];
                            setDynamicFilter({
                              ...dynamicFilter,
                              country: checked
                                ? [...current, country]
                                : current.filter(c => c !== country),
                            });
                          }}
                        />
                        <label className="text-sm">{country}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={clearFilters} variant="outline" className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                  <Button onClick={handleExportSegment} className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Export Segment
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Select value={bulkAction} onValueChange={setBulkAction}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Bulk Action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="export">Export Selected</SelectItem>
                        <SelectItem value="assign">Assign to Rep</SelectItem>
                        <SelectItem value="tag">Add Tag</SelectItem>
                        <SelectItem value="email">Send Email</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleBulkAction} disabled={selectedCustomers.size === 0}>
                      Apply to {selectedCustomers.size} Selected
                    </Button>
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {filteredCustomers.map(customer => (
                      <div key={customer.id} className="flex items-center gap-3 p-3 border rounded hover-elevate">
                        <Checkbox
                          checked={selectedCustomers.has(customer.id)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedCustomers);
                            if (checked) {
                              newSet.add(customer.id);
                            } else {
                              newSet.delete(customer.id);
                            }
                            setSelectedCustomers(newSet);
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{customer.name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs capitalize">{customer.stage}</Badge>
                            {customer.country && (
                              <Badge variant="outline" className="text-xs">{customer.country}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Segment Overview - Bento Grid */}
      <BentoGrid className="lg:grid-rows-1 auto-rows-[10rem]">
        <BentoCard
          name="High Value"
          className="lg:col-span-1"
          background={<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10" />}
          Icon={Star}
          description={`${highValueCustomers.length} customers with $10K+ quarterly targets`}
          href="/customers?filter=high-value"
          cta="View Customers"
        />
        <BentoCard
          name="Active Customers"
          className="lg:col-span-1"
          background={<div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-secondary/10" />}
          Icon={Users}
          description={`${recentCustomers.length} customers currently active in your portfolio`}
          href="/customers?stage=customer"
          cta="View All"
        />
        <BentoCard
          name="Needs Follow-up"
          className="lg:col-span-1"
          background={<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10" />}
          Icon={Clock}
          description={`${needsFollowUp.length} customers not contacted in 14+ days`}
          href="/customers?filter=follow-up"
          cta="Follow Up"
        />
      </BentoGrid>

      {segments && segments.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {segments.map((segment) => {
            const Icon = segmentIcons[segment.name as keyof typeof segmentIcons] || Target;
            return (
              <Card 
                key={segment.id} 
                className="hover-elevate transition-all"
                data-testid={`card-segment-${segment.id}`}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-md bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg mb-2">{segment.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {segment.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
                      <span className="text-sm font-medium">Total Customers</span>
                      <Badge variant="secondary" className="text-base font-bold px-3 py-1">
                        {segment.count}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase">Criteria</h4>
                      <div className="flex flex-wrap gap-2">
                        {segment.criteria.stage && segment.criteria.stage.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Stage: {segment.criteria.stage.join(", ")}
                          </Badge>
                        )}
                        {segment.criteria.minScore !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            Score: {segment.criteria.minScore}
                            {segment.criteria.maxScore ? `-${segment.criteria.maxScore}` : "+"}
                          </Badge>
                        )}
                        {segment.criteria.hasInteractionType && (
                          <Badge variant="outline" className="text-xs">
                            Has: {segment.criteria.hasInteractionType}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Link 
                      href={`/customers?${segment.criteria.stage?.[0] ? `stage=${segment.criteria.stage[0]}` : ''}`}
                    >
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        size="sm"
                        data-testid={`button-view-segment-${segment.id}`}
                      >
                        View Customers
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No segments available</h3>
            <p className="text-muted-foreground mb-6">
              Segments will be automatically created based on your customer data
            </p>
            <Link href="/customers">
              <Button data-testid="button-go-to-customers">
                <Users className="h-4 w-4 mr-2" />
                View Customers
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
