import Link from "next/link";
import { getCurrentLocale } from "@/lib/i18n";
import { LocaleToggle } from "./locale-toggle";

export default async function SettingsPage() {
  const locale = await getCurrentLocale();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to home
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Language</h2>
        <p className="mt-1 text-sm text-gray-600">
          Affects authentication forms (sign-in, sign-up, account management).
          More of OmniLab will be translated over time.
        </p>
        <div className="mt-4">
          <LocaleToggle current={locale} />
        </div>
      </section>
    </main>
  );
}
