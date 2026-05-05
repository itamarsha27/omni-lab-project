"use client";

import { useRef, useState, useTransition } from "react";
import { renameLab, deleteLab } from "./actions";

export function LabCardMenu({
  labId,
  labTitle,
}: {
  labId: string;
  labTitle: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(labTitle);
  const [isPending, startTransition] = useTransition();
  const renameRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);

  function openRename() {
    setNewTitle(labTitle);
    setMenuOpen(false);
    renameRef.current?.showModal();
  }

  function openDelete() {
    setMenuOpen(false);
    deleteRef.current?.showModal();
  }

  return (
    <div className="relative flex items-center">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex flex-1 items-center justify-center py-2 px-3 text-xs font-medium text-gray-500 hover:bg-gray-50 border-l border-gray-100 transition-colors"
        aria-label="More options"
      >
        ···
      </button>

      {menuOpen && (
        <>
          {/* Click-outside overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 bottom-full mb-1 z-20 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            <button
              onClick={openRename}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Rename
            </button>
            <button
              onClick={openDelete}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        </>
      )}

      {/* Rename dialog */}
      <dialog
        ref={renameRef}
        className="w-full max-w-sm rounded-xl p-6 shadow-xl [&::backdrop]:bg-black/40"
      >
        <h2 className="text-base font-semibold text-gray-900">Rename Lab</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            renameRef.current?.close();
            startTransition(() => renameLab(labId, newTitle));
          }}
          className="mt-4 flex flex-col gap-4"
        >
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => renameRef.current?.close()}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </dialog>

      {/* Delete confirmation dialog */}
      <dialog
        ref={deleteRef}
        className="w-full max-w-sm rounded-xl p-6 shadow-xl [&::backdrop]:bg-black/40"
      >
        <h2 className="text-base font-semibold text-gray-900">Delete lab?</h2>
        <p className="mt-2 text-sm text-gray-500">
          &ldquo;{labTitle}&rdquo; will be permanently deleted. This cannot be
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
