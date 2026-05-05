"use client";

import { useTransition } from "react";
import { createLab } from "./actions";

export function NewLabButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => createLab())}
      disabled={isPending}
      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
    >
      <span className="text-lg leading-none">+</span>
      {isPending ? "Creating…" : "New Lab"}
    </button>
  );
}
