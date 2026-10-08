/**
 * Paystack Diagnostic Logging Service
 * 
 * Provides end-to-end telemetry, error classification, and actionable feedback
 * for Paystack API interactions (especially /subaccount and /transaction/initialize).
 */

export type PaystackDiagnosticCategory =
  | "AUTHENTICATION_ERROR"
  | "VALIDATION_ERROR"
  | "RATE_LIMIT_ERROR"
  | "NETWORK_ERROR"
  | "BANK_SETTLEMENT_ERROR"
  | "BUSINESS_LOGIC_ERROR"
  | "INTEGRATION_WARNING"
  | "SUCCESS";

export type PaystackDiagnosticSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export type PaystackEndpoint =
  | "/subaccount"
  | "/subaccount/:code"
  | "/transaction/initialize"
  | "/bank/resolve"
  | "/bank"
  | "/transaction/verify/:reference"
  | "/webhook";

export interface PaystackDiagnosticRemediation {
  code: string;
  category: PaystackDiagnosticCategory;
  severity: PaystackDiagnosticSeverity;
  detailedReason: string;
  actionableSteps: string[];
  troubleshootingUrl?: string;
}

export interface PaystackDiagnosticLog {
  id: string;
  timestamp: string;
  endpoint: PaystackEndpoint;
  operation: string;
  httpStatus: number;
  success: boolean;
  category: PaystackDiagnosticCategory;
  severity: PaystackDiagnosticSeverity;
  errorCode: string;
  errorMessage: string;
  detailedReason: string;
  actionableSteps: string[];
  troubleshootingUrl?: string;
  requestMetadata: {
    maskedAuthKey?: string;
    sanitizedPayload: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  };
  responseMetadata: {
    status?: boolean;
    rawMessage?: string;
    paystackCode?: string;
    durationMs: number;
    rawResponseSnippet?: string;
  };
}

export interface PaystackDiagnosticStats {
  totalInteractions: number;
  successfulInteractions: number;
  failedInteractions: number;
  successRatePercentage: number;
  categoryCounts: Record<PaystackDiagnosticCategory, number>;
  endpointCounts: Record<string, { total: number; errors: number }>;
  lastErrorTimestamp?: string;
}

/**
 * Sanitizes request payload to protect sensitive customer & banking data
 * while retaining debugging value (e.g. masked card/keys, visible bank codes).
 */
