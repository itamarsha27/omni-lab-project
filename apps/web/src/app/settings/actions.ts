"use server";

import { revalidatePath } from "next/cache";
import { setLocaleCookie, type SupportedLocale } from "@/lib/i18n";

/**
 * Server action: persist the user's locale choice and refresh the page tree
 * so server components re-read the cookie and re-render with the new locale.
 *
 * Called from <LocaleToggle /> on the settings page.
 */
export async function changeLocaleAction(locale: SupportedLocale): Promise<void> {
  await setLocaleCookie(locale);
  // Invalidate the entire layout subtree so the locale change propagates.
  revalidatePath("/", "layout");
}
