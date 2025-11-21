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
  type CustomerContact,
  type InsertCustomerContact,
  type CustomerAddress,
  type InsertCustomerAddress,
  type BasecampConnection,
  type InsertBasecampConnection,
  type OauthState,
  type InsertOauthState,
  type CustomerMonthlyTarget,
  type InsertCustomerMonthlyTarget,
  users,
  sales,
  customers,
  interactions,
  brands,
  customerBrands,
  monthlyTargets,
  actionItems,
  monthlySalesTracking,
  customerContacts,
  customerAddresses,
  basecampConnections,
  oauthStates,
  customerMonthlyTargets,
  exchangeRates,
  type ExchangeRate,
  type InsertExchangeRate,
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
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
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

  getCustomerMonthlyTargets(customerId: string): Promise<CustomerMonthlyTarget[]>;
  getCustomerMonthlyTargetById(id: string): Promise<CustomerMonthlyTarget | undefined>;
  createCustomerMonthlyTarget(target: InsertCustomerMonthlyTarget): Promise<CustomerMonthlyTarget>;
  updateCustomerMonthlyTarget(id: string, customerId: string, target: Partial<InsertCustomerMonthlyTarget>): Promise<CustomerMonthlyTarget | undefined>;
  deleteCustomerMonthlyTarget(id: string, customerId: string): Promise<boolean>;

  getMonthlySales(userId: string, userRole: UserRole, customerId?: string): Promise<MonthlySalesTracking[]>;
  createMonthlySales(sales: InsertMonthlySalesTracking): Promise<MonthlySalesTracking>;
  updateMonthlySales(id: string, sales: UpdateMonthlySalesTracking): Promise<MonthlySalesTracking | undefined>;

  getSegments(): Promise<Segment[]>;
  getStats(options?: { monthly?: boolean; month?: number; year?: number }): Promise<DashboardStats>;
  getUserDetails(requestingUserId: string, requestingUserRole: UserRole, targetUserId: string): Promise<UserDetails | null>;
  canViewUserDetails(requestingUserId: string, targetUserId: string, requestingUserRole: UserRole): Promise<boolean>;

  // Customer contacts management
  getCustomerContacts(customerId: string): Promise<CustomerContact[]>;
  createCustomerContact(contact: InsertCustomerContact): Promise<CustomerContact>;
  updateCustomerContact(id: string, contact: Partial<InsertCustomerContact>): Promise<CustomerContact | undefined>;
  deleteCustomerContact(id: string): Promise<boolean>;

  // Customer addresses management
  getCustomerAddresses(customerId: string): Promise<CustomerAddress[]>;
  createCustomerAddress(address: InsertCustomerAddress): Promise<CustomerAddress>;
  updateCustomerAddress(id: string, address: Partial<InsertCustomerAddress>): Promise<CustomerAddress | undefined>;
  deleteCustomerAddress(id: string): Promise<boolean>;

  // Basecamp OAuth management
  getBasecampConnection(userId: string): Promise<BasecampConnection | undefined>;
  createBasecampConnection(connection: InsertBasecampConnection): Promise<BasecampConnection>;
  updateBasecampConnection(userId: string, connection: Partial<InsertBasecampConnection>): Promise<BasecampConnection | undefined>;
  deleteBasecampConnection(userId: string): Promise<boolean>;
  
  // OAuth state management
  createOauthState(state: InsertOauthState): Promise<OauthState>;
  verifyOauthState(state: string): Promise<OauthState | undefined>;
  deleteOauthState(state: string): Promise<boolean>;
  cleanupExpiredOauthStates(): Promise<number>;
  
  // Basecamp todo lookup
  getActionItemByBasecampId(basecampTodoId: string): Promise<ActionItem | undefined>;
  
  // Exchange rates
  getExchangeRate(fromCurrency: string, toCurrency: string): Promise<{ rate: string; updatedAt: Date } | undefined>;
  getAllExchangeRates(): Promise<Array<{ fromCurrency: string; toCurrency: string; rate: string; updatedAt: Date }>>;
  createExchangeRate(fromCurrency: string, toCurrency: string, rate: string): Promise<void>;
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

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
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
    // Allow all authenticated users to see all users (needed for Assigned To dropdown)
    return await db.select().from(users);
  }

  async getSales(userId: string, userRole: UserRole): Promise<Sale[]> {
    const effectiveRole = userRole === "sales_director" ? "ceo" : userRole;
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
    const effectiveRole = userRole === "sales_director" ? "ceo" : userRole;
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
    const effectiveRole = requestingUserRole === "sales_director" ? "ceo" : requestingUserRole;
    
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

    const effectiveRole = userRole === "sales_director" ? "ceo" : userRole;
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

    // Treat 'sales_director' role as 'ceo' for data visibility
    const effectiveRole = userRole === "sales_director" ? "ceo" : userRole;

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
    return interaction;
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
    const additionalContacts = await this.getCustomerContacts(id);
    const addresses = await this.getCustomerAddresses(id);

    // Get assigned user name if assignedTo exists
    let assignedToName = null;
    if (customer.assignedTo) {
      const [assignedUser] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, customer.assignedTo));
      assignedToName = assignedUser?.name;
    }

    return {
      ...customer,
      assignedToName,
      interactions: customerInteractions,
      brands: customerBrandsList,
      actionItems: customerActionItems,
      monthlySales: customerMonthlySales,
      additionalContacts,
      addresses,
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
      .where(inArray(brands.id, brandIds));

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
    const effectiveRole = userRole === "sales_director" ? "ceo" : userRole;
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

    if (userRole === "sales_director") {
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

  async getCustomerMonthlyTargets(customerId: string): Promise<CustomerMonthlyTarget[]> {
    return await db
      .select()
      .from(customerMonthlyTargets)
      .where(eq(customerMonthlyTargets.customerId, customerId))
      .orderBy(desc(customerMonthlyTargets.year), desc(customerMonthlyTargets.month));
  }

  async getCustomerMonthlyTargetById(id: string): Promise<CustomerMonthlyTarget | undefined> {
    const [target] = await db
      .select()
      .from(customerMonthlyTargets)
      .where(eq(customerMonthlyTargets.id, id));
    return target;
  }

  async createCustomerMonthlyTarget(target: InsertCustomerMonthlyTarget): Promise<CustomerMonthlyTarget> {
    const [newTarget] = await db
      .insert(customerMonthlyTargets)
      .values(target)
      .returning();
    return newTarget;
  }

  async updateCustomerMonthlyTarget(id: string, customerId: string, target: Partial<InsertCustomerMonthlyTarget>): Promise<CustomerMonthlyTarget | undefined> {
    const [updated] = await db
      .update(customerMonthlyTargets)
      .set(target)
      .where(and(
        eq(customerMonthlyTargets.id, id),
        eq(customerMonthlyTargets.customerId, customerId)
      ))
      .returning();
    return updated;
  }

  async deleteCustomerMonthlyTarget(id: string, customerId: string): Promise<boolean> {
    const result = await db
      .delete(customerMonthlyTargets)
      .where(and(
        eq(customerMonthlyTargets.id, id),
        eq(customerMonthlyTargets.customerId, customerId)
      ));
    return result.rowCount ? result.rowCount > 0 : false;
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

    const effectiveRole = userRole === "sales_director" ? "ceo" : userRole;
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
        name: "All Leads",
        description: "All leads in the pipeline",
        count: allCustomers.filter(c => c.stage === "lead").length,
        criteria: {
          stage: ["lead"],
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
        name: "Leads Needing Attention",
        description: "Leads with no recent activity",
        count: allCustomers.filter(c => c.stage === "lead" && (!c.lastContactDate || new Date(c.lastContactDate) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))).length,
        criteria: {
          stage: ["lead"],
        },
      },
    ];

    return segments;
  }

  async getStats(options: { monthly?: boolean; month?: number; year?: number } = {}): Promise<DashboardStats> {
    const allCustomers = await db.select().from(customers);
    const allInteractions = await this.getInteractions();

    // Determine the month and year to filter by
    const now = new Date();
    const filterMonth = options.month !== undefined ? options.month : now.getMonth();
    const filterYear = options.year !== undefined ? options.year : now.getFullYear();
    const isMonthlyView = options.monthly || (options.month !== undefined || options.year !== undefined);
    
    const filteredCustomers = isMonthlyView 
      ? allCustomers.filter(c => {
          const createdDate = new Date(c.createdAt);
          return createdDate.getMonth() === filterMonth && createdDate.getFullYear() === filterYear;
        })
      : allCustomers;

    const filteredInteractions = isMonthlyView
      ? allInteractions.filter(i => {
          const interactionDate = new Date(i.date);
          return interactionDate.getMonth() === filterMonth && interactionDate.getFullYear() === filterYear;
        })
      : allInteractions;

    const leadCount = filteredCustomers.filter(c => c.stage === "lead").length;
    const prospectCount = filteredCustomers.filter(c => c.stage === "prospect").length;
    const customerCount = filteredCustomers.filter(c => c.stage === "customer").length;

    // For monthly view, show interactions this month; for overall, last 7 days
    const recentInteractions = isMonthlyView
      ? filteredInteractions.length
      : (() => {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return allInteractions.filter(i => new Date(i.date) >= sevenDaysAgo).length;
        })();

    return {
      totalCustomers: filteredCustomers.length,
      leadCount,
      prospectCount,
      customerCount,
      recentInteractions,
    };
  }

  async getUserDetails(requestingUserId: string, requestingUserRole: UserRole, targetUserId: string): Promise<UserDetails | null> {
    // Authorization: check if requesting user has access to target user
    const effectiveRole = requestingUserRole === "sales_director" ? "ceo" : requestingUserRole;
    
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

  async getCustomerContacts(customerId: string): Promise<CustomerContact[]> {
    return await db
      .select()
      .from(customerContacts)
      .where(eq(customerContacts.customerId, customerId))
      .orderBy(customerContacts.createdAt);
  }

  async createCustomerContact(contactData: InsertCustomerContact): Promise<CustomerContact> {
    const [contact] = await db.insert(customerContacts).values(contactData).returning();
    return contact;
  }

  async updateCustomerContact(id: string, contactData: Partial<InsertCustomerContact>): Promise<CustomerContact | undefined> {
    const [contact] = await db.update(customerContacts)
      .set(contactData)
      .where(eq(customerContacts.id, id))
      .returning();
    return contact;
  }

  async deleteCustomerContact(id: string): Promise<boolean> {
    const result = await db.delete(customerContacts).where(eq(customerContacts.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Customer addresses management
  async getCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
    return await db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, customerId))
      .orderBy(customerAddresses.createdAt);
  }

  async createCustomerAddress(addressData: InsertCustomerAddress): Promise<CustomerAddress> {
    const [address] = await db.insert(customerAddresses).values(addressData).returning();
    return address;
  }

  async updateCustomerAddress(id: string, addressData: Partial<InsertCustomerAddress>): Promise<CustomerAddress | undefined> {
    const [address] = await db.update(customerAddresses)
      .set(addressData)
      .where(eq(customerAddresses.id, id))
      .returning();
    return address;
  }

  async deleteCustomerAddress(id: string): Promise<boolean> {
    const result = await db.delete(customerAddresses).where(eq(customerAddresses.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Basecamp OAuth management
  async getBasecampConnection(userId: string): Promise<BasecampConnection | undefined> {
    const [connection] = await db
      .select()
      .from(basecampConnections)
      .where(eq(basecampConnections.userId, userId));
    return connection;
  }

  async createBasecampConnection(connectionData: InsertBasecampConnection): Promise<BasecampConnection> {
    const [connection] = await db
      .insert(basecampConnections)
      .values(connectionData)
      .returning();
    return connection;
  }

  async updateBasecampConnection(
    userId: string,
    connectionData: Partial<InsertBasecampConnection>
  ): Promise<BasecampConnection | undefined> {
    const [connection] = await db
      .update(basecampConnections)
      .set({ ...connectionData, updatedAt: new Date() })
      .where(eq(basecampConnections.userId, userId))
      .returning();
    return connection;
  }

  async deleteBasecampConnection(userId: string): Promise<boolean> {
    const result = await db
      .delete(basecampConnections)
      .where(eq(basecampConnections.userId, userId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // OAuth state management
  async createOauthState(stateData: InsertOauthState): Promise<OauthState> {
    const [state] = await db.insert(oauthStates).values(stateData).returning();
    return state;
  }

  async verifyOauthState(state: string): Promise<OauthState | undefined> {
    const [stateRecord] = await db
      .select()
      .from(oauthStates)
      .where(
        and(
          eq(oauthStates.state, state),
          gte(oauthStates.expiresAt, new Date())
        )
      );
    return stateRecord;
  }

  async deleteOauthState(state: string): Promise<boolean> {
    const result = await db.delete(oauthStates).where(eq(oauthStates.state, state));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async cleanupExpiredOauthStates(): Promise<number> {
    const result = await db
      .delete(oauthStates)
      .where(sql`${oauthStates.expiresAt} < NOW()`);
    return result.rowCount || 0;
  }

  // Basecamp todo lookup
  async getActionItemByBasecampId(basecampTodoId: string): Promise<ActionItem | undefined> {
    const [item] = await db
      .select()
      .from(actionItems)
      .where(eq(actionItems.basecampTodoId, basecampTodoId));
    return item;
  }

  // Exchange rates
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<{ rate: string; updatedAt: Date } | undefined> {
    const [rate] = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, fromCurrency),
          eq(exchangeRates.toCurrency, toCurrency)
        )
      );
    
    if (rate) {
      return {
        rate: rate.rate,
        updatedAt: rate.updatedAt
      };
    }
    return undefined;
  }

  async getAllExchangeRates(): Promise<Array<{ fromCurrency: string; toCurrency: string; rate: string; updatedAt: Date }>> {
    const rates = await db
      .select()
      .from(exchangeRates);
    
    return rates.map(rate => ({
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      rate: rate.rate,
      updatedAt: rate.updatedAt
    }));
  }

  async createExchangeRate(fromCurrency: string, toCurrency: string, rate: string): Promise<void> {
    await db.insert(exchangeRates).values({
      fromCurrency,
      toCurrency,
      rate,
    }).onConflictDoUpdate({
      target: [exchangeRates.fromCurrency, exchangeRates.toCurrency],
      set: {
        rate,
        updatedAt: new Date()
      }
    });
  }
}

export const storage = new DatabaseStorage();