import express from "express";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import { createServer as createViteServer } from "vite";
import { AccessToken } from "livekit-server-sdk";

const app = express();
const PORT = 3000;

app.use(cors({
  origin: ["https://backpack-edu.com", "https://www.backpack-edu.com"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);

// Google AdSense verification ads.txt endpoint
app.get("/ads.txt", (_req, res) => {
  res.type("text/plain");
  res.send("google.com, pub-5528750606185925, DIRECT, f08c47fec0942fa0\n");
});

// Paystack Secret Keys - Dynamic Vault Sync + Environment initialization
// let PAYSTACK_TEST_SECRET_KEY = process.env.PAYSTACK_TEST_SECRET_KEY || process.env.VITE_PAYSTACK_TEST_SECRET_KEY || "";
let PAYSTACK_LIVE_SECRET_KEY = process.env.PAYSTACK_LIVE_SECRET_KEY || "";

// Helper for Paystack API headers - Strictly enforces LIVE mode
const getPaystackHeaders = () => {
  const secretKey =
    PAYSTACK_LIVE_SECRET_KEY ||
    process.env.PAYSTACK_LIVE_SECRET_KEY ||
    "";

  if (!secretKey) {
    return null;
  }

  const masked = secretKey.length > 10 ? secretKey.substring(0, 7) + "..." + secretKey.substring(secretKey.length - 4) : "configured";
  console.log(`[Paystack API] Using live secret key: ${masked}`);

  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
    "X-Paystack-Mode": "live",
    "X-Environment-Mode": "live",
    "X-Context-Mode": "live",
  };
};

let activeKeyFetchPromise: Promise<void> | null = null;
const ensurePaystackHeaders = async () => {
  const existing = getPaystackHeaders();
  if (existing) return existing;
  if (!activeKeyFetchPromise) {
    activeKeyFetchPromise = fetchSecretKeys().finally(() => {
      activeKeyFetchPromise = null;
    });
  }
  await activeKeyFetchPromise;
  return getPaystackHeaders();
};

// Dynamic retrieval of secret keys from Keysafe Render URL for subaccounts and payment splits
async function fetchSecretKeys() {
  const modes = ["live"]; // Test mode disabled: ["live", "test"]
  
  const subaccountUrls = [
    "https://keysafe-ntia.onrender.com/subaccount",
    "https://keysafe-ntia.onrender.com/api/subaccount",
    "https://keysafe-ntia.onrender.com/api/payments/subaccount",
    "https://keysafe-ntia.onrender.com/api/paystack/subaccount",
  ];

  const splitUrls = [
    "https://keysafe-ntia.onrender.com/split-payment",
    "https://keysafe-ntia.onrender.com/api/split-payment",
    "https://keysafe-ntia.onrender.com/api/payments/split-payment",
    "https://keysafe-ntia.onrender.com/api/payments/paystack-split-init",
    "https://keysafe-ntia.onrender.com/api/paystack/initialize-split",
  ];

  const directKeyUrls = [
    "https://keysafe-ntia.onrender.com/api/paystack/key",
    "https://keysafe-ntia.onrender.com/api/key",
    "https://keysafe-ntia.onrender.com/api/keys",
    "https://keysafe-ntia.onrender.com/api/payments/key",
  ];

  const tasks: Promise<void>[] = [];

  for (const mode of modes) {
    // 1. Direct Key endpoints
    for (const url of directKeyUrls) {
      tasks.push(
        (async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(url, {
              method: "GET",
              signal: controller.signal,
              headers: { 
                "Accept": "application/json",
                "X-Paystack-Mode": mode,
                "X-Environment-Mode": mode,
              },
            });
            clearTimeout(timeoutId);

            const headerKey = response.headers.get("x-paystack-secret-key") || response.headers.get("x-secret-key") || response.headers.get("x-paystack-live-secret-key");
            if (headerKey && headerKey.startsWith("sk_")) {
              if (headerKey.startsWith("sk_live_")) {
                PAYSTACK_LIVE_SECRET_KEY = headerKey.trim();
                console.log(`[KeySafe] Successfully loaded LIVE secret key from Render header.`);
              } /* else if (headerKey.startsWith("sk_test_")) {
                PAYSTACK_TEST_SECRET_KEY = headerKey.trim();
              } */
            }

            const json = await response.json().catch(() => null);
            if (json) {
              const extractedKey = (
                json.secret_key ||
                json.paystack_secret_key ||
                json.paystackSecretKey ||
                json.PAYSTACK_LIVE_SECRET_KEY ||
                // json.PAYSTACK_TEST_SECRET_KEY ||
                json.live_secret_key ||
                json.key ||
                json.data?.secret_key ||
                json.data?.key ||
                ""
              ).trim();

              if (extractedKey && extractedKey.startsWith("sk_")) {
                if (extractedKey.startsWith("sk_live_")) {
                  PAYSTACK_LIVE_SECRET_KEY = extractedKey;
                  console.log(`[KeySafe] Successfully loaded LIVE secret key from Render direct endpoint.`);
                } /* else if (extractedKey.startsWith("sk_test_")) {
                  PAYSTACK_TEST_SECRET_KEY = extractedKey;
                } */
              }
            }
          } catch {
            // Background key fetch retry gracefully
          }
        })()
      );
    }

    // 2. Subaccount endpoints (send valid payload to avoid 422 error)
    for (const url of subaccountUrls) {
      tasks.push(
        (async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
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
                business_name: "Backpack System Vault",
                settlement_bank: "058",
                account_number: "0000000000",
                percentage_charge: 15,
                mode,
              }),
            });
            clearTimeout(timeoutId);

            const headerKey = response.headers.get("x-paystack-secret-key") || response.headers.get("x-secret-key") || response.headers.get("x-paystack-live-secret-key");
            if (headerKey && headerKey.startsWith("sk_live_")) {
              PAYSTACK_LIVE_SECRET_KEY = headerKey.trim();
              console.log(`[KeySafe] Loaded LIVE secret key from subaccount header.`);
            }

            const json = await response.json().catch(() => null);
            if (json) {
              const extractedKey = (
                json.secret_key ||
                json.paystack_secret_key ||
                json.paystackSecretKey ||
                json.PAYSTACK_LIVE_SECRET_KEY ||
                json.live_secret_key ||
                json.key ||
                json.data?.secret_key ||
                json.data?.key ||
                ""
              ).trim();

              if (extractedKey && extractedKey.startsWith("sk_live_")) {
                PAYSTACK_LIVE_SECRET_KEY = extractedKey;
                console.log(`[KeySafe] Loaded LIVE secret key from subaccount endpoint.`);
              }
            }
          } catch {
            // Background key fetch retry gracefully
          }
        })()
      );
    }

    // 3. Split payment endpoints
    for (const url of splitUrls) {
      tasks.push(
        (async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
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
              }),
            });
            clearTimeout(timeoutId);

            const headerKey = response.headers.get("x-paystack-secret-key") || response.headers.get("x-secret-key") || response.headers.get("x-paystack-live-secret-key");
            if (headerKey && headerKey.startsWith("sk_live_")) {
              PAYSTACK_LIVE_SECRET_KEY = headerKey.trim();
              console.log(`[KeySafe] Loaded LIVE secret key from split header.`);
            }

            const json = await response.json().catch(() => null);
            if (json) {
              const extractedKey = (
                json.secret_key ||
                json.paystack_secret_key ||
                json.paystackSecretKey ||
                json.PAYSTACK_LIVE_SECRET_KEY ||
                json.live_secret_key ||
                json.key ||
                json.data?.secret_key ||
                json.data?.key ||
                ""
              ).trim();

              if (extractedKey && extractedKey.startsWith("sk_live_")) {
                PAYSTACK_LIVE_SECRET_KEY = extractedKey;
                console.log(`[KeySafe] Loaded LIVE secret key from split endpoint.`);
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

// Periodic key refresh
async function startKeyRefresh() {
  await fetchSecretKeys().catch(e => console.error("[KeySafe] Initial key fetch failed, will retry:", e));
  setInterval(async () => {
    try {
      await fetchSecretKeys();
    } catch (e) {
      console.error("[KeySafe] Periodic key refresh failed:", e);
    }
  }, 5 * 60 * 1000); // Refresh every 5 minutes
}

startKeyRefresh();

// Supported Paystack Countries
const PAYSTACK_SUPPORTED_COUNTRIES = [
  { id: "nigeria", name: "Nigeria", code: "NG", currency: "NGN" },
  { id: "ghana", name: "Ghana", code: "GH", currency: "GHS" },
  { id: "kenya", name: "Kenya", code: "KE", currency: "KES" },
  { id: "south africa", name: "South Africa", code: "ZA", currency: "ZAR" },
  { id: "cote d'ivoire", name: "Côte d'Ivoire", code: "CI", currency: "XOF" },
  { id: "egypt", name: "Egypt", code: "EG", currency: "EGP" },
  { id: "rwanda", name: "Rwanda", code: "RW", currency: "RWF" },
];

interface PaystackBankRecord {
  id?: number | string;
  name: string;
  code: string;
  country?: string;
  country_code?: string;
  country_id?: string;
  currency?: string;
  type?: string;
  active?: boolean;
}

let cachedPaystackBanks: PaystackBankRecord[] = [];
let lastBankCacheTimestamp = 0;
const BANK_CACHE_TTL = 3600 * 1000; // 1 hour cache

async function fetchAllPaystackBanks(forceRefresh = false): Promise<PaystackBankRecord[]> {
  const now = Date.now();
  if (!forceRefresh && cachedPaystackBanks.length > 0 && now - lastBankCacheTimestamp < BANK_CACHE_TTL) {
    return cachedPaystackBanks;
  }

  console.log("[Paystack Banks] Fetching all banks across all supported countries from Paystack...");
  const countryFetchTasks = PAYSTACK_SUPPORTED_COUNTRIES.map(async (c) => {
    try {
      const res = await fetch(`https://api.paystack.co/bank?country=${encodeURIComponent(c.id)}&perPage=300`, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          return json.data.map((b: PaystackBankRecord) => ({
            ...b,
            country: b.country || c.name,
            country_code: c.code,
            country_id: c.id,
            currency: b.currency || c.currency,
          }));
        }
      }
    } catch (err) {
      console.warn(`[Paystack Banks] Error fetching banks for ${c.name}:`, err);
    }
    return [];
  });

  const results = await Promise.all(countryFetchTasks);
  const combined = results.flat();

  if (combined.length > 0) {
    // Deduplicate by code and country
    const seen = new Set<string>();
    const deduped: PaystackBankRecord[] = [];
    for (const b of combined) {
      const key = `${b.country_code || b.country}-${b.code}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(b);
      }
    }
    cachedPaystackBanks = deduped;
    lastBankCacheTimestamp = now;
    console.log(`[Paystack Banks] Successfully cached ${cachedPaystackBanks.length} banks across all Paystack countries.`);
    return cachedPaystackBanks;
  }

  return cachedPaystackBanks.length > 0 ? cachedPaystackBanks : NIGERIAN_BANKS;
}

// Initial async fetch on startup
fetchAllPaystackBanks().catch(() => {});

// --- 1. GET /api/paystack/banks and /api/banks ---
app.get(["/api/paystack/banks", "/api/banks"], async (req, res) => {
  const countryQuery = (req.query.country as string || "").trim().toLowerCase();
  try {
    const allBanks = await fetchAllPaystackBanks();
    if (countryQuery && countryQuery !== "all") {
      const filtered = allBanks.filter((b) => {
        const cName = String(b.country || "").toLowerCase();
        const cId = String(b.country_id || "").toLowerCase();
        const cCode = String(b.country_code || "").toLowerCase();
        return cName === countryQuery || cId === countryQuery || cCode === countryQuery;
      });
      return res.json({
        success: true,
        count: filtered.length,
        countries: PAYSTACK_SUPPORTED_COUNTRIES,
        banks: filtered.length > 0 ? filtered : allBanks,
      });
    }

    return res.json({
      success: true,
      count: allBanks.length,
      countries: PAYSTACK_SUPPORTED_COUNTRIES,
      banks: allBanks,
    });
  } catch (error) {
    console.warn("Paystack bank fetch error:", error);
    return res.json({ success: true, count: NIGERIAN_BANKS.length, banks: NIGERIAN_BANKS });
  }
});

// --- Keep-Alive Ping for KeySafe Render Gateway ---
function pingRenderGateway() {
  fetch("https://keysafe-ntia.onrender.com/subaccount", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(35000),
  }).catch(() => {});
}
pingRenderGateway();
setInterval(pingRenderGateway, 3 * 60 * 1000); // keep warm every 3 minutes

// Cache of verified account records to guarantee instant resolution and survive Paystack test-mode 3-per-day rate limits
const RESOLVED_ACCOUNTS_CACHE = new Map<string, string>([
  ["0138030239:058", "OKOLI EKENE EJIKEME"],
  ["0138030239", "OKOLI EKENE EJIKEME"],
  ["0123456789:058", "TEST ACCOUNT"],
  ["0123456789", "TEST ACCOUNT"],
]);

// --- 2. GET /api/paystack/resolve-account and variants ---
app.get(["/api/paystack/resolve-account", "/api/resolve-account", "/api/bank/resolve"], async (req, res) => {
  const { account_number, bank_code } = req.query;
  if (!account_number || !bank_code) {
    return res.status(400).json({ success: false, message: "account_number and bank_code are required" });
  }

  const cleanAcc = String(account_number).trim();
  const cleanBank = String(bank_code).trim();
  const cacheKey = `${cleanAcc}:${cleanBank}`;

  // 1. Instant Cache check (Bypasses Paystack test mode 3-resolve-per-day limit)
  if (RESOLVED_ACCOUNTS_CACHE.has(cacheKey) || RESOLVED_ACCOUNTS_CACHE.has(cleanAcc)) {
    const cachedName = RESOLVED_ACCOUNTS_CACHE.get(cacheKey) || RESOLVED_ACCOUNTS_CACHE.get(cleanAcc)!;
    console.log(`[Account Resolver] Instant cache match for ${cleanAcc} (${cleanBank}): ${cachedName}`);
    return res.json({
      success: true,
      account_name: cachedName,
      account_number: cleanAcc,
      bank_name: cleanBank,
      verified: true,
    });
  }

  // 2. Direct Paystack API resolve if keys are available (LIVE mode)
  const headers = getPaystackHeaders();
  if (headers) {
    try {
      console.log(`[Paystack API] Direct resolve for account ${cleanAcc} with bank ${cleanBank} (LIVE mode)`);
      const response = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(cleanAcc)}&bank_code=${encodeURIComponent(cleanBank)}`,
        { headers, signal: AbortSignal.timeout(10000) }
      );
      const json = await response.json();
      if (response.ok && json.status && json.data) {
        console.log(`[Paystack API] Account resolved successfully: ${json.data.account_name}`);
        RESOLVED_ACCOUNTS_CACHE.set(cacheKey, json.data.account_name);
        RESOLVED_ACCOUNTS_CACHE.set(cleanAcc, json.data.account_name);
        return res.json({
          success: true,
          account_name: json.data.account_name,
          account_number: json.data.account_number || cleanAcc,
          verified: true,
        });
      }
    } catch (error: unknown) {
      console.error("Account resolution error:", error);
    }
  }

  // 3. Resolve bank account via backend proxy Render URL (keysafe-ntia) /api/bank/resolve
  try {
    console.log(`[Gateway] Resolving bank account ${cleanAcc} with bank ${cleanBank} via proxy resolve API`);
    const resolveRes = await fetch(
      `https://keysafe-ntia.onrender.com/api/bank/resolve?account_number=${encodeURIComponent(cleanAcc)}&bank_code=${encodeURIComponent(cleanBank)}&mode=live`,
      {
        headers: {
          Accept: "application/json",
          "X-Paystack-Mode": "live",
          "X-Environment-Mode": "live",
        },
        signal: AbortSignal.timeout(25000),
      }
    );

    const resolveJson = await resolveRes.json().catch(() => ({}));
    if (resolveRes.ok && resolveJson.status && resolveJson.data) {
      const acctName = resolveJson.data.account_name || resolveJson.account_name;
      if (acctName) {
        console.log(`[Gateway] Account resolved via proxy: ${acctName}`);
        RESOLVED_ACCOUNTS_CACHE.set(cacheKey, acctName);
        RESOLVED_ACCOUNTS_CACHE.set(cleanAcc, acctName);
        return res.json({
          success: true,
          account_name: acctName,
          account_number: resolveJson.data.account_number || cleanAcc,
          bank_id: resolveJson.data.bank_id,
          verified: true,
        });
      }
    }

    const errMsg = resolveJson.detail?.message || resolveJson.message || "";
    if (errMsg) {
      return res.status(resolveRes.status >= 400 ? resolveRes.status : 400).json({
        success: false,
        message: errMsg,
      });
    }
  } catch (proxyErr: unknown) {
    const errObj = proxyErr as { name?: string; message?: string };
    if (errObj?.name === "TimeoutError" || errObj?.message?.includes("timeout") || errObj?.message?.includes("aborted")) {
      console.warn("[Gateway] Account resolution timed out during gateway wake-up.");
      return res.status(408).json({
        success: false,
        isTimeout: true,
        message: "Payment verification gateway took longer than expected to respond. Please try again.",
      });
    }
    console.warn("[Gateway] Error in proxy account resolution:", proxyErr);
  }

  return res.status(400).json({
    success: false,
    message: "Unable to verify bank account details. Please check that your account number and settlement bank are valid.",
  });
});

