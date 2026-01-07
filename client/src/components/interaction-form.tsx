import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInteractionSchema, type InsertInteraction, INTERACTION_TYPES } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface InteractionFormProps {
  customerId: string;
  onSubmit: (data: InsertInteraction) => void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultType?: typeof INTERACTION_TYPES[number];
}

export function InteractionForm({ customerId, onSubmit, onCancel, isLoading, defaultType }: InteractionFormProps) {
  const { toast } = useToast();

  const form = useForm<InsertInteraction>({
    resolver: zodResolver(insertInteractionSchema),
    defaultValues: {
      customerId,
      category: "sales",
      type: defaultType || "Call",
      description: "",
      scheduledDate: null,
      scheduledTime: null,
    },
  });

  const summarizeMutation = useMutation({
    mutationFn: async (payload: { notes: string; originalNotes: string }) => {
      const res = await apiRequest('POST', '/api/ai/summarize-note', { notes: payload.notes });
      const data = await res.json();
      return { ...data, originalNotes: payload.originalNotes } as { summary: string; originalNotes: string };
    },
    onSuccess: (data) => {
      // Capture the original notes in the closure for the undo action
      const savedOriginalNotes = data.originalNotes;
      form.setValue('description', data.summary);
      toast({
        title: "Summary Generated",
        description: "Your notes have been summarized. You can edit or undo this change.",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              form.setValue('description', savedOriginalNotes);
              toast({
                title: "Undone",
                description: "Original notes restored",
              });
            }}
          >
            Undo
          </Button>
        ),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Summarization Failed",
        description: error instanceof Error ? error.message : "Failed to generate summary",
      });
    },
  });

  const handleSummarize = () => {
    const currentDescription = form.getValues('description');
    if (!currentDescription || currentDescription.trim().length === 0) {
      toast({
        variant: "destructive",
        title: "No Content",
        description: "Please enter some notes to summarize",
      });
      return;
    }
    // Pass both the notes to summarize and the original for undo
    summarizeMutation.mutate({ notes: currentDescription, originalNotes: currentDescription });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-interaction-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-interaction-type">
                    <SelectValue placeholder="Select interaction type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {INTERACTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="scheduledDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Scheduled Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-scheduled-date"
                      >
                        {field.value ? (
                          format(new Date(field.value), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date?.toISOString() || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription className="text-xs">
                  Optional - for future meetings
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="scheduledTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    data-testid="input-scheduled-time"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Optional
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Description</FormLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSummarize}
                  disabled={summarizeMutation.isPending || isLoading}
                  className="h-auto p-1 text-xs"
                  data-testid="button-summarize-notes"
                >
                  {summarizeMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Summarizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      Summarize
                    </>
                  )}
                </Button>
              </div>
              <FormControl>
                <Textarea 
                  placeholder="Describe the interaction details..."
                  className="min-h-24 resize-none"
                  {...field} 
                  data-testid="input-interaction-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel-interaction"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            data-testid="button-submit-interaction"
          >
            {isLoading ? "Adding..." : "Add Interaction"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
