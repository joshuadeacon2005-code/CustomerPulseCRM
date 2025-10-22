import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, updateCustomerSchema, insertInteractionSchema, insertSaleSchema, insertBrandSchema, insertCustomerBrandSchema, insertMonthlyTargetSchema, updateMonthlyTargetSchema, insertActionItemSchema, insertMonthlySalesTrackingSchema, updateMonthlySalesTrackingSchema, type UserRole } from "@shared/schema";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import { randomBytes } from "crypto";
import { z } from "zod";

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
        totalSetsFound: 0,
        totalListsFound: 0,
        totalTodosFound: 0,
      };
      
      // Fetch todos for each selected project
      for (const projectId of projectIds) {
        console.log(`\n--- Fetching todosets for project ${projectId} ---`);
        const projectDebug: any = { projectId, todosets: [] };
        
        // Step 1: Fetch todosets for this project
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
        projectDebug.todosetsResponseStatus = todosetsResponse.status;
        
        if (!todosetsResponse.ok) {
          console.log(`Failed to fetch todosets for project ${projectId}`);
          projectDebug.error = "Failed to fetch todosets";
          debugInfo.projectsChecked.push(projectDebug);
          continue;
        }
        
        const todosets = await todosetsResponse.json();
        console.log(`Found ${todosets.length} todosets in project ${projectId}`);
        projectDebug.todosetsCount = todosets.length;
        debugInfo.totalSetsFound += todosets.length;
        
        // Step 2: For each todoset, fetch its todo lists
        for (const todoset of todosets) {
          console.log(`\n--- Fetching todo lists for todoset ${todoset.id} ---`);
          const todosetDebug: any = { todosetId: todoset.id, lists: [] };
          
          const todolistsResponse = await fetch(
            `https://3.basecampapi.com/${connection.basecampAccountId}/buckets/${projectId}/todosets/${todoset.id}/todolists.json`,
            {
              headers: {
                Authorization: `Bearer ${connection.accessToken}`,
                "User-Agent": "Bloom & Grow CRM (contact@bloomgrow.com)",
              },
            }
          );
          
          console.log(`Todolists response status for todoset ${todoset.id}: ${todolistsResponse.status}`);
          todosetDebug.todolistsResponseStatus = todolistsResponse.status;
          
          if (!todolistsResponse.ok) {
            console.log(`Failed to fetch todolists for todoset ${todoset.id}`);
            todosetDebug.error = "Failed to fetch todolists";
            projectDebug.todosets.push(todosetDebug);
            continue;
          }
          
          const todolists = await todolistsResponse.json();
          console.log(`Found ${todolists.length} todolists in todoset ${todoset.id}`);
          todosetDebug.todolistsCount = todolists.length;
          debugInfo.totalListsFound += todolists.length;
          
          // Step 3: Fetch todos from each todo list
          for (const list of todolists) {
            const listDebug: any = { 
              listId: list.id, 
              listName: list.name || list.title,
            };
            
            console.log(`Fetching todos for list ${list.id} (${list.name || list.title})`);
            
            // Fetch todos using the /todos.json endpoint (not /todolists/{id}.json)
            const todosResponse = await fetch(
              `https://3.basecampapi.com/${connection.basecampAccountId}/buckets/${projectId}/todolists/${list.id}/todos.json`,
              {
                headers: {
                  Authorization: `Bearer ${connection.accessToken}`,
                  "User-Agent": "Bloom & Grow CRM (contact@bloomgrow.com)",
                },
              }
            );
            
            listDebug.todosResponseStatus = todosResponse.status;
            
            if (!todosResponse.ok) {
              console.log(`Failed to fetch todos for list ${list.id}`);
              listDebug.error = "Failed to fetch todos";
              todosetDebug.lists.push(listDebug);
              continue;
            }
            
            const todos = await todosResponse.json();
            console.log(`Found ${todos.length} todos in list ${list.name || list.title} (default: only incomplete)`);
            
            listDebug.todosCount = todos.length;
            debugInfo.totalTodosFound += todos.length;
            
            // Add project and list info to each todo
            const todosWithContext = todos.map((todo: any) => ({
              ...todo,
              projectId,
              projectName: "Project " + projectId, // We can enhance this later
              todoListName: list.name || list.title,
            }));
            
            allTodos.push(...todosWithContext);
            todosetDebug.lists.push(listDebug);
          }
          
          projectDebug.todosets.push(todosetDebug);
        }
        
        debugInfo.projectsChecked.push(projectDebug);
      }
      
      console.log("Final debug info:", JSON.stringify(debugInfo, null, 2));
      console.log(`Total todos found: ${allTodos.length}`);
      
      // Log debug info for troubleshooting but return empty array
      if (allTodos.length === 0) {
        console.log("No todos found. Debug info:", JSON.stringify(debugInfo, null, 2));
      }
      
      res.json(allTodos);
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

  const httpServer = createServer(app);

  return httpServer;
}
