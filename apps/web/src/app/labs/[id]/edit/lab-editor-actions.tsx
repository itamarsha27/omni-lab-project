"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
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
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const deleteRef = useRef<HTMLDialogElement>(null);

  function saveTitle() {
    setEditingTitle(false);
    if (title.trim() === initialTitle) return;
    startTransition(() => renameLab(labId, title));
  }

  function openRename() {
    setFileMenuOpen(false);
    setEditingTitle(true);
  }

  function openDelete() {
    setFileMenuOpen(false);
    deleteRef.current?.showModal();
  }

  return (
    <>
      {/* Row 1 — back link + editable title (mirrors Google Slides top strip) */}
      <div className="flex items-center gap-3 px-4 pt-2 pb-0.5">
        <Link
          href="/labs"
          className="shrink-0 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← My Labs
        </Link>

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
            className="rounded border border-indigo-300 px-2 py-0.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            title="Click to rename"
            className="max-w-xs truncate rounded px-1 py-0.5 text-sm font-medium text-gray-800 hover:bg-gray-100 transition-colors"
          >
            {title}
          </button>
        )}
      </div>

      {/* Row 2 — menu bar (File + future: Edit, View, Insert, …) */}
      <div className="flex items-center px-3 pb-1">
        <div className="relative">
          <button
            onClick={() => setFileMenuOpen((v) => !v)}
            className="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            File
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8L1 3h10L6 8z" />
            </svg>
          </button>

          {fileMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFileMenuOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-20 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                <button
                  onClick={openRename}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Rename
                </button>

                <div className="my-1 border-t border-gray-100" />

                <button
                  disabled
                  title="Coming in v1.1"
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 cursor-not-allowed"
                >
                  Publish
                </button>
                <button
                  disabled
                  title="Coming in M3"
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 cursor-not-allowed"
                >
                  Initiate Live Session
                </button>

                <div className="my-1 border-t border-gray-100" />

                <button
                  onClick={openDelete}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog — fixed to viewport center */}
      <dialog
        ref={deleteRef}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 w-full max-w-sm rounded-xl p-6 shadow-xl [&::backdrop]:bg-black/40"
      >
        <h2 className="text-base font-semibold text-gray-900">Delete lab?</h2>
        <p className="mt-2 text-sm text-gray-500">
          &ldquo;{title}&rdquo; will be permanently deleted. This cannot be undone.
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
    </>
  );
}
