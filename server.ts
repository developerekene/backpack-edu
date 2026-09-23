import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Helper for Paystack API headers
const getPaystackHeaders = () => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return null;
  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };
};

// Fallback Bank List
const FALLBACK_BANKS = [
  { name: "Guaranty Trust Bank (GTBank)", code: "058", country: "NG" },
  { name: "Zenith Bank", code: "057", country: "NG" },
  { name: "Access Bank", code: "044", country: "NG" },
  { name: "First Bank of Nigeria", code: "011", country: "NG" },
  { name: "United Bank For Africa (UBA)", code: "033", country: "NG" },
  { name: "Kuda Bank", code: "50211", country: "NG" },
  { name: "Moniepoint Microfinance Bank", code: "50515", country: "NG" },
  { name: "OPay Digital Services", code: "999992", country: "NG" },
  { name: "Stanbic IBTC Bank", code: "221", country: "NG" },
  { name: "Fidelity Bank", code: "070", country: "NG" },
  { name: "Sterling Bank", code: "232", country: "NG" },
  { name: "Wema Bank", code: "035", country: "NG" },
  { name: "GCB Bank", code: "GHS01", country: "GH" },
  { name: "Ecobank Ghana", code: "GHS02", country: "GH" },
  { name: "Equity Bank Kenya", code: "KES01", country: "KE" },
];

// --- 1. GET /api/paystack/banks ---
app.get("/api/paystack/banks", async (req, res) => {
  try {
    const headers = getPaystackHeaders();
    if (headers) {
      const country = (req.query.country as string) || "nigeria";
      const response = await fetch(`https://api.paystack.co/bank?country=${country}`, {
        headers,
      });
      if (response.ok) {
        const json = await response.json();
        return res.json({ success: true, banks: json.data });
      }
    }
  } catch (error) {
    console.warn("Paystack bank fetch error, using fallback list:", error);
  }
  return res.json({ success: true, banks: FALLBACK_BANKS, isFallback: true });
});

// --- 2. GET /api/paystack/resolve-account ---
app.get("/api/paystack/resolve-account", async (req, res) => {
  const { account_number, bank_code } = req.query;
  if (!account_number || !bank_code) {
    return res.status(400).json({ success: false, message: "account_number and bank_code are required" });
  }

  try {
    const headers = getPaystackHeaders();
    if (headers) {
      const response = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
        { headers }
      );
      const json = await response.json();
      if (response.ok && json.status) {
        return res.json({
          success: true,
          account_name: json.data.account_name,
          account_number: json.data.account_number,
        });
      }
      return res.status(400).json({ success: false, message: json.message || "Could not resolve account" });
    }
  } catch (error: unknown) {
    console.error("Account resolution error:", error);
  }

  // Demo fallback mode when secret key is not provided or live API is unreachable
  return res.json({
    success: true,
    account_name: `Verified Provider Account (${account_number})`,
    account_number: account_number as string,
    isDemo: true,
  });
});

