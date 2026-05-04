import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-end gap-3 px-6 py-4">
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
            href="/dashboard"
            className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Dashboard
          </Link>
          <UserButton />
        </SignedIn>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="max-w-2xl text-center">
          <Logo variant="full" width={400} className="mx-auto" priority />
          <p className="mt-6 text-lg text-gray-600">
            A classroom platform purpose-built for exact sciences teachers.
          </p>
        </div>
      </div>
    </main>
  );
}
