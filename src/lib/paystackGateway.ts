/**
 * @file paystackGateway.ts
 * Paystack Integration Gateway for Subaccounts, Split Payments, and NUBAN Verification
 * Designed for Firebase Hosting (*.web.app) and Production Custom Domains.
 */

import { centralApiClient } from "./centralApiClient";
import { fetchAllWorldwideBanks } from "./paystackBanks";

export interface BankItem {
  id: number | string;
  name: string;
  code: string;
  slug?: string;
  country?: string;
  country_code?: string;
  country_id?: string;
  currency?: string;
  type?: string;
}

export interface ResolveAccountResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
    bank_id?: number;
  };
}

/**
 * 1. Fetch live worldwide bank codes from Paystack.
 * Supports all 7 Paystack operating countries (Nigeria, Ghana, Kenya, South Africa, Côte d'Ivoire, Egypt, Rwanda).
 */
export async function getPaystackBanks(country: string = "all"): Promise<BankItem[]> {
  try {
    const banks = await fetchAllWorldwideBanks(country);
    return banks as BankItem[];
  } catch (err) {
    console.warn("[paystackGateway] Error fetching banks via worldwide service:", err);
    const fallback = await fetchAllWorldwideBanks("all");
    return fallback as BankItem[];
  }
}

/**
 * 2. Real NUBAN Account Verification
 */
export async function resolveBankAccount(
  accountNumber: string,
  bankCode = "001",
  country = "nigeria",
  currency = "NGN"
): Promise<string> {
  const cleanAccount = accountNumber.trim();
  const cleanBank = bankCode.trim() || "001";
  const cleanCountry = country.trim().toLowerCase().replace(/\s+/g, "_") || "nigeria";
  const cleanCurrency = currency.trim().toUpperCase() || "NGN";

  const res = await centralApiClient(
    `/api/bank/resolve?account_number=${encodeURIComponent(cleanAccount)}&bank_code=${encodeURIComponent(cleanBank)}&country=${encodeURIComponent(cleanCountry)}&currency=${encodeURIComponent(cleanCurrency)}`
  );
  const json = await res.json();
  const accountName = json.account_name || json.data?.account_name;
  if ((json.status || json.success) && accountName) {
    return String(accountName);
  }
  throw new Error(json.message || json.detail?.message || "Unable to resolve bank account details from Paystack.");
}

/**
 * 3. Create a Paystack Subaccount for instructors / providers
 */
export async function createSubaccount(params: {
  business_name: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number;
  mode?: "test" | "live";
}) {
  const res = await centralApiClient("/api/subaccount", {
    method: "POST",
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok || !(json.status ?? json.success ?? true)) {
    throw new Error(json.detail?.message || json.message || "Failed to create Paystack subaccount");
  }
  return json.data || json;
}

/**
 * 4. Verify a transaction by reference
 */
export async function verifyTransaction(reference: string) {
  const res = await centralApiClient(`/api/transaction/verify/${encodeURIComponent(reference)}`);
  return res.json();
}
