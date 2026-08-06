/**
 * Analytics · GA4 + Clarity loader (consent-gated)
 *
 * Pattern: Observer · listens to cookie-consent-change events
 * Only loads GA/Clarity scripts AFTER user grants analytics consent.
 * Revokes consent by removing scripts if user revokes later.
 */

// ─── Configuration ───────────────────────────────────────────────────────────

const GA_MEASUREMENT_ID = import.meta.env.PUBLIC_GA_ID || ""; // e.g. "G-XXXXXXXXXX"
const CLARITY_PROJECT_ID = import.meta.env.PUBLIC_CLARITY_ID || ""; // e.g. "abcdefghij"

// ─── GA4 Loader ──────────────────────────────────────────────────────────────

function loadGA4(measurementId: string): void {
  if (!measurementId || document.getElementById("ga4-script")) return;

  // gtag.js script
  const script = document.createElement("script");
  script.id = "ga4-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // dataLayer + gtag init
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer!.push(args);
  }
  gtag("js", new Date());
  gtag("config", measurementId, {
    send_page_view: true,
    cookie_flags: "SameSite=None;Secure",
  });

  // Expose for manual event tracking
  (window as any).gtag = gtag;
}

function unloadGA4(): void {
  const script = document.getElementById("ga4-script");
  if (script) script.remove();
  delete (window as any).gtag;
  delete (window as any).dataLayer;
}

// ─── Clarity Loader ──────────────────────────────────────────────────────────

function loadClarity(projectId: string): void {
  if (!projectId || document.getElementById("clarity-script")) return;

  (function(c: any, l: Document, a: string, r: string, i: string) {
    if ((c as any)[i]) return;
    const cl = (c as any)[i] = function(...args: any[]) {
      (cl.q = cl.q || []).push(args);
    };
    cl.q = cl.q || [];
    const s = l.createElement(a) as HTMLScriptElement;
    s.async = true;
    s.src = `https://www.clarity.ms/tag/${r}`;
    s.id = "clarity-script";
    const h = l.head || l.getElementsByTagName("head")[0];
    h.insertBefore(s, h.firstChild);
  })(window, document, "script", projectId, "clarity");
}

function unloadClarity(): void {
  const script = document.getElementById("clarity-script");
  if (script) script.remove();
}

// ─── Init: listen to consent changes ─────────────────────────────────────────

export function initAnalytics(): void {
  if (typeof window === "undefined") return;

  // Check current consent state on load
  const mgr = (window as any).__cookieConsent;
  if (mgr && mgr.isAllowed("analytics")) {
    if (GA_MEASUREMENT_ID) loadGA4(GA_MEASUREMENT_ID);
    if (CLARITY_PROJECT_ID) loadClarity(CLARITY_PROJECT_ID);
  }

  // Listen for consent changes
  window.addEventListener("cookie-consent-change", ((e: CustomEvent) => {
    const detail = e.detail;
    if (detail?.analytics) {
      // Consent granted → load
      if (GA_MEASUREMENT_ID) loadGA4(GA_MEASUREMENT_ID);
      if (CLARITY_PROJECT_ID) loadClarity(CLARITY_PROJECT_ID);
    } else {
      // Consent revoked → unload
      unloadGA4();
      unloadClarity();
    }
  }) as EventListener);
}

// ─── Auto-init ───────────────────────────────────────────────────────────────

if (typeof window !== "undefined") {
  // Wait for consent manager to be available
  if ((window as any).__cookieConsent) {
    initAnalytics();
  } else {
    window.addEventListener("DOMContentLoaded", initAnalytics);
  }
}

// ─── Env var declaration for TypeScript ──────────────────────────────────────

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    clarity?: (...args: any[]) => void;
  }
}
