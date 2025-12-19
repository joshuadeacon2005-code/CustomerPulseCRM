import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CustomerWithDetails, 
  UpdateCustomer, 
  InsertInteraction,
  Brand,
  InsertBrand,
  insertBrandSchema,
  InsertActionItem,
  insertActionItemSchema,
  InsertMonthlySalesTracking,
  insertMonthlySalesTrackingSchema,
  updateMonthlySalesTrackingSchema,
  CustomerAddress,
  InsertCustomerAddress,
  insertCustomerAddressSchema,
  COUNTRIES,
} from "@shared/schema";
import { 
  Mail, 
  Phone, 
  User, 
  TrendingUp, 
  Edit, 
  Plus, 
  MessageSquare, 
  Phone as PhoneIcon, 
  Mail as MailIcon,
  X,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar as CalendarIcon,
  Store,
  MapPin,
  Target,
  Tag,
  DollarSign,
  Trash2,
  Sparkles,
  Loader2,
  ExternalLink,
  Building,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format, isToday, isPast, parseISO } from "date-fns";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CustomerForm } from "./customer-form";
import { InteractionForm } from "./interaction-form";
import { CustomerTargets } from "./customer-targets";
import { AIInsightsPanel } from "./ai-insights-panel";
import { ChurnRiskIndicator } from "./churn-risk-indicator";

// Helper function to format structured address
function formatStructuredAddress(address: CustomerAddress): string {
  const parts: string[] = [];
  
  // Street address
  if (address.streetNumber || address.streetName) {
    const street = [address.streetNumber, address.streetName].filter(Boolean).join(' ');
    if (street) parts.push(street);
  }
  
  // Unit/Building
  if (address.unit || address.building) {
    const unitBuilding = [address.unit, address.building].filter(Boolean).join(', ');
    if (unitBuilding) parts.push(unitBuilding);
  }
  
  // District
  if (address.district) parts.push(address.district);
  
  // City, State/Province
  if (address.city || address.stateProvince) {
    const cityState = [address.city, address.stateProvince].filter(Boolean).join(', ');
    if (cityState) parts.push(cityState);
  }
  
  // Postal Code
  if (address.postalCode) parts.push(address.postalCode);
  
  // Country
  if (address.country) parts.push(address.country);
  
  return parts.length > 0 ? parts.join('\n') : '';
}
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface CustomerDetailModalProps {
  customer: CustomerWithDetails | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (data: UpdateCustomer) => void;
  onAddInteraction: (data: InsertInteraction) => void;
  isUpdating?: boolean;
  isAddingInteraction?: boolean;
}

const stageColors = {
  lead: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  prospect: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  customer: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
};

const categoryIcons = {
  marketing: MailIcon,
  sales: PhoneIcon,
  support: MessageSquare,
};

