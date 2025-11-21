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
import { Plus, Search, Users as UsersIcon, Filter, X, Download, LayoutGrid, List, Upload } from "lucide-react";
import { CustomerWithBrands, CustomerWithDetails, InsertCustomer, UpdateCustomer, InsertInteraction, Brand, InsertCustomerContact, Customer } from "@shared/schema";
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
import { formatDistanceToNow } from "date-fns";

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

  // Set default country filter based on user's regional office
  useEffect(() => {
    if (user && user.regionalOffice) {
      const regionalOfficeToCountry: Record<string, string> = {
        "Australia/New Zealand": "Australia",
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
    mutationFn: async ({ customer, contacts }: { customer: InsertCustomer; contacts?: Omit<InsertCustomerContact, 'customerId'>[] }) => {
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add customer. Please try again.",
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update customer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addInteractionMutation = useMutation({
    mutationFn: (data: InsertInteraction) => apiRequest("POST", "/api/interactions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Interaction added",
        description: "The interaction has been successfully logged.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add interaction. Please try again.",
        variant: "destructive",
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
    
    return matchesSearch && matchesStage && matchesBrand && matchesRetailerType && matchesCountry;
  });
  
  // Get unique countries from customers
  const uniqueCountries = Array.from(
    new Set(customers?.map(c => c.country || "Unknown").filter(Boolean))
  ).sort();

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
  };

  const activeFilterCount = 
    (searchTerm ? 1 : 0) +
    (stageFilterLocal !== "all" ? 1 : 0) +
    (brandFilter.length > 0 ? 1 : 0) +
    (retailerTypeFilter !== "all" ? 1 : 0) +
    (countryFilter !== "all" ? 1 : 0);

  const selectedBrandNames = brands?.filter(b => brandFilter.includes(b.id)).map(b => b.name) || [];

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-customers-title">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your leads, prospects, and customers
          </p>
        </div>
        <div className="flex gap-2">
          {/* View Toggle */}
          <div className="flex gap-0.5 border rounded-md p-1">
            <Button 
              variant="ghost" 
              size="icon"
              className={viewMode === "grid" ? "bg-accent" : ""}
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className={viewMode === "table" ? "bg-accent" : ""}
              onClick={() => setViewMode("table")}
              data-testid="button-view-table"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            variant="outline"
            asChild
            data-testid="button-download-template"
          >
            <a href="/api/download/customer-template" download="customer_import_template.xlsx">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </a>
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
            data-testid="button-import-customers"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            data-testid="button-add-customer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Country Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Button
          variant={countryFilter === "all" ? "default" : "outline"}
          onClick={() => setCountryFilter("all")}
          className={countryFilter === "all" ? "bg-primary hover:bg-primary/90" : ""}
          data-testid="button-country-all"
        >
          All Countries
        </Button>
        {uniqueCountries.map((country) => (
          <Button
            key={country}
            variant={countryFilter === country ? "default" : "outline"}
            onClick={() => setCountryFilter(country)}
            className={countryFilter === country ? "bg-primary hover:bg-primary/90" : ""}
            data-testid={`button-country-${country.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {country}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-customers"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <span className="text-sm font-medium text-muted-foreground">Filters:</span>
              
              <Select value={stageFilterLocal} onValueChange={setStageFilterLocal}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-stage">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="lead">Leads</SelectItem>
                  <SelectItem value="prospect">Prospects</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                </SelectContent>
              </Select>

              <Popover open={isBrandSelectOpen} onOpenChange={setIsBrandSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-48 justify-start"
                    data-testid="select-brand-filter"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {brandFilter.length === 0 ? (
                      "All Brands"
                    ) : (
                      <span className="truncate">
                        {brandFilter.length} brand{brandFilter.length > 1 ? 's' : ''} selected
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search brands..." />
                    <CommandList>
                      <CommandEmpty>
                        {isLoadingBrands ? "Loading brands..." : "No brands found."}
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
                <SelectTrigger className="w-full sm:w-44" data-testid="select-retailer-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Retailer Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Retail Store">Retail Store</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Wholesale">Wholesale</SelectItem>
                  <SelectItem value="Distributor">Distributor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="no-default-hover-elevate">
                  {activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  data-testid="button-clear-filters"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear all
                </Button>
              </div>
            )}
          </div>

          {selectedBrandNames.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Selected brands:</span>
              {selectedBrandNames.map((name) => (
                <Badge key={name} variant="outline" className="no-default-hover-elevate">
                  {name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="grid-customers">
            {filteredCustomers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onClick={() => handleCustomerClick(customer)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]" data-testid="table-customers">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium whitespace-nowrap">Company</th>
                      <th className="text-left p-4 font-medium whitespace-nowrap">Country</th>
                      <th className="text-left p-4 font-medium whitespace-nowrap">Retailer Type</th>
                      <th className="text-left p-4 font-medium whitespace-nowrap">Stage</th>
                      <th className="text-left p-4 font-medium whitespace-nowrap">Brands</th>
                      <th className="text-left p-4 font-medium whitespace-nowrap">Quarterly Target</th>
                      <th className="text-left p-4 font-medium whitespace-nowrap">Last Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr 
                        key={customer.id} 
                        className="border-b hover-elevate cursor-pointer"
                        onClick={() => handleCustomerClick(customer)}
                        data-testid={`table-row-customer-${customer.id}`}
                      >
                        <td className="p-4 font-medium">{customer.name}</td>
                        <td className="p-4 text-muted-foreground">{customer.country || <span className="text-muted-foreground/50 italic">Not set</span>}</td>
                        <td className="p-4 text-muted-foreground">{customer.retailerType || <span className="text-muted-foreground/50 italic">Not set</span>}</td>
                        <td className="p-4">
                          <Badge variant={
                            customer.stage === "customer" ? "default" :
                            customer.stage === "prospect" ? "secondary" :
                            "outline"
                          }>
                            {customer.stage}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {customer.brands && customer.brands.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {customer.brands.slice(0, 2).map((brand) => (
                                <Badge key={brand.id} variant="outline" className="text-xs no-default-hover-elevate">
                                  {brand.name}
                                </Badge>
                              ))}
                              {customer.brands.length > 2 && (
                                <Badge variant="outline" className="text-xs no-default-hover-elevate">
                                  +{customer.brands.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50 italic">No brands</span>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {customer.quarterlySoftTarget 
                            ? `$${Number(customer.quarterlySoftTarget).toLocaleString()}`
                            : <span className="text-muted-foreground/50 italic">Not set</span>
                          }
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {customer.lastContactDate 
                            ? formatDistanceToNow(new Date(customer.lastContactDate), { addSuffix: true })
                            : <span className="text-muted-foreground/50 italic">Never</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
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
            onSubmit={(data, additionalContacts) => 
              addCustomerMutation.mutate({ 
                customer: data as InsertCustomer, 
                contacts: additionalContacts 
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
