import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, TrendingUp, AlertCircle, DollarSign, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AIInsightsProps {
  customerId: string;
}

interface CustomerInsightsResponse {
  insights: string;
  metadata: {
    totalSales: number;
    avgMonthlySales: number;
    interactionCount: number;
    lastInteractionDate: string;
    salesTrend: Array<{ month: number; year: number; amount: number }>;
  };
}

export function AIInsightsPanel({ customerId }: AIInsightsProps) {
  const [insights, setInsights] = useState<CustomerInsightsResponse | null>(null);

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/ai/customer-insights/${customerId}`);
      return response.json();
    },
    onSuccess: (data) => {
      setInsights(data);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Customer Insights
          </CardTitle>
          <CardDescription>
            Get instant AI analysis of customer performance, purchasing patterns, and actionable recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!insights ? (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Generate AI insights to understand this customer's behavior and identify opportunities
              </p>
              <Button
                onClick={() => generateInsightsMutation.mutate()}
                disabled={generateInsightsMutation.isPending}
                data-testid="button-generate-insights"
              >
                {generateInsightsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {generateInsightsMutation.isPending ? "Analyzing..." : "Generate AI Insights"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(insights.metadata.totalSales)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Total Sales</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(insights.metadata.avgMonthlySales)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Avg Monthly</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {insights.metadata.interactionCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Interactions</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {insights.metadata.lastInteractionDate !== 'Never'
                        ? new Date(insights.metadata.lastInteractionDate).toLocaleDateString()
                        : 'Never'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Last Contact</p>
                  </CardContent>
                </Card>
              </div>

              {/* AI Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Analysis & Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {insights.insights.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className="text-sm mb-3 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Regenerate Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => generateInsightsMutation.mutate()}
                  disabled={generateInsightsMutation.isPending}
                  data-testid="button-regenerate-insights"
                >
                  {generateInsightsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Regenerate Insights
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {generateInsightsMutation.isError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to generate insights. Please try again.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
