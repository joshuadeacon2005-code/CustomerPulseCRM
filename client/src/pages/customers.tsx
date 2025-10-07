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
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Users as UsersIcon, Filter } from "lucide-react";
import { Customer, CustomerWithDetails, InsertCustomer, UpdateCustomer, InsertInteraction } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function Customers() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const stageFilter = searchParams.get('stage');

  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilterLocal, setStageFilterLocal] = useState<string>(stageFilter || "all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);
  const { toast } = useToast();

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
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
    return matchesSearch && matchesStage;
  });

  const handleCustomerClick = (customer: Customer) => {
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
        <CardContent className="p-4">
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
            <Select value={stageFilterLocal} onValueChange={setStageFilterLocal}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-stage">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="lead">Leads</SelectItem>
                <SelectItem value="prospect">Prospects</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
              {searchTerm || stageFilterLocal !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by adding your first customer"}
            </p>
            {!searchTerm && stageFilterLocal === "all" && (
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
