import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, updateCustomerSchema, insertInteractionSchema, updateInteractionSchema, insertSaleSchema, insertSaleSchemaRefined, insertBrandSchema, insertCustomerBrandSchema, insertMonthlyTargetSchema, insertMonthlyTargetSchemaRefined, updateMonthlyTargetSchema, insertActionItemSchema, updateActionItemSchema, insertMonthlySalesTrackingSchema, insertMonthlySalesTrackingSchemaRefined, updateMonthlySalesTrackingSchema, insertCustomerMonthlyTargetSchema, insertCustomerMonthlyTargetSchemaRefined, type UserRole, type CustomerWithBrands } from "@shared/schema";
import { setupAuth, isAuthenticated, isAdmin, getEffectiveRole } from "./auth";
import { randomBytes } from "crypto";
import { z } from "zod";
import * as XLSX from "xlsx";
import multer from "multer";
import OpenAI from "openai";
import { aiRateLimiter, uploadRateLimiter, validateUuidParam, apiRateLimiter } from "./security";

// Initialize OpenAI client with Replit AI Integrations
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Configure multer for file uploads (in-memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    // Accept only Excel files
    const allowedMimeTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/)) {
      cb(null, true);
    } else {
      // Reject invalid file types - multer will pass the error to the route handler
      (cb as any)(new Error('Invalid file type'), false);
    }
  }
});

// Currency validation helper
async function validateAndConvertToBase(
  amount: number,
  currency: string
): Promise<number> {
  // If already in base currency (USD), return as-is
  if (currency === "USD") {
    return amount;
  }

  // Fetch exchange rate from currency to USD
  const exchangeRate = await storage.getExchangeRate(currency, "USD");
  
  if (!exchangeRate) {
    throw new Error(`Exchange rate not found for ${currency} to USD`);
  }

  // Convert to base currency (USD) and round to 2 decimal places
  const rateValue = typeof exchangeRate.rate === 'string' ? parseFloat(exchangeRate.rate) : exchangeRate.rate;
  return Math.round(amount * rateValue * 100) / 100;
}

// Validate that provided baseCurrencyAmount matches calculated conversion
function validateBaseCurrencyAmount(
  amount: number,
  currency: string,
  providedBaseAmount: number,
  calculatedBaseAmount: number
): void {
  // Allow small rounding differences (within 0.01)
  const tolerance = 0.01;
  const difference = Math.abs(providedBaseAmount - calculatedBaseAmount);
  
  if (difference > tolerance) {
    throw new Error(
      `Base currency amount mismatch: provided ${providedBaseAmount}, ` +
      `calculated ${calculatedBaseAmount} for ${amount} ${currency}`
    );
  }
}

type CurrencyCode = "USD" | "HKD" | "SGD" | "CNY" | "AUD" | "IDR" | "MYR" | "NZD";

