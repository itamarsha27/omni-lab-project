import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8" style={{ minHeight: "calc(100vh - 57px)" }}>
      <div className="max-w-2xl text-center">
        <Logo variant="full" width={400} className="mx-auto" priority />
        <p className="mt-6 text-lg text-gray-600">
          A classroom platform purpose-built for exact sciences teachers.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <SignedIn>
            <Link
              href="/labs"
              className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-6 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Go to My Labs →
            </Link>
          </SignedIn>
          <SignedOut>
            <Link
              href="/sign-up"
              className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-6 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Get started free →
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex h-10 items-center rounded-lg border border-gray-200 px-6 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign in
            </Link>
          </SignedOut>
        </div>
      </div>
    </main>
  );
}
