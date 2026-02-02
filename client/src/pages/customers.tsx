import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CustomerCard } from "@/components/customer-card";
import { CustomerDetailModal } from "@/components/customer-detail-modal";
import { CustomerForm } from "@/components/customer-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users as UsersIcon, Filter, X, Download, LayoutGrid, List, Upload, AlertTriangle, Clock, TrendingUp, Target, Award } from "lucide-react";
import { CustomerWithBrands, CustomerWithDetails, InsertCustomer, UpdateCustomer, InsertInteraction, Brand, InsertCustomerContact, Customer, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow, differenceInDays, format } from "date-fns";
import { exportCustomerList } from "@/lib/export-utils";

// Helper to calculate days since last contact and return status
function getContactStatus(lastContactDate: Date | null | undefined): { 
  days: number | null; 
  status: 'ok' | 'warning' | 'critical' | 'never';
  label: string;
} {
  if (!lastContactDate) {
    return { days: null, status: 'never', label: 'Never contacted' };
  }
  
  const days = differenceInDays(new Date(), new Date(lastContactDate));
  
  if (days >= 30) {
    return { days, status: 'critical', label: `${days} days ago` };
  } else if (days >= 14) {
    return { days, status: 'warning', label: `${days} days ago` };
  } else {
    return { days, status: 'ok', label: `${days} days ago` };
  }
}

