import { useState } from "react";
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
import { Plus, Search, Users as UsersIcon, Filter, X } from "lucide-react";
import { CustomerWithBrands, CustomerWithDetails, InsertCustomer, UpdateCustomer, InsertInteraction, Brand } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

export default function Customers() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const stageFilter = searchParams.get('stage');

  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilterLocal, setStageFilterLocal] = useState<string>(stageFilter || "all");
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [retailerTypeFilter, setRetailerTypeFilter] = useState<string>("all");
  const [isBrandSelectOpen, setIsBrandSelectOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);
  const { toast } = useToast();

  const { data: customers, isLoading } = useQuery<CustomerWithBrands[]>({
    queryKey: ["/api/customers"],
  });

  const { data: brands, isLoading: isLoadingBrands } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: selectedCustomerDetail } = useQuery<CustomerWithDetails>({
    queryKey: ["/api/customers", selectedCustomer?.id],
    enabled: !!selectedCustomer?.id,
  });

  const addCustomerMutation = useMutation({
    mutationFn: (data: InsertCustomer) => apiRequest("POST", "/api/customers", data),
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
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm);
    
    const matchesStage = stageFilterLocal === "all" || customer.stage === stageFilterLocal;
    
    const matchesBrand = brandFilter.length === 0 || 
      customer.brands.some(brand => brandFilter.includes(brand.id));
    
    const matchesRetailerType = retailerTypeFilter === "all" || 
      customer.retailerType === retailerTypeFilter;
    
    return matchesSearch && matchesStage && matchesBrand && matchesRetailerType;
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
  };

  const activeFilterCount = 
    (searchTerm ? 1 : 0) +
    (stageFilterLocal !== "all" ? 1 : 0) +
    (brandFilter.length > 0 ? 1 : 0) +
    (retailerTypeFilter !== "all" ? 1 : 0);

  const selectedBrandNames = brands?.filter(b => brandFilter.includes(b.id)).map(b => b.name) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-customers-title">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your leads, prospects, and customers
          </p>
        </div>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          data-testid="button-add-customer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredCustomers && filteredCustomers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="grid-customers">
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
        <DialogContent data-testid="modal-add-customer">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            onSubmit={(data) => addCustomerMutation.mutate(data as InsertCustomer)}
            onCancel={() => setIsAddDialogOpen(false)}
            isLoading={addCustomerMutation.isPending}
          />
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
