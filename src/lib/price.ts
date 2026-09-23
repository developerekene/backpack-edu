/**
 * Calculates the effective tuition price including the mandatory 15% platform/tuition addition.
 * Automatically applied to all visible and invisible tuition prices and payment transactions across the platform.
 * Preserves all decimals (cents/kobo) up to 2 decimal places.
 */
export const getEffectivePrice = (price: number): number => {
  if (!price || price <= 0) return 0;
  return Math.round(price * 1.15 * 100) / 100;
};

/**
 * Calculates the exact 15% platform addition / transaction fee.
 * Preserves all decimals (cents/kobo) up to 2 decimal places.
 */
export const get15PercentFee = (price: number): number => {
  if (!price || price <= 0) return 0;
  return Math.round(price * 0.15 * 100) / 100;
};

/**
 * Formats a currency amount with all decimals (minimum 2 decimal places).
 * e.g., 150 -> "150.00", 14.25 -> "14.25", 15000 -> "15,000.00"
 */
export const formatPriceWithDecimals = (val: number): string => {
  const num = typeof val === "number" && !isNaN(val) ? val : 0;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

