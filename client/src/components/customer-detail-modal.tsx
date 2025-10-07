import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
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
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [isAddingActionItem, setIsAddingActionItem] = useState(false);
  const [isAddingSales, setIsAddingSales] = useState(false);
  const [editingSalesId, setEditingSalesId] = useState<string | null>(null);
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
      setIsAddingBrand(false);
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
      return await apiRequest('POST', '/api/action-items', data);
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

  if (!customer) return null;

  const handleUpdate = (data: UpdateCustomer) => {
    onUpdate(data);
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
        <DialogHeader>
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
                <div className="flex flex-wrap items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`${stageColors[customer.stage as keyof typeof stageColors]} uppercase`}
                  >
                    {customer.stage}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">Score: {customer.leadScore}</span>
                  </div>
                </div>
              </div>
            </div>
            {!isEditing && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditing(true)}
                data-testid="button-edit-customer"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="brands" data-testid="tab-brands">
              Brands ({customer.brands?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="actions" data-testid="tab-actions">
              Action Items ({customer.actionItems?.filter(a => !a.completedAt).length || 0})
            </TabsTrigger>
            <TabsTrigger value="sales" data-testid="tab-sales">
              Sales Tracking
            </TabsTrigger>
            <TabsTrigger value="interactions" data-testid="tab-interactions">
              Interactions ({customer.interactions?.length || 0})
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
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm" data-testid="text-customer-email">{customer.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm" data-testid="text-customer-phone">{customer.phone}</span>
                    </div>
                    {customer.assignedTo && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm" data-testid="text-customer-assigned">Assigned to: {customer.assignedTo}</span>
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground pt-2 border-t">
                      Customer since {format(new Date(customer.createdAt), "MMMM d, yyyy")}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Business Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">BC Registered:</span>
                        <span data-testid="text-bc-registered">
                          {customer.registeredWithBC ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground" />
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Orders via BC:</span>
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
              </>
            )}
          </TabsContent>

          {/* Brands Tab */}
          <TabsContent value="brands" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Assigned Brands</h3>
              <div className="flex gap-2">
                {!isCreatingBrand && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCreatingBrand(true)}
                    data-testid="button-create-brand"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Brand
                  </Button>
                )}
                {!isAddingBrand && availableBrands.length > 0 && (
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

            {isCreatingBrand && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Create New Brand</CardTitle>
                </CardHeader>
                <CardContent>
                  <NewBrandForm
                    onSubmit={(data) => createBrandMutation.mutate(data)}
                    onCancel={() => setIsCreatingBrand(false)}
                    isLoading={createBrandMutation.isPending}
                  />
                </CardContent>
              </Card>
            )}

            {isAddingBrand && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Assign Brand</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Select Brand</Label>
                      <Select
                        onValueChange={(brandId) => {
                          addBrandMutation.mutate({ customerId: customer.id, brandId });
                        }}
                      >
                        <SelectTrigger data-testid="select-brand">
                          <SelectValue placeholder="Choose a brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBrands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddingBrand(false)}
                        data-testid="button-cancel-brand"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
              <Card>
                <CardContent className="p-8 text-center">
                  <Tag className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No brands assigned yet</p>
                </CardContent>
              </Card>
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
                        
                        return (
                          <TableRow key={record.id} data-testid={`row-sales-${record.id}`}>
                            <TableCell>{monthNames[record.month - 1]}</TableCell>
                            <TableCell>{record.year}</TableCell>
                            <TableCell className="text-right">${budget.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              {editingSalesId === record.id ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  defaultValue={actual}
                                  className="w-24"
                                  onBlur={(e) => {
                                    const value = e.target.value;
                                    updateMonthlySalesMutation.mutate({
                                      id: record.id,
                                      data: { actual: value }
                                    });
                                  }}
                                  data-testid={`input-actual-${record.id}`}
                                />
                              ) : (
                                <span>${actual.toFixed(2)}</span>
                              )}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-medium",
                              variance > 0 ? "text-green-600" : variance < 0 ? "text-red-600" : ""
                            )}>
                              {variance > 0 ? '+' : ''}{variance.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">{percentage}%</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingSalesId(editingSalesId === record.id ? null : record.id)}
                                data-testid={`button-edit-sales-${record.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
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
                    onSubmit={handleAddInteraction}
                    onCancel={() => setIsAddingNewInteraction(false)}
                    isLoading={isAddingInteraction}
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
  const form = useForm<InsertActionItem>({
    resolver: zodResolver(insertActionItemSchema),
    defaultValues: {
      customerId,
      description: '',
      dueDate: undefined,
      visitDate: undefined,
      createdBy: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
