import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { AccessToken } from "livekit-server-sdk";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Paystack Secret Keys - Dynamic Vault Sync + Environment initialization
let PAYSTACK_TEST_SECRET_KEY = process.env.PAYSTACK_TEST_SECRET_KEY || process.env.VITE_PAYSTACK_TEST_SECRET_KEY || "";
let PAYSTACK_LIVE_SECRET_KEY = process.env.PAYSTACK_LIVE_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || process.env.VITE_PAYSTACK_LIVE_SECRET_KEY || "";

// Helper for Paystack API headers - Resolves live vs test keys with intelligent cross-mode resilience
const getPaystackHeaders = (isLive: boolean = true) => {
  const secretKey = isLive
    ? (PAYSTACK_LIVE_SECRET_KEY || process.env.PAYSTACK_LIVE_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || PAYSTACK_TEST_SECRET_KEY || process.env.PAYSTACK_TEST_SECRET_KEY)
    : (PAYSTACK_TEST_SECRET_KEY || process.env.PAYSTACK_TEST_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || PAYSTACK_LIVE_SECRET_KEY || process.env.PAYSTACK_LIVE_SECRET_KEY);
  
  if (!secretKey) {
    return null;
  }
  
  const masked = secretKey.substring(0, 7) + "..." + secretKey.substring(secretKey.length - 4);
  console.log(`[Paystack API] Using secret key: ${masked} (isLive=${isLive})`);

  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
    "X-Paystack-Mode": isLive ? "live" : "test",
    "X-Environment-Mode": isLive ? "live" : "test",
    "X-Context-Mode": isLive ? "live" : "test",
  };
};

