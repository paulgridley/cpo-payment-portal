import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  pcnNumber: text("pcn_number").notNull(),
  vehicleRegistration: text("vehicle_registration").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeSubscriptionScheduleId: text("stripe_subscription_schedule_id"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  email: true,
  pcnNumber: true,
  vehicleRegistration: true,
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// Penalties table for storing PCN data
export const penalties = pgTable("penalties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketNo: text("ticket_no").notNull().unique(),
  vrm: text("vrm").notNull(),
  vehicleMake: text("vehicle_make"),
  penaltyAmount: decimal("penalty_amount", { precision: 10, scale: 2 }).notNull(),
  dateIssued: timestamp("date_issued").notNull(),
  site: text("site"),
  reasonForIssue: text("reason_for_issue"),
  badgeId: text("badge_id"),
  status: text("status").notNull().default("active"), // active, paid, appealed, etc.
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Payment schedules table for tracking installment plans
export const paymentSchedules = pgTable("payment_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  penaltyId: varchar("penalty_id").notNull().references(() => penalties.id),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  monthlyAmount: decimal("monthly_amount", { precision: 10, scale: 2 }).notNull(),
  totalPayments: integer("total_payments").notNull().default(3),
  paymentsCompleted: integer("payments_completed").notNull().default(0),
  status: text("status").notNull().default("active"), // active, completed, cancelled
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeScheduleId: text("stripe_schedule_id"),
  nextPaymentDate: timestamp("next_payment_date"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Individual payments table for tracking each installment
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").notNull().references(() => paymentSchedules.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentNumber: integer("payment_number").notNull(), // 1, 2, 3
  status: text("status").notNull().default("pending"), // pending, completed, failed
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeSessionId: text("stripe_session_id"),
  paidAt: timestamp("paid_at"),
  dueDate: timestamp("due_date").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Insert schemas
export const insertPenaltySchema = createInsertSchema(penalties).pick({
  ticketNo: true,
  vrm: true,
  vehicleMake: true,
  penaltyAmount: true,
  dateIssued: true,
  site: true,
  reasonForIssue: true,
  badgeId: true,
  status: true,
});

export const insertPaymentScheduleSchema = createInsertSchema(paymentSchedules).pick({
  customerId: true,
  penaltyId: true,
  totalAmount: true,
  monthlyAmount: true,
  totalPayments: true,
  paymentsCompleted: true,
  status: true,
  stripeSubscriptionId: true,
  stripeScheduleId: true,
  nextPaymentDate: true,
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  scheduleId: true,
  customerId: true,
  amount: true,
  paymentNumber: true,
  status: true,
  stripePaymentIntentId: true,
  stripeSessionId: true,
  paidAt: true,
  dueDate: true,
});

// Types
export type InsertPenalty = z.infer<typeof insertPenaltySchema>;
export type Penalty = typeof penalties.$inferSelect;
export type InsertPaymentSchedule = z.infer<typeof insertPaymentScheduleSchema>;
export type PaymentSchedule = typeof paymentSchedules.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
