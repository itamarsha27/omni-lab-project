import { prisma } from "@omnilab/db";
import { notFound } from "next/navigation";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { LabEditor } from "./lab-editor";

export default async function LabEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getOrCreateUser();

  const lab = await prisma.lab.findUnique({
    where: { id },
    select: { id: true, title: true, authorId: true, content: true },
  });

  if (!lab || lab.authorId !== user.id) notFound();

  return (
    <LabEditor
      labId={lab.id}
      initialTitle={lab.title}
      initialContent={lab.content}
    />
  );
}
