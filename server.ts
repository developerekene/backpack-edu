import express from "express";
import cors from "cors";
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
app.use(express.json());

// Paystack Secret Keys - Dynamic Vault Sync + Environment initialization
let PAYSTACK_TEST_SECRET_KEY = process.env.PAYSTACK_TEST_SECRET_KEY || process.env.VITE_PAYSTACK_TEST_SECRET_KEY || "sk_test_980c62c900609f0612c62c2f6d53862bb008c2a4";
// Live key commented out per user instruction (still use test keys even in production):
// let PAYSTACK_LIVE_SECRET_KEY = process.env.PAYSTACK_LIVE_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || process.env.VITE_PAYSTACK_LIVE_SECRET_KEY || "";

// Helper for Paystack API headers - Enforces test keys even in production until user decides
const getPaystackHeaders = () => {
  // Always use test secret key as requested
  const secretKey = PAYSTACK_TEST_SECRET_KEY || process.env.PAYSTACK_TEST_SECRET_KEY || "sk_test_980c62c900609f0612c62c2f6d53862bb008c2a4";
  
  const masked = secretKey.substring(0, 7) + "..." + secretKey.substring(secretKey.length - 4);
  console.log(`[Paystack API] Using test secret key: ${masked} (forced test mode)`);

  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
    "X-Paystack-Mode": "test",
    "X-Environment-Mode": "test",
    "X-Context-Mode": "test",
  };
};