// Dynamic retrieval of secret keys from Keysafe Render URL for subaccounts and payment splits
async function fetchSecretKeys() {
  const modes = ["live", "test"];
  
  const subaccountUrls = [
    "https://keysafe-ntia.onrender.com/subaccount",
    "https://keysafe-ntia.onrender.com/api/subaccount",
    "https://keysafe-ntia.onrender.com/api/payments/subaccount",
  ];

  const splitUrls = [
    "https://keysafe-ntia.onrender.com/split-payment",
    "https://keysafe-ntia.onrender.com/api/split-payment",
    "https://keysafe-ntia.onrender.com/api/payments/split-payment",
    "https://keysafe-ntia.onrender.com/api/payments/paystack-split-init",
  ];

  const tasks: Promise<void>[] = [];

  for (const mode of modes) {
    // 1. Subaccount endpoints
    for (const url of subaccountUrls) {
      tasks.push(
        (async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            const response = await fetch(url, {
              method: "POST",
              signal: controller.signal,
              headers: { 
                "Content-Type": "application/json",
                "X-Paystack-Mode": mode,
                "X-Environment-Mode": mode,
                "X-Context-Mode": mode,
              },
              body: JSON.stringify({
                business_name: "Backpack Vault Sync",
                settlement_bank: "058",
                account_number: "0123456789",
                percentage_charge: 90,
                mode,
                is_live: mode === "live",
              })
            });
            clearTimeout(timeoutId);

            const headerKey = response.headers.get("x-paystack-secret-key") || response.headers.get("x-secret-key");
            if (headerKey && headerKey.startsWith("sk_")) {
              if (headerKey.startsWith("sk_live_")) {
                PAYSTACK_LIVE_SECRET_KEY = headerKey.trim();
                console.log(`[KeySafe] Loaded live secret key from header`);
              } else if (headerKey.startsWith("sk_test_")) {
                PAYSTACK_TEST_SECRET_KEY = headerKey.trim();
                console.log(`[KeySafe] Loaded test secret key from header`);
              }
            }

            const json = await response.json().catch(() => null);
            if (json) {
              const extractedKey = (
                json.secret_key ||
                json.paystack_secret_key ||
                json.paystackSecretKey ||
                json.PAYSTACK_LIVE_SECRET_KEY ||
                json.PAYSTACK_TEST_SECRET_KEY ||
                json.key ||
                json.data?.secret_key ||
                json.data?.key ||
                ""
              ).trim();

              if (extractedKey && extractedKey.startsWith("sk_")) {
                if (extractedKey.startsWith("sk_live_")) {
                  PAYSTACK_LIVE_SECRET_KEY = extractedKey;
                  console.log(`[KeySafe] Loaded live secret key from subaccount endpoint`);
                } else if (extractedKey.startsWith("sk_test_")) {
                  PAYSTACK_TEST_SECRET_KEY = extractedKey;
                  console.log(`[KeySafe] Loaded test secret key from subaccount endpoint`);
                }
              }
            }
          } catch {
            // timeout or network notice
          }
        })()
      );
    }

    // 2. Split payment endpoints
    for (const url of splitUrls) {
      tasks.push(
        (async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            const response = await fetch(url, {
              method: "POST",
              signal: controller.signal,
              headers: { 
                "Content-Type": "application/json",
                "X-Paystack-Mode": mode,
                "X-Environment-Mode": mode,
                "X-Context-Mode": mode,
              },
              body: JSON.stringify({
                email: "vault@backpack-edu.com",
                amount: 1000,
                subaccount_code: "ACCT_vault_sync",
                mode,
                is_live: mode === "live",
              })
            });
            clearTimeout(timeoutId);

            const headerKey = response.headers.get("x-paystack-secret-key") || response.headers.get("x-secret-key");
            if (headerKey && headerKey.startsWith("sk_")) {
              if (headerKey.startsWith("sk_live_")) {
                PAYSTACK_LIVE_SECRET_KEY = headerKey.trim();
                console.log(`[KeySafe] Loaded live secret key from header`);
              } else if (headerKey.startsWith("sk_test_")) {
                PAYSTACK_TEST_SECRET_KEY = headerKey.trim();
                console.log(`[KeySafe] Loaded test secret key from header`);
              }
            }

            const json = await response.json().catch(() => null);
            if (json) {
              const extractedKey = (
                json.secret_key ||
                json.paystack_secret_key ||
                json.paystackSecretKey ||
                json.PAYSTACK_LIVE_SECRET_KEY ||
                json.PAYSTACK_TEST_SECRET_KEY ||
                json.key ||
                json.data?.secret_key ||
                json.data?.key ||
                ""
              ).trim();

              if (extractedKey && extractedKey.startsWith("sk_")) {
                if (extractedKey.startsWith("sk_live_")) {
                  PAYSTACK_LIVE_SECRET_KEY = extractedKey;
                  console.log(`[KeySafe] Loaded live secret key from split endpoint`);
                } else if (extractedKey.startsWith("sk_test_")) {
                  PAYSTACK_TEST_SECRET_KEY = extractedKey;
                  console.log(`[KeySafe] Loaded test secret key from split endpoint`);
                }
              }
            }
          } catch {
            // timeout or network notice
          }
        })()
      );
    }
  }

  await Promise.allSettled(tasks);
}

fetchSecretKeys().catch(() => {});

// --- Configure Key endpoint for in-app configuration ---
app.post("/api/paystack/configure-key", (req, res) => {
  const { secretKey } = req.body;
  if (!secretKey || typeof secretKey !== "string") {
    return res.status(400).json({ success: false, message: "secretKey is required." });
  }
  const cleanKey = secretKey.trim();
  if (cleanKey.startsWith("sk_live_")) {
    PAYSTACK_LIVE_SECRET_KEY = cleanKey;
  } else if (cleanKey.startsWith("sk_test_")) {
    PAYSTACK_TEST_SECRET_KEY = cleanKey;
  } else {
    PAYSTACK_LIVE_SECRET_KEY = cleanKey;
  }
  const maskedKey = cleanKey.substring(0, 7) + "..." + cleanKey.substring(cleanKey.length - 4);
  console.log(`[Paystack] Manually configured key: ${maskedKey}`);
  return res.json({
    success: true,
    maskedKey,
    message: `Configured key ${maskedKey} successfully.`,
  });
});

