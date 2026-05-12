"use client";

import type { VideoElement as VideoElementType } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";
import { parseVideoUrl } from "./video-url";

interface Props {
  element: VideoElementType;
  slideIndex: number;
  dispatch: React.Dispatch<EditorAction>;
}

export function VideoSidebar({ element, slideIndex, dispatch }: Props) {
  function update(patch: Partial<VideoElementType>) {
    dispatch({
      type: "UPDATE_ELEMENT",
      slideIndex,
      element: { ...element, ...patch },
    });
  }

  const parsed = parseVideoUrl(element.url);
  const status = !element.url.trim()
    ? null
    : parsed
      ? { ok: true as const, label: `${parsed.platform} · ${parsed.id}` }
      : { ok: false as const, label: "Not a recognized YouTube or Vimeo URL." };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 text-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Video block
      </h2>

      <label className="mb-3 flex flex-col">
        <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Video URL
        </span>
        <input
          type="url"
          value={element.url}
          onChange={(e) => update({ url: e.target.value })}
          placeholder="https://youtube.com/watch?v=…  or  https://vimeo.com/…"
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
        {status && (
          <p
            className={`mt-1 text-[11px] ${
              status.ok ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {status.label}
          </p>
        )}
        <p className="mt-1 text-[11px] text-gray-400">
          YouTube and Vimeo only. Playback happens live in session/preview mode
          — the editor shows a static thumbnail.
        </p>
      </label>
    </div>
  );
}
