import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, AlertCircle, Phone, Calendar, ChevronRight, User } from "lucide-react";
import { Link } from "wouter";

interface Recommendation {
  customerId: string;
  customerName: string;
  priority: number;
  reason: string;
  suggestedAction: string;
}

interface NextBestActionData {
  recommendations: Recommendation[];
  rawInsights?: string;
  analyzedCount: number;
  message?: string;
}

export function AiNextActionCard() {
  const [showRecommendations, setShowRecommendations] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<NextBestActionData>({
    queryKey: ['/api/ai/next-best-action'],
    enabled: showRecommendations,
  });

  const handleGenerateRecommendations = () => {
    setShowRecommendations(true);
    refetch();
  };

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    if (priority === 2) return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    if (priority === 3) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  };

  const getActionIcon = (action: string) => {
    if (action.toLowerCase().includes('call')) {
      return <Phone className="h-4 w-4" />;
    }
    return <Calendar className="h-4 w-4" />;
  };

  return (
    <Card className="border-l-4 border-l-teal-500" data-testid="card-ai-next-action">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <CardTitle className="text-lg">AI Next Best Action</CardTitle>
          </div>
          {!showRecommendations || error ? (
            <Button 
              onClick={handleGenerateRecommendations}
              variant="outline"
              size="sm"
              disabled={isLoading}
              data-testid="button-get-recommendations"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {error ? 'Retry' : 'Get Recommendations'}
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleGenerateRecommendations}
              variant="ghost"
              size="sm"
              disabled={isLoading}
              data-testid="button-refresh-recommendations"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          )}
        </div>
        <CardDescription>
          AI-powered suggestions for which customers to contact today
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20" data-testid="error-recommendations">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">Failed to get recommendations</p>
              <p className="text-xs text-muted-foreground mt-1">
                {error instanceof Error ? error.message : 'Please try again'}
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600 dark:text-teal-400" />
            <p className="text-sm text-muted-foreground">Analyzing your customer portfolio...</p>
          </div>
        )}

        {!isLoading && !error && !showRecommendations && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="p-4 rounded-full bg-teal-500/10">
              <Sparkles className="h-8 w-8 text-teal-600 dark:text-teal-400" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Get AI-powered recommendations for which customers need your attention today.
            </p>
          </div>
        )}

        {!isLoading && !error && showRecommendations && data && (
          <div className="space-y-4">
            {data.message && (
              <p className="text-sm text-muted-foreground">{data.message}</p>
            )}
            
            {data.recommendations.length > 0 ? (
              <div className="space-y-3">
                {data.recommendations.slice(0, 5).map((rec, index) => (
                  <div 
                    key={rec.customerId || index}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover-elevate"
                    data-testid={`recommendation-${index}`}
                  >
                    <Badge variant="outline" className={`${getPriorityColor(rec.priority)} shrink-0`}>
                      #{rec.priority}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium truncate">{rec.customerName}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{rec.reason}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-primary">
                        {getActionIcon(rec.suggestedAction)}
                        <span>{rec.suggestedAction}</span>
                      </div>
                    </div>
                    <Link href={`/customers?customer=${rec.customerId}`}>
                      <Button size="icon" variant="ghost" className="shrink-0" data-testid={`button-view-customer-${index}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No urgent customer actions needed right now.
                </p>
              </div>
            )}
            
            {data.analyzedCount > 0 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                Based on analysis of {data.analyzedCount} customers
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
