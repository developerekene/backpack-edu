/**
 * @file paystackBanks.ts
 * Comprehensive Worldwide Paystack Banks Service
 * Provides access to all 568+ banks across all 7 Paystack operating countries:
 * Nigeria, Ghana, Kenya, South Africa, Côte d'Ivoire, Egypt, and Rwanda.
 */

import rawBanksDirectory from "./paystackBanksDirectory.json";

export interface PaystackCountry {
  id: string;
  name: string;
  code: string;
  currency: string;
  flag: string;
}

export const PAYSTACK_SUPPORTED_COUNTRIES: PaystackCountry[] = [
  { id: "all", name: "All Countries", code: "ALL", currency: "Worldwide", flag: "🌐" },
  { id: "nigeria", name: "Nigeria", code: "NG", currency: "NGN", flag: "🇳🇬" },
  { id: "ghana", name: "Ghana", code: "GH", currency: "GHS", flag: "🇬🇭" },
  { id: "kenya", name: "Kenya", code: "KE", currency: "KES", flag: "🇰🇪" },
  { id: "south africa", name: "South Africa", code: "ZA", currency: "ZAR", flag: "🇿🇦" },
  { id: "cote d'ivoire", name: "Côte d'Ivoire", code: "CI", currency: "XOF", flag: "🇨🇮" },
  { id: "egypt", name: "Egypt", code: "EG", currency: "EGP", flag: "🇪🇬" },
  { id: "rwanda", name: "Rwanda", code: "RW", currency: "RWF", flag: "🇷🇼" },
];

export interface PaystackBankRecord {
  id: number | string;
  name: string;
  code: string;
  slug?: string;
  country: string;
  country_code: string;
  country_id: string;
  currency: string;
  type?: string;
}

// Complete preloaded worldwide bank directory (568 banks)
export const WORLDWIDE_BANKS_CACHE: PaystackBankRecord[] = (rawBanksDirectory as PaystackBankRecord[]) || [];

let memoryCache: PaystackBankRecord[] = WORLDWIDE_BANKS_CACHE;
let memoryCacheTimestamp = Date.now();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch banks for a specific country from Paystack CDN or Render backend
 */
async function fetchCountryBanksFromPaystack(countryId: string): Promise<PaystackBankRecord[]> {
  const countryObj = PAYSTACK_SUPPORTED_COUNTRIES.find(
    (c) => c.id === countryId || c.code.toLowerCase() === countryId.toLowerCase()
  );
  const targetId = countryObj ? countryObj.id : countryId;

  // Try direct Paystack CDN first (public, CORS * enabled, zero cold-start delay)
  try {
    const res = await fetch(`https://api.paystack.co/bank?country=${encodeURIComponent(targetId)}&perPage=300`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        return json.data.map((b: Record<string, unknown>) => ({
          id: (b.id as number | string) || `${targetId}-${b.code}`,
          name: String(b.name || ""),
          code: String(b.code || ""),
          slug: String(b.slug || ""),
          country: String(b.country || (countryObj ? countryObj.name : targetId)),
          country_code: countryObj ? countryObj.code : "GLOBAL",
          country_id: targetId,
          currency: String(b.currency || (countryObj ? countryObj.currency : "USD")),
          type: String(b.type || ""),
        }));
      }
    }
  } catch {
    // Continue to Render proxy
  }

  // Fallback to Render proxy if direct CDN was unreachable
  try {
    const res = await fetch(`https://keysafe-ntia.onrender.com/api/banks?country=${encodeURIComponent(targetId)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        return json.data.map((b: Record<string, unknown>) => ({
          id: (b.id as number | string) || `${targetId}-${b.code}`,
          name: String(b.name || ""),
          code: String(b.code || ""),
          slug: String(b.slug || ""),
          country: String(b.country || (countryObj ? countryObj.name : targetId)),
          country_code: countryObj ? countryObj.code : "GLOBAL",
          country_id: targetId,
          currency: String(b.currency || (countryObj ? countryObj.currency : "USD")),
          type: String(b.type || ""),
        }));
      }
    }
  } catch {
    // Continue to bundled cache
  }

  // Fallback to pre-bundled cache for this country
  return WORLDWIDE_BANKS_CACHE.filter(
    (b) => b.country_id === targetId || b.country.toLowerCase() === targetId.toLowerCase()
  );
}

/**
 * Fetch all banks worldwide across all supported Paystack operating countries
 */
export async function fetchAllWorldwideBanks(countryFilter?: string): Promise<PaystackBankRecord[]> {
  const normFilter = (countryFilter || "all").trim().toLowerCase();

  // If specific country requested and not "all"
  if (normFilter && normFilter !== "all") {
    const matchCountry = PAYSTACK_SUPPORTED_COUNTRIES.find(
      (c) => c.id === normFilter || c.code.toLowerCase() === normFilter || c.name.toLowerCase() === normFilter
    );
    if (matchCountry && matchCountry.id !== "all") {
      const countryBanks = await fetchCountryBanksFromPaystack(matchCountry.id);
      if (countryBanks.length > 0) return countryBanks;
      return WORLDWIDE_BANKS_CACHE.filter((b) => b.country_id === matchCountry.id);
    }
  }

  // Check if in-memory cache is fresh
  const now = Date.now();
  if (memoryCache.length > 300 && now - memoryCacheTimestamp < CACHE_TTL_MS) {
    return memoryCache;
  }

  // Fetch all 7 countries in parallel
  const countriesToFetch = PAYSTACK_SUPPORTED_COUNTRIES.filter((c) => c.id !== "all");
  const fetchPromises = countriesToFetch.map((c) => fetchCountryBanksFromPaystack(c.id));

  try {
    const results = await Promise.allSettled(fetchPromises);
    const combined: PaystackBankRecord[] = [];

    results.forEach((r, idx) => {
      if (r.status === "fulfilled" && Array.isArray(r.value) && r.value.length > 0) {
        combined.push(...r.value);
      } else {
        // Fallback to static records for this country
        const fallback = WORLDWIDE_BANKS_CACHE.filter(
          (b) => b.country_id === countriesToFetch[idx].id
        );
        combined.push(...fallback);
      }
    });

    if (combined.length > 0) {
      // Deduplicate by country and bank code
      const seen = new Set<string>();
      const deduped: PaystackBankRecord[] = [];
      for (const b of combined) {
        const key = `${b.country_code || b.country}-${b.code}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(b);
        }
      }
      memoryCache = deduped;
      memoryCacheTimestamp = now;
      return deduped;
    }
  } catch (err) {
    console.warn("[PaystackBanks] Error fetching live worldwide bank directory, using bundled directory:", err);
  }

  return WORLDWIDE_BANKS_CACHE;
}

