import { auth } from "@clerk/nextjs/server";
import { prisma } from "@omnilab/db";
import { notFound, redirect } from "next/navigation";
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
      {/* Editor top bar — Google Slides style: title row + menu bar row */}
      <div className="border-b border-gray-200 bg-white">
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