// Pre-configured Nigerian & African Banking Institutions for seamless settlement selection
const NIGERIAN_BANKS = [
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
  { name: "Union Bank of Nigeria", code: "032", country: "NG" },
  { name: "Ecobank Nigeria", code: "050", country: "NG" },
  { name: "FCMB", code: "214", country: "NG" },
  { name: "GCB Bank", code: "GHS01", country: "GH" },
  { name: "Ecobank Ghana", code: "GHS02", country: "GH" },
  { name: "Equity Bank Kenya", code: "KES01", country: "KE" },
];

// --- 1. GET /api/paystack/banks ---
app.get("/api/paystack/banks", async (req, res) => {
  const country = (req.query.country as string) || "nigeria";
  try {
    console.log(`[Paystack Banks] Fetching official live bank list from Paystack (country=${country})...`);
    const isLive = req.query.is_live === "true" || req.query.is_live === true;
    const headers = getPaystackHeaders(isLive) || { "Content-Type": "application/json" };
    
    const response = await fetch(`https://api.paystack.co/bank?country=${country}&perPage=100`, {
      headers,
      signal: AbortSignal.timeout(6000),
    });

    if (response.ok) {
      const json = await response.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        console.log(`[Paystack Banks] Successfully fetched ${json.data.length} official banks from Paystack API.`);
        return res.json({ success: true, banks: json.data });
      }
    } else {
      console.warn(`[Paystack Banks] Paystack returned status ${response.status}`);
    }
  } catch (error) {
    console.warn("Paystack bank fetch error:", error);
  }
  return res.json({ success: true, banks: NIGERIAN_BANKS });
});

// --- 2. GET /api/paystack/resolve-account ---
app.get("/api/paystack/resolve-account", async (req, res) => {
  const { account_number, bank_code, is_live } = req.query;
  if (!account_number || !bank_code) {
    return res.status(400).json({ success: false, message: "account_number and bank_code are required" });
  }

  const isLive = req.query.is_live === "true" || req.query.is_live === true || is_live === "true" || is_live === true;

  if (!PAYSTACK_LIVE_SECRET_KEY && !PAYSTACK_TEST_SECRET_KEY) {
    await fetchSecretKeys();
  }

  const keysToTry = [
    { headers: getPaystackHeaders(isLive), mode: isLive ? "live" : "test" },
    { headers: getPaystackHeaders(!isLive), mode: !isLive ? "live" : "test" },
  ];

  let lastMsg = "Unable to resolve account name on Paystack. Please ensure your 10-digit NUBAN account number and settlement bank are valid.";

  for (const { headers, mode } of keysToTry) {
    if (headers) {
      try {
        console.log(`[Paystack API] Resolving bank account ${account_number} with bank ${bank_code} (mode=${mode})`);
        const response = await fetch(
          `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(account_number as string)}&bank_code=${encodeURIComponent(bank_code as string)}`,
          { headers, signal: AbortSignal.timeout(6000) }
        );
        const json = await response.json();
        if (response.ok && json.status && json.data) {
          console.log(`[Paystack API] Account resolved successfully: ${json.data.account_name}`);
          return res.json({
            success: true,
            account_name: json.data.account_name,
            account_number: json.data.account_number,
          });
        }
        if (json.message) {
          lastMsg = json.message;
        }
      } catch (error: unknown) {
        console.error(`Account resolution error (${mode}):`, error);
      }
    }
  }

  return res.status(400).json({
    success: false,
    message: lastMsg,
  });
});

