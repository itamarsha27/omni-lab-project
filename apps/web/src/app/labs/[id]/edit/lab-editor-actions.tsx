"use client";

import { useRef, useState, useTransition } from "react";
import { renameLab, deleteLab } from "../../actions";

export function LabEditorActions({
  labId,
  initialTitle,
}: {
  labId: string;
  initialTitle: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const [isPending, startTransition] = useTransition();
  const deleteRef = useRef<HTMLDialogElement>(null);

  function saveTitle() {
    setEditingTitle(false);
    if (title.trim() === initialTitle) return;
    startTransition(() => renameLab(labId, title));
  }

  return (
    <div className="flex items-center gap-4">
      {/* Editable title */}
      {editingTitle ? (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveTitle();
            if (e.key === "Escape") {
              setTitle(initialTitle);
              setEditingTitle(false);
            }
          }}
          autoFocus
          className="rounded-lg border border-indigo-300 px-3 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      ) : (
        <button
          onClick={() => setEditingTitle(true)}
          className="rounded px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          title="Click to rename"
        >
          {title}
        </button>
      )}

      {/* Disabled actions */}
      <button
        disabled
        title="Publishing coming in v1.1"
        className="text-sm font-medium text-gray-300 cursor-not-allowed"
      >
        Publish
      </button>
      <button
        disabled
        title="Live sessions coming in M3"
        className="text-sm font-medium text-gray-300 cursor-not-allowed"
      >
        Initiate
      </button>

      {/* Delete */}
      <button
        onClick={() => deleteRef.current?.showModal()}
        className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
      >
        Delete
      </button>

      {/* Delete confirmation dialog */}
      <dialog
        ref={deleteRef}
        className="w-full max-w-sm rounded-xl p-6 shadow-xl [&::backdrop]:bg-black/40"
      >
        <h2 className="text-base font-semibold text-gray-900">Delete lab?</h2>
        <p className="mt-2 text-sm text-gray-500">
          &ldquo;{title}&rdquo; will be permanently deleted. This cannot be
          undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => deleteRef.current?.close()}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              deleteRef.current?.close();
              startTransition(() => deleteLab(labId));
            }}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            Delete
          </button>
        </div>
      </dialog>
    </div>
  );
}
