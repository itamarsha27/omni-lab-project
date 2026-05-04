import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-end gap-3 p-6">
        <SignedOut>
          <Link
            href="/sign-in"
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Sign up
          </Link>
        </SignedOut>
        <SignedIn>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Dashboard
          </Link>
          <UserButton />
        </SignedIn>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center p-8 -mt-12">
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