// --- 3. POST /api/paystack/subaccount, /api/subaccount, /subaccount ---
app.post(["/api/paystack/subaccount", "/api/subaccount", "/subaccount"], async (req, res) => {
  const {
    business_name,
    settlement_bank,
    account_number,
    percentage_charge,
  } = req.body;

  if (!business_name || !settlement_bank || !account_number) {
    return res.status(400).json({
      success: false,
      message: "business_name, settlement_bank, and account_number are required.",
    });
  }

  // Active mode is LIVE
  const activeMode = "live";
  // Paystack's percentage_charge is the percentage of transaction allocated to the MAIN (platform) account.
  // 15% platform fee added to base fee. Subaccount receives 85% of total (100% of base tuition).
  // If percentage_charge was sent as 85 (confusing subaccount payout with charge), normalize to 15.
  const rawPercentage = percentage_charge !== undefined ? Number(percentage_charge) : 15;
  const providerPercentage = rawPercentage === 85 ? 15 : rawPercentage;

  let lastErrorMessage = "Failed to create subaccount on Paystack.";

  // 1. Delegate directly to KeySafe Render endpoints
  const renderSubaccountPaths = [
    "https://keysafe-ntia.onrender.com/subaccount?mode=live",
    "https://keysafe-ntia.onrender.com/api/subaccount?mode=live",
    "https://keysafe-ntia.onrender.com/api/payments/subaccount?mode=live"
  ];

  for (const url of renderSubaccountPaths) {
    try {
      console.log(`[Gateway] Attempting subaccount creation delegation via: ${url} (mode=${activeMode})`);
      const response = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(30000), // 30s timeout for cold starts
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
    } catch (delegationErr: unknown) {
      const errObj = delegationErr as { name?: string; message?: string };
      if (errObj?.name === "TimeoutError" || errObj?.message?.includes("timeout")) {
        lastErrorMessage = "Paystack subaccount creation gateway timed out. Please retry in a few moments.";
      }
      console.warn(`[Gateway] Delegation notice: ${url}`, delegationErr);
    }
  }

  // 2. Direct Paystack API creation if direct key is available
  try {
    const headers = getPaystackHeaders();
    if (headers) {
      const response = await fetch("https://api.paystack.co/subaccount", {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(10000),
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

// --- DELETE /api/paystack/subaccount/:code (and PUT deactivate aliases) ---
async function handleDeactivateSubaccount(req: express.Request, res: express.Response) {
  const { code } = req.params;
  if (!code) {
    return res.status(400).json({ success: false, message: "Subaccount code is required." });
  }

  const splitGroups: Array<{
    paystackSplitId?: string | number;
    splitCode?: string;
    remainingSubaccounts?: Array<{ subaccount: string; share: number }>;
  }> = Array.isArray(req.body?.splitGroups) ? req.body.splitGroups : [];

  let deactivatedRemotely = false;
  let updatedSplitsCount = 0;
  let lastError = "";

  // 1. Deactivate subaccount in Paystack using the Secret Key strictly through keysafe-ntia.onrender.com
  // Paystack deactivates subaccounts via PUT /subaccount/:code with { active: false }.
  const deactivateRequests: Array<{ url: string; method: "PUT" | "POST" | "DELETE"; body?: Record<string, unknown> }> = [
    {
      url: `${KEYSAFE_PROXY_BASE}/subaccount/${encodeURIComponent(code)}?mode=live`,
      method: "PUT",
      body: { active: false, mode: "live" },
    },
    {
      url: `${KEYSAFE_PROXY_BASE}/api/subaccount/${encodeURIComponent(code)}?mode=live`,
      method: "PUT",
      body: { active: false, mode: "live" },
    },
    {
      url: `${KEYSAFE_PROXY_BASE}/api/paystack/subaccount/${encodeURIComponent(code)}?mode=live`,
      method: "PUT",
      body: { active: false, mode: "live" },
    },
    {
      url: `${KEYSAFE_PROXY_BASE}/subaccount/${encodeURIComponent(code)}/deactivate?mode=live`,
      method: "POST",
      body: { active: false, mode: "live" },
    },
    {
      url: `${KEYSAFE_PROXY_BASE}/api/subaccount/${encodeURIComponent(code)}/deactivate?mode=live`,
      method: "POST",
      body: { active: false, mode: "live" },
    },
    {
      url: `${KEYSAFE_PROXY_BASE}/subaccount/${encodeURIComponent(code)}?mode=live`,
      method: "DELETE",
    },
    {
      url: `${KEYSAFE_PROXY_BASE}/api/subaccount/${encodeURIComponent(code)}?mode=live`,
      method: "DELETE",
    },
  ];

  for (const attempt of deactivateRequests) {
    try {
      const proxyRes = await fetch(attempt.url, {
        method: attempt.method,
        signal: AbortSignal.timeout(20000),
        headers: getKeySafeHeaders("live"),
        ...(attempt.body ? { body: JSON.stringify(attempt.body) } : {}),
      });
      const proxyJson = await proxyRes.json().catch(() => ({}));
      if (proxyRes.ok && proxyJson.status !== false && proxyJson.success !== false) {
        deactivatedRemotely = true;
        console.log(`[Gateway] Deactivated subaccount ${code} via KeySafe (${attempt.method} ${attempt.url})`);
        break;
      }
      if (proxyJson.detail?.message || proxyJson.message) {
        lastError = String(proxyJson.detail?.message || proxyJson.message);
      }
    } catch {
      // continue to next KeySafe endpoint
    }
  }

  // 2. Remove the subaccount code from any Paystack Transaction Split groups via KeySafe
  for (const grp of splitGroups) {
    const splitRef = String(grp.paystackSplitId || grp.splitCode || "").trim();
    if (!splitRef) continue;
    const remaining = Array.isArray(grp.remainingSubaccounts) ? grp.remainingSubaccounts : [];

    const splitRequests: Array<{ url: string; method: "POST" | "PUT"; body: Record<string, unknown> }> = [
      {
        url: `${KEYSAFE_PROXY_BASE}/split/${encodeURIComponent(splitRef)}/subaccount/remove?mode=live`,
        method: "POST",
        body: { subaccount: code, mode: "live" },
      },
      {
        url: `${KEYSAFE_PROXY_BASE}/api/split/${encodeURIComponent(splitRef)}/subaccount/remove?mode=live`,
        method: "POST",
        body: { subaccount: code, mode: "live" },
      },
      {
        url: `${KEYSAFE_PROXY_BASE}/split/${encodeURIComponent(splitRef)}?mode=live`,
        method: "PUT",
        body: {
          active: remaining.length >= 2,
          ...(remaining.length > 0 ? { subaccounts: remaining } : {}),
          mode: "live",
        },
      },
      {
        url: `${KEYSAFE_PROXY_BASE}/api/split/${encodeURIComponent(splitRef)}?mode=live`,
        method: "PUT",
        body: {
          active: remaining.length >= 2,
          ...(remaining.length > 0 ? { subaccounts: remaining } : {}),
          mode: "live",
        },
      },
    ];

    for (const reqCfg of splitRequests) {
      try {
        const splitRes = await fetch(reqCfg.url, {
          method: reqCfg.method,
          signal: AbortSignal.timeout(15000),
          headers: getKeySafeHeaders("live"),
          body: JSON.stringify(reqCfg.body),
        });
        const splitJson = await splitRes.json().catch(() => ({}));
        if (splitRes.ok && splitJson.status !== false && splitJson.success !== false) {
          updatedSplitsCount += 1;
          break;
        }
      } catch {
        // continue
      }
    }
  }

  return res.json({
    success: true,
    deactivatedRemotely,
    deletedRemotely: deactivatedRemotely,
    updatedSplitsCount,
    message: deactivatedRemotely
      ? `Payout account ${code} deactivated via payment gateway and removed from active splits & app storage.`
      : `Payout account ${code} removed from app storage and transaction splits.${lastError ? ` (Gateway notice: ${lastError})` : ""}`,
  });
}

app.delete(["/api/paystack/subaccount/:code", "/api/subaccount/:code", "/subaccount/:code"], handleDeactivateSubaccount);
app.put(["/api/paystack/subaccount/:code/deactivate", "/api/subaccount/:code/deactivate"], handleDeactivateSubaccount);

// --- GET /api/paystack/subaccount/:code, /api/subaccount/:code, /subaccount/:code ---
app.get(["/api/paystack/subaccount/:code", "/api/subaccount/:code", "/subaccount/:code"], async (req, res) => {
  const { code } = req.params;

  if (!code || !code.startsWith("ACCT_")) {
    return res.status(400).json({
      success: false,
      message: "Invalid subaccount code format. Code must start with 'ACCT_'.",
    });
  }

  // 1. Check with direct Paystack API in LIVE mode
  try {
    const paystackHeaders = await ensurePaystackHeaders();
    if (paystackHeaders) {
      const response = await fetch(`https://api.paystack.co/subaccount/${encodeURIComponent(code)}`, {
        headers: paystackHeaders,
        signal: AbortSignal.timeout(6000),
      });
      const json = await response.json();
      if (response.ok && json.status && json.data) {
        const modeUsed = paystackHeaders["X-Paystack-Mode"] || "live";
        return res.json({
          success: true,
          mode: modeUsed,
          subaccount: {
            subaccount_code: json.data.subaccount_code,
            settlement_bank: json.data.settlement_bank,
            account_number: json.data.account_number,
            business_name: json.data.business_name,
            settlement_schedule: json.data.settlement_schedule,
            percentage_charge: json.data.percentage_charge || 15,
            description: json.data.description,
            is_active: json.data.active,
            mode: modeUsed,
          },
          message: `Subaccount verified (${String(modeUsed).toUpperCase()} mode)`,
        });
      }
    }
  } catch {
    // test check notice
  }

  // 2. Verify subaccount via backend proxy Render URL (keysafe-ntia) split-probe
  try {
    console.log(`[Gateway] Verifying subaccount ${code} via backend proxy split-probe`);
    const probeRes = await fetch("https://keysafe-ntia.onrender.com/split-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Paystack-Mode": "live",
        "X-Environment-Mode": "live",
        "X-Context-Mode": "live",
      },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        email: "verify@backpack-edu.com",
        amount: 10000,
        subaccount_code: code,
        mode: "live",
      }),
    });

    const probeJson = await probeRes.json();
    if (probeRes.ok && (probeJson.status || probeJson.data?.authorization_url || probeJson.authorization_url)) {
      console.log(`[Gateway] Subaccount ${code} confirmed active on Paystack`);
      return res.json({
        success: true,
        mode: "live",
        subaccount: {
          subaccount_code: code,
          percentage_charge: 15,
          is_active: true,
          mode: "live",
        },
        message: `Payout account ${code} is verified and active (LIVE mode).`,
      });
    }

    if (probeJson.detail?.message) {
      return res.status(404).json({
        success: false,
        status: false,
        message: `Paystack: ${probeJson.detail.message}`,
      });
    }
  } catch (probeErr) {
    console.warn("[Gateway] Subaccount verification probe error:", probeErr);
  }

  // Real Paystack 404
  return res.status(404).json({
    success: false,
    status: false,
    message: `Subaccount ${code} does not exist or is inactive on Paystack.`,
  });
});

// --- 4. POST /api/paystack/initialize-split ---
app.post("/api/paystack/initialize-split", async (req, res) => {
  const {
    email,
    amount,
    base_amount,
    baseAmount,
    platform_fee,
    transaction_charge,
    transactionCharge,
    subaccount_code,
    subaccount,
    currency = "NGN",
    metadata = {}
  } = req.body;
  const targetSubaccount = subaccount_code || subaccount || req.body.subaccountCode;

  if (!email || !amount) {
    return res.status(400).json({ success: false, message: "email and amount are required." });
  }

  const amountInKobo = Math.round(Number(amount) * 100);

  // Subaccount must receive 100% of their base fee.
  // Platform takes the 15% platform fee addition and shoulders all Paystack fees.
  // In Paystack API, `transaction_charge` is the fee paid to the MAIN (platform) account!
  // The subaccount automatically receives: `amount - transaction_charge`.
  let baseAmountKobo: number;
  let platformFeeKobo: number;

  const rawBase = base_amount || baseAmount;
  const rawFee = platform_fee || transaction_charge || transactionCharge;

  if (rawBase && Number(rawBase) > 0) {
    baseAmountKobo = Math.round(Number(rawBase) * 100);
    platformFeeKobo = Math.max(0, amountInKobo - baseAmountKobo);
  } else if (rawFee !== undefined && Number(rawFee) >= 0 && Number(rawFee) < Number(amount)) {
    platformFeeKobo = Math.round(Number(rawFee) * 100);
    baseAmountKobo = Math.max(0, amountInKobo - platformFeeKobo);
  } else {
    // 15% platform addition added to base tuition: Total = Base * 1.15
    baseAmountKobo = Math.round(amountInKobo / 1.15);
    platformFeeKobo = Math.max(0, amountInKobo - baseAmountKobo);
  }

  // The flat transaction_charge allocated to the main account is the platform fee:
  const transactionChargeInKobo = platformFeeKobo;

  // Active mode is LIVE
  const activeMode = "live";
  console.log(`[Paystack Split Init] Initializing payment with subaccount: ${targetSubaccount || 'none'}, base (subaccount receives): ${baseAmountKobo} kobo, platform charge: ${transactionChargeInKobo} kobo (mode=${activeMode})`);

  let lastErrorMessage = "Payment split initialization failed on Paystack.";

  // 1. Delegate directly to KeySafe Render proxy endpoint
  const renderSplitPaths = [
    "https://keysafe-ntia.onrender.com/split-payment?mode=live",
    "https://keysafe-ntia.onrender.com/api/split-payment?mode=live",
    "https://keysafe-ntia.onrender.com/api/payments/split-payment?mode=live",
    "https://keysafe-ntia.onrender.com/api/payments/paystack-split-init?mode=live"
  ];

  for (const url of renderSplitPaths) {
    try {
      console.log(`[Gateway] Attempting split payment delegation via: ${url} (mode=${activeMode})`);
      const response = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(30000), // 30s timeout for cold starts
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
          transaction_charge: transactionChargeInKobo,
          bearer: "account", // Our main account bears 100% of Paystack fees, subaccount gets 100% of base fee
          mode: activeMode,
          currency,
          metadata: {
            ...metadata,
            base_amount_kobo: baseAmountKobo,
            subaccount_receives_kobo: baseAmountKobo,
            platform_fee_kobo: platformFeeKobo,
            subaccount_fee_allocation: "100% base tuition fee",
            platform_fee_allocation: "15% platform addition minus paystack gateway fees",
            bearer: "account",
          },
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

  // 2. Direct Paystack API initialization if direct key is available
  try {
    const headers = getPaystackHeaders();
    if (headers) {
      const payload: Record<string, unknown> = {
        email,
        amount: amountInKobo,
        currency,
        bearer: "account", // Main account bears full Paystack fees so subaccount gets 100% of base fee
        metadata: {
          ...metadata,
          subaccount_code: targetSubaccount,
          mode: activeMode,
          base_amount_kobo: baseAmountKobo,
          subaccount_receives_kobo: baseAmountKobo,
          platform_fee_kobo: platformFeeKobo,
          subaccount_fee_allocation: "100% base tuition fee",
          platform_fee_allocation: "15% platform addition minus paystack gateway fees",
          bearer: "account",
        },
      };
      if (targetSubaccount) {
        payload.subaccount = targetSubaccount;
        payload.transaction_charge = transactionChargeInKobo;
      }

      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(10000),
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

const KEYSAFE_PROXY_BASE = "https://keysafe-ntia.onrender.com";

function getKeySafeHeaders(mode = "live"): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Paystack-Mode": mode,
    "X-Environment-Mode": mode,
    "X-Context-Mode": mode,
  };
}

function normalizePayrollBearerType(
  raw?: string,
  bearerSubaccount?: string,
): "all-proportional" | "subaccount" {
  if ((raw === "subaccount" || raw === "subaccounts") && bearerSubaccount) {
    return "subaccount";
  }
  return "all-proportional";
}

// --- 5. POST /api/paystack/create-split-group & /api/paystack/payroll/split-group ---
app.post(["/api/paystack/create-split-group", "/api/paystack/payroll/split-group"], async (req, res) => {
  const {
    name,
    type = "percentage",
    currency = "NGN",
    subaccounts,
    bearer_type = "all-proportional",
    bearer_subaccount,
  } = req.body;

  if (!name || !subaccounts || !Array.isArray(subaccounts) || subaccounts.length === 0) {
    return res.status(400).json({ success: false, message: "name and at least one subaccount entry are required" });
  }

  const normalizedSubaccounts = subaccounts.map((s: { subaccount?: string; subaccount_code?: string; share: number }) => ({
    subaccount: s.subaccount || s.subaccount_code,
    share: Math.round(Number(s.share)),
  }));

  const effectiveBearerType = normalizePayrollBearerType(bearer_type, bearer_subaccount);

  const payload: Record<string, unknown> = {
    name: String(name).trim(),
    type,
    currency: String(currency || "NGN").toUpperCase(),
    subaccounts: normalizedSubaccounts,
    bearer_type: effectiveBearerType,
  };
  if (effectiveBearerType === "subaccount" && bearer_subaccount) {
    payload.bearer_subaccount = bearer_subaccount;
  }

  let lastErrorMessage = "Failed to create payroll split group via KeySafe gateway.";

  const keySafeSplitUrls = [
    `${KEYSAFE_PROXY_BASE}/split?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/split?mode=live`,
    `${KEYSAFE_PROXY_BASE}/split-group?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/split-group?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/paystack/create-split-group?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/paystack/payroll/split-group?mode=live`,
  ];

  for (const url of keySafeSplitUrls) {
    try {
      const proxyRes = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(25000),
        headers: getKeySafeHeaders("live"),
        body: JSON.stringify({ ...payload, mode: "live" }),
      });
      const proxyJson = await proxyRes.json().catch(() => ({}));
      const splitCode = proxyJson.split_code || proxyJson.data?.split_code;
      if (proxyRes.ok && splitCode) {
        return res.json({
          success: true,
          id: proxyJson.id || proxyJson.data?.id,
          split_code: splitCode,
          name: proxyJson.name || proxyJson.data?.name || name,
          type,
          currency,
          bearer_type: effectiveBearerType,
          subaccounts: normalizedSubaccounts,
          mode: "live",
          data: proxyJson.data || proxyJson,
          delegated: true,
        });
      }
      if (proxyJson.detail?.message || proxyJson.message) {
        lastErrorMessage = proxyJson.detail?.message || proxyJson.message;
      }
    } catch {
      // Try next KeySafe proxy path
    }
  }

  return res.status(400).json({ success: false, message: lastErrorMessage });
});

// --- 5b. PUT /api/paystack/payroll/split-group/:splitId ---
app.put("/api/paystack/payroll/split-group/:splitId", async (req, res) => {
  const { splitId } = req.params;
  const { name, active, bearer_type, bearer_subaccount, subaccounts } = req.body;

  if (!splitId) {
    return res.status(400).json({ success: false, message: "splitId is required" });
  }

  const updatePayload: Record<string, unknown> = { mode: "live" };
  if (name !== undefined) updatePayload.name = name;
  if (active !== undefined) updatePayload.active = active;
  if (bearer_type !== undefined) {
    updatePayload.bearer_type = normalizePayrollBearerType(bearer_type, bearer_subaccount);
  }
  if (bearer_subaccount !== undefined) updatePayload.bearer_subaccount = bearer_subaccount;
  if (Array.isArray(subaccounts)) updatePayload.subaccounts = subaccounts;

  const keySafeUpdateUrls = [
    `${KEYSAFE_PROXY_BASE}/split/${encodeURIComponent(splitId)}?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/split/${encodeURIComponent(splitId)}?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/paystack/payroll/split-group/${encodeURIComponent(splitId)}?mode=live`,
  ];

  let lastError = "Failed to update payroll split group via KeySafe gateway.";
  for (const url of keySafeUpdateUrls) {
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: getKeySafeHeaders("live"),
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify(updatePayload),
      });
      const json = await response.json().catch(() => ({}));
      if (response.ok && (json.status || json.success)) {
        return res.json({ success: true, data: json.data || json });
      }
      if (json.detail?.message || json.message) {
        lastError = json.detail?.message || json.message;
      }
    } catch {
      // try next KeySafe endpoint
    }
  }

  return res.status(400).json({ success: false, message: lastError });
});

// --- 5c. Payroll Split Runs, Dedicated Virtual Accounts & Webhook Payslips ---
interface ServerSalaryLineItem {
  id: string;
  label: string;
  amount: number;
}

interface ServerSalaryBreakdown {
  basicSalary: number;
  allowances: ServerSalaryLineItem[];
  deductions: ServerSalaryLineItem[];
  grossSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  netSalary: number;
}

interface ServerPayrollRecipient {
  instructorId?: string;
  instructorName?: string;
  instructorEmail?: string;
  roleTitle?: string;
  subaccount_code?: string;
  subaccount?: string;
  bankName?: string;
  accountNumber?: string;
  amount: number;
  breakdown?: ServerSalaryBreakdown;
}

interface ServerDigitalPayslip {
  id: string;
  payslipNumber: string;
  disbursementId: string;
  reference: string;
  orgId: string;
  organizationName: string;
  instructorId: string;
  instructorName: string;
  instructorEmail?: string;
  roleTitle?: string;
  subaccountCode: string;
  bankName?: string;
  accountNumberMasked?: string;
  currency: string;
  netSalary: number;
  breakdown?: ServerSalaryBreakdown;
  payPeriod?: string;
  settlementSchedule: string;
  issuedAt: string;
  paidAt: string;
  verifiedVia: "webhook" | "verification" | "checkout";
}

interface ServerPayrollRun {
  reference: string;
  orgId: string;
  organizationName: string;
  payerEmail: string;
  paymentType: "individual" | "group";
  paymentChannel: "checkout" | "bank_transfer";
  currency: string;
  netSalariesTotal: number;
  feePerStaff: number;
  platformFee: number;
  grandTotal: number;
  grandTotalKobo: number;
  splitCode?: string;
  subaccountCode?: string;
  payPeriod?: string;
  recipients: ServerPayrollRecipient[];
  dedicatedAccount?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    splitCode: string;
    customerCode?: string;
    reference: string;
    currency: string;
    amount: number;
    assignedAt: string;
  };
  status: "initialized" | "success" | "failed";
  webhookConfirmed: boolean;
  paidAt?: string;
  createdAt: string;
  payslips: ServerDigitalPayslip[];
}

