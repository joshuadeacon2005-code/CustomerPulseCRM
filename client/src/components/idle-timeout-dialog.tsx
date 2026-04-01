import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

const IDLE_WARNING_MS = 25 * 60 * 1000;  // 25 min → show warning
const IDLE_LOGOUT_MS  = 30 * 60 * 1000;  // 30 min → auto-logout
const WARNING_DURATION_S = (IDLE_LOGOUT_MS - IDLE_WARNING_MS) / 1000; // 300 s

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function IdleTimeoutDialog() {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_DURATION_S);
  const [, setLocation] = useLocation();

  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const doLogout = useCallback(async () => {
    stopCountdown();
    setShowWarning(false);
    try {
      await apiRequest("POST", "/api/logout");
    } catch {
      // ignore — redirect regardless
    }
    queryClient.clear();
    setLocation("/auth");
  }, [stopCountdown, setLocation]);

  const startCountdown = useCallback(() => {
    setCountdown(WARNING_DURATION_S);
    setShowWarning(true);
    stopCountdown();
    let remaining = WARNING_DURATION_S;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        doLogout();
      }
    }, 1000);
  }, [stopCountdown, doLogout]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    stopCountdown();
    setCountdown(WARNING_DURATION_S);
  }, [stopCountdown]);

  // Activity listeners
  useEffect(() => {
    const onActivity = () => {
      if (!showWarning) {
        lastActivityRef.current = Date.now();
      }
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [showWarning]);

  // Periodic idle check
  useEffect(() => {
    checkIntervalRef.current = setInterval(() => {
      if (showWarning) return;
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= IDLE_WARNING_MS) {
        startCountdown();
      }
    }, 30_000);

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [showWarning, startCountdown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCountdown();
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [stopCountdown]);

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent data-testid="dialog-idle-timeout">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle className="text-xl">Still there?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-3">
            <p>
              You've been inactive for a while. For your security, you'll be
              automatically logged out in:
            </p>
            <div
              className="text-4xl font-bold tabular-nums text-center py-3 text-amber-600 dark:text-amber-400"
              data-testid="text-idle-countdown"
            >
              {formatCountdown(countdown)}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Click "Stay Logged In" to continue your session.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2 sm:flex-row flex-col">
          <Button
            variant="outline"
            onClick={doLogout}
            data-testid="button-idle-logout"
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Log Out Now
          </Button>
          <Button
            onClick={resetTimer}
            data-testid="button-idle-stay"
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Stay Logged In
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
