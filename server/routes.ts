import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, updateCustomerSchema, insertInteractionSchema, insertSaleSchema, insertBrandSchema, insertCustomerBrandSchema, insertMonthlyTargetSchema, updateMonthlyTargetSchema, insertActionItemSchema, insertMonthlySalesTrackingSchema, updateMonthlySalesTrackingSchema } from "@shared/schema";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  
  app.get("/api/customers", isAuthenticated, async (_req, res) => {
    try {
      const customersWithBrands = await storage.getCustomers();
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
      const customer = await storage.createCustomer(validatedData);
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
      const customer = await storage.updateCustomer(req.params.id, validatedData);
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

  app.get("/api/stats", isAuthenticated, async (_req, res) => {
    try {
      const stats = await storage.getStats();
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
        const targets = await storage.getMonthlyTargets(req.user.id);
        res.json(targets);
      } else {
        const targets = await storage.getMonthlyTargets();
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
      const actionItems = await storage.getActionItems(filter);
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
      const monthlySales = await storage.getMonthlySales(customerId);
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
        const sales = await storage.getSales();
        res.json(sales);
      } else {
        const sales = await storage.getSalesBySalesman(req.user!.id);
        res.json(sales);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  app.get("/api/admin/stats", isAdmin, async (_req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