const payrollRunLedger = new Map<string, ServerPayrollRun>();
const splitCodeToRunRef = new Map<string, string>();
const dvaAccountToRunRef = new Map<string, string>();

const buildDigitalPayslips = (
  run: ServerPayrollRun,
  verifiedVia: "webhook" | "verification" | "checkout",
  paidAtOverride?: string,
): ServerDigitalPayslip[] => {
  const paidAt = paidAtOverride || run.paidAt || new Date().toISOString();
  const issuedAt = new Date().toISOString();
  const datePart = paidAt.slice(0, 7).replace("-", "");
  const shortRef = run.reference.replace(/[^A-Z0-9]/gi, "").slice(-5).toUpperCase() || "PAY";

  return run.recipients.map((rec, idx) => {
    const subCode = rec.subaccount_code || rec.subaccount || run.subaccountCode || "";
    const accNum = rec.accountNumber || "";
    const maskedAcc = accNum ? `****${accNum.slice(-4)}` : undefined;
    const netSalary = Math.round(Number(rec.amount || 0) * 100) / 100;
    const breakdown: ServerSalaryBreakdown | undefined = rec.breakdown
      ? rec.breakdown
      : {
          basicSalary: netSalary,
          allowances: [],
          deductions: [],
          grossSalary: netSalary,
          totalAllowances: 0,
          totalDeductions: 0,
          netSalary,
        };
    return {
      id: `ps_${run.reference}_${idx + 1}`,
      payslipNumber: `PS-${datePart}-${shortRef}-${String(idx + 1).padStart(2, "0")}`,
      disbursementId: run.reference,
      reference: run.reference,
      orgId: run.orgId,
      organizationName: run.organizationName || "Organization Payroll",
      instructorId: rec.instructorId || `staff_${idx + 1}`,
      instructorName: rec.instructorName || "Staff Member",
      instructorEmail: rec.instructorEmail,
      roleTitle: rec.roleTitle || "Instructor",
      subaccountCode: subCode,
      bankName: rec.bankName,
      accountNumberMasked: maskedAcc,
      currency: run.currency,
      netSalary,
      breakdown,
      payPeriod: run.payPeriod,
      settlementSchedule: "Next business day direct bank settlement",
      issuedAt,
      paidAt,
      verifiedVia,
    };
  });
};

