import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Sale } from "@shared/schema";
import { format } from "date-fns";

export default function SalesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saleData, setSaleData] = useState({
    customerName: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  const { data: sales = [], isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const createSaleMutation = useMutation({
    mutationFn: async (data: typeof saleData) => {
      const response = await apiRequest("POST", "/api/sales", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setSaleData({
        customerName: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
      });
      toast({
        title: "Success",
        description: "Sale logged successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSaleMutation.mutate(saleData);
  };

  const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.amount), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sales Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {user?.name}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Log New Sale</CardTitle>
            <CardDescription>Record a new sale transaction</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  data-testid="input-customer-name"
                  value={saleData.customerName}
                  onChange={(e) => setSaleData({ ...saleData, customerName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  data-testid="input-amount"
                  type="number"
                  step="0.01"
                  value={saleData.amount}
                  onChange={(e) => setSaleData({ ...saleData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  data-testid="input-date"
                  type="date"
                  value={saleData.date}
                  onChange={(e) => setSaleData({ ...saleData, date: e.target.value })}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createSaleMutation.isPending}
                data-testid="button-log-sale"
              >
                {createSaleMutation.isPending ? "Logging..." : "Log Sale"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Statistics</CardTitle>
            <CardDescription>Your sales performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Sales</span>
                <span className="text-2xl font-bold" data-testid="text-total-sales">{sales.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Revenue</span>
                <span className="text-2xl font-bold" data-testid="text-total-revenue">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>Your recent sales transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : sales.length === 0 ? (
            <div className="text-center text-muted-foreground">No sales logged yet</div>
          ) : (
            <div className="space-y-2">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex justify-between items-center p-3 border rounded-md"
                  data-testid={`sale-${sale.id}`}
                >
                  <div>
                    <p className="font-medium" data-testid={`text-customer-${sale.id}`}>{sale.customerName}</p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-product-${sale.id}`}>{sale.product}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" data-testid={`text-amount-${sale.id}`}>${parseFloat(sale.amount).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-date-${sale.id}`}>
                      {format(new Date(sale.date), "MMM dd, yyyy")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
