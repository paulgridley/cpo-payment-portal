import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import express from "express";
import multer, { FileFilterCallback } from "multer";
import Stripe from "stripe";
import { z } from "zod";
import { storage } from "./storage";
import { azureStorage } from "./azureStorage";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
// Webhook secret is optional for development
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {

  // Search penalties endpoint - reads directly from CPO Test Data.xlsx in Azure Storage
  app.get("/api/search-penalties", async (req, res) => {
    try {
      const { ticketNo, vrm } = req.query;

      if (!ticketNo && !vrm) {
        return res.status(400).json({ error: "Either ticketNo or vrm is required" });
      }

      // Check if Azure Storage is available
      if (!azureStorage.isStorageAvailable()) {
        return res.status(503).json({ 
          error: 'Azure Storage service unavailable',
          details: 'The file storage service is currently unavailable. Please try again later or contact support.'
        });
      }

      // Search directly from Excel file in Azure Storage
      const penalties = await azureStorage.searchPenaltiesFromExcel(
        'CPO Test Data.xlsx',
        ticketNo as string,
        vrm as string
      );

      res.json(penalties);
    } catch (error) {
      console.error('Search penalties error:', error);
      // Check for Azure Storage unavailable error
      if (error instanceof Error && error.message.includes('Azure Storage is not available')) {
        return res.status(503).json({ 
          error: 'Azure Storage service unavailable',
          details: 'The file storage service is currently unavailable. Please try again later or contact support.'
        });
      }
      // Check for Azure BlobNotFound error specifically
      if (error instanceof Error && 
          (error.message.includes('BlobNotFound') || 
           error.message.includes('does not exist') ||
           (error as any).statusCode === 404)) {
        res.status(404).json({ 
          error: 'CPO Test Data.xlsx file not found in Azure Storage',
          details: 'Please ensure the Excel file has been uploaded to Azure Blob Storage container'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to search penalties',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  // Upload Excel file and process penalties
  app.post("/api/upload-penalties", upload.single('file'), async (req: Request & { file?: Express.Multer.File }, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Check if Azure Storage is available
      if (!azureStorage.isStorageAvailable()) {
        return res.status(503).json({ 
          error: 'Azure Storage service unavailable',
          details: 'The file upload service is currently unavailable. Please try again later or contact support.'
        });
      }

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `penalties-${timestamp}.xlsx`;

      // Upload file to Azure Blob Storage
      const fileUrl = await azureStorage.uploadFile(
        fileName,
        req.file.buffer,
        req.file.mimetype
      );

      // Process the file immediately
      const result = await azureStorage.processExcelFile(fileName);

      res.json({
        message: 'File uploaded and processed successfully',
        fileUrl,
        fileName,
        ...result
      });
    } catch (error) {
      console.error('File upload error:', error);
      // Check for Azure Storage unavailable error
      if (error instanceof Error && error.message.includes('Azure Storage is not available')) {
        return res.status(503).json({ 
          error: 'Azure Storage service unavailable',
          details: 'The file upload service is currently unavailable. Please try again later or contact support.'
        });
      }
      res.status(500).json({ 
        error: 'Failed to upload and process file',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Process existing files in Azure Blob Storage
  app.post("/api/process-files", async (req, res) => {
    try {
      // Check if Azure Storage is available
      if (!azureStorage.isStorageAvailable()) {
        return res.status(503).json({ 
          error: 'Azure Storage service unavailable',
          details: 'The file processing service is currently unavailable. Please try again later or contact support.'
        });
      }

      const result = await azureStorage.checkAndProcessNewFiles();
      res.json({
        message: 'Files processed successfully',
        ...result
      });
    } catch (error) {
      console.error('File processing error:', error);
      // Check for Azure Storage unavailable error
      if (error instanceof Error && error.message.includes('Azure Storage is not available')) {
        return res.status(503).json({ 
          error: 'Azure Storage service unavailable',
          details: 'The file processing service is currently unavailable. Please try again later or contact support.'
        });
      }
      res.status(500).json({ 
        error: 'Failed to process files',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // List files in Azure Blob Storage
  app.get("/api/files", async (req, res) => {
    try {
      // Check if Azure Storage is available
      if (!azureStorage.isStorageAvailable()) {
        return res.status(503).json({ 
          error: 'Azure Storage service unavailable',
          details: 'The file listing service is currently unavailable. Please try again later or contact support.',
          files: []
        });
      }

      const files = await azureStorage.listFiles();
      res.json({ files });
    } catch (error) {
      console.error('List files error:', error);
      // Check for Azure Storage unavailable error
      if (error instanceof Error && error.message.includes('Azure Storage is not available')) {
        return res.status(503).json({ 
          error: 'Azure Storage service unavailable',
          details: 'The file listing service is currently unavailable. Please try again later or contact support.',
          files: []
        });
      }
      res.status(500).json({ 
        error: 'Failed to list files',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Validation schema for checkout session
  const checkoutSessionSchema = z.object({
    email: z.string().email("Invalid email address"),
    pcnNumber: z.string().min(1, "PCN number is required"),
    vehicleRegistration: z.string().min(1, "Vehicle registration is required"),
    penaltyAmount: z.coerce.number().positive("Penalty amount must be positive")
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      // Validate request body
      const validationResult = checkoutSessionSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.errors 
        });
      }
      
      const { email, pcnNumber, vehicleRegistration, penaltyAmount } = validationResult.data;

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
        process.env.WEBSITE_URL ||
        'https://pcn-payment-portal.azurewebsites.net';

      console.log(`Creating Stripe checkout session with domain: ${domainURL}`);

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

      // Find or create penalty record in database from Excel data
      let penalty = await storage.getPenaltyByTicketNo(pcnNumber);
      if (!penalty) {
        // Create penalty record from Excel search data if Azure Storage is available
        if (azureStorage.isStorageAvailable()) {
          try {
            const excelPenalties = await azureStorage.searchPenaltiesFromExcel(
              'CPO Test Data.xlsx',
              pcnNumber,
              undefined
            );
            
            if (excelPenalties.length > 0) {
              const excelPenalty = excelPenalties[0];
              penalty = await storage.createPenalty({
                ticketNo: excelPenalty.ticketNo,
                vrm: excelPenalty.vrm,
                vehicleMake: excelPenalty.vehicleMake,
                penaltyAmount: excelPenalty.penaltyAmount,
                dateIssued: excelPenalty.dateIssued ? new Date(excelPenalty.dateIssued) : new Date(),
                site: excelPenalty.site,
                reasonForIssue: excelPenalty.reasonForIssue,
                badgeId: excelPenalty.badgeId,
                status: 'active'
              });
            }
          } catch (error) {
            console.error('Failed to create penalty from Excel data:', error);
            // Fall through to create minimal penalty record
          }
        } else {
          console.warn('Azure Storage unavailable - cannot lookup penalty details from Excel file');
        }
        
        // Create minimal penalty record if Excel lookup fails or Azure Storage is unavailable
        if (!penalty) {
          penalty = await storage.createPenalty({
            ticketNo: pcnNumber,
            vrm: vehicleRegistration,
            vehicleMake: null,
            penaltyAmount: penaltyAmount.toFixed(2),
            dateIssued: new Date(),
            site: null,
            reasonForIssue: null,
            badgeId: null,
            status: 'active'
          });
        }
      }

      if (!penalty) {
        throw new Error('Failed to create or find penalty record');
      }

      // Create payment schedule in database
      const paymentSchedule = await storage.createPaymentSchedule({
        customerId: customer.id,
        penaltyId: penalty.id,
        totalAmount: penaltyAmount.toString(),
        monthlyAmount: (penaltyAmount / 3).toFixed(2),
        totalPayments: 3,
        paymentsCompleted: 0,
        status: 'active',
        stripeSubscriptionId: null,
        stripeScheduleId: subscriptionSchedule.id
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
            scheduleId: subscriptionSchedule.id,
            paymentScheduleId: paymentSchedule.id
          }
        },
        success_url: `${domainURL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${domainURL}/`,
        metadata: {
          customerId: customer.id,
          priceId: price.id,
          scheduleId: subscriptionSchedule.id,
          paymentScheduleId: paymentSchedule.id
        }
      });

      res.json({ sessionId: session.id, url: session.url, customerId: customer.id });

    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Webhook to create subscription schedule
  app.post("/api/stripe-webhook", async (req, res) => {
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

      // Handle different Stripe webhook events
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
                    totalPayments: '3',
                    paymentScheduleId: subscription.metadata.paymentScheduleId || ''
                  }
                }
              ]
            });

            // Save the schedule ID to our database
            const customerId = session.metadata?.customerId;
            const paymentScheduleId = session.metadata?.paymentScheduleId;
            
            if (customerId) {
              await storage.updateCustomerStripeInfo(
                customerId, 
                session.customer as string, 
                subscription.id,
                scheduleId
              );
            }
            
            // Update payment schedule with Stripe subscription ID and create first payment record
            if (paymentScheduleId) {
              await storage.updatePaymentSchedule(paymentScheduleId, {
                stripeSubscriptionId: subscription.id,
                status: 'active',
                nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
              });
              
              // Create the first payment record
              await storage.createPayment({
                scheduleId: paymentScheduleId,
                customerId: customerId || '',
                amount: (subscription.metadata.monthlyAmount || '0'),
                paymentNumber: 1,
                status: 'completed',
                stripePaymentIntentId: null,
                stripeSessionId: session.id,
                paidAt: new Date(),
                dueDate: new Date()
              });
              
              // Update payments completed count
              await storage.updatePaymentSchedule(paymentScheduleId, {
                paymentsCompleted: 1
              });
            }

            console.log(`✅ Subscription schedule updated for customer ${session.customer} - Limited to 3 monthly payments`);
            console.log(`Schedule ID: ${scheduleId}`);
            console.log(`Payments: £${subscription.metadata.monthlyAmount} on day 1, day 31, and day 61, then auto-cancel`);
          }
          
        } catch (error) {
          console.error('Error updating subscription schedule:', error);
        }
      } 
      // Handle invoice payment succeeded for recurring payments
      else if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string; payment_intent?: string };
        
        if (invoice.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            const paymentScheduleId = subscription.metadata?.paymentScheduleId;
            
            if (paymentScheduleId) {
              // Get current schedule to check payment count
              const currentSchedule = await storage.getPaymentSchedule(paymentScheduleId);
              
              if (currentSchedule && currentSchedule.paymentsCompleted < 3) {
                // Create payment record for this invoice
                await storage.createPayment({
                  scheduleId: paymentScheduleId,
                  customerId: currentSchedule.customerId,
                  amount: (invoice.amount_paid / 100).toString(), // Convert from pence to pounds
                  paymentNumber: currentSchedule.paymentsCompleted + 1,
                  status: 'completed',
                  stripePaymentIntentId: invoice.payment_intent || null,
                  stripeSessionId: null,
                  paidAt: new Date(invoice.status_transitions?.paid_at ? invoice.status_transitions.paid_at * 1000 : Date.now()),
                  dueDate: new Date()
                });
                
                // Update payment count and next payment date
                const newPaymentsCompleted = currentSchedule.paymentsCompleted + 1;
                const nextPaymentDate = newPaymentsCompleted < 3 ? 
                  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
                  
                await storage.updatePaymentSchedule(paymentScheduleId, {
                  paymentsCompleted: newPaymentsCompleted,
                  nextPaymentDate,
                  status: newPaymentsCompleted >= 3 ? 'completed' : 'active'
                });
                
                console.log(`✅ Payment ${newPaymentsCompleted}/3 recorded for schedule ${paymentScheduleId}`);
                
                // If all payments completed, update penalty status
                if (newPaymentsCompleted >= 3) {
                  // Find and update the penalty status to 'paid'
                  const customer = await storage.getCustomer(currentSchedule.customerId);
                  if (customer?.pcnNumber) {
                    const penalty = await storage.getPenaltyByTicketNo(customer.pcnNumber);
                    if (penalty) {
                      await storage.updatePenalty(penalty.id, { status: 'paid' });
                      console.log(`✅ Penalty ${customer.pcnNumber} marked as paid - all 3 payments completed`);
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error processing invoice payment:', error);
          }
        }
      }
      // Handle subscription cancellation
      else if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as Stripe.Subscription;
        const paymentScheduleId = subscription.metadata?.paymentScheduleId;
        
        if (paymentScheduleId) {
          try {
            await storage.updatePaymentSchedule(paymentScheduleId, {
              status: 'cancelled'
            });
            console.log(`✅ Payment schedule ${paymentScheduleId} marked as cancelled`);
          } catch (error) {
            console.error('Error cancelling payment schedule:', error);
          }
        }
      }

      res.json({ received: true });
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}
