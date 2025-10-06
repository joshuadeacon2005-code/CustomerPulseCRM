import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Target, Activity, Plus, ArrowRight, Mail, Phone, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { DashboardStats, Interaction } from "@shared/schema";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const categoryIcons = {
  marketing: Mail,
  sales: Phone,
  support: MessageSquare,
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: recentInteractions, isLoading: interactionsLoading } = useQuery<Interaction[]>({
    queryKey: ["/api/interactions/recent"],
  });

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your customer relationships and sales pipeline
          </p>
        </div>
        <Link href="/customers">
          <Button data-testid="button-add-customer">
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={stats?.totalCustomers || 0}
          icon={Users}
          description="Across all stages"
        />
        <StatCard
          title="Leads"
          value={stats?.leadCount || 0}
          icon={Target}
          description="New opportunities"
        />
        <StatCard
          title="Prospects"
          value={stats?.prospectCount || 0}
          icon={TrendingUp}
          description="In pipeline"
        />
        <StatCard
          title="Customers"
          value={stats?.customerCount || 0}
          icon={Activity}
          description="Active customers"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-lg">Pipeline Overview</CardTitle>
            <Link href="/analytics">
              <Button variant="ghost" size="sm" data-testid="button-view-analytics">
                View Details
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Leads</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.leadCount || 0} customers
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ 
                      width: `${stats?.totalCustomers ? (stats.leadCount / stats.totalCustomers) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Prospects</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.prospectCount || 0} customers
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ 
                      width: `${stats?.totalCustomers ? (stats.prospectCount / stats.totalCustomers) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Customers</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.customerCount || 0} customers
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ 
                      width: `${stats?.totalCustomers ? (stats.customerCount / stats.totalCustomers) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Average Lead Score</span>
                <span className="text-lg font-bold">
                  {stats?.averageLeadScore?.toFixed(1) || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Interactions</CardTitle>
          </CardHeader>
          <CardContent>
            {interactionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : recentInteractions && recentInteractions.length > 0 ? (
              <div className="space-y-3">
                {recentInteractions.slice(0, 5).map((interaction) => {
                  const Icon = categoryIcons[interaction.category as keyof typeof categoryIcons];
                  return (
                    <div 
                      key={interaction.id} 
                      className="flex items-start gap-3 p-3 rounded-md bg-muted/50 hover-elevate"
                      data-testid={`item-recent-interaction-${interaction.id}`}
                    >
                      <div className="p-2 rounded-md bg-muted shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm truncate">{interaction.type}</p>
                          <span className="text-xs text-muted-foreground font-mono shrink-0">
                            {format(new Date(interaction.date), "MMM d")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {interaction.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No interactions yet</p>
                <Link href="/customers">
                  <Button variant="outline" size="sm" className="mt-4" data-testid="button-empty-add-customer">
                    Add Customer
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/customers">
              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-view-customers">
                <Users className="h-4 w-4 mr-2" />
                View All Customers
              </Button>
            </Link>
            <Link href="/customers?stage=lead">
              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-leads">
                <Target className="h-4 w-4 mr-2" />
                View Leads
              </Button>
            </Link>
            <Link href="/segments">
              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-segments">
                <Activity className="h-4 w-4 mr-2" />
                View Segments
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-analytics">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
