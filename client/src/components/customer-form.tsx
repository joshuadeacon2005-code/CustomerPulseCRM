import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { insertCustomerSchema, updateCustomerSchema, RETAILER_TYPES, COUNTRIES, type Customer, type InsertCustomer, type UpdateCustomer, type User, type InsertCustomerContact } from "@shared/schema";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, AlertTriangle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

interface AdditionalContact {
  name: string;
  title: string;
  phone: string;
  email: string;
}

interface InitialAddress {
  addressType: string;
  streetNumber: string;
  streetName: string;
  unit: string;
  building: string;
  district: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  address: string;
  chineseAddress: string;
  translation: string;
}

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: InsertCustomer | UpdateCustomer, additionalContacts?: Omit<InsertCustomerContact, 'customerId'>[], initialAddress?: InitialAddress) => void;
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
  
  // Additional contacts state (only for creating new customers)
  const [additionalContacts, setAdditionalContacts] = useState<AdditionalContact[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState<AdditionalContact>({
    name: "",
    title: "",
    phone: "",
    email: "",
  });
  
  // Initial address state (only for creating new customers)
  const [initialAddress, setInitialAddress] = useState<InitialAddress>({
    addressType: "store",
    streetNumber: "",
    streetName: "",
    unit: "",
    building: "",
    district: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    country: "",
    address: "",
    chineseAddress: "",
    translation: "",
  });
  
  // Duplicate detection state
  interface DuplicateCustomer {
    id: string;
    name: string;
    email: string | null;
    country: string | null;
    stage: string;
  }
  const [duplicates, setDuplicates] = useState<DuplicateCustomer[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateCheckDismissed, setDuplicateCheckDismissed] = useState(false);
  
  // Debounced duplicate check
  const checkForDuplicates = useCallback(async (name: string, email?: string) => {
    if (!name || name.length < 3) {
      setDuplicates([]);
      return;
    }
    
    setIsCheckingDuplicates(true);
    try {
      const params = new URLSearchParams();
      if (name) params.append('name', name);
      if (email) params.append('email', email);
      if (customer?.id) params.append('excludeId', customer.id);
      
      const response = await fetch(`/api/customers/check-duplicate?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setDuplicates(data.duplicates || []);
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
    } finally {
      setIsCheckingDuplicates(false);
    }
  }, [customer?.id]);
  
  // Debounce timer ref
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  
  const form = useForm<InsertCustomer | UpdateCustomer>({
    resolver: zodResolver(isEditing ? updateCustomerSchema : insertCustomerSchema),
    defaultValues: customer ? {
      name: customer.name,
      stage: customer.stage,
      assignedTo: customer.assignedTo || "",
      personalNotes: customer.personalNotes || "",
      registeredWithBC: customer.registeredWithBC,
      ordersViaBC: customer.ordersViaBC,
      firstOrderDate: customer.firstOrderDate ?? undefined,
      storeAddress: customer.storeAddress || "",
      retailerType: customer.retailerType ?? undefined,
      quarterlySoftTarget: customer.quarterlySoftTarget || undefined,
      quarterlySoftTargetCurrency: customer.quarterlySoftTargetCurrency || "HKD",
      lastContactDate: customer.lastContactDate ?? undefined,
      country: customer.country || "",
      contactName: customer.contactName || "",
      contactTitle: customer.contactTitle || "",
      contactPhone: customer.contactPhone || "",
      contactEmail: customer.contactEmail || "",
      dateOfFirstContact: customer.dateOfFirstContact ?? undefined,
      leadGeneratedBy: customer.leadGeneratedBy || "",
      netsuiteUrl: customer.netsuiteUrl || "",
      bloomconnectUrl: customer.bloomconnectUrl || "",
    } : {
      name: "",
      stage: "lead",
      assignedTo: "",
      personalNotes: "",
      registeredWithBC: false,
      ordersViaBC: false,
      firstOrderDate: undefined,
      storeAddress: "",
      retailerType: undefined,
      quarterlySoftTarget: undefined,
      quarterlySoftTargetCurrency: "USD",
      lastContactDate: undefined,
      country: "",
      contactName: "",
      contactTitle: "",
      contactPhone: "",
      contactEmail: "",
      dateOfFirstContact: undefined,
      leadGeneratedBy: "",
      netsuiteUrl: "",
      bloomconnectUrl: "",
    },
  });

  const handleFormSubmit = (data: InsertCustomer | UpdateCustomer) => {
    // Check if any address field has data
    const hasAddressData = initialAddress.streetNumber || initialAddress.streetName || 
      initialAddress.city || initialAddress.address || initialAddress.building ||
      initialAddress.district || initialAddress.unit;
    
    // For new customers, pass additional contacts and initial address
    if (!isEditing) {
      const contactsToPass = additionalContacts.length > 0 ? additionalContacts : undefined;
      const addressToPass = hasAddressData ? initialAddress : undefined;
      onSubmit(data, contactsToPass, addressToPass);
    } else {
      onSubmit(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Company Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Company Information</h3>
          
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
                    onChange={(e) => {
                      field.onChange(e);
                      // Debounced duplicate check
                      if (debounceTimer) clearTimeout(debounceTimer);
                      const timer = setTimeout(() => {
                        if (!duplicateCheckDismissed) {
                          checkForDuplicates(e.target.value);
                        }
                      }, 500);
                      setDebounceTimer(timer);
                    }}
                    data-testid="input-customer-name"
                  />
                </FormControl>
                <FormMessage />
                {/* Duplicate warning */}
                {!isEditing && duplicates.length > 0 && !duplicateCheckDismissed && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Potential Duplicates Found</AlertTitle>
                    <AlertDescription>
                      <p className="mb-2">Similar customers already exist:</p>
                      <ul className="space-y-2 text-sm">
                        {duplicates.map((dup) => (
                          <li key={dup.id} className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md">
                            <span>
                              <strong>{dup.name}</strong>
                              {dup.country && <span className="text-muted-foreground"> ({dup.country})</span>}
                              {dup.email && <span className="text-muted-foreground"> - {dup.email}</span>}
                              <span className="ml-1 text-xs capitalize">({dup.stage})</span>
                            </span>
                            <a 
                              href={`/customers?customer=${dup.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              data-testid={`link-view-duplicate-${dup.id}`}
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => setDuplicateCheckDismissed(true)}
                          data-testid="button-dismiss-duplicate-warning"
                        >
                          Ignore & Continue
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                {isCheckingDuplicates && (
                  <p className="text-xs text-muted-foreground mt-1">Checking for duplicates...</p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                  data-testid="select-customer-country"
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Main Contact */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Main Contact</h3>
          
          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Contact person name" 
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
                <FormLabel>Title</FormLabel>
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
                <FormLabel>Phone</FormLabel>
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
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="contact@example.com" 
                    {...field} 
                    value={field.value || ""}
                    onChange={(e) => {
                      field.onChange(e);
                      // Debounced duplicate check by email
                      if (debounceTimer) clearTimeout(debounceTimer);
                      const email = e.target.value;
                      if (email && email.includes('@') && !duplicateCheckDismissed) {
                        const timer = setTimeout(() => {
                          const currentName = form.getValues('name');
                          checkForDuplicates(currentName || '', email);
                        }, 500);
                        setDebounceTimer(timer);
                      }
                    }}
                    data-testid="input-contact-email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Additional Contacts - only show when creating new customer */}
        {!isEditing && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Additional Contacts</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingContact(true)}
                  data-testid="button-show-add-contact"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </div>

              {isAddingContact && (
                <div className="border rounded-lg p-4 space-y-3">
                  <Input
                    placeholder="Contact Name"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    data-testid="input-new-contact-name"
                  />
                  <Input
                    placeholder="Title (optional)"
                    value={newContact.title}
                    onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                    data-testid="input-new-contact-title"
                  />
                  <Input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    data-testid="input-new-contact-phone"
                  />
                  <Input
                    type="email"
                    placeholder="Email (optional)"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    data-testid="input-new-contact-email"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (newContact.name.trim()) {
                          setAdditionalContacts([...additionalContacts, newContact]);
                          setNewContact({ name: "", title: "", phone: "", email: "" });
                          setIsAddingContact(false);
                        }
                      }}
                      data-testid="button-save-new-contact"
                    >
                      Add Contact
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewContact({ name: "", title: "", phone: "", email: "" });
                        setIsAddingContact(false);
                      }}
                      data-testid="button-cancel-new-contact"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {additionalContacts.length > 0 && (
                <div className="space-y-2">
                  {additionalContacts.map((contact, index) => (
                    <div key={index} className="flex items-center justify-between border rounded-lg p-3" data-testid={`contact-item-${index}`}>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{contact.name}</p>
                        {contact.title && <p className="text-xs text-muted-foreground">{contact.title}</p>}
                        <div className="flex gap-3 mt-1">
                          {contact.phone && <p className="text-xs text-muted-foreground">{contact.phone}</p>}
                          {contact.email && <p className="text-xs text-muted-foreground">{contact.email}</p>}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAdditionalContacts(additionalContacts.filter((_, i) => i !== index));
                        }}
                        data-testid={`button-delete-contact-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />
          </>
        )}

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
                    <SelectItem value="dormant">Dormant</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
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
                    {[...allUsers].sort((a, b) => a.name.localeCompare(b.name)).map((user) => (
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
                  <FormLabel className="text-base">Registered with Bloom Connect</FormLabel>
                  <FormDescription>
                    Is this customer registered with Bloom Connect?
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
                  <FormLabel className="text-base">Orders via Bloom Connect</FormLabel>
                  <FormDescription>
                    Does this customer order via Bloom Connect?
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

          {/* Structured Address Fields - Only for new customers */}
          {!isEditing && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Store Address</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormLabel htmlFor="address-type">Address Type</FormLabel>
                  <Select
                    value={initialAddress.addressType}
                    onValueChange={(value) => setInitialAddress(prev => ({ ...prev, addressType: value }))}
                  >
                    <SelectTrigger data-testid="select-address-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="store">Store</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="shipping">Shipping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FormLabel htmlFor="address-country">Country</FormLabel>
                  <Select
                    value={initialAddress.country}
                    onValueChange={(value) => setInitialAddress(prev => ({ ...prev, country: value }))}
                  >
                    <SelectTrigger data-testid="select-address-country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormLabel htmlFor="street-number">Street Number</FormLabel>
                  <Input
                    id="street-number"
                    placeholder="123"
                    value={initialAddress.streetNumber}
                    onChange={(e) => setInitialAddress(prev => ({ ...prev, streetNumber: e.target.value }))}
                    data-testid="input-street-number"
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel htmlFor="street-name">Street Name</FormLabel>
                  <Input
                    id="street-name"
                    placeholder="Main Street"
                    value={initialAddress.streetName}
                    onChange={(e) => setInitialAddress(prev => ({ ...prev, streetName: e.target.value }))}
                    data-testid="input-street-name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormLabel htmlFor="unit">Unit/Suite</FormLabel>
                  <Input
                    id="unit"
                    placeholder="Unit 5B"
                    value={initialAddress.unit}
                    onChange={(e) => setInitialAddress(prev => ({ ...prev, unit: e.target.value }))}
                    data-testid="input-unit"
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel htmlFor="building">Building</FormLabel>
                  <Input
                    id="building"
                    placeholder="Building name"
                    value={initialAddress.building}
                    onChange={(e) => setInitialAddress(prev => ({ ...prev, building: e.target.value }))}
                    data-testid="input-building"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel htmlFor="district">District</FormLabel>
                <Input
                  id="district"
                  placeholder="District/Area"
                  value={initialAddress.district}
                  onChange={(e) => setInitialAddress(prev => ({ ...prev, district: e.target.value }))}
                  data-testid="input-district"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormLabel htmlFor="city">City</FormLabel>
                  <Input
                    id="city"
                    placeholder="City"
                    value={initialAddress.city}
                    onChange={(e) => setInitialAddress(prev => ({ ...prev, city: e.target.value }))}
                    data-testid="input-city"
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel htmlFor="state-province">State/Province</FormLabel>
                  <Input
                    id="state-province"
                    placeholder="State or Province"
                    value={initialAddress.stateProvince}
                    onChange={(e) => setInitialAddress(prev => ({ ...prev, stateProvince: e.target.value }))}
                    data-testid="input-state-province"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel htmlFor="postal-code">Postal Code</FormLabel>
                <Input
                  id="postal-code"
                  placeholder="Postal/ZIP code"
                  value={initialAddress.postalCode}
                  onChange={(e) => setInitialAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                  data-testid="input-postal-code"
                />
              </div>

              <div className="space-y-2">
                <FormLabel htmlFor="full-address">Full Address (Legacy)</FormLabel>
                <Textarea 
                  id="full-address"
                  placeholder="Enter full address if not using structured fields above"
                  className="resize-none"
                  value={initialAddress.address}
                  onChange={(e) => setInitialAddress(prev => ({ ...prev, address: e.target.value }))}
                  data-testid="input-full-address"
                />
                <FormDescription>Optional: Use this for complex addresses that don't fit the structured fields above</FormDescription>
              </div>

              <div className="space-y-2">
                <FormLabel htmlFor="chinese-address">Chinese Address</FormLabel>
                <Textarea 
                  id="chinese-address"
                  placeholder="中文地址"
                  className="resize-none"
                  value={initialAddress.chineseAddress}
                  onChange={(e) => setInitialAddress(prev => ({ ...prev, chineseAddress: e.target.value }))}
                  data-testid="input-chinese-address"
                />
              </div>

              <div className="space-y-2">
                <FormLabel htmlFor="translation">Translation Notes</FormLabel>
                <Input
                  id="translation"
                  placeholder="Translation or additional notes"
                  value={initialAddress.translation}
                  onChange={(e) => setInitialAddress(prev => ({ ...prev, translation: e.target.value }))}
                  data-testid="input-translation"
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Sales & Tracking */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Sales & Tracking</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="quarterlySoftTarget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quarterly Soft Target</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field} 
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      data-testid="input-quarterly-target"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quarterlySoftTargetCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || "HKD"}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-quarterly-target-currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["USD", "HKD", "SGD", "CNY", "AUD", "IDR", "MYR"].map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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

        {/* External Systems */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">External Systems</h3>

          <FormField
            control={form.control}
            name="netsuiteUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NetSuite URL</FormLabel>
                <FormControl>
                  <Input 
                    type="url"
                    placeholder="https://example.netsuite.com/..."
                    {...field} 
                    value={field.value || ""}
                    data-testid="input-netsuite-url"
                  />
                </FormControl>
                <FormDescription>
                  Direct link to this customer in NetSuite
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bloomconnectUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>BloomConnect URL</FormLabel>
                <FormControl>
                  <Input 
                    type="url"
                    placeholder="https://bloomconnect.com/..."
                    {...field} 
                    value={field.value || ""}
                    data-testid="input-bloomconnect-url"
                  />
                </FormControl>
                <FormDescription>
                  Direct link to this customer in BloomConnect
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
