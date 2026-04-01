import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as DbUser, insertUserSchema } from "@shared/schema";
import { getCurrencyForRegionalOffice } from "@shared/currency-mapping";
import {
  authRateLimiter,
  registrationRateLimiter,
  logSecurityEvent,
} from "./security";

declare global {
  namespace Express {
    interface User extends DbUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    rolling: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: "auto" as any,
      sameSite: "lax",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsernameOrEmail(username);
        if (!user) {
          return done(null, false, { message: "No account found with this username or email. Please check your credentials or register a new account." });
        }
        if (!(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Incorrect password. Please try again." });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      // Return false instead of propagating the error so a stale/invalid
      // session never crashes the app — the user will just be treated as
      // unauthenticated and redirected to login.
      done(null, false);
    }
  });

  // Apply rate limiting to registration endpoint (3 attempts per hour per IP)
  app.post("/api/register", registrationRateLimiter, async (req, res, next) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        // Log potential enumeration attempt
        logSecurityEvent("auth_failure", {
          type: "registration_username_exists",
          username: validatedData.username,
          ip: req.ip,
        });
        return res.status(400).send("Username already exists");
      }

      // Security: Public registration is restricted to salesman role only
      // CEO, Sales Director, and Regional Manager accounts must be created by Sales Directors via /api/admin/users
      // Auto-assign currency based on regional office
      const preferredCurrency = getCurrencyForRegionalOffice(validatedData.regionalOffice);
      const user = await storage.createUser({
        ...validatedData,
        role: "salesman",
        preferredCurrency,
        password: await hashPassword(validatedData.password),
      });

      const userWithoutPassword = { ...user };
      delete (userWithoutPassword as any).password;

      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid user data", details: error });
      }
      next(error);
    }
  });

  app.post("/api/admin/users", isAdmin, async (req, res, next) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Auto-assign currency based on regional office (ignore client-supplied value)
      delete (validatedData as any).preferredCurrency;
      const preferredCurrency = getCurrencyForRegionalOffice(validatedData.regionalOffice);
      const user = await storage.createUser({
        ...validatedData,
        preferredCurrency,
        password: await hashPassword(validatedData.password),
      });

      const userWithoutPassword = { ...user };
      delete (userWithoutPassword as any).password;

      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid user data", details: error });
      }
      next(error);
    }
  });

  app.put("/api/admin/users/:id", isAdmin, async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Validate update data with partial schema (all fields optional)
      const validatedData = insertUserSchema.partial().parse(req.body);

      // Explicitly handle managerId null values (Zod might strip them)
      if ('managerId' in req.body && req.body.managerId === null) {
        validatedData.managerId = null as any;
      }

      // Check if username is being changed and if it conflicts with another user
      if (validatedData.username) {
        const existingUser = await storage.getUserByUsername(validatedData.username);
        if (existingUser && existingUser.id !== id) {
          return res.status(400).send("Username already exists");
        }
      }

      // Hash password if it's being updated
      if (validatedData.password) {
        validatedData.password = await hashPassword(validatedData.password);
      }

      // Auto-update currency when regional office changes (ignore client-supplied preferredCurrency)
      delete (validatedData as any).preferredCurrency;
      if (validatedData.regionalOffice !== undefined) {
        (validatedData as any).preferredCurrency = getCurrencyForRegionalOffice(validatedData.regionalOffice);
      }

      const updatedUser = await storage.updateUser(id, validatedData);
      if (!updatedUser) {
        return res.status(404).send("User not found");
      }

      const userWithoutPassword = { ...updatedUser };
      delete (userWithoutPassword as any).password;

      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid user data", details: error });
      }
      next(error);
    }
  });

  // Apply strict rate limiting to login endpoint (5 attempts per minute)
  app.post("/api/login", authRateLimiter, (req, res, next) => {
    passport.authenticate("local", (err: any, user: DbUser | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        // Log failed login attempt for security monitoring
        logSecurityEvent("auth_failure", {
          type: "login_failed",
          username: req.body?.username,
          ip: req.ip,
          reason: info?.message || "Unknown",
        });
        return res.status(401).send(info?.message || "Authentication failed");
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Explicitly save the session before responding
        req.session.save((err) => {
          if (err) return next(err);
          
          const userWithoutPassword = { ...user };
          delete (userWithoutPassword as any).password;
          res.status(200).json(userWithoutPassword);
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = { ...req.user } as any;
    delete user.password;
    res.json(user);
  });
}

export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.sendStatus(401);
}

// Role hierarchy helper - maps variations to canonical lowercase roles
export function getEffectiveRole(role: string): string {
  return role?.toLowerCase() || "";
}

// Admin access: CEO, Directors, Regional Managers, Managers
export function isAdmin(req: any, res: any, next: any) {
  const userRole = getEffectiveRole(req.user?.role || "");
  if (req.isAuthenticated() && (userRole === "ceo" || userRole === "sales_director" || userRole === "marketing_director" || userRole === "admin" || userRole === "regional_manager" || userRole === "manager")) {
    return next();
  }
  res.status(403).send("Forbidden: Admin access required");
}

// CEO/Director access: CEO, Sales Director, Marketing Director
export function isCEO(req: any, res: any, next: any) {
  const userRole = getEffectiveRole(req.user?.role || "");
  if (req.isAuthenticated() && (userRole === "ceo" || userRole === "sales_director" || userRole === "marketing_director" || userRole === "admin")) {
    return next();
  }
  res.status(403).send("Forbidden: CEO/Director access required");
}

// Manager access: Directors, Regional Managers, Managers (and CEO)
export function isManager(req: any, res: any, next: any) {
  const userRole = getEffectiveRole(req.user?.role || "");
  if (req.isAuthenticated() && (userRole === "ceo" || userRole === "sales_director" || userRole === "marketing_director" || userRole === "admin" || userRole === "regional_manager" || userRole === "manager")) {
    return next();
  }
  res.status(403).send("Forbidden: Manager access required");
}
