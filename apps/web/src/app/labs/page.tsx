import { auth } from "@clerk/nextjs/server";
import { prisma } from "@omnilab/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NewLabButton } from "./new-lab-button";
import { LabCardMenu } from "./lab-card-menu";

export default async function MyLabsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect("/sign-in");

  const labs = await prisma.lab.findMany({
    where: { authorId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      coverImageUrl: true,
      updatedAt: true,
    },
  });

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            My Labs
          </h1>
          <NewLabButton />
        </div>

        {labs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center text-gray-400">
            <p className="text-lg font-medium">No labs yet</p>
            <p className="mt-1 text-sm">
              Click &ldquo;New Lab&rdquo; to create your first one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {labs.map((lab) => (
              <LabCard key={lab.id} lab={lab} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

type LabSummary = {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  updatedAt: Date;
};

function LabCard({ lab }: { lab: LabSummary }) {
  const updated = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    lab.updatedAt
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md flex flex-col">
      {/* Thumbnail — clicking navigates to editor */}
      <Link href={`/labs/${lab.id}/edit`} className="group block">
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 overflow-hidden">
          {lab.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lab.coverImageUrl}
              alt={lab.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <svg
              className="h-12 w-12 text-indigo-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          )}
        </div>

        <div className="px-4 pt-4 pb-2">
          <h2 className="truncate font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
            {lab.title}
          </h2>
          {lab.description && (
            <p className="mt-1 line-clamp-2 text-sm text-gray-500">
              {lab.description}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">Updated {updated}</p>
        </div>
      </Link>

      {/* Action buttons */}
      <div className="mt-auto flex border-t border-gray-100">
        <Link
          href={`/labs/${lab.id}/edit`}
          className="flex flex-1 items-center justify-center py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          Edit
        </Link>
        <button
          disabled
          title="Publishing coming in v1.1"
          className="flex flex-1 items-center justify-center py-2 text-xs font-medium text-gray-400 cursor-not-allowed border-l border-gray-100"
        >
          Publish
        </button>
        <button
          disabled
          title="Live sessions coming in M3"
          className="flex flex-1 items-center justify-center py-2 text-xs font-medium text-gray-400 cursor-not-allowed border-l border-gray-100"
        >
          Initiate
        </button>
        <LabCardMenu labId={lab.id} labTitle={lab.title} />
      </div>
    </div>
  );
}
