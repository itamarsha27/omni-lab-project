import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Logo } from "./logo";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3">
      <Link href="/" className="flex items-center">
        <Logo variant="mark" height={32} priority />
      </Link>

      <nav className="flex items-center gap-3">
        <Link
          href="/settings"
          className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-gray-500 hover:text-gray-800"
        >
          Settings
        </Link>

        <SignedOut>
          <Link
            href="/sign-in"
            className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex h-9 items-center rounded-md bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800"
          >
            Sign up
          </Link>
        </SignedOut>

        <SignedIn>
          <Link
            href="/labs"
            className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            My Labs
          </Link>
          <UserButton />
        </SignedIn>
      </nav>
    </header>
  );
}
