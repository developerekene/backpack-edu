import React, { useState } from "react";
import {
  ShieldCheck,
  Scale,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatPriceWithDecimals } from "../../lib/price";

export interface CheckoutDisclosureProps {
  amount: number;
  currency: string;
  itemTitle: string;
  baseAmount?: number;
  feeAmount?: number;
  feeLabel?: string;
  providerName?: string;
  transactionType?: "tuition" | "donation" | "sponsorship";
  isAcknowledged: boolean;
  onAcknowledgeChange: (acknowledged: boolean) => void;
  compact?: boolean;
}

export const CheckoutDisclosure: React.FC<CheckoutDisclosureProps> = ({
  amount,
  currency,
  itemTitle,
  baseAmount,
  feeAmount,
  feeLabel = "Platform Service Addition (+15%)",
  providerName,
  transactionType = "tuition",
  isAcknowledged,
  onAcknowledgeChange,
  compact = false,
}) => {
  const [showFullLegal, setShowFullLegal] = useState(false);

  const displayBase =
    baseAmount !== undefined ? baseAmount : amount;
  const displayFee = feeAmount !== undefined ? feeAmount : 0;

  return (
    <div
      className={`rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/70 to-slate-50 dark:from-indigo-950/30 dark:to-slate-900/60 text-slate-700 dark:text-slate-300 ${
        compact ? "p-3 space-y-2.5 text-[11px]" : "p-4 space-y-3.5 text-xs"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/40 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-xs">
              Checkout Summary & Buyer Protection
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Transparent cost breakdown and terms prior to completing payment.
            </p>
          </div>
        </div>
      </div>

      {/* Itemized Price & Cost Transparency Table */}
      <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800 flex justify-between">
          <span>Service / Allocation Item</span>
          <span>Amount</span>
        </div>

        <div className="flex justify-between items-center text-slate-800 dark:text-slate-200">
          <span className="truncate pr-2 font-medium">
            {transactionType === "tuition"
              ? `Tuition: ${itemTitle}`
              : transactionType === "sponsorship"
              ? `Student Sponsorship: ${itemTitle}`
              : `General Course Tuition Contribution: ${itemTitle}`}
          </span>
          <span className="font-semibold shrink-0">
            {currency} {formatPriceWithDecimals(displayBase)}
          </span>
        </div>

        {displayFee > 0 && (
          <div className="flex justify-between items-center text-indigo-700 dark:text-indigo-400">
            <span className="truncate pr-2">{feeLabel}</span>
            <span className="font-semibold shrink-0">
              + {currency} {formatPriceWithDecimals(displayFee)}
            </span>
          </div>
        )}

        {displayFee === 0 && transactionType === "tuition" && (
          <div className="flex justify-between items-center text-slate-500 text-[11px]">
            <span>Estimated Processing / Platform Addition:</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Included ({currency} 0.00 Surcharge)
            </span>
          </div>
        )}

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline font-bold">
          <div className="flex flex-col">
            <span className="text-slate-900 dark:text-white text-xs">
              Final Total Amount Payable:
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
              Guaranteed exact total • Zero hidden checkout fees
            </span>
          </div>
          <span className="text-sm sm:text-base font-extrabold text-indigo-600 dark:text-indigo-400">
            {currency} {formatPriceWithDecimals(amount)}
          </span>
        </div>
      </div>

      {/* Mandatory Statutory Consumer Protections Summary */}
      <div className="space-y-1.5 text-[11px] leading-relaxed">
        <div className="flex items-start space-x-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
          <span>
            <strong>Supplier of Record:</strong>{" "}
            {providerName ? `${providerName} via ` : ""}Backpack Digital Educational Services. Billing is a transparent one-time transaction; no recurring subscriptions or unauthorized debits will occur.
          </span>
        </div>
        <div className="flex items-start space-x-2">
          <Lock className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
          <span>
            <strong>Payment Security & Encryption:</strong> Transactions are routed through PCI-DSS Level 1 certified gateways (Paystack). Backpack never stores sensitive card credentials, account passwords, or CVV data.
          </span>
        </div>
        <div className="flex items-start space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
          <span>
            <strong>Right to Refund & Resolution:</strong> In line with national and international consumer protection standards, buyers are guaranteed full transparency and prompt dispute resolution. Contact{" "}
            <a
              href="mailto:support@backpack.africa?subject=Consumer%20Checkout%20Dispute"
              className="text-indigo-600 dark:text-indigo-400 underline font-medium hover:text-indigo-700"
            >
              support@backpack.africa
            </a>{" "}
            for support within 14 business days.
          </span>
        </div>
      </div>

      {/* Expandable Consumer Protection Details Section */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowFullLegal(!showFullLegal)}
          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center space-x-1"
        >
          <span>
            {showFullLegal
              ? "Hide Detailed Consumer Protection Terms"
              : "Read Detailed Consumer Protection Terms"}
          </span>
          {showFullLegal ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {showFullLegal && (
          <div className="mt-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10.5px] text-slate-600 dark:text-slate-300 space-y-2 animate-in fade-in duration-150">
            <p className="font-bold text-slate-900 dark:text-white">
              Consumer Protections & Standards:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong>Accurate Pricing Guarantee:</strong> Complete display of total price and any applicable service additions before payment is authorized. Zero surprise additions or undisclosed recurring debits.
              </li>
              <li>
                <strong>Clear Merchant & Service Identification:</strong> Immediate visibility of the school or organization providing the curriculum and course execution.
              </li>
              <li>
                <strong>Fair Cancellation & Dispute Handling:</strong> Prompt, equitable dispute resolution and refund procedures if a program cannot be delivered as published.
              </li>
              <li>
                <strong>Instant Digital Provisioning:</strong> Immediate confirmation and enrollment / sponsorship activation upon electronic payment verification.
              </li>
            </ul>
            <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400">
                Official Consumer Protection Standards
              </span>
              <Link
                to="/policy#checkout-disclosures"
                target="_blank"
                className="text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                <span>View Full Policy Document</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Mandatory Checkbox Acknowledgment */}
      <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
        <label className="flex items-start space-x-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isAcknowledged}
            onChange={(e) => onAcknowledgeChange(e.target.checked)}
            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-300 dark:border-slate-700 shrink-0"
          />
          <span className="text-[11px] leading-tight font-medium text-slate-800 dark:text-slate-200">
            I have reviewed the itemized cost breakdown, acknowledge the total amount payable of{" "}
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {currency} {formatPriceWithDecimals(amount)}
            </span>
            , and agree to the clear checkout disclosures, Terms of Service, and Refund Policy.
          </span>
        </label>
      </div>
    </div>
  );
};
