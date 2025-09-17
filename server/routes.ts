import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import Stripe from "stripe";
import { storage } from "./storage";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
// Webhook secret is optional for development
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { email, pcnNumber, vehicleRegistration, penaltyAmount } = req.body;

      let customer = await storage.getCustomerByEmail(email);
      if (!customer) {
        customer = await storage.createCustomer({ email, pcnNumber, vehicleRegistration });
      }

      let stripeCustomer;
      if (customer.stripeCustomerId) {
        stripeCustomer = await stripe.customers.retrieve(customer.stripeCustomerId);
      } else {
        stripeCustomer = await stripe.customers.create({
          email: customer.email,
          metadata: { pcnNumber, vehicleRegistration }
        });
        customer = await storage.updateCustomerStripeInfo(customer.id, stripeCustomer.id);
      }

      const product = await stripe.products.create({
        name: `PCN Payment Plan - ${pcnNumber}`,
        description: `Recurring payment plan for PCN ${pcnNumber}, Vehicle ${vehicleRegistration}, Total: £${penaltyAmount}`,
      });

      const monthlyAmountInPence = Math.round((penaltyAmount / 3) * 100);
      const price = await stripe.prices.create({
        unit_amount: monthlyAmountInPence,
        currency: 'gbp',
        recurring: { interval: 'month', interval_count: 1 },
        product: product.id,
      });

      let domainURL =
        process.env.CUSTOM_DOMAIN_URL ||
        (process.env.WEBSITE_HOSTNAME && `https://${process.env.WEBSITE_HOSTNAME}`) ||
        (process.env.REPL_SLUG && process.env.REPL_OWNER && `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`) ||
        process.env.WEBSITE_URL ||
        'http://localhost:5000';

      // Create subscription schedule directly instead of using checkout for subscriptions
      const subscriptionSchedule = await stripe.subscriptionSchedules.create({
        customer: stripeCustomer.id,
        start_date: 'now',
        end_behavior: 'cancel',
        phases: [
          {
            items: [
              {
                price: price.id,
                quantity: 1,
              }
            ],
            iterations: 3, // Exactly 3 payments
            metadata: {
              pcnNumber,
              vehicleRegistration,
              penaltyAmount: penaltyAmount.toString(),
              monthlyAmount: (penaltyAmount / 3).toFixed(2),
              totalPayments: '3'
            }
          }
        ],
        metadata: {
          customerId: customer.id,
          pcnNumber,
          vehicleRegistration,
          penaltyAmount: penaltyAmount.toString()
        }
      });

      // Create a checkout session for the first payment
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: stripeCustomer.id,
        line_items: [{ price: price.id, quantity: 1 }],
        subscription_data: {
          metadata: {
            pcnNumber,
            vehicleRegistration,
            penaltyAmount: penaltyAmount.toString(),
            monthlyAmount: (penaltyAmount / 3).toFixed(2),
            scheduleId: subscriptionSchedule.id
          }
        },
        success_url: `${domainURL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${domainURL}/`,
        metadata: {
          customerId: customer.id,
          priceId: price.id,
          scheduleId: subscriptionSchedule.id
        }
      });

      res.json({ sessionId: session.id, url: session.url, customerId: customer.id });

    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Webhook to create subscription schedule
  app.post("/api/stripe-webhook", 
    express.raw({ type: "application/json" }), 
    async (req, res) => {
      const sig = req.headers["stripe-signature"] as string;
      let event: Stripe.Event;

      if (!STRIPE_WEBHOOK_SECRET) {
        console.warn("No webhook secret configured - skipping webhook verification");
        return res.status(400).send("Webhook secret not configured");
      }

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        if (!session.subscription || !session.customer) {
          console.warn("No subscription or customer in session.");
          return res.json({ received: true });
        }

        try {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const scheduleId = session.metadata?.scheduleId;
          
          if (scheduleId) {
            // Update the existing schedule to use the subscription that was just created
            await stripe.subscriptionSchedules.update(scheduleId, {
              phases: [
                {
                  items: [
                    {
                      price: subscription.items.data[0].price.id,
                      quantity: 1,
                    }
                  ],
                  iterations: 3, // Exactly 3 payments (30 days apart)
                  metadata: {
                    pcnNumber: subscription.metadata.pcnNumber || '',
                    vehicleRegistration: subscription.metadata.vehicleRegistration || '',
                    penaltyAmount: subscription.metadata.penaltyAmount || '',
                    monthlyAmount: subscription.metadata.monthlyAmount || '',
                    totalPayments: '3'
                  }
                }
              ]
            });

            // Save the schedule ID to our database
            const customerId = session.metadata?.customerId;
            if (customerId) {
              await storage.updateCustomerStripeInfo(
                customerId, 
                session.customer as string, 
                subscription.id,
                scheduleId
              );
            }

            console.log(`✅ Subscription schedule updated for customer ${session.customer} - Limited to 3 monthly payments`);
            console.log(`Schedule ID: ${scheduleId}`);
            console.log(`Payments: £${subscription.metadata.monthlyAmount} on day 1, day 31, and day 61, then auto-cancel`);
          }
          
        } catch (error) {
          console.error('Error updating subscription schedule:', error);
        }
      }

      res.json({ received: true });
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}
