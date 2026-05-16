"use client";

import { useMemo } from "react";
import katex from "katex";
import {
  ARROW_LIKE_KINDS,
  type ShapeElement as ShapeEl,
  type ShapeKind,
} from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";

interface Props {
  element: ShapeEl;
  slideIndex: number;
  dispatch: React.Dispatch<EditorAction>;
}

const SHAPE_OPTIONS: { kind: ShapeKind; label: string }[] = [
  { kind: "rectangle", label: "Rectangle" },
  { kind: "circle", label: "Circle / Ball" },
  { kind: "triangle", label: "Triangle / Wedge" },
  { kind: "ground", label: "Ground / Surface" },
  { kind: "spring", label: "Spring" },
  { kind: "arrow", label: "Arrow" },
  { kind: "arrow-double", label: "Double arrow" },
  { kind: "arrow-curved", label: "Curved arrow" },
  { kind: "vector", label: "Vector (physics)" },
  { kind: "line", label: "Line" },
];

const HAS_FILL: ReadonlySet<ShapeKind> = new Set([
  "rectangle",
  "circle",
  "triangle",
]);

const STROKE_STYLES: { style: "solid" | "dashed" | "dotted"; label: string }[] = [
  { style: "solid", label: "Solid" },
  { style: "dashed", label: "Dashed" },
  { style: "dotted", label: "Dotted" },
];

const DEFAULT_FILL_COLOR = "#ffffff";

export function ShapeSidebar({ element, slideIndex, dispatch }: Props) {
  function update(patch: Partial<ShapeEl>) {
    dispatch({
      type: "UPDATE_ELEMENT",
      slideIndex,
      element: { ...element, ...patch },
    });
  }

  const family: "arrow" | "shape" = ARROW_LIKE_KINDS.has(element.shape) ? "arrow" : "shape";
  const visibleOptions = SHAPE_OPTIONS.filter((opt) =>
    family === "arrow" ? ARROW_LIKE_KINDS.has(opt.kind) : !ARROW_LIKE_KINDS.has(opt.kind),
  );

  const isFilled = element.fill !== "none" && element.fill !== "transparent";
  const showFill = HAS_FILL.has(element.shape);
  const currentStyle = element.strokeStyle ?? "solid";

  function setKind(newKind: ShapeKind) {
    // Auto-square the bounding box when switching TO circle, so the visual
    // is round (not centered-inside-a-rectangle). Aspect-lock during resize
    // keeps it square afterward.
    if (newKind === "circle" && element.width !== element.height) {
      const size = Math.min(element.width, element.height);
      update({ shape: newKind, width: size, height: size });
      return;
    }
    update({ shape: newKind });
  }

  const labelPreviewHtml = useMemo(() => {
    if (!element.label || !element.label.trim()) return "";
    try {
      return katex.renderToString(element.label, {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      return "";
    }
  }, [element.label]);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 text-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {family === "arrow" ? "Arrow" : "Shape"}
      </h2>

      <label className="mb-4 flex flex-col">
        <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Kind
        </span>
        <select
          value={element.shape}
          onChange={(e) => setKind(e.target.value as ShapeKind)}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        >
          {visibleOptions.map((opt) => (
            <option key={opt.kind} value={opt.kind}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mb-1 flex flex-col">
        <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Label
        </span>
        <input
          type="text"
          value={element.label ?? ""}
          onChange={(e) => update({ label: e.target.value })}
          placeholder='e.g. F_g, v_0, \theta, 2 kg'
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </label>
      {labelPreviewHtml ? (
        <div className="mb-4 mt-1 flex items-baseline gap-1 text-[11px] text-gray-500">
          <span className="shrink-0">Preview:</span>
          <span
            className="text-sm text-gray-900"
            dangerouslySetInnerHTML={{ __html: labelPreviewHtml }}
          />
        </div>
      ) : (
        <p className="mb-4 mt-1 text-[11px] leading-relaxed text-gray-400">
          LaTeX syntax — underscores subscript (<code>F_g</code>), carets superscript
          (<code>v^2</code>), <code>\theta</code> for Greek letters.
        </p>
      )}

      {showFill && (
        <div className="mb-3">
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Fill
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={isFilled}
                onChange={(e) => {
                  if (e.target.checked) {
                    update({ fill: DEFAULT_FILL_COLOR });
                  } else {
                    update({ fill: "none" });
                  }
                }}
              />
              Filled
            </label>
            <input
              type="color"
              value={isFilled ? element.fill : DEFAULT_FILL_COLOR}
              disabled={!isFilled}
              onChange={(e) => update({ fill: e.target.value })}
              className="h-7 w-14 cursor-pointer rounded border border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
            />
          </div>
        </div>
      )}

      <label className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Stroke
        </span>
        <input
          type="color"
          value={element.stroke}
          onChange={(e) => update({ stroke: e.target.value })}
          className="h-7 w-14 cursor-pointer rounded border border-gray-300"
        />
      </label>

      <label className="mb-4 flex flex-col">
        <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Stroke width
        </span>
        <input
          type="number"
          value={element.strokeWidth}
          min={1}
          max={48}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n) || n < 1) return;
            update({ strokeWidth: Math.min(48, Math.max(1, Math.round(n))) });
          }}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </label>

      <div className="mb-2">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Stroke style
        </div>
        <div className="grid grid-cols-3 gap-1">
          {STROKE_STYLES.map(({ style, label }) => {
            const active = currentStyle === style;
            return (
              <button
                key={style}
                onClick={() => update({ strokeStyle: style })}
                className={`h-8 rounded text-xs font-medium ${active ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400" : "text-gray-600 hover:bg-gray-100"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
