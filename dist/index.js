// server/index.ts
import express3 from "express";

// server/routes.ts
import { createServer } from "http";
import express from "express";
import Stripe from "stripe";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  customers;
  constructor() {
    this.customers = /* @__PURE__ */ new Map();
  }
  async getCustomer(id) {
    return this.customers.get(id);
  }
  async getCustomerByEmail(email) {
    return Array.from(this.customers.values()).find(
      (customer) => customer.email === email
    );
  }
  async createCustomer(insertCustomer) {
    const id = randomUUID();
    const customer = {
      ...insertCustomer,
      id,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripeSubscriptionScheduleId: null,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.customers.set(id, customer);
    return customer;
  }
  async updateCustomerStripeInfo(id, stripeCustomerId, stripeSubscriptionId, stripeSubscriptionScheduleId) {
    const customer = this.customers.get(id);
    if (!customer) {
      throw new Error("Customer not found");
    }
    const updatedCustomer = {
      ...customer,
      stripeCustomerId,
      stripeSubscriptionId: stripeSubscriptionId || customer.stripeSubscriptionId,
      stripeSubscriptionScheduleId: stripeSubscriptionScheduleId || customer.stripeSubscriptionScheduleId
    };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }
};
var storage = new MemStorage();

// server/routes.ts
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required Stripe secret: STRIPE_SECRET_KEY");
}
var STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil"
});
async function registerRoutes(app2) {
  app2.post("/api/create-checkout-session", async (req, res) => {
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
        description: `Recurring payment plan for PCN ${pcnNumber}, Vehicle ${vehicleRegistration}, Total: \xA3${penaltyAmount}`
      });
      const monthlyAmountInPence = Math.round(penaltyAmount / 3 * 100);
      const price = await stripe.prices.create({
        unit_amount: monthlyAmountInPence,
        currency: "gbp",
        recurring: { interval: "month", interval_count: 1 },
        product: product.id
      });
      let domainURL = process.env.CUSTOM_DOMAIN_URL || process.env.WEBSITE_HOSTNAME && `https://${process.env.WEBSITE_HOSTNAME}` || process.env.REPL_SLUG && process.env.REPL_OWNER && `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` || process.env.WEBSITE_URL || "http://localhost:5000";
      const subscriptionSchedule = await stripe.subscriptionSchedules.create({
        customer: stripeCustomer.id,
        start_date: "now",
        end_behavior: "cancel",
        phases: [
          {
            items: [
              {
                price: price.id,
                quantity: 1
              }
            ],
            iterations: 3,
            // Exactly 3 payments
            metadata: {
              pcnNumber,
              vehicleRegistration,
              penaltyAmount: penaltyAmount.toString(),
              monthlyAmount: (penaltyAmount / 3).toFixed(2),
              totalPayments: "3"
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
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(400).json({ error: error.message });
    }
  });
  app2.post(
    "/api/stripe-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"];
      let event;
      if (!STRIPE_WEBHOOK_SECRET) {
        console.warn("No webhook secret configured - skipping webhook verification");
        return res.status(400).send("Webhook secret not configured");
      }
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        if (!session.subscription || !session.customer) {
          console.warn("No subscription or customer in session.");
          return res.json({ received: true });
        }
        try {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          const scheduleId = session.metadata?.scheduleId;
          if (scheduleId) {
            await stripe.subscriptionSchedules.update(scheduleId, {
              phases: [
                {
                  items: [
                    {
                      price: subscription.items.data[0].price.id,
                      quantity: 1
                    }
                  ],
                  iterations: 3,
                  // Exactly 3 payments (30 days apart)
                  metadata: {
                    pcnNumber: subscription.metadata.pcnNumber || "",
                    vehicleRegistration: subscription.metadata.vehicleRegistration || "",
                    penaltyAmount: subscription.metadata.penaltyAmount || "",
                    monthlyAmount: subscription.metadata.monthlyAmount || "",
                    totalPayments: "3"
                  }
                }
              ]
            });
            const customerId = session.metadata?.customerId;
            if (customerId) {
              await storage.updateCustomerStripeInfo(
                customerId,
                session.customer,
                subscription.id,
                scheduleId
              );
            }
            console.log(`\u2705 Subscription schedule updated for customer ${session.customer} - Limited to 3 monthly payments`);
            console.log(`Schedule ID: ${scheduleId}`);
            console.log(`Payments: \xA3${subscription.metadata.monthlyAmount} on day 1, day 31, and day 61, then auto-cancel`);
          }
        } catch (error) {
          console.error("Error updating subscription schedule:", error);
        }
      }
      res.json({ received: true });
    }
  );
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