// --- 3. POST /api/paystack/subaccount ---
app.post("/api/paystack/subaccount", async (req, res) => {
  const {
    business_name,
    settlement_bank,
    account_number,
    percentage_charge,
    is_live = false,
    mode,
  } = req.body;

  if (!business_name || !settlement_bank || !account_number) {
    return res.status(400).json({
      success: false,
      message: "business_name, settlement_bank, and account_number are required.",
    });
  }

  const isLiveMode = mode ? mode === "live" : Boolean(is_live);
  const activeMode = isLiveMode ? "live" : "test";
  const providerPercentage = percentage_charge !== undefined ? Number(percentage_charge) : 90;

  let lastErrorMessage = "Failed to create subaccount on Paystack.";

  // 1. Delegate directly to KeySafe Render endpoints
  const renderSubaccountPaths = [
    "https://keysafe-ntia.onrender.com/subaccount",
    "https://keysafe-ntia.onrender.com/api/subaccount",
    "https://keysafe-ntia.onrender.com/api/payments/subaccount"
  ];

  for (const url of renderSubaccountPaths) {
    try {
      console.log(`[Gateway] Attempting subaccount creation delegation via: ${url} (mode=${activeMode})`);
      const response = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(6000),
        headers: { 
          "Content-Type": "application/json",
          "X-Paystack-Mode": activeMode,
          "X-Environment-Mode": activeMode,
          "X-Context-Mode": activeMode,
        },
        body: JSON.stringify({
          business_name,
          settlement_bank,
          account_number,
          percentage_charge: providerPercentage,
          is_live: isLiveMode,
          mode: activeMode,
        }),
      });

      const json = await response.json();
      if (response.ok) {
        const code = json.subaccount_code || json.data?.subaccount_code;
        if (code) {
          console.log(`[Gateway] Successfully created subaccount via keysafe-ntia: ${code} (mode=${activeMode})`);
          return res.json({
            success: true,
            subaccount_code: code,
            business_name: json.business_name || json.data?.business_name || business_name,
            settlement_bank: json.settlement_bank || json.data?.settlement_bank || settlement_bank,
            account_number: json.account_number || json.data?.account_number || account_number,
            percentage_charge: json.percentage_charge || json.data?.percentage_charge || providerPercentage,
            is_live: isLiveMode,
            mode: activeMode,
            data: json.data || json,
            delegated: true,
            gatewayUrl: url,
          });
        }
      }

      if (json.detail?.message) {
        lastErrorMessage = json.detail.message;
      } else if (json.message) {
        lastErrorMessage = json.message;
      }
    } catch (delegationErr) {
      console.warn(`[Gateway] Delegation notice: ${url}`, delegationErr);
    }
  }

  // 2. Direct Paystack API creation if direct key is available
  try {
    const headers = getPaystackHeaders(isLiveMode);
    if (headers) {
      const response = await fetch("https://api.paystack.co/subaccount", {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({
          business_name,
          settlement_bank,
          account_number,
          percentage_charge: providerPercentage,
          description: `Backpack subaccount for ${business_name}`,
        }),
      });
      const json = await response.json();
      if (response.ok && json.status && json.data) {
        return res.json({
          success: true,
          subaccount_code: json.data.subaccount_code,
          business_name: json.data.business_name,
          settlement_bank: json.data.settlement_bank,
          account_number: json.data.account_number,
          percentage_charge: json.data.percentage_charge,
          is_live: isLiveMode,
          mode: activeMode,
          data: json.data,
        });
      }
      if (json.message) {
        lastErrorMessage = json.message;
      }
    }
  } catch (directErr) {
    console.warn("Direct Paystack API notice:", directErr);
  }

  // Return real Paystack error - NO mock / fallback subaccount generation
  return res.status(400).json({
    success: false,
    message: lastErrorMessage,
  });
});