const getInitials = (name: string) => {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function CustomerDetailModal({
  customer,
  open,
  onClose,
  onUpdate,
  onAddInteraction,
  isUpdating,
  isAddingInteraction,
}: CustomerDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingNewInteraction, setIsAddingNewInteraction] = useState(false);
  const [quickInteractionType, setQuickInteractionType] = useState<string | null>(null);
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [isAddingActionItem, setIsAddingActionItem] = useState(false);
  const [isAddingSales, setIsAddingSales] = useState(false);
  const setIsAddingSale = setIsAddingSales; // Alias for quick actions
  const [editingSalesId, setEditingSalesId] = useState<string | null>(null);
  const [isAddingAdditionalContact, setIsAddingAdditionalContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [isAIInsightsOpen, setIsAIInsightsOpen] = useState(false);
  const { toast } = useToast();

  const { data: allBrands } = useQuery<Brand[]>({
    queryKey: ['/api/brands'],
    enabled: open && !!customer,
  });

  const removeBrandMutation = useMutation({
    mutationFn: async ({ customerId, brandId }: { customerId: string; brandId: string }) => {
      await apiRequest('DELETE', `/api/customers/${customerId}/brands/${brandId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customer?.id] });
      toast({ title: "Brand removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove brand", variant: "destructive" });
    },
  });

  const addBrandMutation = useMutation({
    mutationFn: async ({ customerId, brandId }: { customerId: string; brandId: string }) => {
      return await apiRequest('POST', `/api/customers/${customerId}/brands`, { brandId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customer?.id] });
      toast({ title: "Brand assigned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to assign brand", variant: "destructive" });
    },
  });

  const createBrandMutation = useMutation({
    mutationFn: async (data: InsertBrand) => {
      return await apiRequest('POST', '/api/brands', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customer?.id] });
      setIsCreatingBrand(false);
      toast({ title: "Brand created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create brand", variant: "destructive" });
    },
  });

  const completeActionItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('PATCH', `/api/action-items/${id}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customer?.id] });
      toast({ title: "Action item completed" });
    },
    onError: () => {
      toast({ title: "Failed to complete action item", variant: "destructive" });
    },
  });

  const createActionItemMutation = useMutation({
    mutationFn: async (data: InsertActionItem) => {
      const payload = {
        ...data,
        dueDate: data.dueDate ? (data.dueDate as any).toISOString?.() || data.dueDate : undefined,
        visitDate: data.visitDate ? (data.visitDate as any).toISOString?.() || data.visitDate : undefined,
      };
      return await apiRequest('POST', '/api/action-items', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customer?.id] });
      setIsAddingActionItem(false);
      toast({ title: "Action item created" });
    },
    onError: () => {
      toast({ title: "Failed to create action item", variant: "destructive" });
    },
  });

  const createMonthlySalesMutation = useMutation({
    mutationFn: async (data: InsertMonthlySalesTracking) => {
      return await apiRequest('POST', '/api/monthly-sales', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customer?.id] });
      setIsAddingSales(false);
      toast({ title: "Sales record created" });
    },
    onError: () => {
      toast({ title: "Failed to create sales record", variant: "destructive" });
    },
  });

  const updateMonthlySalesMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PATCH', `/api/monthly-sales/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customer?.id] });
      setEditingSalesId(null);
      toast({ title: "Sales record updated" });
    },
    onError: () => {
      toast({ title: "Failed to update sales record", variant: "destructive" });
    },
  });

  const deleteMonthlySalesMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/monthly-sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customer?.id] });
      toast({ title: "Sales record deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete sales record", variant: "destructive" });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      onClose();
      toast({ 
        title: "Customer deleted",
        description: "The customer has been successfully deleted." 
      });
    },
    onError: () => {
      toast({ 
        title: "Failed to delete customer", 
        description: "Please try again.",
        variant: "destructive" 
      });
    },
  });

  const deleteAdditionalContactMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/customer-contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customer?.id] });
      toast({ 
        title: "Contact deleted",
        description: "The additional contact has been removed." 
      });
    },
    onError: () => {
      toast({ 
        title: "Failed to delete contact", 
        description: "Please try again.",
        variant: "destructive" 
      });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/customer-addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customer?.id] });
      toast({ 
        title: "Address deleted",
        description: "The address has been removed." 
      });
    },
    onError: () => {
      toast({ 
        title: "Failed to delete address", 
        description: "Please try again.",
        variant: "destructive" 
      });
    },
  });

  if (!customer) return null;

  const handleUpdate = (data: any, _additionalContacts?: any, _initialAddress?: any) => {
    onUpdate(data as UpdateCustomer);
    setIsEditing(false);
  };

  const handleAddInteraction = (data: InsertInteraction) => {
    onAddInteraction(data);
    setIsAddingNewInteraction(false);
  };

  const getActionItemStatus = (item: any) => {
    if (item.completedAt) return 'completed';
    if (!item.dueDate) return 'upcoming';
    const dueDate = new Date(item.dueDate);
    if (isPast(dueDate) && !isToday(dueDate)) return 'overdue';
    if (isToday(dueDate)) return 'today';
    return 'upcoming';
  };

  const availableBrands = allBrands?.filter(
    b => !customer.brands?.some(cb => cb.id === b.id)
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="modal-customer-detail">
        <DialogHeader className="pr-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                  {getInitials(customer.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <DialogTitle className="text-2xl mb-2" data-testid="text-modal-customer-name">
                  {customer.name}
                </DialogTitle>
                
                {/* External System Links */}
                {(customer.netsuiteUrl || customer.bloomconnectUrl) && (
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {customer.netsuiteUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(customer.netsuiteUrl!, '_blank', 'noopener,noreferrer')}
                        data-testid="button-netsuite-link"
                        className="gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        NetSuite
                      </Button>
                    )}
                    {customer.bloomconnectUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(customer.bloomconnectUrl!, '_blank', 'noopener,noreferrer')}
                        data-testid="button-bloomconnect-link"
                        className="gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        BloomConnect
                      </Button>
                    )}
                  </div>
                )}
                
                <div className="flex flex-wrap items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`${stageColors[customer.stage as keyof typeof stageColors]} uppercase`}
                  >
                    {customer.stage}
                  </Badge>
                </div>
              </div>
            </div>
            {!isEditing && (
              <div className="flex gap-3 flex-shrink-0">
                {/* Quick Actions Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="default" 
                      size="sm"
                      data-testid="button-quick-actions"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Quick Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onClick={() => {
                        setIsAddingNewInteraction(true);
                        setQuickInteractionType("Call");
                      }}
                      data-testid="quick-action-log-call"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Log Call
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setIsAddingNewInteraction(true);
                        setQuickInteractionType("Store Visit");
                      }}
                      data-testid="quick-action-log-visit"
                    >
                      <Building className="h-4 w-4 mr-2" />
                      Log Visit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setIsAddingNewInteraction(true);
                        setQuickInteractionType("Email");
                      }}
                      data-testid="quick-action-log-email"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Log Email
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setIsAddingSale(true)}
                      data-testid="quick-action-log-sale"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Log Sale
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setIsAddingActionItem(true)}
                      data-testid="quick-action-add-task"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Add Task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAIInsightsOpen(true)}
                  data-testid="button-ai-insights"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Insights
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  data-testid="button-edit-customer"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      data-testid="button-delete-customer"
                      disabled={deleteCustomerMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deleteCustomerMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this customer? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        data-testid="button-confirm-delete"
                        onClick={() => deleteCustomerMutation.mutate(customer.id)}
                        className="bg-destructive text-destructive-foreground hover-elevate"
                      >
                        Delete Customer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="actions" data-testid="tab-actions">
              Actions ({customer.actionItems?.filter(a => !a.completedAt).length || 0})
            </TabsTrigger>
            <TabsTrigger value="interactions" data-testid="tab-interactions">
              Interactions ({customer.interactions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="sales" data-testid="tab-sales">
              Sales Tracking
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {isEditing ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Edit Customer</CardTitle>
                </CardHeader>
                <CardContent>
                  <CustomerForm
                    customer={customer}
                    onSubmit={handleUpdate}
                    onCancel={() => setIsEditing(false)}
                    isLoading={isUpdating}
                  />
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Company & Main Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Company Name</p>
                      <p className="text-sm font-medium" data-testid="text-company-name">{customer.name}</p>
                    </div>
                    {customer.country && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Country</p>
                        <p className="text-sm" data-testid="text-customer-country">{customer.country}</p>
                      </div>
                    )}
                    {(customer.contactName || customer.contactEmail || customer.contactPhone) && (
                      <>
                        <div className="border-t pt-3">
                          <p className="text-xs text-muted-foreground mb-2">Main Contact</p>
                          {customer.contactName && (
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm" data-testid="text-contact-name">
                                {customer.contactName}
                                {customer.contactTitle && <span className="text-muted-foreground"> - {customer.contactTitle}</span>}
                              </span>
                            </div>
                          )}
                          {customer.contactEmail && (
                            <div className="flex items-center gap-2 mb-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm" data-testid="text-contact-email">{customer.contactEmail}</span>
                            </div>
                          )}
                          {customer.contactPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm" data-testid="text-contact-phone">{customer.contactPhone}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {customer.assignedTo && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm" data-testid="text-customer-assigned">
                          Assigned to: {(customer as any).assignedToName || customer.assignedTo}
                        </span>
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground pt-2 border-t">
                      Customer since {format(new Date(customer.createdAt), "MMMM d, yyyy")}
                    </div>
                    
                    {/* Churn Risk Indicator */}
                    <div className="pt-3 border-t">
                      <ChurnRiskIndicator customerId={customer.id} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-lg">Additional Contacts</CardTitle>
                    <Button 
                      size="sm" 
                      onClick={() => setIsAddingAdditionalContact(true)}
                      data-testid="button-add-additional-contact"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Contact
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {isAddingAdditionalContact && (
                      <div className="mb-4 p-4 border rounded-md">
                        <AdditionalContactForm
                          customerId={customer.id}
                          onSuccess={() => {
                            setIsAddingAdditionalContact(false);
                            queryClient.invalidateQueries({ queryKey: ['/api/customers', customer.id] });
                          }}
                          onCancel={() => setIsAddingAdditionalContact(false)}
                        />
                      </div>
                    )}
                    {customer.additionalContacts && customer.additionalContacts.length > 0 ? (
                      <div className="space-y-3">
                        {customer.additionalContacts.map((contact: any) => (
                          <div key={contact.id}>
                            {editingContactId === contact.id ? (
                              <div className="p-4 border rounded-md">
                                <AdditionalContactForm
                                  customerId={customer.id}
                                  contactId={contact.id}
                                  initialData={contact}
                                  onSuccess={() => {
                                    setEditingContactId(null);
                                    queryClient.invalidateQueries({ queryKey: ['/api/customers', customer.id] });
                                  }}
                                  onCancel={() => setEditingContactId(null)}
                                />
                              </div>
                            ) : (
                              <div className="flex items-start justify-between p-3 border rounded-md hover-elevate">
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">
                                      {contact.name}
                                      {contact.title && <span className="text-muted-foreground font-normal"> - {contact.title}</span>}
                                    </span>
                                  </div>
                                  {contact.email && (
                                    <div className="flex items-center gap-2 ml-6">
                                      <Mail className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">{contact.email}</span>
                                    </div>
                                  )}
                                  {contact.phone && (
                                    <div className="flex items-center gap-2 ml-6">
                                      <Phone className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">{contact.phone}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingContactId(contact.id)}
                                    data-testid={`button-edit-contact-${contact.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteAdditionalContactMutation.mutate(contact.id)}
                                    data-testid={`button-delete-contact-${contact.id}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      !isAddingAdditionalContact && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No additional contacts. Click "Add Contact" to add one.
                        </p>
                      )
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-lg">Business Information</CardTitle>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingAddress(null);
                        setIsAddingAddress(true);
                      }}
                      data-testid="button-add-address"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Address
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Bloom Connect Registered:</span>
                        <span data-testid="text-bc-registered">
                          {customer.registeredWithBC ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground" />
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Orders via Bloom Connect:</span>
                        <span data-testid="text-orders-bc">
                          {customer.ordersViaBC ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground" />
                          )}
                        </span>
                      </div>
                    </div>
                    {customer.retailerType && (
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm" data-testid="text-retailer-type">Retailer Type: {customer.retailerType}</span>
                      </div>
                    )}
                    {customer.storeAddress && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-sm" data-testid="text-store-address">{customer.storeAddress}</span>
                      </div>
                    )}
                    {customer.firstOrderDate && (
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm" data-testid="text-first-order">
                          First Order: {format(new Date(customer.firstOrderDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                    {customer.lastContactDate && (
                      <div className="flex items-center gap-2">
                        <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm" data-testid="text-last-contact">
                          Last Contact: {format(new Date(customer.lastContactDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                    
                    {customer.addresses && customer.addresses.length > 0 && (
                      <div className="border-t pt-4 space-y-3">
                        <p className="text-sm font-medium mb-2">Addresses ({customer.addresses.length})</p>
                        {customer.addresses.map((address) => (
                          <div key={address.id} className="p-3 border rounded-md space-y-2 hover-elevate">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="capitalize text-xs">
                                    {address.addressType}
                                  </Badge>
                                </div>
                                <div className="space-y-1">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Address</p>
                                    <p className="text-sm whitespace-pre-line">
                                      {formatStructuredAddress(address) || address.address || 'No address details'}
                                    </p>
                                  </div>
                                  {address.chineseAddress && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">Chinese Address</p>
                                      <p className="text-sm">{address.chineseAddress}</p>
                                    </div>
                                  )}
                                  {address.translation && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">Translation Notes</p>
                                      <p className="text-sm text-muted-foreground italic">{address.translation}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 ml-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingAddress(address);
                                    setIsAddingAddress(true);
                                  }}
                                  data-testid={`button-edit-address-${address.id}`}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => deleteAddressMutation.mutate(address.id)}
                                  disabled={deleteAddressMutation.isPending}
                                  data-testid={`button-delete-address-${address.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Brands Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Assigned Brands</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsCreatingBrand(true)}
                          data-testid="button-create-brand"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create New Brand
                        </Button>
                        {availableBrands.length > 0 && (
                          <Button
                            size="sm"
                            onClick={() => setIsAddingBrand(true)}
                            data-testid="button-add-brand"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Assign Brand
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {customer.brands && customer.brands.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {customer.brands.map((brand) => (
                          <Badge
                            key={brand.id}
                            variant="outline"
                            className="pl-3 pr-1 py-1.5 text-sm flex items-center gap-2"
                            data-testid={`badge-brand-${brand.id}`}
                          >
                            <Tag className="h-3 w-3" />
                            <span>{brand.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => removeBrandMutation.mutate({ customerId: customer.id, brandId: brand.id })}
                              data-testid={`button-remove-brand-${brand.id}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-8 text-muted-foreground">
                        <Tag className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                        <p>No brands assigned yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {customer.quarterlySoftTarget && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quarterly Target</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="text-sm" data-testid="text-quarterly-target">{customer.quarterlySoftTarget}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {customer.personalNotes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Personal Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground" data-testid="text-personal-notes">{customer.personalNotes}</p>
                    </CardContent>
                  </Card>
                )}

                <CustomerTargets customerId={customer.id} />
              </>
            )}
          </TabsContent>

          {/* Action Items Tab */}
          <TabsContent value="actions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Action Items</h3>
              {!isAddingActionItem && (
                <Button
                  size="sm"
                  onClick={() => setIsAddingActionItem(true)}
                  data-testid="button-add-action-item"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action Item
                </Button>
              )}
            </div>

            {isAddingActionItem && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">New Action Item</CardTitle>
                </CardHeader>
                <CardContent>
                  <ActionItemForm
                    customerId={customer.id}
                    onSubmit={(data) => createActionItemMutation.mutate(data)}
                    onCancel={() => setIsAddingActionItem(false)}
                    isLoading={createActionItemMutation.isPending}
                  />
                </CardContent>
              </Card>
            )}

            {customer.actionItems && customer.actionItems.length > 0 ? (
              <div className="space-y-2">
                {customer.actionItems.map((item) => {
                  const status = getActionItemStatus(item);
                  return (
                    <Card
                      key={item.id}
                      className={cn(
                        status === 'overdue' && 'border-red-500/50',
                        status === 'today' && 'border-orange-500/50',
                        status === 'completed' && 'opacity-60'
                      )}
                      data-testid={`card-action-item-${item.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                              {status === 'overdue' && <AlertCircle className="h-4 w-4 text-red-600" />}
                              {status === 'today' && <Clock className="h-4 w-4 text-orange-600" />}
                              {status === 'upcoming' && <Clock className="h-4 w-4 text-muted-foreground" />}
                              <span className={cn("text-sm font-medium", status === 'completed' && "line-through")}>
                                {item.description}
                              </span>
                            </div>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              {item.dueDate && (
                                <span>Due: {format(new Date(item.dueDate), "MMM d, yyyy")}</span>
                              )}
                              {item.visitDate && (
                                <span>Visit: {format(new Date(item.visitDate), "MMM d, yyyy")}</span>
                              )}
                            </div>
                          </div>
                          {!item.completedAt && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => completeActionItemMutation.mutate(item.id)}
                              data-testid={`button-complete-action-${item.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No action items yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sales Tracking Tab */}
          <TabsContent value="sales" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Monthly Sales Tracking</h3>
              {!isAddingSales && (
                <Button
                  size="sm"
                  onClick={() => setIsAddingSales(true)}
                  data-testid="button-add-sales"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sales Record
                </Button>
              )}
            </div>

            {isAddingSales && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">New Sales Record</CardTitle>
                </CardHeader>
                <CardContent>
                  <MonthlySalesForm
                    customerId={customer.id}
                    onSubmit={(data) => createMonthlySalesMutation.mutate(data)}
                    onCancel={() => setIsAddingSales(false)}
                    isLoading={createMonthlySalesMutation.isPending}
                  />
                </CardContent>
              </Card>
            )}

            {customer.monthlySales && customer.monthlySales.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead className="text-right">Budget</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customer.monthlySales.map((record) => {
                        const budget = parseFloat(record.budget);
                        const actual = record.actual ? parseFloat(record.actual) : 0;
                        const variance = actual - budget;
                        const percentage = budget > 0 ? ((actual / budget) * 100).toFixed(1) : '0.0';
                        const isEditing = editingSalesId === record.id;
                        
                        return (
                          <TableRow key={record.id} data-testid={`row-sales-${record.id}`}>
                            <TableCell>{monthNames[record.month - 1]}</TableCell>
                            <TableCell>{record.year}</TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  defaultValue={budget}
                                  className="w-24"
                                  onBlur={(e) => {
                                    const value = e.target.value;
                                    if (value !== budget.toString()) {
                                      updateMonthlySalesMutation.mutate({
                                        id: record.id,
                                        data: { budget: value, budgetCurrency: record.budgetCurrency || 'USD' }
                                      });
                                    }
                                  }}
                                  data-testid={`input-budget-${record.id}`}
                                />
                              ) : (
                                <span>${budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  defaultValue={actual}
                                  className="w-24"
                                  onBlur={(e) => {
                                    const value = e.target.value;
                                    if (value !== actual.toString()) {
                                      updateMonthlySalesMutation.mutate({
                                        id: record.id,
                                        data: { actual: value, actualCurrency: record.actualCurrency || 'USD' }
                                      });
                                    }
                                  }}
                                  data-testid={`input-actual-${record.id}`}
                                />
                              ) : (
                                <span>${actual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              )}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-medium",
                              variance > 0 ? "text-green-600" : variance < 0 ? "text-red-600" : ""
                            )}>
                              {variance > 0 ? '+' : ''}{variance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">{percentage}%</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setEditingSalesId(isEditing ? null : record.id)}
                                  data-testid={`button-edit-sales-${record.id}`}
                                >
                                  {isEditing ? <Check className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive"
                                      data-testid={`button-delete-sales-${record.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Sales Record</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete the sales record for {monthNames[record.month - 1]} {record.year}? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteMonthlySalesMutation.mutate(record.id)}
                                        className="bg-destructive text-destructive-foreground hover-elevate"
                                        data-testid={`button-confirm-delete-sales-${record.id}`}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No sales records yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Interactions Tab */}
          <TabsContent value="interactions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Interaction History</h3>
              {!isAddingNewInteraction && (
                <Button 
                  size="sm"
                  onClick={() => setIsAddingNewInteraction(true)}
                  data-testid="button-add-interaction"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Interaction
                </Button>
              )}
            </div>

            {isAddingNewInteraction && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">New Interaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <InteractionForm
                    customerId={customer.id}
                    onSubmit={(data) => {
                      handleAddInteraction(data);
                      setQuickInteractionType(null);
                    }}
                    onCancel={() => {
                      setIsAddingNewInteraction(false);
                      setQuickInteractionType(null);
                    }}
                    isLoading={isAddingInteraction}
                    defaultType={quickInteractionType as any}
                  />
                </CardContent>
              </Card>
            )}

            {customer.interactions && customer.interactions.length > 0 ? (
              <div className="space-y-3">
                {customer.interactions.map((interaction) => {
                  const Icon = categoryIcons[interaction.category as keyof typeof categoryIcons];
                  return (
                    <Card key={interaction.id} data-testid={`card-interaction-${interaction.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-md bg-muted shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div>
                                <h4 className="font-medium text-sm">{interaction.type}</h4>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {interaction.category}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground font-mono shrink-0">
                                {format(new Date(interaction.date), "MMM d, h:mm a")}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              {interaction.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No interactions recorded yet</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => setIsAddingNewInteraction(true)}
                    data-testid="button-add-first-interaction"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Interaction
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Add/Edit Address Dialog */}
        <Dialog open={isAddingAddress} onOpenChange={setIsAddingAddress}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="modal-add-address">
            <DialogHeader className="pr-10">
              <DialogTitle>
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </DialogTitle>
            </DialogHeader>
            <AddressForm
              customerId={customer.id}
              address={editingAddress || undefined}
              isEditing={!!editingAddress}
              onSuccess={() => {
                setIsAddingAddress(false);
                setEditingAddress(null);
              }}
              onCancel={() => {
                setIsAddingAddress(false);
                setEditingAddress(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* AI Insights Dialog */}
        <Dialog open={isAIInsightsOpen} onOpenChange={setIsAIInsightsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="modal-ai-insights">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Insights - {customer.name}
              </DialogTitle>
            </DialogHeader>
            <AIInsightsPanel customerId={customer.id} />
          </DialogContent>
        </Dialog>

        {/* Create Brand Dialog */}
        <Dialog open={isCreatingBrand} onOpenChange={setIsCreatingBrand}>
          <DialogContent data-testid="modal-create-brand">
            <DialogHeader>
              <DialogTitle>Create New Brand</DialogTitle>
            </DialogHeader>
            <NewBrandForm
              onSubmit={(data) => createBrandMutation.mutate(data)}
              onCancel={() => setIsCreatingBrand(false)}
              isLoading={createBrandMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Assign Brands Dialog */}
        <Dialog open={isAddingBrand} onOpenChange={setIsAddingBrand}>
          <DialogContent data-testid="modal-assign-brands">
            <DialogHeader>
              <DialogTitle>Assign Brands</DialogTitle>
              <CardDescription>Select one or more brands that this retailer carries</CardDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="max-h-80 overflow-y-auto space-y-3 border rounded-md p-4">
                {availableBrands.map((brand) => (
                  <div
                    key={brand.id}
                    className="flex items-center space-x-3 hover-elevate p-2 rounded-md"
                  >
                    <Checkbox
                      id={`brand-${brand.id}`}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          addBrandMutation.mutate({ customerId: customer.id, brandId: brand.id });
                        }
                      }}
                      data-testid={`checkbox-brand-${brand.id}`}
                    />
                    <Label
                      htmlFor={`brand-${brand.id}`}
                      className="flex-1 cursor-pointer text-sm font-normal"
                    >
                      {brand.name}
                    </Label>
                  </div>
                ))}
                {availableBrands.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All brands have been assigned
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsAddingBrand(false)}
                  data-testid="button-cancel-brand"
                >
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function NewBrandForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (data: InsertBrand) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const form = useForm<InsertBrand>({
    resolver: zodResolver(insertBrandSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter brand name"
                  {...field}
                  data-testid="input-brand-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter brand description"
                  {...field}
                  value={field.value || ''}
                  data-testid="input-brand-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel-brand-form"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} data-testid="button-submit-brand">
            {isLoading ? 'Creating...' : 'Create Brand'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

const actionItemFormSchema = insertActionItemSchema.omit({
  createdBy: true,
});

function ActionItemForm({
  customerId,
  onSubmit,
  onCancel,
  isLoading,
}: {
  customerId: string;
  onSubmit: (data: InsertActionItem) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const form = useForm({
    resolver: zodResolver(actionItemFormSchema),
    defaultValues: {
      customerId,
      description: '',
      dueDate: undefined,
      visitDate: undefined,
    },
  });

  const handleFormSubmit = (data: typeof actionItemFormSchema._output) => {
    // createdBy will be set by the parent component/API
    onSubmit(data as InsertActionItem);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the action item..."
                  {...field}
                  data-testid="input-action-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Due Date (Optional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-due-date"
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ?? undefined}
                      onSelect={field.onChange}
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
            name="visitDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Visit Date (Optional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-visit-date"
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ?? undefined}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel-action-item"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} data-testid="button-submit-action-item">
            {isLoading ? 'Creating...' : 'Create Action Item'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function MonthlySalesForm({
  customerId,
  onSubmit,
  onCancel,
  isLoading,
}: {
  customerId: string;
  onSubmit: (data: InsertMonthlySalesTracking) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const form = useForm<InsertMonthlySalesTracking>({
    resolver: zodResolver(insertMonthlySalesTrackingSchema),
    defaultValues: {
      customerId,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      budget: '',
      actual: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="month"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Month</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-month">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {monthNames.map((month, idx) => (
                      <SelectItem key={idx} value={(idx + 1).toString()}>
                        {month}
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
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    data-testid="input-year"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    data-testid="input-budget"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="actual"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Actual (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value || ''}
                    data-testid="input-actual"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel-sales"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} data-testid="button-submit-sales">
            {isLoading ? 'Creating...' : 'Create Sales Record'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function AdditionalContactForm({
  customerId,
  contactId,
  initialData,
  onSuccess,
  onCancel,
}: {
  customerId: string;
  contactId?: string;
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const isEditing = !!contactId;
  
  const form = useForm({
    defaultValues: {
      name: initialData?.name || '',
      title: initialData?.title || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
    },
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', `/api/customers/${customerId}/contacts`, data);
    },
    onSuccess: () => {
      toast({ title: "Contact added successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to add contact", variant: "destructive" });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PATCH', `/api/customer-contacts/${contactId}`, data);
    },
    onSuccess: () => {
      toast({ title: "Contact updated successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to update contact", variant: "destructive" });
    },
  });

  const handleSubmit = (data: any) => {
    if (isEditing) {
      updateContactMutation.mutate(data);
    } else {
      createContactMutation.mutate(data);
    }
  };

  const isPending = createContactMutation.isPending || updateContactMutation.isPending;

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            placeholder="Contact name"
            {...form.register('name', { required: true })}
            data-testid="input-additional-contact-name"
          />
        </div>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="e.g., Manager"
            {...form.register('title')}
            data-testid="input-additional-contact-title"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            {...form.register('phone')}
            data-testid="input-additional-contact-phone"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="contact@example.com"
            {...form.register('email')}
            data-testid="input-additional-contact-email"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
          data-testid="button-cancel-additional-contact"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} data-testid="button-submit-additional-contact">
          {isPending ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Contact' : 'Add Contact')}
        </Button>
      </div>
    </form>
  );
}

function AddressForm({
  customerId,
  address,
  isEditing,
  onSuccess,
  onCancel,
}: {
  customerId: string;
  address?: CustomerAddress;
  isEditing: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const form = useForm<InsertCustomerAddress>({
    resolver: zodResolver(insertCustomerAddressSchema),
    defaultValues: {
      customerId,
      addressType: address?.addressType || 'store',
      streetNumber: address?.streetNumber || '',
      streetName: address?.streetName || '',
      unit: address?.unit || '',
      building: address?.building || '',
      district: address?.district || '',
      city: address?.city || '',
      stateProvince: address?.stateProvince || '',
      postalCode: address?.postalCode || '',
      country: address?.country || '',
      address: address?.address || '',
      chineseAddress: address?.chineseAddress || '',
      translation: address?.translation || '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCustomerAddress) => {
      await apiRequest('POST', `/api/customers/${customerId}/addresses`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId] });
      toast({ title: "Address added successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to add address", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertCustomerAddress>) => {
      if (!address?.id) return;
      await apiRequest('PATCH', `/api/customer-addresses/${address.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId] });
      toast({ title: "Address updated successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to update address", variant: "destructive" });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: InsertCustomerAddress) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="addressType">Address Type</Label>
        <Select
          value={form.watch('addressType')}
          onValueChange={(value) => form.setValue('addressType', value as any)}
        >
          <SelectTrigger data-testid="select-address-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="store">Store</SelectItem>
            <SelectItem value="office">Office</SelectItem>
            <SelectItem value="warehouse">Warehouse</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="shipping">Shipping</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-medium">Structured Address</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="streetNumber">Street Number</Label>
            <Input
              id="streetNumber"
              placeholder="123"
              {...form.register('streetNumber')}
              data-testid="input-street-number"
            />
          </div>
          <div>
            <Label htmlFor="streetName">Street Name</Label>
            <Input
              id="streetName"
              placeholder="Main Street"
              {...form.register('streetName')}
              data-testid="input-street-name"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="unit">Unit/Suite</Label>
            <Input
              id="unit"
              placeholder="Unit 5B"
              {...form.register('unit')}
              data-testid="input-unit"
            />
          </div>
          <div>
            <Label htmlFor="building">Building</Label>
            <Input
              id="building"
              placeholder="Building name"
              {...form.register('building')}
              data-testid="input-building"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="district">District</Label>
          <Input
            id="district"
            placeholder="District/Area"
            {...form.register('district')}
            data-testid="input-district"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="City"
              {...form.register('city')}
              data-testid="input-city"
            />
          </div>
          <div>
            <Label htmlFor="stateProvince">State/Province</Label>
            <Input
              id="stateProvince"
              placeholder="State/Province"
              {...form.register('stateProvince')}
              data-testid="input-state-province"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              placeholder="12345"
              {...form.register('postalCode')}
              data-testid="input-postal-code"
            />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Select
              value={form.watch('country') || ''}
              onValueChange={(value) => form.setValue('country', value)}
            >
              <SelectTrigger data-testid="select-country">
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
      </div>

      <div>
        <Label htmlFor="address">Full Address (Optional Legacy Field)</Label>
        <Textarea
          id="address"
          placeholder="Complete address if not using structured fields"
          {...form.register('address')}
          rows={2}
          data-testid="input-address"
        />
      </div>

      <div>
        <Label htmlFor="chineseAddress">Chinese Address</Label>
        <Textarea
          id="chineseAddress"
          placeholder="輸入中文地址（可選）"
          {...form.register('chineseAddress')}
          rows={3}
          data-testid="input-chinese-address"
        />
      </div>

      <div>
        <Label htmlFor="translation">Translation Notes</Label>
        <Textarea
          id="translation"
          placeholder="Add any translation notes or special instructions"
          {...form.register('translation')}
          rows={2}
          data-testid="input-translation"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
          data-testid="button-cancel-address"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} data-testid="button-submit-address">
          {isPending ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Address' : 'Add Address')}
        </Button>
      </div>
    </form>
  );
}
