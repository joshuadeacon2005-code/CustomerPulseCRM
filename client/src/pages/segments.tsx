import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segment } from "@shared/schema";
import { Target, Users, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

const segmentIcons = {
  "High-Value Leads": TrendingUp,
  "Active Prospects": Target,
  "New Customers": Users,
  "At-Risk Leads": Target,
};

export default function Segments() {
  const { data: segments, isLoading } = useQuery<Segment[]>({
    queryKey: ["/api/segments"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-segments-title">Customer Segments</h1>
        <p className="text-muted-foreground mt-1">
          View and manage customer segments based on journey stage, interactions, and lead scores
        </p>
      </div>

      {segments && segments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {segments.map((segment) => {
            const Icon = segmentIcons[segment.name as keyof typeof segmentIcons] || Target;
            return (
              <Card 
                key={segment.id} 
                className="hover-elevate transition-all"
                data-testid={`card-segment-${segment.id}`}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg mb-1">{segment.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {segment.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                      <span className="text-sm font-medium">Total Customers</span>
                      <Badge variant="secondary" className="text-base font-bold">
                        {segment.count}
                      </Badge>
                    </div>

                    <div className="space-y-2">
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
