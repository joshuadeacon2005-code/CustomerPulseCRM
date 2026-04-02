import { generateAuthHeader, getNsCredentials } from "./netsuite-auth";

class Semaphore {
  private count: number;
  private queue: Array<() => void> = [];

  constructor(count: number) {
    this.count = count;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.count > 0) {
        this.count--;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release(): void {
    this.count++;
    const next = this.queue.shift();
    if (next) {
      this.count--;
      next();
    }
  }
}

const semaphore = new Semaphore(5);

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
    }
  }
  throw new Error("Unreachable");
}

export async function nsRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<any> {
  const creds = getNsCredentials();
  if (!creds) throw new Error("NetSuite credentials not configured");

  const url = `${creds.baseUrl}${path}`;
  const authHeader = generateAuthHeader(method, url, creds);

  await semaphore.acquire();
  try {
    return await withRetry(async () => {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
          Prefer: "transient",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`NetSuite ${method} ${path} → ${res.status}: ${text}`);
      }

      const text = await res.text();
      return text ? JSON.parse(text) : null;
    });
  } finally {
    semaphore.release();
  }
}

export async function runSuiteQL(query: string): Promise<any[]> {
  const result = await nsRequest("POST", "/query/v1/suiteql", { q: query });
  return result?.items ?? [];
}

export const nsGet = (path: string) => nsRequest("GET", path);
export const nsPost = (path: string, body: unknown) => nsRequest("POST", path, body);
export const nsPatch = (path: string, body: unknown) => nsRequest("PATCH", path, body);
