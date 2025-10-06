import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CustomerWithInteractions } from "@shared/schema";
import { Mail, Phone, User, TrendingUp, Edit, Plus, MessageSquare, Phone as PhoneIcon, Mail as MailIcon } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { CustomerForm } from "./customer-form";
import { InteractionForm } from "./interaction-form";
import type { UpdateCustomer, InsertInteraction } from "@shared/schema";

interface CustomerDetailModalProps {
  customer: CustomerWithInteractions | null;
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

  if (!customer) return null;

  const handleUpdate = (data: UpdateCustomer) => {
    onUpdate(data);
    setIsEditing(false);
  };

  const handleAddInteraction = (data: InsertInteraction) => {
    onAddInteraction(data);
    setIsAddingNewInteraction(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-customer-detail">
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="interactions" data-testid="tab-interactions">
              Interactions ({customer.interactions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="edit" disabled={!isEditing} data-testid="tab-edit">
              Edit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{customer.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{customer.phone}</span>
                </div>
                {customer.assignedTo && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Assigned to: {customer.assignedTo}</span>
                  </div>
                )}
                <div className="text-sm text-muted-foreground pt-2 border-t">
                  Customer since {format(new Date(customer.createdAt), "MMMM d, yyyy")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Journey Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Stage:</span>
                    <Badge variant="outline" className={stageColors[customer.stage as keyof typeof stageColors]}>
                      {customer.stage}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lead Score:</span>
                    <span className="font-semibold">{customer.leadScore}/100</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Interactions:</span>
                    <span className="font-semibold">{customer.interactions?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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

          <TabsContent value="edit" className="space-y-4">
            {isEditing && (
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
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
