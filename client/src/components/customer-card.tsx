import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Customer, CustomerWithBrands, STAGE_LABELS } from "@shared/schema";
import { MapPin, AlertTriangle, Clock, PhoneOff, Moon, PhoneMissed } from "lucide-react";
import { differenceInDays, format } from "date-fns";
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
  nurture: {
    bg: "bg-teal-500",
    text: "text-teal-700 dark:text-teal-400",
    badgeBg: "bg-teal-500/10 border-teal-500/30"
  },
  cold: {
    bg: "bg-slate-500",
    text: "text-slate-600 dark:text-slate-400",
    badgeBg: "bg-slate-500/10 border-slate-500/30"
  },
  disqualified_price: {
    bg: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-400",
    badgeBg: "bg-orange-500/10 border-orange-500/30"
  },
  disqualified_unresponsive: {
    bg: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-400",
    badgeBg: "bg-rose-500/10 border-rose-500/30"
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
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
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

export function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const config = stageConfig[customer.stage] || stageConfig.lead;
  const contactStatus = getContactStatus(customer.lastContactDate);
  const isClosedStage = customer.stage === 'closed';
  const isClosed = isClosedStage || customer.stage === 'dormant';
  const needsAttention = !isClosed && (contactStatus.status === 'critical' || contactStatus.status === 'warning' || contactStatus.status === 'never');
  const interactionCount = 'interactionCount' in customer ? (customer.interactionCount ?? 0) : 0;
  const isLead = ['lead', 'nurture', 'cold'].includes(customer.stage);
  const isDisqualified = customer.stage === 'disqualified_price' || customer.stage === 'disqualified_unresponsive';
  const isDormant = customer.stage === 'dormant';

  const monthlyTarget = 'currentMonthTarget' in customer ? customer.currentMonthTarget : null;
  const monthName = new Date().toLocaleString('default', { month: 'short' });

  let pct = 0;
  let isOver = false;
  let barColor = 'bg-muted-foreground/20';
  let displayActual: string | null = null;
  let targetDisplay: string | null = null;

  if (monthlyTarget) {
    const currency = (monthlyTarget.currency as Currency) || "HKD";
    const targetAmt = parseFloat(monthlyTarget.targetAmount);
    const targetBase = parseFloat(monthlyTarget.baseCurrencyAmount || '0');

    const salesBase = 'currentMonthSalesBase' in customer && customer.currentMonthSalesBase
      ? parseFloat(customer.currentMonthSalesBase)
      : 0;
    const mstActual = 'currentMonthActual' in customer && customer.currentMonthActual
      ? parseFloat(customer.currentMonthActual.actual)
      : 0;
    const mstCurrency = ('currentMonthActual' in customer && customer.currentMonthActual?.actualCurrency as Currency) || currency;

    pct = targetBase > 0 ? Math.min((salesBase / targetBase) * 100, 100) : 0;
    isOver = salesBase > targetBase && targetBase > 0;
    barColor = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-primary' : pct >= 30 ? 'bg-amber-500' : 'bg-red-400';
    displayActual = mstActual > 0 ? formatCurrency(mstActual, mstCurrency) : null;
    targetDisplay = formatCurrency(targetAmt, currency);
  }

  return (
    <Card
      className="hover-elevate active-elevate-2 cursor-pointer transition-all group overflow-visible"
      onClick={onClick}
      data-testid={`card-customer-${customer.id}`}
    >
      <CardContent className="p-0">
        {/* Top accent bar */}
        <div className={`h-1 ${config.bg} rounded-t-md`} />

        <div className="p-4 flex flex-col gap-3">
          {/* Header: Avatar, Name, Stage badge */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0 ring-2 ring-background shadow-sm">
              <AvatarFallback className={`${config.bg} text-white font-semibold text-sm`}>
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm leading-tight line-clamp-2" data-testid={`text-customer-name-${customer.id}`}>
                  {customer.name}
                </h3>
                <Badge
                  variant="outline"
                  className={`${config.badgeBg} ${config.text} uppercase text-[10px] font-semibold shrink-0 px-1.5 py-0`}
                  data-testid={`badge-stage-${customer.id}`}
                >
                  {STAGE_LABELS[customer.stage] ?? customer.stage}
                </Badge>
              </div>
              {customer.country && (
                <span className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {customer.country}
                </span>
              )}
            </div>
          </div>

          {/* Target progress — always rendered for consistent height */}
          <div className="space-y-1" data-testid={`section-month-target-${customer.id}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">{monthName} Target</span>
              <span className="text-muted-foreground">
                {monthlyTarget
                  ? (displayActual ? `${displayActual} / ${targetDisplay}` : targetDisplay)
                  : <span className="italic">No target set</span>
                }
              </span>
            </div>
            <div
              className="relative h-3 w-full rounded-full bg-muted overflow-hidden"
              data-testid={`progress-month-target-${customer.id}`}
            >
              {monthlyTarget && (
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              )}
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-muted-foreground">
                {monthlyTarget ? (isOver ? 'Target exceeded' : 'Progress') : ''}
              </span>
              <span className={`font-semibold ${isOver ? 'text-green-600' : pct >= 60 ? 'text-primary' : 'text-muted-foreground'}`}>
                {monthlyTarget ? `${pct.toFixed(0)}%` : '—'}
              </span>
            </div>
          </div>

          {/* Footer */}
          {isDisqualified ? (
            <div className="flex items-center gap-2 pt-2 border-t text-xs font-medium text-muted-foreground">
              <PhoneOff className="h-3.5 w-3.5 shrink-0" />
              <span>
                {customer.stage === 'disqualified_price' ? 'Price mismatch' : 'Unresponsive'}
              </span>
              {customer.closureDate && (
                <span className="ml-auto text-[10px]">
                  {format(new Date(customer.closureDate), 'dd MMM yyyy')}
                </span>
              )}
            </div>
          ) : isClosedStage ? (
            <div className="flex items-center gap-2 pt-2 border-t text-xs font-medium text-muted-foreground">
              <PhoneOff className="h-3.5 w-3.5 shrink-0" />
              <span>
                {customer.closureDate
                  ? `Closed ${format(new Date(customer.closureDate), 'dd MMM yyyy')}`
                  : 'Closed'}
              </span>
            </div>
          ) : isDormant ? (
            <div className="flex items-center gap-2 pt-2 border-t text-xs font-medium text-muted-foreground">
              <Moon className="h-3.5 w-3.5 shrink-0" />
              <span>
                {customer.closureDate
                  ? `Dormant since ${format(new Date(customer.closureDate), 'dd MMM yyyy')}`
                  : 'Dormant'}
              </span>
            </div>
          ) : isLead ? (
            <div className="flex items-center gap-2 pt-2 border-t text-xs font-medium text-muted-foreground">
              <PhoneMissed className="h-3.5 w-3.5 shrink-0" />
              <span>{interactionCount === 0 ? 'No contact attempts yet' : `${interactionCount} contact attempt${interactionCount === 1 ? '' : 's'}`}</span>
              {contactStatus.status !== 'never' && (
                <span className="ml-auto text-[10px]">{contactStatus.days}d ago</span>
              )}
            </div>
          ) : (
            <div className={`flex items-center gap-2 pt-2 border-t text-xs font-medium ${
              contactStatus.status === 'critical' ? 'text-red-600 dark:text-red-400' :
              contactStatus.status === 'warning' ? 'text-amber-600 dark:text-amber-400' :
              'text-muted-foreground'
            }`}>
              {(contactStatus.status === 'critical' || contactStatus.status === 'never') && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
              {(contactStatus.status === 'warning' || contactStatus.status === 'ok') && <Clock className="h-3.5 w-3.5 shrink-0" />}
              <span>
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
          )}
        </div>
      </CardContent>
    </Card>
  );
}
