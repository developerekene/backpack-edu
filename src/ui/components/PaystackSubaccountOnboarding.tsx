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
  Banknote,
  HelpCircle,
  Edit3,
  Lock,
} from "lucide-react";
import { PaystackSubaccount } from "../../types";

interface BankOption {
  name: string;
  code: string;
  country?: string;
}

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
  const currentSubaccount: PaystackSubaccount | undefined = isOrg
    ? myOrg?.paystackSubaccount
    : currentUser?.paystackSubaccount;

  const [isEditing, setIsEditing] = useState(!currentSubaccount);

  // Form State
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [selectedBankCode, setSelectedBankCode] = useState(
    currentSubaccount?.bank_code || "",
  );
  const [selectedBankName, setSelectedBankName] = useState(
    currentSubaccount?.bank_name || "",
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
  const [providerPercentage, setProviderPercentage] = useState<number>(
    currentSubaccount?.percentage_charge || 90,
  );

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

  // Fetch Banks
  useEffect(() => {
    const fetchBanks = async () => {
      setLoadingBanks(true);
      try {
        const res = await fetch("/api/paystack/banks?country=nigeria");
        if (res.ok) {
          const json = await res.json();
          if (json.banks) {
            setBanks(json.banks);
            if (!selectedBankCode && json.banks.length > 0) {
              setSelectedBankCode(json.banks[0].code);
              setSelectedBankName(json.banks[0].name);
            }
          }
        }
      } catch (err) {
        console.error("Error loading banks:", err);
      } finally {
        setLoadingBanks(false);
      }
    };

    fetchBanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const res = await fetch(
        `/api/paystack/resolve-account?account_number=${accountNumber}&bank_code=${selectedBankCode}`,
      );
      const json = await res.json();
      if (json.success && json.account_name) {
        setResolvedAccountName(json.account_name);
      } else {
        setResolutionError(
          json.message ||
            "Unable to verify bank account. Please check details.",
        );
      }
    } catch (err) {
      console.error("Resolve account error:", err);
      setResolutionError("Failed to connect to account verification service.");
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
      setSubaccountError("Business / Provider name is required.");
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        business_name: businessName.trim(),
        settlement_bank: selectedBankCode,
        account_number: accountNumber.trim(),
        percentage_charge: providerPercentage,
        description: `Backpack Provider split subaccount for ${businessName}`,
        primary_contact_email: currentUser?.email,
        primary_contact_name: currentUser?.name,
      };

      const res = await fetch("/api/paystack/subaccount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json.success && json.subaccount_code) {
        const newSubaccountData: PaystackSubaccount = {
          subaccount_code: json.subaccount_code,
          business_name: businessName.trim(),
          bank_code: selectedBankCode,
          bank_name:
            selectedBankName ||
            banks.find((b) => b.code === selectedBankCode)?.name ||
            "Settlement Bank",
          account_number: accountNumber.trim(),
          account_name:
            resolvedAccountName || json.account_name || businessName.trim(),
          percentage_charge: providerPercentage,
          is_verified: true,
          updatedAt: new Date().toISOString(),
        };

        // Save to Database
        if (isOrg && myOrg) {
          await updateOrganization(myOrg.id, {
            paystackSubaccount: newSubaccountData,
          });
        } else if (currentUser) {
          await updateCurrentUser({ paystackSubaccount: newSubaccountData });
        }

        setSuccessMessage(
          `Subaccount ${json.subaccount_code} successfully registered! Payments will now be automatically split upon student checkout.`,
        );
        setIsEditing(false);
      } else {
        setSubaccountError(
          json.message || "Failed to create Paystack subaccount.",
        );
      }
    } catch (err: unknown) {
      console.error("Subaccount registration error:", err);
      setSubaccountError("Network error while creating subaccount.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs mb-1">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[11px] font-bold uppercase tracking-wider">
              Paystack Split Payments
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Provider Payout & Bank Subaccount
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
            Connect your bank account to automatically receive direct payouts
            for course enrollments and installments.
          </p>
        </div>

        {currentSubaccount && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition self-start sm:self-auto"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Update Bank Details</span>
          </button>
        )}
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

      {/* Active Subaccount Card Display */}
      {currentSubaccount && !isEditing ? (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 border border-slate-700 shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Banknote className="w-48 h-48 text-indigo-400" />
          </div>

          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="inline-flex items-center px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Active Payout
                Subaccount
              </span>
              <h3 className="text-xl font-bold text-white pt-2">
                {currentSubaccount.business_name}
              </h3>
              <p className="text-xs text-slate-300 font-mono">
                Code: {currentSubaccount.subaccount_code}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Provider Split Share
              </span>
              <span className="text-2xl font-black text-emerald-400">
                {currentSubaccount.percentage_charge}%
              </span>
              <span className="text-[10px] text-slate-400 block">
                ({100 - currentSubaccount.percentage_charge}% Platform Fee)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-700/80 text-xs">
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Settlement Bank
              </span>
              <span className="font-bold text-white text-sm">
                {currentSubaccount.bank_name || "Bank"}
              </span>
            </div>

            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Account Number
              </span>
              <span className="font-mono font-bold text-white text-sm">
                **** {currentSubaccount.account_number.slice(-4)}
              </span>
            </div>

            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Account Holder Name
              </span>
              <span className="font-bold text-emerald-300 text-sm truncate block">
                {currentSubaccount.account_name ||
                  currentSubaccount.business_name}
              </span>
            </div>
          </div>

          <div className="bg-indigo-500/20 border border-indigo-500/30 p-3 rounded-xl text-indigo-200 text-[11px] flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              Automatic Split Active: When students enroll in courses, Paystack
              divides the payment at checkout and settles{" "}
              {currentSubaccount.percentage_charge}% straight to this bank
              account!
            </span>
          </div>
        </div>
      ) : (
        /* Setup / Registration Form */
        <form onSubmit={handleRegisterSubaccount} className="space-y-6">
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 flex items-start space-x-3">
            <HelpCircle className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">How Split Payouts Work</p>
              <p className="mt-0.5 text-slate-600 dark:text-indigo-300">
                Provide your official bank account details below. We generate a
                verified Paystack Subaccount code (`ACCT_...`) so student
                tuition payments are automatically split. Your provider share
                goes straight into your bank account on standard payout
                schedules.
              </p>
            </div>
          </div>

          {subaccountError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-xl flex items-center space-x-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{subaccountError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Business / Provider Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Provider / Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Harvard Business School or Prof. Jane Doe"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Official name displayed on Paystack receipts
              </p>
            </div>

            {/* Bank Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Settlement Bank <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedBankCode}
                onChange={handleBankChange}
                disabled={loadingBanks}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {loadingBanks ? (
                  <option value="">Loading supported banks...</option>
                ) : (
                  banks.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* NUBAN Account Number & Resolve */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                10-Digit Account Number (NUBAN){" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value.replace(/\D/g, ""));
                    setResolvedAccountName("");
                    setResolutionError("");
                  }}
                  placeholder="e.g. 0123456789"
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleResolveAccount}
                  disabled={resolvingAccount || accountNumber.length < 10}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-slate-900 dark:text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 flex-shrink-0"
                >
                  {resolvingAccount ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verify Account Name</span>
                    </>
                  )}
                </button>
              </div>

              {resolvedAccountName && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 p-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>
                    Verified Account Name:{" "}
                    <strong className="uppercase">{resolvedAccountName}</strong>
                  </span>
                </div>
              )}

              {resolutionError && (
                <p className="text-xs font-medium text-red-500 flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" /> {resolutionError}
                </p>
              )}
            </div>

            {/* Provider Revenue Split Share */}
            <div className="md:col-span-2 space-y-2 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-800 dark:text-white">
                  Provider Revenue Share Split
                </label>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                  {providerPercentage}% Provider / {100 - providerPercentage}%
                  Platform Fee
                </span>
              </div>

              <input
                type="range"
                min={70}
                max={98}
                step={1}
                value={providerPercentage}
                onChange={(e) => setProviderPercentage(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>70% Minimum</span>
                <span>90% Standard (Recommended)</span>
                <span>98% Maximum</span>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                💡 Example: On a ₦100,000 tuition fee payment, ₦
                {((100000 * providerPercentage) / 100).toLocaleString()} goes
                directly to your bank account, and ₦
                {((100000 * (100 - providerPercentage)) / 100).toLocaleString()}{" "}
                goes to platform administration.
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            {currentSubaccount && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white dark:text-white text-xs font-extrabold rounded-xl transition shadow-md flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Registering Subaccount...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Register Paystack Subaccount</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
