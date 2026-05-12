"use server";

import { prisma, Prisma } from "@omnilab/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { createDefaultSlide } from "@omnilab/lab-content";
import type { LabContent } from "@omnilab/lab-content";

async function getOwnedLab(labId: string) {
  const user = await getOrCreateUser();
  return { userId: user.id };
}

export async function createLab() {
  const user = await getOrCreateUser();

  const initialContent: LabContent = {
    contentVersion: 1,
    slides: [createDefaultSlide()],
  };

  const lab = await prisma.lab.create({
    data: {
      title: "Untitled Lab",
      content: initialContent as unknown as Prisma.InputJsonValue,
      authorId: user.id,
    },
  });

  redirect(`/labs/${lab.id}/edit`);
}

export async function renameLab(labId: string, title: string) {
  const { userId } = await getOwnedLab(labId);

  await prisma.lab.update({
    where: { id: labId, authorId: userId },
    data: { title: title.trim() || "Untitled Lab" },
  });

  revalidatePath("/labs");
  revalidatePath(`/labs/${labId}/edit`);
}

export async function deleteLab(labId: string) {
  const { userId } = await getOwnedLab(labId);

  await prisma.lab.delete({
    where: { id: labId, authorId: userId },
  });

  redirect("/labs");
}

export async function saveLabContent(
  labId: string,
  content: LabContent
): Promise<void> {
  const { userId } = await getOwnedLab(labId);

  // Locked v1 constraint: at most one quiz block per slide. Enforced here
  // (defense-in-depth) so a programmatic bug or stale UI can't slip an
  // invalid lab into the DB. The toolbar button is the primary UI gate.
  for (let i = 0; i < content.slides.length; i++) {
    const slide = content.slides[i]!;
    const quizCount = slide.elements.filter((el) => el.type === "quiz").length;
    if (quizCount > 1) {
      throw new Error(
        `Slide ${i + 1} has ${quizCount} quiz blocks — only one quiz per slide is allowed.`
      );
    }
  }

  await prisma.lab.update({
    where: { id: labId, authorId: userId },
    data: { content: content as unknown as Prisma.InputJsonValue },
  });
}