export default function Customers() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const stageFilter = searchParams.get('stage');
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilterLocal, setStageFilterLocal] = useState<string>(stageFilter || "all");
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [retailerTypeFilter, setRetailerTypeFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [attentionFilter, setAttentionFilter] = useState<string>("all");
  const [salesmanFilter, setSalesmanFilter] = useState<string>("all");
  const [isBrandSelectOpen, setIsBrandSelectOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">(() => {
    // Initialize from localStorage
    const stored = localStorage.getItem("customerViewMode");
    return (stored === "grid" || stored === "table") ? stored : "grid";
  });
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);
  const { toast } = useToast();

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem("customerViewMode", viewMode);
  }, [viewMode]);

  // Import mutation
  const importCustomersMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/customers/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok && response.status !== 207 && response.status !== 400) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import customers');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      if (data.status === 'success') {
        toast({
          title: "Import successful",
          description: `Successfully imported ${data.summary.successful} customers.`,
        });
      } else if (data.status === 'partial') {
        toast({
          title: "Import partially completed",
          description: `Imported ${data.summary.successful} customers with ${data.summary.failed} failures and ${data.summary.skipped} skipped.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Import failed",
          description: "No customers were imported. Please check the error details.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (importFile) {
      importCustomersMutation.mutate(importFile);
    }
  };

  const handleCloseImportDialog = () => {
    setIsImportDialogOpen(false);
    setImportFile(null);
    setImportResult(null);
  };

  const { data: customers, isLoading } = useQuery<CustomerWithBrands[]>({
    queryKey: ["/api/customers"],
  });

  const { data: brands, isLoading: isLoadingBrands } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Get list of sales representatives (salesmen, managers, sales directors, regional managers)
  const salesReps = users.filter(u => 
    u.role === "salesman" || u.role === "manager" || 
    u.role === "sales_director" || u.role === "regional_manager"
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Helper to get user name by ID
  const getUserName = (userId: string | null) => {
    if (!userId) return null;
    const foundUser = users.find(u => u.id === userId);
    return foundUser?.name || null;
  };

  // Set default country filter based on user's regional office
  useEffect(() => {
    if (user && user.regionalOffice) {
      const regionalOfficeToCountry: Record<string, string> = {
        "Australia": "Australia",
        "New Zealand": "New Zealand",
        "Hong Kong": "Hong Kong",
        "Singapore": "Singapore",
        "Shanghai": "China",
        "Indonesia": "Indonesia",
        "Malaysia": "Malaysia",
        "Guangzhou": "China",
      };
      
      const defaultCountry = regionalOfficeToCountry[user.regionalOffice];
      if (defaultCountry) {
        setCountryFilter(defaultCountry);
      }
    }
  }, [user]);

  const { data: selectedCustomerDetail } = useQuery<CustomerWithDetails>({
    queryKey: ["/api/customers", selectedCustomer?.id],
    enabled: !!selectedCustomer?.id,
  });

  const addCustomerMutation = useMutation({
    mutationFn: async ({ customer, contacts, initialAddress }: { 
      customer: InsertCustomer; 
      contacts?: Omit<InsertCustomerContact, 'customerId'>[];
      initialAddress?: {
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
      };
    }) => {
      // First create the customer
      const newCustomer = await apiRequest("POST", "/api/customers", customer) as unknown as Customer;
      
      // Then create additional contacts if any
      if (contacts && contacts.length > 0) {
        await Promise.all(
          contacts.map(contact =>
            apiRequest("POST", "/api/customer-contacts", {
              ...contact,
              customerId: newCustomer.id,
            })
          )
        );
      }
      
      // Create initial address if provided
      if (initialAddress) {
        await apiRequest("POST", "/api/customer-addresses", {
          ...initialAddress,
          customerId: newCustomer.id,
        });
      }
      
      return newCustomer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setIsAddDialogOpen(false);
      toast({
        title: "Customer added",
        description: "The customer has been successfully added.",
      });
    },
    onError: (error: any) => {
      let errorMessage = "Failed to add customer. Please try again.";
      if (error?.message) {
        errorMessage = error.message;
      }
      toast({
        title: "Error adding customer",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomer }) =>
      apiRequest("PATCH", `/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Customer updated",
        description: "The customer has been successfully updated.",
      });
    },
    onError: (error: any) => {
      let errorMessage = "Failed to update customer. Please try again.";
      if (error?.message) {
        errorMessage = error.message;
      }
      toast({
        title: "Error updating customer",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const addInteractionMutation = useMutation({
    mutationFn: async (data: InsertInteraction) => {
      console.log('[Interaction] Saving interaction for customer:', data.customerId, 'Type:', data.type);
      const response = await apiRequest("POST", "/api/interactions", data);
      const result = await response.json();
      console.log('[Interaction] Server response:', result);
      return { result, originalData: data };
    },
    onSuccess: ({ result, originalData }) => {
      const customerName = selectedCustomer?.name || 'customer';
      console.log('[Interaction] Successfully saved interaction ID:', result.id);
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Interaction Logged Successfully",
        description: `${originalData.type} interaction for "${customerName}" has been saved.`,
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      console.error('[Interaction] Failed to save interaction:', error);
      toast({
        title: "Failed to Save Interaction",
        description: error.message || "Could not save the interaction. Please check your connection and try again.",
        variant: "destructive",
        duration: 8000,
      });
    },
  });

  const filteredCustomers = customers?.filter((customer) => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm) ||
      customer.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contactPhone?.includes(searchTerm);
    
    const matchesStage = stageFilterLocal === "all" || customer.stage === stageFilterLocal;
    
    const matchesBrand = brandFilter.length === 0 || 
      customer.brands.some(brand => brandFilter.includes(brand.id));
    
    const matchesRetailerType = retailerTypeFilter === "all" || 
      customer.retailerType === retailerTypeFilter;
    
    const matchesCountry = countryFilter === "all" || 
      (customer.country || "").toLowerCase() === countryFilter.toLowerCase();
    
    // Attention filter
    const contactStatus = getContactStatus(customer.lastContactDate);
    const needsAttention = contactStatus.status === 'critical' || contactStatus.status === 'warning' || contactStatus.status === 'never';
    const matchesAttention = attentionFilter === "all" || 
      (attentionFilter === "needs_attention" && needsAttention) ||
      (attentionFilter === "ok" && !needsAttention);
    
    // Salesman filter
    const matchesSalesman = salesmanFilter === "all" || 
      (salesmanFilter === "unassigned" && !customer.assignedTo) ||
      customer.assignedTo === salesmanFilter;
    
    return matchesSearch && matchesStage && matchesBrand && matchesRetailerType && matchesCountry && matchesAttention && matchesSalesman;
  });
  
  // Get unique countries from customers (excluding Unknown) with custom order
  const countryOrder = ["Hong Kong", "Singapore", "Australia", "New Zealand", "Macau", "Indonesia"];
  const uniqueCountries = Array.from(
    new Set(customers?.map(c => c.country).filter((c): c is string => !!c && c !== "Unknown"))
  ).sort((a, b) => {
    const indexA = countryOrder.indexOf(a);
    const indexB = countryOrder.indexOf(b);
    
    // If both are in the custom order, sort by their position
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    // If only a is in custom order, it comes first
    if (indexA !== -1) return -1;
    // If only b is in custom order, it comes first
    if (indexB !== -1) return 1;
    // Otherwise, sort alphabetically
    return a.localeCompare(b);
  });

  const handleCustomerClick = (customer: CustomerWithBrands) => {
    setSelectedCustomer(customer as CustomerWithDetails);
  };

  const handleUpdateCustomer = (data: UpdateCustomer) => {
    if (selectedCustomer) {
      updateCustomerMutation.mutate({ id: selectedCustomer.id, data });
    }
  };

  const handleAddInteraction = (data: InsertInteraction) => {
    addInteractionMutation.mutate(data);
  };

  const handleToggleBrand = (brandId: string) => {
    setBrandFilter(prev => 
      prev.includes(brandId) 
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setStageFilterLocal("all");
    setBrandFilter([]);
    setRetailerTypeFilter("all");
    setCountryFilter("all");
    setAttentionFilter("all");
    setSalesmanFilter("all");
  };

  const activeFilterCount = 
    (searchTerm ? 1 : 0) +
    (stageFilterLocal !== "all" ? 1 : 0) +
    (brandFilter.length > 0 ? 1 : 0) +
    (retailerTypeFilter !== "all" ? 1 : 0) +
    (countryFilter !== "all" ? 1 : 0) +
    (attentionFilter !== "all" ? 1 : 0) +
    (salesmanFilter !== "all" ? 1 : 0);

  const selectedBrandNames = brands?.filter(b => brandFilter.includes(b.id)).map(b => b.name) || [];

  // Calculate stats helper function (accepts any customer-like object with stage and lastContactDate)
  const calculateStats = (customerList: Array<{ stage: string; lastContactDate: Date | null }>) => ({
    total: customerList.length,
    leads: customerList.filter(c => c.stage === 'lead').length,
    prospects: customerList.filter(c => c.stage === 'prospect').length,
    customers: customerList.filter(c => c.stage === 'customer').length,
    needsAttention: customerList.filter(c => {
      const status = getContactStatus(c.lastContactDate);
      return status.status === 'critical' || status.status === 'warning' || status.status === 'never';
    }).length,
  });

  // Global stats
  const stats = calculateStats(customers || []);
  
  // Country-specific stats (when a country is selected)
  const countryCustomers = countryFilter !== "all" 
    ? (customers || []).filter(c => (c.country || "").toLowerCase() === countryFilter.toLowerCase())
    : [];
  const countryStats = calculateStats(countryCustomers);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-customers-title">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your leads, prospects, and customers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex border rounded-md p-0.5 bg-muted/30">
            <Button 
              variant="ghost" 
              size="icon"
              className={viewMode === "grid" ? "bg-background shadow-sm" : ""}
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className={viewMode === "table" ? "bg-background shadow-sm" : ""}
              onClick={() => setViewMode("table")}
              data-testid="button-view-table"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            variant="outline"
            size="sm"
            onClick={() => {
              if (filteredCustomers && filteredCustomers.length > 0) {
                const dateStr = format(new Date(), 'yyyy-MM-dd');
                exportCustomerList(filteredCustomers, `customer-list-${dateStr}`);
                toast({
                  title: "Export Complete",
                  description: `${filteredCustomers.length} customers exported to Excel file`,
                });
              } else {
                toast({
                  title: "No Data",
                  description: "No customers to export",
                  variant: "destructive",
                });
              }
            }}
            data-testid="button-export-customers"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
          <Button 
            variant="outline"
            size="sm"
            asChild
            data-testid="button-download-template"
          >
            <a href="/api/download/customer-template" download="customer_import_template.xlsx">
              <Download className="h-4 w-4 mr-1.5" />
              Template
            </a>
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setIsImportDialogOpen(true)}
            data-testid="button-import-customers"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Import
          </Button>
          <Button 
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
            data-testid="button-add-customer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="hover-elevate relative overflow-visible" data-testid="card-total-stats">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl pointer-events-none" />
          <CardContent className="relative p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <UsersIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${stageFilterLocal === 'lead' ? 'ring-2 ring-blue-500' : 'hover-elevate'}`}
          onClick={() => setStageFilterLocal(stageFilterLocal === 'lead' ? 'all' : 'lead')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.leads}</p>
                <p className="text-xs text-muted-foreground">Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${stageFilterLocal === 'prospect' ? 'ring-2 ring-amber-500' : 'hover-elevate'}`}
          onClick={() => setStageFilterLocal(stageFilterLocal === 'prospect' ? 'all' : 'prospect')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.prospects}</p>
                <p className="text-xs text-muted-foreground">Prospects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${stageFilterLocal === 'customer' ? 'ring-2 ring-green-500' : 'hover-elevate'}`}
          onClick={() => setStageFilterLocal(stageFilterLocal === 'customer' ? 'all' : 'customer')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.customers}</p>
                <p className="text-xs text-muted-foreground">Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${attentionFilter === 'needs_attention' ? 'ring-2 ring-red-500' : 'hover-elevate'}`}
          onClick={() => setAttentionFilter(attentionFilter === 'needs_attention' ? 'all' : 'needs_attention')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.needsAttention}</p>
                <p className="text-xs text-muted-foreground">Need Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Country Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground mr-1">Region:</span>
        <Button
          size="sm"
          variant={countryFilter === "all" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setCountryFilter("all")}
          data-testid="button-country-all"
        >
          All
        </Button>
        {uniqueCountries.map((country) => (
          <Button
            key={country}
            size="sm"
            variant={countryFilter === country ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setCountryFilter(countryFilter === country ? "all" : country)}
            data-testid={`button-country-${country.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {country}
          </Button>
        ))}
      </div>

      {/* Country Analytics (shown when a country is selected and has data) */}
      {countryFilter !== "all" && countryCustomers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <Card className="hover-elevate" data-testid="card-country-total">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <UsersIcon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-primary">{countryStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-elevate" data-testid="card-country-leads">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{countryStats.leads}</p>
                  <p className="text-xs text-muted-foreground">Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-elevate" data-testid="card-country-prospects">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{countryStats.prospects}</p>
                  <p className="text-xs text-muted-foreground">Prospects</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-elevate" data-testid="card-country-customers">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-500/10">
                  <Award className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">{countryStats.customers}</p>
                  <p className="text-xs text-muted-foreground">Customers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-elevate" data-testid="card-country-attention">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">{countryStats.needsAttention}</p>
                  <p className="text-xs text-muted-foreground">Need Attention</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-customers"
            />
          </div>
          
          {/* Filter dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            <Popover open={isBrandSelectOpen} onOpenChange={setIsBrandSelectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start gap-1.5"
                  data-testid="select-brand-filter"
                >
                  <Filter className="h-3.5 w-3.5" />
                  {brandFilter.length === 0 ? (
                    "Brands"
                  ) : (
                    <Badge variant="secondary" className="px-1.5 text-xs font-normal no-default-hover-elevate">
                      {brandFilter.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search brands..." />
                  <CommandList>
                    <CommandEmpty>
                      {isLoadingBrands ? "Loading..." : "No brands found."}
                    </CommandEmpty>
                    <CommandGroup>
                      {brands?.map((brand) => (
                        <CommandItem
                          key={brand.id}
                          onSelect={() => handleToggleBrand(brand.id)}
                        >
                          <Checkbox
                            checked={brandFilter.includes(brand.id)}
                            className="mr-2"
                          />
                          {brand.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Select value={retailerTypeFilter} onValueChange={setRetailerTypeFilter}>
              <SelectTrigger className="w-auto min-w-[100px]" data-testid="select-retailer-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Retail Store">Retail</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Wholesale">Wholesale</SelectItem>
                <SelectItem value="Distributor">Distributor</SelectItem>
              </SelectContent>
            </Select>

            <Select value={salesmanFilter} onValueChange={setSalesmanFilter}>
              <SelectTrigger className="w-auto min-w-[140px]" data-testid="select-salesman-filter">
                <SelectValue placeholder="Salesperson" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Salespeople</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {salesReps.map(rep => (
                  <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={clearAllFilters}
                data-testid="button-clear-filters"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Active filter badges */}
        {(selectedBrandNames.length > 0 || countryFilter !== "all" || stageFilterLocal !== "all" || attentionFilter !== "all" || salesmanFilter !== "all") && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Active:</span>
            {countryFilter !== "all" && (
              <Badge variant="secondary" className="gap-1 no-default-hover-elevate">
                {countryFilter}
                <X className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100" onClick={() => setCountryFilter("all")} />
              </Badge>
            )}
            {stageFilterLocal !== "all" && (
              <Badge variant="secondary" className="gap-1 no-default-hover-elevate capitalize">
                {stageFilterLocal}s
                <X className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100" onClick={() => setStageFilterLocal("all")} />
              </Badge>
            )}
            {attentionFilter !== "all" && (
              <Badge variant="secondary" className="gap-1 no-default-hover-elevate">
                {attentionFilter === "needs_attention" ? "Needs Attention" : "Recently Contacted"}
                <X className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100" onClick={() => setAttentionFilter("all")} />
              </Badge>
            )}
            {salesmanFilter !== "all" && (
              <Badge variant="secondary" className="gap-1 no-default-hover-elevate">
                {salesmanFilter === "unassigned" ? "Unassigned" : getUserName(salesmanFilter) || "Salesperson"}
                <X className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100" onClick={() => setSalesmanFilter("all")} />
              </Badge>
            )}
            {selectedBrandNames.map((name) => (
              <Badge key={name} variant="secondary" className="gap-1 no-default-hover-elevate">
                {name}
                <X className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100" onClick={() => handleToggleBrand(brands?.find(b => b.name === name)?.id || "")} />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      {filteredCustomers && (
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredCustomers.length}</span> of {customers?.length} customers
        </p>
      )}

      {isLoading ? (
        viewMode === "grid" ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
        )
      ) : filteredCustomers && filteredCustomers.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="grid-customers">
            {filteredCustomers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onClick={() => handleCustomerClick(customer)}
              />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-customers">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stage</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brands</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quarterly Target</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCustomers.map((customer) => {
                    const contactStatus = getContactStatus(customer.lastContactDate);
                    const stageColors = {
                      lead: "bg-blue-500",
                      prospect: "bg-amber-500", 
                      customer: "bg-green-500"
                    };
                    return (
                      <tr 
                        key={customer.id} 
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                        onClick={() => handleCustomerClick(customer)}
                        data-testid={`table-row-customer-${customer.id}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-1 h-8 rounded-full ${stageColors[customer.stage as keyof typeof stageColors] || "bg-gray-400"}`} />
                            <div>
                              <p className="font-medium text-sm">{customer.name}</p>
                              {customer.retailerType && (
                                <p className="text-xs text-muted-foreground">{customer.retailerType}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">{customer.country || <span className="text-muted-foreground/50">-</span>}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] uppercase font-semibold ${
                              customer.stage === "customer" ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30" :
                              customer.stage === "prospect" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" :
                              "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                            }`}
                          >
                            {customer.stage}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {customer.brands && customer.brands.length > 0 ? (
                            <div className="flex gap-1">
                              {customer.brands.slice(0, 2).map((brand) => (
                                <Badge key={brand.id} variant="secondary" className="text-[10px] font-normal no-default-hover-elevate">
                                  {brand.name}
                                </Badge>
                              ))}
                              {customer.brands.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{customer.brands.length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {customer.quarterlySoftTarget ? (
                            <span className="font-medium text-sm">
                              ${Number(customer.quarterlySoftTarget).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {contactStatus.status === 'ok' ? (
                            <span className="text-sm text-muted-foreground">{contactStatus.days}d ago</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {contactStatus.status === 'critical' && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                              {contactStatus.status === 'warning' && <Clock className="h-3.5 w-3.5 text-amber-500" />}
                              {contactStatus.status === 'never' && <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />}
                              <span className={`text-xs font-medium ${
                                contactStatus.status === 'critical' ? 'text-red-600 dark:text-red-400' :
                                contactStatus.status === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                'text-muted-foreground'
                              }`}>
                                {contactStatus.status === 'never' ? 'Never' : `${contactStatus.days}d`}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <UsersIcon className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No customers found</h3>
            <p className="text-muted-foreground mb-6">
              {activeFilterCount > 0
                ? "Try adjusting your search or filters"
                : "Get started by adding your first customer"}
            </p>
            {activeFilterCount === 0 && (
              <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-customer">
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-add-customer">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            onSubmit={(data, additionalContacts, initialAddress) => 
              addCustomerMutation.mutate({ 
                customer: data as InsertCustomer, 
                contacts: additionalContacts,
                initialAddress 
              })
            }
            onCancel={() => setIsAddDialogOpen(false)}
            isLoading={addCustomerMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Import Customers Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={handleCloseImportDialog}>
        <DialogContent className="max-w-2xl" data-testid="modal-import-customers">
          <DialogHeader className="pr-10">
            <DialogTitle>Import Customers from Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {!importResult ? (
              <>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload an Excel file (.xlsx or .xls) to bulk import customers. 
                    Make sure your file follows the template format.
                  </p>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      disabled={importCustomersMutation.isPending}
                      data-testid="input-import-file"
                    />
                  </div>
                  {importFile && (
                    <p className="text-sm">
                      Selected: <span className="font-medium">{importFile.name}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={handleCloseImportDialog}
                    disabled={importCustomersMutation.isPending}
                    data-testid="button-cancel-import"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleImport}
                    disabled={!importFile || importCustomersMutation.isPending}
                    data-testid="button-upload-import"
                  >
                    {importCustomersMutation.isPending ? "Uploading..." : "Upload & Import"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Import Summary Report */}
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-4">
                    <h3 className="font-semibold">Import Summary</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">{importResult.summary.total}</p>
                      </div>
                      <div>
                        <p className="text-sm text-green-600 dark:text-green-400">Successful</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {importResult.summary.successful}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-red-600 dark:text-red-400">Failed</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {importResult.summary.failed}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">Skipped</p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {importResult.summary.skipped}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Error Details */}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Error Details</h4>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {importResult.errors.map((error: any, index: number) => (
                          <div 
                            key={index} 
                            className="rounded border p-3 text-sm bg-destructive/5"
                            data-testid={`import-error-${index}`}
                          >
                            <p className="font-medium">Row {error.row}: {error.companyName || 'Unknown'}</p>
                            <p className="text-muted-foreground">{error.error}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {importResult.status === 'success' && (
                    <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 text-green-800 dark:text-green-200">
                      <p className="font-medium">All customers imported successfully!</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleCloseImportDialog} data-testid="button-close-import-result">
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CustomerDetailModal
        customer={selectedCustomerDetail || selectedCustomer}
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onUpdate={handleUpdateCustomer}
        onAddInteraction={handleAddInteraction}
        isUpdating={updateCustomerMutation.isPending}
        isAddingInteraction={addInteractionMutation.isPending}
      />
    </div>
  );
}
