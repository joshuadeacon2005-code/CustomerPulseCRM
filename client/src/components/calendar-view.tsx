import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, parseISO, startOfDay, isToday, isPast } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/calendar.css";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Calendar as CalendarIcon, User, MessageSquare } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ActionItem, Customer, Interaction } from "@shared/schema";

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: 'action-item' | 'interaction';
    status?: string;
    interactionType?: string;
    customerId?: string;
    customerName?: string;
  };
}

interface CalendarViewProps {
  actionItems: ActionItem[];
  interactions: Interaction[];
  customers: Customer[];
}

export function CalendarView({ actionItems, interactions, customers }: CalendarViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Find the actual action item or interaction from the event
  const selectedActionItem = selectedEvent?.resource.type === 'action-item' 
    ? actionItems.find(item => `action-${item.id}` === selectedEvent.id)
    : null;

  const selectedInteraction = selectedEvent?.resource.type === 'interaction'
    ? interactions.find(interaction => `interaction-${interaction.id}` === selectedEvent.id)
    : null;

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      return apiRequest('PATCH', `/api/action-items/${itemId}`, {
        completedAt: completed ? new Date().toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/action-items'] });
      toast({
        title: "Success",
        description: "Action item updated",
      });
      setIsDialogOpen(false);
      setSelectedEvent(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update action item",
        variant: "destructive",
      });
    },
  });

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const events = useMemo(() => {
    const calendarEvents: CalendarEvent[] = [];
    
    // Create a map of customer IDs to names for quick lookup
    const customerMap = new Map(customers.map(c => [c.id, c.name]));

    // Add action items as events
    actionItems.forEach(item => {
      if (item.dueDate) {
        // Parse date string as local date to avoid UTC shift issues
        const dueDate = startOfDay(parseISO(item.dueDate.toString()));
        calendarEvents.push({
          id: `action-${item.id}`,
          title: item.description,
          start: dueDate,
          end: dueDate,
          resource: {
            type: 'action-item',
            status: item.completedAt ? 'completed' : 'pending',
            customerId: item.customerId,
            customerName: customerMap.get(item.customerId),
          },
        });
      }
    });

    // Add interactions as events
    interactions.forEach(interaction => {
      if (interaction.date) {
        // Parse date as local date to avoid UTC shift issues
        const interactionDate = startOfDay(parseISO(interaction.date.toString()));
        const customerName = customerMap.get(interaction.customerId);
        calendarEvents.push({
          id: `interaction-${interaction.id}`,
          title: `${interaction.type}: ${customerName || 'Unknown'}`,
          start: interactionDate,
          end: interactionDate,
          resource: {
            type: 'interaction',
            interactionType: interaction.type,
            customerId: interaction.customerId,
            customerName,
          },
        });
      }
    });

    return calendarEvents;
  }, [actionItems, interactions, customers]);

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3b82f6'; // default blue
    
    if (event.resource.type === 'action-item') {
      if (event.resource.status === 'completed') {
        backgroundColor = '#10b981'; // green for completed
      } else {
        // Use date-fns helpers for accurate date comparison
        const eventDate = event.start;
        
        if (isPast(eventDate) && !isToday(eventDate)) {
          backgroundColor = '#ef4444'; // red for overdue
        } else if (isToday(eventDate)) {
          backgroundColor = '#f59e0b'; // amber for today
        } else {
          backgroundColor = '#3b82f6'; // blue for upcoming
        }
      }
    } else if (event.resource.type === 'interaction') {
      backgroundColor = '#8b5cf6'; // purple for interactions
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calendar</CardTitle>
          <CardDescription>
            View all action items and customer interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px]" data-testid="calendar-view">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventPropGetter={eventStyleGetter}
              views={['month', 'week', 'day', 'agenda']}
              defaultView="month"
              onSelectEvent={handleEventClick}
            />
          </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <span className="text-muted-foreground">Overdue Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
            <span className="text-muted-foreground">Today's Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
            <span className="text-muted-foreground">Upcoming Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
            <span className="text-muted-foreground">Completed Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }}></div>
            <span className="text-muted-foreground">Interactions</span>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Event Details Dialog */}
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-event-details">
        <DialogHeader>
          <DialogTitle>
            {selectedEvent?.resource.type === 'action-item' ? 'Action Item Details' : 'Interaction Details'}
          </DialogTitle>
          <DialogDescription>
            {selectedEvent?.resource.type === 'action-item' 
              ? 'View and manage this action item'
              : 'Customer interaction details'}
          </DialogDescription>
        </DialogHeader>

        {selectedActionItem && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{selectedActionItem.description}</h3>
                <div className="flex items-center gap-2 mt-2">
                  {selectedActionItem.completedAt ? (
                    <Badge variant="default" className="bg-green-600" data-testid="badge-status-completed">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="secondary" data-testid="badge-status-pending">
                      <Circle className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium">{selectedEvent?.resource.customerName}</span>
              </div>

              {selectedActionItem.dueDate && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-medium">
                    {format(parseISO(selectedActionItem.dueDate.toString()), 'PPP')}
                  </span>
                </div>
              )}

              {selectedActionItem.visitDate && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Visit Date:</span>
                  <span className="font-medium">
                    {format(parseISO(selectedActionItem.visitDate.toString()), 'PPP')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              {!selectedActionItem.completedAt ? (
                <Button
                  onClick={() => toggleCompleteMutation.mutate({ 
                    itemId: selectedActionItem.id, 
                    completed: true 
                  })}
                  disabled={toggleCompleteMutation.isPending}
                  className="flex-1"
                  data-testid="button-mark-complete"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              ) : (
                <Button
                  onClick={() => toggleCompleteMutation.mutate({ 
                    itemId: selectedActionItem.id, 
                    completed: false 
                  })}
                  disabled={toggleCompleteMutation.isPending}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-mark-incomplete"
                >
                  <Circle className="h-4 w-4 mr-2" />
                  Mark Incomplete
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                data-testid="button-close-dialog"
              >
                Close
              </Button>
            </div>
          </div>
        )}

        {selectedInteraction && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-semibold text-lg">{selectedInteraction.type}</h3>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium">{selectedEvent?.resource.customerName}</span>
              </div>

              {selectedInteraction.date && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">
                    {format(parseISO(selectedInteraction.date.toString()), 'PPP')}
                  </span>
                </div>
              )}

              {selectedInteraction.description && (
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Description:</p>
                  <p className="text-sm bg-muted p-3 rounded-md">{selectedInteraction.description}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                data-testid="button-close-dialog"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
