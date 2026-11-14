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
  const res = await centralApiClient(`/api/paystack/verify/${encodeURIComponent(reference)}`);
  return res.json();
}

export interface CreatePayrollSplitGroupParams {
  name: string;
  type: "flat" | "percentage";
  currency: string;
  bearer_type: "all-proportional" | "all" | "subaccount";
  bearer_subaccount?: string;
  subaccounts: Array<{
    subaccount: string;
    share: number;
  }>;
}

export async function createPayrollSplitGroup(params: CreatePayrollSplitGroupParams) {
  const res = await centralApiClient("/api/paystack/payroll/split-group", {
    method: "POST",
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok || !json.success || !json.split_code) {
    throw new Error(json.message || json.detail?.message || "Failed to create Paystack transaction split group.");
  }
  return json as {
    success: true;
    id?: number | string;
    split_code: string;
    name: string;
    type: string;
    currency: string;
    bearer_type: string;
    subaccounts: Array<{ subaccount: string; share: number }>;
  };
}

export async function updatePayrollSplitGroup(
  splitId: string | number,
  params: {
    name?: string;
    active?: boolean;
    bearer_type?: "all-proportional" | "all" | "subaccount";
    bearer_subaccount?: string;
    subaccounts?: Array<{ subaccount: string; share: number }>;
  }
) {
  const res = await centralApiClient(`/api/paystack/payroll/split-group/${encodeURIComponent(String(splitId))}`, {
    method: "PUT",
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to update Paystack split group.");
  }
  return json;
}

export interface InitializePayrollParams {
  paymentType: "individual" | "group";
  email: string;
  amount: number;
  currency: string;
  subaccount_code?: string;
  split_code?: string;
  recipients?: Array<{
    subaccount_code: string;
    amount: number;
    share?: number;
  }>;
  bearer_type?: "all-proportional" | "all" | "subaccount";
  bearer_subaccount?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export async function initializePayrollTransaction(params: InitializePayrollParams) {
  const res = await centralApiClient("/api/paystack/payroll/initialize", {
    method: "POST",
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok || !json.success || (!json.access_code && !json.authorization_url)) {
    throw new Error(json.message || json.detail?.message || "Unable to initialize salary checkout with Paystack.");
  }
  return json as {
    success: true;
    authorization_url?: string;
    access_code?: string;
    reference: string;
    split_code?: string;
    subaccount_code?: string;
    mode: "live";
  };
}

