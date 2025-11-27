import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Customer, CustomerWithBrands } from "@shared/schema";
import { Mail, Phone, User, AlertTriangle, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface CustomerCardProps {
  customer: Customer | CustomerWithBrands;
  onClick: () => void;
}

const stageColors = {
  lead: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  prospect: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  customer: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
};

const getInitials = (name: string) => {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// Helper to check if customer needs attention based on last contact
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
  return (
    <Card 
      className="hover-elevate active-elevate-2 cursor-pointer transition-all"
      onClick={onClick}
      data-testid={`card-customer-${customer.id}`}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(customer.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate" data-testid={`text-customer-name-${customer.id}`}>
              {customer.name}
            </h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{customer.email}</span>
            </div>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={`${stageColors[customer.stage as keyof typeof stageColors]} uppercase text-xs shrink-0`}
          data-testid={`badge-stage-${customer.id}`}
        >
          {customer.stage}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Phone className="h-3.5 w-3.5" />
          <span className="text-xs">{customer.phone}</span>
        </div>
        {customer.assignedTo && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2 pt-2 border-t">
            <User className="h-3 w-3" />
            <span>Assigned to: {(customer as any).assignedToName || customer.assignedTo}</span>
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-2">
          Added {format(new Date(customer.createdAt), "MMM d, yyyy")}
        </div>
        
        {/* Last Contact Status */}
        {(() => {
          const contactStatus = getContactStatus(customer.lastContactDate);
          if (contactStatus.status === 'critical') {
            return (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t text-red-500">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Needs attention ({contactStatus.days} days)</span>
              </div>
            );
          } else if (contactStatus.status === 'warning') {
            return (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t text-amber-500">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">Last contact: {contactStatus.days} days ago</span>
              </div>
            );
          }
          return null;
        })()}
      </CardContent>
    </Card>
  );
}
