import {
  type User,
  type InsertUser,
  type UserRole,
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
  type Brand,
  type InsertBrand,
  type CustomerBrand,
  type InsertCustomerBrand,
  type MonthlyTarget,
  type InsertMonthlyTarget,
  type UpdateMonthlyTarget,
  type ActionItem,
  type InsertActionItem,
  type MonthlySalesTracking,
  type InsertMonthlySalesTracking,
  type UpdateMonthlySalesTracking,
  type CustomerWithDetails,
  type CustomerWithBrands,
  type ActionItemWithCustomer,
  type UserDetails,
  type BasecampConnection,
  users,
  sales,
  customers,
  interactions,
  brands,
  customerBrands,
  monthlyTargets,
  actionItems,
  monthlySalesTracking,
  basecampConnections,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte, and, sql, or, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;

  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  deleteUsers(ids: string[]): Promise<number>;
  getTeamMembers(userId: string): Promise<User[]>;
  getUsers(userId: string, userRole: UserRole): Promise<User[]>;

  getSales(userId: string, userRole: UserRole): Promise<Sale[]>;
  getSalesBySalesman(salesmanId: string): Promise<Sale[]>;
  createSale(sale: InsertSale): Promise<Sale>;
  updateSale(id: string, sale: Partial<InsertSale>): Promise<Sale | undefined>;
  deleteSale(id: string): Promise<boolean>;
  getSalesmanStats(userId: string, userRole: UserRole): Promise<SalesmanStats[]>;
  getAdminStats(userId: string, userRole: UserRole): Promise<AdminDashboardStats>;

  getCustomers(userId: string, userRole: UserRole): Promise<CustomerWithBrands[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerWithInteractions(id: string): Promise<CustomerWithInteractions | undefined>;
  getCustomerWithDetails(id: string): Promise<CustomerWithDetails | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: UpdateCustomer): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;

  getInteractions(): Promise<Interaction[]>;
  getInteractionsByCustomer(customerId: string): Promise<Interaction[]>;
  getRecentInteractions(limit?: number): Promise<Interaction[]>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;

  getBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  deleteBrand(id: string): Promise<boolean>;

  getCustomerBrands(customerId: string): Promise<Brand[]>;
  assignBrandToCustomer(customerId: string, brandId: string): Promise<CustomerBrand>;
  removeBrandFromCustomer(customerId: string, brandId: string): Promise<boolean>;

  getMonthlyTargets(userId: string, userRole: UserRole): Promise<MonthlyTarget[]>;
  createMonthlyTarget(target: InsertMonthlyTarget): Promise<MonthlyTarget>;
  updateMonthlyTarget(id: string, target: UpdateMonthlyTarget): Promise<MonthlyTarget | undefined>;

  getActionItems(userId: string, userRole: UserRole, filter?: "all" | "overdue" | "today" | "upcoming"): Promise<ActionItemWithCustomer[]>;
  getActionItemsByCustomer(customerId: string): Promise<ActionItem[]>;
  createActionItem(item: InsertActionItem): Promise<ActionItem>;
  completeActionItem(id: string): Promise<ActionItem | undefined>;

  getMonthlySales(userId: string, userRole: UserRole, customerId?: string): Promise<MonthlySalesTracking[]>;
  createMonthlySales(sales: InsertMonthlySalesTracking): Promise<MonthlySalesTracking>;
  updateMonthlySales(id: string, sales: UpdateMonthlySalesTracking): Promise<MonthlySalesTracking | undefined>;

  getSegments(): Promise<Segment[]>;
  getStats(): Promise<DashboardStats>;
  getUserDetails(requestingUserId: string, requestingUserRole: UserRole, targetUserId: string): Promise<UserDetails | null>;
  canViewUserDetails(requestingUserId: string, targetUserId: string, requestingUserRole: UserRole): Promise<boolean>;

  saveBasecampConnection(connection: { userId: string; accessToken: string; refreshToken: string; expiresAt: Date; basecampAccountId: string; basecampUserName: string | null }): Promise<void>;
  getBasecampConnection(userId: string): Promise<BasecampConnection | null>;
  deleteBasecampConnection(userId: string): Promise<void>;
  refreshBasecampToken(userId: string): Promise<{ accessToken: string; refreshToken: string } | null>;
  fetchBasecampProjects(userId: string): Promise<any[]>;
  saveSelectedProjects(userId: string, projectIds: string[]): Promise<void>;
  fetchBasecampTodos(userId: string): Promise<any[]>;
  createActionItemFromBasecamp(data: { basecampTodoId: string; customerId: string; description: string; dueDate?: Date; createdBy: string }): Promise<ActionItem>;
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

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async deleteUsers(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(users).where(inArray(users.id, ids));
    return result.rowCount || 0;
  }

  async getTeamMembers(userId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.managerId, userId));
  }

  async getUsers(userId: string, userRole: UserRole): Promise<User[]> {
    const effectiveRole = userRole === "admin" ? "ceo" : userRole;
    if (effectiveRole === "ceo") {
      return await db.select().from(users);
    } else if (effectiveRole === "manager") {
      // Include the manager themselves along with their team members
      const manager = await this.getUser(userId);
      const teamMembers = await this.getTeamMembers(userId);
      return manager ? [manager, ...teamMembers] : teamMembers;
    } else {
      const user = await this.getUser(userId);
      return user ? [user] : [];
    }
  }

  async getSales(userId: string, userRole: UserRole): Promise<Sale[]> {
    const effectiveRole = userRole === "admin" ? "ceo" : userRole;
    if (effectiveRole === "ceo") {
      return await db.select().from(sales).orderBy(desc(sales.date));
    } else if (effectiveRole === "manager") {
      const teamMembers = await this.getTeamMembers(userId);
      const teamMemberIds = teamMembers.map(member => member.id);
      const allUserIds = [userId, ...teamMemberIds];

      if (allUserIds.length === 0) {
        return [];
      }

      return await db
        .select()
        .from(sales)
        .where(inArray(sales.salesmanId, allUserIds))
        .orderBy(desc(sales.date));
    } else {
      return await db
        .select()
        .from(sales)
        .where(eq(sales.salesmanId, userId))
        .orderBy(desc(sales.date));
    }
  }

  async getSalesBySalesman(salesmanId: string): Promise<Sale[]> {
    return await db.select().from(sales).where(eq(sales.salesmanId, salesmanId)).orderBy(desc(sales.date));
  }

  async createSale(saleData: InsertSale): Promise<Sale> {
    const [sale] = await db.insert(sales).values(saleData).returning();
    return sale;
  }

  async updateSale(id: string, saleData: Partial<InsertSale>): Promise<Sale | undefined> {
    const [sale] = await db.update(sales).set(saleData).where(eq(sales.id, id)).returning();
    return sale;
  }

  async deleteSale(id: string): Promise<boolean> {
    const result = await db.delete(sales).where(eq(sales.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getSalesmanStats(userId: string, userRole: UserRole): Promise<SalesmanStats[]> {
    const allSales = await db.select().from(sales);

    let allSalesmen: User[];
    const effectiveRole = userRole === "admin" ? "ceo" : userRole;
    if (effectiveRole === "ceo") {
      allSalesmen = await db.select().from(users).where(eq(users.role, "salesman"));
    } else if (effectiveRole === "manager") {
      allSalesmen = await this.getTeamMembers(userId);
    } else {
      const user = await this.getUser(userId);
      allSalesmen = user ? [user] : [];
    }

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

  async canViewUserDetails(requestingUserId: string, targetUserId: string, requestingUserRole: UserRole): Promise<boolean> {
    const effectiveRole = requestingUserRole === "admin" ? "ceo" : requestingUserRole;
    
    if (effectiveRole === "ceo") {
      return true; // CEO can view everyone
    }
    
    if (effectiveRole === "manager") {
      // Managers can only view their team members
      const teamMembers = await this.getTeamMembers(requestingUserId);
      return teamMembers.some(member => member.id === targetUserId) || requestingUserId === targetUserId;
    }
    
    // Regular users can only view themselves
    return requestingUserId === targetUserId;
  }

  async getAdminStats(userId: string, userRole: UserRole): Promise<AdminDashboardStats> {
    let relevantSales: Sale[];

    const effectiveRole = userRole === "admin" ? "ceo" : userRole;
    if (effectiveRole === "ceo") {
      relevantSales = await db.select().from(sales);
    } else if (effectiveRole === "manager") {
      const teamMembers = await this.getTeamMembers(userId);
      const teamMemberIds = teamMembers.map(member => member.id);

      if (teamMemberIds.length === 0) {
        relevantSales = [];
      } else {
        relevantSales = await db.select().from(sales).where(inArray(sales.salesmanId, teamMemberIds));
      }
    } else {
      relevantSales = await db.select().from(sales).where(eq(sales.salesmanId, userId));
    }

    const totalRevenue = relevantSales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    const salesmenStats = await this.getSalesmanStats(userId, userRole);

    return {
      totalSales: relevantSales.length,
      totalRevenue: totalRevenue.toFixed(2),
      salesmenStats,
    };
  }

  async getCustomers(userId: string, userRole: UserRole): Promise<CustomerWithBrands[]> {
    let allCustomers: Customer[];

    // Treat 'admin' role as 'ceo' for data visibility
    const effectiveRole = userRole === "admin" ? "ceo" : userRole;

    if (effectiveRole === "ceo") {
      allCustomers = await db.select().from(customers).orderBy(desc(customers.createdAt));
    } else if (effectiveRole === "manager") {
      const teamMembers = await this.getTeamMembers(userId);
      const teamMemberIds = teamMembers.map(member => member.id);
      const allUserIds = [userId, ...teamMemberIds];

      if (allUserIds.length === 0) {
        allCustomers = [];
      } else {
        allCustomers = await db
          .select()
          .from(customers)
          .where(inArray(customers.assignedTo, allUserIds))
          .orderBy(desc(customers.createdAt));
      }
    } else {
      allCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.assignedTo, userId))
        .orderBy(desc(customers.createdAt));
    }

    const customersWithBrands = await Promise.all(
      allCustomers.map(async (customer) => {
        const customerBrandsList = await this.getCustomerBrands(customer.id);
        return {
          ...customer,
          brands: customerBrandsList,
        };
      })
    );

    return customersWithBrands;
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

  async getCustomerWithDetails(id: string): Promise<CustomerWithDetails | undefined> {
    const customer = await this.getCustomer(id);
    if (!customer) return undefined;

    const customerInteractions = await this.getInteractionsByCustomer(id);
    const customerBrandsList = await this.getCustomerBrands(id);
    const customerActionItems = await this.getActionItemsByCustomer(id);
    const customerMonthlySales = await db
      .select()
      .from(monthlySalesTracking)
      .where(eq(monthlySalesTracking.customerId, id))
      .orderBy(desc(monthlySalesTracking.year), desc(monthlySalesTracking.month));

    return {
      ...customer,
      interactions: customerInteractions,
      brands: customerBrandsList,
      actionItems: customerActionItems,
      monthlySales: customerMonthlySales,
    };
  }

  async getBrands(): Promise<Brand[]> {
    return await db.select().from(brands).orderBy(brands.name);
  }

  async getBrand(id: string): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    return brand;
  }

  async createBrand(brandData: InsertBrand): Promise<Brand> {
    const [brand] = await db.insert(brands).values(brandData).returning();
    return brand;
  }

  async deleteBrand(id: string): Promise<boolean> {
    await db.delete(customerBrands).where(eq(customerBrands.brandId, id));
    const result = await db.delete(brands).where(eq(brands.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getCustomerBrands(customerId: string): Promise<Brand[]> {
    const customerBrandsList = await db
      .select()
      .from(customerBrands)
      .where(eq(customerBrands.customerId, customerId));

    const brandIds = customerBrandsList.map(cb => cb.brandId);
    if (brandIds.length === 0) return [];

    const brandList = await db
      .select()
      .from(brands)
      .where(sql`${brands.id} = ANY(${brandIds})`);

    return brandList;
  }

  async assignBrandToCustomer(customerId: string, brandId: string): Promise<CustomerBrand> {
    const [customerBrand] = await db
      .insert(customerBrands)
      .values({ customerId, brandId })
      .returning();
    return customerBrand;
  }

  async removeBrandFromCustomer(customerId: string, brandId: string): Promise<boolean> {
    const result = await db
      .delete(customerBrands)
      .where(
        and(
          eq(customerBrands.customerId, customerId),
          eq(customerBrands.brandId, brandId)
        )
      );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getMonthlyTargets(userId: string, userRole: UserRole): Promise<MonthlyTarget[]> {
    const effectiveRole = userRole === "admin" ? "ceo" : userRole;
    if (effectiveRole === "ceo") {
      return await db
        .select()
        .from(monthlyTargets)
        .orderBy(desc(monthlyTargets.year), desc(monthlyTargets.month));
    } else if (effectiveRole === "manager") {
      const teamMembers = await this.getTeamMembers(userId);
      const teamMemberIds = teamMembers.map(member => member.id);
      const allUserIds = [userId, ...teamMemberIds];

      return await db
        .select()
        .from(monthlyTargets)
        .where(
          or(
            inArray(monthlyTargets.salesmanId, allUserIds),
            eq(monthlyTargets.targetType, "general")
          )
        )
        .orderBy(desc(monthlyTargets.year), desc(monthlyTargets.month));
    } else {
      return await db
        .select()
        .from(monthlyTargets)
        .where(
          or(
            eq(monthlyTargets.salesmanId, userId),
            eq(monthlyTargets.targetType, "general")
          )
        )
        .orderBy(desc(monthlyTargets.year), desc(monthlyTargets.month));
    }
  }

  async createMonthlyTarget(target: InsertMonthlyTarget): Promise<MonthlyTarget> {
    const amount = parseFloat(target.targetAmount);
    if (isNaN(amount)) {
      throw new Error("Invalid target amount");
    }

    const [newTarget] = await db
      .insert(monthlyTargets)
      .values({
        ...target,
        targetAmount: target.targetAmount,
      })
      .returning();
    return newTarget;
  }

  async updateMonthlyTarget(id: string, target: UpdateMonthlyTarget): Promise<MonthlyTarget | undefined> {
    if (target.targetAmount) {
      const amount = parseFloat(target.targetAmount);
      if (isNaN(amount)) {
        throw new Error("Invalid target amount");
      }
    }

    const [updated] = await db
      .update(monthlyTargets)
      .set(target)
      .where(eq(monthlyTargets.id, id))
      .returning();
    return updated;
  }

  async getActionItems(userId: string, userRole: UserRole, filter: "all" | "overdue" | "today" | "upcoming" = "all"): Promise<ActionItemWithCustomer[]> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    let allowedCustomerIds: string[];

    if (userRole === "admin") {
      const allCustomers = await db.select().from(customers);
      allowedCustomerIds = allCustomers.map(c => c.id);
    } else if (userRole === "manager") {
      const teamMembers = await this.getTeamMembers(userId);
      const teamMemberIds = teamMembers.map(member => member.id);
      const allUserIds = [userId, ...teamMemberIds];

      const teamCustomers = await db
        .select()
        .from(customers)
        .where(inArray(customers.assignedTo, allUserIds));
      allowedCustomerIds = teamCustomers.map(c => c.id);
    } else {
      const ownCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.assignedTo, userId));
      allowedCustomerIds = ownCustomers.map(c => c.id);
    }

    if (allowedCustomerIds.length === 0) {
      return [];
    }

    let items: ActionItem[] = [];

    if (filter === "all") {
      items = await db
        .select()
        .from(actionItems)
        .where(inArray(actionItems.customerId, allowedCustomerIds))
        .orderBy(actionItems.dueDate);
    } else if (filter === "overdue") {
      items = await db
        .select()
        .from(actionItems)
        .where(
          and(
            inArray(actionItems.customerId, allowedCustomerIds),
            sql`${actionItems.dueDate} < ${now}`,
            sql`${actionItems.completedAt} IS NULL`
          )
        )
        .orderBy(actionItems.dueDate);
    } else if (filter === "today") {
      items = await db
        .select()
        .from(actionItems)
        .where(
          and(
            inArray(actionItems.customerId, allowedCustomerIds),
            sql`${actionItems.dueDate} >= ${todayStart}`,
            sql`${actionItems.dueDate} <= ${todayEnd}`,
            sql`${actionItems.completedAt} IS NULL`
          )
        )
        .orderBy(actionItems.dueDate);
    } else if (filter === "upcoming") {
      items = await db
        .select()
        .from(actionItems)
        .where(
          and(
            inArray(actionItems.customerId, allowedCustomerIds),
            sql`${actionItems.dueDate} > ${todayEnd}`,
            sql`${actionItems.completedAt} IS NULL`
          )
        )
        .orderBy(actionItems.dueDate);
    }

    const itemsWithCustomer: ActionItemWithCustomer[] = [];
    for (const item of items) {
      const customer = await this.getCustomer(item.customerId);
      itemsWithCustomer.push({
        ...item,
        customerName: customer?.name || "Unknown",
      });
    }

    return itemsWithCustomer;
  }

  async getActionItemsByCustomer(customerId: string): Promise<ActionItem[]> {
    return await db
      .select()
      .from(actionItems)
      .where(eq(actionItems.customerId, customerId))
      .orderBy(actionItems.dueDate);
  }

  async createActionItem(itemData: InsertActionItem): Promise<ActionItem> {
    const [item] = await db.insert(actionItems).values(itemData).returning();
    return item;
  }

  async completeActionItem(id: string): Promise<ActionItem | undefined> {
    const [item] = await db
      .update(actionItems)
      .set({ completedAt: new Date() })
      .where(eq(actionItems.id, id))
      .returning();
    return item;
  }

  async getMonthlySales(userId: string, userRole: UserRole, customerId?: string): Promise<MonthlySalesTracking[]> {
    if (customerId) {
      return await db
        .select()
        .from(monthlySalesTracking)
        .where(eq(monthlySalesTracking.customerId, customerId))
        .orderBy(desc(monthlySalesTracking.year), desc(monthlySalesTracking.month));
    }

    let allowedCustomerIds: string[];

    const effectiveRole = userRole === "admin" ? "ceo" : userRole;
    if (effectiveRole === "ceo") {
      const allCustomers = await db.select().from(customers);
      allowedCustomerIds = allCustomers.map(c => c.id);
    } else if (effectiveRole === "manager") {
      const teamMembers = await this.getTeamMembers(userId);
      const teamMemberIds = teamMembers.map(member => member.id);
      const allUserIds = [userId, ...teamMemberIds];

      const teamCustomers = await db
        .select()
        .from(customers)
        .where(inArray(customers.assignedTo, allUserIds));
      allowedCustomerIds = teamCustomers.map(c => c.id);
    } else {
      const ownCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.assignedTo, userId));
      allowedCustomerIds = ownCustomers.map(c => c.id);
    }

    if (allowedCustomerIds.length === 0) {
      return [];
    }

    return await db
      .select()
      .from(monthlySalesTracking)
      .where(inArray(monthlySalesTracking.customerId, allowedCustomerIds))
      .orderBy(desc(monthlySalesTracking.year), desc(monthlySalesTracking.month));
  }

  async createMonthlySales(salesData: InsertMonthlySalesTracking): Promise<MonthlySalesTracking> {
    const [sales] = await db.insert(monthlySalesTracking).values(salesData).returning();
    return sales;
  }

  async updateMonthlySales(id: string, updateData: UpdateMonthlySalesTracking): Promise<MonthlySalesTracking | undefined> {
    const [sales] = await db
      .update(monthlySalesTracking)
      .set(updateData)
      .where(eq(monthlySalesTracking.id, id))
      .returning();
    return sales;
  }

  async getSegments(): Promise<Segment[]> {
    const allCustomers = await db.select().from(customers);

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
    const allCustomers = await db.select().from(customers);
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

  async getUserDetails(requestingUserId: string, requestingUserRole: UserRole, targetUserId: string): Promise<UserDetails | null> {
    // Authorization: check if requesting user has access to target user
    const effectiveRole = requestingUserRole === "admin" ? "ceo" : requestingUserRole;
    
    if (effectiveRole === "manager") {
      // Managers can only view their direct team members
      const targetUser = await this.getUser(targetUserId);
      if (!targetUser || (targetUser.managerId !== requestingUserId && targetUserId !== requestingUserId)) {
        return null; // Not authorized
      }
    } else if (effectiveRole === "salesman") {
      // Salesmen can only view their own details
      if (targetUserId !== requestingUserId) {
        return null; // Not authorized
      }
    }
    // CEO can view anyone

    // Fetch user information
    const targetUser = await this.getUser(targetUserId);
    if (!targetUser) {
      return null;
    }

    // Remove password from user object
    const { password, ...userWithoutPassword } = targetUser;

    // Fetch manager if exists
    let manager: Omit<User, 'password'> | null = null;
    if (targetUser.managerId) {
      const managerUser = await this.getUser(targetUser.managerId);
      if (managerUser) {
        const { password: _, ...managerWithoutPassword } = managerUser;
        manager = managerWithoutPassword;
      }
    }

    // Fetch monthly targets (both personal and general)
    const allTargets = await db.select().from(monthlyTargets);
    const userTargets = allTargets.filter(t => 
      t.salesmanId === targetUserId || 
      (t.targetType === "general" && (t.salesmanId === null || t.salesmanId === targetUserId))
    );

    // Fetch action items with customer names
    const userActionItems = await db
      .select({
        id: actionItems.id,
        customerId: actionItems.customerId,
        description: actionItems.description,
        dueDate: actionItems.dueDate,
        completedAt: actionItems.completedAt,
        createdBy: actionItems.createdBy,
        visitDate: actionItems.visitDate,
        basecampTodoId: actionItems.basecampTodoId,
        createdAt: actionItems.createdAt,
        customerName: customers.name,
      })
      .from(actionItems)
      .leftJoin(customers, eq(actionItems.customerId, customers.id))
      .where(eq(actionItems.createdBy, targetUserId)) as ActionItemWithCustomer[];

    // Fetch sales
    const userSales = await db
      .select()
      .from(sales)
      .where(eq(sales.salesmanId, targetUserId))
      .orderBy(desc(sales.date));

    // Calculate metrics
    const totalSales = userSales.length;
    const totalRevenue = userSales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;
    const pendingActionItems = userActionItems.filter(a => !a.completedAt).length;
    const completedActionItems = userActionItems.filter(a => a.completedAt).length;

    return {
      user: userWithoutPassword,
      manager,
      monthlyTargets: userTargets,
      actionItems: userActionItems,
      sales: userSales,
      metrics: {
        totalSales,
        totalRevenue,
        averageSale,
        pendingActionItems,
        completedActionItems,
      },
    };
  }

  async saveBasecampConnection(connection: {
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    basecampAccountId: string;
    basecampUserName: string | null;
  }): Promise<void> {
    await db
      .insert(basecampConnections)
      .values({
        userId: connection.userId,
        accessToken: connection.accessToken,
        refreshToken: connection.refreshToken,
        expiresAt: connection.expiresAt,
        basecampAccountId: connection.basecampAccountId,
        basecampUserName: connection.basecampUserName,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: basecampConnections.userId,
        set: {
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken,
          expiresAt: connection.expiresAt,
          basecampAccountId: connection.basecampAccountId,
          basecampUserName: connection.basecampUserName,
          updatedAt: new Date(),
        },
      });
  }

  async getBasecampConnection(userId: string): Promise<BasecampConnection | null> {
    const [connection] = await db
      .select()
      .from(basecampConnections)
      .where(eq(basecampConnections.userId, userId));
    return connection || null;
  }

  async deleteBasecampConnection(userId: string): Promise<void> {
    await db.delete(basecampConnections).where(eq(basecampConnections.userId, userId));
  }

  async refreshBasecampToken(userId: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    const connection = await this.getBasecampConnection(userId);
    if (!connection) return null;

    try {
      const response = await fetch('https://launchpad.37signals.com/authorization/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'refresh',
          refresh_token: connection.refreshToken,
          client_id: process.env.BASECAMP_CLIENT_ID,
          client_secret: process.env.BASECAMP_CLIENT_SECRET,
        }),
      });

      if (!response.ok) return null;

      const tokenData = await response.json();
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      await this.saveBasecampConnection({
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || connection.refreshToken,
        expiresAt,
        basecampAccountId: connection.basecampAccountId,
        basecampUserName: connection.basecampUserName,
      });

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || connection.refreshToken,
      };
    } catch (error) {
      console.error('Error refreshing Basecamp token:', error);
      return null;
    }
  }

  async fetchBasecampProjects(userId: string): Promise<any[]> {
    const connection = await this.getBasecampConnection(userId);
    if (!connection) return [];

    // Refresh token if expired
    if (new Date() >= connection.expiresAt) {
      const newTokens = await this.refreshBasecampToken(userId);
      if (!newTokens) return [];
      connection.accessToken = newTokens.accessToken;
    }

    try {
      const projectsResponse = await fetch(
        `https://3.basecampapi.com/${connection.basecampAccountId}/projects.json`,
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'User-Agent': 'Bloom & Grow CRM (crm@bloomandgrow.com)',
          },
        }
      );

      if (!projectsResponse.ok) return [];

      const projects = await projectsResponse.json();
      return projects.map((project: any) => ({
        id: String(project.id),
        name: project.name,
        description: project.description,
      }));
    } catch (error) {
      console.error('Error fetching Basecamp projects:', error);
      return [];
    }
  }

  async saveSelectedProjects(userId: string, projectIds: string[]): Promise<void> {
    await db
      .update(basecampConnections)
      .set({ 
        selectedProjectIds: projectIds,
        updatedAt: new Date(),
      })
      .where(eq(basecampConnections.userId, userId));
  }

  async fetchBasecampTodos(userId: string): Promise<any[]> {
    const connection = await this.getBasecampConnection(userId);
    if (!connection) return [];

    // Refresh token if expired
    if (new Date() >= connection.expiresAt) {
      const newTokens = await this.refreshBasecampToken(userId);
      if (!newTokens) return [];
      connection.accessToken = newTokens.accessToken;
    }

    try {
      // Get all projects
      const projectsResponse = await fetch(
        `https://3.basecampapi.com/${connection.basecampAccountId}/projects.json`,
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'User-Agent': 'Bloom & Grow CRM (crm@bloomandgrow.com)',
          },
        }
      );

      if (!projectsResponse.ok) return [];

      const projects = await projectsResponse.json();
      
      // Filter projects if user has selected specific ones
      const selectedProjectIds = connection.selectedProjectIds || [];
      const projectsToFetch = selectedProjectIds.length > 0
        ? projects.filter((p: any) => selectedProjectIds.includes(String(p.id)))
        : projects;

      const allTodos: any[] = [];

      // Fetch todos from each project
      for (const project of projectsToFetch) {
        try {
          const todosetsResponse = await fetch(
            `https://3.basecampapi.com/${connection.basecampAccountId}/buckets/${project.id}/todosets.json`,
            {
              headers: {
                'Authorization': `Bearer ${connection.accessToken}`,
                'User-Agent': 'Bloom & Grow CRM (crm@bloomandgrow.com)',
              },
            }
          );

          if (todosetsResponse.ok) {
            const todosets = await todosetsResponse.json();
            
            for (const todoset of todosets) {
              if (todoset.todolists_url) {
                const todolistsResponse = await fetch(todoset.todolists_url, {
                  headers: {
                    'Authorization': `Bearer ${connection.accessToken}`,
                    'User-Agent': 'Bloom & Grow CRM (crm@bloomandgrow.com)',
                  },
                });

                if (todolistsResponse.ok) {
                  const todolists = await todolistsResponse.json();
                  
                  for (const todolist of todolists) {
                    if (todolist.todos_url) {
                      const todosResponse = await fetch(todolist.todos_url, {
                        headers: {
                          'Authorization': `Bearer ${connection.accessToken}`,
                          'User-Agent': 'Bloom & Grow CRM (crm@bloomandgrow.com)',
                        },
                      });

                      if (todosResponse.ok) {
                        const todos = await todosResponse.json();
                        allTodos.push(...todos.map((todo: any) => ({
                          id: todo.id,
                          title: todo.title || todo.content,
                          description: todo.description,
                          completed: todo.completed,
                          due_on: todo.due_on,
                          project: project.name,
                          todolist: todolist.name,
                        })));
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching todos for project ${project.id}:`, error);
        }
      }

      return allTodos;
    } catch (error) {
      console.error('Error fetching Basecamp todos:', error);
      return [];
    }
  }

  async createActionItemFromBasecamp(data: {
    basecampTodoId: string;
    customerId: string;
    description: string;
    dueDate?: Date;
    createdBy: string;
  }): Promise<ActionItem> {
    // Check if this Basecamp todo is already linked
    const existing = await db
      .select()
      .from(actionItems)
      .where(eq(actionItems.basecampTodoId, data.basecampTodoId));

    if (existing.length > 0) {
      throw new Error('This Basecamp todo is already linked to an action item');
    }

    const [actionItem] = await db
      .insert(actionItems)
      .values({
        customerId: data.customerId,
        description: data.description,
        dueDate: data.dueDate || null,
        createdBy: data.createdBy,
        basecampTodoId: data.basecampTodoId,
      })
      .returning();

    return actionItem;
  }
}

export const storage = new DatabaseStorage();