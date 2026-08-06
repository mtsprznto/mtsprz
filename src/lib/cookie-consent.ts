/**
 * Cookie Consent Manager · LGPD/RGPD compliant
 *
 * Patterns applied:
 * - Singleton: single global instance
 * - Observer: CustomEvent dispatch for consent changes
 * - Strategy: category-based cookie control
 * - Facade: simplified API over complex cookie operations
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type CookieCategory = "necessary" | "analytics" | "marketing";

export interface CookieConsentState {
  necessary: true; // always true
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
  version: string;
}

export interface ConsentObserver {
  onConsentChange(state: CookieConsentState): void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CONSENT_COOKIE = "cookie_consent";
const CONSENT_VERSION = "1.0";
const CONSENT_EXPIRY_DAYS = 365;
const EVENT_NAME = "cookie-consent-change";

// ─── Strategy: Category definitions ──────────────────────────────────────────

interface CookieCategoryDef {
  id: CookieCategory;
  label: string;
  description: string;
  required: boolean;
  cookies: string[];
}

export const COOKIE_CATEGORIES: CookieCategoryDef[] = [
  {
    id: "necessary",
    label: "Necesarias",
    description:
      "Esenciales para el funcionamiento del sitio. No se pueden desactivar.",
    required: true,
    cookies: ["mtsprz_token", "csrf_token", "cookie_consent"],
  },
  {
    id: "analytics",
    label: "Analiticas",
    description:
      "Nos ayudan a entender como los visitantes usan el sitio para mejorar la experiencia.",
    required: false,
    cookies: ["_ga", "_ga_*", "_gid", "_clck"],
  },
  {
    id: "marketing",
    label: "Marketing",
    description:
      "Se usan para mostrar anuncios relevantes y medir la efectividad de campanas.",
    required: false,
    cookies: ["_fbp", "_gcl_au", "_uetsid"],
  },
];

// ─── Cookie utilities ────────────────────────────────────────────────────────

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax; Secure`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure`;
}

// ─── Singleton: Consent Manager ──────────────────────────────────────────────

class CookieConsentManager {
  private static instance: CookieConsentManager;
  private state: CookieConsentState;
  private observers: ConsentObserver[] = [];
  private bannerVisible = false;
  private preferencesVisible = false;

  private constructor() {
    this.state = this.loadState();
  }

  static getInstance(): CookieConsentManager {
    if (!CookieConsentManager.instance) {
      CookieConsentManager.instance = new CookieConsentManager();
    }
    return CookieConsentManager.instance;
  }

  // ─── State management ────────────────────────────────────────────────────

  private loadState(): CookieConsentState {
    const raw = getCookie(CONSENT_COOKIE);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CookieConsentState;
        if (parsed.version === CONSENT_VERSION) {
          return { ...parsed, necessary: true };
        }
      } catch {
        // Corrupted cookie → treat as no consent
      }
    }
    // Default: no consent given
    return {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: 0,
      version: CONSENT_VERSION,
    };
  }

  private saveState(): void {
    this.state.timestamp = Date.now();
    setCookie(CONSENT_COOKIE, JSON.stringify(this.state), CONSENT_EXPIRY_DAYS);
    this.dispatch();
  }

  // ─── Observer pattern ────────────────────────────────────────────────────

  subscribe(observer: ConsentObserver): () => void {
    this.observers.push(observer);
    return () => {
      this.observers = this.observers.filter((o) => o !== observer);
    };
  }

  private dispatch(): void {
    // CustomEvent for DOM listeners
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, { detail: { ...this.state } })
      );
    }
    // Observer pattern for direct subscribers
    for (const observer of this.observers) {
      observer.onConsentChange({ ...this.state });
    }
  }

  // ─── Public API (Facade) ─────────────────────────────────────────────────

  getState(): CookieConsentState {
    return { ...this.state };
  }

  hasConsented(): boolean {
    return this.state.timestamp > 0;
  }

  isAllowed(category: CookieCategory): boolean {
    return this.state[category];
  }

  acceptAll(): void {
    this.state = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
      version: CONSENT_VERSION,
    };
    this.saveState();
    this.bannerVisible = false;
  }

  rejectAll(): void {
    this.state = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
      version: CONSENT_VERSION,
    };
    this.saveState();
    this.bannerVisible = false;
  }

  savePreferences(prefs: {
    analytics: boolean;
    marketing: boolean;
  }): void {
    this.state = {
      necessary: true,
      analytics: prefs.analytics,
      marketing: prefs.marketing,
      timestamp: Date.now(),
      version: CONSENT_VERSION,
    };
    this.saveState();
    this.preferencesVisible = false;
    this.bannerVisible = false;
  }

  // ─── Banner state ────────────────────────────────────────────────────────

  isBannerVisible(): boolean {
    return this.bannerVisible;
  }

  showBanner(): void {
    this.bannerVisible = true;
  }

  hideBanner(): void {
    this.bannerVisible = false;
  }

  isPreferencesVisible(): boolean {
    return this.preferencesVisible;
  }

  showPreferences(): void {
    this.preferencesVisible = true;
  }

  hidePreferences(): void {
    this.preferencesVisible = false;
  }

  // ─── Reset (for testing) ─────────────────────────────────────────────────

  reset(): void {
    deleteCookie(CONSENT_COOKIE);
    this.state = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: 0,
      version: CONSENT_VERSION,
    };
    this.bannerVisible = true;
  }
}

// ─── Export singleton ────────────────────────────────────────────────────────

export const consent = CookieConsentManager.getInstance();

// ─── Auto-init: show banner if no consent ────────────────────────────────────

if (typeof window !== "undefined") {
  // Expose for inline scripts
  (window as any).__cookieConsent = consent;

  // Show banner after short delay if no consent yet
  if (!consent.hasConsented()) {
    requestAnimationFrame(() => {
      consent.showBanner();
      window.dispatchEvent(new CustomEvent("cookie-banner:show"));
    });
  }
}
