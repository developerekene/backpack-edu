import React, { useState, useMemo } from "react";
import { usePaystackPayment } from "react-paystack";
import { CreditCard, RefreshCw, Split } from "lucide-react";

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
  onSuccess: (reference?: string) => void;
  onClose?: () => void;
  label?: string;
  disabled?: boolean;
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
  onSuccess,
  onClose,
  label = "Pay Now",
  disabled = false,
}) => {
  const publicKey =
    import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ||
    "pk_test_dummypublickey1234567890";
  const [loading, setLoading] = useState(false);
  const [splitStatus, setSplitStatus] = useState<string | null>(null);

  // Stable reference generated per component mount
  const [paymentReference] = useState(
    () => `bp_ref_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  );

  // Paystack configuration with split subaccount
  const config = useMemo(() => {
    const baseConfig: Record<string, unknown> = {
      reference: paymentReference,
      email: email,
      amount: Math.round(amount * 100), // in kobo/pesewas
      currency: currency || "NGN",
      publicKey: publicKey,
      metadata: {
        custom_fields: [
          {
            display_name: "Course",
            variable_name: "course_title",
            value: courseTitle || "Backpack Course",
          },
          {
            display_name: "Course ID",
            variable_name: "course_id",
            value: courseId || "",
          },
          {
            display_name: "Provider",
            variable_name: "provider_name",
            value: providerName || "Platform Provider",
          },
          {
            display_name: "Split Subaccount",
            variable_name: "subaccount_code",
            value: subaccountCode || "None",
          },
        ],
      },
    };

    if (splitCode) {
      baseConfig.split_code = splitCode;
    } else if (subaccountCode) {
      baseConfig.subaccount = subaccountCode;
    }

    return baseConfig;
  }, [
    paymentReference,
    email,
    amount,
    currency,
    publicKey,
    courseTitle,
    courseId,
    providerName,
    subaccountCode,
    splitCode,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initializePaystackModal = usePaystackPayment(config as any);

  const handlePayment = async () => {
    setLoading(true);
    setSplitStatus("Initializing Paystack Split Transaction...");

    try {
      // 1. Trigger backend Initialize Split Transaction API
      const res = await fetch("/api/paystack/initialize-split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount,
          currency,
          subaccount_code: subaccountCode,
          split_code: splitCode,
          metadata: {
            courseId,
            courseTitle,
            providerName,
            subaccountCode,
          },
        }),
      });

      const json = await res.json();

      if (json.success) {
        setSplitStatus("Split Transaction Ready. Opening Paystack Checkout...");

        // If live URL returned from Paystack backend and we want direct popup/redirect
        if (
          json.authorization_url &&
          !json.isDemo &&
          typeof window !== "undefined"
        ) {
          // Open checkout window or popup
          const popup = window.open(
            json.authorization_url,
            "_blank",
            "width=600,height=700",
          );

          // Poll verification or fallback
          if (json.reference) {
            const checkInterval = setInterval(async () => {
              if (popup && popup.closed) {
                clearInterval(checkInterval);
                // Verify reference
                const vRes = await fetch(
                  `/api/paystack/verify/${json.reference}`,
                );
                const vJson = await vRes.json();
                if (vJson.status === "success") {
                  onSuccess(json.reference);
                }
                setLoading(false);
              }
            }, 2000);
          }
          return;
        }
      }
    } catch (err) {
      console.warn("Backend split initialization note:", err);
    }

    // 2. Client-side inline modal fallback using react-paystack
    initializePaystackModal({
      onSuccess: (res: { reference?: string }) => {
        setLoading(false);
        setSplitStatus("Payment successful!");
        const ref = res?.reference || paymentReference;
        onSuccess(ref);
      },
      onClose: () => {
        setLoading(false);
        setSplitStatus(null);
        if (onClose) onClose();
      },
    });
  };

  return (
    <div className="w-full space-y-2">
      <button
        onClick={handlePayment}
        disabled={disabled || loading}
        className="w-full justify-center px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition flex items-center shadow-lg shadow-emerald-600/20"
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin text-white" />
            <span>{splitStatus || "Processing Split Checkout..."}</span>
          </>
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
            Paystack Split Enabled • Direct Payout to{" "}
            {providerName || "Provider"} ({subaccountCode})
          </span>
        </div>
      )}
    </div>
  );
};
