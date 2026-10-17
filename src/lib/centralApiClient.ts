// Robust API Client for Firebase Hosting (*.web.app, *.firebaseapp.com), custom domains, and local development.
// Guarantees that any Firebase Hosting or production environment unconditionally targets
// the Render production backend (https://keysafe-ntia.onrender.com) and never attempts
// relative ("/api/...") requests that fail with 404 on Firebase's free tier static hosting.

const PROD_BACKEND_URL = "https://keysafe-ntia.onrender.com";

export async function centralApiClient(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  
  // Detect if running locally or in AI Studio preview sandbox
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes("ai.studio");
  
  // Clean endpoint path to avoid double slashes or missing api prefix
  const cleanEndpoint = endpoint.startsWith("/api/") 
    ? endpoint.substring(1) 
    : (endpoint.startsWith("/") ? endpoint : `/${endpoint}`);

  // 1. If running on Firebase Hosting (*.web.app / *.firebaseapp.com), custom domain, or any production environment:
  // Unconditionally target the Render production backend.
  if (!isLocal) {
    const targetUrl = `${PROD_BACKEND_URL}/${cleanEndpoint}`;
    
    console.log(`[Central API Client] Firebase/Production Mode -> Requesting Render Backend: ${targetUrl}`);
    
    try {
      const res = await fetch(targetUrl, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        mode: 'cors',
        signal: AbortSignal.timeout(25000),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error");
        console.error(`[Central API Client] Render Backend Error (${res.status}) at ${targetUrl}: ${errorText}`);
      }
      
      return res;
    } catch (error) {
      console.error(`[Central API Client] Failed to connect to Render backend at ${targetUrl}:`, error);
      // Return a structured error Response so client code doesn't crash on network failure
      return new Response(
        JSON.stringify({ error: "Network error connecting to Render backend", details: String(error) }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 2. Local development / AI Studio preview environment:
  // Try relative path first (Vite dev proxy / server middleware), falling back to Render backend.
  try {
    const localRes = await fetch(endpoint, options);
    if (localRes.ok || localRes.status < 500) {
      return localRes;
    }
  } catch {
    // Ignore local fetch error and fallback to Render backend
  }

  const fallbackUrl = `${PROD_BACKEND_URL}/${cleanEndpoint}`;
  console.log(`[Central API Client] Local Dev Fallback -> Requesting Render Backend: ${fallbackUrl}`);
  
  try {
    return await fetch(fallbackUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      mode: 'cors',
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    console.error(`[Central API Client] Fallback fetch failed for ${fallbackUrl}:`, error);
    return new Response(
      JSON.stringify({ error: "Network error on fallback API call", details: String(error) }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}