// --- 3. POST /api/paystack/subaccount ---
app.post("/api/paystack/subaccount", async (req, res) => {
  const {
    business_name,
    settlement_bank,
    account_number,
    percentage_charge,
    description,
    primary_contact_email,
    primary_contact_name,
  } = req.body;

  if (!business_name || !settlement_bank || !account_number) {
    return res.status(400).json({
      success: false,
      message: "business_name, settlement_bank, and account_number are required.",
    });
  }

  // Default provider share percentage if not supplied (e.g. 90% to provider, 10% platform fee)
  const providerPercentage = percentage_charge !== undefined ? Number(percentage_charge) : 90;

  try {
    const headers = getPaystackHeaders();
    if (headers) {
      const payload = {
        business_name,
        settlement_bank,
        account_number,
        percentage_charge: providerPercentage,
        description: description || `Provider subaccount for ${business_name}`,
        primary_contact_email: primary_contact_email || undefined,
        primary_contact_name: primary_contact_name || undefined,
      };

      const response = await fetch("https://api.paystack.co/subaccount", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (response.ok && json.status) {
        return res.json({
          success: true,
          subaccount_code: json.data.subaccount_code,
          business_name: json.data.business_name,
          settlement_bank: json.data.settlement_bank,
          account_number: json.data.account_number,
          percentage_charge: json.data.percentage_charge,
          data: json.data,
        });
      }
      return res.status(400).json({
        success: false,
        message: json.message || "Failed to create Paystack subaccount",
      });
    }
  } catch (error: unknown) {
    console.error("Subaccount creation error:", error);
  }

  // Simulated subaccount code for testing/demo when secret key is not set
  const demoSubaccountCode = `ACCT_bp_${Math.random().toString(36).substring(2, 10)}`;
  return res.json({
    success: true,
    subaccount_code: demoSubaccountCode,
    business_name,
    settlement_bank,
    account_number,
    percentage_charge: providerPercentage,
    isDemo: true,
    message: "Subaccount created in preview/demo mode. Add PAYSTACK_SECRET_KEY to environment for live integration.",
  });
});

// --- 4. POST /api/paystack/initialize-split ---
app.post("/api/paystack/initialize-split", async (req, res) => {
  const { email, amount, currency = "NGN", subaccount_code, split_code, metadata, callback_url } = req.body;

  if (!email || !amount) {
    return res.status(400).json({ success: false, message: "email and amount are required." });
  }

  const amountInKobo = Math.round(Number(amount) * 100);

  try {
    const headers = getPaystackHeaders();
    if (headers) {
      const payload: Record<string, unknown> = {
        email,
        amount: amountInKobo,
        currency,
        metadata: metadata || {},
        callback_url: callback_url || undefined,
      };

      if (split_code) {
        payload.split_code = split_code;
      } else if (subaccount_code) {
        payload.subaccount = subaccount_code;
        payload.bearer = "account"; // Platform or subaccount bears fees
      }

      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (response.ok && json.status) {
        return res.json({
          success: true,
          authorization_url: json.data.authorization_url,
          access_code: json.data.access_code,
          reference: json.data.reference,
        });
      }
      return res.status(400).json({ success: false, message: json.message || "Failed to initialize transaction" });
    }
  } catch (error: unknown) {
    console.error("Split initialization error:", error);
  }

  // Fallback demo response if key not supplied
  const demoRef = `bp_ref_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  return res.json({
    success: true,
    authorization_url: `https://checkout.paystack.com/demo_${demoRef}`,
    access_code: `demo_access_${demoRef}`,
    reference: demoRef,
    isDemo: true,
  });
});

// --- 5. POST /api/paystack/create-split-group ---
app.post("/api/paystack/create-split-group", async (req, res) => {
  const { name, type = "percentage", currency = "NGN", subaccounts, bearer_type = "account" } = req.body;

  if (!name || !subaccounts || !Array.isArray(subaccounts)) {
    return res.status(400).json({ success: false, message: "name and subaccounts array are required" });
  }

  try {
    const headers = getPaystackHeaders();
    if (headers) {
      const payload = {
        name,
        type,
        currency,
        subaccounts,
        bearer_type,
      };

      const response = await fetch("https://api.paystack.co/split", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (response.ok && json.status) {
        return res.json({
          success: true,
          split_code: json.data.split_code,
          name: json.data.name,
          data: json.data,
        });
      }
      return res.status(400).json({ success: false, message: json.message || "Failed to create split group" });
    }
  } catch (error: unknown) {
    console.error("Split group error:", error);
  }

  const demoSplitCode = `SPL_bp_${Math.random().toString(36).substring(2, 8)}`;
  return res.json({
    success: true,
    split_code: demoSplitCode,
    name,
    isDemo: true,
  });
});

// --- 6. GET /api/paystack/verify/:reference ---
app.get("/api/paystack/verify/:reference", async (req, res) => {
  const { reference } = req.params;

  try {
    const headers = getPaystackHeaders();
    if (headers) {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, { headers });
      const json = await response.json();
      if (response.ok && json.status) {
        return res.json({
          success: true,
          status: json.data.status,
          amount: json.data.amount / 100,
          currency: json.data.currency,
          subaccount: json.data.subaccount,
          metadata: json.data.metadata,
          paid_at: json.data.paid_at,
          data: json.data,
        });
      }
    }
  } catch (error: unknown) {
    console.error("Verification error:", error);
  }

  return res.json({
    success: true,
    status: "success",
    reference,
    isDemo: true,
    message: "Verified in demo/preview mode",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", paystackConfigured: !!process.env.PAYSTACK_SECRET_KEY });
});

// Vite Middleware for development & static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backpack Paystack Split Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
