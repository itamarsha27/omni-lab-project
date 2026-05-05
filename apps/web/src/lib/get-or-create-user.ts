import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@omnilab/db";
import { redirect } from "next/navigation";

/**
 * Returns the OmniLab DB user for the currently authenticated Clerk session.
 * If the user exists in Clerk but not in our DB (e.g. webhook missed them),
 * we create the record on the spot so they are never stuck in a redirect loop.
 */
export async function getOrCreateUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  // User is authenticated but missing from DB — fetch their profile from Clerk
  // and upsert so concurrent requests don't race into a duplicate-key error.
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const email =
    clerkUser.emailAddresses[0]?.emailAddress ?? `${clerkId}@unknown.invalid`;
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    email;

  return prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: {
      clerkId,
      email,
      name,
      imageUrl: clerkUser.imageUrl,
      primaryRole: "TEACHER",
    },
  });
}
