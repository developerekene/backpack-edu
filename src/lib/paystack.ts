import emailjs from "@emailjs/browser";
import PaystackPop from "@paystack/inline-js";

export const SERVICE_ID = "service_o1jbklr";
export const TEMPLATE_ID = "template_p8h58ur";
export const PUBLIC_KEY = "hcj3DsJ8MfNfUrE8J";

// Live key and Test key:
// export const PAYSTACK_KEY = "pk_live_d2b967eddda456841f504b85549767fc33cc9fd4";
export const PAYSTACK_KEY = "pk_test_db0145199289f83c428d57cf70755142bb0b8b28"; // replace with your own key

export const generateReferenceNumber = (): string => {
  const prefix = "DT";
  const timestamp = Date.now().toString(36); // Base36 for compact form
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

export interface PaystackTransactionOptions {
  email: string;
  amount: number; // In main currency unit (e.g., NGN), will be converted to Kobo (* 100)
  currency?: string;
  subaccount?: string;
  split_code?: string;
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
 * PayStackPop inline checkout modal, and automated EmailJS notification.
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleError = (error: any) => {
    console.error("Paystack Payment error:", error);
    if (options.onError) {
      options.onError(error);
    }
  };

  try {
    // 1. Try PaystackPop instance from @paystack/inline-js
    const payStack = new PaystackPop();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txConfig: any = {
      // key: "pk_live_d2b967eddda456841f504b85549767fc33cc9fd4",
      key: PAYSTACK_KEY, // replace with your own key
      email: options.email,
      amount: amountInKobo,
      ref: referenceNumber,
      currency: options.currency || "NGN",
      onSuccess: handleSuccess,
      onCancel: handleCancel,
      onError: handleError,
    };

    if (options.subaccount) {
      txConfig.subaccount = options.subaccount;
    }
    if (options.split_code) {
      txConfig.split_code = options.split_code;
    }
    if (options.metadata) {
      txConfig.metadata = options.metadata;
    }

    payStack.newTransaction(txConfig);
  } catch (inlineErr) {
    console.warn("Falling back to window.PaystackPop / setup:", inlineErr);
    // Fallback if window.PaystackPop is available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (win.PaystackPop && typeof win.PaystackPop.setup === "function") {
      const handler = win.PaystackPop.setup({
        key: PAYSTACK_KEY,
        email: options.email,
        amount: amountInKobo,
        ref: referenceNumber,
        currency: options.currency || "NGN",
        subaccount: options.subaccount,
        split_code: options.split_code,
        metadata: options.metadata,
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
