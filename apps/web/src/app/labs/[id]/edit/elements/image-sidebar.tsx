"use client";

import type { ImageElement as ImageElementType } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";

interface Props {
  element: ImageElementType;
  slideIndex: number;
  dispatch: React.Dispatch<EditorAction>;
}

export function ImageSidebar({ element, slideIndex, dispatch }: Props) {
  function update(patch: Partial<ImageElementType>) {
    dispatch({
      type: "UPDATE_ELEMENT",
      slideIndex,
      element: { ...element, ...patch },
    });
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 text-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Image block
      </h2>

      <label className="mb-3 flex flex-col">
        <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Image URL
        </span>
        <input
          type="url"
          value={element.src}
          onChange={(e) => update({ src: e.target.value })}
          placeholder="https://…"
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-gray-400">
          Paste any direct image URL. Upload-from-device is coming in a later
          pass.
        </p>
      </label>

      <label className="mb-3 flex flex-col">
        <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Alt text
        </span>
        <input
          type="text"
          value={element.alt}
          onChange={(e) => update({ alt: e.target.value })}
          placeholder="Describe the image for screen readers"
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </label>
    </div>
  );
}
