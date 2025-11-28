
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Customer, User } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { TrendingUp, Users, Target, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";

export default function ComparativeAnalytics() {
  const [selectedRegion1, setSelectedRegion1] = useState<string>("all");
  const [selectedRegion2, setSelectedRegion2] = useState<string>("all");
  const [selectedRep1, setSelectedRep1] = useState<string>("all");
  const [selectedRep2, setSelectedRep2] = useState<string>("all");

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: users = [] } = useQuery<Omit<User, 'password'>[]>({
    queryKey: ["/api/users"],
  });

  // Get unique regions
  const regions = useMemo(() => {
    const uniqueRegions = new Set(customers.map(c => c.country).filter(Boolean));
    return Array.from(uniqueRegions).sort();
  }, [customers]);

  // Get sales reps
  const salesReps = useMemo(() => {
    return users.filter(u => u.role === "salesman" || u.role === "manager");
  }, [users]);

  // Regional comparison data
  const regionalComparison = useMemo(() => {
    const getRegionStats = (region: string) => {
      const regionCustomers = region === "all" 
        ? customers 
        : customers.filter(c => c.country === region);
      
      return {
        totalCustomers: regionCustomers.length,
        leads: regionCustomers.filter(c => c.stage === "lead").length,
        prospects: regionCustomers.filter(c => c.stage === "prospect").length,
        customers: regionCustomers.filter(c => c.stage === "customer").length,
        avgTarget: regionCustomers.reduce((sum, c) => sum + (Number(c.quarterlySoftTargetBaseCurrency) || 0), 0) / (regionCustomers.length || 1),
        conversionRate: regionCustomers.filter(c => c.stage === "customer").length / (regionCustomers.length || 1) * 100,
      };
    };

    const region1Stats = getRegionStats(selectedRegion1);
    const region2Stats = getRegionStats(selectedRegion2);

    return [
      {
        metric: "Total Customers",
        [selectedRegion1 === "all" ? "All Regions" : selectedRegion1]: region1Stats.totalCustomers,
        [selectedRegion2 === "all" ? "All Regions" : selectedRegion2]: region2Stats.totalCustomers,
      },
      {
        metric: "Leads",
        [selectedRegion1 === "all" ? "All Regions" : selectedRegion1]: region1Stats.leads,
        [selectedRegion2 === "all" ? "All Regions" : selectedRegion2]: region2Stats.leads,
      },
      {
        metric: "Prospects",
        [selectedRegion1 === "all" ? "All Regions" : selectedRegion1]: region1Stats.prospects,
        [selectedRegion2 === "all" ? "All Regions" : selectedRegion2]: region2Stats.prospects,
      },
      {
        metric: "Customers",
        [selectedRegion1 === "all" ? "All Regions" : selectedRegion1]: region1Stats.customers,
        [selectedRegion2 === "all" ? "All Regions" : selectedRegion2]: region2Stats.customers,
      },
    ];
  }, [customers, selectedRegion1, selectedRegion2]);

  // Rep comparison data
  const repComparison = useMemo(() => {
    const getRepStats = (repId: string) => {
      const repCustomers = repId === "all" 
        ? customers 
        : customers.filter(c => c.assignedTo === repId);
      
      const repInteractions = repCustomers.reduce((sum, c) => sum + (c.interactions?.length || 0), 0);
      
      return {
        totalCustomers: repCustomers.length,
        leads: repCustomers.filter(c => c.stage === "lead").length,
        prospects: repCustomers.filter(c => c.stage === "prospect").length,
        customers: repCustomers.filter(c => c.stage === "customer").length,
        interactions: repInteractions,
        conversionRate: repCustomers.filter(c => c.stage === "customer").length / (repCustomers.length || 1) * 100,
      };
    };

    const rep1Stats = getRepStats(selectedRep1);
    const rep2Stats = getRepStats(selectedRep2);

    const rep1Name = selectedRep1 === "all" ? "All Reps" : users.find(u => u.id === selectedRep1)?.name || "Rep 1";
    const rep2Name = selectedRep2 === "all" ? "All Reps" : users.find(u => u.id === selectedRep2)?.name || "Rep 2";

    return [
      {
        metric: "Total Customers",
        [rep1Name]: rep1Stats.totalCustomers,
        [rep2Name]: rep2Stats.totalCustomers,
      },
      {
        metric: "Active Customers",
        [rep1Name]: rep1Stats.customers,
        [rep2Name]: rep2Stats.customers,
      },
      {
        metric: "Prospects",
        [rep1Name]: rep1Stats.prospects,
        [rep2Name]: rep2Stats.prospects,
      },
      {
        metric: "Leads",
        [rep1Name]: rep1Stats.leads,
        [rep2Name]: rep2Stats.leads,
      },
      {
        metric: "Interactions",
        [rep1Name]: rep1Stats.interactions,
        [rep2Name]: rep2Stats.interactions,
      },
    ];
  }, [customers, users, selectedRep1, selectedRep2]);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-comparative-title">Comparative Analytics</h1>
        <p className="text-muted-foreground mt-1">Compare performance across regions and sales representatives</p>
      </div>

      <Tabs defaultValue="regions" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="regions" data-testid="tab-regions">Region vs Region</TabsTrigger>
          <TabsTrigger value="reps" data-testid="tab-reps">Rep vs Rep</TabsTrigger>
        </TabsList>

        <TabsContent value="regions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Regional Comparison
              </CardTitle>
              <CardDescription>Compare performance metrics between different regions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Region 1</label>
                  <Select value={selectedRegion1} onValueChange={setSelectedRegion1}>
                    <SelectTrigger data-testid="select-region-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {regions.map(region => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Region 2</label>
                  <Select value={selectedRegion2} onValueChange={setSelectedRegion2}>
                    <SelectTrigger data-testid="select-region-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {regions.map(region => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={regionalComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey={selectedRegion1 === "all" ? "All Regions" : selectedRegion1} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={selectedRegion2 === "all" ? "All Regions" : selectedRegion2} fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reps" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Sales Rep Comparison
              </CardTitle>
              <CardDescription>Compare performance metrics between sales representatives</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Sales Rep 1</label>
                  <Select value={selectedRep1} onValueChange={setSelectedRep1}>
                    <SelectTrigger data-testid="select-rep-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reps</SelectItem>
                      {salesReps.map(rep => (
                        <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Sales Rep 2</label>
                  <Select value={selectedRep2} onValueChange={setSelectedRep2}>
                    <SelectTrigger data-testid="select-rep-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reps</SelectItem>
                      {salesReps.map(rep => (
                        <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={repComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey={repComparison[0] ? Object.keys(repComparison[0])[1] : ""} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={repComparison[0] ? Object.keys(repComparison[0])[2] : ""} fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