export interface CountryAccountSpec {
  minLen: number;
  maxLen: number;
  label: string;
  placeholder: string;
  allowAlphanumeric: boolean;
  description: string;
}

export function getCountryAccountSpec(countryIdOrCode?: string): CountryAccountSpec {
  const norm = (countryIdOrCode || "").toLowerCase().trim();
  if (norm === "nigeria" || norm === "ng") {
    return {
      minLen: 10,
      maxLen: 10,
      label: "10-Digit NUBAN Account Number",
      placeholder: "e.g. 0123456789",
      allowAlphanumeric: false,
      description: "Nigerian NUBAN bank account number (exactly 10 digits).",
    };
  }
  if (norm === "south africa" || norm === "za") {
    return {
      minLen: 7,
      maxLen: 11,
      label: "South Africa Bank Account Number",
      placeholder: "e.g. 123456789",
      allowAlphanumeric: false,
      description: "South African settlement account number (7 to 11 digits).",
    };
  }
  if (norm === "ghana" || norm === "gh") {
    return {
      minLen: 10,
      maxLen: 16,
      label: "Ghana Bank Account Number",
      placeholder: "e.g. 0123456789012",
      allowAlphanumeric: false,
      description: "Ghanaian bank account number (10 to 16 digits, typically 13 digits).",
    };
  }
  if (norm === "kenya" || norm === "ke") {
    return {
      minLen: 10,
      maxLen: 14,
      label: "Kenya Bank Account Number",
      placeholder: "e.g. 0123456789012",
      allowAlphanumeric: false,
      description: "Kenyan bank account number (10 to 14 digits).",
    };
  }
  if (norm === "rwanda" || norm === "rw") {
    return {
      minLen: 10,
      maxLen: 16,
      label: "Rwanda Bank Account Number",
      placeholder: "e.g. 0123456789012345",
      allowAlphanumeric: false,
      description: "Rwandan bank account number (10 to 16 digits).",
    };
  }
  if (norm === "cote d'ivoire" || norm === "ci") {
    return {
      minLen: 10,
      maxLen: 24,
      label: "Côte d'Ivoire Account Number / RIB",
      placeholder: "e.g. CI0012345678901234567890",
      allowAlphanumeric: true,
      description: "Ivorian bank account number or RIB (10 to 24 characters).",
    };
  }
  if (norm === "egypt" || norm === "eg") {
    return {
      minLen: 10,
      maxLen: 29,
      label: "Egypt Bank Account Number / IBAN",
      placeholder: "e.g. EG001234567890123456789012345",
      allowAlphanumeric: true,
      description: "Egyptian bank account number or IBAN (10 to 29 characters).",
    };
  }
  return {
    minLen: 6,
    maxLen: 30,
    label: "Settlement Bank Account Number",
    placeholder: "e.g. Account Number or IBAN",
    allowAlphanumeric: true,
    description: "Settlement bank account number (6 to 30 characters).",
  };
}

