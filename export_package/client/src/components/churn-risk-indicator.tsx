import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, AlertTriangle, Shield, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface ChurnRiskData {
  customerId: string;
  customerName: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskFactors: string[];
  metrics: {
    daysSinceLastContact: number;
    recentInteractions: number;
    totalInteractions: number;
    recentSalesAmount: number;
    quarterlySoftTarget: number | null;
  };
  recommendations: string;
}

interface ChurnRiskIndicatorProps {
  customerId: string;
}

export function ChurnRiskIndicator({ customerId }: ChurnRiskIndicatorProps) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading, error } = useQuery<ChurnRiskData>({
    queryKey: ['/api/ai/churn-risk', customerId],
    enabled: !!customerId,
  });

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical": return "text-red-600 dark:text-red-400";
      case "high": return "text-orange-600 dark:text-orange-400";
      case "medium": return "text-amber-600 dark:text-amber-400";
      default: return "text-green-600 dark:text-green-400";
    }
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case "critical": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      case "high": return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
      case "medium": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default: return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    }
  };

  const getRiskIcon = (level: string) => {
    if (level === "critical" || level === "high") {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Shield className="h-4 w-4" />;
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return "bg-red-500";
    if (score >= 50) return "bg-orange-500";
    if (score >= 25) return "bg-amber-500";
    return "bg-green-500";
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Calculating risk...</span>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`${getRiskColor(data.riskLevel)}`}>
            {getRiskIcon(data.riskLevel)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">Churn Risk</span>
              <Badge variant="outline" className={`${getRiskBadgeVariant(data.riskLevel)} text-xs`}>
                {data.riskLevel.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Progress 
                value={data.riskScore} 
                className={`w-24 h-2 ${getProgressColor(data.riskScore)}`}
              />
              <span className="text-xs text-muted-foreground">{data.riskScore}%</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {expanded && (
        <Card className="mt-3">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <CardTitle className="text-sm">Risk Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.riskFactors.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Risk Factors</h4>
                <ul className="space-y-1">
                  {data.riskFactors.map((factor, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Days Since Contact</span>
                <p className="font-medium">{data.metrics.daysSinceLastContact === 999 ? 'Never' : data.metrics.daysSinceLastContact}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Recent Interactions</span>
                <p className="font-medium">{data.metrics.recentInteractions} (30 days)</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Total Interactions</span>
                <p className="font-medium">{data.metrics.totalInteractions}</p>
              </div>
              {data.metrics.quarterlySoftTarget && (
                <div>
                  <span className="text-xs text-muted-foreground">Target Progress</span>
                  <p className="font-medium">
                    ${data.metrics.recentSalesAmount.toLocaleString()} / ${data.metrics.quarterlySoftTarget.toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {data.recommendations && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-purple-500" />
                  AI Recommendations
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.recommendations}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
