// Robust Paystack Gateway Helper for Custom Domain Hosting (backpack-edu.com) and Firebase
// Communicates with Backend API, Keysafe Render Gateway, and Paystack API with zero fake fallbacks.

const GATEWAY_URLS = [
  "https://keysafe-ntia.onrender.com",
  "https://keysafe-ntia-gateway.onrender.com"
];

export async function gatewayFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  // 1. Try local /api/... first (works when full-stack Express server is hosting)
  try {
    const res = await fetch(endpoint, options);
    if (res.ok || res.status < 500) {
      return res;
    }
  } catch {
    // Network error or 404 on static hosting (Firebase / backpack-edu.com)
  }

  // 2. Fallback to direct keysafe-ntia gateway endpoints for static hostings / custom domains
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  for (const base of GATEWAY_URLS) {
    try {
      // Map /api/paystack/subaccount -> /subaccount or /api/subaccount
      let targetUrl = `${base}${path.replace(/^\/api\/paystack/, "")}`;
      if (path.includes("/banks")) {
        targetUrl = `${base}/banks`;
      } else if (path.includes("/resolve-account")) {
        targetUrl = `${base}/subaccount`;
      } else if (path.includes("/subaccount/")) {
        targetUrl = `${base}${path.replace(/^\/api\/paystack/, "")}`;
      }

      const res = await fetch(targetUrl, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "X-Paystack-Mode": "test",
          "X-Environment-Mode": "test",
          ...(options.headers || {}),
        },
        signal: AbortSignal.timeout(20000),
      });

      if (res.ok) {
        return res;
      }
    } catch {
      // Try next gateway
    }
  }

  // Return final failed response if all gateways time out
  return new Response(JSON.stringify({ success: false, message: "Unable to reach Paystack gateway service. Please check your internet connection." }), {
    status: 502,
    headers: { "Content-Type": "application/json" }
  });
}