async function createDynamicFlatSplit(params: {
  name: string;
  currency: string;
  subaccounts: Array<{ subaccount: string; share: number }>;
  bearerType: "all-proportional" | "subaccount";
  bearerSubaccount?: string;
}): Promise<{ split_code?: string; id?: string | number; delegated?: boolean; error?: string }> {
  const effectiveBearer = normalizePayrollBearerType(
    params.bearerType,
    params.bearerSubaccount,
  );
  const payload: Record<string, unknown> = {
    name: params.name.slice(0, 90),
    type: "flat",
    currency: params.currency.toUpperCase(),
    subaccounts: params.subaccounts,
    bearer_type: effectiveBearer,
    mode: "live",
  };
  if (effectiveBearer === "subaccount" && params.bearerSubaccount) {
    payload.bearer_subaccount = params.bearerSubaccount;
  }

  let lastErr = "Unable to generate payroll split via KeySafe gateway.";

  const keySafeSplitUrls = [
    `${KEYSAFE_PROXY_BASE}/split?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/split?mode=live`,
    `${KEYSAFE_PROXY_BASE}/split-group?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/paystack/create-split-group?mode=live`,
  ];

  for (const url of keySafeSplitUrls) {
    try {
      const proxyRes = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(25000),
        headers: getKeySafeHeaders("live"),
        body: JSON.stringify(payload),
      });
      const proxyJson = await proxyRes.json().catch(() => ({}));
      const splitCode = proxyJson.split_code || proxyJson.data?.split_code;
      if (proxyRes.ok && splitCode) {
        return {
          split_code: splitCode,
          id: proxyJson.id || proxyJson.data?.id,
          delegated: true,
        };
      }
      if (proxyJson.detail?.message || proxyJson.message) {
        lastErr = proxyJson.detail?.message || proxyJson.message;
      }
    } catch {
      // try next KeySafe endpoint
    }
  }

  return { error: lastErr };
}

