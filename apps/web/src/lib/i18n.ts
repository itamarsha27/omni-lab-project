import { cookies, headers } from "next/headers";

/** Locales OmniLab currently supports for Clerk auth UI. */
export const SUPPORTED_LOCALES = ["en", "he"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

const COOKIE_NAME = "omnilab-locale";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

function isSupportedLocale(value: string | undefined): value is SupportedLocale {
  return value !== undefined && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Resolve the locale to use for the current request.
 *
 * Precedence:
 *   1. Explicit user choice (cookie set via the settings page)
 *   2. Browser preference from the Accept-Language header
 *   3. Default (English)
 *
 * Eventually: also consult `User.preferredLang` for authenticated users
 * once we sync Clerk → Postgres in M0.4c.
 */
export async function getCurrentLocale(): Promise<SupportedLocale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (isSupportedLocale(fromCookie)) {
    return fromCookie;
  }

  const headerList = await headers();
  const acceptLanguage = headerList.get("accept-language") ?? "";
  const preferred = parseAcceptLanguage(acceptLanguage);
  for (const lang of preferred) {
    if (lang.startsWith("he")) return "he";
    if (lang.startsWith("en")) return "en";
  }

  return DEFAULT_LOCALE;
}

/**
 * Parse an Accept-Language header into an ordered list of language tags.
 * Accept-Language looks like: "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7"
 * We sort by q-value descending, then return just the language tags.
 */
function parseAcceptLanguage(header: string): string[] {
  return header
    .split(",")
    .map((entry) => {
      const [tag, ...params] = entry.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.split("=")[1] ?? "1") : 1;
      return { tag: (tag ?? "").toLowerCase(), q: Number.isNaN(q) ? 0 : q };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag);
}

/**
 * Persist the user's locale choice in a cookie. Called from a server action.
 */
export async function setLocaleCookie(locale: SupportedLocale): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, locale, {
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    httpOnly: false, // readable client-side too if we ever want to
  });
}
