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

  // Basecamp Integration Routes
  
  // OAuth initiation
  app.get("/api/basecamp/auth", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const clientId = process.env.BASECAMP_CLIENT_ID;
      
      if (!clientId) {
        return res.status(500).json({ error: "Basecamp client ID not configured" });
      }

      // Generate cryptographically secure random state
      const crypto = await import("crypto");
      const state = crypto.randomBytes(32).toString("hex");
      
      // Store state with 10-minute expiry
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await storage.createOauthState({ state, userId, expiresAt });
      
      // Clean up expired states
      await storage.deleteExpiredOauthStates();
      
      const redirectUri = `https://${req.get("host")}/api/basecamp/callback`;
      const authUrl = `https://launchpad.37signals.com/authorization/new?` +
        `type=web_server&` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}`;
      
      res.redirect(authUrl);
    } catch (error) {
      console.error("Error initiating Basecamp OAuth:", error);
      res.status(500).json({ error: "Failed to initiate OAuth" });
    }
  });

  // OAuth callback
  app.get("/api/basecamp/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).send("Missing code or state parameter");
      }

      // Verify state (CSRF protection)
      const oauthState = await storage.getOauthState(state as string);
      if (!oauthState) {
        return res.status(400).send("Invalid or expired state");
      }

      // Check if state is expired
      if (new Date() > oauthState.expiresAt) {
        await storage.deleteOauthState(state as string);
        return res.status(400).send("State has expired");
      }

      // Delete state (one-time use)
      await storage.deleteOauthState(state as string);
      
      const userId = oauthState.userId;
      const clientId = process.env.BASECAMP_CLIENT_ID;
      const clientSecret = process.env.BASECAMP_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return res.status(500).send("Basecamp credentials not configured");
      }

      // Exchange code for tokens
      const redirectUri = `https://${req.get("host")}/api/basecamp/callback`;
      const tokenResponse = await fetch("https://launchpad.37signals.com/authorization/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "web_server",
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to exchange code for tokens");
      }

      const tokenData = await tokenResponse.json();
      
      // Fetch user info
      const userResponse = await fetch("https://launchpad.37signals.com/authorization.json", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user info");
      }

      const userData = await userResponse.json();
      const account = userData.accounts.find((acc: any) => acc.product === "bc3");
      
      if (!account) {
        return res.status(400).send("No Basecamp 3 account found");
      }

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      // Check if connection exists
      const existingConnection = await storage.getBasecampConnection(userId);
      
      if (existingConnection) {
        // Update existing connection
        await storage.updateBasecampConnection(userId, {
          accountId: account.id.toString(),
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt,
          userName: userData.identity.email_address,
        });
      } else {
        // Create new connection
        await storage.createBasecampConnection({
          userId,
          accountId: account.id.toString(),
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt,
          userName: userData.identity.email_address,
        });
      }

      res.send(`
        <html>
          <body>
            <h2>Basecamp Connected Successfully!</h2>
            <p>You can close this window and return to the application.</p>
            <script>window.close();</script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error in Basecamp OAuth callback:", error);
      res.status(500).send("Failed to complete OAuth flow");
    }
  });

  // Get connection status
  app.get("/api/basecamp/connection", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const connection = await storage.getBasecampConnection(userId);
      
      if (!connection) {
        return res.json({ connected: false });
      }

      res.json({
        connected: true,
        accountId: connection.accountId,
        userName: connection.userName,
        connectedAt: connection.createdAt,
        selectedProjectIds: connection.selectedProjectIds || [],
      });
    } catch (error) {
      console.error("Error fetching connection status:", error);
      res.status(500).json({ error: "Failed to fetch connection status" });
    }
  });

  // Disconnect Basecamp
  app.delete("/api/basecamp/connection", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      await storage.deleteBasecampConnection(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting Basecamp:", error);
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  // Helper function to refresh token if needed
  async function refreshBasecampToken(connection: any): Promise<string> {
    if (new Date() < connection.expiresAt) {
      return connection.accessToken;
    }

    const clientId = process.env.BASECAMP_CLIENT_ID;
    const clientSecret = process.env.BASECAMP_CLIENT_SECRET;

    const response = await fetch("https://launchpad.37signals.com/authorization/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "refresh",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: connection.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const tokenData = await response.json();
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    await storage.updateBasecampConnection(connection.userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
    });

    return tokenData.access_token;
  }

  // Get Basecamp projects
  app.get("/api/basecamp/projects", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const connection = await storage.getBasecampConnection(userId);
      
      if (!connection) {
        return res.status(404).json({ error: "Not connected to Basecamp" });
      }

      const accessToken = await refreshBasecampToken(connection);
      
      const response = await fetch(
        `https://3.basecampapi.com/${connection.accountId}/projects.json`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "Bloom & Grow CRM (your-email@example.com)",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }

      const projects = await response.json();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching Basecamp projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  // Update selected projects
  app.post("/api/basecamp/projects/select", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { projectIds } = req.body;

      if (!Array.isArray(projectIds)) {
        return res.status(400).json({ error: "projectIds must be an array" });
      }

      await storage.updateBasecampConnection(userId, {
        selectedProjectIds: projectIds,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating selected projects:", error);
      res.status(500).json({ error: "Failed to update selected projects" });
    }
  });

  // Get Basecamp todos
  app.get("/api/basecamp/todos", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.query;
      const connection = await storage.getBasecampConnection(userId);
      
      if (!connection) {
        return res.status(404).json({ error: "Not connected to Basecamp" });
      }

      const accessToken = await refreshBasecampToken(connection);
      const projectIds = projectId 
        ? [projectId as string]
        : (connection.selectedProjectIds || []);

      if (projectIds.length === 0) {
        return res.json([]);
      }

      const allTodos: any[] = [];

      for (const pid of projectIds) {
        // Fetch todolists for the project
        const todolistsResponse = await fetch(
          `https://3.basecampapi.com/${connection.accountId}/buckets/${pid}/todolists.json`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "User-Agent": "Bloom & Grow CRM (your-email@example.com)",
            },
          }
        );

        if (!todolistsResponse.ok) continue;

        const todolists = await todolistsResponse.json();

        for (const todolist of todolists) {
          // Fetch todos for each todolist
          const todosResponse = await fetch(
            `https://3.basecampapi.com/${connection.accountId}/buckets/${pid}/todolists/${todolist.id}.json`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": "Bloom & Grow CRM (your-email@example.com)",
              },
            }
          );

          if (!todosResponse.ok) continue;

          const todolistData = await todosResponse.json();
          
          if (todolistData.todos && todolistData.todos.remaining) {
            for (const todo of todolistData.todos.remaining) {
              allTodos.push({
                id: todo.id.toString(),
                title: todo.title,
                description: todo.description,
                completed: todo.completed,
                due_on: todo.due_on,
                project: pid,
                projectName: todolist.bucket?.name || "Unknown Project",
                todolist: todolist.title,
              });
            }
          }
        }
      }

      res.json(allTodos);
    } catch (error) {
      console.error("Error fetching Basecamp todos:", error);
      res.status(500).json({ error: "Failed to fetch todos" });
    }
  });

  // Sync Basecamp todos to CRM
  app.post("/api/basecamp/sync", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { todos, customerId } = req.body;

      if (!Array.isArray(todos) || !customerId) {
        return res.status(400).json({ error: "Invalid request body" });
      }

      let itemsImported = 0;
      let itemsFailed = 0;
      let errorMessage: string | null = null;

      for (const todo of todos) {
        try {
          // Check if already synced
          const existing = await storage.getActionItemByBasecampId(todo.id, userId);
          if (existing) {
            continue;
          }

          // Create action item
          await storage.createActionItem({
            customerId,
            description: `[Basecamp] ${todo.title}`,
            dueDate: todo.due_on ? new Date(todo.due_on) : undefined,
            createdBy: userId,
            basecampTodoId: todo.id,
          });

          itemsImported++;
        } catch (error) {
          itemsFailed++;
          console.error("Error syncing todo:", error);
        }
      }

      // Log sync operation (best-effort)
      try {
        await storage.createBasecampSyncLog({
          userId,
          status: itemsFailed === 0 ? "success" : itemsFailed < todos.length ? "partial" : "failed",
          itemsImported,
          itemsFailed,
          errorMessage,
        });
      } catch (logError) {
        console.error("Error creating sync log:", logError);
      }

      res.json({ success: true, itemsImported, itemsFailed });
    } catch (error) {
      console.error("Error syncing todos:", error);
      res.status(500).json({ error: "Failed to sync todos" });
    }
  });

  // Get sync logs
  app.get("/api/basecamp/sync-logs", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const logs = await storage.getBasecampSyncLogs(userId, 20);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching sync logs:", error);
      res.status(500).json({ error: "Failed to fetch sync logs" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
