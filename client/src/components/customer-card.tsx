import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Customer, CustomerWithBrands } from "@shared/schema";
import { MapPin, Building2, AlertTriangle, Clock, TrendingUp, Mail, Phone } from "lucide-react";
import { differenceInDays } from "date-fns";
import { formatCurrency, Currency } from "@/lib/currency";

interface CustomerCardProps {
  customer: Customer | CustomerWithBrands;
  onClick: () => void;
}

const stageConfig: Record<string, { bg: string; text: string; badgeBg: string }> = {
  lead: { 
    bg: "bg-blue-500", 
    text: "text-blue-700 dark:text-blue-400",
    badgeBg: "bg-blue-500/10 border-blue-500/30"
  },
  prospect: { 
    bg: "bg-amber-500", 
    text: "text-amber-700 dark:text-amber-400",
    badgeBg: "bg-amber-500/10 border-amber-500/30"
  },
  customer: { 
    bg: "bg-green-500", 
    text: "text-green-700 dark:text-green-400",
    badgeBg: "bg-green-500/10 border-green-500/30"
  },
  dormant: {
    bg: "bg-gray-400",
    text: "text-gray-600 dark:text-gray-400",
    badgeBg: "bg-gray-400/10 border-gray-400/30"
  },
  closed: {
    bg: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
    badgeBg: "bg-red-500/10 border-red-500/30"
  },
};

const getInitials = (name: string) => {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

function getContactStatus(lastContactDate: Date | null | undefined): {
  status: 'ok' | 'warning' | 'critical' | 'never';
  days: number | null;
} {
  if (!lastContactDate) return { status: 'never', days: null };
  const days = differenceInDays(new Date(), new Date(lastContactDate));
  if (days >= 30) return { status: 'critical', days };
  if (days >= 14) return { status: 'warning', days };
  return { status: 'ok', days };
}

function formatQuarterlyTarget(value: number | string | null | undefined): string {
  if (!value) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

export function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const config = stageConfig[customer.stage] || stageConfig.lead;
  const contactStatus = getContactStatus(customer.lastContactDate);
  const needsAttention = contactStatus.status === 'critical' || contactStatus.status === 'warning' || contactStatus.status === 'never';
  const brands = 'brands' in customer ? customer.brands : [];
  
  return (
    <Card 
      className="hover-elevate active-elevate-2 cursor-pointer transition-all group overflow-visible"
      onClick={onClick}
      data-testid={`card-customer-${customer.id}`}
    >
      <CardContent className="p-0">
        {/* Top accent bar with stage color */}
        <div className={`h-1 ${config.bg} rounded-t-md`} />
        
        <div className="p-4 space-y-3">
          {/* Header: Avatar, Name, Stage */}
          <div className="flex items-start gap-3">
            <Avatar className="h-11 w-11 shrink-0 ring-2 ring-background shadow-sm">
              <AvatarFallback className={`${config.bg} text-white font-semibold text-sm`}>
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-base leading-tight line-clamp-2" data-testid={`text-customer-name-${customer.id}`}>
                  {customer.name}
                </h3>
                <Badge 
                  variant="outline" 
                  className={`${config.badgeBg} ${config.text} uppercase text-[10px] font-semibold shrink-0 px-1.5 py-0`}
                  data-testid={`badge-stage-${customer.id}`}
                >
                  {customer.stage}
                </Badge>
              </div>
              
              {/* Contact Info */}
              <div className="flex flex-col gap-0.5 mt-1.5 text-xs text-muted-foreground">
                {customer.email && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </span>
                )}
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" />
                    {customer.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Location & Type Row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {customer.country && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {customer.country}
              </span>
            )}
            {customer.retailerType && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {customer.retailerType}
              </span>
            )}
          </div>
          
          {/* Brands */}
          {brands.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {brands.slice(0, 3).map((brand) => (
                <Badge 
                  key={brand.id} 
                  variant="secondary" 
                  className="text-[10px] px-1.5 py-0 font-normal no-default-hover-elevate"
                >
                  {brand.name}
                </Badge>
              ))}
              {brands.length > 3 && (
                <Badge 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0 font-normal no-default-hover-elevate"
                >
                  +{brands.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* Quarterly Target */}
          {customer.quarterlySoftTarget && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              <TrendingUp className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Quarterly Target</p>
                <p className="font-semibold text-sm text-foreground">
                  {formatQuarterlyTarget(customer.quarterlySoftTarget)}
                </p>
              </div>
            </div>
          )}
          
          {/* Current Month Target Progress Bar */}
          {'currentMonthTarget' in customer && customer.currentMonthTarget && (() => {
            const currency = (customer.currentMonthTarget.currency as Currency) || "HKD";
            const targetAmt = parseFloat(customer.currentMonthTarget.targetAmount);
            const targetBase = parseFloat(customer.currentMonthTarget.baseCurrencyAmount || '0');

            // Use direct sales sum (most reliable) falling back to MST actual
            const salesBase = 'currentMonthSalesBase' in customer && customer.currentMonthSalesBase
              ? parseFloat(customer.currentMonthSalesBase)
              : 0;
            const mstActual = 'currentMonthActual' in customer && customer.currentMonthActual
              ? parseFloat(customer.currentMonthActual.actual)
              : 0;
            const mstCurrency = ('currentMonthActual' in customer && customer.currentMonthActual?.actualCurrency as Currency) || currency;

            // % from base amounts (cross-currency safe)
            const pct = targetBase > 0 ? Math.min((salesBase / targetBase) * 100, 100) : 0;
            const isOver = salesBase > targetBase && targetBase > 0;
            const monthName = new Date().toLocaleString('default', { month: 'short' });

            const barColor = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-primary' : pct >= 30 ? 'bg-amber-500' : 'bg-red-400';

            // Display actual: prefer MST amount in its currency, fall back to nothing
            const displayActual = mstActual > 0 ? formatCurrency(mstActual, mstCurrency) : null;

            return (
              <div className="space-y-1" data-testid={`section-month-target-${customer.id}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">{monthName} Target</span>
                  <span className="text-muted-foreground">
                    {displayActual ? `${displayActual} / ` : ''}{formatCurrency(targetAmt, currency)}
                  </span>
                </div>
                {/* Progress track */}
                <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden" data-testid={`progress-month-target-${customer.id}`}>
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground">{isOver ? 'Target exceeded' : 'Progress'}</span>
                  <span className={`font-semibold ${isOver ? 'text-green-600' : pct >= 60 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Last Contact Footer - Always Show */}
          <div className={`flex items-center gap-2 pt-2 border-t ${
            contactStatus.status === 'critical' ? 'text-red-600 dark:text-red-400' :
            contactStatus.status === 'warning' ? 'text-amber-600 dark:text-amber-400' :
            contactStatus.status === 'never' ? 'text-muted-foreground' :
            'text-muted-foreground'
          }`}>
            {contactStatus.status === 'critical' && <AlertTriangle className="h-3.5 w-3.5" />}
            {contactStatus.status === 'warning' && <Clock className="h-3.5 w-3.5" />}
            {contactStatus.status === 'never' && <AlertTriangle className="h-3.5 w-3.5" />}
            {contactStatus.status === 'ok' && <Clock className="h-3.5 w-3.5" />}
            <span className="text-xs font-medium">
              {contactStatus.status === 'never' 
                ? 'Never contacted' 
                : `Last contact ${contactStatus.days} days ago`}
            </span>
            {needsAttention && (
              <Badge 
                variant={contactStatus.status === 'critical' ? 'destructive' : 'secondary'}
                className="text-[10px] ml-auto no-default-hover-elevate"
              >
                Needs Attention
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
