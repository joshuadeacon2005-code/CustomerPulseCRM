import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const SESSION_EXPIRED_EVENT = 'session-expired';
let sessionExpiredShown = false;

function isUserAuthenticated(): boolean {
  const userData = queryClient.getQueryData(["/api/user"]);
  return !!userData;
}

function dispatchSessionExpired() {
  if (!sessionExpiredShown && isUserAuthenticated()) {
    sessionExpiredShown = true;
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    setTimeout(() => { sessionExpiredShown = false; }, 10000);
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
    if (res.status === 401) {
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

  if (!res.ok) {
    if (res.status === 401) {
      const isAuthEndpoint = url === "/api/login" || url === "/api/register";
      if (!isAuthEndpoint) {
        dispatchSessionExpired();
      }
      if (isAuthEndpoint) {
        const text = (await res.text()) || "Authentication failed";
        throw new Error(text);
      }
      throw new SessionExpiredError();
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
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
