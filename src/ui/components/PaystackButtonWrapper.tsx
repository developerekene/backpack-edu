import React, { useState } from "react";
import { CreditCard, RefreshCw, Split } from "lucide-react";
import { triggerPaystackPayment, generateReferenceNumber } from "../../lib/paystack";

interface PaystackProps {
  email: string;
  amount: number;
  currency: string;
  subaccountCode?: string;
  splitCode?: string;
  providerName?: string;
  providerSharePercent?: number;
  courseId?: string;
  courseTitle?: string;
  studentName?: string;
  onSuccess: (reference?: string) => void;
  onClose?: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const PaystackButtonWrapper: React.FC<PaystackProps> = ({
  email,
  amount,
  currency,
  subaccountCode,
  splitCode,
  providerName,
  courseId,
  courseTitle,
  studentName,
  onSuccess,
  onClose,
  label = "Pay Now",
  disabled = false,
  className,
  children,
}) => {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handlePayment = () => {
    if (!email) {
      alert("Please enter a valid email!");
      return;
    }

    setLoading(true);
    setStatusMessage("Opening Paystack Checkout...");

    const generatedRef = generateReferenceNumber();

    triggerPaystackPayment({
      email,
      amount,
      currency: currency || "NGN",
      subaccount: subaccountCode,
      split_code: splitCode,
      reference: generatedRef,
      studentDetails: {
        firstName: studentName ? studentName.split(" ")[0] : email.split("@")[0],
        lastName: studentName ? studentName.split(" ").slice(1).join(" ") : "",
        email,
        courseTitle: courseTitle || "Backpack Course",
      },
      metadata: {
        courseId,
        courseTitle,
        providerName,
        subaccountCode,
      },
      onSuccess: (res) => {
        setLoading(false);
        setStatusMessage("Payment successful!");
        const ref = res?.reference || res?.trxref || generatedRef;
        onSuccess(ref);
      },
      onCancel: () => {
        console.log("Payment cancelled");
        setLoading(false);
        setStatusMessage(null);
        if (onClose) onClose();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        console.log("Payment error:", error);
        setLoading(false);
        setStatusMessage(null);
        alert(`⚠️ Payment error: ${error?.message || "Payment could not be completed."}`);
      },
    });
  };

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        onClick={handlePayment}
        disabled={disabled || loading}
        className={
          className ||
          "w-full justify-center px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition flex items-center shadow-lg shadow-emerald-600/20"
        }
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin text-white" />
            <span>{statusMessage || "Processing Checkout..."}</span>
          </>
        ) : children ? (
          children
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            <span>{label}</span>
          </>
        )}
      </button>

      {subaccountCode && (
        <div className="flex items-center justify-center space-x-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
          <Split className="w-3 h-3 text-emerald-500" />
          <span>
            Paystack Split Enabled • Direct Payout to {providerName || "Provider"} ({subaccountCode})
          </span>
        </div>
      )}

      <div className="flex items-center justify-center space-x-2 text-[10px] text-slate-400 pt-0.5">
        <span>256-bit Encrypted Checkout • Powered by Paystack</span>
      </div>
    </div>
  );
};
