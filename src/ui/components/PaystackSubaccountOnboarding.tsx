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

  const [savedSubaccount, setSavedSubaccount] = useState<PaystackSubaccount | undefined>(undefined);

  const currentSubaccount = savedSubaccount || myOrg?.paystackSubaccount || currentUser?.paystackSubaccount;

  const [isEditing, setIsEditing] = useState(!currentSubaccount);

  // Form State
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
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

  // Standard 15% platform fee
  const platformFeePercent = 15;

  // Account Resolution state
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [resolvedAccountName, setResolvedAccountName] = useState(
    currentSubaccount?.account_name || "",
  );
  const [resolutionError, setResolutionError] = useState("");
  const [showManualNameInput, setShowManualNameInput] = useState(false);

  // Subaccount Creation state
  const [submitting, setSubmitting] = useState(false);
  const [subaccountError, setSubaccountError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Connection Mode: 'create' (create new via Paystack API) or 'link' (link existing official ACCT_... code)
  const [connectionMode, setConnectionMode] = useState<"create" | "link">("create");
  const [manualSubaccountCode, setManualSubaccountCode] = useState<string>(
    currentSubaccount?.subaccount_code || "",
  );
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
      const res = await fetch("/api/paystack/configure-key", {
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
      const res = await fetch(`/api/paystack/subaccount/${encodeURIComponent(targetCode)}`);
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

  // Link Existing Official Paystack Subaccount Code
  const handleLinkExistingSubaccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = manualSubaccountCode.trim().toUpperCase();

    if (!cleanCode || !cleanCode.startsWith("ACCT_")) {
      setSubaccountError("Please enter a valid Paystack subaccount code starting with 'ACCT_' (e.g. ACCT_1a2b3c4d5e).");
      return;
    }
    if (!businessName.trim()) {
      setSubaccountError("Please enter your registered Business / Organization name.");
      return;
    }

    setSubmitting(true);
    setSubaccountError("");
    setSuccessMessage("");

    try {
      let bankCode = selectedBankCode;
      let bankName = selectedBankName;
      let accNum = accountNumber.trim();
      let bName = businessName.trim();
      let accName = resolvedAccountName || bName;

      let isLiveVerified = cleanCode.startsWith("ACCT_live_");
      let modeVerified: "test" | "live" = isLiveVerified ? "live" : "test";

      try {
        const verifyRes = await fetch(`/api/paystack/subaccount/${encodeURIComponent(cleanCode)}`);
        const verifyJson = await verifyRes.json();
        if (verifyRes.ok && verifyJson.success && verifyJson.subaccount) {
          const pSub = verifyJson.subaccount;
          if (pSub.settlement_bank) {
            bankCode = pSub.settlement_bank;
            bankName = banks.find((b) => b.code === pSub.settlement_bank)?.name || pSub.settlement_bank;
          }
          if (pSub.account_number) accNum = pSub.account_number;
          if (pSub.account_name) accName = pSub.account_name;
          if (pSub.business_name) bName = pSub.business_name;
          if (pSub.is_live !== undefined) isLiveVerified = Boolean(pSub.is_live);
          if (pSub.mode) modeVerified = pSub.mode;
        }
      } catch (checkErr) {
        console.warn("Direct Paystack lookup notice:", checkErr);
      }

      const linkedSubaccountData: PaystackSubaccount = {
        subaccount_code: cleanCode,
        business_name: bName,
        bank_code: bankCode || selectedBankCode,
        bank_name: bankName || selectedBankName,
        account_number: accNum || accountNumber.trim() || "0000000000",
        account_name: accName,
        percentage_charge: platformFeePercent,
        is_verified: true,
        is_live: isLiveVerified,
        mode: modeVerified,
        updatedAt: new Date().toISOString(),
      };

      setSavedSubaccount(linkedSubaccountData);

      if (isOrg && myOrg) {
        await updateOrganization(myOrg.id, {
          paystackSubaccount: linkedSubaccountData,
        });
      }
      if (currentUser) {
        await updateCurrentUser({ paystackSubaccount: linkedSubaccountData });
      }

      setSuccessMessage(
        `Official Paystack Subaccount ${cleanCode} connected! 100% of course tuition will be split and settled directly to your bank account upon student checkout.`
      );
      setIsEditing(false);
    } catch (err) {
      console.error("Link subaccount error:", err);
      setSubaccountError("Network error while connecting subaccount.");
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch Banks
  useEffect(() => {
    const fetchBanks = async () => {
      setLoadingBanks(true);
      try {
        const res = await fetch("/api/paystack/banks?country=nigeria");
        if (res.ok) {
          const json = await res.json();
          if (json.banks && json.banks.length > 0) {
            const rawBanks: BankOption[] = json.banks;
            const uniqueBanksMap = new Map<string, BankOption>();
            for (const b of rawBanks) {
              const code = String(b.code || "").trim();
              if (code && !uniqueBanksMap.has(code)) {
                uniqueBanksMap.set(code, b);
              }
            }
            const dedupedBanks = Array.from(uniqueBanksMap.values());
            setBanks(dedupedBanks);
            if (!selectedBankCode && dedupedBanks.length > 0) {
              setSelectedBankCode(dedupedBanks[0].code);
              setSelectedBankName(dedupedBanks[0].name);
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
        setShowManualNameInput(false);
      } else {
        setResolutionError(
          String(json.message || "Unable to verify bank account. Please check details."),
        );
        if (json.requiresManualName) {
          setShowManualNameInput(true);
        }
      }
    } catch {
      setResolutionError("Failed to connect to account verification service.");
      setShowManualNameInput(true);
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
      const payload = {
        business_name: businessName.trim(),
        settlement_bank: selectedBankCode,
        account_number: accountNumber.trim(),
        percentage_charge: platformFeePercent, // 15% platform commission
        description: `Backpack Vendor Subaccount for ${businessName}`,
        primary_contact_email: currentUser?.email,
        primary_contact_name: currentUser?.name,
      };

      const res = await fetch("/api/paystack/subaccount", {
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
        const isLiveCreated = json.is_live !== undefined ? Boolean(json.is_live) : subCode.startsWith("ACCT_live_");
        const modeCreated: "test" | "live" = (json.mode as "test" | "live") || (isLiveCreated ? "live" : "test");
        const newSubaccountData: PaystackSubaccount = {
          subaccount_code: subCode,
          business_name: businessName.trim(),
          bank_code: selectedBankCode,
          bank_name:
            selectedBankName ||
            banks.find((b) => b.code === selectedBankCode)?.name ||
            "Settlement Bank",
          account_number: accountNumber.trim(),
          account_name: resolvedAccountName || businessName.trim(),
          percentage_charge: platformFeePercent,
          is_verified: true,
          is_live: isLiveCreated,
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
          json.message ||
            "Unable to generate Paystack subaccount. Please verify your details or use 'Link Official Paystack Subaccount' to paste your ACCT_ code.",
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

  const filteredBanks = banks.filter(
    (b) =>
      b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
      b.code.includes(bankSearch),
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Paystack Direct Bank Settlement</span>
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
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
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
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-xs"
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
                  onClick={() => {
                    setIsEditing(true);
                    setConnectionMode("create");
                  }}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold rounded-xl transition shadow-xs flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Fix / Re-create Subaccount</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-sm"
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
                    Automated Split Payouts Active: 100% of your course tuition is routed directly into your bank on Paystack&apos;s schedule.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Setup / Registration Form */
        <div className="space-y-6">
          {/* Secret Key Configuration Toggle / Panel */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Paystack Secret Key Configuration</span>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyConfig(!showKeyConfig)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {showKeyConfig ? "Hide Config" : "Configure Secret Key ⚙️"}
              </button>
            </div>
            {showKeyConfig && (
              <form onSubmit={handleConfigureKey} className="mt-3 space-y-3 pt-3 border-t border-amber-200 dark:border-amber-900/40">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Paste your valid Paystack secret key (<code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">sk_test_...</code> or <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">sk_live_...</code>) to instantly resolve NUBAN account names and register subaccounts.
                </p>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    placeholder="sk_test_... or sk_live_..."
                    value={secretKeyInput}
                    onChange={(e) => setSecretKeyInput(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
                  >
                    Save Key
                  </button>
                </div>
                {keyConfigStatus && (
                  <div className={`p-2 rounded-xl text-xs font-semibold ${keyConfigStatus.success ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                    {keyConfigStatus.message}
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 space-x-1">
            <button
              type="button"
              onClick={() => {
                setConnectionMode("create");
                setSubaccountError("");
              }}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                connectionMode === "create"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              1. Create Subaccount via Paystack API
            </button>
            <button
              type="button"
              onClick={() => {
                setConnectionMode("link");
                setSubaccountError("");
              }}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                connectionMode === "link"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              2. Link Official Paystack Subaccount (ACCT_...)
            </button>
          </div>

          {connectionMode === "create" ? (
            /* Mode A: Create via API */
            <form onSubmit={handleRegisterSubaccount} className="space-y-6">
              <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 flex items-start space-x-3">
                <HelpCircle className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Automated Paystack Subaccount Creation</p>
                  <p className="mt-0.5 text-slate-600 dark:text-indigo-300 leading-relaxed">
                    Provide your bank details below. Our server communicates with Paystack to generate and register an official <code>ACCT_...</code> subaccount code directly on Paystack.
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
                    placeholder="e.g. Apex Coding Academy Ltd"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Settlement Bank */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Settlement Bank <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Search bank name..."
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
                    />
                    <select
                      value={selectedBankCode}
                      onChange={handleBankChange}
                      disabled={loadingBanks}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      {loadingBanks ? (
                        <option>Loading Nigerian banks...</option>
                      ) : filteredBanks.length > 0 ? (
                        filteredBanks.map((b, idx) => (
                          <option key={`bank-opt-${b.code}-${idx}`} value={b.code}>
                            {b.name}
                          </option>
                        ))
                      ) : (
                        <option value="">No matching banks found</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Account Number (10-digit NUBAN) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={accountNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setAccountNumber(val);
                        setResolvedAccountName("");
                        setResolutionError("");
                      }}
                      placeholder="0123456789"
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-mono tracking-wider focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleResolveAccount}
                      disabled={resolvingAccount || accountNumber.length < 10}
                      className="px-3.5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center space-x-1"
                    >
                      {resolvingAccount ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                      <span>Verify</span>
                    </button>
                  </div>

                  {resolvedAccountName && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1.5 flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Account Verified: {resolvedAccountName}
                    </p>
                  )}

                  {resolutionError && (
                    <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium mt-1.5 flex items-center">
                      <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                      {resolutionError}
                    </p>
                  )}
                </div>

                {/* Manual Account Name Override */}
                {showManualNameInput && (
                  <div className="md:col-span-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        Confirm Account Holder Legal Name
                      </label>
                    </div>
                    <input
                      type="text"
                      value={resolvedAccountName}
                      onChange={(e) => setResolvedAccountName(e.target.value)}
                      placeholder="e.g. John Doe / Apex Coding Academy Ltd"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white uppercase font-bold focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-slate-500">
                      Exact name registered with your settlement bank account.
                    </p>
                  </div>
                )}
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
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition shadow-md flex items-center space-x-2"
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
          ) : (
            /* Mode B: Link Official Subaccount Code */
            <form onSubmit={handleLinkExistingSubaccount} className="space-y-6">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 p-4 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Link Official Paystack Subaccount Code</p>
                  <p className="mt-0.5 text-slate-600 dark:text-emerald-300 leading-relaxed">
                    If you created your subaccount on your official Paystack Dashboard (<strong>dashboard.paystack.com &rarr; Subaccounts</strong>), simply paste your <code>ACCT_...</code> code here. Backpack will bind directly to your authentic Paystack subaccount for automatic split payouts on every course checkout.
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
                {/* Official Paystack Subaccount Code */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Official Paystack Subaccount Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-emerald-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={manualSubaccountCode}
                      onChange={(e) => setManualSubaccountCode(e.target.value.trim())}
                      placeholder="e.g. ACCT_8b8c5j6x9m2p1q"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Copied directly from your Paystack Dashboard (starts with &apos;ACCT_&apos;)
                  </p>
                </div>

                {/* Business Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Organization / Provider Legal Name <span className="text-red-500">*</span>
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

                {/* Bank Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Settlement Bank
                  </label>
                  <select
                    value={selectedBankCode}
                    onChange={handleBankChange}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {filteredBanks.map((b, idx) => (
                      <option key={`bank-link-${b.code}-${idx}`} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account Number */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Settlement Account Number (NUBAN)
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit NUBAN (optional if already on Paystack)"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500"
                  />
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
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition shadow-md flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying &amp; Linking...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify &amp; Link Official Subaccount</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
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
