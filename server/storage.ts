import { 
  type Customer, 
  type InsertCustomer,
  type UpdateCustomer,
  type Interaction,
  type InsertInteraction,
  type Segment,
  type DashboardStats,
  type CustomerWithInteractions 
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
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

export class MemStorage implements IStorage {
  private customers: Map<string, Customer>;
  private interactions: Map<string, Interaction>;

  constructor() {
    this.customers = new Map();
    this.interactions = new Map();
  }

  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerWithInteractions(id: string): Promise<CustomerWithInteractions | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;

    const interactions = await this.getInteractionsByCustomer(id);
    return {
      ...customer,
      interactions: interactions.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    };
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = {
      id,
      name: insertCustomer.name,
      email: insertCustomer.email,
      phone: insertCustomer.phone,
      stage: insertCustomer.stage || "lead",
      assignedTo: insertCustomer.assignedTo || null,
      leadScore: insertCustomer.leadScore || 0,
      createdAt: new Date(),
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: string, updateData: UpdateCustomer): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;

    const updatedCustomer: Customer = {
      ...customer,
      ...Object.fromEntries(
        Object.entries(updateData).filter(([_, v]) => v !== undefined)
      ),
    };

    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const deleted = this.customers.delete(id);
    
    if (deleted) {
      const customerInteractions = Array.from(this.interactions.entries())
        .filter(([_, interaction]) => interaction.customerId === id);
      customerInteractions.forEach(([interactionId]) => {
        this.interactions.delete(interactionId);
      });
    }

    return deleted;
  }

  async getInteractions(): Promise<Interaction[]> {
    return Array.from(this.interactions.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getInteractionsByCustomer(customerId: string): Promise<Interaction[]> {
    return Array.from(this.interactions.values())
      .filter(interaction => interaction.customerId === customerId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getRecentInteractions(limit: number = 10): Promise<Interaction[]> {
    const interactions = await this.getInteractions();
    return interactions.slice(0, limit);
  }

  async createInteraction(insertInteraction: InsertInteraction): Promise<Interaction> {
    const id = randomUUID();
    const interaction: Interaction = {
      id,
      customerId: insertInteraction.customerId,
      category: insertInteraction.category,
      type: insertInteraction.type,
      description: insertInteraction.description,
      date: new Date(),
    };
    this.interactions.set(id, interaction);

    await this.updateLeadScore(insertInteraction.customerId);

    return interaction;
  }

  private async updateLeadScore(customerId: string): Promise<void> {
    const customer = this.customers.get(customerId);
    if (!customer) return;

    const interactions = await this.getInteractionsByCustomer(customerId);
    
    let score = 0;
    
    score += Math.min(interactions.length * 5, 30);
    
    const salesInteractions = interactions.filter(i => i.category === "sales").length;
    score += Math.min(salesInteractions * 10, 30);
    
    const marketingInteractions = interactions.filter(i => i.category === "marketing").length;
    score += Math.min(marketingInteractions * 3, 15);
    
    const supportInteractions = interactions.filter(i => i.category === "support").length;
    score += Math.min(supportInteractions * 5, 15);
    
    const recentInteractions = interactions.filter(i => {
      const daysSince = (Date.now() - new Date(i.date).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    }).length;
    score += Math.min(recentInteractions * 5, 10);

    score = Math.min(Math.max(score, 0), 100);

    customer.leadScore = score;
    this.customers.set(customerId, customer);
  }

  async getSegments(): Promise<Segment[]> {
    const customers = await this.getCustomers();
    
    const segments: Segment[] = [
      {
        id: "high-value-leads",
        name: "High-Value Leads",
        description: "Leads with high engagement scores ready for conversion",
        count: customers.filter(c => c.stage === "lead" && c.leadScore >= 71).length,
        criteria: {
          stage: ["lead"],
          minScore: 71,
        },
      },
      {
        id: "active-prospects",
        name: "Active Prospects",
        description: "Prospects actively engaged in the sales process",
        count: customers.filter(c => c.stage === "prospect").length,
        criteria: {
          stage: ["prospect"],
        },
      },
      {
        id: "new-customers",
        name: "New Customers",
        description: "Recently converted customers",
        count: customers.filter(c => c.stage === "customer").length,
        criteria: {
          stage: ["customer"],
        },
      },
      {
        id: "at-risk-leads",
        name: "At-Risk Leads",
        description: "Leads with low engagement that need attention",
        count: customers.filter(c => c.stage === "lead" && c.leadScore <= 30).length,
        criteria: {
          stage: ["lead"],
          maxScore: 30,
        },
      },
    ];

    return segments;
  }

  async getStats(): Promise<DashboardStats> {
    const customers = await this.getCustomers();
    const interactions = await this.getInteractions();
    
    const leadCount = customers.filter(c => c.stage === "lead").length;
    const prospectCount = customers.filter(c => c.stage === "prospect").length;
    const customerCount = customers.filter(c => c.stage === "customer").length;
    
    const averageLeadScore = customers.length > 0
      ? customers.reduce((sum, c) => sum + c.leadScore, 0) / customers.length
      : 0;
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentInteractions = interactions.filter(
      i => new Date(i.date) >= sevenDaysAgo
    ).length;

    return {
      totalCustomers: customers.length,
      leadCount,
      prospectCount,
      customerCount,
      averageLeadScore,
      recentInteractions,
    };
  }
}

export const storage = new MemStorage();
