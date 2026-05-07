import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { heIL } from "@clerk/localizations";
import { getCurrentLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// Self-hosted via Next.js font optimization — no external CDN request at runtime.
// Exposed as a CSS variable so globals.css can reference it for slide content too.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

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
      <html lang="en" className={inter.variable}>
        <body className="antialiased bg-white text-gray-900 font-sans">
          <SiteHeader />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