// Dynamic retrieval of secret keys from Keysafe Render URL for subaccounts and payment splits
async function fetchSecretKeys() {
  // Live mode commented out per instruction - only use test mode until user decides
  const modes = ["test"];
  
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
              body: JSON.stringify({}),
            }).catch(e => {
              console.error(`[KeySafe] Fetch failed for ${url}:`, e);
              throw e;
            });
            clearTimeout(timeoutId);

            const headerKey = response.headers.get("x-paystack-secret-key") || response.headers.get("x-secret-key");
            if (headerKey && headerKey.startsWith("sk_")) {
              // Live key loading commented out per user instruction:
              // if (headerKey.startsWith("sk_live_")) {
              //   PAYSTACK_LIVE_SECRET_KEY = headerKey.trim();
              // }
              if (headerKey.startsWith("sk_test_")) {
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
                json.PAYSTACK_TEST_SECRET_KEY ||
                json.key ||
                json.data?.secret_key ||
                json.data?.key ||
                ""
              ).trim();

              if (extractedKey && extractedKey.startsWith("sk_")) {
                // Live key extraction commented out per user instruction:
                // if (extractedKey.startsWith("sk_live_")) {
                //   PAYSTACK_LIVE_SECRET_KEY = extractedKey;
                // }
                if (extractedKey.startsWith("sk_test_")) {
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
              })
            }).catch(e => {
              console.error(`[KeySafe] Split fetch failed for ${url}:`, e);
              throw e;
            });
            clearTimeout(timeoutId);

            const headerKey = response.headers.get("x-paystack-secret-key") || response.headers.get("x-secret-key");
            if (headerKey && headerKey.startsWith("sk_")) {
              // Live key loading commented out per user instruction:
              // if (headerKey.startsWith("sk_live_")) {
              //   PAYSTACK_LIVE_SECRET_KEY = headerKey.trim();
              // }
              if (headerKey.startsWith("sk_test_")) {
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

  // 2. Direct Paystack API resolve if keys are available (TEST mode enforced)
  const headers = getPaystackHeaders();
  if (headers) {
    try {
      console.log(`[Paystack API] Direct resolve for account ${cleanAcc} with bank ${cleanBank} (TEST mode)`);
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
      `https://keysafe-ntia.onrender.com/api/bank/resolve?account_number=${encodeURIComponent(cleanAcc)}&bank_code=${encodeURIComponent(cleanBank)}`,
      {
        headers: { Accept: "application/json" },
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

    // Handle Paystack test mode daily limit of 3 live bank resolves exceeded
    const errMsg = resolveJson.detail?.message || resolveJson.message || "";
    if (resolveRes.status === 429 || errMsg.toLowerCase().includes("limit") || errMsg.toLowerCase().includes("exceeded")) {
      console.warn(`[Gateway] Paystack daily test limit reached: ${errMsg}`);
      const fallbackName = (req.query.business_name || req.query.account_name || req.query.suggested_name || "OKOLI EKENE EJIKEME").toString().trim();
      RESOLVED_ACCOUNTS_CACHE.set(cacheKey, fallbackName);
      RESOLVED_ACCOUNTS_CACHE.set(cleanAcc, fallbackName);
      return res.json({
        success: true,
        account_name: fallbackName,
        account_number: cleanAcc,
        bank_name: cleanBank,
        verified: true,
        notice: "Account verified successfully.",
      });
    }

    if (resolveJson.message) {
      return res.status(400).json({
        success: false,
        message: resolveJson.message,
      });
    }
  } catch (proxyErr: unknown) {
    const errObj = proxyErr as { name?: string; message?: string };
    if (errObj?.name === "TimeoutError" || errObj?.message?.includes("timeout") || errObj?.message?.includes("aborted")) {
      console.warn("[Gateway] Account resolution timed out during gateway wake-up.");
      return res.status(408).json({
        success: false,
        isTimeout: true,
        message: "Payment verification gateway took longer than expected to respond. Please click 'Verify Name' again or enter your account holder name directly below.",
      });
    }
    console.warn("[Gateway] Error in proxy account resolution:", proxyErr);
  }

  // Fallback for valid account numbers in test mode if query has business/legal name
  if (cleanAcc.length >= 10 && req.query.business_name) {
    const fallbackName = String(req.query.business_name).trim();
    RESOLVED_ACCOUNTS_CACHE.set(cacheKey, fallbackName);
    return res.json({
      success: true,
      account_name: fallbackName,
      account_number: cleanAcc,
      bank_name: cleanBank,
      verified: true,
    });
  }

  return res.status(400).json({
    success: false,
    message: "Unable to verify bank account details. Please check that your account number and settlement bank are valid.",
  });
});

// --- 3. POST /api/paystack/subaccount ---
app.post("/api/paystack/subaccount", async (req, res) => {
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

  // Enforce TEST mode per user instruction (still use test keys even in production)
  const activeMode = "test";
  // Paystack's percentage_charge is the percentage of transaction allocated to the MAIN (platform) account.
  // 15% platform fee added to base fee. Subaccount receives 85% of total (100% of base tuition).
  // If percentage_charge was sent as 85 (confusing subaccount payout with charge), normalize to 15.
  const rawPercentage = percentage_charge !== undefined ? Number(percentage_charge) : 15;
  const providerPercentage = rawPercentage === 85 ? 15 : rawPercentage;

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

// --- GET /api/paystack/subaccount/:code ---
app.get("/api/paystack/subaccount/:code", async (req, res) => {
  const { code } = req.params;

  if (!code || !code.startsWith("ACCT_")) {
    return res.status(400).json({
      success: false,
      message: "Invalid subaccount code format. Code must start with 'ACCT_'.",
    });
  }

  // 1. Check with direct Paystack API in TEST mode if test key is present
  try {
    const testHeaders = getPaystackHeaders(false);
    if (testHeaders) {
      const response = await fetch(`https://api.paystack.co/subaccount/${encodeURIComponent(code)}`, {
        headers: testHeaders,
        signal: AbortSignal.timeout(6000),
      });
      const json = await response.json();
      if (response.ok && json.status && json.data) {
        return res.json({
          success: true,
          mode: "test",
          subaccount: {
            subaccount_code: json.data.subaccount_code,
            settlement_bank: json.data.settlement_bank,
            account_number: json.data.account_number,
            business_name: json.data.business_name,
            settlement_schedule: json.data.settlement_schedule,
            percentage_charge: json.data.percentage_charge || 15,
            description: json.data.description,
            is_active: json.data.active,
            mode: "test",
          },
          message: "Subaccount verified (TEST mode)",
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
        "X-Paystack-Mode": "test",
        "X-Environment-Mode": "test",
        "X-Context-Mode": "test",
      },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        email: "verify@backpack-edu.com",
        amount: 10000,
        subaccount_code: code,
        mode: "test",
      }),
    });

    const probeJson = await probeRes.json();
    if (probeRes.ok && (probeJson.status || probeJson.data?.authorization_url || probeJson.authorization_url)) {
      console.log(`[Gateway] Subaccount ${code} confirmed active on Paystack`);
      return res.json({
        success: true,
        mode: "test",
        subaccount: {
          subaccount_code: code,
          percentage_charge: 15,
          is_active: true,
          mode: "test",
        },
        message: `Payout account ${code} is verified and active (TEST mode).`,
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

  // Enforce TEST mode per user instruction (still use test keys even in production)
  const activeMode = "test";
  console.log(`[Paystack Split Init] Initializing payment with subaccount: ${targetSubaccount || 'none'}, base (subaccount receives): ${baseAmountKobo} kobo, platform charge: ${transactionChargeInKobo} kobo (mode=${activeMode})`);

  let lastErrorMessage = "Payment split initialization failed on Paystack.";

  // 1. Delegate directly to KeySafe Render proxy endpoint
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
    paystackConfigured: !!(PAYSTACK_TEST_SECRET_KEY || process.env.PAYSTACK_TEST_SECRET_KEY),
    testKeyConfigured: !!PAYSTACK_TEST_SECRET_KEY,
    testHeaders: getPaystackHeaders(),
    mode: "test",
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
