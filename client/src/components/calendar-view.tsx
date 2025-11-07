import { useMemo } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, parseISO, startOfDay, isToday, isPast } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/calendar.css";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  );
}
