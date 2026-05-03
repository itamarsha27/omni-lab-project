import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <Logo variant="full" width={400} className="mx-auto" priority />
        <p className="mt-6 text-lg text-gray-600">
          A classroom platform purpose-built for exact sciences teachers.
        </p>
      </div>
    </main>
  );
}
