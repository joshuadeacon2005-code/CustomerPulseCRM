/**
 * Security Middleware for CRM Application
 * 
 * Implements OWASP best practices for:
 * - Rate limiting (IP + user-based)
 * - Input validation and sanitization
 * - Security headers
 * 
 * @see https://owasp.org/www-project-web-security-testing-guide/
 */

import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

/**
 * Disable express-rate-limit validation warnings for IPv6
 * The library's validation is overly strict for our use case
 * We handle IP properly via Express's trust proxy setting in index.ts
 */
const commonRateLimitOptions = {
  validate: false as const,
};

/**
 * Extract client identifier for rate limiting
 * Priority: user ID > session ID > IP address
 * This ensures consistent throttling even before passport fully deserializes the user
 */
function getClientIdentifier(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const userId = (req as any).user?.id;
  const sessionId = (req as any).session?.id || (req as any).sessionID;
  
  // For fully authenticated users (session deserialized), use user ID
  if (userId) {
    return `user:${userId}:${ip}`;
  }
  
  // For requests with a session but user not yet deserialized, use session ID
  // This provides consistent limiting for the same session across requests
  if (sessionId) {
    return `session:${sessionId}:${ip}`;
  }
  
  // Fallback to IP-only for completely unauthenticated requests
  return `ip:${ip}`;
}

/**
 * Standard 429 error response following REST best practices
 */
function rateLimitHandler(_req: Request, res: Response): void {
  res.status(429).json({
    error: "Too Many Requests",
    message: "You have exceeded the rate limit. Please try again later.",
    retryAfter: res.getHeader("Retry-After"),
  });
}

/**
 * General API rate limiter
 * 100 requests per minute for authenticated endpoints
 */
export const apiRateLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 60 * 1000, // 1 minute window
  max: 100, // 100 requests per window
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  keyGenerator: getClientIdentifier,
  handler: rateLimitHandler,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/api/health";
  },
  message: {
    error: "Too Many Requests",
    message: "Rate limit exceeded. Please slow down.",
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per minute to prevent brute force attacks
 */
export const authRateLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 60 * 1000, // 1 minute window
  max: 5, // Only 5 attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // For auth endpoints, use IP + username attempt for better granularity
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const username = req.body?.username || "unknown";
    return `auth:${ip}:${username}`;
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Too Many Login Attempts",
      message: "Too many login attempts. Please wait before trying again.",
      retryAfter: res.getHeader("Retry-After"),
    });
  },
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Rate limiter for registration endpoint
 * 3 registrations per hour per IP to prevent spam
 */
export const registrationRateLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 3, // Only 3 registrations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    return `register:${ip}`;
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Registration Limit Exceeded",
      message: "Too many registration attempts. Please try again later.",
      retryAfter: res.getHeader("Retry-After"),
    });
  },
});

/**
 * Rate limiter for AI/OpenAI endpoints
 * 20 requests per minute to manage API costs
 */
export const aiRateLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 60 * 1000, // 1 minute window
  max: 20, // 20 AI requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "AI Request Limit Exceeded",
      message: "Too many AI requests. Please wait before making more requests.",
      retryAfter: res.getHeader("Retry-After"),
    });
  },
});

/**
 * Rate limiter for file upload endpoints
 * 10 uploads per hour per user
 */
export const uploadRateLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // 10 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Upload Limit Exceeded",
      message: "Too many file uploads. Please try again later.",
      retryAfter: res.getHeader("Retry-After"),
    });
  },
});

// ============================================================================
// SECURITY HEADERS (via Helmet)
// ============================================================================

/**
 * Security headers middleware using Helmet
 * Configured for CRM application requirements
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for Vite HMR in dev
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for inline styles
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for some external resources
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});

// ============================================================================
// INPUT VALIDATION AND SANITIZATION
// ============================================================================

/**
 * Common validation patterns for input sanitization
 */
export const ValidationPatterns = {
  // Max lengths for common fields (OWASP recommendation)
  NAME_MAX_LENGTH: 255,
  EMAIL_MAX_LENGTH: 320, // RFC 5321 maximum
  PHONE_MAX_LENGTH: 50,
  ADDRESS_MAX_LENGTH: 1000,
  NOTES_MAX_LENGTH: 10000,
  URL_MAX_LENGTH: 2048,
  
  // ID format validation
  UUID_PATTERN: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  
  // Safe string pattern (no control characters)
  SAFE_STRING_PATTERN: /^[\x20-\x7E\u00A0-\u024F\u0400-\u04FF\u4E00-\u9FFF\u3000-\u303F\uFF00-\uFFEF\s]*$/,
};

