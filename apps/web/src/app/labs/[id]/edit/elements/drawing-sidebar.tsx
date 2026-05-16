"use client";

import type { DrawingElement as DrawingEl } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";

interface Props {
  element: DrawingEl;
  slideIndex: number;
  dispatch: React.Dispatch<EditorAction>;
}

// Small swatch palette so non-technical teachers don't need to remember hex
// codes. Free entry via the native color input below.
const COLOR_SWATCHES = [
  "#111827", // near-black
  "#dc2626", // red
  "#ea580c", // orange
  "#ca8a04", // amber
  "#16a34a", // green
  "#0891b2", // cyan
  "#2563eb", // blue
  "#7c3aed", // violet
  "#db2777", // pink
  "#ffffff", // white
];

// Stroke-width presets in canvas-px. 1920×1080 canvas needs bigger nominal
// widths than a typical doc canvas would.
const WIDTH_PRESETS = [2, 4, 6, 10, 16, 24];

export function DrawingSidebar({ element, slideIndex, dispatch }: Props) {
  function update(patch: Partial<DrawingEl>) {
    dispatch({
      type: "UPDATE_ELEMENT",
      slideIndex,
      element: { ...element, ...patch },
    });
  }

  function clearStrokes() {
    if (element.strokes.length === 0) return;
    update({ strokes: [] });
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 text-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Drawing
      </h2>

      <div className="mb-4">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Pen color
        </div>
        <div className="mb-2 grid grid-cols-5 gap-1.5">
          {COLOR_SWATCHES.map((c) => {
            const active = element.currentColor.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                onClick={() => update({ currentColor: c })}
                title={c}
                className={`h-7 w-7 rounded border ${active ? "ring-2 ring-indigo-500 ring-offset-1" : "border-gray-200 hover:border-gray-400"}`}
                style={{ backgroundColor: c }}
              />
            );
          })}
        </div>
        <input
          type="color"
          value={element.currentColor}
          onChange={(e) => update({ currentColor: e.target.value })}
          className="h-7 w-full cursor-pointer rounded border border-gray-300"
          aria-label="Custom pen color"
        />
      </div>

      <div className="mb-4">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Stroke width
        </div>
        <div className="mb-2 grid grid-cols-6 gap-1">
          {WIDTH_PRESETS.map((w) => {
            const active = element.currentWidth === w;
            return (
              <button
                key={w}
                onClick={() => update({ currentWidth: w })}
                title={`${w}px`}
                className={`flex h-8 items-center justify-center rounded text-[11px] ${active ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <span
                  style={{
                    display: "block",
                    width: "70%",
                    height: Math.min(w / 2, 10),
                    background: "currentColor",
                    borderRadius: 999,
                  }}
                />
              </button>
            );
          })}
        </div>
        <input
          type="number"
          value={element.currentWidth}
          min={1}
          max={64}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n) || n < 1) return;
            update({ currentWidth: Math.min(64, Math.max(1, Math.round(n))) });
          }}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
          aria-label="Custom stroke width (px)"
        />
      </div>

      <div className="mb-2 flex items-center justify-between rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-500">
        <span>
          {element.strokes.length}{" "}
          {element.strokes.length === 1 ? "stroke" : "strokes"}
        </span>
        <button
          onClick={clearStrokes}
          disabled={element.strokes.length === 0}
          className="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
        >
          Clear all
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-gray-400">
        Click and drag inside the box to draw. Each stroke is one undo step.
      </p>
    </div>
  );
}