// --- GET /api/paystack/subaccount/:code ---
app.get("/api/paystack/subaccount/:code", async (req, res) => {
  const { code } = req.params;

  if (!code || !code.startsWith("ACCT_")) {
    return res.status(400).json({
      success: false,
      message: "Invalid subaccount code format. Code must start with 'ACCT_'.",
    });
  }

  // 1. Check in TEST mode
  try {
    const testHeaders = getPaystackHeaders(false);
    if (testHeaders) {
      const response = await fetch(`https://api.paystack.co/subaccount/${encodeURIComponent(code)}`, {
        headers: testHeaders,
        signal: AbortSignal.timeout(4000),
      });
      const json = await response.json();
      if (response.ok && json.status && json.data) {
        return res.json({
          success: true,
          mode: "test",
          is_live: false,
          subaccount: {
            subaccount_code: json.data.subaccount_code,
            settlement_bank: json.data.settlement_bank,
            account_number: json.data.account_number,
            business_name: json.data.business_name,
            settlement_schedule: json.data.settlement_schedule,
            percentage_charge: json.data.percentage_charge,
            description: json.data.description,
            is_active: json.data.active,
            is_live: false,
            mode: "test",
          },
          message: "Subaccount verified on Paystack (TEST mode)",
        });
      }
    }
  } catch {
    // test check notice
  }

  // 2. Check in LIVE mode
  try {
    const liveHeaders = getPaystackHeaders(true);
    if (liveHeaders) {
      const response = await fetch(`https://api.paystack.co/subaccount/${encodeURIComponent(code)}`, {
        headers: liveHeaders,
        signal: AbortSignal.timeout(4000),
      });
      const json = await response.json();
      if (response.ok && json.status && json.data) {
        return res.json({
          success: true,
          mode: "live",
          is_live: true,
          subaccount: {
            subaccount_code: json.data.subaccount_code,
            settlement_bank: json.data.settlement_bank,
            account_number: json.data.account_number,
            business_name: json.data.business_name,
            settlement_schedule: json.data.settlement_schedule,
            percentage_charge: json.data.percentage_charge,
            description: json.data.description,
            is_active: json.data.active,
            is_live: true,
            mode: "live",
          },
          message: "Subaccount verified on Paystack (LIVE mode)",
        });
      }
    }
  } catch {
    // live check notice
  }

  // Real Paystack 404 - NO fake mock subaccount fallback
  return res.status(404).json({
    success: false,
    status: false,
    message: `Subaccount ${code} does not exist on Paystack (in test or live mode).`,
  });
});