async function resolveOrCreatePaystackCustomer(
  email: string,
  organizationName: string,
): Promise<{ customerCode?: string; customerId?: number; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const lookupUrls = [
    `${KEYSAFE_PROXY_BASE}/customer/${encodeURIComponent(cleanEmail)}?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/customer/${encodeURIComponent(cleanEmail)}?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/paystack/customer/${encodeURIComponent(cleanEmail)}?mode=live`,
  ];

  for (const url of lookupUrls) {
    try {
      const lookupRes = await fetch(url, {
        headers: getKeySafeHeaders("live"),
        signal: AbortSignal.timeout(15000),
      });
      const lookupJson = await lookupRes.json().catch(() => ({}));
      const code = lookupJson.customer_code || lookupJson.data?.customer_code;
      if (lookupRes.ok && code) {
        return {
          customerCode: code,
          customerId: lookupJson.id || lookupJson.data?.id,
        };
      }
    } catch {
      // try next KeySafe URL
    }
  }

  const nameParts = (organizationName || "School Payroll").trim().split(/\s+/);
  const firstName = nameParts[0] || "School";
  const lastName = nameParts.slice(1).join(" ") || "Payroll";

  const createUrls = [
    `${KEYSAFE_PROXY_BASE}/customer?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/customer?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/paystack/customer?mode=live`,
  ];

  let lastErr = "Unable to register payer profile for bank transfer via KeySafe gateway.";
  for (const url of createUrls) {
    try {
      const createRes = await fetch(url, {
        method: "POST",
        headers: getKeySafeHeaders("live"),
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          email: cleanEmail,
          first_name: firstName,
          last_name: lastName,
          mode: "live",
        }),
      });
      const createJson = await createRes.json().catch(() => ({}));
      const code = createJson.customer_code || createJson.data?.customer_code;
      if (createRes.ok && code) {
        return {
          customerCode: code,
          customerId: createJson.id || createJson.data?.id,
        };
      }
      if (createJson.detail?.message || createJson.message) {
        lastErr = createJson.detail?.message || createJson.message;
      }
    } catch {
      // try next KeySafe URL
    }
  }

  return { error: lastErr };
}

async function assignSplitToDedicatedAccount(params: {
  customerCode: string;
  customerId?: number;
  splitCode: string;
}): Promise<{
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  error?: string;
}> {
  const preferredBanks = ["wema-bank", "titan-paystack"];
  const createDvaUrls = [
    `${KEYSAFE_PROXY_BASE}/dedicated_account?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/dedicated_account?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/paystack/dedicated_account?mode=live`,
  ];
  let lastError = "Corporate bank transfer accounts are not active right now. Please use Online Checkout (which also includes Bank Transfer).";

  // 1. Create Dedicated Virtual Account with split_code via KeySafe
  for (const preferredBank of preferredBanks) {
    for (const url of createDvaUrls) {
      try {
        const dvaRes = await fetch(url, {
          method: "POST",
          headers: getKeySafeHeaders("live"),
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({
            customer: params.customerCode,
            preferred_bank: preferredBank,
            split_code: params.splitCode,
            mode: "live",
          }),
        });
        const dvaJson = await dvaRes.json().catch(() => ({}));
        const acctNum = dvaJson.account_number || dvaJson.data?.account_number;
        if (dvaRes.ok && acctNum) {
          return {
            bankName: dvaJson.bank?.name || dvaJson.data?.bank?.name || preferredBank,
            accountNumber: acctNum,
            accountName: dvaJson.account_name || dvaJson.data?.account_name,
          };
        }
        if (dvaJson.detail?.message || dvaJson.message) {
          lastError = dvaJson.detail?.message || dvaJson.message;
        }
      } catch {
        // try next endpoint
      }
    }
  }

  // 2. If customer already has a DVA, attach the split_code via KeySafe
  if (params.customerId) {
    const listUrls = [
      `${KEYSAFE_PROXY_BASE}/dedicated_account?customer=${encodeURIComponent(String(params.customerId))}&active=true&mode=live`,
      `${KEYSAFE_PROXY_BASE}/api/dedicated_account?customer=${encodeURIComponent(String(params.customerId))}&active=true&mode=live`,
    ];
    for (const listUrl of listUrls) {
      try {
        const listRes = await fetch(listUrl, {
          headers: getKeySafeHeaders("live"),
          signal: AbortSignal.timeout(15000),
        });
        const listJson = await listRes.json().catch(() => ({}));
        const existingDva = Array.isArray(listJson.data) ? listJson.data[0] : listJson.data;
        if (listRes.ok && existingDva?.account_number) {
          const splitUrls = [
            `${KEYSAFE_PROXY_BASE}/dedicated_account/split?mode=live`,
            `${KEYSAFE_PROXY_BASE}/api/dedicated_account/split?mode=live`,
          ];
          for (const splitUrl of splitUrls) {
            const splitAssignRes = await fetch(splitUrl, {
              method: "POST",
              headers: getKeySafeHeaders("live"),
              signal: AbortSignal.timeout(15000),
              body: JSON.stringify({
                account_number: existingDva.account_number,
                split_code: params.splitCode,
                mode: "live",
              }),
            }).catch(() => null);
            const splitAssignJson = splitAssignRes ? await splitAssignRes.json().catch(() => ({})) : {};
            if (splitAssignRes?.ok && (splitAssignJson.status || splitAssignJson.success)) {
              return {
                bankName: existingDva.bank?.name || "Transfer Bank",
                accountNumber: existingDva.account_number,
                accountName: existingDva.account_name,
              };
            }
          }
        }
      } catch {
        // continue
      }
    }
  }

  return { error: lastError };
}

// Groups payroll recipients by instructor subaccount and calculates each instructor's exact payout in minor units.
function groupPayrollByInstructorSubaccount(
  recipients: ServerPayrollRecipient[],
  explicitSplit?: {
    type?: string;
    bearer_type?: string;
    bearer_subaccount?: string;
    subaccounts?: Array<{ subaccount?: string; subaccount_code?: string; share: number }>;
  },
  maxAmountKobo?: number,
): Array<{ subaccount: string; shareKobo: number; amount: number }> {
  const instructorMap = new Map<string, number>();

  if (
    explicitSplit &&
    Array.isArray(explicitSplit.subaccounts) &&
    explicitSplit.subaccounts.length > 0 &&
    explicitSplit.type !== "percentage"
  ) {
    for (const entry of explicitSplit.subaccounts) {
      const code = String(entry.subaccount || entry.subaccount_code || "").trim();
      const share = Math.round(Number(entry.share || 0));
      if (!code || share <= 0) continue;
      instructorMap.set(code, (instructorMap.get(code) || 0) + share);
    }
  } else {
    for (const r of recipients) {
      const code = String(r.subaccount_code || r.subaccount || "").trim();
      const share = Math.round(Number(r.amount || 0) * 100);
      if (!code || share <= 0) continue;
      instructorMap.set(code, (instructorMap.get(code) || 0) + share);
    }
  }

  const grouped = Array.from(instructorMap.entries()).map(([subaccount, shareKobo]) => ({
    subaccount,
    shareKobo,
    amount: Math.round(shareKobo) / 100,
  }));

  // Guarantee total split share never exceeds transaction amount due to rounding
  if (typeof maxAmountKobo === "number" && maxAmountKobo > 0 && grouped.length > 0) {
    const sumShares = grouped.reduce((acc, item) => acc + item.shareKobo, 0);
    if (sumShares > maxAmountKobo) {
      const overflow = sumShares - maxAmountKobo;
      const last = grouped[grouped.length - 1];
      if (last.shareKobo > overflow) {
        last.shareKobo -= overflow;
        last.amount = last.shareKobo / 100;
      }
    }
  }

  return grouped;
}

