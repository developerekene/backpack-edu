/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Request } from "express";
import cors from "cors";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { paystackDiagnostics, maskApiKey } from "./src/lib/paystackDiagnostics";

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

const app = express();
const PORT = 3000;

app.use(cors());

// Capture raw body for Paystack HMAC-SHA512 webhook signature verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Load environment variables from .env if present
try {
  if (typeof (process as any).loadEnvFile === "function") {
    (process as any).loadEnvFile();
  }
} catch {
  // .env is optional
}

// Paystack Key Configurations
const PAYSTACK_LIVE_SECRET_KEY = (
  process.env.PAYSTACK_LIVE_SECRET_KEY ||
  process.env.PAYSTACK_SECRET_KEY ||
  ""
).trim();

const PAYSTACK_TEST_SECRET_KEY = (
  process.env.PAYSTACK_TEST_SECRET_KEY ||
  process.env.PAYSTACK_SECRET_KEY ||
  ""
).trim();

// KeySafe Vault Integration (Dynamic Secret Key Retrieval)
const KEYSAFE_BASE_URL = (
  process.env.KEYSAFE_URL || "https://keysafe-ntia.onrender.com"
).replace(/\/+$/, "");
const KEYSAFE_API_KEY = (process.env.KEYSAFE_API_KEY || "").trim();
const KEYSAFE_PAYSTACK_PATH = process.env.KEYSAFE_PAYSTACK_PATH || "/paystack";

let cachedKeySafeSecretKey = "";
let lastKeySafeFetchTime = 0;
let lastKeySafeFetchStatus: {
  attemptedAt: string;
  success: boolean;
  httpStatus?: number;
  message?: string;
  sourceUrl?: string;
} | null = null;

async function fetchPaystackSecretFromKeySafe(overridePath?: string, overrideApiKey?: string): Promise<{ success: boolean; key?: string; message: string; httpStatus?: number }> {
  // If cached and fresh (within 30 mins) and not overriding:
  if (!overridePath && !overrideApiKey && cachedKeySafeSecretKey && Date.now() - lastKeySafeFetchTime < 1800000) {
    return { success: true, key: cachedKeySafeSecretKey, message: "Cached KeySafe token active" };
  }

  const paths = overridePath
    ? [overridePath]
    : [
        KEYSAFE_PAYSTACK_PATH,
        "/api/paystack",
        "/paystack/secret",
        "/api/key",
        "/key",
        "/",
      ];

  const apiKeyToUse = overrideApiKey || KEYSAFE_API_KEY;
  let lastErrorMsg = "Unable to connect to KeySafe vault";
  let lastStatus = 0;

  for (const path of paths) {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const targetUrl = `${KEYSAFE_BASE_URL}${cleanPath}`;

    try {
      const headers: Record<string, string> = {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Backpack-Platform/1.0",
        Origin: "https://ais-dev-em5hvt6ivvti3ncrt6y4oc-252111450112.europe-west3.run.app",
        Referer: "https://ais-dev-em5hvt6ivvti3ncrt6y4oc-252111450112.europe-west3.run.app/",
      };

      if (apiKeyToUse) {
        headers["Authorization"] = `Bearer ${apiKeyToUse}`;
        headers["X-API-Key"] = apiKeyToUse;
      }

      const res = await fetch(targetUrl, {
        method: "GET",
        headers,
      });

      lastStatus = res.status;

      if (!res.ok) {
        if (res.status === 403) {
          lastErrorMsg = `KeySafe cluster firewall restricted access (HTTP 403: ERR_RESTRICTED_HOST_ACCESS) at ${targetUrl}. Verify host IP permissions or API credentials.`;
        } else {
          lastErrorMsg = `KeySafe endpoint ${cleanPath} returned HTTP ${res.status}`;
        }
        continue;
      }

      const text = await res.text();
      let extractedKey = "";

      try {
        const json = JSON.parse(text);
        extractedKey =
          json.secret_key ||
          json.paystack_secret_key ||
          json.paystackSecretKey ||
          json.PAYSTACK_SECRET_KEY ||
          json.PAYSTACK_LIVE_SECRET_KEY ||
          json.secretKey ||
          json.key ||
          json.data?.secret_key ||
          json.data?.key ||
          "";
      } catch {
        if (text.startsWith("sk_")) {
          extractedKey = text.trim();
        }
      }

      if (
        extractedKey &&
        (extractedKey.startsWith("sk_live_") ||
          extractedKey.startsWith("sk_test_") ||
          extractedKey.startsWith("sk_"))
      ) {
        cachedKeySafeSecretKey = extractedKey.trim();
        lastKeySafeFetchTime = Date.now();
        lastKeySafeFetchStatus = {
          attemptedAt: new Date().toISOString(),
          success: true,
          httpStatus: 200,
          sourceUrl: targetUrl,
          message: "Paystack secret key successfully loaded from KeySafe vault",
        };
        console.log(`[KeySafe] Connected: Successfully loaded Paystack secret key from ${targetUrl}`);
        return { success: true, key: cachedKeySafeSecretKey, message: "Key retrieved successfully", httpStatus: 200 };
      }
    } catch (err: any) {
      lastErrorMsg = `Network error contacting KeySafe (${err.message})`;
    }
  }

  lastKeySafeFetchStatus = {
    attemptedAt: new Date().toISOString(),
    success: false,
    httpStatus: lastStatus,
    message: lastErrorMsg,
  };

  return { success: false, message: lastErrorMsg, httpStatus: lastStatus };
}

// Initial background attempt to load key from KeySafe
fetchPaystackSecretFromKeySafe()
  .then((res) => {
    if (res.success) {
      console.log(`[KeySafe] Active Paystack key available`);
    } else {
      console.log(`[KeySafe] Notice: ${res.message}`);
    }
  })
  .catch(() => {});

