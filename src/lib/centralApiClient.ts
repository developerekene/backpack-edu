// Robust API Client for Local Development (Vite/Express) and Firebase Hosting / Production.
// - Local development (localhost / ai.studio): Automatically tries local Express API routes first (/api/...).
// - Firebase Hosting / Production (*.web.app, custom domains): Routes requests
//   to the Render production backend (https://keysafe-ntia.onrender.com).

const PROD_BACKEND_URL = "https://keysafe-ntia.onrender.com";

export async function centralApiClient(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes("ai.studio");

  // 1. Local development / AI Studio preview: Try local Express server first.
  if (isLocal) {
    try {
      const localRes = await fetch(endpoint, options);
      if (localRes.ok || localRes.status < 500) {
        return localRes;
      }
    } catch {
      // Fall through to Render backend if local Express server is not running
    }
  }

  // 2. Firebase Hosting / Production: Route directly to Render backend.
  let cleanPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (cleanPath.startsWith("/api/paystack")) {
    cleanPath = cleanPath.replace("/api/paystack", "");
  } else if (cleanPath.startsWith("/api/")) {
    cleanPath = cleanPath.replace("/api/", "/");
  }

  const targetUrl = `${PROD_BACKEND_URL}${cleanPath}`;
  
  try {
    const res = await fetch(targetUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        // Crucial: Inform the firewall that this is an API request, not browser navigation.
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Backpack-Edu-API-Client/1.0",
        ...(options.headers || {}),
      },
      // Note: Do NOT explicitly set mode: 'cors' here; 
      // let the browser handle it according to the backend's CORS policy.
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
        console.error(`[Central API Client] Backend returned ${res.status} for ${targetUrl}`);
    }

    return res;
  } catch (error) {
    console.error(`[Central API Client] Network error connecting to ${targetUrl}:`, error);
    return new Response(
      JSON.stringify({ error: "Network error connecting to backend", details: String(error) }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}
