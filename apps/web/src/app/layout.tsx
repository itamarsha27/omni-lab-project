import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniLab",
  description: "A classroom platform purpose-built for exact sciences teachers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased bg-white text-gray-900">{children}</body>
      </html>
    </ClerkProvider>
  );
}