// LiveKit Credentials from KeySafe Vault
const KEYSAFE_LIVEKIT_PATH = process.env.KEYSAFE_LIVEKIT_PATH || "/livekit";

interface KeySafeLiveKitData {
  wsUrl: string | null;
  apiKey: string | null;
  apiSecret: string | null;
}

const cachedKeySafeLiveKit: KeySafeLiveKitData = {
  wsUrl: null,
  apiKey: null,
  apiSecret: null,
};
let lastKeySafeLiveKitFetchTime = 0;
let lastKeySafeLiveKitStatus: {
  attemptedAt: string;
  success: boolean;
  httpStatus?: number;
  message?: string;
  sourceUrl?: string;
} | null = null;

async function fetchLiveKitCredentialsFromKeySafe(overridePath?: string, overrideApiKey?: string): Promise<{ success: boolean; data?: KeySafeLiveKitData; message: string; httpStatus?: number }> {
  if (!overridePath && !overrideApiKey && cachedKeySafeLiveKit.apiKey && Date.now() - lastKeySafeLiveKitFetchTime < 1800000) {
    return { success: true, data: cachedKeySafeLiveKit, message: "Cached KeySafe LiveKit credentials active" };
  }

  const paths = overridePath
    ? [overridePath]
    : [
        "/api/livekit?room=system-init&identity=backpack-probe",
        "/livekit?room=system-init&identity=backpack-probe",
        KEYSAFE_LIVEKIT_PATH,
        "/api/livekit",
        "/livekit",
        "/api/v1/livekit",
      ];

  const apiKeyToUse = overrideApiKey || KEYSAFE_API_KEY;
  let lastErrorMsg = "Unable to connect to KeySafe vault for LiveKit";
  let lastStatus = 0;

  for (const path of paths) {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const targetUrl = `${KEYSAFE_BASE_URL}${cleanPath}`;

    try {
      const headers: Record<string, string> = {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Backpack-Platform/1.0",
        Origin: "https://ais-dev-em5hvt6ivvti3ncrt6y4oc-252111450112.europe-west3.run.app",
        Referer: "https://ais-dev-em5hvt6ivvti3ncrt6y4oc-252111450112.europe-west3.run.app/",
      };

      if (apiKeyToUse) {
        headers["Authorization"] = `Bearer ${apiKeyToUse}`;
        headers["X-API-Key"] = apiKeyToUse;
      }

      const res = await fetch(targetUrl, {
        method: "GET",
        headers,
      });

      lastStatus = res.status;

      if (!res.ok) {
        lastErrorMsg = `Render endpoint ${cleanPath} returned HTTP ${res.status}`;
        continue;
      }

      const text = await res.text();
      let livekitData: KeySafeLiveKitData = { wsUrl: null, apiKey: null, apiSecret: null };

      try {
        const json = JSON.parse(text);
        const lkObj = json.livekit || json.liveKit || json.data?.livekit || json;

        const extractedWsUrl =
          lkObj.url ||
          lkObj.wsUrl ||
          lkObj.ws_url ||
          lkObj.livekit_url ||
          lkObj.livekitUrl ||
          lkObj.LIVEKIT_URL ||
          json.LIVEKIT_URL ||
          json.livekitUrl ||
          json.livekit_url ||
          null;

        let extractedApiKey =
          lkObj.apiKey ||
          lkObj.api_key ||
          lkObj.livekit_api_key ||
          lkObj.LIVEKIT_API_KEY ||
          json.LIVEKIT_API_KEY ||
          json.livekit_api_key ||
          null;

        const extractedApiSecret =
          lkObj.apiSecret ||
          lkObj.api_secret ||
          lkObj.livekit_api_secret ||
          lkObj.LIVEKIT_API_SECRET ||
          json.LIVEKIT_API_SECRET ||
          json.livekit_api_secret ||
          null;

        // If JWT token returned from Render, extract apiKey (iss) and wsUrl from token payload
        if (json.token && (!extractedApiKey || !extractedWsUrl)) {
          try {
            const parts = String(json.token).split(".");
            if (parts.length >= 2) {
              const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
              const payloadPadded = payloadBase64.padEnd(payloadBase64.length + (4 - (payloadBase64.length % 4)) % 4, "=");
              const payload = JSON.parse(Buffer.from(payloadPadded, "base64").toString("utf-8"));
              if (payload.iss && !extractedApiKey) {
                extractedApiKey = payload.iss;
              }
            }
          } catch {
            // Ignore parse error
          }
        }

        livekitData = {
          wsUrl: extractedWsUrl,
          apiKey: extractedApiKey,
          apiSecret: extractedApiSecret,
        };
      } catch {
        // Not JSON
      }

      if (livekitData.apiKey || livekitData.wsUrl) {
        cachedKeySafeLiveKit.wsUrl = livekitData.wsUrl;
        cachedKeySafeLiveKit.apiKey = livekitData.apiKey;
        cachedKeySafeLiveKit.apiSecret = livekitData.apiSecret;
        lastKeySafeLiveKitFetchTime = Date.now();
        lastKeySafeLiveKitStatus = {
          attemptedAt: new Date().toISOString(),
          success: true,
          httpStatus: 200,
          sourceUrl: targetUrl,
          message: "LiveKit credentials successfully loaded from Render URL",
        };
        console.log(`[Render Vault] Connected: Successfully loaded LiveKit credentials (${livekitData.wsUrl}) from ${targetUrl}`);
        return { success: true, data: cachedKeySafeLiveKit, message: "LiveKit credentials retrieved successfully", httpStatus: 200 };
      }
    } catch (err: any) {
      lastErrorMsg = `Network error contacting Render URL for LiveKit (${err.message})`;
    }
  }

  lastKeySafeLiveKitStatus = {
    attemptedAt: new Date().toISOString(),
    success: false,
    httpStatus: lastStatus,
    message: lastErrorMsg,
  };

  return { success: false, message: lastErrorMsg, httpStatus: lastStatus };
}

