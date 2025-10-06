import { 
  type User,
  type InsertUser,
  type Sale,
  type InsertSale,
  type Customer, 
  type InsertCustomer,
  type UpdateCustomer,
  type Interaction,
  type InsertInteraction,
  type Segment,
  type DashboardStats,
  type CustomerWithInteractions,
  type SalesmanStats,
  type AdminDashboardStats,
  users,
  sales,
  customers,
  interactions,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte, and, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getSales(): Promise<Sale[]>;
  getSalesBySalesman(salesmanId: string): Promise<Sale[]>;
  createSale(sale: InsertSale): Promise<Sale>;
  getSalesmanStats(): Promise<SalesmanStats[]>;
  getAdminStats(): Promise<AdminDashboardStats>;
  
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerWithInteractions(id: string): Promise<CustomerWithInteractions | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: UpdateCustomer): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  
  getInteractions(): Promise<Interaction[]>;
  getInteractionsByCustomer(customerId: string): Promise<Interaction[]>;
  getRecentInteractions(limit?: number): Promise<Interaction[]>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  
  getSegments(): Promise<Segment[]>;
  getStats(): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getSales(): Promise<Sale[]> {
    return await db.select().from(sales).orderBy(desc(sales.date));
  }

  async getSalesBySalesman(salesmanId: string): Promise<Sale[]> {
    return await db.select().from(sales).where(eq(sales.salesmanId, salesmanId)).orderBy(desc(sales.date));
  }

  async createSale(saleData: InsertSale): Promise<Sale> {
    const [sale] = await db.insert(sales).values(saleData).returning();
    return sale;
  }

  async getSalesmanStats(): Promise<SalesmanStats[]> {
    const allSales = await db.select().from(sales);
    const allSalesmen = await db.select().from(users).where(eq(users.role, "salesman"));
    
    const statsMap = new Map<string, SalesmanStats>();
    
    for (const salesman of allSalesmen) {
      const salesmanSales = allSales.filter(s => s.salesmanId === salesman.id);
      const totalAmount = salesmanSales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
      
      statsMap.set(salesman.id, {
        salesmanId: salesman.id,
        salesmanName: salesman.name,
        totalSales: salesmanSales.length,
        totalAmount: totalAmount.toFixed(2),
        recentSales: salesmanSales.slice(0, 5),
      });
    }
    
    return Array.from(statsMap.values());
  }

  async getAdminStats(): Promise<AdminDashboardStats> {
    const allSales = await db.select().from(sales);
    const totalRevenue = allSales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    const salesmenStats = await this.getSalesmanStats();
    
    return {
      totalSales: allSales.length,
      totalRevenue: totalRevenue.toFixed(2),
      salesmenStats,
    };
  }

  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async getCustomerWithInteractions(id: string): Promise<CustomerWithInteractions | undefined> {
    const customer = await this.getCustomer(id);
    if (!customer) return undefined;

    const customerInteractions = await this.getInteractionsByCustomer(id);
    return {
      ...customer,
      interactions: customerInteractions,
    };
  }

  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(customerData).returning();
    return customer;
  }

  async updateCustomer(id: string, updateData: UpdateCustomer): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    await db.delete(interactions).where(eq(interactions.customerId, id));
    const result = await db.delete(customers).where(eq(customers.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getInteractions(): Promise<Interaction[]> {
    return await db.select().from(interactions).orderBy(desc(interactions.date));
  }

  async getInteractionsByCustomer(customerId: string): Promise<Interaction[]> {
    return await db
      .select()
      .from(interactions)
      .where(eq(interactions.customerId, customerId))
      .orderBy(desc(interactions.date));
  }

  async getRecentInteractions(limit: number = 10): Promise<Interaction[]> {
    return await db.select().from(interactions).orderBy(desc(interactions.date)).limit(limit);
  }

  async createInteraction(interactionData: InsertInteraction): Promise<Interaction> {
    const [interaction] = await db.insert(interactions).values(interactionData).returning();
    await this.updateLeadScore(interactionData.customerId);
    return interaction;
  }

  private async updateLeadScore(customerId: string): Promise<void> {
    const customer = await this.getCustomer(customerId);
    if (!customer) return;

    const customerInteractions = await this.getInteractionsByCustomer(customerId);
    
    let score = 0;
    score += Math.min(customerInteractions.length * 5, 30);
    
    const salesInteractions = customerInteractions.filter(i => i.category === "sales").length;
    score += Math.min(salesInteractions * 10, 30);
    
    const marketingInteractions = customerInteractions.filter(i => i.category === "marketing").length;
    score += Math.min(marketingInteractions * 3, 15);
    
    const supportInteractions = customerInteractions.filter(i => i.category === "support").length;
    score += Math.min(supportInteractions * 5, 15);
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentInteractions = customerInteractions.filter(i => new Date(i.date) >= sevenDaysAgo).length;
    score += Math.min(recentInteractions * 5, 10);

    score = Math.min(Math.max(score, 0), 100);

    await this.updateCustomer(customerId, { leadScore: score });
  }

  async getSegments(): Promise<Segment[]> {
    const allCustomers = await this.getCustomers();
    
    const segments: Segment[] = [
      {
        id: "high-value-leads",
        name: "High-Value Leads",
        description: "Leads with high engagement scores ready for conversion",
        count: allCustomers.filter(c => c.stage === "lead" && c.leadScore >= 71).length,
        criteria: {
          stage: ["lead"],
          minScore: 71,
        },
      },
      {
        id: "active-prospects",
        name: "Active Prospects",
        description: "Prospects actively engaged in the sales process",
        count: allCustomers.filter(c => c.stage === "prospect").length,
        criteria: {
          stage: ["prospect"],
        },
      },
      {
        id: "new-customers",
        name: "New Customers",
        description: "Recently converted customers",
        count: allCustomers.filter(c => c.stage === "customer").length,
        criteria: {
          stage: ["customer"],
        },
      },
      {
        id: "at-risk-leads",
        name: "At-Risk Leads",
        description: "Leads with low engagement that need attention",
        count: allCustomers.filter(c => c.stage === "lead" && c.leadScore <= 30).length,
        criteria: {
          stage: ["lead"],
          maxScore: 30,
        },
      },
    ];

    return segments;
  }

  async getStats(): Promise<DashboardStats> {
    const allCustomers = await this.getCustomers();
    const allInteractions = await this.getInteractions();
    
    const leadCount = allCustomers.filter(c => c.stage === "lead").length;
    const prospectCount = allCustomers.filter(c => c.stage === "prospect").length;
    const customerCount = allCustomers.filter(c => c.stage === "customer").length;
    
    const averageLeadScore = allCustomers.length > 0
      ? allCustomers.reduce((sum, c) => sum + c.leadScore, 0) / allCustomers.length
      : 0;
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentInteractions = allInteractions.filter(
      i => new Date(i.date) >= sevenDaysAgo
    ).length;

    return {
      totalCustomers: allCustomers.length,
      leadCount,
      prospectCount,
      customerCount,
      averageLeadScore,
      recentInteractions,
    };
  }
}

export const storage = new DatabaseStorage();
