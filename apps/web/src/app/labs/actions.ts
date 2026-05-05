"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@omnilab/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getOwnedLab(labId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect("/sign-in");

  return { userId: user.id, clerkId };
}

export async function createLab() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect("/sign-in");

  const lab = await prisma.lab.create({
    data: {
      title: "Untitled Lab",
      content: { slides: [] },
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