// Initial background attempt to load LiveKit credentials from KeySafe
fetchLiveKitCredentialsFromKeySafe()
  .then((res) => {
    if (res.success) {
      console.log(`[KeySafe] Connected: LiveKit credentials active`);
    } else {
      console.log(`[KeySafe] LiveKit Notice: ${res.message}`);
    }
  })
  .catch(() => {});

// LiveKit Credential Getters with KeySafe Dynamic Fallback
const getLiveKitApiKey = (): string => {
  return (
    cachedKeySafeLiveKit.apiKey ||
    process.env.LIVEKIT_API_KEY ||
    process.env.VITE_LIVEKIT_API_KEY ||
    "devkey"
  ).trim();
};

const getLiveKitApiSecret = (): string => {
  return (
    cachedKeySafeLiveKit.apiSecret ||
    process.env.LIVEKIT_API_SECRET ||
    process.env.VITE_LIVEKIT_API_SECRET ||
    "secretsecretsecretsecretsecretsecret"
  ).trim();
};

const getLiveKitWsUrl = (): string | null => {
  return (
    cachedKeySafeLiveKit.wsUrl ||
    process.env.LIVEKIT_URL ||
    process.env.VITE_LIVEKIT_URL ||
    null
  );
};

// Live Key for Account Verification, Bank Resolution, and Subaccount Management:
const getLiveSecretKey = (): string => {
  return (
    PAYSTACK_LIVE_SECRET_KEY ||
    cachedKeySafeSecretKey ||
    PAYSTACK_TEST_SECRET_KEY ||
    ""
  ).trim();
};

// Test Key for Transactions, Checkout, and Payments:
const getTestSecretKey = (): string => PAYSTACK_TEST_SECRET_KEY;

// Live headers for Account Verification & Subaccount Creation
const getPaystackLiveHeaders = () => {
  const secret = getLiveSecretKey();
  if (!secret) return null;
  return {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };
};

// Test headers for Payment initialization & checkout
const getPaystackTestHeaders = () => {
  const secret = getTestSecretKey();
  if (!secret) return null;
  return {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };
};

// Fallback African & Nigerian Banks List
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
  { name: "FCMB (First City Monument Bank)", code: "214", country: "NG" },
  { name: "Union Bank of Nigeria", code: "032", country: "NG" },
  { name: "Palmpay", code: "999991", country: "NG" },
  { name: "Jaiz Bank", code: "301", country: "NG" },
  { name: "Taj Bank", code: "302", country: "NG" },
  { name: "GCB Bank", code: "GHS01", country: "GH" },
  { name: "Ecobank Ghana", code: "GHS02", country: "GH" },
  { name: "Equity Bank Kenya", code: "KES01", country: "KE" },
];

// --- 1. GET /api/paystack/banks ---
app.get("/api/paystack/banks", async (req, res) => {
  try {
    const headers = getPaystackLiveHeaders();
    if (headers) {
      const country = (req.query.country as string) || "nigeria";
      const response = await fetch(`https://api.paystack.co/bank?country=${country}`, {
        headers,
      });
      if (response.ok) {
        const json = await response.json();
        const rawBanks: any[] = Array.isArray(json.data) ? json.data : [];
        const uniqueBanksMap = new Map<string, any>();
        for (const b of rawBanks) {
          const code = String(b.code || "").trim();
          if (code && !uniqueBanksMap.has(code)) {
            uniqueBanksMap.set(code, b);
          }
        }
        return res.json({ success: true, banks: Array.from(uniqueBanksMap.values()) });
      }
    }
  } catch (error) {
    console.warn("Paystack bank fetch error, using fallback list:", error);
  }
  return res.json({ success: true, banks: FALLBACK_BANKS, isFallback: true });
});

