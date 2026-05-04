import { currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  // Middleware already redirects unauthenticated visitors to /sign-in,
  // so by the time we reach this code, we have a logged-in user.
  const user = await currentUser();

  const greeting =
    user?.firstName ??
    user?.username ??
    user?.emailAddresses[0]?.emailAddress ??
    "there";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-3 text-lg text-gray-600">
          Welcome, {greeting}.
        </p>
        <p className="mt-8 text-sm text-gray-400">
          M0.4b — auth round-trip working. Real dashboard arrives in M2.
        </p>
      </div>
    </main>
  );
}
