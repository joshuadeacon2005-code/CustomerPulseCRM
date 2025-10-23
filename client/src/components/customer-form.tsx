import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { insertCustomerSchema, updateCustomerSchema, RETAILER_TYPES, type Customer, type InsertCustomer, type UpdateCustomer, type User } from "@shared/schema";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: InsertCustomer | UpdateCustomer) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CustomerForm({ customer, onSubmit, onCancel, isLoading }: CustomerFormProps) {
  const isEditing = !!customer;
  
  // Fetch all users for the Assigned To dropdown
  const { data: allUsers = [] } = useQuery<Omit<User, 'password'>[]>({
    queryKey: ["/api/users"],
  });
  
  // Track lead source for conditional "Others" field
  const predefinedSources = ["Referral", "Cold Call", "BC"];
  const currentLeadSource = customer?.leadGeneratedBy || "";
  const isOtherSource = currentLeadSource !== "" && !predefinedSources.includes(currentLeadSource);
  
  const [showOtherField, setShowOtherField] = useState(isOtherSource);
  const [leadSource, setLeadSource] = useState(isOtherSource ? "Others" : currentLeadSource);
  const [otherSourceText, setOtherSourceText] = useState(isOtherSource ? currentLeadSource : "");
  
  const form = useForm<InsertCustomer | UpdateCustomer>({
    resolver: zodResolver(isEditing ? updateCustomerSchema : insertCustomerSchema),
    defaultValues: customer ? {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      stage: customer.stage as "lead" | "prospect" | "customer",
      assignedTo: customer.assignedTo || "",
      personalNotes: customer.personalNotes || "",
      registeredWithBC: customer.registeredWithBC,
      ordersViaBC: customer.ordersViaBC,
      firstOrderDate: customer.firstOrderDate ?? undefined,
      storeAddress: customer.storeAddress || "",
      retailerType: customer.retailerType ?? undefined,
      quarterlySoftTarget: customer.quarterlySoftTarget || "",
      lastContactDate: customer.lastContactDate ?? undefined,
      country: customer.country || "",
      contactName: customer.contactName || "",
      contactTitle: customer.contactTitle || "",
      contactPhone: customer.contactPhone || "",
      contactEmail: customer.contactEmail || "",
      dateOfFirstContact: customer.dateOfFirstContact ?? undefined,
      leadGeneratedBy: customer.leadGeneratedBy || "",
    } : {
      name: "",
      email: "",
      phone: "",
      stage: "lead" as "lead" | "prospect" | "customer",
      assignedTo: "",
      personalNotes: "",
      registeredWithBC: false,
      ordersViaBC: false,
      firstOrderDate: undefined,
      storeAddress: "",
      retailerType: undefined,
      quarterlySoftTarget: "",
      lastContactDate: undefined,
      country: "",
      contactName: "",
      contactTitle: "",
      contactPhone: "",
      contactEmail: "",
      dateOfFirstContact: undefined,
      leadGeneratedBy: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Main Contact Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Main Contact Information</h3>
          
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Company Name" 
                    {...field} 
                    data-testid="input-customer-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="company@example.com" 
                    {...field} 
                    data-testid="input-customer-email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Phone</FormLabel>
                <FormControl>
                  <Input 
                    type="tel" 
                    placeholder="+1 (555) 123-4567" 
                    {...field} 
                    data-testid="input-customer-phone"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., USA, Canada, UK" 
                    {...field} 
                    value={field.value || ""}
                    data-testid="input-customer-country"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Primary contact person" 
                    {...field} 
                    value={field.value || ""}
                    data-testid="input-contact-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person Title</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Owner, Manager" 
                    {...field} 
                    value={field.value || ""}
                    data-testid="input-contact-title"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person Phone</FormLabel>
                <FormControl>
                  <Input 
                    type="tel" 
                    placeholder="+1 (555) 123-4567" 
                    {...field} 
                    value={field.value || ""}
                    data-testid="input-contact-phone"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="contact@example.com" 
                    {...field} 
                    value={field.value || ""}
                    data-testid="input-contact-email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Lead Management */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Lead Management</h3>

          <FormField
            control={form.control}
            name="stage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stage</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-customer-stage">
                      <SelectValue placeholder="Select a stage" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assignedTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned To</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-customer-assigned">
                      <SelectValue placeholder="Select a salesperson" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {allUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id} data-testid={`option-assigned-${user.id}`}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateOfFirstContact"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of First Contact</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-first-contact-date"
                      >
                        {field.value ? (
                          format(field.value, "PPP")
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
                      selected={field.value ?? undefined}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  When was this lead first contacted?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="leadGeneratedBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lead Generated By</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    setLeadSource(value);
                    if (value === "Others") {
                      setShowOtherField(true);
                      // Don't set field value yet - wait for user to enter text
                    } else {
                      setShowOtherField(false);
                      setOtherSourceText("");
                      field.onChange(value);
                    }
                  }} 
                  value={showOtherField ? "Others" : (field.value && predefinedSources.includes(field.value) ? field.value : leadSource)}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-lead-source">
                      <SelectValue placeholder="Select lead source" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Cold Call">Cold Call</SelectItem>
                    <SelectItem value="BC">BC</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
                {showOtherField && (
                  <Input 
                    placeholder="Please specify..." 
                    value={otherSourceText}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setOtherSourceText(newValue);
                      field.onChange(newValue);
                    }}
                    data-testid="input-other-lead-source"
                    className="mt-2"
                  />
                )}
                <FormDescription>
                  Source or method of lead generation
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Business Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Business Information</h3>

          <FormField
            control={form.control}
            name="registeredWithBC"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Registered with BC</FormLabel>
                  <FormDescription>
                    Is this customer registered with BC?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-registered-bc"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ordersViaBC"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Orders via BC</FormLabel>
                  <FormDescription>
                    Does this customer order via BC?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-orders-bc"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="firstOrderDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>First Order Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-first-order-date"
                      >
                        {field.value ? (
                          format(field.value, "PPP")
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
                      selected={field.value ?? undefined}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="retailerType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Retailer Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-retailer-type">
                      <SelectValue placeholder="Select retailer type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RETAILER_TYPES.map((type) => (
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

          <FormField
            control={form.control}
            name="storeAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Store Address</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter store address"
                    className="resize-none"
                    {...field} 
                    value={field.value || ""}
                    data-testid="input-store-address"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Sales & Tracking */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Sales & Tracking</h3>

          <FormField
            control={form.control}
            name="quarterlySoftTarget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quarterly Soft Target</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter quarterly soft target details"
                    className="resize-none"
                    {...field} 
                    value={field.value || ""}
                    data-testid="input-quarterly-target"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastContactDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Last Contact Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-last-contact-date"
                      >
                        {field.value ? (
                          format(field.value, "PPP")
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
                      selected={field.value ?? undefined}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Can be automatically updated from visit interactions
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Notes */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>

          <FormField
            control={form.control}
            name="personalNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Personal Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Add personal notes about this customer"
                    className="resize-none min-h-[100px]"
                    {...field} 
                    value={field.value || ""}
                    data-testid="input-personal-notes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            data-testid="button-submit-customer"
          >
            {isLoading ? "Saving..." : isEditing ? "Update Customer" : "Add Customer"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
