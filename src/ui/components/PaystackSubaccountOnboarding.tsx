import React, { useState, useEffect } from "react";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  CreditCard,
  ArrowRight,
  HelpCircle,
  Edit3,
  Lock,
  Building2,
} from "lucide-react";
import { PaystackSubaccount } from "../../types";
import { ProviderRevenueBreakdownVisualizer } from "./ProviderRevenueBreakdownVisualizer";
import { apiClient } from "../../lib/apiClient";

interface BankOption {
  name: string;
  code: string;
  country?: string;
  country_code?: string;
  currency?: string;
}

const FALLBACK_BANKS: BankOption[] = [
  { name: "Guaranty Trust Bank (GTBank)", code: "058", country: "Nigeria", country_code: "NG", currency: "NGN" },
  { name: "Access Bank", code: "044", country: "Nigeria", country_code: "NG", currency: "NGN" },
  { name: "Zenith Bank", code: "057", country: "Nigeria", country_code: "NG", currency: "NGN" },
  { name: "United Bank for Africa (UBA)", code: "033", country: "Nigeria", country_code: "NG", currency: "NGN" },
  { name: "First Bank of Nigeria", code: "011", country: "Nigeria", country_code: "NG", currency: "NGN" },
  { name: "Kuda Bank", code: "50211", country: "Nigeria", country_code: "NG", currency: "NGN" },
  { name: "Moniepoint MFB", code: "50515", country: "Nigeria", country_code: "NG", currency: "NGN" },
  { name: "OPay Digital Services", code: "999992", country: "Nigeria", country_code: "NG", currency: "NGN" },
  { name: "Fidelity Bank", code: "070", country: "Nigeria", country_code: "NG", currency: "NGN" },
  { name: "Stanbic IBTC Bank", code: "221", country: "Nigeria", country_code: "NG", currency: "NGN" },
];

