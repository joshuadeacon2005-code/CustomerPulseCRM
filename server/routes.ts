import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, updateCustomerSchema, insertInteractionSchema, insertSaleSchema, insertBrandSchema, insertCustomerBrandSchema, insertMonthlyTargetSchema, updateMonthlyTargetSchema, insertActionItemSchema, insertMonthlySalesTrackingSchema, updateMonthlySalesTrackingSchema, type UserRole } from "@shared/schema";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  
  app.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const customersWithBrands = await storage.getCustomers(req.user!.id, req.user!.role as UserRole);
      res.json(customersWithBrands);
    } catch (error) {
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
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      
      // Always assign customer to current user (ignore any provided assignedTo value)
      // This ensures assignedTo always contains a valid user ID, never a name
      const customerData = {
        ...validatedData,
        assignedTo: req.user!.id
      };
      
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid customer data", details: error });
      }
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = updateCustomerSchema.parse(req.body);
      
      // Remove assignedTo from updates - it should not be changed via this endpoint
      // If we need to reassign customers, create a separate endpoint with proper validation
      const { assignedTo, ...updateData } = validatedData;
      
      const customer = await storage.updateCustomer(req.params.id, updateData);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid customer data", details: error });
      }
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteCustomer(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
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
      const validatedData = insertInteractionSchema.parse(req.body);
      const interaction = await storage.createInteraction(validatedData);
      res.status(201).json(interaction);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid interaction data", details: error });
      }
      res.status(500).json({ error: "Failed to create interaction" });
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
      const validatedData = insertCustomerBrandSchema.parse(req.body);
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
      if (req.user) {
        const targets = await storage.getMonthlyTargets(req.user.id, req.user.role as UserRole);
        res.json(targets);
      } else {
        const targets = await storage.getMonthlyTargets(req.user!.id, req.user!.role as UserRole);
        res.json(targets);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch monthly targets" });
    }
  });

  app.post("/api/targets", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertMonthlyTargetSchema.parse({
        ...req.body,
        salesmanId: req.user!.role === "salesman" ? req.user!.id : req.body.salesmanId,
      });
      const target = await storage.createMonthlyTarget(validatedData);
      res.status(201).json(target);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid target data", details: error });
      }
      res.status(500).json({ error: "Failed to create monthly target" });
    }
  });

  app.patch("/api/targets/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = updateMonthlyTargetSchema.parse(req.body);
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
      const validatedData = insertActionItemSchema.parse({
        ...req.body,
        createdBy: req.user!.id,
      });
      const actionItem = await storage.createActionItem(validatedData);
      res.status(201).json(actionItem);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid action item data", details: error });
      }
      res.status(500).json({ error: "Failed to create action item" });
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

  // Monthly sales tracking routes
  app.get("/api/monthly-sales", isAuthenticated, async (req, res) => {
    try {
      const customerId = req.query.customerId as string | undefined;
      const monthlySales = await storage.getMonthlySales(req.user!.id, req.user!.role as UserRole, customerId);
      res.json(monthlySales);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch monthly sales" });
    }
  });

  app.post("/api/monthly-sales", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertMonthlySalesTrackingSchema.parse(req.body);
      const monthlySales = await storage.createMonthlySales(validatedData);
      res.status(201).json(monthlySales);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid monthly sales data", details: error });
      }
      res.status(500).json({ error: "Failed to create monthly sales record" });
    }
  });

  app.patch("/api/monthly-sales/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = updateMonthlySalesTrackingSchema.parse(req.body);
      const monthlySales = await storage.updateMonthlySales(req.params.id, validatedData);
      if (!monthlySales) {
        return res.status(404).json({ error: "Monthly sales record not found" });
      }
      res.json(monthlySales);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid monthly sales data", details: error });
      }
      res.status(500).json({ error: "Failed to update monthly sales record" });
    }
  });

  app.post("/api/sales", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSaleSchema.parse({
        ...req.body,
        salesmanId: req.user!.id,
      });
      const sale = await storage.createSale(validatedData);
      res.status(201).json(sale);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Invalid sale data", details: error });
      }
      res.status(500).json({ error: "Failed to create sale" });
    }
  });

  app.get("/api/sales", isAuthenticated, async (req, res) => {
    try {
      if (req.user!.role === "admin") {
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

  app.patch("/api/sales/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
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

  // Basecamp OAuth routes
  app.get("/api/basecamp/auth", isAuthenticated, async (req, res) => {
    try {
      const clientId = process.env.BASECAMP_CLIENT_ID;
      const redirectUri = `${req.protocol}://${req.get('host')}/api/basecamp/callback`;
      
      // Create secure OAuth state token
      const state = await storage.createOAuthState(req.user!.id);
      
      const authUrl = `https://launchpad.37signals.com/authorization/new?type=web_server&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
      
      res.redirect(authUrl);
    } catch (error) {
      console.error("Error initiating Basecamp OAuth:", error);
      res.status(500).send("Failed to initiate Basecamp connection");
    }
  });

  app.get("/api/basecamp/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).send("No authorization code received");
      }
      
      if (!state) {
        return res.status(400).send("No state parameter received");
      }

      // Validate and retrieve user ID from state
      const userId = await storage.validateOAuthState(state as string);
      if (!userId) {
        return res.status(400).send("Invalid or expired state parameter");
      }

      // Delete the state immediately (one-time use)
      await storage.deleteOAuthState(state as string);

      const clientId = process.env.BASECAMP_CLIENT_ID;
      const clientSecret = process.env.BASECAMP_CLIENT_SECRET;
      const redirectUri = `${req.protocol}://${req.get('host')}/api/basecamp/callback`;

      // Exchange code for access token
      const tokenResponse = await fetch('https://launchpad.37signals.com/authorization/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'web_server',
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token exchange failed:", errorText);
        throw new Error('Failed to exchange code for token');
      }

      const tokenData = await tokenResponse.json();
      
      // Get user's Basecamp account info
      const authResponse = await fetch('https://launchpad.37signals.com/authorization.json', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'Bloom & Grow CRM (crm@bloomandgrow.com)',
        },
      });

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.error("Authorization fetch failed:", errorText);
        throw new Error('Failed to get Basecamp account info');
      }

      const authData = await authResponse.json();
      
      // Get the first Basecamp account
      const basecampAccount = authData.accounts.find((acc: any) => acc.product === 'bc3' || acc.product === 'bcx');
      
      if (!basecampAccount) {
        return res.status(400).send("No Basecamp account found");
      }

      // Store the connection
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      
      await storage.saveBasecampConnection({
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        basecampAccountId: basecampAccount.id.toString(),
        basecampUserName: authData.identity.email_address,
      });

      res.redirect('/tasks?basecamp=connected');
    } catch (error) {
      console.error("Basecamp OAuth error:", error);
      res.status(500).send("Failed to connect Basecamp account");
    }
  });

  app.get("/api/basecamp/connection", isAuthenticated, async (req, res) => {
    try {
      const connection = await storage.getBasecampConnection(req.user!.id);
      
      if (!connection) {
        return res.json({ connected: false });
      }

      res.json({
        connected: true,
        accountId: connection.basecampAccountId,
        userName: connection.basecampUserName,
        connectedAt: connection.createdAt,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Basecamp connection status" });
    }
  });

  app.delete("/api/basecamp/connection", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteBasecampConnection(req.user!.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect Basecamp" });
    }
  });

  app.get("/api/basecamp/todos", isAuthenticated, async (req, res) => {
    try {
      const connection = await storage.getBasecampConnection(req.user!.id);
      
      if (!connection) {
        return res.status(400).json({ error: "Basecamp not connected" });
      }

      // Refresh token if expired
      if (new Date() >= connection.expiresAt) {
        const newTokens = await storage.refreshBasecampToken(req.user!.id);
        if (!newTokens) {
          return res.status(401).json({ error: "Failed to refresh Basecamp token" });
        }
      }

      const todos = await storage.fetchBasecampTodos(req.user!.id);
      res.json(todos);
    } catch (error) {
      console.error("Error fetching Basecamp todos:", error);
      res.status(500).json({ error: "Failed to fetch Basecamp todos" });
    }
  });

  app.post("/api/basecamp/sync-todo", isAuthenticated, async (req, res) => {
    try {
      const { basecampTodoId, customerId, description, dueDate } = req.body;
      
      if (!basecampTodoId || !customerId || !description) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const actionItem = await storage.createActionItemFromBasecamp({
        basecampTodoId,
        customerId,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        createdBy: req.user!.id,
      });

      res.status(201).json(actionItem);
    } catch (error) {
      console.error("Error syncing Basecamp todo:", error);
      res.status(500).json({ error: "Failed to sync todo" });
    }
  });

  app.get("/api/basecamp/projects", isAuthenticated, async (req, res) => {
    try {
      const connection = await storage.getBasecampConnection(req.user!.id);
      
      if (!connection) {
        return res.status(400).json({ error: "Basecamp not connected" });
      }

      const projects = await storage.fetchBasecampProjects(req.user!.id);
      const selectedProjectIds = connection.selectedProjectIds || [];
      
      res.json({ projects, selectedProjectIds });
    } catch (error) {
      console.error("Error fetching Basecamp projects:", error);
      res.status(500).json({ error: "Failed to fetch Basecamp projects" });
    }
  });

  app.post("/api/basecamp/selected-projects", isAuthenticated, async (req, res) => {
    try {
      const { projectIds } = req.body;
      
      if (!Array.isArray(projectIds)) {
        return res.status(400).json({ error: "projectIds must be an array" });
      }

      await storage.saveSelectedProjects(req.user!.id, projectIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving selected projects:", error);
      res.status(500).json({ error: "Failed to save selected projects" });
    }
  });

  app.get("/api/basecamp/sync-logs", isAuthenticated, async (req, res) => {
    try {
      let limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      // Clamp limit to reasonable range
      limit = Math.max(1, Math.min(limit, 200));
      const logs = await storage.getBasecampSyncLogs(req.user!.id, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching sync logs:", error);
      res.status(500).json({ error: "Failed to fetch sync logs" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
