import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const REGIONAL_OFFICES = [
  "Hong Kong",
  "Singapore", 
  "Shanghai",
  "Australia/New Zealand",
  "Indonesia",
  "Malaysia",
  "Guangzhou",
] as const;

export const CURRENCIES = [
  "USD",
  "HKD",
  "SGD",
  "CNY",
  "AUD",
  "IDR",
  "MYR",
] as const;

export const COUNTRIES = [
  "Australia",
  "China",
  "Hong Kong",
  "Indonesia",
  "Japan",
  "Macau",
  "Malaysia",
  "New Zealand",
  "Philippines",
  "Singapore",
  "South Korea",
  "Taiwan",
  "Thailand",
  "Vietnam",
  "Other",
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
  preferredCurrency: text("preferred_currency").notNull().default("USD"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salesmanId: varchar("salesman_id").notNull(),
  customerName: text("customer_name").notNull(),
  product: text("product").notNull().default("General Sale"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  baseCurrencyAmount: decimal("base_currency_amount", { precision: 10, scale: 2 }).notNull(),
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
  quarterlySoftTarget: decimal("quarterly_soft_target", { precision: 10, scale: 2 }),
  quarterlySoftTargetCurrency: text("quarterly_soft_target_currency"),
  quarterlySoftTargetBaseCurrency: decimal("quarterly_soft_target_base_currency", { precision: 10, scale: 2 }),
  lastContactDate: timestamp("last_contact_date"),
  dateOfFirstContact: timestamp("date_of_first_contact"),
  leadGeneratedBy: text("lead_generated_by"),
  country: text("country"),
  netsuiteUrl: text("netsuite_url"),
  bloomconnectUrl: text("bloomconnect_url"),
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
  currency: text("currency").notNull().default("USD"),
  baseCurrencyAmount: decimal("base_currency_amount", { precision: 10, scale: 2 }).notNull(),
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
  currency: text("currency").notNull().default("USD"),
  baseCurrencyAmount: decimal("base_currency_amount", { precision: 10, scale: 2 }).notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


export const monthlySalesTracking = pgTable("monthly_sales_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  budget: decimal("budget", { precision: 10, scale: 2 }).notNull(),
  budgetCurrency: text("budget_currency").notNull().default("USD"),
  budgetBaseCurrencyAmount: decimal("budget_base_currency_amount", { precision: 10, scale: 2 }).notNull(),
  actual: decimal("actual", { precision: 10, scale: 2 }),
  actualCurrency: text("actual_currency").default("USD"),
  actualBaseCurrencyAmount: decimal("actual_base_currency_amount", { precision: 10, scale: 2 }),
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

// Multiple addresses for customers (supports Chinese addresses with translation)
export const customerAddresses = pgTable("customer_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  addressType: text("address_type").notNull().default("store"),
  streetNumber: text("street_number"),
  streetName: text("street_name"),
  unit: text("unit"),
  building: text("building"),
  district: text("district"),
  city: text("city"),
  stateProvince: text("state_province"),
  postalCode: text("postal_code"),
  country: text("country"),
  address: text("address"),
  chineseAddress: text("chinese_address"),
  translation: text("translation"),
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

// Exchange rates for currency conversion
export const exchangeRates = pgTable("exchange_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromCurrency: text("from_currency").notNull(),
  toCurrency: text("to_currency").notNull(),
  rate: decimal("rate", { precision: 12, scale: 6 }).notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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

export const INTERACTION_TYPES = ["Call", "Email", "In Person Meeting", "Virtual Meeting", "Store Visit"] as const;

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
  preferredCurrency: z.enum(CURRENCIES).optional().default("USD"),
});

// Base schema without refinements for client-side use
const insertSaleBaseSchema = createInsertSchema(sales).omit({
  id: true,
  date: true,
}).extend({
  salesmanId: z.string().min(1),
  customerName: z.string().min(1),
  product: z.string().optional().default("General Sale"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  currency: z.enum(CURRENCIES).optional().default("USD"),
  baseCurrencyAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format").optional(),
});

// Export base schema for client-side composition
export const insertSaleSchema = insertSaleBaseSchema;

// Refined schema for server-side validation  
export const insertSaleSchemaRefined = insertSaleBaseSchema.refine((data) => {
  if (data.baseCurrencyAmount && !data.currency) {
    return false;
  }
  return true;
}, {
  message: "Currency is required when baseCurrencyAmount is provided",
  path: ["currency"],
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
  quarterlySoftTarget: z.number().optional().nullable(),
  quarterlySoftTargetCurrency: z.string().optional().nullable(),
  quarterlySoftTargetBaseCurrency: z.number().optional().nullable(),
  lastContactDate: z.date().optional().nullable(),
  dateOfFirstContact: z.date().optional().nullable(),
  leadGeneratedBy: z.string().optional(),
  country: z.string().optional(),
  netsuiteUrl: z.string().optional(),
  bloomconnectUrl: z.string().optional(),
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

// Base schema without refinements for client-side use
const insertMonthlyTargetBaseSchema = createInsertSchema(monthlyTargets).omit({
  id: true,
  createdAt: true,
}).extend({
  targetType: z.enum(["personal", "general"]).default("personal"),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
  targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  currency: z.enum(CURRENCIES).optional().default("USD"),
  baseCurrencyAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format").optional(),
  salesmanId: z.string().optional().nullable(),
});

// Export base schema for client-side composition (allows .omit(), .extend(), etc.)
export const insertMonthlyTargetSchema = insertMonthlyTargetBaseSchema;

// Refined schema for server-side validation
export const insertMonthlyTargetSchemaRefined = insertMonthlyTargetBaseSchema.refine((data) => {
  if (data.baseCurrencyAmount && !data.currency) {
    return false;
  }
  return true;
}, {
  message: "Currency is required when baseCurrencyAmount is provided",
  path: ["currency"],
});

export const updateMonthlyTargetSchema = createInsertSchema(monthlyTargets).omit({
  id: true,
  createdAt: true,
  salesmanId: true,
}).partial().refine((data) => {
  if (data.baseCurrencyAmount && !data.currency) {
    return false;
  }
  return true;
}, {
  message: "Currency is required when baseCurrencyAmount is provided",
  path: ["currency"],
});

// Base schema without refinements for client-side use
const insertCustomerMonthlyTargetBaseSchema = createInsertSchema(customerMonthlyTargets).omit({
  id: true,
  createdAt: true,
}).extend({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
  targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  currency: z.enum(CURRENCIES).optional().default("USD"),
  baseCurrencyAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format").optional(),
  customerId: z.string().min(1),
  createdBy: z.string().min(1),
});

// Export base schema for client-side composition
export const insertCustomerMonthlyTargetSchema = insertCustomerMonthlyTargetBaseSchema;

// Refined schema for server-side validation
export const insertCustomerMonthlyTargetSchemaRefined = insertCustomerMonthlyTargetBaseSchema.refine((data) => {
  if (data.baseCurrencyAmount && !data.currency) {
    return false;
  }
  return true;
}, {
  message: "Currency is required when baseCurrencyAmount is provided",
  path: ["currency"],
});

export const insertActionItemSchema = createInsertSchema(actionItems).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  createdBy: true,
}).extend({
  description: z.string().min(1),
});

// Base schema without refinements for client-side use
const insertMonthlySalesTrackingBaseSchema = createInsertSchema(monthlySalesTracking).omit({
  id: true,
  createdAt: true,
}).extend({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
  budget: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  budgetCurrency: z.enum(CURRENCIES).optional().default("USD"),
  budgetBaseCurrencyAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format").optional(),
  actual: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format").optional(),
  actualCurrency: z.enum(CURRENCIES).optional(),
  actualBaseCurrencyAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format").optional(),
});

// Export base schema for client-side composition
export const insertMonthlySalesTrackingSchema = insertMonthlySalesTrackingBaseSchema;

// Refined schema for server-side validation
export const insertMonthlySalesTrackingSchemaRefined = insertMonthlySalesTrackingBaseSchema.refine((data) => {
  if (data.budgetBaseCurrencyAmount && !data.budgetCurrency) {
    return false;
  }
  if (data.actualBaseCurrencyAmount && !data.actualCurrency) {
    return false;
  }
  return true;
}, {
  message: "Currency is required when base currency amount is provided",
  path: ["budgetCurrency"],
});

export const updateMonthlySalesTrackingSchema = createInsertSchema(monthlySalesTracking).omit({
  id: true,
  createdAt: true,
  customerId: true,
}).partial().refine((data) => {
  if (data.budgetBaseCurrencyAmount && !data.budgetCurrency) {
    return false;
  }
  if (data.actualBaseCurrencyAmount && !data.actualCurrency) {
    return false;
  }
  return true;
}, {
  message: "Currency is required when base currency amount is provided",
  path: ["budgetCurrency"],
});

export const insertCustomerContactSchema = createInsertSchema(customerContacts).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1),
});

export const insertCustomerAddressSchema = createInsertSchema(customerAddresses).omit({
  id: true,
  createdAt: true,
}).extend({
  customerId: z.string().min(1),
  addressType: z.string().optional().default("store"),
  streetNumber: z.string().optional().nullable(),
  streetName: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  building: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  stateProvince: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  chineseAddress: z.string().optional().nullable(),
  translation: z.string().optional().nullable(),
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

export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit({
  id: true,
  updatedAt: true,
}).extend({
  fromCurrency: z.enum(CURRENCIES),
  toCurrency: z.enum(CURRENCIES),
  rate: z.string().regex(/^\d+(\.\d{1,6})?$/, "Invalid rate format"),
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
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type InsertCustomerAddress = z.infer<typeof insertCustomerAddressSchema>;
export type BasecampConnection = typeof basecampConnections.$inferSelect;
export type InsertBasecampConnection = z.infer<typeof insertBasecampConnectionSchema>;
export type OauthState = typeof oauthStates.$inferSelect;
export type InsertOauthState = z.infer<typeof insertOauthStateSchema>;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;

export type UserRole = "ceo" | "sales_director" | "regional_manager" | "manager" | "salesman";
export type Currency = typeof CURRENCIES[number];
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
  assignedToName?: string | null;
  interactions: Interaction[];
  brands: Brand[];
  actionItems: ActionItem[];
  monthlySales: MonthlySalesTracking[];
  additionalContacts: CustomerContact[];
  addresses: CustomerAddress[];
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
  convertedCustomers: number;
  totalTrackedLeads: number;
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
