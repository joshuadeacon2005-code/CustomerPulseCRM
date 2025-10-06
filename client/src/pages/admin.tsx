import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminDashboardStats } from "@shared/schema";
import { format } from "date-fns";

export default function AdminPage() {
  const { data: stats, isLoading } = useQuery<AdminDashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">View all salesmen statistics</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Sales</CardTitle>
            <CardDescription>All sales across all salesmen</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold" data-testid="text-admin-total-sales">
              {stats?.totalSales || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
            <CardDescription>Total revenue across all salesmen</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold" data-testid="text-admin-total-revenue">
              ${stats?.totalRevenue || "0.00"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salesmen Performance</CardTitle>
          <CardDescription>Individual salesman statistics</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.salesmenStats.length === 0 ? (
            <div className="text-center text-muted-foreground">No salesmen registered yet</div>
          ) : (
            <div className="space-y-6">
              {stats?.salesmenStats.map((salesman) => (
                <div key={salesman.salesmanId} className="space-y-3" data-testid={`salesman-${salesman.salesmanId}`}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold" data-testid={`text-salesman-name-${salesman.salesmanId}`}>
                      {salesman.salesmanName}
                    </h3>
                    <div className="text-right">
                      <p className="font-bold" data-testid={`text-salesman-total-${salesman.salesmanId}`}>
                        {salesman.totalSales} sales
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-salesman-amount-${salesman.salesmanId}`}>
                        ${salesman.totalAmount}
                      </p>
                    </div>
                  </div>
                  
                  {salesman.recentSales.length > 0 && (
                    <div className="pl-4 space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Recent Sales</p>
                      {salesman.recentSales.map((sale) => (
                        <div
                          key={sale.id}
                          className="flex justify-between items-center p-2 bg-muted rounded-md text-sm"
                          data-testid={`sale-${sale.id}`}
                        >
                          <div>
                            <p className="font-medium" data-testid={`text-customer-${sale.id}`}>
                              {sale.customerName}
                            </p>
                            <p className="text-xs text-muted-foreground" data-testid={`text-product-${sale.id}`}>
                              {sale.product}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold" data-testid={`text-amount-${sale.id}`}>
                              ${parseFloat(sale.amount).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground" data-testid={`text-date-${sale.id}`}>
                              {format(new Date(sale.date), "MMM dd, yyyy")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
