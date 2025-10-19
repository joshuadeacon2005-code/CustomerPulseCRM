import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("salesman"),
  managerId: varchar("manager_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salesmanId: varchar("salesman_id").notNull(),
  customerName: text("customer_name").notNull(),
  product: text("product").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  stage: text("stage").notNull().default("lead"),
  assignedTo: text("assigned_to"),
  leadScore: integer("lead_score").notNull().default(0),
  personalNotes: text("personal_notes"),
  registeredWithBC: boolean("registered_with_bc").notNull().default(false),
  ordersViaBC: boolean("orders_via_bc").notNull().default(false),
  firstOrderDate: timestamp("first_order_date"),
  storeAddress: text("store_address"),
  retailerType: text("retailer_type"),
  quarterlySoftTarget: text("quarterly_soft_target"),
  lastContactDate: timestamp("last_contact_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const interactions = pgTable("interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull().defaultNow(),
});

export const brands = pgTable("brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customerBrands = pgTable("customer_brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  brandId: varchar("brand_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const monthlyTargets = pgTable("monthly_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salesmanId: varchar("salesman_id"),
  targetType: text("target_type").notNull().default("personal"),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const actionItems = pgTable("action_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  description: text("description").notNull(),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by").notNull(),
  visitDate: timestamp("visit_date"),
  basecampTodoId: text("basecamp_todo_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const basecampConnections = pgTable("basecamp_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  basecampAccountId: text("basecamp_account_id").notNull(),
  basecampUserName: text("basecamp_user_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const monthlySalesTracking = pgTable("monthly_sales_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  budget: decimal("budget", { precision: 10, scale: 2 }).notNull(),
  actual: decimal("actual", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  role: z.enum(["ceo", "admin", "manager", "salesman"]).optional().default("salesman"),
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  name: z.string().min(1),
  managerId: z.string().optional().nullable(),
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  date: true,
}).extend({
  salesmanId: z.string().min(1),
  customerName: z.string().min(1),
  product: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
}).extend({
  stage: z.enum(["lead", "prospect", "customer"]).default("lead"),
  leadScore: z.number().min(0).max(100).default(0),
});

export const updateCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
}).partial().extend({
  stage: z.enum(["lead", "prospect", "customer"]).optional(),
  leadScore: z.number().min(0).max(100).optional(),
});

export const insertInteractionSchema = createInsertSchema(interactions).omit({
  id: true,
  date: true,
}).extend({
  category: z.enum(["marketing", "sales", "support"]),
  type: z.string().min(1),
});

export const insertBrandSchema = createInsertSchema(brands).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1).max(100),
});

export const insertCustomerBrandSchema = createInsertSchema(customerBrands).omit({
  id: true,
  createdAt: true,
});

export const insertMonthlyTargetSchema = createInsertSchema(monthlyTargets).omit({
  id: true,
  createdAt: true,
}).extend({
  targetType: z.enum(["personal", "general"]).default("personal"),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
  targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  salesmanId: z.string().optional().nullable(),
});

export const updateMonthlyTargetSchema = createInsertSchema(monthlyTargets).omit({
  id: true,
  createdAt: true,
  salesmanId: true,
}).partial();

export const insertActionItemSchema = createInsertSchema(actionItems).omit({
  id: true,
  createdAt: true,
  completedAt: true,
}).extend({
  description: z.string().min(1),
});

export const insertMonthlySalesTrackingSchema = createInsertSchema(monthlySalesTracking).omit({
  id: true,
  createdAt: true,
}).extend({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
  budget: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  actual: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format").optional(),
});

export const updateMonthlySalesTrackingSchema = createInsertSchema(monthlySalesTracking).omit({
  id: true,
  createdAt: true,
  customerId: true,
}).partial();

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;
export type Interaction = typeof interactions.$inferSelect;
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type CustomerBrand = typeof customerBrands.$inferSelect;
export type InsertCustomerBrand = z.infer<typeof insertCustomerBrandSchema>;
export type MonthlyTarget = typeof monthlyTargets.$inferSelect;
export type InsertMonthlyTarget = z.infer<typeof insertMonthlyTargetSchema>;
export type UpdateMonthlyTarget = z.infer<typeof updateMonthlyTargetSchema>;
export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = z.infer<typeof insertActionItemSchema>;
export type MonthlySalesTracking = typeof monthlySalesTracking.$inferSelect;
export type InsertMonthlySalesTracking = z.infer<typeof insertMonthlySalesTrackingSchema>;
export type UpdateMonthlySalesTracking = z.infer<typeof updateMonthlySalesTrackingSchema>;
export type BasecampConnection = typeof basecampConnections.$inferSelect;

export type UserRole = "ceo" | "admin" | "manager" | "salesman";
export type CustomerStage = "lead" | "prospect" | "customer";
export type InteractionCategory = "marketing" | "sales" | "support";

export type CustomerWithInteractions = Customer & {
  interactions: Interaction[];
};

export type CustomerWithBrands = Customer & {
  brands: Brand[];
};

export type CustomerWithDetails = Customer & {
  interactions: Interaction[];
  brands: Brand[];
  actionItems: ActionItem[];
  monthlySales: MonthlySalesTracking[];
};

export type ActionItemWithCustomer = ActionItem & {
  customerName: string;
};

export type Segment = {
  id: string;
  name: string;
  description: string;
  count: number;
  criteria: {
    stage?: CustomerStage[];
    minScore?: number;
    maxScore?: number;
    hasInteractionType?: string;
  };
};

export type DashboardStats = {
  totalCustomers: number;
  leadCount: number;
  prospectCount: number;
  customerCount: number;
  averageLeadScore: number;
  recentInteractions: number;
};

export type SalesmanStats = {
  salesmanId: string;
  salesmanName: string;
  totalSales: number;
  totalAmount: string;
  recentSales: Sale[];
};

export type AdminDashboardStats = {
  totalSales: number;
  totalRevenue: string;
  salesmenStats: SalesmanStats[];
};

export type UserDetails = {
  user: Omit<User, 'password'>;
  manager: Omit<User, 'password'> | null;
  monthlyTargets: MonthlyTarget[];
  actionItems: ActionItemWithCustomer[];
  sales: Sale[];
  metrics: {
    totalSales: number;
    totalRevenue: number;
    averageSale: number;
    pendingActionItems: number;
    completedActionItems: number;
  };
};
