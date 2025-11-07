import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const REGIONAL_OFFICES = [
  "Hong Kong",
  "Singapore", 
  "Shanghai",
  "Australia/NZ",
  "Indonesia",
  "Malaysia",
  "Guangzhou",
] as const;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("salesman"),
  managerId: varchar("manager_id"),
  country: text("country"),
  regionalOffice: text("regional_office"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salesmanId: varchar("salesman_id").notNull(),
  customerName: text("customer_name").notNull(),
  product: text("product").notNull().default("General Sale"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  country: text("country"),
  date: timestamp("date").notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  contactName: text("contact_name"),
  contactTitle: text("contact_title"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  stage: text("stage").notNull().default("lead"),
  assignedTo: text("assigned_to"),
  personalNotes: text("personal_notes"),
  registeredWithBC: boolean("registered_with_bc").notNull().default(false),
  ordersViaBC: boolean("orders_via_bc").notNull().default(false),
  firstOrderDate: timestamp("first_order_date"),
  storeAddress: text("store_address"),
  retailerType: text("retailer_type"),
  quarterlySoftTarget: text("quarterly_soft_target"),
  lastContactDate: timestamp("last_contact_date"),
  dateOfFirstContact: timestamp("date_of_first_contact"),
  leadGeneratedBy: text("lead_generated_by"),
  country: text("country"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const interactions = pgTable("interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull(),
  meetingType: text("meeting_type"),
  description: text("description").notNull(),
  attendees: text("attendees").array(),
  country: text("country"),
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

export const customerMonthlyTargets = pgTable("customer_monthly_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }).notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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

// Additional contacts for customers
export const customerContacts = pgTable("customer_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  name: text("name").notNull(),
  title: text("title"),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Basecamp OAuth connections
export const basecampConnections = pgTable("basecamp_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  accessToken: text("access_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  basecampUserId: text("basecamp_user_id").notNull(),
  basecampAccountId: text("basecamp_account_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// OAuth state tracking for CSRF protection
export const oauthStates = pgTable("oauth_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  state: text("state").notNull().unique(),
  userId: varchar("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


// Retailer Type Enum - All possible options from requirements
export const RETAILER_TYPES = [
  "Online Only",
  "Online Only (Distributor Owned)",
  "Marketplace",
  "Baby & Nursery Multi-Site",
  "Baby & Nursery Independent/Boutique",
  "Toy Store Multi-Site",
  "Toy Store Independent",
  "Department Store",
  "Pharmacy",
  "Discount/Closeouts",
  "Expo",
  "Corporate",
  "Other",
  "KOL/Marketing",
] as const;

export const MEETING_TYPES = ["In Person", "Phone", "Online Meeting"] as const;

export const INTERACTION_TYPES = ["Call", "Email", "Meeting", "Follow-up"] as const;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  role: z.enum(["ceo", "sales_director", "regional_manager", "manager", "salesman"]).optional().default("salesman"),
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  name: z.string().min(1),
  managerId: z.string().optional().nullable(),
  regionalOffice: z.enum(REGIONAL_OFFICES).optional().nullable(),
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  date: true,
}).extend({
  salesmanId: z.string().min(1),
  customerName: z.string().min(1),
  product: z.string().optional().default("General Sale"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
}).extend({
  // Only require company name
  name: z.string().min(1, "Company name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  stage: z.enum(["lead", "prospect", "customer"]).default("lead"),
  // Make all other fields optional
  contactName: z.string().optional(),
  contactTitle: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  assignedTo: z.string().optional(),
  personalNotes: z.string().optional(),
  registeredWithBC: z.boolean().optional().default(false),
  ordersViaBC: z.boolean().optional().default(false),
  firstOrderDate: z.date().optional().nullable(),
  storeAddress: z.string().optional(),
  retailerType: z.string().optional().nullable(),
  quarterlySoftTarget: z.string().optional(),
  lastContactDate: z.date().optional().nullable(),
  dateOfFirstContact: z.date().optional().nullable(),
  leadGeneratedBy: z.string().optional(),
  country: z.string().optional(),
});

export const updateCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
}).partial().extend({
  stage: z.enum(["lead", "prospect", "customer"]).optional(),
});

export const insertInteractionSchema = createInsertSchema(interactions).omit({
  id: true,
  date: true,
}).extend({
  category: z.enum(["marketing", "sales", "support"]),
  type: z.enum(INTERACTION_TYPES),
  meetingType: z.enum(MEETING_TYPES).optional(),
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

export const insertCustomerMonthlyTargetSchema = createInsertSchema(customerMonthlyTargets).omit({
  id: true,
  createdAt: true,
}).extend({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
  targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  customerId: z.string().min(1),
  createdBy: z.string().min(1),
});

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

export const insertCustomerContactSchema = createInsertSchema(customerContacts).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1),
});

export const insertBasecampConnectionSchema = createInsertSchema(basecampConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOauthStateSchema = createInsertSchema(oauthStates).omit({
  id: true,
  createdAt: true,
});


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
export type CustomerMonthlyTarget = typeof customerMonthlyTargets.$inferSelect;
export type InsertCustomerMonthlyTarget = z.infer<typeof insertCustomerMonthlyTargetSchema>;
export type MonthlySalesTracking = typeof monthlySalesTracking.$inferSelect;
export type InsertMonthlySalesTracking = z.infer<typeof insertMonthlySalesTrackingSchema>;
export type UpdateMonthlySalesTracking = z.infer<typeof updateMonthlySalesTrackingSchema>;
export type CustomerContact = typeof customerContacts.$inferSelect;
export type InsertCustomerContact = z.infer<typeof insertCustomerContactSchema>;
export type BasecampConnection = typeof basecampConnections.$inferSelect;
export type InsertBasecampConnection = z.infer<typeof insertBasecampConnectionSchema>;
export type OauthState = typeof oauthStates.$inferSelect;
export type InsertOauthState = z.infer<typeof insertOauthStateSchema>;

export type UserRole = "ceo" | "sales_director" | "regional_manager" | "manager" | "salesman";
export type RetailerType = typeof RETAILER_TYPES[number];
export type MeetingType = typeof MEETING_TYPES[number];
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
  additionalContacts: CustomerContact[];
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
