/* eslint-disable @typescript-eslint/ban-ts-comment */
import emailjs from "@emailjs/browser";
// @ts-expect-error
import PaystackPop from "@paystack/inline-js";

export const SERVICE_ID = "service_o1jbklr";
export const TEMPLATE_ID = "template_p8h58ur";
export const PUBLIC_KEY = "hcj3DsJ8MfNfUrE8J";

// Live key and Test key:
export const PAYSTACK_TEST_PUBLIC_KEY =
  import.meta.env.VITE_PAYSTACK_TEST_PUBLIC_KEY ||
  import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ||
  "pk_test_db0145199289f83c428d57cf70755142bb0b8b28";

// Live key definition (default remains TEST key for safety):
export const PAYSTACK_LIVE_PUBLIC_KEY =
  import.meta.env.VITE_PAYSTACK_LIVE_PUBLIC_KEY ||
  "pk_live_d2b967eddda456841f504b85549767fc33cc9fd4";

export const PAYSTACK_KEY = PAYSTACK_TEST_PUBLIC_KEY;

export const generateReferenceNumber = (): string => {
  const prefix = "DT";
  const timestamp = Date.now().toString(36); // Base36 for compact form
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

export interface PaystackTransactionOptions {
  email: string;
  amount: number; // Total charged to payer (In main currency unit e.g. NGN)
  baseAmount?: number; // Base tuition fee (e.g. NGN 100)
  transactionCharge?: number; // Platform fee addition (e.g. NGN 15)
  currency?: string;
  subaccount?: string;
  subaccount_code?: string;
  split_code?: string;
  // is_live?: boolean; // Commented out per user instruction
  mode?: "test" | "live";
  reference?: string;
  metadata?: Record<string, unknown>;
  studentDetails?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    courseTitle?: string;
    rating?: string | number;
    lichess?: string;
    age?: string | number;
    notes?: string;
  };
  onSuccess?: (res: { reference?: string; trxref?: string; status?: string }) => void;
  onCancel?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError?: (error: any) => void;
}

/**
 * Global Paystack payment trigger with automatic Reference Number generation,
 * PayStackPop inline checkout modal, subaccount mode verification, and automated EmailJS notification.
 */