export function sanitizePaystackPayload(payload: Record<string, unknown> = {}): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) {
      sanitized[key] = value;
      continue;
    }

    const lowerKey = key.toLowerCase();
    const strVal = String(value);

    // Mask secret keys
    if (lowerKey.includes("key") || lowerKey.includes("secret") || lowerKey.includes("token")) {
      sanitized[key] = strVal.length > 8 ? `${strVal.substring(0, 4)}...${strVal.substring(strVal.length - 4)}` : "***";
      continue;
    }

    // Mask account numbers partially (show first 3 and last 3)
    if (lowerKey.includes("account_number") || lowerKey.includes("acc_num") || lowerKey.includes("nuban")) {
      sanitized[key] = strVal.length >= 6 ? `${strVal.substring(0, 3)}****${strVal.substring(strVal.length - 3)}` : "******";
      continue;
    }

    // Obfuscate student/customer emails partially
    if (lowerKey.includes("email")) {
      const parts = strVal.split("@");
      if (parts.length === 2 && parts[0].length > 2) {
        sanitized[key] = `${parts[0].substring(0, 2)}***@${parts[1]}`;
      } else {
        sanitized[key] = strVal;
      }
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Masks an API authorization key (e.g. sk_live_abc123456 -> sk_live_ab...456)
 */
export function maskApiKey(key?: string): string {
  if (!key) return "[NOT_CONFIGURED]";
  const trimmed = key.trim();
  if (trimmed.length < 10) return "***";
  const prefix = trimmed.startsWith("sk_live_") ? "sk_live_" : trimmed.startsWith("sk_test_") ? "sk_test_" : trimmed.startsWith("pk_") ? "pk_" : "";
  const remaining = trimmed.substring(prefix.length);
  if (remaining.length <= 6) return `${prefix}***`;
  return `${prefix}${remaining.substring(0, 3)}...${remaining.substring(remaining.length - 3)}`;
}

/**
 * Robust classifier that translates raw Paystack responses & HTTP statuses
 * into precise diagnostic codes and actionable remediation guidance.
 */
export function analyzePaystackError(
  endpoint: PaystackEndpoint,
  httpStatus: number,
  responseBody: Record<string, unknown> = {},
  requestPayload: Record<string, unknown> = {}
): PaystackDiagnosticRemediation {
  const message = String(responseBody.message || responseBody.error || "").toLowerCase();
  const rawStatus = responseBody.status;

  // 1. HTTP 401 or Invalid/Expired Key Authentication
  if (
    httpStatus === 401 ||
    message.includes("invalid key") ||
    message.includes("invalid secret") ||
    message.includes("unauthorized") ||
    message.includes("api key") ||
    message.includes("forbidden")
  ) {
    return {
      code: "PAYSTACK_AUTH_INVALID_KEY",
      category: "AUTHENTICATION_ERROR",
      severity: "CRITICAL",
      detailedReason: `Paystack rejected the Authorization secret key on ${endpoint}. HTTP ${httpStatus} returned with message: "${responseBody.message || "Invalid Key"}".`,
      actionableSteps: [
        `Ensure PAYSTACK_TEST_SECRET_KEY is defined in your environment (.env).`,
        `Verify you are passing the Secret Key ('sk_test_...'), NOT the Public Key ('pk_...').`,
        `Confirm that your Paystack merchant account is activated and has API access enabled on dashboard.paystack.com -> Settings -> API Keys & Webhooks.`,
        `If using test mode, ensure the test secret key matches your test public key on the Paystack dashboard.`,
      ],
      troubleshootingUrl: "https://paystack.com/docs/api/authentication/",
    };
  }

  // 2. Specific /subaccount Endpoint Validations
  if (endpoint === "/subaccount" || endpoint === "/subaccount/:code") {
    // Missing required field
    if (
      httpStatus === 400 &&
      (message.includes("required") ||
        message.includes("missing") ||
        !requestPayload.business_name ||
        !requestPayload.settlement_bank ||
        !requestPayload.account_number)
    ) {
      return {
        code: "PAYSTACK_SUBACCOUNT_MISSING_FIELDS",
        category: "VALIDATION_ERROR",
        severity: "ERROR",
        detailedReason: `Mandatory parameter missing for subaccount creation: ${responseBody.message || "business_name, settlement_bank, and account_number are required."}`,
        actionableSteps: [
          "Check that 'business_name' is provided and not empty.",
          "Check that 'settlement_bank' (Paystack 3-digit bank code or slug) is selected from the banks list.",
          "Check that 'account_number' is exactly 10 digits (NUBAN format).",
          "Ensure 'percentage_charge' is a number between 0 and 100 (e.g. 15 for 15%).",
        ],
        troubleshootingUrl: "https://paystack.com/docs/api/subaccount/#create",
      };
    }

    // Invalid NUBAN account number
    if (
      message.includes("account number") ||
      message.includes("nuban") ||
      message.includes("could not resolve") ||
      message.includes("invalid account")
    ) {
      return {
        code: "PAYSTACK_SUBACCOUNT_INVALID_NUBAN",
        category: "BANK_SETTLEMENT_ERROR",
        severity: "ERROR",
        detailedReason: `The provided 10-digit NUBAN account number could not be validated with the selected settlement bank (${requestPayload.settlement_bank || "N/A"}).`,
        actionableSteps: [
          "Verify that the 10-digit account number matches the selected settlement bank exactly.",
          "Use the 'Verify Account Name' button before submitting to verify account name resolution.",
          "Check if the bank account is active and able to receive electronic NIP inflows.",
        ],
        troubleshootingUrl: "https://paystack.com/docs/api/verification/#resolve-account-number",
      };
    }

    // Invalid bank code
    if (message.includes("bank") && (message.includes("invalid") || message.includes("not found"))) {
      return {
        code: "PAYSTACK_SUBACCOUNT_INVALID_BANK",
        category: "BANK_SETTLEMENT_ERROR",
        severity: "ERROR",
        detailedReason: `The settlement bank code '${requestPayload.settlement_bank || requestPayload.bank_code}' is not recognized by Paystack.`,
        actionableSteps: [
          "Refresh the bank list using the Bank dropdown to retrieve current Paystack bank codes.",
          "Ensure the CBN/NIBSS 3-digit bank code (e.g. '058' for GTBank, '057' for Zenith) is used.",
        ],
        troubleshootingUrl: "https://paystack.com/docs/api/miscellaneous/#bank",
      };
    }

    // Duplicate or subaccount mismatch
    if (message.includes("already exists") || message.includes("duplicate")) {
      return {
        code: "PAYSTACK_SUBACCOUNT_ALREADY_EXISTS",
        category: "BUSINESS_LOGIC_ERROR",
        severity: "WARNING",
        detailedReason: `A Paystack subaccount with this account number and bank combination already exists for your merchant account.`,
        actionableSteps: [
          "Check your Paystack Dashboard -> Subaccounts to retrieve the existing 'ACCT_xxxxxx' code.",
          "If updating settlement details, use the update subaccount endpoint (PUT /subaccount/:code).",
        ],
        troubleshootingUrl: "https://paystack.com/docs/api/subaccount/#list",
      };
    }
  }

  // 3. Specific /transaction/initialize Endpoint Validations
  if (endpoint === "/transaction/initialize") {
    // Missing email or amount
    if (httpStatus === 400 && (!requestPayload.email || !requestPayload.amount)) {
      return {
        code: "PAYSTACK_TX_MISSING_FIELDS",
        category: "VALIDATION_ERROR",
        severity: "ERROR",
        detailedReason: `Transaction initialization failed: 'email' and 'amount' (in kobo/pesewas) are required.`,
        actionableSteps: [
          "Verify the student's email address is formatted correctly.",
          "Ensure the tuition amount is greater than 0.",
        ],
        troubleshootingUrl: "https://paystack.com/docs/api/transaction/#initialize",
      };
    }

    // Subaccount issues in split transaction
    if (
      message.includes("subaccount") &&
      (message.includes("not found") || message.includes("invalid") || message.includes("inactive") || message.includes("disabled"))
    ) {
      return {
        code: "PAYSTACK_TX_INVALID_SUBACCOUNT",
        category: "BUSINESS_LOGIC_ERROR",
        severity: "ERROR",
        detailedReason: `The subaccount code '${requestPayload.subaccount}' specified for split checkout is either invalid, disabled, or does not belong to this Paystack integration.`,
        actionableSteps: [
          "Verify that the provider has registered and connected their subaccount (starts with 'ACCT_').",
          "Ensure the subaccount was created under the same Paystack account (Live vs Test).",
          "Check the Paystack Dashboard -> Subaccounts to verify the subaccount is in 'Active' status.",
          "If testing in Test Mode, verify that the subaccount code exists in your Paystack Test dashboard.",
        ],
        troubleshootingUrl: "https://paystack.com/docs/payments/payment-splits/#split-with-subaccounts",
      };
    }

    // Invalid amount / Minimum amount
    if (message.includes("amount") && (message.includes("small") || message.includes("less") || message.includes("invalid") || message.includes("integer"))) {
      return {
        code: "PAYSTACK_TX_INVALID_AMOUNT",
        category: "VALIDATION_ERROR",
        severity: "ERROR",
        detailedReason: `Transaction amount is invalid: ${responseBody.message || "Amount must be in kobo and meet minimum requirements."}`,
        actionableSteps: [
          "Paystack requires amount to be sent in the lowest currency unit (Kobo for NGN, multiply by 100).",
          "Minimum transaction amount on Paystack is ₦100 (10,000 Kobo).",
          "Ensure amount is an integer with no fractional decimals.",
        ],
        troubleshootingUrl: "https://paystack.com/docs/api/transaction/#initialize",
      };
    }

    // Currency not supported
    if (message.includes("currency") && (message.includes("unsupported") || message.includes("invalid"))) {
      return {
        code: "PAYSTACK_TX_UNSUPPORTED_CURRENCY",
        category: "VALIDATION_ERROR",
        severity: "ERROR",
        detailedReason: `The selected currency '${requestPayload.currency}' is not supported by your Paystack settlement setup.`,
        actionableSteps: [
          "Default currency for Nigerian bank accounts is 'NGN'.",
          "For USD, GHS, or KES payments, check multi-currency account eligibility on your Paystack dashboard.",
        ],
        troubleshootingUrl: "https://paystack.com/docs/payments/accept-payments-in-usd/",
      };
    }
  }

  // 4. Rate Limiting (429)
  if (httpStatus === 429 || message.includes("rate limit") || message.includes("too many requests")) {
    return {
      code: "PAYSTACK_RATE_LIMITED",
      category: "RATE_LIMIT_ERROR",
      severity: "WARNING",
      detailedReason: `Paystack API rate limit exceeded. You are making too many requests in a short interval.`,
      actionableSteps: [
        "Implement exponential backoff retry mechanisms for automated requests.",
        "Check for burst requests or infinite loop calls in frontend components.",
        "Paystack allows up to 100 requests per minute on standard tiers.",
      ],
      troubleshootingUrl: "https://paystack.com/docs/api/errors/#rate-limit",
    };
  }

  // 5. Server Errors (500 / 502 / 503 / 504)
  if (httpStatus >= 500) {
    return {
      code: "PAYSTACK_SERVER_ERROR",
      category: "NETWORK_ERROR",
      severity: "CRITICAL",
      detailedReason: `Paystack's upstream servers returned HTTP ${httpStatus}. Their payment infrastructure may be undergoing maintenance or transient outage.`,
      actionableSteps: [
        "Check status.paystack.com for live gateway service status and incident reports.",
        "Retry the request after a few moments.",
      ],
      troubleshootingUrl: "https://status.paystack.com/",
    };
  }

  // 6. Generic Failure
  if (!rawStatus || httpStatus >= 400) {
    return {
      code: "PAYSTACK_GENERIC_FAILURE",
      category: "BUSINESS_LOGIC_ERROR",
      severity: "ERROR",
      detailedReason: `Paystack API returned an error: ${responseBody.message || `HTTP ${httpStatus} Error`}`,
      actionableSteps: [
        "Inspect the full request and response payload metadata in the diagnostic logs.",
        "Review Paystack API documentation for required format and constraint parameters.",
      ],
      troubleshootingUrl: "https://paystack.com/docs/api/",
    };
  }

  // 7. Successful Call
  return {
    code: "PAYSTACK_SUCCESS",
    category: "SUCCESS",
    severity: "INFO",
    detailedReason: "Paystack interaction completed successfully.",
    actionableSteps: ["No action required. Transaction/Subaccount successfully confirmed."],
  };
}

/**
 * In-memory circular buffer diagnostic logger with thread-safe recording
 * and structured diagnostic querying.
 */
class PaystackDiagnosticService {
  private logs: PaystackDiagnosticLog[] = [];
  private readonly maxLogs: number = 200;

  /**
   * Records a Paystack interaction, automatically analyzing outcomes and
   * extracting specific error codes and remediation advice.
   */
  public logInteraction(params: {
    endpoint: PaystackEndpoint;
    operation: string;
    httpStatus: number;
    authKeyUsed?: string;
    requestPayload?: Record<string, unknown>;
    responseBody?: Record<string, unknown>;
    error?: unknown;
    durationMs: number;
    clientIp?: string;
    userAgent?: string;
  }): PaystackDiagnosticLog {
    const {
      endpoint,
      operation,
      httpStatus,
      authKeyUsed,
      requestPayload = {},
      responseBody = {},
      error,
      durationMs,
      clientIp,
      userAgent,
    } = params;

    const isSuccess = httpStatus >= 200 && httpStatus < 300 && responseBody.status !== false;
    const analysis = isSuccess
      ? {
          code: "PAYSTACK_SUCCESS",
          category: "SUCCESS" as PaystackDiagnosticCategory,
          severity: "INFO" as PaystackDiagnosticSeverity,
          detailedReason: `Operation '${operation}' succeeded on ${endpoint} in ${durationMs}ms.`,
          actionableSteps: ["Success. No remediation required."],
        }
      : analyzePaystackError(endpoint, httpStatus, responseBody, requestPayload);

    const errorMessage =
      (responseBody.message as string) ||
      (error instanceof Error ? error.message : typeof error === "string" ? error : undefined) ||
      (isSuccess ? "Operation completed successfully" : `HTTP ${httpStatus} error`);

    const logEntry: PaystackDiagnosticLog = {
      id: `diag_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      endpoint,
      operation,
      httpStatus,
      success: isSuccess,
      category: analysis.category,
      severity: analysis.severity,
      errorCode: analysis.code,
      errorMessage,
      detailedReason: analysis.detailedReason,
      actionableSteps: analysis.actionableSteps,
      troubleshootingUrl: analysis.troubleshootingUrl,
      requestMetadata: {
        maskedAuthKey: maskApiKey(authKeyUsed),
        sanitizedPayload: sanitizePaystackPayload(requestPayload),
        ipAddress: clientIp,
        userAgent,
      },
      responseMetadata: {
        status: responseBody.status as boolean | undefined,
        rawMessage: responseBody.message as string | undefined,
        paystackCode: (responseBody.code as string) || undefined,
        durationMs,
        rawResponseSnippet: JSON.stringify(responseBody).substring(0, 300),
      },
    };

    // Store in circular buffer
    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Structured server console output with distinctive diagnostic tag
    const icon = isSuccess ? "✅" : analysis.severity === "CRITICAL" ? "🚨" : "⚠️";
    const tag = `[PAYSTACK-DIAGNOSTIC] ${icon} [${endpoint}] [HTTP ${httpStatus}] [${analysis.code}]`;

    if (!isSuccess) {
      console.warn(
        `${tag}\n  Reason: ${analysis.detailedReason}\n  Error Message: ${errorMessage}\n  Remediation: ${analysis.actionableSteps[0] || "Check payload"}\n  Auth: ${maskApiKey(authKeyUsed)}`
      );
    } else {
      console.log(`${tag} (${durationMs}ms)`);
    }

    return logEntry;
  }

  /**
   * Retrieves diagnostic logs with optional filters
   */
  public getLogs(filters?: {
    endpoint?: PaystackEndpoint | string;
    category?: PaystackDiagnosticCategory;
    severity?: PaystackDiagnosticSeverity;
    onlyErrors?: boolean;
    limit?: number;
  }): PaystackDiagnosticLog[] {
    let result = [...this.logs];

    if (filters?.endpoint) {
      result = result.filter((l) => l.endpoint === filters.endpoint || l.endpoint.startsWith(filters.endpoint!));
    }
    if (filters?.category) {
      result = result.filter((l) => l.category === filters.category);
    }
    if (filters?.severity) {
      result = result.filter((l) => l.severity === filters.severity);
    }
    if (filters?.onlyErrors) {
      result = result.filter((l) => !l.success);
    }

    const limit = filters?.limit || 50;
    return result.slice(0, limit);
  }

  /**
   * Aggregates real-time telemetry stats
   */
  public getStats(): PaystackDiagnosticStats {
    const total = this.logs.length;
    const successes = this.logs.filter((l) => l.success).length;
    const failures = total - successes;

    const categoryCounts: Record<PaystackDiagnosticCategory, number> = {
      AUTHENTICATION_ERROR: 0,
      VALIDATION_ERROR: 0,
      RATE_LIMIT_ERROR: 0,
      NETWORK_ERROR: 0,
      BANK_SETTLEMENT_ERROR: 0,
      BUSINESS_LOGIC_ERROR: 0,
      INTEGRATION_WARNING: 0,
      SUCCESS: 0,
    };

    const endpointCounts: Record<string, { total: number; errors: number }> = {};

    let lastErrorTimestamp: string | undefined;

    for (const log of this.logs) {
      categoryCounts[log.category] = (categoryCounts[log.category] || 0) + 1;

      if (!endpointCounts[log.endpoint]) {
        endpointCounts[log.endpoint] = { total: 0, errors: 0 };
      }
      endpointCounts[log.endpoint].total += 1;
      if (!log.success) {
        endpointCounts[log.endpoint].errors += 1;
        if (!lastErrorTimestamp) {
          lastErrorTimestamp = log.timestamp;
        }
      }
    }

    return {
      totalInteractions: total,
      successfulInteractions: successes,
      failedInteractions: failures,
      successRatePercentage: total > 0 ? Math.round((successes / total) * 100) : 100,
      categoryCounts,
      endpointCounts,
      lastErrorTimestamp,
    };
  }

  /**
   * Clears in-memory buffer
   */
  public clearLogs(): void {
    this.logs = [];
  }
}

// Singleton diagnostic service instance
export const paystackDiagnostics = new PaystackDiagnosticService();
