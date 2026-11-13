/**
 * Cookie consent, implemented with Google Consent Mode v2.
 *
 * - EEA, UK, and Switzerland: analytics and ad cookies are OFF until the
 *   visitor clicks Accept (opt-in, as GDPR requires).
 * - Everywhere else: ON by default, and "Decline" turns them off (opt-out).
 * - The visitor's choice is saved in localStorage and re-applied on every
 *   page load, before Google Tag Manager / Google Analytics run.
 *
 * Google tags read these consent signals: when storage is "denied" they set
 * no cookies (they send only cookieless pings).
 */

export const COOKIE_CONSENT_KEY = 'cookie-consent';
export const OPEN_COOKIE_SETTINGS_EVENT = 'open-cookie-settings';

export type ConsentChoice = 'accepted' | 'declined';

// EU/EEA member states + UK + Switzerland (ISO 3166-1 alpha-2)
const OPT_IN_REGIONS = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'GB', 'CH',
];

const DENIED = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
};
const GRANTED = {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'granted',
};

/**
 * Inline script for <head>. Must run before GTM/GA load. Sets regional
 * defaults, then re-applies the visitor's saved choice.
 */
export const CONSENT_DEFAULTS_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', ${JSON.stringify({ ...DENIED, region: OPT_IN_REGIONS, wait_for_update: 500 })});
gtag('consent', 'default', ${JSON.stringify(GRANTED)});
try {
  var c = localStorage.getItem('${COOKIE_CONSENT_KEY}');
  if (c === 'declined') gtag('consent', 'update', ${JSON.stringify(DENIED)});
  if (c === 'accepted') gtag('consent', 'update', ${JSON.stringify(GRANTED)});
} catch (e) {}
`;

/** Save the visitor's choice and tell Google tags immediately. */
export function applyConsentChoice(choice: ConsentChoice) {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, choice);
  } catch {
    // Storage blocked (e.g. private mode): still apply for this page view.
  }
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  // gtag() pushes the `arguments` object; Google tags require that shape.
  (function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  })('consent', 'update', choice === 'accepted' ? GRANTED : DENIED);
}

/** Re-open the cookie banner (e.g. from a "Cookie settings" link). */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}

/**
 * Whether the cookie banner is currently on screen. Other fixed-position UI
 * (like the feedback bubble) uses this to get out of its way on small screens.
 */
export const COOKIE_BANNER_VISIBILITY_EVENT = 'cookie-banner-visibility';

export function setCookieBannerVisible(visible: boolean) {
  document.documentElement.dataset.cookieBanner = visible ? 'open' : 'closed';
  window.dispatchEvent(new CustomEvent(COOKIE_BANNER_VISIBILITY_EVENT, { detail: visible }));
}

export function isCookieBannerVisible(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.cookieBanner === 'open';
}
