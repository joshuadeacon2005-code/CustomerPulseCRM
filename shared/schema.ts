import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  stage: text("stage").notNull().default("lead"),
  assignedTo: text("assigned_to"),
  leadScore: integer("lead_score").notNull().default(0),
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

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;
export type Interaction = typeof interactions.$inferSelect;
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;

export type CustomerStage = "lead" | "prospect" | "customer";
export type InteractionCategory = "marketing" | "sales" | "support";

export type CustomerWithInteractions = Customer & {
  interactions: Interaction[];
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
