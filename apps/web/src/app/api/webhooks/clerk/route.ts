import { headers } from "next/headers";
import { Webhook } from "svix";
import { prisma } from "@omnilab/db";

type ClerkEmailAddress = {
  id: string;
  email_address: string;
};

type ClerkUserPayload = {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string;
};

type ClerkWebhookEvent =
  | { type: "user.created"; data: ClerkUserPayload }
  | { type: "user.updated"; data: ClerkUserPayload }
  | { type: "user.deleted"; data: { id: string; deleted: true } };

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const headerStore = await headers();
  const svixId = headerStore.get("svix-id");
  const svixTimestamp = headerStore.get("svix-timestamp");
  const svixSignature = headerStore.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();

  const wh = new Webhook(secret);
  let event: ClerkWebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const { id, email_addresses, primary_email_address_id, first_name, last_name, image_url } = event.data;

    const primaryEmail = email_addresses.find((e) => e.id === primary_email_address_id);
    if (!primaryEmail) {
      return new Response("No primary email on user payload", { status: 400 });
    }

    const name =
      [first_name, last_name].filter(Boolean).join(" ") || primaryEmail.email_address;

    await prisma.user.upsert({
      where: { clerkId: id },
      create: {
        clerkId: id,
        email: primaryEmail.email_address,
        name,
        imageUrl: image_url,
        primaryRole: "TEACHER",
      },
      update: {
        email: primaryEmail.email_address,
        name,
        imageUrl: image_url,
      },
    });
  }

  // user.deleted: we keep the row so labs/sessions referencing this user stay intact.
  // A future moderation flow can handle account removal explicitly.

  return new Response(null, { status: 200 });
}