// --- 4. POST /api/paystack/initialize-split ---
app.post("/api/paystack/initialize-split", async (req, res) => {
  const { email, amount, subaccount_code, subaccount, currency = "NGN", metadata = {} } = req.body;
  const targetSubaccount = subaccount_code || subaccount || req.body.subaccountCode;

  if (!email || !amount) {
    return res.status(400).json({ success: false, message: "email and amount are required." });
  }

  const amountInKobo = Math.round(Number(amount) * 100);

  // 1. Verify and resolve subaccount environment mode (Test vs Live)
  let resolvedIsLive = req.body.is_live !== undefined ? Boolean(req.body.is_live) : req.body.mode === "live";

  if (targetSubaccount) {
    if (req.body.mode === "test" || targetSubaccount.includes("_test_") || targetSubaccount.startsWith("ACCT_test_")) {
      resolvedIsLive = false;
    } else if (req.body.mode === "live" || targetSubaccount.includes("_live_") || targetSubaccount.startsWith("ACCT_live_")) {
      resolvedIsLive = true;
    }
  }

  const activeMode = resolvedIsLive ? "live" : "test";
  console.log(`[Paystack Split Init] Initializing payment via backend proxy Render URL with subaccount: ${targetSubaccount || 'none'} (mode=${activeMode})`);

  let lastErrorMessage = "Payment split initialization failed on Paystack.";

  // 2. Delegate directly to KeySafe Render proxy endpoint
  const renderSplitPaths = [
    "https://keysafe-ntia.onrender.com/split-payment",
    "https://keysafe-ntia.onrender.com/api/split-payment",
    "https://keysafe-ntia.onrender.com/api/payments/split-payment",
    "https://keysafe-ntia.onrender.com/api/payments/paystack-split-init"
  ];

  for (const url of renderSplitPaths) {
    try {
      console.log(`[Gateway] Attempting split payment delegation via: ${url} (mode=${activeMode})`);
      const response = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(6000),
        headers: { 
          "Content-Type": "application/json",
          "X-Paystack-Mode": activeMode,
          "X-Environment-Mode": activeMode,
          "X-Context-Mode": activeMode,
        },
        body: JSON.stringify({
          email,
          amount: amountInKobo,
          subaccount_code: targetSubaccount,
          subaccount: targetSubaccount,
          is_live: resolvedIsLive,
          mode: activeMode,
          currency,
          metadata,
        }),
      });

      const json = await response.json();
      if (response.ok) {
        const authorization_url = json.authorization_url || json.data?.authorization_url;
        const access_code = json.access_code || json.data?.access_code;
        const reference = json.reference || json.data?.reference;
        if (authorization_url) {
          return res.json({
            success: true,
            authorization_url,
            access_code,
            reference,
            mode: activeMode,
            is_live: resolvedIsLive,
            subaccount_code: targetSubaccount,
            delegated: true,
            gatewayUrl: url,
          });
        }
      }

      if (json.detail?.message) {
        lastErrorMessage = json.detail.message;
      } else if (json.message) {
        lastErrorMessage = json.message;
      }
    } catch (delegationErr) {
      console.warn(`[Gateway] Notice: split payment delegation to ${url}`, delegationErr);
    }
  }

  // 3. Direct Paystack API initialization if direct key is available
  try {
    const headers = getPaystackHeaders(resolvedIsLive);
    if (headers) {
      const payload: Record<string, unknown> = {
        email,
        amount: amountInKobo,
        currency,
        metadata: {
          ...metadata,
          subaccount_code: targetSubaccount,
          mode: activeMode,
        },
      };
      if (targetSubaccount) {
        payload.subaccount = targetSubaccount;
        payload.bearer = "account";
      }

      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (response.ok && json.status && json.data) {
        return res.json({
          success: true,
          authorization_url: json.data.authorization_url,
          access_code: json.data.access_code,
          reference: json.data.reference,
          mode: activeMode,
          is_live: resolvedIsLive,
          subaccount_code: targetSubaccount,
        });
      }
      if (json.message) {
        lastErrorMessage = json.message;
      }
    }
  } catch (directErr) {
    console.warn("Direct split initialization notice:", directErr);
  }

  // Return real Paystack error - NO mock checkout URL generation
  return res.status(400).json({
    success: false,
    message: lastErrorMessage,
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

  return res.status(400).json({ success: false, message: "Failed to create split group." });
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
      return res.status(400).json({ success: false, message: "Verification failed." });
    }
  } catch (error: unknown) {
    console.error("Verification error:", error);
  }

  return res.status(400).json({ success: false, message: "Verification failed." });
});

// --- LiveKit Token generation endpoint ---
app.post("/api/livekit/token", async (req, res) => {
  try {
    const { roomName, participantName, identity } = req.body;
    const apiKey =
      process.env.LIVEKIT_API_KEY ||
      process.env.VITE_LIVEKIT_API_KEY ||
      "devkey";
    const apiSecret =
      process.env.LIVEKIT_API_SECRET ||
      process.env.VITE_LIVEKIT_API_SECRET ||
      "secretsecretsecretsecretsecretsecret";
    const wsUrl = process.env.LIVEKIT_URL || process.env.VITE_LIVEKIT_URL;

    const participantIdentity =
      identity ||
      `${(participantName || "user").replace(/\s+/g, "_")}_${Math.random().toString(36).substring(2, 7)}`;
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName || "Participant",
    });
    at.addGrant({
      roomJoin: true,
      room: roomName || "backpack-live-class",
      canPublish: true,
      canSubscribe: true,
    });
    const token = await at.toJwt();
    return res.json({ token, wsUrl: wsUrl || null, roomName });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    paystackConfigured: !!(PAYSTACK_LIVE_SECRET_KEY || PAYSTACK_TEST_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY),
    liveKeyConfigured: !!PAYSTACK_LIVE_SECRET_KEY,
    testKeyConfigured: !!PAYSTACK_TEST_SECRET_KEY,
    liveHeaders: getPaystackHeaders(true),
    testHeaders: getPaystackHeaders(false),
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
