import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface ForecastData {
  predictedSales: number;
  confidence: number;
  trend: string;
  insights: string;
  forecastMonth: number;
  forecastYear: number;
}

export function AiForecastCard() {
  const [showForecast, setShowForecast] = useState(false);

  const { data: forecast, isLoading, error, refetch } = useQuery<ForecastData>({
    queryKey: ['/api/ai/sales-forecast'],
    enabled: showForecast,
  });

  const handleGenerateForecast = () => {
    setShowForecast(true);
    // Always refetch, regardless of whether we have previous data or error
    refetch();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    if (confidence >= 60) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    if (confidence >= 40) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return "High Confidence";
    if (confidence >= 60) return "Moderate Confidence";
    if (confidence >= 40) return "Low Confidence";
    return "Very Low Confidence";
  };

  return (
    <Card className="border-l-4 border-l-purple-500" data-testid="card-ai-forecast">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <CardTitle className="text-lg">AI Sales Forecast</CardTitle>
          </div>
          {!showForecast || error ? (
            <Button 
              onClick={handleGenerateForecast}
              variant="outline"
              size="sm"
              disabled={isLoading}
              data-testid="button-generate-forecast"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {error ? 'Retry Forecast' : 'Generate Forecast'}
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleGenerateForecast}
              variant="ghost"
              size="sm"
              disabled={isLoading}
              data-testid="button-regenerate-forecast"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Regenerate
                </>
              )}
            </Button>
          )}
        </div>
        <CardDescription>
          AI-powered sales prediction based on historical data and current trends
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20" data-testid="error-forecast">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">Failed to generate forecast</p>
              <p className="text-xs text-muted-foreground mt-1">
                {error instanceof Error ? error.message : 'Please try again'}
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
            <p className="text-sm text-muted-foreground">Analyzing historical sales data...</p>
          </div>
        )}

        {!isLoading && !error && !showForecast && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="p-4 rounded-full bg-purple-500/10">
              <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Generate an AI-powered forecast to predict next month's sales based on your historical performance and current trends
            </p>
          </div>
        )}

        {!isLoading && !error && forecast && (
          <div className="space-y-6">
            {/* Forecast Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Predicted Sales</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400" data-testid="text-predicted-sales">
                    ${forecast.predictedSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(forecast.forecastYear, forecast.forecastMonth - 1), 'MMMM yyyy')}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Confidence Level</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold" data-testid="text-confidence-level">
                    {forecast.confidence}%
                  </p>
                </div>
                <Badge 
                  variant="secondary" 
                  className={getConfidenceColor(forecast.confidence)}
                  data-testid="badge-confidence"
                >
                  {getConfidenceLabel(forecast.confidence)}
                </Badge>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Trend Direction</p>
                <p className="text-2xl font-bold capitalize" data-testid="text-trend">
                  {forecast.trend}
                </p>
                <p className="text-xs text-muted-foreground">
                  Based on 6-month analysis
                </p>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Forecast Confidence</span>
                <span className="font-medium">{forecast.confidence}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all bg-gradient-to-r from-purple-600 to-purple-400"
                  style={{ width: `${forecast.confidence}%` }}
                  data-testid="progress-confidence"
                />
              </div>
            </div>

            {/* AI Insights */}
            <div className="p-4 bg-muted/50 rounded-lg border space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                AI Insights
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-forecast-insights">
                {forecast.insights}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
