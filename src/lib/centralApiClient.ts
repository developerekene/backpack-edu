// Robust API Client for Custom Domain Hosting (backpack-edu.com) and Firebase.
// Redirects API calls to the production backend (keysafe-ntia.onrender.com) when deployed.

const PROD_BACKEND_URL = "https://keysafe-ntia.onrender.com";

export async function centralApiClient(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const isProduction = typeof window !== "undefined" && (window.location.hostname === "backpack-edu.com" || window.location.hostname === "www.backpack-edu.com");
  
  // 1. If in production, redirect to the production backend
  if (isProduction) {
    // Ensure we don't duplicate /api/ if it's already in the endpoint
    const cleanEndpoint = endpoint.startsWith("/api/") ? endpoint.substring(1) : (endpoint.startsWith("/") ? endpoint : `/${endpoint}`);
    const targetUrl = `${PROD_BACKEND_URL}/${cleanEndpoint}`;
    
    console.log(`[Central API Client] Fetching ${targetUrl}`);
    
    const res = await fetch(targetUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      mode: 'cors',
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "No text content");
        console.error(`[Central API Client] Error ${res.status} from ${targetUrl}: ${text}`);
    }
    return res;
  }

  // 2. Otherwise, use relative path (works in dev/AIS environment)
  try {
    return await fetch(endpoint, options);
  } catch (err) {
    // If relative fetch fails in dev, try fallback
    return fetch(`${PROD_BACKEND_URL}/${endpoint.startsWith("/") ? endpoint.substring(1) : endpoint}`, options);
  }
}
