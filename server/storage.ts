import { customers, penalties, paymentSchedules, payments, type Customer, type InsertCustomer, type Penalty, type InsertPenalty, type PaymentSchedule, type InsertPaymentSchedule, type Payment, type InsertPayment } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ilike } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Customer methods
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomerStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId?: string, stripeSubscriptionScheduleId?: string): Promise<Customer>;
  
  // Penalty methods
  getPenalty(id: string): Promise<Penalty | undefined>;
  getPenaltyByTicketNo(ticketNo: string): Promise<Penalty | undefined>;
  searchPenalties(ticketNo?: string, vrm?: string): Promise<Penalty[]>;
  createPenalty(penalty: InsertPenalty): Promise<Penalty>;
  updatePenalty(id: string, updates: Partial<Penalty>): Promise<Penalty>;
  
  // Payment schedule methods
  getPaymentSchedule(id: string): Promise<PaymentSchedule | undefined>;
  getPaymentScheduleByCustomerId(customerId: string): Promise<PaymentSchedule[]>;
  createPaymentSchedule(schedule: InsertPaymentSchedule): Promise<PaymentSchedule>;
  updatePaymentSchedule(id: string, updates: Partial<PaymentSchedule>): Promise<PaymentSchedule>;
  
  // Payment methods
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByScheduleId(scheduleId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, updates: Partial<Payment>): Promise<Payment>;
}

export class DatabaseStorage implements IStorage {
  // Keep the initialization of sample data on startup
  constructor() {
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    try {
      // Check if penalties already exist to avoid duplicates
      const existingPenalties = await db.select().from(penalties).limit(1);
      if (existingPenalties.length > 0) {
        return;
      }

      // Sample penalty data for testing
      const samplePenalties = [
        {
          ticketNo: 'A11623936',
          vrm: 'PG23WCR',
          vehicleMake: 'Audi',
          penaltyAmount: '60.00',
          dateIssued: new Date('2025-08-21T03:05:09'),
          site: 'Waitrose Dorking',
          reasonForIssue: 'No Valid Parking Payment Found',
          badgeId: 'ANPR',
          status: 'active' as const
        },
        {
          ticketNo: 'B22734847',
          vrm: 'AB12XYZ',
          vehicleMake: 'BMW',
          penaltyAmount: '90.00',
          dateIssued: new Date('2025-09-01T14:30:00'),
          site: 'High Street Car Park',
          reasonForIssue: 'Exceeded Maximum Stay',
          badgeId: 'ANPR',
          status: 'active' as const
        },
        {
          ticketNo: 'C33845958',
          vrm: 'CD34EFG',
          vehicleMake: 'Ford',
          penaltyAmount: '75.00',
          dateIssued: new Date('2025-09-05T10:15:00'),
          site: 'Town Centre Multi-storey',
          reasonForIssue: 'Parked Without Valid Ticket',
          badgeId: 'PATROL',
          status: 'active' as const
        }
      ];
      
      await db.insert(penalties).values(samplePenalties);
    } catch (error) {
      console.log('Sample data initialization skipped:', error);
    }
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer || undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }

  async updateCustomerStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId?: string, stripeSubscriptionScheduleId?: string): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        stripeSubscriptionScheduleId
      })
      .where(eq(customers.id, id))
      .returning();
    
    if (!updatedCustomer) {
      throw new Error('Customer not found');
    }
    
    return updatedCustomer;
  }

  // Penalty methods
  async getPenalty(id: string): Promise<Penalty | undefined> {
    const [penalty] = await db.select().from(penalties).where(eq(penalties.id, id));
    return penalty || undefined;
  }

  async getPenaltyByTicketNo(ticketNo: string): Promise<Penalty | undefined> {
    const [penalty] = await db.select().from(penalties).where(eq(penalties.ticketNo, ticketNo));
    return penalty || undefined;
  }

  async searchPenalties(ticketNo?: string, vrm?: string): Promise<Penalty[]> {
    const conditions = [];
    
    if (ticketNo) {
      conditions.push(ilike(penalties.ticketNo, `%${ticketNo}%`));
    }
    if (vrm) {
      conditions.push(ilike(penalties.vrm, `%${vrm}%`));
    }
    
    if (conditions.length === 0) {
      return [];
    }
    
    return await db.select().from(penalties).where(and(...conditions));
  }

  async createPenalty(insertPenalty: InsertPenalty): Promise<Penalty> {
    const [penalty] = await db.insert(penalties).values(insertPenalty).returning();
    return penalty;
  }

  async updatePenalty(id: string, updates: Partial<Penalty>): Promise<Penalty> {
    const [updatedPenalty] = await db
      .update(penalties)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(penalties.id, id))
      .returning();
    
    if (!updatedPenalty) {
      throw new Error('Penalty not found');
    }
    
    return updatedPenalty;
  }

  // Payment schedule methods
  async getPaymentSchedule(id: string): Promise<PaymentSchedule | undefined> {
    const [schedule] = await db.select().from(paymentSchedules).where(eq(paymentSchedules.id, id));
    return schedule || undefined;
  }

  async getPaymentScheduleByCustomerId(customerId: string): Promise<PaymentSchedule[]> {
    return await db.select().from(paymentSchedules).where(eq(paymentSchedules.customerId, customerId));
  }

  async createPaymentSchedule(insertSchedule: InsertPaymentSchedule): Promise<PaymentSchedule> {
    const [schedule] = await db.insert(paymentSchedules).values(insertSchedule).returning();
    return schedule;
  }

  async updatePaymentSchedule(id: string, updates: Partial<PaymentSchedule>): Promise<PaymentSchedule> {
    const [updatedSchedule] = await db
      .update(paymentSchedules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(paymentSchedules.id, id))
      .returning();
    
    if (!updatedSchedule) {
      throw new Error('Payment schedule not found');
    }
    
    return updatedSchedule;
  }

  // Payment methods
  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPaymentsByScheduleId(scheduleId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.scheduleId, scheduleId));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
    const [updatedPayment] = await db
      .update(payments)
      .set(updates)
      .where(eq(payments.id, id))
      .returning();
    
    if (!updatedPayment) {
      throw new Error('Payment not found');
    }
    
    return updatedPayment;
  }
}

export const storage = new DatabaseStorage();
