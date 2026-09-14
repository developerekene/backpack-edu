import React, { useState } from "react";
import { Course, EnrollmentRequest } from "../../types";
import {
  X,
  CreditCard,
  ShieldCheck,
  CheckCircle,
  Banknote,
} from "lucide-react";
import { PaystackButtonWrapper } from "./PaystackButtonWrapper";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";

interface CoursePaymentModalProps {
  course: Course;
  request: EnrollmentRequest;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export const CoursePaymentModal: React.FC<CoursePaymentModalProps> = ({
  course,
  request,
  onClose,
  onPaymentSuccess,
}) => {
  const { currentUser } = useAuth();
  const { organizations } = useAppContext();
  const [selectedMethod, setSelectedMethod] = useState<
    "one-time" | "installment"
  >(
    request.paymentMethod ||
      (course.paymentTermsAllowed === "installment"
        ? "installment"
        : "one-time"),
  );
  const [loading, setLoading] = useState(false);

  if (!currentUser) return null;

  // Find course provider organization or instructor subaccount
  const providerOrg = organizations.find(
    (o) => o.id === course.orgId || o.ownerId === course.orgId,
  );
  const subaccount =
    providerOrg?.paystackSubaccount || currentUser?.paystackSubaccount;
  const providerName =
    providerOrg?.name || course.instructorName || "Course Provider";

  const requiresPayment = course.price > 0;
  const installmentPrice = requiresPayment ? Math.ceil(course.price / 3) : 0;
  const paymentAmount =
    selectedMethod === "one-time" ? course.price : installmentPrice;

  // Split calculations
  const providerPercentage = subaccount?.percentage_charge || 90;
  const providerAmount = Math.round((paymentAmount * providerPercentage) / 100);
  const platformFeeAmount = paymentAmount - providerAmount;

  const handleSuccess = () => {
    setLoading(true);
    onPaymentSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Complete Tuition Payment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {course.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-sm">
          {/* Status approval banner */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-900 dark:text-emerald-200 text-xs block">
                Application Accepted!
              </span>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Congratulations! Your application has been approved by the
                institution. Pay your tuition below to unlock course materials.
              </p>
            </div>
          </div>

          {/* Select Payment Method */}
          <div>
            <label className="font-bold text-slate-900 dark:text-white text-xs block mb-3">
              Select Payment Plan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(course.paymentTermsAllowed === "one-time" ||
                course.paymentTermsAllowed === "both" ||
                !course.paymentTermsAllowed) && (
                <button
                  type="button"
                  onClick={() => setSelectedMethod("one-time")}
                  className={`p-4 rounded-xl border text-left transition ${
                    selectedMethod === "one-time"
                      ? "bg-indigo-600/10 border-indigo-500 ring-2 ring-indigo-500/20"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span className="font-bold text-slate-900 dark:text-white text-xs block mb-1">
                    Pay in Full
                  </span>
                  <span className="text-base font-black text-indigo-500 dark:text-indigo-400 block">
                    {course.currency} {course.price.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Full course access
                  </span>
                </button>
              )}

              {(course.paymentTermsAllowed === "installment" ||
                course.paymentTermsAllowed === "both" ||
                !course.paymentTermsAllowed) && (
                <button
                  type="button"
                  onClick={() => setSelectedMethod("installment")}
                  className={`p-4 rounded-xl border text-left transition ${
                    selectedMethod === "installment"
                      ? "bg-indigo-600/10 border-indigo-500 ring-2 ring-indigo-500/20"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span className="font-bold text-slate-900 dark:text-white text-xs block mb-1">
                    First Installment
                  </span>
                  <span className="text-base font-black text-indigo-500 dark:text-indigo-400 block">
                    {course.currency} {installmentPrice.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {course.installmentInterval === "weekly"
                      ? "Weekly Schedule (7 days)"
                      : course.installmentInterval === "custom"
                        ? course.customMilestonesText ||
                          "Flexible Milestone Payments"
                        : "Monthly Schedule (30 days)"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Summary & Automated Split Breakdown */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold block">
                  Total Due Now
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {course.currency} {paymentAmount.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-indigo-400 font-semibold block flex items-center justify-end">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Secure Split
                  Gateway
                </span>
                <span className="text-[10px] text-slate-500">
                  Powered by Paystack
                </span>
              </div>
            </div>

            {/* Split Details Box */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="flex items-center text-[11px]">
                  <Banknote className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  Direct to {providerName} ({providerPercentage}%):
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {course.currency} {providerAmount.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-500 text-[11px]">
                <span>Platform Fee ({100 - providerPercentage}%):</span>
                <span>
                  {course.currency} {platformFeeAmount.toLocaleString()}
                </span>
              </div>

              {subaccount ? (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 pt-1 font-mono">
                  ✓ Routed to Paystack Subaccount {subaccount.subaccount_code} (
                  {subaccount.bank_name || "Bank"})
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 pt-1 italic">
                  Note: Settlement to provider's registered primary balance.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <PaystackButtonWrapper
            email={currentUser.email}
            amount={paymentAmount}
            currency={course.currency}
            subaccountCode={subaccount?.subaccount_code}
            providerName={providerName}
            providerSharePercent={providerPercentage}
            courseId={course.id}
            courseTitle={course.title}
            label={`Pay ${course.currency} ${paymentAmount.toLocaleString()} Now`}
            onSuccess={handleSuccess}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
};
