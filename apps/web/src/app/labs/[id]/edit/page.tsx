import { auth } from "@clerk/nextjs/server";
import { prisma } from "@omnilab/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { LabEditorActions } from "./lab-editor-actions";

export default async function LabEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect("/sign-in");

  const lab = await prisma.lab.findUnique({
    where: { id },
    select: { id: true, title: true, authorId: true },
  });

  if (!lab || lab.authorId !== user.id) notFound();

  return (
    <main className="flex min-h-screen flex-col bg-gray-50">
      {/* Editor top bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <Link
          href="/labs"
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← My Labs
        </Link>

        <LabEditorActions labId={lab.id} initialTitle={lab.title} />
      </div>

      {/* Placeholder canvas */}
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-indigo-400">
          Coming in M2
        </p>
        <p className="mt-3 text-gray-400">
          The editor canvas will be built here.
        </p>
      </div>
    </main>
  );
}
