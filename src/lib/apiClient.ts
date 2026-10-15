// Robust API Client for Custom Domain Hosting (backpack-edu.com) and Firebase.
// Redirects API calls to the production backend (keysafe-ntia.onrender.com) when deployed.

const PROD_BACKEND_URL = "https://keysafe-ntia.onrender.com";

export async function apiClient(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const isProduction = typeof window !== "undefined" && (window.location.hostname === "backpack-edu.com" || window.location.hostname === "www.backpack-edu.com");
  
  // 1. If in production, redirect to the production backend
  if (isProduction) {
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const targetUrl = `${PROD_BACKEND_URL}${path}`;
    
    return fetch(targetUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      signal: AbortSignal.timeout(20000),
    });
  }

  // 2. Otherwise, use relative path (works in dev/AIS environment)
  try {
    const res = await fetch(endpoint, options);
    return res;
  } catch (err) {
    // If relative fetch fails in dev, try fallback
    return fetch(`${PROD_BACKEND_URL}${endpoint}`, options);
  }
}