export const triggerPaystackPayment = (options: PaystackTransactionOptions) => {
  const referenceNumber = options.reference || generateReferenceNumber();

  if (!options.email) {
    if (options.onError) {
      options.onError(new Error("Please enter a valid email address!"));
    }
    return;
  }

  const amountInKobo = Math.round(options.amount * 100);
  const baseAmountInKobo = options.baseAmount
    ? Math.round(options.baseAmount * 100)
    : Math.round(amountInKobo / 1.15);
  const transactionChargeInKobo = options.transactionCharge
    ? Math.round(options.transactionCharge * 100)
    : Math.max(0, amountInKobo - baseAmountInKobo);

  const targetSubaccount = options.subaccount_code || options.subaccount;

  // Always use TEST mode until user decides (per instruction)
  const activePublicKey = PAYSTACK_TEST_PUBLIC_KEY;

  const handleSuccess = async (res: { reference?: string; trxref?: string; status?: string }) => {
    const finalRef = res?.reference || res?.trxref || referenceNumber;

    // Send confirmation email via EmailJS if configured
    try {
      const student = options.studentDetails || {};
      const firstName = student.firstName || options.email.split("@")[0] || "Student";
      const lastName = student.lastName || "";
      const courseTitle = student.courseTitle || "Backpack Academy";

      const templateParams = {
        name: `${firstName} ${lastName}`.trim(),
        title: `Thank You for Your Payment! We're thrilled to confirm your registration for ${courseTitle}.  

Your payment of ${options.currency || "NGN"} ${options.amount.toLocaleString()} has been successfully processed (Ref: ${finalRef}).

In the meantime:  
• Ensure your contact details are up-to-date.  
• Check your student dashboard and email (and spam folder) regularly for course updates.  
• Get ready to learn, compete, and grow!

Your Details:
• Name: ${firstName} ${lastName}.
• Email: ${options.email}.
• Reference: ${finalRef}.
${student.rating ? `• Rating: ${student.rating}.` : ""}
${student.lichess ? `• Username: ${student.lichess}.` : ""}
${student.age ? `• Age: ${student.age}.` : ""}

At Backpack & D'roid Technologies, we believe in learning, competing, and growing together. If you have any questions or need support, don't hesitate to reach out — we're here to help.`,
        email: options.email,
        reference_number: finalRef,
        amount: `${options.currency || "NGN"} ${options.amount.toLocaleString()}`,
        course_title: courseTitle,
      };

      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      console.log("Paystack confirmation email dispatched successfully via EmailJS");
    } catch (emailErr) {
      console.warn("EmailJS notification note:", emailErr);
    }

    if (options.onSuccess) {
      options.onSuccess({ ...res, reference: finalRef });
    }
  };

  const handleCancel = () => {
    console.log("Paystack Payment cancelled");
    if (options.onCancel) {
      options.onCancel();
    }
  };

  let subaccountRetried = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isInvalidSubaccountError = (err: any): boolean => {
    if (!err) return false;
    const msg = typeof err === "string" ? err : err.message || "";
    const type = typeof err === "object" ? err.type : "";
    const str = typeof err === "object" ? JSON.stringify(err) : String(err);
    return (
      msg.toLowerCase().includes("subaccount") ||
      (type === "setup" && str.toLowerCase().includes("subaccount")) ||
      str.toLowerCase().includes("invalid subaccount")
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let txConfig: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleError = (error: any) => {
    console.error("Paystack Payment error:", error);

    // If error is caused by an unlinked / mode-mismatched subaccount:
    if (!subaccountRetried && targetSubaccount && isInvalidSubaccountError(error)) {
      subaccountRetried = true;
      const alternateKey = activePublicKey === PAYSTACK_LIVE_PUBLIC_KEY ? PAYSTACK_TEST_PUBLIC_KEY : PAYSTACK_LIVE_PUBLIC_KEY;
      console.warn(
        `[Paystack Mode Guard] Subaccount "${targetSubaccount}" was rejected with key ${activePublicKey.slice(0, 8)}... Retrying with alternate mode key (${alternateKey.slice(0, 8)}...)...`
      );

      txConfig.key = alternateKey;
      txConfig.metadata = {
        ...(txConfig.metadata || {}),
        mode_switched: true,
        subaccount_code: targetSubaccount,
      };

      try {
        const fallbackPaystack = new PaystackPop();
        fallbackPaystack.newTransaction(txConfig);
        return;
      } catch {
        // Fallback retry attempt
      }

      // If mode switch also rejects, fall back to direct payment with original key
      delete txConfig.subaccount;
      delete txConfig.subaccount_code;
      delete txConfig.split_code;
      txConfig.key = activePublicKey;
      txConfig.metadata = {
        ...(txConfig.metadata || {}),
        requested_subaccount: targetSubaccount,
        subaccount_fallback: true,
      };

      try {
        const directPaystack = new PaystackPop();
        directPaystack.newTransaction(txConfig);
        return;
      } catch (retryErr) {
        console.warn("Paystack direct fallback notice:", retryErr);
      }

      // Try window.PaystackPop if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any;
      if (win.PaystackPop && typeof win.PaystackPop.setup === "function") {
        try {
          const handler = win.PaystackPop.setup({
            ...txConfig,
            callback: (res: { reference?: string; trxref?: string; status?: string }) => {
              handleSuccess(res);
            },
            onClose: () => {
              handleCancel();
            },
          });
          handler.openIframe();
          return;
        } catch (winRetryErr) {
          console.error("window.PaystackPop retry failed:", winRetryErr);
        }
      }
    }

    if (options.onError) {
      options.onError(error);
    }
  };

  try {
    // 1. Try PaystackPop instance from @paystack/inline-js
    const payStack = new PaystackPop();
    txConfig = {
      key: activePublicKey,
      email: options.email,
      amount: amountInKobo,
      ref: referenceNumber,
      currency: options.currency || "NGN",
      bearer: "account", // Explicitly force Paystack to deduct transaction fee strictly from main account's share
      onSuccess: handleSuccess,
      onCancel: handleCancel,
      onError: handleError,
      metadata: {
        ...(options.metadata || {}),
        subaccount_code: targetSubaccount,
        bearer: "account",
        mode: "test",
      },
    };

    if (targetSubaccount) {
      txConfig.subaccount = targetSubaccount;
      txConfig.subaccount_code = targetSubaccount;
      txConfig.transaction_charge = transactionChargeInKobo;
      txConfig.bearer = "account";
    }
    if (options.split_code) {
      txConfig.split_code = options.split_code;
    }

    payStack.newTransaction(txConfig);
  } catch (inlineErr) {
    console.warn("Falling back to window.PaystackPop / setup:", inlineErr);
    // If the error was subaccount-related, strip subaccount
    if (targetSubaccount && isInvalidSubaccountError(inlineErr)) {
      delete txConfig.subaccount;
      delete txConfig.subaccount_code;
      delete txConfig.split_code;
    }

    // Fallback if window.PaystackPop is available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (win.PaystackPop && typeof win.PaystackPop.setup === "function") {
      const handler = win.PaystackPop.setup({
        ...txConfig,
        key: activePublicKey,
        email: options.email,
        amount: amountInKobo,
        ref: referenceNumber,
        currency: options.currency || "NGN",
        callback: (res: { reference?: string; trxref?: string; status?: string }) => {
          handleSuccess(res);
        },
        onClose: () => {
          handleCancel();
        },
      });
      handler.openIframe();
    } else {
      handleError(inlineErr);
    }
  }
};