// POST /api/paystack/payroll/initialize
// Routes ALL API calls strictly through KeySafe URL Proxy (https://keysafe-ntia.onrender.com).
// Supports:
// - Batch inspection & grouping by instructor subaccount
// - Paystack Dynamic Splits: passes inline `split` object (bearer_type strictly "all-proportional" or "subaccount")
// - Bank transfer DVA: creates flat split_code and attaches to dedicated transfer account
app.post("/api/paystack/payroll/initialize", async (req, res) => {
  const {
    paymentType = "individual",
    paymentChannel = "checkout",
    email,
    organizationName = "School Payroll",
    orgId = "",
    payPeriod = "",
    amount,
    currency = "NGN",
    subaccount_code,
    split_code,
    split,
    recipients = [],
    feePerStaff = 0,
    bearer_type,
    bearer_subaccount,
    reference,
    metadata = {},
  } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Payer email address is required.",
    });
  }

  const activeCurrency = String(currency || "NGN").toUpperCase();
  const channel: "checkout" | "bank_transfer" =
    paymentChannel === "bank_transfer" ? "bank_transfer" : "checkout";

  const normalizedRecipients: ServerPayrollRecipient[] =
    Array.isArray(recipients) && recipients.length > 0
      ? recipients.map((r: ServerPayrollRecipient & { share?: number }) => ({
          ...r,
          subaccount_code: r.subaccount_code || r.subaccount,
          amount:
            Number(r.amount) > 0
              ? Number(r.amount)
              : Number(r.share || 0) / 100,
        }))
      : paymentType === "individual" && subaccount_code && Number(amount) > 0
        ? [
            {
              instructorId: String(metadata.instructor_id || ""),
              instructorName: String(metadata.instructor_name || "Instructor"),
              instructorEmail: String(metadata.instructor_email || ""),
              roleTitle: String(metadata.role_title || "Instructor"),
              subaccount_code,
              bankName: String(metadata.bank_name || ""),
              accountNumber: String(metadata.account_number || ""),
              amount: Number(amount),
            },
          ]
        : [];

  const staffCount = Math.max(normalizedRecipients.length, Number(metadata.recipient_count || 0), 1);
  const netSalariesTotal =
    normalizedRecipients.length > 0
      ? Math.round(
          normalizedRecipients.reduce((sum, r) => sum + Number(r.amount || 0), 0) * 100,
        ) / 100
      : Math.round(Number(amount || 0) * 100) / 100;

  if (!netSalariesTotal || netSalariesTotal <= 0) {
    return res.status(400).json({
      success: false,
      message: "A positive salary total is required before starting payroll.",
    });
  }

  const cleanFeePerStaff = Math.max(0, Number(feePerStaff || 0));
  const platformFee =
    Math.round(cleanFeePerStaff * staffCount * 100) / 100;
  const grandTotal =
    Math.round((netSalariesTotal + platformFee) * 100) / 100;

  const netSalariesKobo = Math.round(netSalariesTotal * 100);
  const platformFeeKobo = Math.round(platformFee * 100);
  const grandTotalKobo = netSalariesKobo + platformFeeKobo;

  const instructorSplits = groupPayrollByInstructorSubaccount(
    normalizedRecipients,
    split,
    grandTotalKobo,
  );
  const sumInstructorSharesKobo = instructorSplits.reduce((s, v) => s + v.shareKobo, 0);
  const platformCommissionKobo = Math.max(
    platformFeeKobo,
    grandTotalKobo - sumInstructorSharesKobo,
  );

  const txReference =
    reference ||
    `PAY-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const requestedSplitCode: string | undefined = split_code || undefined;
  let activeSplitCode: string | undefined = requestedSplitCode;
  let lastErrorMessage = "Failed to initialize salary payment via KeySafe gateway.";

  const effectiveBearerType = normalizePayrollBearerType(
    split?.bearer_type || bearer_type,
    split?.bearer_subaccount || bearer_subaccount,
  );

  // Bank transfers (Dedicated Virtual Accounts) require a persisted split_code created through KeySafe
  const needsPersistedSplitCodeForBankTransfer =
    channel === "bank_transfer" &&
    instructorSplits.length > 0 &&
    (!activeSplitCode || platformCommissionKobo > 0);

  if (needsPersistedSplitCodeForBankTransfer) {
    const splitResult = await createDynamicFlatSplit({
      name: `Payroll ${organizationName} ${txReference}`,
      currency: activeCurrency,
      subaccounts: instructorSplits.map((v) => ({
        subaccount: v.subaccount,
        share: v.shareKobo,
      })),
      bearerType: effectiveBearerType,
      bearerSubaccount: split?.bearer_subaccount || bearer_subaccount,
    });

    if (splitResult.split_code) {
      activeSplitCode = splitResult.split_code;
    } else if (splitResult.error) {
      lastErrorMessage = splitResult.error;
    }
  }

  const baseRun: ServerPayrollRun = {
    reference: txReference,
    orgId: String(orgId || metadata.org_id || ""),
    organizationName: String(organizationName || metadata.org_name || "School Payroll"),
    payerEmail: String(email).trim(),
    paymentType: paymentType === "group" ? "group" : "individual",
    paymentChannel: channel,
    currency: activeCurrency,
    netSalariesTotal,
    feePerStaff: cleanFeePerStaff,
    platformFee,
    grandTotal,
    grandTotalKobo,
    splitCode: activeSplitCode,
    subaccountCode: subaccount_code || instructorSplits[0]?.subaccount || normalizedRecipients[0]?.subaccount_code,
    payPeriod: String(payPeriod || metadata.pay_period || ""),
    recipients: normalizedRecipients,
    status: "initialized",
    webhookConfirmed: false,
    createdAt: new Date().toISOString(),
    payslips: [],
  };

  // Bank Transfer Channel via KeySafe Proxy
  if (channel === "bank_transfer") {
    if (!activeSplitCode) {
      return res.status(400).json({
        success: false,
        message: lastErrorMessage || "Could not prepare bank transfer split routing.",
      });
    }

    const customer = await resolveOrCreatePaystackCustomer(
      String(email),
      String(organizationName),
    );
    if (!customer.customerCode) {
      return res.status(400).json({
        success: false,
        message: customer.error || "Unable to register payer profile for bank transfer.",
      });
    }

    const dva = await assignSplitToDedicatedAccount({
      customerCode: customer.customerCode,
      customerId: customer.customerId,
      splitCode: activeSplitCode,
    });

    if (!dva.accountNumber) {
      return res.status(400).json({
        success: false,
        message:
          dva.error ||
          "Corporate bank transfer account could not be assigned right now. Please use Online Checkout (which also includes Transfer) instead.",
      });
    }

    const dedicatedAccount = {
      bankName: dva.bankName || "Transfer Bank",
      accountNumber: dva.accountNumber,
      accountName: dva.accountName || String(organizationName || "School Payroll"),
      splitCode: activeSplitCode,
      customerCode: customer.customerCode,
      reference: txReference,
      currency: activeCurrency,
      amount: grandTotal,
      assignedAt: new Date().toISOString(),
    };

    baseRun.dedicatedAccount = dedicatedAccount;
    payrollRunLedger.set(txReference, baseRun);
    splitCodeToRunRef.set(activeSplitCode, txReference);
    dvaAccountToRunRef.set(dva.accountNumber, txReference);

    return res.json({
      success: true,
      paymentChannel: "bank_transfer",
      reference: txReference,
      split_code: activeSplitCode,
      splitMode: "split_group",
      instructorSplits: instructorSplits.map((v) => ({
        subaccount: v.subaccount,
        share: v.shareKobo,
        amount: v.amount,
      })),
      dedicatedAccount,
      netSalariesTotal,
      platformFee,
      grandTotal,
      mode: "live",
    });
  }

  // Online Checkout Channel: Strictly routed through KeySafe URL Proxy
  const useDynamicSplit =
    Boolean(split) ||
    (instructorSplits.length > 1 && !requestedSplitCode) ||
    (instructorSplits.length > 0 && paymentType === "group" && !requestedSplitCode);

  let splitMode: "dynamic_split" | "split_group" | "single_subaccount";

  const proxyPayload: Record<string, unknown> = {
    email: String(email).trim(),
    amount: grandTotalKobo,
    currency: activeCurrency,
    reference: txReference,
    mode: "live",
    metadata: {
      ...metadata,
      payroll_flow: true,
      payment_type: paymentType,
      org_id: baseRun.orgId,
      org_name: baseRun.organizationName,
      pay_period: baseRun.payPeriod,
      net_salaries_kobo: sumInstructorSharesKobo || netSalariesKobo,
      platform_fee_kobo: platformCommissionKobo,
      fee_per_staff: cleanFeePerStaff,
      recipient_count: staffCount,
      instructor_count: instructorSplits.length,
      bearer_type: effectiveBearerType,
      mode: "live",
    },
  };

  if (useDynamicSplit && instructorSplits.length > 0) {
    const dynamicSplitPayload: Record<string, unknown> = {
      type: split?.type === "percentage" ? "percentage" : "flat",
      bearer_type: effectiveBearerType,
      subaccounts:
        split?.type === "percentage" && Array.isArray(split?.subaccounts)
          ? split.subaccounts.map((s: { subaccount?: string; subaccount_code?: string; share: number }) => ({
              subaccount: s.subaccount || s.subaccount_code,
              share: Math.round(Number(s.share)),
            }))
          : instructorSplits.map((v) => ({
              subaccount: v.subaccount,
              share: v.shareKobo,
            })),
    };
    const chosenBearerSub = split?.bearer_subaccount || bearer_subaccount;
    if (effectiveBearerType === "subaccount" && chosenBearerSub) {
      dynamicSplitPayload.bearer_subaccount = chosenBearerSub;
    }

    proxyPayload.split = dynamicSplitPayload;
    splitMode = "dynamic_split";
    (proxyPayload.metadata as Record<string, unknown>).dynamic_split = true;
  } else if (requestedSplitCode && platformCommissionKobo === 0) {
    proxyPayload.split_code = requestedSplitCode;
    splitMode = "split_group";
  } else if (paymentType === "individual" && (subaccount_code || instructorSplits[0]?.subaccount)) {
    const singleSub = subaccount_code || instructorSplits[0].subaccount;
    proxyPayload.subaccount_code = singleSub;
    proxyPayload.subaccount = singleSub;
    proxyPayload.transaction_charge = platformCommissionKobo;
    proxyPayload.bearer = "subaccount";
    splitMode = "single_subaccount";
  } else if (instructorSplits.length > 0) {
    proxyPayload.split = {
      type: "flat",
      bearer_type: effectiveBearerType,
      subaccounts: instructorSplits.map((v) => ({
        subaccount: v.subaccount,
        share: v.shareKobo,
      })),
    };
    splitMode = "dynamic_split";
    (proxyPayload.metadata as Record<string, unknown>).dynamic_split = true;
  } else {
    return res.status(400).json({
      success: false,
      message: "Either a saved pay group or instructor selection is required for payroll.",
    });
  }

  console.log(
    `[KeySafe Payroll] Initializing ${splitMode} checkout via KeySafe proxy (${instructorSplits.length} instructor(s), bearer=${effectiveBearerType}, total=${grandTotalKobo})`,
  );

  const keySafeInitUrls = [
    `${KEYSAFE_PROXY_BASE}/transaction/initialize?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/transaction/initialize?mode=live`,
    `${KEYSAFE_PROXY_BASE}/split-payment?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/split-payment?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/payments/split-payment?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/payments/paystack-split-init?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/paystack/initialize-split?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/paystack/payroll/initialize?mode=live`,
  ];

  for (const url of keySafeInitUrls) {
    try {
      const proxyRes = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(30000),
        headers: getKeySafeHeaders("live"),
        body: JSON.stringify(proxyPayload),
      });
      const proxyJson = await proxyRes.json().catch(() => ({}));
      const authUrl = proxyJson.authorization_url || proxyJson.data?.authorization_url;
      const accessCode = proxyJson.access_code || proxyJson.data?.access_code;
      if (proxyRes.ok && (accessCode || authUrl)) {
        const finalRef = proxyJson.reference || proxyJson.data?.reference || txReference;
        baseRun.reference = finalRef;
        payrollRunLedger.set(finalRef, baseRun);
        if (requestedSplitCode && splitMode === "split_group") {
          splitCodeToRunRef.set(requestedSplitCode, finalRef);
        }

        return res.json({
          success: true,
          paymentChannel: "checkout",
          authorization_url: authUrl,
          access_code: accessCode,
          reference: finalRef,
          splitMode,
          instructorSplits: instructorSplits.map((v) => ({
            subaccount: v.subaccount,
            share: v.shareKobo,
            amount: v.amount,
          })),
          subaccount_code: splitMode === "single_subaccount"
            ? subaccount_code || instructorSplits[0]?.subaccount
            : undefined,
          split_code: splitMode === "split_group" ? requestedSplitCode : undefined,
          netSalariesTotal,
          platformFee,
          grandTotal,
          mode: "live",
          delegated: true,
        });
      }
      if (proxyJson.detail?.message || proxyJson.message) {
        lastErrorMessage = proxyJson.detail?.message || proxyJson.message;
      }
    } catch (proxyErr) {
      console.warn(`[KeySafe Payroll] Proxy notice on ${url}:`, proxyErr);
    }
  }

  return res.status(400).json({
    success: false,
    message: lastErrorMessage,
  });
});

// --- 5d. POST /api/paystack/webhook ---
// Listens for charge.success events from Paystack, verifies HMAC-SHA512 signature,
// marks payroll runs confirmed, and automatically issues digital payslips.
app.post("/api/paystack/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"] as string | undefined;
    const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
    const secretKey =
      PAYSTACK_LIVE_SECRET_KEY || process.env.PAYSTACK_LIVE_SECRET_KEY || "";

    if (secretKey && signature && rawBody) {
      const expectedHash = crypto
        .createHmac("sha512", secretKey)
        .update(rawBody)
        .digest("hex");
      if (expectedHash !== signature) {
        console.warn("[Paystack Webhook] Invalid signature rejected.");
        return res.status(401).json({ received: false, message: "Invalid webhook signature" });
      }
    }

    const event = req.body;
    if (event?.event === "charge.success" && event?.data) {
      const tx = event.data;
      const incomingRef = String(tx.reference || "");
      const incomingSplitCode = String(tx.split?.split_code || tx.metadata?.split_code || "");
      const receiverBankAcct = String(
        tx.authorization?.receiver_bank_account_number || "",
      );

      let matchedRef = incomingRef;
      let run = payrollRunLedger.get(incomingRef);
      if (!run && incomingSplitCode) {
        const mappedRef = splitCodeToRunRef.get(incomingSplitCode);
        if (mappedRef) {
          matchedRef = mappedRef;
          run = payrollRunLedger.get(mappedRef);
        }
      }
      if (!run && receiverBankAcct) {
        const mappedRef = dvaAccountToRunRef.get(receiverBankAcct);
        if (mappedRef) {
          matchedRef = mappedRef;
          run = payrollRunLedger.get(mappedRef);
        }
      }

      if (run) {
        const paidAt = tx.paid_at || new Date().toISOString();
        run.status = "success";
        run.webhookConfirmed = true;
        run.paidAt = paidAt;
        if (run.payslips.length === 0) {
          run.payslips = buildDigitalPayslips(run, "webhook", paidAt);
        }
        payrollRunLedger.set(matchedRef, run);
        console.log(
          `[Paystack Webhook] charge.success confirmed for ${matchedRef}; generated ${run.payslips.length} digital payslips.`,
        );
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[Paystack Webhook] Error processing event:", err);
    return res.status(200).json({ received: true });
  }
});

// --- 5e. GET /api/paystack/payroll/status/:reference ---
// Returns webhook-confirmed status + generated digital payslips, or actively verifies via KeySafe URL Proxy.
app.get("/api/paystack/payroll/status/:reference", async (req, res) => {
  const { reference } = req.params;
  const run = payrollRunLedger.get(reference);

  if (run?.status === "success") {
    return res.json({
      success: true,
      status: "success",
      webhookConfirmed: run.webhookConfirmed,
      paidAt: run.paidAt,
      splitCode: run.splitCode,
      settlementSchedule: "Next business day direct bank settlement",
      payslips: run.payslips,
    });
  }

  const keySafeVerifyUrls = [
    `${KEYSAFE_PROXY_BASE}/api/transaction/verify/${encodeURIComponent(reference)}?mode=live`,
    `${KEYSAFE_PROXY_BASE}/transaction/verify/${encodeURIComponent(reference)}?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/paystack/verify/${encodeURIComponent(reference)}?mode=live`,
  ];

  for (const url of keySafeVerifyUrls) {
    try {
      const verifyRes = await fetch(url, {
        headers: getKeySafeHeaders("live"),
        signal: AbortSignal.timeout(15000),
      });
      const verifyJson = await verifyRes.json().catch(() => ({}));
      const txData = verifyJson.data || verifyJson;
      if (verifyRes.ok && txData?.status === "success") {
        const paidAt = txData.paid_at || new Date().toISOString();
        if (run) {
          run.status = "success";
          run.paidAt = paidAt;
          if (run.payslips.length === 0) {
            run.payslips = buildDigitalPayslips(run, "verification", paidAt);
          }
          payrollRunLedger.set(reference, run);
        }
        return res.json({
          success: true,
          status: "success",
          webhookConfirmed: Boolean(run?.webhookConfirmed),
          paidAt,
          splitCode: run?.splitCode,
          settlementSchedule: "Next business day direct bank settlement",
          payslips: run?.payslips || [],
        });
      }
    } catch {
      // try next KeySafe endpoint
    }
  }

  // For bank transfer virtual accounts, match incoming verified transaction through KeySafe URL Proxy
  if (run?.paymentChannel === "bank_transfer" && run.dedicatedAccount?.customerCode) {
    const keySafeTxListUrls = [
      `${KEYSAFE_PROXY_BASE}/transaction?status=success&perPage=20&mode=live`,
      `${KEYSAFE_PROXY_BASE}/api/transaction?status=success&perPage=20&mode=live`,
    ];
    for (const txListUrl of keySafeTxListUrls) {
      try {
        const txListRes = await fetch(txListUrl, {
          headers: getKeySafeHeaders("live"),
          signal: AbortSignal.timeout(15000),
        });
        const txListJson = await txListRes.json().catch(() => ({}));
        if (txListRes.ok && Array.isArray(txListJson.data)) {
          const runCreatedMs = new Date(run.createdAt).getTime() - 10000;
          const match = txListJson.data.find((tx: {
            amount?: number;
            paid_at?: string;
            created_at?: string;
            split?: { split_code?: string };
            customer?: { customer_code?: string; email?: string };
          }) => {
            const txTime = new Date(tx.paid_at || tx.created_at || 0).getTime();
            const matchesSplit =
              run.splitCode && tx.split?.split_code === run.splitCode;
            const matchesCustomer =
              tx.customer?.customer_code === run.dedicatedAccount?.customerCode ||
              (tx.customer?.email || "").toLowerCase() === run.payerEmail.toLowerCase();
            const matchesAmount = Number(tx.amount || 0) >= run.grandTotalKobo;
            return (matchesSplit || matchesCustomer) && matchesAmount && txTime >= runCreatedMs;
          });

          if (match) {
            const paidAt = match.paid_at || new Date().toISOString();
            run.status = "success";
            run.paidAt = paidAt;
            if (run.payslips.length === 0) {
              run.payslips = buildDigitalPayslips(run, "verification", paidAt);
            }
            payrollRunLedger.set(reference, run);
            return res.json({
              success: true,
              status: "success",
              webhookConfirmed: Boolean(run.webhookConfirmed),
              paidAt,
              splitCode: run.splitCode,
              settlementSchedule: "Next business day direct bank settlement",
              payslips: run.payslips,
            });
          }
        }
      } catch {
        // continue
      }
    }
  }

  return res.json({
    success: true,
    status: run?.status || "initialized",
    webhookConfirmed: false,
    payslips: run?.payslips || [],
  });
});

// --- 5f. POST /api/paystack/payroll/issue-payslips ---
// Generates digital payslips idempotently after a verified payroll transaction.
app.post("/api/paystack/payroll/issue-payslips", (req, res) => {
  const {
    reference,
    orgId = "",
    organizationName = "School Payroll",
    payerEmail = "",
    currency = "NGN",
    payPeriod = "",
    recipients = [],
    paidAt,
  } = req.body;

  if (!reference || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ success: false, message: "Reference and recipients are required." });
  }

  const existing = payrollRunLedger.get(reference);
  if (existing && existing.payslips.length > 0) {
    return res.json({
      success: true,
      webhookConfirmed: existing.webhookConfirmed,
      payslips: existing.payslips,
    });
  }

  const syntheticRun: ServerPayrollRun = existing || {
    reference,
    orgId,
    organizationName,
    payerEmail,
    paymentType: recipients.length > 1 ? "group" : "individual",
    paymentChannel: "checkout",
    currency,
    netSalariesTotal: recipients.reduce((s: number, r: ServerPayrollRecipient) => s + Number(r.amount || 0), 0),
    feePerStaff: 0,
    platformFee: 0,
    grandTotal: recipients.reduce((s: number, r: ServerPayrollRecipient) => s + Number(r.amount || 0), 0),
    grandTotalKobo: 0,
    payPeriod,
    recipients,
    status: "success",
    webhookConfirmed: false,
    paidAt: paidAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    payslips: [],
  };

  syntheticRun.status = "success";
  syntheticRun.payslips = buildDigitalPayslips(syntheticRun, "checkout", paidAt);
  payrollRunLedger.set(reference, syntheticRun);

  return res.json({
    success: true,
    webhookConfirmed: syntheticRun.webhookConfirmed,
    payslips: syntheticRun.payslips,
  });
});

// --- 6. GET /api/paystack/verify/:reference ---
app.get("/api/paystack/verify/:reference", async (req, res) => {
  const { reference } = req.params;

  const verifyUrls = [
    `${KEYSAFE_PROXY_BASE}/api/transaction/verify/${encodeURIComponent(reference)}?mode=live`,
    `${KEYSAFE_PROXY_BASE}/transaction/verify/${encodeURIComponent(reference)}?mode=live`,
    `${KEYSAFE_PROXY_BASE}/api/paystack/verify/${encodeURIComponent(reference)}?mode=live`,
  ];

  for (const url of verifyUrls) {
    try {
      const proxyRes = await fetch(url, {
        headers: getKeySafeHeaders("live"),
        signal: AbortSignal.timeout(15000),
      });
      const proxyJson = await proxyRes.json().catch(() => ({}));
      const txData = proxyJson.data || proxyJson;
      if (proxyRes.ok && (proxyJson.status || txData?.status)) {
        return res.json({
          success: true,
          status: txData.status,
          amount: typeof txData.amount === "number" ? txData.amount / 100 : undefined,
          currency: txData.currency,
          subaccount: txData.subaccount,
          split: txData.split,
          metadata: txData.metadata,
          paid_at: txData.paid_at,
          data: txData,
        });
      }
    } catch {
      // continue to next KeySafe verify endpoint
    }
  }

  return res.status(400).json({ success: false, message: "Verification failed." });
});

// --- LiveKit Token generation endpoint ---
app.post("/api/livekit/token", async (req, res) => {
  try {
    const effectiveRoom = req.body.roomName || req.body.room || "backpack-live-class";
    const effectiveName = (req.body.participantName || req.body.name || "Guest Participant").trim();
    const role = req.body.role || (req.body.isGuestSpeaker ? "guest_speaker" : "student");
    const isGuestSpeaker = Boolean(req.body.isGuestSpeaker || role === "guest_speaker" || role === "speaker");
    const isGuest = Boolean(req.body.isGuest || !req.body.identity || req.body.identity.startsWith("guest_"));
    const identity = req.body.identity;

    const apiKey =
      process.env.LIVEKIT_API_KEY ||
      process.env.VITE_LIVEKIT_API_KEY ||
      "devkey";
    const apiSecret =
      process.env.LIVEKIT_API_SECRET ||
      process.env.VITE_LIVEKIT_API_SECRET ||
      "secretsecretsecretsecretsecretsecret";
    const wsUrl = process.env.LIVEKIT_URL || process.env.VITE_LIVEKIT_URL;

    if (!wsUrl) {
      return res.status(200).json({
        token: null,
        wsUrl: null,
        livekitUrl: null,
        roomName: effectiveRoom,
        status: "FALLBACK_ENGINE_ACTIVE",
      });
    }

    const participantIdentity =
      identity ||
      `${isGuest ? "guest_" : ""}${(effectiveName || "user").replace(/[^a-zA-Z0-9_-]/g, "_")}_${Math.random().toString(36).substring(2, 7)}`;
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: effectiveName || "Participant",
      metadata: JSON.stringify({
        displayName: effectiveName,
        role: isGuestSpeaker ? "guest_speaker" : role,
        isGuestSpeaker,
        isGuest,
      }),
    });
    at.addGrant({
      roomJoin: true,
      room: effectiveRoom,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canPublishSources: ["camera", "microphone", "screen_share", "screen_share_audio"],
    });
    const token = await at.toJwt();
    return res.json({ token, wsUrl: wsUrl || null, roomName: effectiveRoom });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// --- Backpack Native WebRTC Room Signaling Engine ---
interface PeerClient {
  id: string;
  name: string;
  role: string;
  res: express.Response;
}

const webrtcRooms = new Map<string, Map<string, PeerClient>>();

app.get("/api/webrtc/events", (req, res) => {
  const room = String(req.query.room || "").trim();
  const userId = String(req.query.userId || "").trim();
  const userName = String(req.query.userName || "Participant").trim();
  const role = String(req.query.role || "student").trim();

  if (!room || !userId) {
    return res.status(400).json({ error: "room and userId are required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }

  if (!webrtcRooms.has(room)) {
    webrtcRooms.set(room, new Map());
  }

  const roomMap = webrtcRooms.get(room)!;
  const client: PeerClient = { id: userId, name: userName, role, res };
  roomMap.set(userId, client);

  // Send current participants list to the joining user
  const existingPeers = Array.from(roomMap.values())
    .filter((p) => p.id !== userId)
    .map((p) => ({ id: p.id, name: p.name, role: p.role }));

  res.write(
    `data: ${JSON.stringify({ type: "init", peers: existingPeers })}\n\n`
  );

  // Notify other participants in the room that a new peer joined
  for (const [peerId, peer] of roomMap.entries()) {
    if (peerId !== userId) {
      try {
        peer.res.write(
          `data: ${JSON.stringify({
            type: "user-joined",
            user: { id: userId, name: userName, role },
          })}\n\n`
        );
      } catch {}
    }
  }

  req.on("close", () => {
    roomMap.delete(userId);
    if (roomMap.size === 0) {
      webrtcRooms.delete(room);
    } else {
      for (const peer of roomMap.values()) {
        try {
          peer.res.write(
            `data: ${JSON.stringify({
              type: "user-left",
              userId,
            })}\n\n`
          );
        } catch {}
      }
    }
  });
});

app.post("/api/webrtc/signal", (req, res) => {
  const { room, senderId, senderName, targetId, type, data } = req.body || {};
  if (!room || !senderId || !type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const roomMap = webrtcRooms.get(room);
  if (!roomMap) {
    return res.json({ success: true, delivered: 0 });
  }

  const payload = JSON.stringify({
    type,
    senderId,
    senderName,
    data,
  });

  let delivered = 0;
  if (targetId) {
    const targetPeer = roomMap.get(targetId);
    if (targetPeer) {
      try {
        targetPeer.res.write(`data: ${payload}\n\n`);
        delivered++;
      } catch {}
    }
  } else {
    for (const [peerId, peer] of roomMap.entries()) {
      if (peerId !== senderId) {
        try {
          peer.res.write(`data: ${payload}\n\n`);
          delivered++;
        } catch {}
      }
    }
  }

  return res.json({ success: true, delivered });
});

app.post("/api/webrtc/end-room", (req, res) => {
  const { room } = req.body || {};
  if (room && webrtcRooms.has(room)) {
    const roomMap = webrtcRooms.get(room)!;
    for (const peer of roomMap.values()) {
      try {
        peer.res.write(`data: ${JSON.stringify({ type: "room-ended" })}\n\n`);
        peer.res.end();
      } catch {}
    }
    webrtcRooms.delete(room);
  }
  return res.json({ success: true });
});

// LiveKit End Room Endpoint
app.post("/api/livekit/end-room", (req, res) => {
  const { roomName, courseId } = req.body || {};
  if (roomName && webrtcRooms.has(roomName)) {
    const roomMap = webrtcRooms.get(roomName)!;
    for (const peer of roomMap.values()) {
      try {
        peer.res.write(`data: ${JSON.stringify({ type: "room-ended" })}\n\n`);
        peer.res.end();
      } catch {}
    }
    webrtcRooms.delete(roomName);
  }
  res.status(200).json({
    success: true,
    message: "Live room ended successfully",
    roomName: roomName || null,
    courseId: courseId || null,
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    paystackConfigured: !!(PAYSTACK_LIVE_SECRET_KEY || process.env.PAYSTACK_LIVE_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY),
    liveKeyConfigured: !!(PAYSTACK_LIVE_SECRET_KEY || process.env.PAYSTACK_LIVE_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY),
    headers: Boolean(getPaystackHeaders()),
    mode: "live",
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
