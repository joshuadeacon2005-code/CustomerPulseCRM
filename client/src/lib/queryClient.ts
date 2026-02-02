import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Session expiration event for global handling
export const SESSION_EXPIRED_EVENT = 'session-expired';
let sessionExpiredShown = false;

function dispatchSessionExpired() {
  if (!sessionExpiredShown) {
    sessionExpiredShown = true;
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    // Reset after a delay so it can fire again if needed
    setTimeout(() => { sessionExpiredShown = false; }, 5000);
  }
}

export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please log in again to continue.');
    this.name = 'SessionExpiredError';
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle session expiration specifically
    if (res.status === 401) {
      console.warn('[Session] Session expired or unauthorized');
      dispatchSessionExpired();
      throw new SessionExpiredError();
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
