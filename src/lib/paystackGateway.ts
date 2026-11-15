/**
 * @file paystackGateway.ts
 * Paystack Integration Gateway for Subaccounts, Split Payments, and NUBAN Verification
 * Designed for Firebase Hosting (*.web.app) and Production Custom Domains.
 */

import { centralApiClient } from "./centralApiClient";
import type { PayrollSalaryBreakdown } from "../types";
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
  throw new Error(json.message || json.detail?.message || "Unable to verify bank account details. Please check the account number and bank.");
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
    throw new Error(json.detail?.message || json.message || "Unable to save payout bank account.");
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
  bearer_type: "all-proportional" | "subaccount";
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
    throw new Error(json.message || json.detail?.message || "Failed to create payroll payout group.");
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
    bearer_type?: "all-proportional" | "subaccount";
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
    throw new Error(json.message || "Failed to update payroll payout group.");
  }
  return json;
}

export interface DynamicPayrollSplitPayload {
  type: "flat" | "percentage";
  bearer_type: "all-proportional" | "subaccount";
  bearer_subaccount?: string;
  subaccounts: Array<{
    subaccount: string;
    share: number;
  }>;
}

export interface InitializePayrollParams {
  paymentType: "individual" | "group";
  paymentChannel?: "checkout" | "bank_transfer";
  email: string;
  organizationName?: string;
  orgId?: string;
  payPeriod?: string;
  amount: number;
  currency: string;
  subaccount_code?: string;
  split_code?: string;
  split?: DynamicPayrollSplitPayload;
  feePerStaff?: number;
  recipients?: Array<{
    instructorId?: string;
    instructorName?: string;
    instructorEmail?: string;
    roleTitle?: string;
    subaccount_code: string;
    bankName?: string;
    accountNumber?: string;
    amount: number;
    share?: number;
    breakdown?: PayrollSalaryBreakdown;
  }>;
  bearer_type?: "all-proportional" | "subaccount";
  bearer_subaccount?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface InitializePayrollResponse {
  success: true;
  paymentChannel: "checkout" | "bank_transfer";
  authorization_url?: string;
  access_code?: string;
  reference: string;
  split_code?: string;
  splitMode?: "dynamic_split" | "split_group" | "single_subaccount";
  instructorSplits?: Array<{
    subaccount: string;
    share: number;
    amount: number;
  }>;
  subaccount_code?: string;
  netSalariesTotal?: number;
  platformFee?: number;
  grandTotal?: number;
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
  mode: "live";
}

export async function initializePayrollTransaction(
  params: InitializePayrollParams,
): Promise<InitializePayrollResponse> {
  const res = await centralApiClient("/api/paystack/payroll/initialize", {
    method: "POST",
    body: JSON.stringify(params),
  });
  const json = await res.json();
  const hasCheckout = Boolean(json.access_code || json.authorization_url);
  const hasTransfer = Boolean(json.dedicatedAccount?.accountNumber);
  if (!res.ok || !json.success || (!hasCheckout && !hasTransfer)) {
    throw new Error(
      json.message ||
        json.detail?.message ||
        "Unable to start salary payment checkout.",
    );
  }
  return json as InitializePayrollResponse;
}

export async function checkPayrollRunStatus(reference: string) {
  const res = await centralApiClient(
    `/api/paystack/payroll/status/${encodeURIComponent(reference)}`,
  );
  const json = await res.json().catch(() => ({}));
  return json as {
    success?: boolean;
    status?: "initialized" | "success" | "failed";
    webhookConfirmed?: boolean;
    paidAt?: string;
    splitCode?: string;
    settlementSchedule?: string;
    payslips?: Array<{
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
      breakdown?: PayrollSalaryBreakdown;
      payPeriod?: string;
      settlementSchedule: string;
      issuedAt: string;
      paidAt: string;
      verifiedVia: "webhook" | "verification" | "checkout";
    }>;
  };
}

export async function issuePayrollPayslips(params: {
  reference: string;
  orgId: string;
  organizationName: string;
  payerEmail: string;
  currency: string;
  payPeriod?: string;
  paidAt?: string;
  recipients: Array<{
    instructorId: string;
    instructorName: string;
    instructorEmail?: string;
    roleTitle?: string;
    subaccount_code: string;
    bankName?: string;
    accountNumber?: string;
    amount: number;
    breakdown?: PayrollSalaryBreakdown;
  }>;
}) {
  const res = await centralApiClient("/api/paystack/payroll/issue-payslips", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return res.json();
}

