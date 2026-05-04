import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { heIL } from "@clerk/localizations";
import { getCurrentLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniLab",
  description: "A classroom platform purpose-built for exact sciences teachers.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getCurrentLocale();
  // Only Hebrew needs an explicit localization object — English is Clerk's default.
  const clerkLocalization = locale === "he" ? heIL : undefined;

  return (
    <ClerkProvider localization={clerkLocalization}>
      <html lang="en">
        <body className="antialiased bg-white text-gray-900">{children}</body>
      </html>
    </ClerkProvider>
  );
}
