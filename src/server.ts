import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import midtransClient from "midtrans-client";
import fs from "fs";

dotenv.config();

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

// Skip Firebase Admin Initialization due to IAM restrictions in this preview environment.
// Frontend Client SDK will handle necessary database interactions.

// Create Midtrans Snap instance
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-YOUR_SERVER_KEY',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-YOUR_CLIENT_KEY'
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Midtrans Snap Token creation
  app.post("/api/create-midtrans-token", async (req, res) => {
    const { amount, planId, userId, customerDetails, deliveryDetails } = req.body;

    console.log(`Creating Midtrans Snap token for plan: ${planId}, user: ${userId}`);

    if (!userId || userId === 'undefined') {
      return res.status(400).json({ error: "User ID is required and must be valid" });
    }

    if (!process.env.MIDTRANS_SERVER_KEY) {
      // For demo purposes if key is missing, simulate success
      return res.json({ token: "demo_snap_token", isDemo: true });
    }

    try {
      // Create a short, unique order_id
      // Format: INV-TIMESTAMP-RANDOM (approx 15-18 chars)
      const orderId = `INV-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`.toUpperCase();

      const parameter = {
        transaction_details: {
          order_id: orderId,
          gross_amount: Math.round(amount * 15000), // Ensure it's an integer
        },
        // Use custom fields to store metadata, keeping order_id short
        custom_field1: userId,
        custom_field2: planId,
        credit_card: {
          secure: true
        },
        customer_details: {
          first_name: customerDetails.name,
          email: customerDetails.email,
          phone: customerDetails.phone,
          billing_address: {
            address: customerDetails.address
          },
          shipping_address: deliveryDetails ? {
            first_name: deliveryDetails.name,
            email: deliveryDetails.email,
            phone: deliveryDetails.phone,
            address: deliveryDetails.address
          } : undefined
        },
        item_details: [{
          id: planId,
          price: Math.round(amount * 15000),
          quantity: 1,
          name: `${planId} Subscription`
        }]
      };

      const transaction = await snap.createTransaction(parameter);

      // (We skip backend transaction tracking due to IAM restrictions. The frontend handles this state.)

      res.json({ token: transaction.token, orderId });
    } catch (error: any) {
      console.error("Midtrans error details:", {
        message: error.message,
        stack: error.stack,
        response: error.ApiResponse
      });
      res.status(500).json({ error: error.message });
    }
  });

  // Midtrans Callback (Webhook)
  app.post("/api/midtrans-callback", async (req, res) => {
    const notification = req.body;

    console.log("Midtrans callback received:", JSON.stringify(notification));

    if (!notification || Object.keys(notification).length === 0) {
      console.error("Empty notification body received");
      return res.status(400).send('Empty body');
    }

    try {
      if (!process.env.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY.includes('YOUR_SERVER_KEY')) {
        console.warn("MIDTRANS_SERVER_KEY is missing or using placeholder. Verification may fail for real transactions.");
      }
      
      // Use the snap instance to verify the notification
      const statusResponse = await snap.transaction.notification(notification);
      const orderId = statusResponse.order_id;
      const transactionStatus = statusResponse.transaction_status;
      const fraudStatus = statusResponse.fraud_status;
      
      // Try to get userId and planId from custom fields (new format)
      let userId = statusResponse.custom_field1;
      let planId = statusResponse.custom_field2;
      
      // Fallback to order_id parsing (old format)
      if (!userId || !planId) {
        console.log("Custom fields missing, falling back to order_id parsing...");
        const parts = orderId.split('_');
        if (parts.length >= 3) {
          parts.pop(); // remove timestamp
          planId = parts.pop();
          userId = parts.join('_');
        }
      }

      console.log(`Verified notification. Order ID: ${orderId}. Status: ${transactionStatus}. Fraud: ${fraudStatus}`);

      if (!userId || !planId) {
        console.error(`Could not identify user or plan for order: ${orderId}`);
        return res.status(400).send('Could not identify user or plan');
      }

      console.log(`Parsed callback: userId=${userId}, planId=${planId}`);

      // (We skip backend transaction and user record updating due to IAM permissions issues. 
      // The frontend App.tsx handles optimistic updates directly.)
      console.log("Skipping backend Firestore update because of sandbox restrictions for Midtrans callback.");

      res.status(200).send('OK');
    } catch (error: any) {
      console.error("Midtrans callback error details:", {
        message: error.message,
        stack: error.stack,
        response: error.ApiResponse
      });
      res.status(500).send('Internal Server Error');
    }
  });

  // Unsubscribe (Downgrade to Free)
  app.post("/api/unsubscribe", async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    try {
      console.log(`Unsubscribing user: ${userId}`);
      
      // Sandbox implementation: simply return success.
      // Frontend App.tsx handles the optimistic update to firestore.

      res.json({ success: true, message: "Successfully unsubscribed. Your plan is now Free." });
    } catch (error: any) {
      console.error("Unsubscribe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Send Invoice Email
  app.post("/api/send-invoice", async (req, res) => {
    const { email, name, planName, amount, address, phone, deliveryDetails } = req.body;

    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.HOSTINGER_SMTP_USER || "support@geminimultitool.com",
        pass: process.env.HOSTINGER_SMTP_PASS || "Fazrin21%++",
      },
    });

    const mailOptions = {
      from: `"Gemini Multi-Tool" <${process.env.HOSTINGER_SMTP_USER || "support@geminimultitool.com"}>`,
      to: email,
      subject: `Invoice for your ${planName} Subscription`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #2563eb;">Invoice</h2>
          <p>Hi <strong>${name}</strong>,</p>
          <p>Thank you for subscribing to the <strong>${planName}</strong> plan.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <div style="margin-bottom: 20px;">
            <p><strong>Billing Address:</strong><br />${address}</p>
            <p><strong>Phone Number:</strong><br />${phone}</p>
          </div>
          ${deliveryDetails ? `
          <div style="margin-bottom: 20px; padding: 15px; background-color: #f8fafc; border-radius: 8px;">
            <p style="margin-top: 0; font-weight: bold; color: #64748b;">Delivery Information:</p>
            <p style="margin-bottom: 5px;"><strong>Recipient:</strong> ${deliveryDetails.name}</p>
            <p style="margin-bottom: 5px;"><strong>Phone:</strong> ${deliveryDetails.phone}</p>
            <p style="margin-bottom: 0;"><strong>Address:</strong> ${deliveryDetails.address}</p>
          </div>
          ` : ''}
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="text-align: left; padding: 10px; border-bottom: 1px solid #eee;">Description</th>
                <th style="text-align: right; padding: 10px; border-bottom: 1px solid #eee;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${planName} Subscription (Monthly)</td>
                <td style="text-align: right; padding: 10px; border-bottom: 1px solid #eee;">$${amount}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td style="padding: 10px; font-weight: bold;">Total</td>
                <td style="text-align: right; padding: 10px; font-weight: bold;">$${amount}</td>
              </tr>
            </tfoot>
          </table>
          <p style="margin-top: 30px; font-size: 12px; color: #64748b;">If you have any questions, please contact our support team.</p>
        </div>
      `,
    };

    try {
      const smtpUser = process.env.HOSTINGER_SMTP_USER || "support@geminimultitool.com";
      const smtpPass = process.env.HOSTINGER_SMTP_PASS || "Fazrin21%++";

      if (!smtpUser || !smtpPass) {
        console.log("SMTP credentials missing, skipping email send in demo mode.");
        return res.json({ success: true, message: "Demo mode: Email not sent due to missing credentials." });
      }
      await transporter.sendMail(mailOptions);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Email error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API key validation proxy
  app.post("/api/validate-key", async (req: express.Request, res: express.Response) => {
    const { provider, key } = req.body;

    if (!provider || !key) {
      return res.status(400).json({ error: "Provider and key are required" });
    }

    try {
      if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        if (response.ok) {
          return res.json({ valid: true });
        } else {
          const error = await response.json() as any;
          return res.status(401).json({ valid: false, error: error.error?.message || "Invalid OpenAI key" });
        }
      } else if (provider === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'ping' }]
          })
        });
        if (response.ok) {
          return res.json({ valid: true });
        } else {
          const error = await response.json() as any;
          return res.status(401).json({ valid: false, error: error.error?.message || "Invalid Anthropic key" });
        }
      } else if (provider === 'gemini') {
        // Try v1beta first, then v1 as fallback
        const trimmedKey = typeof key === 'string' ? key.trim() : key;
        let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(trimmedKey)}`);
        
        if (!response.ok) {
          // Fallback to v1
          response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(trimmedKey)}`);
        }

        if (response.ok) {
          return res.json({ valid: true });
        } else {
          const error = await response.json().catch(() => ({})) as any;
          return res.status(401).json({ 
            valid: false, 
            error: error.error?.message || "Invalid Gemini API key. Please ensure the 'Generative Language API' is enabled in your Google Cloud Console and the key is correct." 
          });
        }
      }
      res.status(400).json({ error: "Unsupported provider" });
    } catch (error: any) {
      console.error(`Validation error for ${provider}:`, error);
      res.status(500).json({ error: "Internal server error during validation" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
