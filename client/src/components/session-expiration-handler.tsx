import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SESSION_EXPIRED_EVENT, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogIn, AlertTriangle } from "lucide-react";

export function SessionExpirationHandler() {
  const [showDialog, setShowDialog] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleSessionExpired = () => {
      console.log('[Session] Session expiration detected');
      
      // Show the modal dialog
      setShowDialog(true);
      
      // Also show a toast for immediate feedback
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again to continue working.",
        variant: "destructive",
        duration: 10000,
      });
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [toast]);

  const handleLoginRedirect = () => {
    setShowDialog(false);
    // Clear query cache to force fresh data after re-login
    queryClient.clear();
    setLocation("/auth");
  };

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent data-testid="dialog-session-expired">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">Session Expired</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-3">
            <p>
              Your session has expired due to inactivity or timeout. 
              Any unsaved changes may not have been saved.
            </p>
            <p className="font-medium text-foreground">
              Please log in again to continue working.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={handleLoginRedirect}
            className="w-full sm:w-auto"
            data-testid="button-login-again"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Log In Again
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
