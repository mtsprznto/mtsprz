/**
 * Funnel event tracking (GA4) — consent-gated, no-op si gtag no cargado.
 *
 * Patrón: Facade sobre window.gtag (expuesto por analytics.ts tras consentimiento)
 * + Observer del consent manager (cookie-consent.ts) para el gate.
 *
 * Uso en scripts is:inline (modal, cotizar, contacto, newsletter):
 *   if (window.trackEvent) window.trackEvent("event_name", { param: value });
 */

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  // Consent gate: solo analytics (eventos de funnel = análisis, sin datos personales)
  const mgr = (window as any).__cookieConsent;
  if (mgr && !mgr.isAllowed("analytics")) return;

  const gtag = (window as any).gtag;
  if (typeof gtag !== "function") return;

  gtag("event", name, params || {});
}

declare global {
  interface Window {
    trackEvent?: typeof trackEvent;
  }
}

if (typeof window !== "undefined") {
  window.trackEvent = trackEvent;

  // Event delegation global: clicks en cualquier a[href*="wa.me"]
  // (~89 anchors en ~20 páginas — no tocar cada una).
  // Capture phase: detecta clicks aunque un handler interno haga stopPropagation.
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as Element | null;
      const anchor = target?.closest?.('a[href*="wa.me"]');
      if (anchor) {
        const a = anchor as HTMLAnchorElement;
        const label =
          a.getAttribute("aria-label") ||
          a.textContent?.trim().replace(/\s+/g, " ").slice(0, 60) ||
          "";
        trackEvent("whatsapp_click", {
          source: label,
          href: a.href.slice(0, 160),
          page: window.location.pathname,
        });
      }
    },
    true,
  );
}