export const PaystackSubaccountOnboarding: React.FC = () => {
  const { currentUser, updateCurrentUser } = useAuth();
  const { organizations, updateOrganization } = useAppContext();

  // Determine current provider entity (Organization or Instructor)
  const isOrg = currentUser?.role === "organization";
  const myOrg = isOrg
    ? organizations.find(
        (o) => o.ownerId === currentUser.id || o.id === currentUser.id,
      )
    : null;

  const [savedSubaccount, setSavedSubaccount] = useState<PaystackSubaccount | undefined>(undefined);

  const currentSubaccount = savedSubaccount || myOrg?.paystackSubaccount || currentUser?.paystackSubaccount;

  const [isEditing, setIsEditing] = useState(!currentSubaccount);

  // Form State
  const [banks, setBanks] = useState<BankOption[]>(FALLBACK_BANKS);
  const [selectedBankCode, setSelectedBankCode] = useState(
    currentSubaccount?.bank_code || "058",
  );
  const [selectedBankName, setSelectedBankName] = useState(
    currentSubaccount?.bank_name || "Guaranty Trust Bank (GTBank)",
  );
  const [accountNumber, setAccountNumber] = useState(
    currentSubaccount?.account_number || "",
  );
  const [businessName, setBusinessName] = useState(
    currentSubaccount?.business_name ||
      (isOrg
        ? myOrg?.name || currentUser?.name || ""
        : currentUser?.name || ""),
  );

  // Paystack Subaccount Split Allocation (85% to subaccount, 15% to main account)
  const subaccountSharePercent = 85;

  // Account Resolution state
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [resolvedAccountName, setResolvedAccountName] = useState(
    currentSubaccount?.account_name || "",
  );
  const [resolutionError, setResolutionError] = useState("");

  // Subaccount Creation state
  const [submitting, setSubmitting] = useState(false);
  const [subaccountError, setSubaccountError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [verifyingLiveStatus, setVerifyingLiveStatus] = useState<boolean>(false);
  const [liveVerificationNotice, setLiveVerificationNotice] = useState<{
    isVerified: boolean;
    message: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any;
  } | null>(null);

  // Secret Key Config state
  const [secretKeyInput, setSecretKeyInput] = useState("");
  const [keyConfigStatus, setKeyConfigStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [showKeyConfig, setShowKeyConfig] = useState(false);

  const handleConfigureKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKeyInput.trim().startsWith("sk_")) {
      setKeyConfigStatus({ success: false, message: "Key must start with 'sk_live_' or 'sk_test_'." });
      return;
    }
    try {
      const res = await apiClient("/api/paystack/configure-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey: secretKeyInput.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setKeyConfigStatus({ success: true, message: `Secret key configured successfully (${json.maskedKey})!` });
        setSecretKeyInput("");
      } else {
        setKeyConfigStatus({ success: false, message: json.message || "Failed to configure key." });
      }
    } catch {
      setKeyConfigStatus({ success: false, message: "Network error configuring key." });
    }
  };

  // Verify Live Status of Subaccount directly with Paystack API
  const handleVerifyLiveStatus = async (codeToVerify?: string) => {
    const targetCode = codeToVerify || currentSubaccount?.subaccount_code;
    if (!targetCode) return;

    setVerifyingLiveStatus(true);
    setLiveVerificationNotice(null);

    try {
      const res = await apiClient(`/api/paystack/subaccount/${encodeURIComponent(targetCode)}`);
      const json = await res.json();

      if (res.ok && json.success && json.subaccount) {
        setLiveVerificationNotice({
          isVerified: true,
          message:
            json.notice ||
            `Subaccount ${targetCode} is verified and active on Paystack! Settlement Bank: ${json.subaccount.settlement_bank || currentSubaccount?.bank_name}, Account: ****${String(json.subaccount.account_number || currentSubaccount?.account_number || "").slice(-4)}.`,
          details: json.subaccount,
        });
      } else {
        setLiveVerificationNotice({
          isVerified: false,
          message: json.message || `Subaccount ${targetCode} could not be confirmed on Paystack.`,
        });
      }
    } catch {
      setLiveVerificationNotice({
        isVerified: false,
        message: "Failed to connect to Paystack live status check.",
      });
    } finally {
      setVerifyingLiveStatus(false);
    }
  };

  // Fetch All Banks available on Paystack with fallback
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await apiClient("/api/paystack/banks?country=all");
        if (res.ok) {
          const json = await res.json();
          if (json.banks && json.banks.length > 0) {
            const rawBanks: BankOption[] = json.banks;
            const uniqueBanksMap = new Map<string, BankOption>();
            for (const b of rawBanks) {
              const code = String(b.code || "").trim();
              const key = `${b.country_code || b.country || "all"}-${code}`;
              if (code && !uniqueBanksMap.has(key)) {
                uniqueBanksMap.set(key, b);
              }
            }
            const dedupedBanks = Array.from(uniqueBanksMap.values());
            if (dedupedBanks.length > 0) {
              setBanks(dedupedBanks);
            }
          }
        }
      } catch (err) {
        console.warn("Error loading banks from proxy, using built-in bank directory:", err);
      }
    };

    fetchBanks();
  }, []);

  // Handle Bank Selection Change
  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedBankCode(code);
    const found = banks.find((b) => b.code === code);
    if (found) setSelectedBankName(found.name);
    setResolvedAccountName("");
    setResolutionError("");
  };

  // Resolve Bank Account
  const handleResolveAccount = async () => {
    if (!accountNumber || accountNumber.length < 10) {
      setResolutionError("Please enter a valid 10-digit NUBAN account number.");
      return;
    }
    if (!selectedBankCode) {
      setResolutionError("Please select a settlement bank.");
      return;
    }

    setResolvingAccount(true);
    setResolutionError("");
    setResolvedAccountName("");

    try {
      const res = await apiClient(
        `/api/paystack/resolve-account?account_number=${accountNumber}&bank_code=${selectedBankCode}`,
      );
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        json = {
          success: false,
          message: "Account resolution service returned a non-JSON error. You can enter your account name directly.",
          requiresManualName: true,
        };
      }

      if (json.success && json.account_name) {
        setResolvedAccountName(String(json.account_name));
        setResolutionError("");
      } else {
        // Do not auto-populate name if resolution failed to avoid incorrect bank account matching
        setResolvedAccountName(""); 
        setResolutionError(
          String(json.message || "Unable to auto-resolve account name. Please verify or type your account holder name below."),
        );
      }
    } catch {
      setResolvedAccountName(""); 
      setResolutionError("Network error during resolution. You can enter your account holder name directly below.");
    } finally {
      setResolvingAccount(false);
    }
  };

  // Register / Save Paystack Subaccount
  const handleRegisterSubaccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubaccountError("");
    setSuccessMessage("");

    if (!accountNumber || accountNumber.length < 10) {
      setSubaccountError("Account number must be 10 digits.");
      setSubmitting(false);
      return;
    }
    if (!businessName.trim()) {
      setSubaccountError("Business / Organization name is required.");
      setSubmitting(false);
      return;
    }

    try {
      const selectedBankObj = banks.find((b) => b.code === selectedBankCode);
      const payload = {
        business_name: businessName.trim(),
        settlement_bank: selectedBankCode,
        account_number: accountNumber.trim(),
        percentage_charge: subaccountSharePercent,
        description: `Backpack Vendor Subaccount for ${businessName}`,
        primary_contact_email: currentUser?.email,
        primary_contact_name: currentUser?.name,
      };

      const res = await apiClient("/api/paystack/subaccount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        json = { success: false, message: "Subaccount creation service returned invalid response format." };
      }

      if (json.success && json.subaccount_code) {
        const subCode = String(json.subaccount_code);
        const modeCreated: "test" | "live" = (json.mode as "test" | "live") || "test";
        const newSubaccountData: PaystackSubaccount = {
          subaccount_code: subCode,
          business_name: businessName.trim(),
          bank_code: selectedBankCode,
          bank_name:
            selectedBankName ||
            selectedBankObj?.name ||
            "Settlement Bank",
          country: selectedBankObj?.country || "Nigeria",
          currency: selectedBankObj?.currency || "NGN",
          account_number: accountNumber.trim(),
          account_name: resolvedAccountName || businessName.trim(),
          percentage_charge: subaccountSharePercent,
          is_verified: true,
          mode: modeCreated,
          updatedAt: new Date().toISOString(),
        };

        setSavedSubaccount(newSubaccountData);

        if (isOrg && myOrg) {
          await updateOrganization(myOrg.id, {
            paystackSubaccount: newSubaccountData,
          });
        }
        if (currentUser) {
          await updateCurrentUser({ paystackSubaccount: newSubaccountData });
        }

        setSuccessMessage(
          `Official Paystack subaccount (${json.subaccount_code}) generated and connected successfully! Payouts will settle automatically into your bank account.`,
        );
        setIsEditing(false);
      } else {
        setSubaccountError(
          typeof json.message === "string"
            ? json.message
            : "Unable to generate Paystack subaccount. Please verify your details or check your internet connection.",
        );
      }
    } catch (err) {
      console.error("Save subaccount error:", err);
      setSubaccountError(
        "Network error saving Paystack subaccount. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Direct Bank Settlement</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Provider Payout & Bank Settlement
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
            Connect your local bank account to automatically receive 100% direct settlements
            of your tuition fees. The 15% platform fee is added automatically for students.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto flex-wrap gap-2">
          {currentSubaccount && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Update Bank Details</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 p-4 rounded-xl flex items-start space-x-3 text-xs font-medium animate-in fade-in-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm">Paystack Subaccount Connected!</p>
            <p className="mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {currentSubaccount && !isEditing ? (
        /* Connected / Active State View */
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-md">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {currentSubaccount.business_name}
                    </h3>
                    <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center space-x-1 border border-emerald-300 dark:border-emerald-700">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Verified Subaccount</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Settlement Bank:{" "}
                    <strong>{currentSubaccount.bank_name}</strong> &bull;
                    Account:{" "}
                    <strong>
                      &bull;&bull;&bull;&bull;{" "}
                      {currentSubaccount.account_number.slice(-4)}
                    </strong>{" "}
                    ({currentSubaccount.account_name})
                  </p>
                  <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                    Paystack Code: {currentSubaccount.subaccount_code}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => handleVerifyLiveStatus()}
                  disabled={verifyingLiveStatus}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${verifyingLiveStatus ? "animate-spin" : ""}`}
                  />
                  <span>
                    {verifyingLiveStatus ? "Verifying..." : "Verify on Paystack"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                >
                  Edit Bank Details
                </button>
              </div>
            </div>

            {/* Live Verification Notice */}
            <div className="mt-4 pt-4 border-t border-emerald-200/60 dark:border-emerald-800/40">
              {liveVerificationNotice ? (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                    liveVerificationNotice.isVerified
                      ? "bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200"
                      : "bg-rose-100/80 dark:bg-rose-900/40 text-rose-900 dark:text-rose-200"
                  }`}
                >
                  {liveVerificationNotice.isVerified ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span>{liveVerificationNotice.message}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Automated Split Payouts Active: 85% of each payment settles directly into your bank account. Our main account (15%) absorbs all Paystack fees so you get 100% of your money.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Setup / Registration Form */
        <div className="space-y-6">

          <form onSubmit={handleRegisterSubaccount} className="space-y-6">

            {subaccountError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-xl flex items-center space-x-2 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{subaccountError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Business / Organization Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Business / Organization / Provider Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Coding Academy"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Settlement Bank */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Settlement Bank <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedBankCode}
                  onChange={handleBankChange}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  {banks.map((b, idx) => (
                    <option key={`bank-${b.code}-${idx}`} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  10-Digit Account Number (NUBAN) <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 0123456789"
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleResolveAccount}
                    disabled={resolvingAccount || accountNumber.length < 10}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shrink-0 cursor-pointer"
                  >
                    {resolvingAccount ? "Verifying..." : "Verify Name"}
                  </button>
                </div>
                {resolutionError && (
                  <div className="text-amber-600 dark:text-amber-400 text-[11px] mt-1">
                    {resolutionError}
                  </div>
                )}
              </div>

              {/* Account Holder Legal Name */}
              <div className="md:col-span-2 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 p-4 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Account Holder Legal Name <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500">
                    Auto-verified or enter exact name on bank statement
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={resolvedAccountName}
                  onChange={(e) => setResolvedAccountName(e.target.value)}
                  placeholder="e.g. John Doe / Apex Coding Academy Ltd"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white uppercase font-bold focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-500">
                  This account name should be the same with what is on the bank account.
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              {currentSubaccount && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition shadow-md flex items-center space-x-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Calling Paystack API...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Create on Paystack</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Provider Revenue Split Details & Visualizer at the bottom */}
      <ProviderRevenueBreakdownVisualizer
        subaccountCode={currentSubaccount?.subaccount_code}
        bankName={currentSubaccount?.bank_name || selectedBankName}
        accountNumber={currentSubaccount?.account_number || accountNumber}
      />
    </div>
  );
};