async function getUserDefaultCurrency(userId: string): Promise<CurrencyCode> {
  const user = await storage.getUser(userId);
  if (user?.regionalOffice) {
    const { getCurrencyForRegionalOffice } = await import("@shared/currency-mapping");
    const officeCurrency = getCurrencyForRegionalOffice(user.regionalOffice);
    if (officeCurrency && officeCurrency !== 'USD') {
      return officeCurrency as CurrencyCode;
    }
  }
  if (user?.preferredCurrency && user.preferredCurrency !== 'USD') {
    return user.preferredCurrency as CurrencyCode;
  }
  const assignments = await storage.getUserOfficeAssignments(userId);
  for (const assignment of assignments) {
    if (assignment.officeCurrency && assignment.officeCurrency !== 'USD') {
      return assignment.officeCurrency as CurrencyCode;
    }
  }
  return "HKD";
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication first (session, passport)
  setupAuth(app);
  
  // Apply general rate limiting AFTER auth so user-based limiting works
  // This ensures req.user is populated for authenticated requests
  app.use("/api", apiRateLimiter);
  
  app.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const customersWithBrands = await storage.getCustomers(req.user!.id, req.user!.role as UserRole);
      res.json(customersWithBrands);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const customer = await storage.getCustomerWithDetails(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer details:", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", isAuthenticated, async (req, res) => {
    try {
      // Check if request includes additional contacts (new format)
      const hasContacts = req.body.customer && Array.isArray(req.body.contacts);
      const customerPayload = hasContacts ? req.body.customer : req.body;
      
      const validatedData = insertCustomerSchema.parse(customerPayload);
      
      // Check for duplicate customer using a lightweight direct query instead of loading all customers
      const existingCustomers = await storage.findCustomerByNameAndCountry(
        validatedData.name,
        validatedData.country
      );
      
      if (existingCustomers) {
        return res.status(409).json({ 
          error: 'Customer with this name and region already exists',
          existingCustomerId: existingCustomers.id
        });
      }
      
      // Use provided assignedTo if present, otherwise assign to current user
      const customerData = {
        ...validatedData,
        assignedTo: validatedData.assignedTo || req.user!.id
      };
      
      const customer = await storage.createCustomer(customerData);
      
      // Create additional contacts if provided
      if (hasContacts && req.body.contacts.length > 0) {
        const { insertCustomerContactSchema } = await import("@shared/schema");
        
        for (const contact of req.body.contacts) {
          const validatedContact = insertCustomerContactSchema.parse({
            ...contact,
            customerId: customer.id,
          });
          await storage.createCustomerContact(validatedContact);
        }
      }
      
      res.status(201).json(customer);
    } catch (error: any) {
      if (error?.issues) {
        // Zod validation error - extract specific field errors
        const fieldErrors = error.issues.map((issue: any) => {
          const field = issue.path?.join('.') || 'unknown';
          return `${field}: ${issue.message}`;
        }).join('; ');
        return res.status(400).json({ 
          error: `Validation failed: ${fieldErrors}`,
          details: error.issues 
        });
      }
      console.error("Error creating customer:", error);
      res.status(500).json({ error: "Failed to create customer. Please check all required fields." });
    }
  });

  app.patch("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = updateCustomerSchema.parse(req.body);
      
      // Allow assignedTo to be updated via this endpoint
      const customer = await storage.updateCustomer(req.params.id, validatedData);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      if (error?.issues) {
        // Zod validation error - extract specific field errors
        const fieldErrors = error.issues.map((issue: any) => {
          const field = issue.path?.join('.') || 'unknown';
          return `${field}: ${issue.message}`;
        }).join('; ');
        return res.status(400).json({ 
          error: `Validation failed: ${fieldErrors}`,
          details: error.issues 
        });
      }
      console.error("Error updating customer:", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const customer = await storage.softDeleteCustomer(req.params.id, req.user!.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  app.delete("/api/customers/:id/hard", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const deleted = await storage.hardDeleteCustomer(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to permanently delete customer" });
    }
  });

  app.post("/api/customers/:id/assign", isAuthenticated, async (req, res) => {
    try {
      const { toUserId, reason } = req.body;
      if (!toUserId) {
        return res.status(400).json({ error: "toUserId is required" });
      }
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      const assignment = await storage.assignCustomer({
        customerId: req.params.id,
        fromUserId: customer.assignedTo || null,
        toUserId,
        assignedBy: req.user!.id,
        reason: reason || null,
      });
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning customer:", error);
      res.status(500).json({ error: "Failed to assign customer" });
    }
  });

  app.get("/api/customers/:id/assignment-history", isAuthenticated, async (req, res) => {
    try {
      const history = await storage.getCustomerAssignmentHistory(req.params.id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assignment history" });
    }
  });

  app.patch("/api/customers/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { stage, closureReason, closureReasonOther } = req.body;
      if (!stage) {
        return res.status(400).json({ error: "stage is required" });
      }
      const updateData: Record<string, any> = { stage };
      if (stage === "dormant" || stage === "closed") {
        updateData.closureDate = new Date();
        if (closureReason) updateData.closureReason = closureReason;
        if (closureReasonOther) updateData.closureReasonOther = closureReasonOther;
      } else {
        updateData.closureDate = null;
        updateData.closureReason = null;
        updateData.closureReasonOther = null;
      }
      const customer = await storage.updateCustomer(req.params.id, updateData);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer status:", error);
      res.status(500).json({ error: "Failed to update customer status" });
    }
  });

  app.post("/api/customers/bulk/status", isAuthenticated, async (req, res) => {
    try {
      const { ids, stage, closureReason, closureReasonOther } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids array is required" });
      }
      if (!stage) {
        return res.status(400).json({ error: "stage is required" });
      }
      const count = await storage.bulkUpdateCustomerStatus(ids, stage, closureReason, closureReasonOther);
      res.json({ updated: count });
    } catch (error) {
      console.error("Error bulk updating customers:", error);
      res.status(500).json({ error: "Failed to bulk update customer status" });
    }
  });

  app.post("/api/customers/bulk/delete", isAuthenticated, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids array is required" });
      }
      const count = await storage.bulkSoftDeleteCustomers(ids, req.user!.id);
      res.json({ deleted: count });
    } catch (error) {
      console.error("Error bulk deleting customers:", error);
      res.status(500).json({ error: "Failed to bulk delete customers" });
    }
  });

  app.post("/api/customers/import-closure-list/sheets", isAuthenticated, uploadRateLimiter, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheets = workbook.SheetNames.map((name, index) => {
        const ws = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);
        return { index, name, rowCount: rows.length };
      });
      res.json({ sheets });
    } catch (error) {
      console.error("Error reading Excel sheets:", error);
      res.status(500).json({ error: "Failed to read Excel file" });
    }
  });

  app.post("/api/customers/import-closure-list", isAuthenticated, uploadRateLimiter, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellStyles: true });
      const sheetIndex = req.body.sheetIndex ? parseInt(req.body.sheetIndex, 10) : 0;
      const filterColor = req.body.filterColor || ''; // 'red', 'yellow', or '' for all
      if (sheetIndex < 0 || sheetIndex >= workbook.SheetNames.length) {
        return res.status(400).json({ error: `Invalid sheet index ${sheetIndex}. File has ${workbook.SheetNames.length} sheet(s).` });
      }
      const sheetName = workbook.SheetNames[sheetIndex];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
      const wsRange = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null;
      
      const rowColors: Map<number, string> = new Map();
      if (wsRange) {
        for (let r = wsRange.s.r; r <= wsRange.e.r; r++) {
          for (let c = wsRange.s.c; c <= wsRange.e.c; c++) {
            const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
            if (cell?.s?.fgColor?.rgb) {
              const rgb = cell.s.fgColor.rgb.toUpperCase();
              if (rgb === 'FF0000' || rgb === 'FFFF0000') rowColors.set(r, 'red');
              else if (rgb === 'FFFF00' || rgb === 'FFFFFF00') rowColors.set(r, 'yellow');
              break;
            }
          }
        }
      }
      
      const hasColoredRows = rowColors.size > 0;
      
      const colorValues = Array.from(rowColors.values());
      const results = {
        matched: [] as Array<{ id: string; name: string; country?: string; reason?: string; color?: string }>,
        unmatched: [] as Array<{ name: string; country?: string; reason?: string; color?: string }>,
        hasColoredRows,
        colorSummary: hasColoredRows ? {
          red: colorValues.filter(c => c === 'red').length,
          yellow: colorValues.filter(c => c === 'yellow').length,
        } : undefined,
      };

      const findNameValue = (row: Record<string, any>): string => {
        const nameKeys = ['Customer Name', 'customer name', 'Name', 'name', 'Company', 'company', 'Account', 'account', 'Company Name', 'company name'];
        for (const key of nameKeys) {
          if (row[key] !== undefined && row[key] !== null) {
            return row[key].toString().trim();
          }
        }
        const keys = Object.keys(row);
        for (const key of keys) {
          const val = row[key];
          if (typeof val === 'string' && val.length > 2 && !['x', 'X', 'yes', 'no'].includes(val.toLowerCase())) {
            return val.trim();
          }
        }
        return '';
      }
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const dataRowIndex = i + 1; // +1 to skip header row
        const color = rowColors.get(dataRowIndex) || '';
        
        if (filterColor && color !== filterColor) continue;
        
        const name = findNameValue(row);
        const country = (row['Country'] || row['country'] || row['Region'] || row['region'] || '').toString().trim();
        const reason = (row['Reason'] || row['reason'] || row['Closure Reason'] || row['Status'] || '').toString().trim();
        
        if (!name) continue;
        
        const customer = await storage.findCustomerByNameAndCountry(name, country || undefined);
        if (customer) {
          results.matched.push({
            id: customer.id,
            name: customer.name,
            country: customer.country || undefined,
            reason: reason || undefined,
            color: color || undefined,
          });
        } else {
          results.unmatched.push({
            name,
            country: country || undefined,
            reason: reason || undefined,
            color: color || undefined,
          });
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error("Error processing closure list:", error);
      res.status(500).json({ error: "Failed to process closure list" });
    }
  });

  // Check for duplicate customers by name or email
  app.get("/api/customers/check-duplicate", isAuthenticated, async (req, res) => {
    try {
      const { name, email, excludeId } = req.query;
      
      if (!name && !email) {
        return res.status(400).json({ error: "Name or email is required" });
      }
      
      // Get all customers (use CEO role to check against all)
      const allCustomers = await storage.getCustomers(req.user!.id, 'ceo');
      
      const duplicates: Array<{ id: string; name: string; email: string | null; country: string | null; stage: string }> = [];
      
      const searchName = (name as string)?.toLowerCase().trim();
      const searchEmail = (email as string)?.toLowerCase().trim();
      
      for (const customer of allCustomers) {
        // Skip the customer being edited
        if (excludeId && customer.id === excludeId) {
          continue;
        }
        
        const customerName = customer.name.toLowerCase().trim();
        const customerEmail = customer.email?.toLowerCase().trim();
        
        // Check for name similarity (exact or starts with)
        const nameMatch = searchName && (
          customerName === searchName || 
          customerName.startsWith(searchName) ||
          searchName.startsWith(customerName)
        );
        
        // Check for email match
        const emailMatch = searchEmail && customerEmail && customerEmail === searchEmail;
        
        if (nameMatch || emailMatch) {
          duplicates.push({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            country: customer.country,
            stage: customer.stage,
          });
        }
      }
      
      res.json({
        hasDuplicates: duplicates.length > 0,
        duplicates: duplicates.slice(0, 5), // Return max 5 potential duplicates
      });
    } catch (error) {
      console.error("Error checking duplicates:", error);
      res.status(500).json({ error: "Failed to check for duplicates" });
    }
  });

  // Customer contacts routes
  app.get("/api/customers/:customerId/contacts", isAuthenticated, async (req, res) => {
    try {
      const contacts = await storage.getCustomerContacts(req.params.customerId);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer contacts" });
    }
  });

  app.post("/api/customers/:customerId/contacts", isAuthenticated, async (req, res) => {
    try {
      const { insertCustomerContactSchema } = await import("@shared/schema");
      const validatedData = insertCustomerContactSchema.parse({
        ...req.body,
        customerId: req.params.customerId,
      });
      const contact = await storage.createCustomerContact(validatedData);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid contact data", details: error });
      }
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.patch("/api/customer-contacts/:id", isAuthenticated, async (req, res) => {
    try {
      const { insertCustomerContactSchema } = await import("@shared/schema");
      const validatedData = insertCustomerContactSchema.omit({ customerId: true }).parse(req.body);
      const contact = await storage.updateCustomerContact(req.params.id, validatedData);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid contact data", details: error });
      }
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  app.delete("/api/customer-contacts/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteCustomerContact(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  // Customer addresses routes
  app.get("/api/customers/:customerId/addresses", isAuthenticated, async (req, res) => {
    try {
      const addresses = await storage.getCustomerAddresses(req.params.customerId);
      res.json(addresses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer addresses" });
    }
  });

  app.post("/api/customers/:customerId/addresses", isAuthenticated, async (req, res) => {
    try {
      const { insertCustomerAddressSchema } = await import("@shared/schema");
      const validatedData = insertCustomerAddressSchema.parse({
        ...req.body,
        customerId: req.params.customerId,
      });
      const address = await storage.createCustomerAddress(validatedData);
      res.status(201).json(address);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid address data", details: error });
      }
      res.status(500).json({ error: "Failed to create address" });
    }
  });

  app.patch("/api/customer-addresses/:id", isAuthenticated, async (req, res) => {
    try {
      const { insertCustomerAddressSchema } = await import("@shared/schema");
      const validatedData = insertCustomerAddressSchema.omit({ customerId: true }).parse(req.body);
      const address = await storage.updateCustomerAddress(req.params.id, validatedData);
      if (!address) {
        return res.status(404).json({ error: "Address not found" });
      }
      res.json(address);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid address data", details: error });
      }
      res.status(500).json({ error: "Failed to update address" });
    }
  });

  app.delete("/api/customer-addresses/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteCustomerAddress(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Address not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete address" });
    }
  });

  app.get("/api/interactions", isAuthenticated, async (_req, res) => {
    try {
      const interactions = await storage.getInteractions();
      res.json(interactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch interactions" });
    }
  });

  app.get("/api/interactions/recent", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const interactions = await storage.getRecentInteractions(limit);
      res.json(interactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent interactions" });
    }
  });

  app.post("/api/interactions", isAuthenticated, async (req, res) => {
    try {
      console.log('[Server] Creating interaction for customer:', req.body.customerId, 'Type:', req.body.type);
      const validatedData = insertInteractionSchema.parse(req.body);
      const interaction = await storage.createInteraction(validatedData);
      console.log('[Server] Interaction created successfully, ID:', interaction.id);
      
      // Update customer's lastContactDate when an interaction is logged
      if (validatedData.customerId) {
        const interactionDate = interaction.date || new Date();
        await storage.updateCustomer(validatedData.customerId, {
          lastContactDate: interactionDate
        });
        console.log('[Server] Updated lastContactDate for customer:', validatedData.customerId);
      }
      
      res.status(201).json(interaction);
    } catch (error) {
      console.error('[Server] Failed to create interaction:', error);
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid interaction data", details: error });
      }
      res.status(500).json({ error: "Failed to create interaction" });
    }
  });

  app.patch("/api/interactions/:id", isAuthenticated, validateUuidParam("id"), async (req, res) => {
    try {
      const existingInteraction = await storage.getInteractionById(req.params.id);
      if (!existingInteraction) {
        return res.status(404).json({ error: "Interaction not found" });
      }
      const validatedData = updateInteractionSchema.parse(req.body);
      const interaction = await storage.updateInteraction(req.params.id, validatedData);
      if (!interaction) {
        return res.status(404).json({ error: "Interaction not found" });
      }

      // Recalculate lastContactDate from the most recent interaction for this customer
      const customerId = existingInteraction.customerId;
      const customerInteractions = await storage.getInteractionsByCustomer(customerId);
      if (customerInteractions.length > 0) {
        const mostRecent = customerInteractions.reduce((latest, curr) => {
          const latestDate = latest.date ? new Date(latest.date) : new Date(0);
          const currDate = curr.date ? new Date(curr.date) : new Date(0);
          return currDate > latestDate ? curr : latest;
        });
        if (mostRecent.date) {
          await storage.updateCustomer(customerId, { lastContactDate: new Date(mostRecent.date) });
        }
      }

      res.json(interaction);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid interaction data", details: error });
      }
      res.status(500).json({ error: "Failed to update interaction" });
    }
  });

  app.delete("/api/interactions/:id", isAuthenticated, validateUuidParam("id"), async (req, res) => {
    try {
      const deleted = await storage.deleteInteraction(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Interaction not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete interaction" });
    }
  });

  app.get("/api/segments", isAuthenticated, async (_req, res) => {
    try {
      const segments = await storage.getSegments();
      res.json(segments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch segments" });
    }
  });

  app.get("/api/stats", isAuthenticated, async (req, res) => {
    try {
      const monthly = req.query.monthly === 'true';
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      
      const stats = await storage.getStats({ monthly, month, year });
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Brands routes
  app.get("/api/brands", isAuthenticated, async (_req, res) => {
    try {
      const brands = await storage.getBrands();
      res.json(brands);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brands" });
    }
  });

  app.post("/api/brands", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertBrandSchema.parse(req.body);
      const brand = await storage.createBrand(validatedData);
      res.status(201).json(brand);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid brand data", details: error });
      }
      res.status(500).json({ error: "Failed to create brand" });
    }
  });

  app.delete("/api/brands/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteBrand(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Brand not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete brand" });
    }
  });

  // Customer-Brand assignments routes
  app.get("/api/customers/:id/brands", isAuthenticated, async (req, res) => {
    try {
      const brands = await storage.getCustomerBrands(req.params.id);
      res.json(brands);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer brands" });
    }
  });

  app.post("/api/customers/:id/brands", isAuthenticated, async (req, res) => {
    try {
      const brandIdSchema = z.object({ brandId: z.string().min(1) });
      const validatedData = brandIdSchema.parse(req.body);
      const customerBrand = await storage.assignBrandToCustomer(req.params.id, validatedData.brandId);
      res.status(201).json(customerBrand);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid brand assignment data", details: error });
      }
      res.status(500).json({ error: "Failed to assign brand to customer" });
    }
  });

  app.delete("/api/customers/:customerId/brands/:brandId", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.removeBrandFromCustomer(req.params.customerId, req.params.brandId);
      if (!deleted) {
        return res.status(404).json({ error: "Brand assignment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to remove brand from customer" });
    }
  });

  // Monthly targets routes
  app.get("/api/targets", isAuthenticated, async (req, res) => {
    try {
      const requestingUserId = req.user!.id;
      const requestingRole = (req.user!.role || "").toLowerCase();
      const targetUserId = (req.query.userId as string) || requestingUserId;
      const adminRoles = ["ceo", "sales_director", "marketing_director", "admin", "regional_manager", "manager"];

      if (targetUserId !== requestingUserId && !adminRoles.includes(requestingRole)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const targetUser = targetUserId === requestingUserId
        ? req.user!
        : await storage.getUser(targetUserId);
      if (!targetUser) return res.status(404).json({ error: "User not found" });

      const targets = await storage.getMonthlyTargets(targetUserId, targetUser.role as UserRole);
      res.json(targets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch monthly targets" });
    }
  });

  app.post("/api/targets", isAuthenticated, async (req, res) => {
    try {
      // For personal targets, always use the current user's ID
      // For general targets, salesmanId should be null
      const targetType = req.body.targetType || "personal";
      const salesmanId = targetType === "general" ? null : (req.body.salesmanId || req.user!.id);
      
      const effectiveUserId = salesmanId || req.user!.id;
      const userCurrency = req.body.currency || await getUserDefaultCurrency(effectiveUserId);
      
      let validatedData = insertMonthlyTargetSchemaRefined.parse({
        ...req.body,
        salesmanId,
        currency: userCurrency,
      });
      
      const calculatedBaseAmount = await validateAndConvertToBase(
        Number(validatedData.targetAmount),
        validatedData.currency
      );
      
      if (validatedData.baseCurrencyAmount !== undefined) {
        validateBaseCurrencyAmount(
          Number(validatedData.targetAmount),
          validatedData.currency,
          Number(validatedData.baseCurrencyAmount),
          calculatedBaseAmount
        );
      } else {
        validatedData = { ...validatedData, baseCurrencyAmount: calculatedBaseAmount.toString() };
      }
      
      const target = await storage.createMonthlyTarget(validatedData);
      res.status(201).json(target);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid target data", details: error });
      }
      if (error instanceof Error && (error.message.includes("Exchange rate") || error.message.includes("mismatch"))) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to create monthly target" });
    }
  });

  app.patch("/api/targets/:id", isAuthenticated, async (req, res) => {
    try {
      let validatedData = updateMonthlyTargetSchema.parse(req.body);
      
      if (validatedData.targetAmount) {
        const existingTarget = await storage.getMonthlyTargetById(req.params.id);
        const currency = validatedData.currency || existingTarget?.currency || await getUserDefaultCurrency(req.user!.id);
        validatedData = { ...validatedData, currency };
        
        const calculatedBaseAmount = await validateAndConvertToBase(
          Number(validatedData.targetAmount),
          currency
        );
        validatedData = { ...validatedData, baseCurrencyAmount: calculatedBaseAmount.toString() };
      }
      
      const target = await storage.updateMonthlyTarget(req.params.id, validatedData);
      if (!target) {
        return res.status(404).json({ error: "Target not found" });
      }
      res.json(target);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid target data", details: error });
      }
      res.status(500).json({ error: "Failed to update monthly target" });
    }
  });

  // Action items routes
  app.get("/api/action-items", isAuthenticated, async (req, res) => {
    try {
      const filter = (req.query.filter as "all" | "overdue" | "today" | "upcoming") || "all";
      const actionItems = await storage.getActionItems(req.user!.id, req.user!.role as UserRole, filter);
      res.json(actionItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch action items" });
    }
  });

  app.post("/api/action-items", isAuthenticated, async (req, res) => {
    try {
      // Convert date strings to Date objects before validation
      const bodyWithDates = {
        ...req.body,
        createdBy: req.user!.id,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
        visitDate: req.body.visitDate ? new Date(req.body.visitDate) : undefined,
      };
      
      const validatedData = insertActionItemSchema.parse(bodyWithDates);
      const actionItem = await storage.createActionItem(validatedData);
      res.status(201).json(actionItem);
    } catch (error: any) {
      if (error?.issues) {
        // Zod validation error - extract specific field errors
        const fieldErrors = error.issues.map((issue: any) => {
          const field = issue.path?.join('.') || 'unknown';
          return `${field}: ${issue.message}`;
        }).join('; ');
        return res.status(400).json({ 
          error: `Validation failed: ${fieldErrors}`,
          details: error.issues 
        });
      }
      res.status(500).json({ error: "Failed to create action item. Please check all required fields." });
    }
  });

  app.patch("/api/action-items/:id", isAuthenticated, async (req, res) => {
    try {
      const parsed = updateActionItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      }
      const actionItem = await storage.updateActionItem(req.params.id, parsed.data);
      if (!actionItem) {
        return res.status(404).json({ error: "Action item not found" });
      }
      res.json(actionItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to update action item" });
    }
  });

  app.patch("/api/action-items/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const actionItem = await storage.completeActionItem(req.params.id);
      if (!actionItem) {
        return res.status(404).json({ error: "Action item not found" });
      }
      res.json(actionItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to complete action item" });
    }
  });

  // Customer monthly targets routes
  app.get("/api/customers/:customerId/targets", isAuthenticated, async (req, res) => {
    try {
      const targets = await storage.getCustomerMonthlyTargets(req.params.customerId);
      res.json(targets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer targets" });
    }
  });

  app.post("/api/customers/:customerId/targets", isAuthenticated, async (req, res) => {
    try {
      const userCurrency = req.body.currency || await getUserDefaultCurrency(req.user!.id);
      
      let validatedData = insertCustomerMonthlyTargetSchemaRefined.parse({
        ...req.body,
        customerId: req.params.customerId,
        createdBy: req.user!.id,
        currency: userCurrency,
      });
      
      const calculatedBaseAmount = await validateAndConvertToBase(
        Number(validatedData.targetAmount),
        validatedData.currency
      );
      validatedData = { ...validatedData, baseCurrencyAmount: calculatedBaseAmount.toString() };
      
      const target = await storage.createCustomerMonthlyTarget(validatedData);
      res.status(201).json(target);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid target data", details: error });
      }
      if (error instanceof Error && (error.message.includes("Exchange rate") || error.message.includes("mismatch"))) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to create customer target" });
    }
  });

  app.patch("/api/customers/:customerId/targets/:id", isAuthenticated, async (req, res) => {
    try {
      const existingTarget = await storage.getCustomerMonthlyTargetById(req.params.id);
      if (!existingTarget) {
        return res.status(404).json({ error: "Target not found" });
      }
      if (existingTarget.customerId !== req.params.customerId) {
        return res.status(404).json({ error: "Target not found" });
      }
      let validatedData = insertCustomerMonthlyTargetSchema.partial().parse(req.body);
      
      if (validatedData.targetAmount) {
        const currency = (validatedData.currency || existingTarget.currency || await getUserDefaultCurrency(req.user!.id)) as CurrencyCode;
        validatedData = { ...validatedData, currency };
        
        const calculatedBaseAmount = await validateAndConvertToBase(
          Number(validatedData.targetAmount),
          currency
        );
        validatedData = { ...validatedData, baseCurrencyAmount: calculatedBaseAmount.toString() };
      }
      
      const target = await storage.updateCustomerMonthlyTarget(req.params.id, req.params.customerId, validatedData);
      if (!target) {
        return res.status(404).json({ error: "Target not found" });
      }
      res.json(target);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid target data", details: error });
      }
      if (error instanceof Error && (error.message.includes("Exchange rate") || error.message.includes("mismatch"))) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to update customer target" });
    }
  });

  app.delete("/api/customers/:customerId/targets/:id", isAuthenticated, async (req, res) => {
    try {
      const existingTarget = await storage.getCustomerMonthlyTargetById(req.params.id);
      if (!existingTarget) {
        return res.status(404).json({ error: "Target not found" });
      }
      if (existingTarget.customerId !== req.params.customerId) {
        return res.status(404).json({ error: "Target not found" });
      }
      const success = await storage.deleteCustomerMonthlyTarget(req.params.id, req.params.customerId);
      if (!success) {
        return res.status(404).json({ error: "Target not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer target" });
    }
  });

  // Monthly sales tracking routes
  app.get("/api/monthly-sales", isAuthenticated, async (req, res) => {
    try {
      const requestingUserId = req.user!.id;
      const requestingRole = (req.user!.role || "").toLowerCase();
      const customerId = req.query.customerId as string | undefined;
      const targetUserId = (req.query.userId as string) || requestingUserId;
      const adminRoles = ["ceo", "sales_director", "marketing_director", "admin", "regional_manager", "manager"];

      if (targetUserId !== requestingUserId && !adminRoles.includes(requestingRole)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const targetUser = targetUserId === requestingUserId
        ? req.user!
        : await storage.getUser(targetUserId);
      if (!targetUser) return res.status(404).json({ error: "User not found" });

      const monthlySales = await storage.getMonthlySales(targetUserId, targetUser.role as UserRole, customerId);
      res.json(monthlySales);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch monthly sales" });
    }
  });

  app.post("/api/monthly-sales", isAuthenticated, async (req, res) => {
    try {
      let validatedData = insertMonthlySalesTrackingSchemaRefined.parse(req.body);
      
      // Ensure budgetCurrency defaults to user's regional currency if not provided
      if (!validatedData.budgetCurrency) {
        const userCurrency = await getUserDefaultCurrency(req.user!.id);
        validatedData = { ...validatedData, budgetCurrency: userCurrency };
      }
      
      // Validate and auto-calculate base amounts for actual if actualCurrency and actual are provided
      if (validatedData.actualCurrency && validatedData.actual) {
        const calculatedBaseActual = await validateAndConvertToBase(
          Number(validatedData.actual),
          validatedData.actualCurrency
        );
        
        if (validatedData.actualBaseCurrencyAmount !== undefined) {
          validateBaseCurrencyAmount(
            Number(validatedData.actual),
            validatedData.actualCurrency,
            Number(validatedData.actualBaseCurrencyAmount),
            calculatedBaseActual
          );
        } else {
          validatedData = { ...validatedData, actualBaseCurrencyAmount: calculatedBaseActual.toString() };
        }
      }
      
      // Calculate base amount for budget (now optional, defaults to 0)
      // Budget is no longer required on the form since monthly targets are tracked separately
      const budgetValue = Number(validatedData.budget || 0);
      const budgetCurrency = validatedData.budgetCurrency;
      if (budgetValue > 0) {
        const calculatedBaseBudget = await validateAndConvertToBase(budgetValue, budgetCurrency);
        if (validatedData.budgetBaseCurrencyAmount !== undefined) {
          validateBaseCurrencyAmount(
            budgetValue,
            budgetCurrency,
            Number(validatedData.budgetBaseCurrencyAmount),
            calculatedBaseBudget
          );
        } else {
          validatedData = { ...validatedData, budgetBaseCurrencyAmount: calculatedBaseBudget.toString() };
        }
      } else {
        // Budget is 0 or not provided, set defaults
        validatedData = { 
          ...validatedData, 
          budget: "0",
          budgetBaseCurrencyAmount: "0",
          budgetCurrency: budgetCurrency
        };
      }
      
      // Upsert: if a record already exists for this customer/month/year, accumulate into it
      if (validatedData.customerId && validatedData.month && validatedData.year) {
        const existing = await storage.getMonthlySalesTrackingByCustomerMonthYear(
          validatedData.customerId,
          validatedData.month,
          validatedData.year
        );
        if (existing) {
          const newActual = Number(existing.actual || 0) + Number(validatedData.actual || 0);
          const newActualBase = Number(existing.actualBaseCurrencyAmount || 0) + Number(validatedData.actualBaseCurrencyAmount || 0);
          const newBudget = Math.max(Number(existing.budget || 0), Number(validatedData.budget || 0));
          const newBudgetBase = Math.max(Number(existing.budgetBaseCurrencyAmount || 0), Number(validatedData.budgetBaseCurrencyAmount || 0));
          const updated = await storage.updateMonthlySales(existing.id, {
            actual: newActual.toFixed(2),
            actualBaseCurrencyAmount: newActualBase.toFixed(2),
            actualCurrency: validatedData.actualCurrency || existing.actualCurrency || undefined,
            budget: newBudget.toFixed(2),
            budgetBaseCurrencyAmount: newBudgetBase.toFixed(2),
            budgetCurrency: validatedData.budgetCurrency || existing.budgetCurrency || undefined,
          });
          return res.status(200).json(updated);
        }
      }

      const monthlySales = await storage.createMonthlySales(validatedData);
      res.status(201).json(monthlySales);
    } catch (error) {
      console.error("Monthly sales creation error:", error);
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid monthly sales data", details: error });
      }
      res.status(500).json({ error: "Failed to create monthly sales record" });
    }
  });

  app.patch("/api/monthly-sales/:id", isAuthenticated, async (req, res) => {
    try {
      let validatedData = updateMonthlySalesTrackingSchema.parse(req.body);
      
      // Validate and auto-calculate base amounts for actual if actualCurrency is provided
      if (validatedData.actualCurrency && validatedData.actual) {
        const calculatedBaseActual = await validateAndConvertToBase(
          Number(validatedData.actual),
          validatedData.actualCurrency
        );
        
        if (validatedData.actualBaseCurrencyAmount !== undefined) {
          validateBaseCurrencyAmount(
            Number(validatedData.actual),
            validatedData.actualCurrency,
            Number(validatedData.actualBaseCurrencyAmount),
            calculatedBaseActual
          );
        } else {
          validatedData = { ...validatedData, actualBaseCurrencyAmount: calculatedBaseActual.toString() };
        }
      }
      
      // Validate and auto-calculate base amounts for budget if budgetCurrency is provided
      if (validatedData.budgetCurrency && validatedData.budget) {
        const calculatedBaseBudget = await validateAndConvertToBase(
          Number(validatedData.budget),
          validatedData.budgetCurrency
        );
        
        if (validatedData.budgetBaseCurrencyAmount !== undefined) {
          validateBaseCurrencyAmount(
            Number(validatedData.budget),
            validatedData.budgetCurrency,
            Number(validatedData.budgetBaseCurrencyAmount),
            calculatedBaseBudget
          );
        } else {
          validatedData = { ...validatedData, budgetBaseCurrencyAmount: calculatedBaseBudget.toString() };
        }
      }
      
      const monthlySales = await storage.updateMonthlySales(req.params.id, validatedData);
      if (!monthlySales) {
        return res.status(404).json({ error: "Monthly sales record not found" });
      }
      res.json(monthlySales);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid monthly sales data", details: error });
      }
      if (error instanceof Error && (error.message.includes("Exchange rate") || error.message.includes("mismatch"))) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to update monthly sales record" });
    }
  });

  app.delete("/api/monthly-sales/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteMonthlySales(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Sales record not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete sales record" });
    }
  });

  app.post("/api/sales", isAuthenticated, async (req, res) => {
    try {
      let validatedData = insertSaleSchemaRefined.parse({
        ...req.body,
        salesmanId: req.user!.id,
      });
      
      // If currency fields are provided, validate and auto-calculate base amount if missing
      if (validatedData.currency) {
        const calculatedBaseAmount = await validateAndConvertToBase(
          Number(validatedData.amount),
          validatedData.currency
        );
        
        // If baseCurrencyAmount was provided, validate it matches
        if (validatedData.baseCurrencyAmount !== undefined) {
          validateBaseCurrencyAmount(
            Number(validatedData.amount),
            validatedData.currency,
            Number(validatedData.baseCurrencyAmount),
            calculatedBaseAmount
          );
        } else {
          // Auto-calculate if not provided
          validatedData = { ...validatedData, baseCurrencyAmount: calculatedBaseAmount.toString() };
        }
      }
      
      const sale = await storage.createSale(validatedData);
      
      // Auto-sync to monthly_sales_tracking if a matching customer exists
      try {
        // Try to find customer by name (case-insensitive match)
        const allCustomers = await storage.getCustomers(req.user!.id, req.user!.role as UserRole);
        const matchedCustomer = allCustomers.find(c => 
          c.name.toLowerCase() === validatedData.customerName.toLowerCase()
        );
        
        if (matchedCustomer) {
          // Use the submitted sale date (not today's date) for correct month/year bucketing
          const saleDate = validatedData.date instanceof Date ? validatedData.date : new Date(validatedData.date as any || Date.now());
          const saleMonth = saleDate.getMonth() + 1;
          const saleYear = saleDate.getFullYear();
          
          const saleCurrency = validatedData.currency || await getUserDefaultCurrency(req.user!.id);
          const saleAmount = Number(validatedData.amount);
          const saleAmountBase = validatedData.baseCurrencyAmount 
            ? Number(validatedData.baseCurrencyAmount) 
            : await validateAndConvertToBase(saleAmount, saleCurrency);
          
          const existingTracking = await storage.getMonthlySalesTrackingByCustomerMonthYear(
            matchedCustomer.id,
            saleMonth,
            saleYear
          );
          
          if (existingTracking) {
            const currentActual = Number(existingTracking.actual || 0);
            const currentActualBase = Number(existingTracking.actualBaseCurrencyAmount || 0);
            const existingCurrency = existingTracking.actualCurrency || saleCurrency;
            
            let newActual: number;
            let newActualBase: number;
            let finalCurrency = existingCurrency;
            
            if (existingCurrency === saleCurrency) {
              newActual = currentActual + saleAmount;
              newActualBase = currentActualBase + saleAmountBase;
            } else {
              newActualBase = currentActualBase + saleAmountBase;
              const rateRecord = await storage.getExchangeRate("USD", existingCurrency);
              if (rateRecord) {
                newActual = newActualBase * Number(rateRecord.rate);
              } else {
                newActual = currentActual + saleAmount;
                finalCurrency = saleCurrency;
              }
            }
            
            await storage.updateMonthlySales(existingTracking.id, {
              actual: newActual.toFixed(2),
              actualBaseCurrencyAmount: newActualBase.toFixed(2),
              actualCurrency: finalCurrency
            });
          } else {
            const userCurrency = await getUserDefaultCurrency(req.user!.id);
            await storage.createMonthlySales({
              customerId: matchedCustomer.id,
              month: saleMonth,
              year: saleYear,
              budget: "0",
              budgetCurrency: userCurrency,
              budgetBaseCurrencyAmount: "0",
              actual: saleAmount.toFixed(2),
              actualCurrency: saleCurrency,
              actualBaseCurrencyAmount: saleAmountBase.toFixed(2)
            });
          }
        }
      } catch (syncError) {
        // Log but don't fail the sale creation
        console.error("Failed to auto-sync sale to monthly tracking:", syncError);
      }

      // Bug #5: Update customer's lastContactDate to the sale date
      try {
        const customerId = validatedData.customerId || sale.customerId;
        if (customerId) {
          const customer = await storage.getCustomer(customerId);
          if (customer) {
            const saleDate = validatedData.date instanceof Date ? validatedData.date : new Date(validatedData.date as any || Date.now());
            if (!customer.lastContactDate || saleDate > new Date(customer.lastContactDate)) {
              await storage.updateCustomer(customerId, { lastContactDate: saleDate } as any);
            }
          }
        }
      } catch (contactErr) {
        console.error("Failed to update lastContactDate after sale:", contactErr);
      }
      
      res.status(201).json(sale);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid sale data", details: error });
      }
      if (error instanceof Error && error.message.includes("Exchange rate")) {
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof Error && error.message.includes("mismatch")) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to create sale" });
    }
  });

  app.get("/api/sales", isAuthenticated, async (req, res) => {
    try {
      if (req.user!.role === "ceo" || req.user!.role === "sales_director" || req.user!.role === "marketing_director" || req.user!.role === "regional_manager" || req.user!.role === "manager") {
        const sales = await storage.getSales(req.user!.id, req.user!.role as UserRole);
        res.json(sales);
      } else {
        const sales = await storage.getSalesBySalesman(req.user!.id);
        res.json(sales);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  app.get("/api/admin/stats", isAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats(req.user!.id, req.user!.role as UserRole);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/admin/revenue-breakdown", isAdmin, async (req, res) => {
    try {
      const userCurrency = req.user?.preferredCurrency || "HKD";
      const breakdown = await storage.getRevenueBreakdownByCountry(
        req.user!.id, 
        req.user!.role as UserRole,
        userCurrency
      );
      res.json(breakdown);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch revenue breakdown" });
    }
  });

  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getUsers(req.user!.id, req.user!.role as UserRole);
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/user/currency", isAuthenticated, async (req, res) => {
    try {
      const { currency } = req.body;
      
      if (!currency) {
        return res.status(400).json({ error: "Currency is required" });
      }
      
      const updatedUser = await storage.updateUser(req.user!.id, { preferredCurrency: currency });
      
      if (updatedUser) {
        const { password, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error("Error updating user currency:", error);
      res.status(500).json({ error: "Failed to update currency preference" });
    }
  });

  app.delete("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteUser(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.post("/api/users/bulk-delete", isAdmin, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Invalid request: ids must be a non-empty array" });
      }
      const deletedCount = await storage.deleteUsers(ids);
      res.json({ success: true, deletedCount });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete users" });
    }
  });

  app.get("/api/admin/user-details/:userId", isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const userDetails = await storage.getUserDetails(req.user!.id, req.user!.role as UserRole, userId);
      if (!userDetails) {
        return res.status(404).json({ error: "User not found or unauthorized" });
      }
      res.json(userDetails);
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  });

  app.get("/api/admin/user-details/:userId/customer-targets", isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const customers = await storage.getCustomers(userId, "salesman");
      const customerIds = customers.map((c: { id: string }) => c.id);
      const targets = await storage.getCustomerMonthlyTargetsByCustomerIds(customerIds);
      res.json({ customers, targets });
    } catch (error) {
      console.error("Error fetching user customer targets:", error);
      res.status(500).json({ error: "Failed to fetch customer targets" });
    }
  });

  // Customer monthly targets for dashboard (accessible by all authenticated users)
  app.get("/api/customer-targets", isAuthenticated, async (req, res) => {
    try {
      const requestingUserId = req.user!.id;
      const requestingRole = (req.user!.role || "").toLowerCase();
      const targetUserId = (req.query.userId as string) || requestingUserId;
      const adminRoles = ["ceo", "sales_director", "marketing_director", "admin", "regional_manager", "manager"];
      if (!adminRoles.includes(requestingRole) && targetUserId !== requestingUserId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const customers = await storage.getCustomers(targetUserId, "salesman");
      const customerIds = customers.map((c: { id: string }) => c.id);
      const targets = await storage.getCustomerMonthlyTargetsByCustomerIds(customerIds);
      res.json(targets);
    } catch (error) {
      console.error("Error fetching customer targets:", error);
      res.status(500).json({ error: "Failed to fetch customer targets" });
    }
  });

  app.patch("/api/sales/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const requestingUser = req.user as any;

      // Fetch the sale to check ownership
      const existingSales = await storage.getSales(requestingUser.id, requestingUser.role);
      const targetSale = existingSales.find((s: any) => s.id === id);

      // Admins can edit any sale; salesmen can only edit their own
      const isAdminRole = ["ceo", "sales_director", "marketing_director", "admin", "regional_manager", "manager"].includes(requestingUser.role?.toLowerCase());
      if (!isAdminRole && (!targetSale || targetSale.salesmanId !== requestingUser.id)) {
        return res.status(403).json({ error: "You can only edit your own sales" });
      }

      const updateData = { ...req.body };

      // Convert and validate date string to Date object if present
      if (updateData.date && typeof updateData.date === 'string') {
        const dateObj = new Date(updateData.date);
        if (isNaN(dateObj.getTime())) {
          return res.status(400).json({ error: "Invalid date format" });
        }
        updateData.date = dateObj;
      }

      const sale = await storage.updateSale(id, updateData);
      if (sale) {
        res.json(sale);
      } else {
        res.status(404).json({ error: "Sale not found" });
      }
    } catch (error) {
      console.error("Error updating sale:", error);
      res.status(500).json({ error: "Failed to update sale" });
    }
  });

  app.delete("/api/sales/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteSale(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Sale not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete sale" });
    }
  });

  app.get("/api/admin/user-details/:userId", isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserRole = req.user!.role as UserRole;
      
      // Check if current user has permission to view this user's details
      const canView = await storage.canViewUserDetails(req.user!.id, userId, currentUserRole);
      if (!canView) {
        return res.status(403).json({ error: "You don't have permission to view this user's details" });
      }

      const userDetails = await storage.getUserDetails(req.user!.id, currentUserRole, userId);
      if (!userDetails) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(userDetails);
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  });

  // Basecamp OAuth Routes
  app.post("/api/basecamp/auth", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Generate cryptographically secure random state for CSRF protection
      const state = randomBytes(32).toString("hex");
      
      // Store state with 10-minute expiry
      await storage.createOauthState({
        state,
        userId,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      
      // Construct Basecamp authorization URL
      const clientId = process.env.BASECAMP_CLIENT_ID;
      const redirectUri = `${req.protocol}://${req.get("host")}/api/basecamp/callback`;
      
      const authUrl = `https://launchpad.37signals.com/authorization/new?` +
        `type=web_server&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      
      res.json({ authUrl });
    } catch (error) {
      console.error("Error initiating Basecamp auth:", error);
      res.status(500).json({ error: "Failed to start OAuth flow" });
    }
  });

  app.get("/api/basecamp/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state || typeof code !== "string" || typeof state !== "string") {
        return res.status(400).send("Missing authorization code or state");
      }
      
      // Verify state for CSRF protection
      const stateRecord = await storage.verifyOauthState(state);
      if (!stateRecord) {
        return res.status(400).send("Invalid or expired state");
      }
      
      // Delete used state (one-time use)
      await storage.deleteOauthState(state);
      
      // Exchange code for access token
      const clientId = process.env.BASECAMP_CLIENT_ID;
      const clientSecret = process.env.BASECAMP_CLIENT_SECRET;
      const redirectUri = `${req.protocol}://${req.get("host")}/api/basecamp/callback`;
      
      const tokenResponse = await fetch("https://launchpad.37signals.com/authorization/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          type: "web_server",
          client_id: clientId!,
          redirect_uri: redirectUri,
          client_secret: clientSecret!,
          code,
        }),
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token exchange failed:", errorText);
        return res.status(500).send("Failed to exchange authorization code");
      }
      
      const tokenData = await tokenResponse.json();
      const { access_token, expires_in } = tokenData;
      
      // Get user's Basecamp account info
      const authResponse = await fetch("https://launchpad.37signals.com/authorization.json", {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "Bloom & Grow CRM (contact@bloomgrow.com)",
        },
      });
      
      if (!authResponse.ok) {
        console.error("Failed to fetch Basecamp account info");
        return res.status(500).send("Failed to get Basecamp account info");
      }
      
      const authData = await authResponse.json();
      const basecampUserId = authData.identity.id.toString();
      const basecampAccountId = authData.accounts[0]?.id.toString() || "";
      
      // Store or update connection
      const existingConnection = await storage.getBasecampConnection(stateRecord.userId);
      const expiresAt = new Date(Date.now() + expires_in * 1000);
      
      if (existingConnection) {
        await storage.updateBasecampConnection(stateRecord.userId, {
          accessToken: access_token,
          expiresAt,
          basecampUserId,
          basecampAccountId,
        });
      } else {
        await storage.createBasecampConnection({
          userId: stateRecord.userId,
          accessToken: access_token,
          expiresAt,
          basecampUserId,
          basecampAccountId,
        });
      }
      
      // Redirect to tasks page
      res.redirect("/tasks");
    } catch (error) {
      console.error("Error in Basecamp callback:", error);
      res.status(500).send("OAuth callback failed");
    }
  });

  app.get("/api/basecamp/connection", isAuthenticated, async (req, res) => {
    try {
      const connection = await storage.getBasecampConnection(req.user!.id);
      
      if (!connection) {
        return res.json({ connected: false });
      }
      
      // Check if token is expired
      const isExpired = new Date() >= connection.expiresAt;
      
      res.json({
        connected: !isExpired,
        basecampUserId: connection.basecampUserId,
        basecampAccountId: connection.basecampAccountId,
        expiresAt: connection.expiresAt,
      });
    } catch (error) {
      console.error("Error fetching Basecamp connection:", error);
      res.status(500).json({ error: "Failed to fetch connection status" });
    }
  });

  app.delete("/api/basecamp/disconnect", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteBasecampConnection(req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting Basecamp:", error);
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  app.get("/api/basecamp/projects", isAuthenticated, async (req, res) => {
    try {
      const connection = await storage.getBasecampConnection(req.user!.id);
      
      if (!connection) {
        return res.status(401).json({ error: "Not connected to Basecamp" });
      }
      
      // Fetch projects from Basecamp API (Basecamp 4 uses bc3-api)
      const projectsResponse = await fetch(
        `https://3.basecampapi.com/${connection.basecampAccountId}/projects.json`,
        {
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            "User-Agent": "Bloom & Grow CRM (contact@bloomgrow.com)",
          },
        }
      );
      
      if (!projectsResponse.ok) {
        return res.status(500).json({ error: "Failed to fetch projects from Basecamp" });
      }
      
      const projects = await projectsResponse.json();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching Basecamp projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  // CSV import schema validation
  const csvTodoSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    dueDate: z.string().optional().nullable(),
    type: z.enum(["visit", "call"]).optional(),
  });

  const csvImportSchema = z.object({
    todos: z.array(csvTodoSchema).min(1, "At least one todo is required"),
    customerId: z.string().min(1, "Customer ID is required"),
  });

  // Simple CSV import endpoint for todos
  app.post("/api/todos/import-csv", isAuthenticated, async (req, res) => {
    try {
      const validationResult = csvImportSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: validationResult.error.flatten() 
        });
      }
      
      const { todos, customerId } = validationResult.data;
      
      // Verify the customer belongs to the user
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      // Check if user has access to this customer
      const userCustomers = await storage.getCustomers(req.user!.id, req.user!.role as UserRole);
      const hasAccess = userCustomers.some(c => c.id === customerId);
      if (!hasAccess) {
        return res.status(403).json({ error: "You don't have access to this customer" });
      }
      
      let imported = 0;
      let skipped = 0;
      
      for (const todo of todos) {
        try {
          const actionItemData: any = {
            createdBy: req.user!.id,
            customerId,
            description: todo.title.trim() + (todo.description ? `\n${todo.description.trim()}` : ""),
          };

          // Map type to visitDate or dueDate with validation
          if (todo.dueDate) {
            const parsedDate = new Date(todo.dueDate);
            if (isNaN(parsedDate.getTime())) {
              console.error(`Invalid date format: ${todo.dueDate}`);
              skipped++;
              continue;
            }
            
            if (todo.type === "visit") {
              actionItemData.visitDate = parsedDate;
            } else {
              actionItemData.dueDate = parsedDate;
            }
          }

          await storage.createActionItem(actionItemData);
          imported++;
        } catch (error) {
          console.error("Error importing todo:", error);
          skipped++;
        }
      }
      
      res.json({ imported, skipped });
    } catch (error) {
      console.error("Error in CSV import:", error);
      res.status(500).json({ error: "Failed to import todos" });
    }
  });

  app.post("/api/basecamp/todos", isAuthenticated, async (req, res) => {
    try {
      console.log("=== BASECAMP TODOS ENDPOINT CALLED ===");
      const { projectIds } = req.body;
      console.log("Project IDs received:", projectIds);
      
      if (!projectIds || !Array.isArray(projectIds)) {
        console.log("ERROR: Invalid project IDs");
        return res.status(400).json({ error: "Invalid project IDs" });
      }
      
      const connection = await storage.getBasecampConnection(req.user!.id);
      
      if (!connection) {
        console.log("ERROR: No Basecamp connection found");
        return res.status(401).json({ error: "Not connected to Basecamp" });
      }
      
      console.log("Basecamp connection found, account ID:", connection.basecampAccountId);
      
      const allTodos = [];
      const debugInfo: any = {
        projectsChecked: [],
        totalListsFound: 0,
        totalTodosFound: 0,
      };
      
      // Try BOTH modern and classic Basecamp API patterns
      for (const projectId of projectIds) {
        console.log(`\n=== Processing project ${projectId} ===`);
        const projectDebug: any = { projectId, method: null, lists: [] };
        let todolists: any[] = [];
        
        // METHOD 1: Try modern Basecamp 4 recordings endpoint first
        console.log(`Trying modern API: /buckets/${projectId}/recordings.json?type=TodoList`);
        const recordingsResponse = await fetch(
          `https://3.basecampapi.com/${connection.basecampAccountId}/buckets/${projectId}/recordings.json?type=TodoList`,
          {
            headers: {
              Authorization: `Bearer ${connection.accessToken}`,
              "User-Agent": "Bloom & Grow CRM (contact@bloomgrow.com)",
            },
          }
        );
        
        console.log(`Recordings response status: ${recordingsResponse.status}`);
        
        if (recordingsResponse.ok) {
          todolists = await recordingsResponse.json();
          console.log(`✅ Modern API worked! Found ${todolists.length} todo lists via recordings`);
          projectDebug.method = "recordings";
        } else {
          console.log(`Modern API failed, trying classic todosets approach...`);
          
          // METHOD 2: Fall back to classic todosets → todolists approach
          const todosetsResponse = await fetch(
            `https://3.basecampapi.com/${connection.basecampAccountId}/buckets/${projectId}/todosets.json`,
            {
              headers: {
                Authorization: `Bearer ${connection.accessToken}`,
                "User-Agent": "Bloom & Grow CRM (contact@bloomgrow.com)",
              },
            }
          );
          
          console.log(`Todosets response status: ${todosetsResponse.status}`);
          
          if (todosetsResponse.ok) {
            const todosets = await todosetsResponse.json();
            console.log(`Found ${todosets.length} todosets`);
            
            // Fetch todolists from each todoset
            for (const todoset of todosets) {
              const todolistsResponse = await fetch(
                `https://3.basecampapi.com/${connection.basecampAccountId}/buckets/${projectId}/todosets/${todoset.id}/todolists.json`,
                {
                  headers: {
                    Authorization: `Bearer ${connection.accessToken}`,
                    "User-Agent": "Bloom & Grow CRM (contact@bloomgrow.com)",
                  },
                }
              );
              
              if (todolistsResponse.ok) {
                const lists = await todolistsResponse.json();
                todolists.push(...lists);
              }
            }
            console.log(`✅ Classic API worked! Found ${todolists.length} total todo lists via todosets`);
            projectDebug.method = "todosets";
          } else {
            console.log(`❌ Both API methods failed for project ${projectId}`);
            projectDebug.error = "Both recordings and todosets endpoints failed";
            debugInfo.projectsChecked.push(projectDebug);
            continue;
          }
        }
        
        projectDebug.todolistsCount = todolists.length;
        debugInfo.totalListsFound += todolists.length;
        
        // Fetch todos from each todolist (works for both methods)
        for (const list of todolists) {
          const listDebug: any = { 
            listId: list.id, 
            listTitle: list.title || list.name,
          };
          
          console.log(`  Fetching todos for list ${list.id} (${list.title || list.name})`);
          
          // Fetch ACTIVE todos
          const activeTodosResponse = await fetch(
            `https://3.basecampapi.com/${connection.basecampAccountId}/buckets/${projectId}/todolists/${list.id}/todos.json`,
            {
              headers: {
                Authorization: `Bearer ${connection.accessToken}`,
                "User-Agent": "Bloom & Grow CRM (contact@bloomgrow.com)",
              },
            }
          );
          
          let todos: any[] = [];
          if (activeTodosResponse.ok) {
            todos = await activeTodosResponse.json();
            console.log(`    Found ${todos.length} active todos`);
          }
          
          // Fetch COMPLETED todos
          const completedTodosResponse = await fetch(
            `https://3.basecampapi.com/${connection.basecampAccountId}/buckets/${projectId}/todolists/${list.id}/todos/completed.json`,
            {
              headers: {
                Authorization: `Bearer ${connection.accessToken}`,
                "User-Agent": "Bloom & Grow CRM (contact@bloomgrow.com)",
              },
            }
          );
          
          if (completedTodosResponse.ok) {
            const completedTodos = await completedTodosResponse.json();
            console.log(`    Found ${completedTodos.length} completed todos`);
            todos.push(...completedTodos);
          }
          
          console.log(`    Total: ${todos.length} todos in list "${list.title || list.name}"`);
          
          listDebug.todosCount = todos.length;
          debugInfo.totalTodosFound += todos.length;
          
          // Add project and list info to each todo
          const todosWithContext = todos.map((todo: any) => ({
            ...todo,
            projectId,
            projectName: list.bucket?.name || `Project ${projectId}`,
            todoListName: list.title || list.name,
          }));
          
          allTodos.push(...todosWithContext);
          projectDebug.lists.push(listDebug);
        }
        
        debugInfo.projectsChecked.push(projectDebug);
      }
      
      console.log("Final debug info:", JSON.stringify(debugInfo, null, 2));
      console.log(`Total todos found: ${allTodos.length}`);
      
      // Log debug info for troubleshooting but return empty array
      if (allTodos.length === 0) {
        console.log("No todos found. Debug info:", JSON.stringify(debugInfo, null, 2));
      }
      
      // TEMP: Return debug info in response for troubleshooting
      res.json({
        todos: allTodos,
        debug: debugInfo,
        message: `Found ${allTodos.length} todos from ${debugInfo.totalListsFound} lists in ${debugInfo.projectsChecked.length} projects`
      });
    } catch (error) {
      console.error("Error fetching Basecamp todos:", error);
      res.status(500).json({ error: "Failed to fetch todos" });
    }
  });

  app.post("/api/basecamp/sync", isAuthenticated, async (req, res) => {
    try {
      console.log("=== SYNC ENDPOINT CALLED ===");
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      
      const syncSchema = z.object({
        todos: z.array(z.object({
          id: z.number(),
          content: z.string(),
          due_on: z.string().nullable().optional(),
        })),
        customerId: z.string(),
      });
      
      const { todos, customerId } = syncSchema.parse(req.body);
      console.log(`Syncing ${todos.length} todos to customer ${customerId}`);
      
      let imported = 0;
      let skipped = 0;
      
      for (const todo of todos) {
        // Check if already imported
        const existing = await storage.getActionItemByBasecampId(todo.id.toString());
        if (existing) {
          skipped++;
          continue;
        }
        
        // Create action item
        await storage.createActionItem({
          customerId,
          description: todo.content,
          dueDate: todo.due_on ? new Date(todo.due_on) : null,
          createdBy: req.user!.id,
          basecampTodoId: todo.id.toString(),
          visitDate: null,
        });
        
        imported++;
      }
      
      res.json({
        success: true,
        imported,
        skipped,
      });
    } catch (error) {
      console.error("Error syncing Basecamp todos:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid sync data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to sync todos" });
    }
  });

  // Generate Excel template for customer import
  app.get("/api/download/customer-template", isAuthenticated, async (_req, res) => {
    try {
      // Define the headers
      const headers = [
        "Company Name",
        "Email", 
        "Phone",
        "Store Address",
        "Country",
        "Retailer Type",
        "Registered with Bloom Connect",
        "Orders via Bloom Connect",
        "First Order Date",
        "Quarterly Soft Target",
        "Lead Generated By",
        "Date of First Contact",
        "Last Contact Date",
        "Stage",
        "Contact Name",
        "Contact Title",
        "Contact Phone",
        "Contact Email",
        "Personal Notes",
        "Brands"
      ];

      // Define example data
      const exampleData = [
        [
          "ABC Baby Store",
          "abc@example.com",
          "+65 9123 4567",
          "123 Orchard Road #01-23",
          "Singapore",
          "Baby & Nursery Multi-Site",
          "Yes",
          "Yes",
          "2024-01-15",
          "15000",
          "Referral",
          "2023-11-20",
          "2024-10-15",
          "customer",
          "Jane Smith",
          "Purchasing Manager",
          "+65 9123 4568",
          "jane@abc.com",
          "Premium customer - quarterly orders",
          "Beaba, Ergobaby, Skip Hop"
        ],
        [
          "XYZ Toys Online",
          "contact@xyztoys.com",
          "+852 6789 1234",
          "",
          "Hong Kong",
          "Online Only",
          "No",
          "No",
          "",
          "",
          "Cold Call",
          "2024-08-10",
          "2024-09-25",
          "lead",
          "John Doe",
          "Owner",
          "+852 6789 1235",
          "john@xyztoys.com",
          "Interested in baby products line",
          "Trunki"
        ],
        [
          "Little Angels Boutique",
          "info@littleangels.com.au",
          "+61 2 9876 5432",
          "456 George Street",
          "Australia",
          "Baby & Nursery Independent/Boutique",
          "Yes",
          "No",
          "2024-03-20",
          "8000",
          "Bloom Connect",
          "2024-02-10",
          "2024-11-01",
          "customer",
          "Mary Johnson",
          "Store Manager",
          "+61 2 9876 5433",
          "mary@littleangels.com.au",
          "Small boutique with loyal customer base",
          "Done By Deer, Pearhead"
        ]
      ];

      // Create worksheet with headers and data
      const wsData = [headers, ...exampleData];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths for better readability
      ws['!cols'] = [
        { wch: 25 }, // Company Name
        { wch: 25 }, // Email
        { wch: 18 }, // Phone
        { wch: 30 }, // Store Address
        { wch: 15 }, // Country
        { wch: 35 }, // Retailer Type
        { wch: 18 }, // Registered with BC
        { wch: 15 }, // Orders via BC
        { wch: 18 }, // First Order Date
        { wch: 20 }, // Quarterly Soft Target
        { wch: 18 }, // Lead Generated By
        { wch: 20 }, // Date of First Contact
        { wch: 18 }, // Last Contact Date
        { wch: 12 }, // Stage
        { wch: 20 }, // Contact Name
        { wch: 20 }, // Contact Title
        { wch: 18 }, // Contact Phone
        { wch: 25 }, // Contact Email
        { wch: 40 }, // Personal Notes
        { wch: 30 }  // Brands
      ];

      // Create workbook and add worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Customer Template");

      // Generate buffer
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=customer_import_template.xlsx');
      res.setHeader('Content-Length', excelBuffer.length);

      // Send the buffer
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error generating Excel template:", error);
      res.status(500).json({ error: "Failed to generate Excel template" });
    }
  });

  // Excel customer import endpoint (rate limited: 10 uploads per hour)
  app.post("/api/customers/import", isAuthenticated, uploadRateLimiter, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Parse the Excel file from buffer
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (data.length < 2) {
        return res.status(400).json({ error: "Excel file must contain headers and at least one row of data" });
      }

      // Extract headers and rows
      const headers = data[0];
      const rows = data.slice(1);

      // Map header names to indices (handle variations like "Store Address" vs "Office Address")
      const getColumnIndex = (columnNames: string[]) => {
        for (const name of columnNames) {
          const index = headers.findIndex((h: string) => 
            h?.toString().toLowerCase().trim() === name.toLowerCase()
          );
          if (index !== -1) return index;
        }
        return -1;
      };

      const columnMap = {
        companyName: getColumnIndex(['Company Name', 'Company']),
        email: getColumnIndex(['Email']),
        phone: getColumnIndex(['Phone']),
        storeAddress: getColumnIndex(['Store Address', 'Office Address', 'Address']),
        country: getColumnIndex(['Country']),
        retailerType: getColumnIndex(['Retailer Type']),
        registeredWithBloomConnect: getColumnIndex(['Registered with Bloom Connect']),
        ordersViaBloomConnect: getColumnIndex(['Orders via Bloom Connect']),
        firstOrderDate: getColumnIndex(['First Order Date']),
        quarterlySoftTarget: getColumnIndex(['Quarterly Soft Target']),
        leadGeneratedBy: getColumnIndex(['Lead Generated By']),
        dateOfFirstContact: getColumnIndex(['Date of First Contact']),
        lastContactDate: getColumnIndex(['Last Contact Date']),
        stage: getColumnIndex(['Stage']),
        contactName: getColumnIndex(['Contact Name']),
        contactTitle: getColumnIndex(['Contact Title']),
        contactPhone: getColumnIndex(['Contact Phone']),
        contactEmail: getColumnIndex(['Contact Email']),
        personalNotes: getColumnIndex(['Personal Notes']),
        brands: getColumnIndex(['Brands'])
      };

      const results = {
        successful: 0,
        failed: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; companyName: string; error: string }>,
        customers: [] as any[]
      };

      // Get all brands to map names to IDs
      const allBrands = await storage.getBrands();
      const brandNameToId = new Map(allBrands.map(b => [b.name.toLowerCase(), b.id]));

      // Get existing customers to detect duplicates (use CEO role to get all)
      const existingCustomers = await storage.getCustomers(req.user!.id, 'ceo');
      const existingCustomerNames = new Set(existingCustomers.map(c => c.name.toLowerCase().trim()));
      const existingCustomerEmails = new Set(
        existingCustomers.map(c => c.email?.toLowerCase().trim()).filter(Boolean)
      );

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 because 0-indexed and 1 for header row

        // Skip completely empty rows
        if (!row || row.every((cell: any) => !cell || cell.toString().trim() === '')) {
          continue;
        }

        // Extract company name early so it's available in catch block
        let companyName = '';
        
        try {
          // Extract company name (required field)
          companyName = columnMap.companyName !== -1 ? row[columnMap.companyName]?.toString().trim() : '';
          
          if (!companyName) {
            results.errors.push({
              row: rowNumber,
              companyName: '',
              error: 'Company Name is required'
            });
            results.failed++;
            continue;
          }

          // Check for duplicates
          const customerEmail = columnMap.email !== -1 ? row[columnMap.email]?.toString().trim().toLowerCase() : null;
          if (existingCustomerNames.has(companyName.toLowerCase())) {
            results.errors.push({
              row: rowNumber,
              companyName,
              error: 'Customer with this name already exists (skipped)'
            });
            results.skipped++;
            continue;
          }
          if (customerEmail && existingCustomerEmails.has(customerEmail)) {
            results.errors.push({
              row: rowNumber,
              companyName,
              error: 'Customer with this email already exists (skipped)'
            });
            results.skipped++;
            continue;
          }

          // Parse stage with fallback to 'lead'
          let stage = columnMap.stage !== -1 ? row[columnMap.stage]?.toString().toLowerCase().trim() : 'lead';
          if (!['lead', 'prospect', 'customer'].includes(stage)) {
            stage = 'lead';
          }

          // Parse boolean fields
          const parseBoolean = (value: any) => {
            if (!value) return false;
            const str = value.toString().toLowerCase().trim();
            return str === 'yes' || str === 'true' || str === '1';
          };

          // Parse date fields
          const parseDate = (value: any): string | null => {
            if (!value) return null;
            try {
              // Handle Excel serial dates
              if (typeof value === 'number') {
                const date = XLSX.SSF.parse_date_code(value);
                return new Date(date.y, date.m - 1, date.d).toISOString();
              }
              // Handle string dates
              const date = new Date(value.toString());
              return isNaN(date.getTime()) ? null : date.toISOString();
            } catch {
              return null;
            }
          };

          // Parse quarterly target with currency enforcement
          let quarterlySoftTarget = null;
          let quarterlySoftTargetCurrency = null;
          let quarterlySoftTargetBaseCurrency = null;
          
          const targetValue = columnMap.quarterlySoftTarget !== -1 ? row[columnMap.quarterlySoftTarget]?.toString().trim() : null;
          if (targetValue) {
            const targetNum = parseFloat(targetValue.replace(/[^0-9.-]/g, ''));
            if (!isNaN(targetNum) && targetNum > 0) {
              quarterlySoftTarget = targetNum;
              // Default to HKD for Hong Kong imports (as specified in task)
              quarterlySoftTargetCurrency = 'HKD';
              // Calculate base currency amount (USD)
              quarterlySoftTargetBaseCurrency = await validateAndConvertToBase(targetNum, 'HKD');
            }
          }

          // Create customer object
          const customerData: any = {
            name: companyName,
            email: columnMap.email !== -1 ? row[columnMap.email]?.toString().trim() || null : null,
            phone: columnMap.phone !== -1 ? row[columnMap.phone]?.toString().trim() || null : null,
            storeAddress: columnMap.storeAddress !== -1 ? row[columnMap.storeAddress]?.toString().trim() || null : null,
            country: columnMap.country !== -1 ? row[columnMap.country]?.toString().trim() || null : null,
            retailerType: columnMap.retailerType !== -1 ? row[columnMap.retailerType]?.toString().trim() || null : null,
            registeredWithBloomConnect: columnMap.registeredWithBloomConnect !== -1 ? parseBoolean(row[columnMap.registeredWithBloomConnect]) : false,
            ordersViaBloomConnect: columnMap.ordersViaBloomConnect !== -1 ? parseBoolean(row[columnMap.ordersViaBloomConnect]) : false,
            firstOrderDate: columnMap.firstOrderDate !== -1 ? parseDate(row[columnMap.firstOrderDate]) : null,
            quarterlySoftTarget,
            quarterlySoftTargetCurrency,
            quarterlySoftTargetBaseCurrency,
            leadGeneratedBy: columnMap.leadGeneratedBy !== -1 ? row[columnMap.leadGeneratedBy]?.toString().trim() || 'Others' : 'Others',
            dateOfFirstContact: columnMap.dateOfFirstContact !== -1 ? parseDate(row[columnMap.dateOfFirstContact]) : null,
            lastContactDate: columnMap.lastContactDate !== -1 ? parseDate(row[columnMap.lastContactDate]) : null,
            stage: stage as 'lead' | 'prospect' | 'customer',
            personalNotes: columnMap.personalNotes !== -1 ? row[columnMap.personalNotes]?.toString().trim() || null : null,
            assignedTo: req.user!.id // Assign to current user
          };

          // Validate with insertCustomerSchema
          const validatedCustomer = insertCustomerSchema.parse(customerData);

          // Insert customer
          const newCustomer = await storage.createCustomer(validatedCustomer);

          // Handle main contact if provided
          const contactName = columnMap.contactName !== -1 ? row[columnMap.contactName]?.toString().trim() : null;
          if (contactName) {
            await storage.createCustomerContact({
              customerId: newCustomer.id,
              name: contactName,
              title: columnMap.contactTitle !== -1 ? row[columnMap.contactTitle]?.toString().trim() || null : null,
              phone: columnMap.contactPhone !== -1 ? row[columnMap.contactPhone]?.toString().trim() || null : null,
              email: columnMap.contactEmail !== -1 ? row[columnMap.contactEmail]?.toString().trim() || null : null
            });
          }

          // Handle brands (comma-separated list)
          const brandsStr = columnMap.brands !== -1 ? row[columnMap.brands]?.toString().trim() : null;
          if (brandsStr) {
            const brandNames = brandsStr.split(',').map((b: string) => b.trim()).filter(Boolean);
            for (const brandName of brandNames) {
              const brandId = brandNameToId.get(brandName.toLowerCase());
              if (brandId) {
                try {
                  await storage.assignBrandToCustomer(newCustomer.id, brandId);
                } catch (error) {
                  // Ignore duplicate brand assignments
                }
              } else{
                results.errors.push({
                  row: rowNumber,
                  companyName,
                  error: `Brand "${brandName}" not found`
                });
              }
            }
          }

          results.successful++;
          results.customers.push({
            row: rowNumber,
            name: newCustomer.name,
            id: newCustomer.id
          });

        } catch (error: any) {
          results.failed++;
          const errorMessage = error.message || 'Unknown error';
          results.errors.push({
            row: rowNumber,
            companyName: companyName || 'Unknown',
            error: errorMessage
          });
        }
      }

      // Determine appropriate HTTP status code and status indicator
      let statusCode = 200;
      let status: 'success' | 'partial' | 'failed' = 'success';
      
      if (results.successful === 0 && (results.failed > 0 || results.skipped > 0)) {
        // All rows failed or were skipped
        statusCode = 400;
        status = 'failed';
      } else if (results.failed > 0 || results.skipped > 0) {
        // Partial success
        statusCode = 207; // Multi-Status
        status = 'partial';
      }

      res.status(statusCode).json({
        success: results.successful > 0,
        status,
        summary: {
          total: rows.length,
          successful: results.successful,
          failed: results.failed,
          skipped: results.skipped
        },
        errors: results.errors,
        customers: results.customers
      });

    } catch (error: any) {
      console.error("Error importing customers:", error);
      res.status(500).json({ 
        error: "Failed to import customers", 
        details: error.message 
      });
    }
  });

  // AI Analysis Endpoints (rate limited: 20 requests per minute)
  
  // Customer AI Insights
  app.post("/api/ai/customer-insights/:customerId", isAuthenticated, aiRateLimiter, validateUuidParam("customerId"), async (req, res) => {
    try {
      const customerId = req.params.customerId;
      const customer = await storage.getCustomerWithDetails(customerId);
      
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      // Authorization: Only allow access if user is assigned to customer or is admin
      const userRole = req.user!.role as UserRole;
      const userId = req.user!.id;
      const isAdminRole = ['ceo', 'admin', 'sales_director', 'marketing_director'].includes(userRole);
      const isAssignedToCustomer = customer.assignedTo === userId;
      
      // For managers/regional managers, check if customer is assigned to their team
      let isTeamCustomer = false;
      if (['manager', 'regional_manager'].includes(userRole) && customer.assignedTo) {
        const teamMembers = await storage.getUsers(userId, userRole);
        const teamMemberIds = teamMembers.map(u => u.id);
        isTeamCustomer = teamMemberIds.includes(customer.assignedTo);
      }
      
      if (!isAdminRole && !isAssignedToCustomer && !isTeamCustomer) {
        return res.status(403).json({ error: "Unauthorized to access this customer's insights" });
      }

      // Gather customer data
      const sales = await storage.getMonthlySales(req.user!.id, req.user!.role as UserRole, customerId);
      const interactions = await storage.getInteractionsByCustomer(customerId);
      const targets = await storage.getCustomerMonthlyTargets(customerId);
      
      // Build context for AI
      const totalSales = sales.reduce((sum: number, s: any) => sum + Number(s.actual || 0), 0);
      const avgMonthlySales = sales.length > 0 ? totalSales / sales.length : 0;
      const recentSales = sales.slice(-6); // Last 6 months
      const salesTrend = recentSales.map((s: any) => ({ month: s.month, year: s.year, amount: Number(s.actual || 0) }));
      
      const interactionCount = interactions.length;
      const lastInteractionDate = interactions.length > 0 ? interactions[0].date : 'Never';
      
      const prompt = `Analyze this customer's performance and provide actionable insights:

Customer: ${customer.name}
Country: ${customer.country}
Retailer Type: ${customer.retailerType || 'Not specified'}

Sales Performance:
- Total lifetime sales: $${totalSales.toFixed(2)}
- Average monthly sales: $${avgMonthlySales.toFixed(2)}
- Recent 6-month sales trend: ${JSON.stringify(salesTrend)}

Engagement:
- Total interactions: ${interactionCount}
- Last contact: ${lastInteractionDate}

Provide a concise analysis (3-4 paragraphs) covering:
1. Overall performance summary
2. Purchasing patterns and habits identified
3. Potential reasons for any sales dips or variations
4. Specific actionable recommendations to improve sales

Be specific, data-driven, and focus on actionable insights.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a sales analytics expert helping sales teams understand customer behavior and improve performance. Provide clear, actionable insights based on data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const insights = completion.choices[0].message.content;
      
      res.json({ 
        insights,
        metadata: {
          totalSales,
          avgMonthlySales,
          interactionCount,
          lastInteractionDate,
          salesTrend
        }
      });
    } catch (error) {
      console.error("Error generating customer insights:", error);
      res.status(500).json({ error: "Failed to generate AI insights" });
    }
  });

  // User Performance AI Summary (rate limited)
  app.post("/api/ai/user-performance/:userId", isAuthenticated, aiRateLimiter, validateUuidParam("userId"), async (req, res) => {
    try {
      const userId = req.params.userId;
      const currentUserRole = req.user!.role as UserRole;
      const currentUserId = req.user!.id;
      
      // Authorization: Can only view own performance or if user is in your team/hierarchy
      const allUsers = await storage.getUsers(currentUserId, currentUserRole);
      const targetUser = allUsers.find(u => u.id === userId);
      
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check authorization
      const isOwnPerformance = currentUserId === userId;
      const isAdminRole = ['ceo', 'admin', 'sales_director', 'marketing_director'].includes(currentUserRole);
      
      // For managers, only allow if target user is their direct report
      let isDirectReport = false;
      if (['manager', 'regional_manager'].includes(currentUserRole)) {
        isDirectReport = targetUser.managerId === currentUserId;
      }
      
      if (!isOwnPerformance && !isAdminRole && !isDirectReport) {
        return res.status(403).json({ error: "Unauthorized to access this user's performance data" });
      }

      // Get user's customers and sales data
      const customers = await storage.getCustomers(userId, targetUser.role as UserRole);
      const targets = await storage.getMonthlyTargets(userId, targetUser.role as UserRole);
      const sales = await storage.getMonthlySales(userId, targetUser.role as UserRole);
      const allInteractions = await storage.getInteractions();
      
      const totalSales = sales.reduce((sum: number, s: any) => sum + Number(s.actual || 0), 0);
      const currentMonthTarget = targets.find((t: any) => {
        const now = new Date();
        return t.month === now.getMonth() + 1 && t.year === now.getFullYear();
      });
      const currentMonthSales = sales.filter((s: any) => {
        const now = new Date();
        return s.month === now.getMonth() + 1 && s.year === now.getFullYear();
      }).reduce((sum: number, s: any) => sum + Number(s.actual || 0), 0);
      
      const targetProgress = currentMonthTarget 
        ? (currentMonthSales / Number(currentMonthTarget.targetAmount)) * 100 
        : 0;

      const prompt = `Analyze this salesperson's performance and provide a comprehensive summary:

Salesperson: ${targetUser.name}
Role: ${targetUser.role}
Regional Office: ${targetUser.regionalOffice || 'Not assigned'}

Performance Metrics:
- Total customers managed: ${customers.length}
- Total sales (all-time): $${totalSales.toFixed(2)}
- Current month target: $${currentMonthTarget ? Number(currentMonthTarget.targetAmount).toFixed(2) : '0.00'}
- Current month sales: $${currentMonthSales.toFixed(2)}
- Target achievement: ${targetProgress.toFixed(1)}%
- Total customer interactions: ${allInteractions.length}

Recent sales trend (last 6 months): ${JSON.stringify(sales.slice(-6).map((s: any) => ({ 
  month: s.month, 
  year: s.year, 
  amount: Number(s.actual || 0) 
})))}

Provide a detailed analysis (4-5 paragraphs) covering:
1. Overall performance assessment
2. Strengths and areas of excellence
3. Areas needing improvement or attention
4. Sales patterns and trends identified
5. Specific, actionable recommendations for improvement

Be professional, constructive, and data-driven.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a sales performance analyst helping managers evaluate and develop their sales teams. Provide balanced, constructive feedback that highlights both strengths and growth opportunities."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const summary = completion.choices[0].message.content;
      
      res.json({ 
        summary,
        metrics: {
          customerCount: customers.length,
          totalSales,
          currentMonthTarget: currentMonthTarget ? Number(currentMonthTarget.targetAmount) : 0,
          currentMonthSales,
          targetProgress,
          interactionCount: allInteractions.length,
          salesTrend: sales.slice(-6).map((s: any) => ({ 
            month: s.month, 
            year: s.year, 
            amount: Number(s.actual || 0) 
          }))
        }
      });
    } catch (error) {
      console.error("Error generating user performance summary:", error);
      res.status(500).json({ error: "Failed to generate AI summary" });
    }
  });

  // Exchange Rates API
  app.get("/api/exchange-rates", async (req, res) => {
    try {
      const { from, to } = req.query;
      
      if (!from || !to) {
        return res.status(400).json({ error: "Missing from or to currency" });
      }
      
      // Validate currency codes against supported currencies
      const validCurrencies = ["USD", "HKD", "SGD", "CNY", "AUD", "IDR", "MYR"];
      const fromCurrency = (from as string).toUpperCase();
      const toCurrency = (to as string).toUpperCase();
      
      if (!validCurrencies.includes(fromCurrency)) {
        return res.status(400).json({ error: `Unsupported source currency: ${fromCurrency}` });
      }
      
      if (!validCurrencies.includes(toCurrency)) {
        return res.status(400).json({ error: `Unsupported target currency: ${toCurrency}` });
      }
      
      // Short-circuit for identical currencies
      if (fromCurrency === toCurrency) {
        return res.json({ rate: 1.0, updatedAt: new Date().toISOString() });
      }
      
      const rate = await storage.getExchangeRate(fromCurrency, toCurrency);
      
      if (!rate) {
        return res.status(404).json({ error: `Exchange rate not found for ${fromCurrency} to ${toCurrency}` });
      }
      
      res.json({ rate: rate.rate, updatedAt: rate.updatedAt });
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
      res.status(500).json({ error: "Failed to fetch exchange rate" });
    }
  });
  
  app.get("/api/exchange-rates/all", async (_req, res) => {
    try {
      const rates = await storage.getAllExchangeRates();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching all exchange rates:", error);
      res.status(500).json({ error: "Failed to fetch exchange rates" });
    }
  });

  // Sales Forecasting (rate limited)
  app.get("/api/ai/sales-forecast", isAuthenticated, aiRateLimiter, async (req, res) => {
    try {
      const userId = req.user!.id;
      const role = req.user!.role as UserRole;
      
      const sales = await storage.getMonthlySales(userId, role);
      const targets = await storage.getMonthlyTargets(userId, role);
      
      // Get historical sales data (last 12 months)
      const historicalSales = sales.slice(-12).map((s: any) => ({
        month: s.month,
        year: s.year,
        amount: Number(s.actual || 0)
      }));

      if (historicalSales.length < 3) {
        const now = new Date();
        const forecastMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
        const forecastYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
        
        return res.json({
          predictedSales: 0,
          confidence: 30,
          trend: "insufficient_data",
          insights: "Insufficient historical data for accurate forecasting. Need at least 3 months of sales data to generate reliable predictions. Start logging sales to enable AI-powered forecasts.",
          forecastMonth,
          forecastYear
        });
      }

      const prompt = `Based on the following sales history, provide a sales forecast for the next month:

Historical Sales (last ${historicalSales.length} months):
${JSON.stringify(historicalSales, null, 2)}

Analyze the data and provide:
1. Predicted sales amount for next month
2. Confidence level (high/medium/low) with reasoning
3. Trend direction (growing/stable/declining)
4. Key factors influencing the forecast
5. Risk factors or considerations

Format your response as a structured analysis that's easy to parse for display.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a sales forecasting expert. Analyze historical sales data and provide accurate, data-driven predictions with clear confidence indicators."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 600,
      });

      const forecastText = completion.choices[0].message.content || "";
      
      // Extract predicted amount (simple regex - AI should format consistently)
      const amountMatch = forecastText.match(/\$?([\d,]+\.?\d*)/);
      const predictedAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
      
      // Determine confidence and trend from response
      const confidenceLower = forecastText.toLowerCase();
      let confidenceLevel = 70; // default medium confidence
      if (confidenceLower.includes("high confidence")) confidenceLevel = 85;
      else if (confidenceLower.includes("low confidence")) confidenceLevel = 50;
      
      let trend = "stable";
      if (confidenceLower.includes("growing") || confidenceLower.includes("increasing")) trend = "upward";
      else if (confidenceLower.includes("declining") || confidenceLower.includes("decreasing")) trend = "declining";
      
      // Calculate forecast month/year (next month)
      const now = new Date();
      const forecastMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2; // getMonth() is 0-indexed
      const forecastYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();

      res.json({
        predictedSales: Math.round(predictedAmount),
        confidence: confidenceLevel,
        trend,
        insights: forecastText,
        forecastMonth,
        forecastYear
      });
    } catch (error) {
      console.error("Error generating sales forecast:", error);
      res.status(500).json({ error: "Failed to generate forecast" });
    }
  });

  // Interaction Note Summarization (rate limited)
  app.post("/api/ai/summarize-note", isAuthenticated, aiRateLimiter, async (req, res) => {
    try {
      const { notes, note } = req.body;
      const noteText = notes || note; // Accept both 'notes' and 'note'
      
      if (!noteText || noteText.trim().length < 50) {
        return res.status(400).json({ error: "Note is too short to summarize. Minimum 50 characters required." });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional note summarizer for sales interactions. Create concise, clear summaries that capture key points, action items, and outcomes."
          },
          {
            role: "user",
            content: `Summarize the following customer interaction note into 2-3 concise sentences that capture the main points, decisions, and any action items:\n\n${noteText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const summary = completion.choices[0].message.content;
      
      res.json({ summary });
    } catch (error) {
      console.error("Error summarizing note:", error);
      res.status(500).json({ error: "Failed to summarize note" });
    }
  });

  // AI Next Best Action - Which customers should I contact today? (rate limited)
  app.get("/api/ai/next-best-action", isAuthenticated, aiRateLimiter, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role as UserRole;
      
      // Get customers based on role (the getCustomers method already handles role filtering)
      const customers = await storage.getCustomers(userId, userRole);
      
      if (customers.length === 0) {
        return res.json({
          recommendations: [],
          message: "No customers assigned to you yet."
        });
      }
      
      // Gather customer data with interactions
      const customersWithData = await Promise.all(
        customers.slice(0, 50).map(async (customer: CustomerWithBrands) => {
          const interactions = await storage.getInteractionsByCustomer(customer.id);
          const lastInteraction = interactions[0];
          const daysSinceContact = customer.lastContactDate 
            ? Math.floor((Date.now() - new Date(customer.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
            : 999;
          
          return {
            id: customer.id,
            name: customer.name,
            stage: customer.stage,
            country: customer.country,
            retailerType: customer.retailerType,
            quarterlySoftTarget: customer.quarterlySoftTarget,
            lastContactDate: customer.lastContactDate,
            daysSinceContact,
            interactionCount: interactions.length,
            lastInteractionType: lastInteraction?.type,
            lastInteractionDescription: lastInteraction?.description?.slice(0, 200),
          };
        })
      );
      
      // Sort by priority (days since contact, then by target value)
      const prioritized = customersWithData
        .sort((a: { daysSinceContact: number }, b: { daysSinceContact: number }) => b.daysSinceContact - a.daysSinceContact)
        .slice(0, 10);
      
      const customerSummary = prioritized.map((c: { name: string; stage: string; daysSinceContact: number; interactionCount: number; quarterlySoftTarget: string | null }) => 
        `- ${c.name} (${c.stage}): ${c.daysSinceContact} days since contact, ${c.interactionCount} total interactions, ${c.quarterlySoftTarget ? `$${c.quarterlySoftTarget} quarterly target` : 'no target set'}`
      ).join('\n');
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a sales advisor helping prioritize customer outreach. Provide 3-5 specific, actionable recommendations for which customers to contact today and why. Be concise and practical."
          },
          {
            role: "user",
            content: `Here are my customers that may need attention today:\n\n${customerSummary}\n\nProvide 3-5 prioritized recommendations for who I should contact today, with specific reasons and suggested talking points. Format each recommendation as a JSON object with fields: customerId, customerName, priority (1-5), reason, suggestedAction.`
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      });
      
      const aiResponse = completion.choices[0].message.content || '';
      
      // Try to parse structured recommendations
      let recommendations: Array<{
        customerId: string;
        customerName: string;
        priority: number;
        reason: string;
        suggestedAction: string;
      }> = [];
      
      try {
        // Try to extract JSON array from response
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          recommendations = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Fallback: Use the raw AI response
      }
      
      res.json({
        recommendations: recommendations.length > 0 ? recommendations : prioritized.slice(0, 5).map((c: { id: string; name: string; daysSinceContact: number; lastInteractionType?: string }, i: number) => ({
          customerId: c.id,
          customerName: c.name,
          priority: i + 1,
          reason: c.daysSinceContact > 30 ? "Overdue for contact" : "Regular follow-up needed",
          suggestedAction: c.lastInteractionType === "Call" ? "Schedule a meeting" : "Make a call"
        })),
        rawInsights: aiResponse,
        analyzedCount: prioritized.length
      });
    } catch (error) {
      console.error("Error generating next best action:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // AI Churn Risk Scoring (rate limited)
  app.get("/api/ai/churn-risk/:customerId", isAuthenticated, aiRateLimiter, validateUuidParam("customerId"), async (req, res) => {
    try {
      const customerId = req.params.customerId;
      const customer = await storage.getCustomerWithDetails(customerId);
      
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      // Check authorization
      const userId = req.user!.id;
      const userRole = req.user!.role as UserRole;
      
      if (userRole === "salesman" && customer.assignedTo !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // Gather engagement data
      const interactions = await storage.getInteractionsByCustomer(customerId);
      const sales = await storage.getMonthlySales(userId, userRole, customerId);
      
      // Calculate engagement metrics
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      
      const recentInteractions = interactions.filter(i => new Date(i.date) > thirtyDaysAgo).length;
      const daysSinceLastContact = customer.lastContactDate 
        ? Math.floor((now.getTime() - new Date(customer.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      
      // For churn risk, we calculate based on monthly tracking data
      const totalRecentSalesAmount = sales.reduce((sum, s) => sum + (s.actual ? parseFloat(s.actual) : 0), 0);
      
      // Calculate base risk score (0-100)
      let riskScore = 0;
      let riskFactors: string[] = [];
      
      // Factor 1: Days since last contact (max 30 points)
      if (daysSinceLastContact >= 60) {
        riskScore += 30;
        riskFactors.push("No contact in over 60 days");
      } else if (daysSinceLastContact >= 30) {
        riskScore += 20;
        riskFactors.push("No contact in over 30 days");
      } else if (daysSinceLastContact >= 14) {
        riskScore += 10;
        riskFactors.push("Limited recent contact");
      }
      
      // Factor 2: Interaction frequency (max 25 points)
      if (recentInteractions === 0) {
        riskScore += 25;
        riskFactors.push("No interactions in the last 30 days");
      } else if (recentInteractions < 2) {
        riskScore += 15;
        riskFactors.push("Low interaction frequency");
      }
      
      // Factor 3: Sales activity (max 25 points)
      if (customer.stage === "customer") {
        if (totalRecentSalesAmount === 0) {
          riskScore += 25;
          riskFactors.push("No purchases in the last 90 days");
        } else if (customer.quarterlySoftTarget && totalRecentSalesAmount < parseFloat(customer.quarterlySoftTarget) * 0.5) {
          riskScore += 15;
          riskFactors.push("Below 50% of quarterly target");
        }
      }
      
      // Factor 4: Stage-based risk (max 20 points)
      if (customer.stage === "prospect" && daysSinceLastContact > 21) {
        riskScore += 20;
        riskFactors.push("Prospect going cold - needs follow-up");
      } else if (customer.stage === "lead" && daysSinceLastContact > 14) {
        riskScore += 15;
        riskFactors.push("Lead may be losing interest");
      }
      
      // Determine risk level
      let riskLevel: "low" | "medium" | "high" | "critical";
      if (riskScore >= 70) {
        riskLevel = "critical";
      } else if (riskScore >= 50) {
        riskLevel = "high";
      } else if (riskScore >= 25) {
        riskLevel = "medium";
      } else {
        riskLevel = "low";
      }
      
      // Generate AI recommendations for high-risk customers
      let aiRecommendations = "";
      if (riskScore >= 40) {
        const prompt = `Customer "${customer.name}" has a churn risk score of ${riskScore}/100 (${riskLevel}).

Risk factors:
${riskFactors.map(f => `- ${f}`).join('\n')}

Customer details:
- Stage: ${customer.stage}
- Days since last contact: ${daysSinceLastContact}
- Recent interactions (30 days): ${recentInteractions}
- Total interactions: ${interactions.length}

Provide 2-3 specific, actionable recommendations to reduce churn risk and re-engage this customer.`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a customer success expert. Provide brief, actionable recommendations to reduce churn risk."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 300,
        });
        
        aiRecommendations = completion.choices[0].message.content || "";
      }
      
      res.json({
        customerId,
        customerName: customer.name,
        riskScore,
        riskLevel,
        riskFactors,
        metrics: {
          daysSinceLastContact,
          recentInteractions,
          totalInteractions: interactions.length,
          recentSalesAmount: totalRecentSalesAmount,
          quarterlySoftTarget: customer.quarterlySoftTarget ? parseFloat(customer.quarterlySoftTarget) : null,
        },
        recommendations: aiRecommendations,
      });
    } catch (error) {
      console.error("Error calculating churn risk:", error);
      res.status(500).json({ error: "Failed to calculate churn risk" });
    }
  });

  // Bulk churn risk for dashboard (rate limited)
  app.get("/api/ai/churn-risk-summary", isAuthenticated, aiRateLimiter, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role as UserRole;
      
      // Get customers based on role (the getCustomers method already handles role filtering)
      const customers = await storage.getCustomers(userId, userRole);
      
      // Calculate quick risk scores
      const now = new Date();
      const riskSummary = customers.map((customer: CustomerWithBrands) => {
        const daysSinceLastContact = customer.lastContactDate 
          ? Math.floor((now.getTime() - new Date(customer.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        
        let riskScore = 0;
        if (daysSinceLastContact >= 60) riskScore += 40;
        else if (daysSinceLastContact >= 30) riskScore += 25;
        else if (daysSinceLastContact >= 14) riskScore += 10;
        
        if (customer.stage === "customer" && daysSinceLastContact > 21) riskScore += 20;
        else if (customer.stage === "prospect" && daysSinceLastContact > 14) riskScore += 15;
        
        let riskLevel: "low" | "medium" | "high" | "critical";
        if (riskScore >= 50) riskLevel = "critical";
        else if (riskScore >= 35) riskLevel = "high";
        else if (riskScore >= 15) riskLevel = "medium";
        else riskLevel = "low";
        
        return {
          customerId: customer.id,
          customerName: customer.name,
          stage: customer.stage,
          riskScore,
          riskLevel,
          daysSinceLastContact,
        };
      });
      
      // Sort by risk score descending
      type RiskItem = { riskScore: number; riskLevel: "low" | "medium" | "high" | "critical" };
      riskSummary.sort((a: RiskItem, b: RiskItem) => b.riskScore - a.riskScore);
      
      const summary = {
        totalCustomers: customers.length,
        criticalRisk: riskSummary.filter((r: RiskItem) => r.riskLevel === "critical").length,
        highRisk: riskSummary.filter((r: RiskItem) => r.riskLevel === "high").length,
        mediumRisk: riskSummary.filter((r: RiskItem) => r.riskLevel === "medium").length,
        lowRisk: riskSummary.filter((r: RiskItem) => r.riskLevel === "low").length,
        topAtRiskCustomers: riskSummary.filter((r: RiskItem) => r.riskLevel === "critical" || r.riskLevel === "high").slice(0, 10),
      };
      
      res.json(summary);
    } catch (error) {
      console.error("Error generating churn risk summary:", error);
      res.status(500).json({ error: "Failed to generate churn risk summary" });
    }
  });

  // ===== OFFICE MANAGEMENT ROUTES =====
  
  // Get all offices
  app.get("/api/offices", isAuthenticated, async (_req, res) => {
    try {
      const officesList = await storage.getOffices();
      res.json(officesList);
    } catch (error) {
      console.error("Error fetching offices:", error);
      res.status(500).json({ error: "Failed to fetch offices" });
    }
  });

  // Get single office
  app.get("/api/offices/:id", isAuthenticated, async (req, res) => {
    try {
      const office = await storage.getOffice(req.params.id);
      if (!office) {
        return res.status(404).json({ error: "Office not found" });
      }
      res.json(office);
    } catch (error) {
      console.error("Error fetching office:", error);
      res.status(500).json({ error: "Failed to fetch office" });
    }
  });

  // Create office (admin only)
  app.post("/api/offices", isAuthenticated, async (req, res) => {
    const effectiveRole = getEffectiveRole(req.user!.role as UserRole);
    if (effectiveRole !== "ceo" && effectiveRole !== "regional_manager") {
      return res.status(403).json({ error: "Only admins can create offices" });
    }
    
    try {
      const office = await storage.createOffice(req.body);
      res.status(201).json(office);
    } catch (error: any) {
      console.error("Error creating office:", error);
      if (error.code === "23505") {
        return res.status(400).json({ error: "Office with this name or code already exists" });
      }
      res.status(500).json({ error: "Failed to create office" });
    }
  });

  // Update office (admin only)
  app.patch("/api/offices/:id", isAuthenticated, async (req, res) => {
    const effectiveRole = getEffectiveRole(req.user!.role as UserRole);
    if (effectiveRole !== "ceo" && effectiveRole !== "regional_manager") {
      return res.status(403).json({ error: "Only admins can update offices" });
    }
    
    try {
      const office = await storage.updateOffice(req.params.id, req.body);
      if (!office) {
        return res.status(404).json({ error: "Office not found" });
      }
      res.json(office);
    } catch (error: any) {
      console.error("Error updating office:", error);
      if (error.code === "23505") {
        return res.status(400).json({ error: "Office with this name or code already exists" });
      }
      res.status(500).json({ error: "Failed to update office" });
    }
  });

  // Delete office (admin only)
  app.delete("/api/offices/:id", isAuthenticated, async (req, res) => {
    const effectiveRole = getEffectiveRole(req.user!.role as UserRole);
    if (effectiveRole !== "ceo") {
      return res.status(403).json({ error: "Only CEO can delete offices" });
    }
    
    try {
      const deleted = await storage.deleteOffice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Office not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting office:", error);
      res.status(500).json({ error: "Failed to delete office" });
    }
  });

  // Get users assigned to an office
  app.get("/api/offices/:id/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getOfficeUsers(req.params.id);
      res.json(users);
    } catch (error) {
      console.error("Error fetching office users:", error);
      res.status(500).json({ error: "Failed to fetch office users" });
    }
  });

  // Get all office assignments (optionally filtered by office)
  app.get("/api/office-assignments", isAuthenticated, async (req, res) => {
    try {
      const officeId = req.query.officeId as string | undefined;
      const assignments = await storage.getOfficeAssignments(officeId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching office assignments:", error);
      res.status(500).json({ error: "Failed to fetch office assignments" });
    }
  });

  // Get user's office assignments
  app.get("/api/users/:userId/office-assignments", isAuthenticated, async (req, res) => {
    try {
      const assignments = await storage.getUserOfficeAssignments(req.params.userId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching user office assignments:", error);
      res.status(500).json({ error: "Failed to fetch user office assignments" });
    }
  });

  // Assign user to office
  app.post("/api/office-assignments", isAuthenticated, async (req, res) => {
    const effectiveRole = getEffectiveRole(req.user!.role as UserRole);
    if (effectiveRole !== "ceo" && effectiveRole !== "regional_manager" && effectiveRole !== "manager") {
      return res.status(403).json({ error: "Not authorized to assign users to offices" });
    }
    
    try {
      const { userId, officeId, roleType } = req.body;
      
      if (!userId || !officeId) {
        return res.status(400).json({ error: "userId and officeId are required" });
      }
      
      const assignment = await storage.assignUserToOffice({
        userId,
        officeId,
        roleType: roleType || "salesman",
      });
      
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning user to office:", error);
      res.status(500).json({ error: "Failed to assign user to office" });
    }
  });

  // Remove user from office
  app.delete("/api/office-assignments", isAuthenticated, async (req, res) => {
    const effectiveRole = getEffectiveRole(req.user!.role as UserRole);
    if (effectiveRole !== "ceo" && effectiveRole !== "regional_manager" && effectiveRole !== "manager") {
      return res.status(403).json({ error: "Not authorized to remove users from offices" });
    }
    
    try {
      const { userId, officeId } = req.body;
      
      if (!userId || !officeId) {
        return res.status(400).json({ error: "userId and officeId are required" });
      }
      
      const removed = await storage.removeUserFromOffice(userId, officeId);
      if (!removed) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing user from office:", error);
      res.status(500).json({ error: "Failed to remove user from office" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
