import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CURRENCIES, CURRENCY_SYMBOLS, CURRENCY_NAMES } from "@/lib/currency";
import type { Currency } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign } from "lucide-react";

export function CurrencySelector() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(
    (user?.preferredCurrency as Currency) || "USD"
  );

  // Sync with user's preferred currency when auth state changes
  useEffect(() => {
    if (user?.preferredCurrency) {
      setSelectedCurrency(user.preferredCurrency as Currency);
    }
  }, [user?.preferredCurrency]);

  const updateCurrencyMutation = useMutation({
    mutationFn: async (currency: Currency) => {
      return await apiRequest("PATCH", "/api/user/currency", { currency });
    },
    onSuccess: (data) => {
      // Update the user query cache directly instead of invalidating everything
      queryClient.setQueryData(["/api/user"], data);
      
      // Invalidate all queries that display monetary values and need currency conversion
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] }); // Dashboard KPIs
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] }); // Admin dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leaderboard"] }); // Admin leaderboard
      queryClient.invalidateQueries({ queryKey: ["/api/action-items"] }); // Action items might show related sales
      
      toast({
        title: "Currency Updated",
        description: `All monetary values will now display in ${currency}`,
      });
    },
    onError: (error) => {
      // Revert the optimistic update on error
      setSelectedCurrency((user?.preferredCurrency as Currency) || "USD");
      
      toast({
        title: "Failed to Update Currency",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleCurrencyChange = (value: Currency) => {
    setSelectedCurrency(value);
    updateCurrencyMutation.mutate(value);
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <DollarSign className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
        <SelectTrigger 
          className="w-[140px]" 
          data-testid="select-currency"
          disabled={updateCurrencyMutation.isPending}
        >
          <SelectValue>
            {CURRENCY_SYMBOLS[selectedCurrency]} {selectedCurrency}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((currency: Currency) => (
            <SelectItem 
              key={currency} 
              value={currency}
              data-testid={`option-currency-${currency}`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono">{CURRENCY_SYMBOLS[currency]}</span>
                <span className="font-medium">{currency}</span>
                <span className="text-xs text-muted-foreground">
                  {CURRENCY_NAMES[currency]}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