/**
 * Schema for validating UUID path parameters
 */
export const uuidParamSchema = z.object({
  id: z.string().regex(ValidationPatterns.UUID_PATTERN, "Invalid ID format"),
});

/**
 * Schema for validating common query parameters
 */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

/**
 * Sanitize string input by removing dangerous control characters
 * Preserves newlines and tabs for legitimate multi-line text inputs
 * Trims leading/trailing whitespace by default (safe for most inputs)
 * 
 * @param input - The string to sanitize
 * @param options - Optional settings (trim: whether to trim whitespace, default true)
 */
export function sanitizeString(
  input: string | undefined | null,
  options: { trim?: boolean } = {}
): string {
  if (!input) return "";
  
  const { trim = true } = options;
  
  let result = input
    // Remove null bytes (security risk)
    .replace(/\0/g, "")
    // Remove control characters EXCEPT newlines (\n \r), tabs (\t), and form feeds
    // This preserves legitimate multi-line text in notes, addresses, etc.
    .replace(/[\x00-\x08\x0B\x0E-\x1F\x7F]/g, "");
  
  if (trim) {
    result = result.trim();
  }
  
  return result;
}

/**
 * Middleware to sanitize all string fields in request body
 * Prevents injection attacks by cleaning malicious characters
 */
export function sanitizeRequestBody(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Recursively sanitize all string values in an object
 */
function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip null/undefined
    if (value === null || value === undefined) {
      sanitized[key] = value;
      continue;
    }
    
    // Sanitize strings
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
      continue;
    }
    
    // Recursively sanitize arrays
    if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => {
        if (typeof item === "string") return sanitizeString(item);
        if (typeof item === "object" && item !== null) return sanitizeObject(item);
        return item;
      });
      continue;
    }
    
    // Recursively sanitize nested objects
    if (typeof value === "object") {
      sanitized[key] = sanitizeObject(value);
      continue;
    }
    
    // Keep other types as-is
    sanitized[key] = value;
  }
  
  return sanitized;
}

/**
 * Middleware to validate and reject requests with unexpected fields
 * Creates a strict validator based on an allowed field list
 */
export function createStrictBodyValidator(allowedFields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.body || typeof req.body !== "object") {
      next();
      return;
    }
    
    const unexpectedFields = Object.keys(req.body).filter(
      (field) => !allowedFields.includes(field)
    );
    
    if (unexpectedFields.length > 0) {
      res.status(400).json({
        error: "Invalid Request",
        message: `Unexpected fields in request: ${unexpectedFields.join(", ")}`,
      });
      return;
    }
    
    next();
  };
}

/**
 * Validate UUID path parameter
 */
export function validateUuidParam(paramName: string = "id") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const paramValue = req.params[paramName];
    
    if (!paramValue) {
      res.status(400).json({
        error: "Invalid Request",
        message: `Missing required parameter: ${paramName}`,
      });
      return;
    }
    
    if (!ValidationPatterns.UUID_PATTERN.test(paramValue)) {
      res.status(400).json({
        error: "Invalid Request",
        message: `Invalid ${paramName} format`,
      });
      return;
    }
    
    next();
  };
}

/**
 * Middleware to enforce request body size limits
 * Prevents denial-of-service via oversized payloads
 */
export function enforceBodySizeLimit(maxSizeBytes: number = 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    
    if (contentLength > maxSizeBytes) {
      res.status(413).json({
        error: "Payload Too Large",
        message: `Request body exceeds maximum size of ${Math.round(maxSizeBytes / 1024)}KB`,
      });
      return;
    }
    
    next();
  };
}

// ============================================================================
// SECURITY AUDIT LOGGING
// ============================================================================

/**
 * Log security-relevant events for monitoring
 */
export function logSecurityEvent(
  eventType: "rate_limit" | "validation_error" | "auth_failure" | "suspicious_activity",
  details: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    eventType,
    ...details,
  };
  
  // In production, this would send to a security monitoring service
  console.log(`[SECURITY] ${JSON.stringify(logEntry)}`);
}

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

/**
 * Validate that required environment variables are set
 * Call this at application startup
 */
export function validateEnvironment(): void {
  const requiredVars = ["SESSION_SECRET", "DATABASE_URL"];
  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
      "Please configure these before starting the application."
    );
  }
  
  // Warn about weak session secret in production
  if (
    process.env.NODE_ENV === "production" &&
    process.env.SESSION_SECRET &&
    process.env.SESSION_SECRET.length < 32
  ) {
    console.warn(
      "[SECURITY WARNING] SESSION_SECRET should be at least 32 characters in production"
    );
  }
}
