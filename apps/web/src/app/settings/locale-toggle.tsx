"use client";

import { useTransition } from "react";
import { changeLocaleAction } from "./actions";
import type { SupportedLocale } from "@/lib/i18n";

type LocaleToggleProps = {
  current: SupportedLocale;
};

const LOCALES: { value: SupportedLocale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "he", label: "עברית" },
];

export function LocaleToggle({ current }: LocaleToggleProps) {
  // useTransition lets us mark server-action calls as a "transition" so the
  // UI can show a pending state without blocking interactions.
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className="inline-flex rounded-lg border border-gray-200 p-1"
      role="radiogroup"
      aria-label="Language"
    >
      {LOCALES.map(({ value, label }) => {
        const isActive = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={isPending}
            onClick={() => {
              if (isActive) return;
              startTransition(async () => {
                await changeLocaleAction(value);
                // Hard reload so Clerk's provider re-initializes with the
                // new localization. revalidatePath alone is not enough —
                // Clerk's components don't re-react to localization changes
                // mid-session.
                window.location.reload();
              });
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-gray-900 text-white"
                : "text-gray-700 hover:bg-gray-100"
            } ${isPending ? "opacity-60" : ""}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
