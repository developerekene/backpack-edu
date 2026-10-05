import React, { useState } from "react";
import {
  X,
  Sparkles,
  CheckCircle,
  // Building2,
  Lock,
  // Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Check,
  // HelpCircle,
} from "lucide-react";
import { Organization } from "../../types";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import {
  triggerPaystackPayment,
  generateReferenceNumber,
} from "../../lib/paystack";

interface OrgPlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization?: Organization | null;
  currentCourseCount?: number;
  onUpgradeSuccess?: () => void;
}

export const OrgPlanUpgradeModal: React.FC<OrgPlanUpgradeModalProps> = ({
  isOpen,
  onClose,
  organization,
  currentCourseCount = 3,
  onUpgradeSuccess,
}) => {
  const { currentUser } = useAuth();
  const { upgradeOrganizationPlan } = useAppContext();

  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetOrgName =
    organization?.name || currentUser?.name || "Your Organization";
  const targetOrgId = organization?.id || currentUser?.id || "";
  const currency = organization?.baseCurrency === "USD" ? "USD" : "NGN";
  const upgradePrice = currency === "USD" ? 50 : 35000;

  const handlePaystackPayment = () => {
    if (!currentUser?.email) {
      setErrorMessage(
        "A valid email address is required to proceed with payment.",
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const ref = generateReferenceNumber();

    triggerPaystackPayment({
      email: currentUser.email,
      amount: upgradePrice,
      currency,
      reference: ref,
      studentDetails: {
        firstName: targetOrgName,
        courseTitle: "Organization Pro Plan Upgrade (Unlimited Courses)",
      },
      metadata: {
        plan: "paid",
        type: "organization_tier_upgrade",
        orgId: targetOrgId,
        orgName: targetOrgName,
        purchasedByEmail: currentUser.email,
        maxCourses: "unlimited",
      },
      onSuccess: (res) => {
        const finalRef = res?.reference || res?.trxref || ref;
        setPaymentRef(finalRef);
        setPaymentSuccess(true);
        setLoading(false);

        // Update in-memory state for immediate client-side unlock
        if (targetOrgId) {
          upgradeOrganizationPlan(targetOrgId);
        }
        if (onUpgradeSuccess) {
          onUpgradeSuccess();
        }
      },
      onCancel: () => {
        setLoading(false);
      },
      onError: (err) => {
        setLoading(false);
        setErrorMessage(
          err?.message ||
            "Payment could not be completed. You can also use the instant test button below.",
        );
      },
    });
  };

  const handleSimulatePayment = () => {
    setLoading(true);
    setTimeout(() => {
      const simulatedRef = generateReferenceNumber();
      setPaymentRef(simulatedRef);
      setPaymentSuccess(true);
      setLoading(false);

      if (targetOrgId) {
        upgradeOrganizationPlan(targetOrgId);
      }
      if (onUpgradeSuccess) {
        onUpgradeSuccess();
      }
    }, 600);
  };

  const handleCompleteAndClose = () => {
    setPaymentSuccess(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden relative my-8">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 sm:p-7 text-white relative">
          <button
            onClick={onClose}
            aria-label="Close upgrade modal"
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-200 bg-white/10 px-2 py-0.5 rounded-full border border-white/20">
                Organization Package Upgrade
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Upgrade to Organization Pro
              </h2>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed mt-1">
            Free organizations are permitted up to{" "}
            <strong>3 active courses</strong>. Unlock unlimited course
            publishing and institutional growth.
          </p>
        </div>

        {/* Content Body */}
        {paymentSuccess ? (
          /* Payment Success State */
          <div className="p-6 sm:p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 border-2 border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10 animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Payment Successful • Account Upgraded
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                Welcome to Organization Pro!
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                <strong>{targetOrgName}</strong> has been successfully upgraded.
                The 3-course restriction has been removed—you can now publish
                your 4th course and create unlimited institutional curricula.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-sm mx-auto text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Transaction Ref:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {paymentRef}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Account Status:</span>
                <span className="font-bold text-emerald-500">
                  PRO (Unlimited Courses)
                </span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Course Allowance:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Unlimited (No Limit)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCompleteAndClose}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition flex items-center justify-center space-x-2 mx-auto cursor-pointer"
            >
              <span>Continue to Create Course</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Upgrade Plan Selection & Paystack Trigger */
          <div className="p-6 sm:p-7 space-y-6">
            {/* Status warning box */}
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl flex items-start space-x-3">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                <span className="font-bold block text-sm mb-0.5">
                  Course Limit Reached ({currentCourseCount}/3 Used)
                </span>
                You have reached the maximum course threshold available on the
                Free plan. To publish this 4th course, an upgrade is required.
              </div>
            </div>

            {/* Plan Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Free Plan Card */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3 opacity-80">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Free Account
                  </span>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    Active (Limit Reached)
                  </span>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                    Free
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Basic institutional starter
                  </p>
                </div>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <li className="flex items-center text-amber-600 dark:text-amber-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2 shrink-0"></span>
                    Maximum 3 Courses (Capped)
                  </li>
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-2 shrink-0"></span>
                    Standard Admissions Intake
                  </li>
                  <li className="flex items-center text-slate-400 line-through">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mr-2 shrink-0"></span>
                    Unlimited Courses
                  </li>
                </ul>
              </div>

              {/* Pro Plan Card */}
              <div className="p-4 rounded-2xl border-2 border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 space-y-3 relative shadow-md shadow-indigo-500/5">
                <div className="absolute -top-3 right-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow">
                  Recommended
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Organization Pro
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {currency === "NGN" ? "₦35,000" : "$50"}
                  </div>
                  <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 font-medium">
                    One-time institutional license
                  </p>
                </div>
                <ul className="text-xs text-slate-700 dark:text-slate-200 space-y-2 pt-2 border-t border-indigo-200 dark:border-indigo-800/60">
                  <li className="flex items-center font-bold text-indigo-600 dark:text-indigo-400">
                    <Check className="w-4 h-4 mr-1.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    Unlimited Institutional Courses
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 mr-1.5 text-emerald-500 shrink-0" />
                    Verified Institution Badge
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 mr-1.5 text-emerald-500 shrink-0" />
                    Multi-Instructor Delegation
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 mr-1.5 text-emerald-500 shrink-0" />
                    Paystack Subaccount Payouts
                  </li>
                </ul>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Paystack Checkout Action */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handlePaystackPayment}
                disabled={loading}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/25 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>
                  {loading
                    ? "Connecting to Paystack..."
                    : `Pay ${currency === "NGN" ? "₦35,000" : "$50"} with Paystack`}
                </span>
              </button>

              {/* Developer / Testing quick shortcut */}
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={loading}
                className="w-full py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Simulate Successful Payment (Instant Test Mode)</span>
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span className="flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  256-bit Encrypted Checkout
                </span>
                <span>Powered by Paystack</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