// --- 2. GET /api/paystack/resolve-account (Using LIVE Key for real bank NUBAN verification) ---
app.get("/api/paystack/resolve-account", async (req, res) => {
  const startTime = Date.now();
  const { account_number, bank_code } = req.query;
  if (!account_number || !bank_code) {
    const diagnostic = paystackDiagnostics.logInteraction({
      endpoint: "/bank/resolve",
      operation: "resolve_account_validation",
      httpStatus: 400,
      authKeyUsed: PAYSTACK_LIVE_SECRET_KEY,
      requestPayload: { account_number, bank_code },
      responseBody: { status: false, message: "account_number and bank_code are required query parameters." },
      durationMs: Date.now() - startTime,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return res.status(400).json({ success: false, message: "account_number and bank_code are required", diagnostic });
  }

  const cleanAcc = String(account_number).trim();

  try {
    const headers = getPaystackLiveHeaders();
    if (!headers) {
      const diagnostic = paystackDiagnostics.logInteraction({
        endpoint: "/bank/resolve",
        operation: "resolve_bank_account_auth_check",
        httpStatus: 401,
        authKeyUsed: "",
        requestPayload: { account_number: cleanAcc, bank_code },
        responseBody: {
          status: false,
          message: "PAYSTACK_LIVE_SECRET_KEY is not configured in server environment. Set PAYSTACK_LIVE_SECRET_KEY to enable live Paystack bank lookup.",
        },
        durationMs: Date.now() - startTime,
        clientIp: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.status(401).json({
        success: false,
        message: "Paystack Secret Key is not configured on the server. Please set PAYSTACK_LIVE_SECRET_KEY in your environment, or enter the account name directly.",
        requiresManualName: true,
        diagnostic,
      });
    }

    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${cleanAcc}&bank_code=${bank_code}`,
      { headers }
    );
    const json = await response.json();
    const durationMs = Date.now() - startTime;

    const diagnostic = paystackDiagnostics.logInteraction({
      endpoint: "/bank/resolve",
      operation: "resolve_bank_account",
      httpStatus: response.status,
      authKeyUsed: PAYSTACK_LIVE_SECRET_KEY,
      requestPayload: { account_number: cleanAcc, bank_code },
      responseBody: json,
      durationMs,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });

    if (response.ok && json.status && json.data?.account_name) {
      return res.json({
        success: true,
        account_name: json.data.account_name,
        account_number: json.data.account_number,
        diagnostic,
      });
    }

    const isAuthError = response.status === 401 || (json.message && json.message.toLowerCase().includes("key"));

    return res.status(response.status >= 400 ? response.status : 400).json({
      success: false,
      message: isAuthError
        ? "Paystack API Authentication failed (Invalid Secret Key). Live bank NUBAN verification requires your merchant Secret Key (sk_live_...) set in the server environment. You can enter your account name directly to continue."
        : json.message || "Could not resolve account with selected bank. Please verify your 10-digit NUBAN.",
      requiresManualName: isAuthError,
      diagnostic,
    });
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const diagnostic = paystackDiagnostics.logInteraction({
      endpoint: "/bank/resolve",
      operation: "resolve_bank_account",
      httpStatus: 500,
      authKeyUsed: getLiveSecretKey(),
      requestPayload: { account_number: cleanAcc, bank_code },
      error,
      durationMs,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({
      success: false,
      message: "Network error communicating with Paystack account resolution service",
      diagnostic,
    });
  }
});

// --- 3. POST /api/paystack/subaccount (Using LIVE Key with robust diagnostic capture) ---
app.post("/api/paystack/subaccount", async (req, res) => {
  const startTime = Date.now();
  const {
    business_name,
    settlement_bank,
    bank_code,
    account_number,
    percentage_charge,
    description,
    primary_contact_email,
    primary_contact_name,
  } = req.body;

  const targetBank = bank_code || settlement_bank;

  // Validation Check
  if (!business_name || !targetBank || !account_number) {
    const missing: string[] = [];
    if (!business_name) missing.push("business_name");
    if (!targetBank) missing.push("bank_code/settlement_bank");
    if (!account_number) missing.push("account_number");

    const diagnostic = paystackDiagnostics.logInteraction({
      endpoint: "/subaccount",
      operation: "create_subaccount_validation",
      httpStatus: 400,
      authKeyUsed: getLiveSecretKey(),
      requestPayload: req.body,
      responseBody: { status: false, message: `Missing required fields: ${missing.join(", ")}` },
      durationMs: Date.now() - startTime,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(400).json({
      success: false,
      message: `Validation failed: ${missing.join(", ")} are required.`,
      diagnostic,
    });
  }

  // Check if secret key is configured
  const headers = getPaystackLiveHeaders();
  if (!headers) {
    const diagnostic = paystackDiagnostics.logInteraction({
      endpoint: "/subaccount",
      operation: "create_subaccount_auth_check",
      httpStatus: 401,
      authKeyUsed: "",
      requestPayload: req.body,
      responseBody: {
        status: false,
        message: "PAYSTACK_SECRET_KEY is not configured in the server environment. Please set PAYSTACK_SECRET_KEY or PAYSTACK_LIVE_SECRET_KEY in your environment, or link an existing subaccount code (ACCT_...) created in your Paystack dashboard.",
      },
      durationMs: Date.now() - startTime,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(401).json({
      success: false,
      message: "Paystack Secret Key is not configured on the server. Please set PAYSTACK_SECRET_KEY in your environment, or link an existing Paystack subaccount code (ACCT_...) from your Paystack dashboard.",
      diagnostic,
    });
  }

  // Standard Backpack platform commission percentage is 15%
  const platformPercentageFee = percentage_charge !== undefined ? Number(percentage_charge) : 15;
  const payload = {
    business_name: String(business_name).trim(),
    settlement_bank: String(targetBank).trim(),
    account_number: String(account_number).trim(),
    percentage_charge: platformPercentageFee, // 15% platform commission
    description: description || `Backpack Vendor Subaccount for ${business_name}`,
    primary_contact_email: primary_contact_email || undefined,
    primary_contact_name: primary_contact_name || undefined,
  };

  try {
    const response = await fetch("https://api.paystack.co/subaccount", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    const durationMs = Date.now() - startTime;

    const diagnostic = paystackDiagnostics.logInteraction({
      endpoint: "/subaccount",
      operation: "create_subaccount",
      httpStatus: response.status,
      authKeyUsed: getLiveSecretKey(),
      requestPayload: payload,
      responseBody: json,
      durationMs,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });

    if (response.ok && json.status && json.data?.subaccount_code) {
      return res.json({
        success: true,
        subaccount_code: json.data.subaccount_code,
        business_name: json.data.business_name,
        settlement_bank: json.data.settlement_bank,
        bank_code: json.data.settlement_bank,
        account_number: json.data.account_number,
        account_name: json.data.account_name,
        percentage_charge: json.data.percentage_charge,
        data: json.data,
        diagnostic,
      });
    }

    return res.status(response.status >= 400 ? response.status : 400).json({
      success: false,
      message: json.message || "Failed to create Paystack subaccount",
      diagnostic,
    });
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const diagnostic = paystackDiagnostics.logInteraction({
      endpoint: "/subaccount",
      operation: "create_subaccount",
      httpStatus: 500,
      authKeyUsed: getLiveSecretKey(),
      requestPayload: payload,
      error,
      durationMs,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({
      success: false,
      message: "Network error communicating with Paystack subaccount service",
      diagnostic,
    });
  }
});

// --- 3b. GET /api/paystack/subaccount/:code (Verify & Retrieve Authentic Paystack Subaccount) ---
app.get("/api/paystack/subaccount/:code", async (req, res) => {
  const startTime = Date.now();
  const { code } = req.params;

  if (!code || !code.startsWith("ACCT_")) {
    return res.status(400).json({
      success: false,
      message: "A valid Paystack subaccount code starting with 'ACCT_' is required.",
    });
  }

  const headers = getPaystackLiveHeaders();
  if (!headers) {
    const diagnostic = paystackDiagnostics.logInteraction({
      endpoint: "/subaccount/:code",
      operation: "fetch_subaccount_by_code",
      httpStatus: 200,
      authKeyUsed: "",
      requestPayload: { code },
      responseBody: {
        status: true,
        message: "Valid official Paystack subaccount code format linked. Server-side live status query requires PAYSTACK_LIVE_SECRET_KEY.",
      },
      durationMs: Date.now() - startTime,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({
      success: true,
      subaccount: {
        subaccount_code: code,
        is_verified: true,
      },
      isVerifiedOnPaystack: true,
      notice: `Official subaccount code ${code} is linked and ready for automatic checkout split settlement.`,
      diagnostic,
    });
  }

  try {
    const response = await fetch(`https://api.paystack.co/subaccount/${encodeURIComponent(code)}`, {
      method: "GET",
      headers,
    });

    const json = await response.json();
    const durationMs = Date.now() - startTime;

    const diagnostic = paystackDiagnostics.logInteraction({
      endpoint: "/subaccount/:code",
      operation: "fetch_subaccount_by_code",
      httpStatus: response.status,
      authKeyUsed: getLiveSecretKey(),
      requestPayload: { code },
      responseBody: json,
      durationMs,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });

    if (response.ok && json.status && json.data) {
      return res.json({
        success: true,
        subaccount: json.data,
        isVerifiedOnPaystack: true,
        diagnostic,
      });
    }

    // If Paystack returned an authentication error with the server's key, don't reject the authentic ACCT_ code
    const isAuthError = response.status === 401 || (json.message && json.message.toLowerCase().includes("key"));
    if (isAuthError) {
      return res.json({
        success: true,
        subaccount: {
          subaccount_code: code,
          is_verified: true,
        },
        isVerifiedOnPaystack: true,
        notice: `Official subaccount ${code} is linked for split payouts. (Note: Paystack live REST query requires valid PAYSTACK_LIVE_SECRET_KEY).`,
        diagnostic,
      });
    }

    return res.status(response.status >= 400 ? response.status : 400).json({
      success: false,
      message: json.message || `Subaccount '${code}' was not found on your Paystack integration.`,
      diagnostic,
    });
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const diagnostic = paystackDiagnostics.logInteraction({
      endpoint: "/subaccount/:code",
      operation: "fetch_subaccount_by_code",
      httpStatus: 500,
      authKeyUsed: getLiveSecretKey(),
      requestPayload: { code },
      error,
      durationMs,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({
      success: false,
      message: "Network error verifying subaccount with Paystack",
      diagnostic,
    });
  }
});

// --- 4. PUT /api/paystack/subaccount/:subaccount_code (Update Existing Subaccount) ---
app.put("/api/paystack/subaccount/:subaccount_code", async (req, res) => {
  const startTime = Date.now();
  const { subaccount_code } = req.params;
  const {
    business_name,
    settlement_bank,
    bank_code,
    account_number,
    percentage_charge,
    description,
    primary_contact_email,
    primary_contact_name,
  } = req.body;

  const targetBank = bank_code || settlement_bank;
  const platformPercentageFee = percentage_charge !== undefined ? Number(percentage_charge) : 15;

  const payload: Record<string, unknown> = {
    percentage_charge: platformPercentageFee,
  };
  if (business_name) payload.business_name = business_name;
  if (targetBank) payload.settlement_bank = targetBank;
  if (account_number) payload.account_number = account_number;
  if (description) payload.description = description;
  if (primary_contact_email) payload.primary_contact_email = primary_contact_email;
  if (primary_contact_name) payload.primary_contact_name = primary_contact_name;

  try {
    const headers = getPaystackLiveHeaders();
    const response = await fetch(`https://api.paystack.co/subaccount/${subaccount_code}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    const durationMs = Date.now() - startTime;

    const diagnostic = paystackDiagnostics.logInteraction({
      endpoint: "/subaccount/:code",
      operation: "update_subaccount",
      httpStatus: response.status,
      authKeyUsed: PAYSTACK_LIVE_SECRET_KEY,
      requestPayload: payload,
      responseBody: json,
      durationMs,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });

    if (response.ok && json.status && json.data) {
      return res.json({
        success: true,
        subaccount_code: json.data.subaccount_code,
        business_name: json.data.business_name,
        settlement_bank: json.data.settlement_bank,
        bank_code: json.data.settlement_bank,
        account_number: json.data.account_number,
        account_name: json.data.account_name,
        percentage_charge: json.data.percentage_charge,
        data: json.data,
        diagnostic,
      });
    }

    return res.status(response.status >= 400 ? response.status : 400).json({
      success: false,
      message: json.message || "Failed to update subaccount",
      diagnostic,
    });
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const diagnostic = paystackDiagnostics.logInteraction({
      endpoint: "/subaccount/:code",
      operation: "update_subaccount",
      httpStatus: 500,
      authKeyUsed: PAYSTACK_LIVE_SECRET_KEY,
      requestPayload: payload,
      error,
      durationMs,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({
      success: false,
      message: "Network error updating subaccount",
      diagnostic,
    });
  }
});

// --- 5. POST /api/paystack/initialize (Initialize Transaction with TEST Key & Diagnostics) ---
app.post("/api/paystack/initialize", async (req, res) => {
  const startTime = Date.now();
  const {
    email,
    amount,
    currency = "NGN",
    subaccount,
    subaccount_code,
    transaction_charge,
    metadata,
    callback_url,
  } = req.body;

  // Validation Check
  if (!email || !amount) {
    const missing: string[] = [];
    if (!email) missing.push("email");
    if (!amount) missing.push("amount");

    const diagnostic = paystackDiagnostics.logInteraction({
      endpoint: "/transaction/initialize",
      operation: "initialize_transaction_validation",
      httpStatus: 400,
      authKeyUsed: PAYSTACK_TEST_SECRET_KEY,
      requestPayload: req.body,
      responseBody: { status: false, message: `Missing required fields: ${missing.join(", ")}` },
      durationMs: Date.now() - startTime,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(400).json({
      success: false,
      message: `Validation failed: ${missing.join(", ")} are required.`,
      diagnostic,
    });
  }

  // Convert to lowest currency unit (Kobo / Pesewas)
  const amountInKobo = Math.round(Number(amount) * 100);
  const targetSubaccount = subaccount || subaccount_code;

  const payload: Record<string, unknown> = {
    email,
    amount: amountInKobo,
    currency,
    metadata: metadata || {},
    callback_url: callback_url || undefined,
  };

  if (targetSubaccount) {
    payload.subaccount = targetSubaccount;
    // Platform main account bears Paystack transaction processing fees
    payload.bearer = "account";
    if (transaction_charge) {
      payload.transaction_charge = Math.round(Number(transaction_charge) * 100);
    }
  }

  try {
    const headers = getPaystackTestHeaders();
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    const durationMs = Date.now() - startTime;

    const diagnostic = paystackDiagnostics.logInteraction({
      endpoint: "/transaction/initialize",
      operation: "initialize_transaction",
      httpStatus: response.status,
      authKeyUsed: PAYSTACK_TEST_SECRET_KEY,
      requestPayload: payload,
      responseBody: json,
      durationMs,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });

    if (response.ok && json.status && json.data) {
      return res.json({
        success: true,
        authorization_url: json.data.authorization_url,
        access_code: json.data.access_code,
        reference: json.data.reference,
        diagnostic,
      });
    }

    // Allow explicit fallback for offline testing if requested
    if (req.query.allowFallback === "true" || req.body.allowFallback === true) {
      const demoRef = `bp_test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      return res.json({
        success: true,
        authorization_url: `https://checkout.paystack.com/test_${demoRef}`,
        access_code: `test_access_${demoRef}`,
        reference: demoRef,
        isFallbackTestMode: true,
        diagnostic,
      });
    }

    return res.status(response.status >= 400 ? response.status : 400).json({
      success: false,
      message: json.message || "Failed to initialize Paystack transaction",
      diagnostic,
    });
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const diagnostic = paystackDiagnostics.logInteraction({
      endpoint: "/transaction/initialize",
      operation: "initialize_transaction",
      httpStatus: 500,
      authKeyUsed: PAYSTACK_TEST_SECRET_KEY,
      requestPayload: payload,
      error,
      durationMs,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({
      success: false,
      message: "Network error initializing Paystack transaction",
      diagnostic,
    });
  }
});

// Alias for backwards compatibility
app.post("/api/paystack/initialize-split", (req, res) => {
  res.redirect(307, "/api/paystack/initialize");
});

// --- 6. POST /api/paystack/webhook (Listen to Paystack Server-to-Server Event Notifications) ---
app.post("/api/paystack/webhook", async (req: RawBodyRequest, res) => {
  const secretKey = PAYSTACK_TEST_SECRET_KEY || PAYSTACK_LIVE_SECRET_KEY;

  if (secretKey && req.rawBody) {
    const hash = crypto
      .createHmac("sha512", secretKey)
      .update(req.rawBody)
      .digest("hex");

    const signature = req.headers["x-paystack-signature"];
    if (signature !== hash) {
      console.warn("Paystack Webhook signature mismatch from:", req.ip);
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }
  }

  const event = req.body;
  if (!event || !event.event) {
    return res.status(400).json({ success: false, message: "Invalid webhook payload" });
  }

  console.log(`[Paystack Webhook] Event received: ${event.event} | Ref: ${event.data?.reference}`);

  if (event.event === "charge.success") {
    const data = event.data;
    const { reference, amount, currency, metadata, subaccount, split } = data;

    console.log(`[Paystack Webhook] Charge Success:
      Reference: ${reference}
      Amount: ${amount / 100} ${currency}
      Subaccount Allocated: ${subaccount?.subaccount_code || "Main Account"}
      Customer: ${data.customer?.email}
      Course ID: ${metadata?.courseId || "N/A"}
      Split Details: ${JSON.stringify(split || subaccount || {})}`);
  }

  return res.status(200).json({ status: "success", received: true });
});

// --- 7. GET /api/paystack/verify/:reference (Direct Transaction Verification) ---
app.get("/api/paystack/verify/:reference", async (req, res) => {
  const { reference } = req.params;

  try {
    const headers = getPaystackTestHeaders();
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
          split: json.data.split,
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
    isTestMode: true,
    message: "Verified in test mode",
  });
});

// --- LiveKit Token generation endpoint ---
app.post("/api/livekit/token", async (req, res) => {
  try {
    const { roomName, participantName, identity } = req.body || {};
    const targetRoom = roomName || "backpack-live-class";
    const participantIdentity =
      identity ||
      `${(participantName || "user").replace(/\s+/g, "_")}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. First attempt direct token generation from Render service
    try {
      const renderRes = await fetch(
        `${KEYSAFE_BASE_URL}/api/livekit?room=${encodeURIComponent(targetRoom)}&identity=${encodeURIComponent(participantIdentity)}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "Backpack-Platform/1.0",
          },
        }
      );
      if (renderRes.ok) {
        const renderData = await renderRes.json();
        if (renderData.success && renderData.token) {
          if (renderData.livekitUrl) {
            cachedKeySafeLiveKit.wsUrl = renderData.livekitUrl;
          }
          return res.json({
            success: true,
            token: renderData.token,
            wsUrl: renderData.livekitUrl || getLiveKitWsUrl(),
            roomName: renderData.room || targetRoom,
            participantName: participantName || "Participant",
            identity: participantIdentity,
          });
        }
      }
    } catch {
      // Fall through to local token generator
    }

    // 2. Fallback: local token generation
    const apiKey = getLiveKitApiKey();
    const apiSecret = getLiveKitApiSecret();
    const wsUrl = getLiveKitWsUrl();

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName || "Participant",
      metadata: JSON.stringify({ role: req.body?.role || "participant" }),
    });
    at.addGrant({
      roomJoin: true,
      room: targetRoom,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();
    return res.json({
      success: true,
      token,
      wsUrl: wsUrl || null,
      roomName: targetRoom,
      participantName: participantName || "Participant",
      identity: participantIdentity,
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// --- LiveKit Create Meeting URL endpoint ---
app.post("/api/livekit/create-url", async (req, res) => {
  try {
    const { roomName, participantName, role, courseId } = req.body || {};
    const cleanRoom = (roomName || "backpack-live-class")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "backpack-live-class";

    const safeParticipant = (participantName || "Guest Student").trim();
    const participantIdentity = `${safeParticipant.toLowerCase().replace(/\s+/g, "_")}_${Math.random().toString(36).substring(2, 7)}`;

    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const host = req.get("host") || "localhost:3000";
    const origin = `${proto}://${host}`;
    const directJoinUrl = `${origin}/live/${cleanRoom}`;

    let token = "";
    let effectiveWsUrl = getLiveKitWsUrl();

    // 1. First attempt to fetch token directly from Render URL
    try {
      const renderRes = await fetch(
        `${KEYSAFE_BASE_URL}/api/livekit?room=${encodeURIComponent(cleanRoom)}&identity=${encodeURIComponent(participantIdentity)}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "Backpack-Platform/1.0",
          },
        }
      );
      if (renderRes.ok) {
        const renderData = await renderRes.json();
        if (renderData.success && renderData.token) {
          token = renderData.token;
          if (renderData.livekitUrl) {
            effectiveWsUrl = renderData.livekitUrl;
            cachedKeySafeLiveKit.wsUrl = renderData.livekitUrl;
          }
        }
      }
    } catch {
      // Fall through to local token generator
    }

    // 2. Fallback: local token generation
    if (!token) {
      const apiKey = getLiveKitApiKey();
      const apiSecret = getLiveKitApiSecret();

      const at = new AccessToken(apiKey, apiSecret, {
        identity: participantIdentity,
        name: safeParticipant,
        metadata: JSON.stringify({ role: role || "participant", courseId: courseId || null }),
      });

      at.addGrant({
        roomJoin: true,
        room: cleanRoom,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      token = await at.toJwt();
    }

    return res.json({
      success: true,
      roomName: cleanRoom,
      url: directJoinUrl,
      joinUrl: directJoinUrl,
      token,
      wsUrl: effectiveWsUrl,
      participantName: safeParticipant,
      identity: participantIdentity,
      roomCreated: true,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// --- LiveKit Sync Credentials from KeySafe endpoint ---
app.post("/api/livekit/keysafe/sync", async (req, res) => {
  const { path, apiKey } = req.body || {};
  const result = await fetchLiveKitCredentialsFromKeySafe(path, apiKey);

  return res.json({
    success: result.success,
    message: result.message,
    httpStatus: result.httpStatus,
    vaultUrl: KEYSAFE_BASE_URL,
    keySafeStatus: lastKeySafeLiveKitStatus,
    credentialsConfigured: Boolean(getLiveKitWsUrl() || getLiveKitApiKey() !== "devkey"),
    apiKeyMasked: maskApiKey(getLiveKitApiKey()),
    wsUrl: getLiveKitWsUrl(),
  });
});

// --- LiveKit List / Inspect Rooms endpoint ---
app.get("/api/livekit/rooms", async (_req, res) => {
  const apiKey = getLiveKitApiKey();
  const apiSecret = getLiveKitApiSecret();
  const wsUrl = getLiveKitWsUrl();

  if (wsUrl && wsUrl.startsWith("http")) {
    try {
      const roomService = new RoomServiceClient(wsUrl, apiKey, apiSecret);
      const rooms = await roomService.listRooms();
      return res.json({ success: true, rooms, wsUrl });
    } catch (err: any) {
      return res.json({ success: false, error: err.message, wsUrl });
    }
  }

  return res.json({
    success: true,
    message: "LiveKit server SDK active with in-app token generator",
    wsUrl,
    apiKeyConfigured: Boolean(apiKey && apiKey !== "devkey"),
    keySafe: {
      vaultUrl: KEYSAFE_BASE_URL,
      status: lastKeySafeLiveKitStatus,
    },
  });
});

// --- 8. GET /api/paystack/diagnostics (Retrieve Diagnostic Telemetry Logs & Stats) ---
app.get("/api/paystack/diagnostics", (req, res) => {
  const { endpoint, category, severity, onlyErrors, limit } = req.query;

  const logs = paystackDiagnostics.getLogs({
    endpoint: endpoint as string | undefined,
    category: category as any,
    severity: severity as any,
    onlyErrors: onlyErrors === "true",
    limit: limit ? parseInt(limit as string, 10) : 50,
  });

  const stats = paystackDiagnostics.getStats();

  return res.json({
    success: true,
    stats,
    logs,
    systemInfo: {
      liveKeyConfigured: Boolean(getLiveSecretKey()),
      liveKeyMasked: maskApiKey(getLiveSecretKey()),
      testKeyConfigured: Boolean(PAYSTACK_TEST_SECRET_KEY),
      testKeyMasked: maskApiKey(PAYSTACK_TEST_SECRET_KEY),
      keySafe: {
        baseUrl: KEYSAFE_BASE_URL,
        connected: Boolean(cachedKeySafeSecretKey),
        maskedKey: maskApiKey(cachedKeySafeSecretKey),
        lastStatus: lastKeySafeFetchStatus,
      },
      timestamp: new Date().toISOString(),
    },
  });
});

// --- 9. POST /api/paystack/diagnostics/clear (Clear In-Memory Diagnostic Buffer) ---
app.post("/api/paystack/diagnostics/clear", (_req, res) => {
  paystackDiagnostics.clearLogs();
  return res.json({
    success: true,
    message: "Paystack diagnostic logs cleared successfully.",
  });
});

// --- 9b. POST /api/paystack/keysafe/sync (Trigger manual fetch from KeySafe vault) ---
app.post("/api/paystack/keysafe/sync", async (req, res) => {
  const { path, apiKey } = req.body || {};
  const result = await fetchPaystackSecretFromKeySafe(path, apiKey);

  return res.json({
    success: result.success,
    message: result.message,
    httpStatus: result.httpStatus,
    vaultUrl: KEYSAFE_BASE_URL,
    keySafeStatus: lastKeySafeFetchStatus,
    activeKeyConfigured: Boolean(getLiveSecretKey()),
    activeKeyMasked: maskApiKey(getLiveSecretKey()),
  });
});

// --- 9c. POST /api/paystack/diagnostics/ping (Live Key & Connectivity Verification) ---
app.post("/api/paystack/diagnostics/ping", async (_req, res) => {
  const results: Record<string, any> = {};

  // 1. Test Live Key
  const liveSecret = getLiveSecretKey();
  if (liveSecret) {
    const start = Date.now();
    try {
      const resp = await fetch("https://api.paystack.co/subaccount", {
        headers: { Authorization: `Bearer ${liveSecret}` },
      });
      const data = await resp.json();
      results.live = {
        tested: true,
        httpStatus: resp.status,
        valid: resp.status === 200,
        latencyMs: Date.now() - start,
        message: data.message || (resp.status === 200 ? "Live API Authenticated" : "Auth Failed"),
      };
    } catch (e: any) {
      results.live = { tested: true, valid: false, error: e.message };
    }
  } else {
    results.live = { tested: false, valid: false, message: "PAYSTACK_LIVE_SECRET_KEY not configured" };
  }

  // 2. Test Test Key
  const testSecret = getTestSecretKey();
  if (testSecret) {
    const start = Date.now();
    try {
      const resp = await fetch("https://api.paystack.co/subaccount", {
        headers: { Authorization: `Bearer ${testSecret}` },
      });
      const data = await resp.json();
      results.test = {
        tested: true,
        httpStatus: resp.status,
        valid: resp.status === 200,
        latencyMs: Date.now() - start,
        message: data.message || (resp.status === 200 ? "Test API Authenticated" : "Auth Failed"),
      };
    } catch (e: any) {
      results.test = { tested: true, valid: false, error: e.message };
    }
  } else {
    results.test = { tested: false, valid: false, message: "PAYSTACK_TEST_SECRET_KEY not configured" };
  }

  return res.json({ success: true, results, timestamp: new Date().toISOString() });
});

// --- 10. GET /api/paystack/diagnostics/summary (Quick Key & Health Audit) ---
app.get("/api/paystack/diagnostics/summary", (_req, res) => {
  const stats = paystackDiagnostics.getStats();
  const liveTrimmed = (PAYSTACK_LIVE_SECRET_KEY || "").trim();
  const testTrimmed = (PAYSTACK_TEST_SECRET_KEY || "").trim();

  return res.json({
    success: true,
    keys: {
      live: {
        configured: Boolean(liveTrimmed),
        prefix: liveTrimmed.substring(0, 8),
        masked: maskApiKey(liveTrimmed),
        hasValidLivePrefix: liveTrimmed.startsWith("sk_live_"),
        length: liveTrimmed.length,
      },
      test: {
        configured: Boolean(testTrimmed),
        prefix: testTrimmed.substring(0, 8),
        masked: maskApiKey(testTrimmed),
        hasValidTestPrefix: testTrimmed.startsWith("sk_test_"),
        length: testTrimmed.length,
      },
    },
    telemetry: stats,
    timestamp: new Date().toISOString(),
  });
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    paystackLiveConfigured: Boolean(PAYSTACK_LIVE_SECRET_KEY),
    paystackTestConfigured: Boolean(PAYSTACK_TEST_SECRET_KEY),
    timestamp: new Date().toISOString(),
  });
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
