"use client";

import { useEffect, useRef, useState } from "react";

// Word-style font-family picker: a button showing the current font name with a
// dropdown of presets. Each option's label is rendered in its own font so users
// can preview before clicking.
//
// FONTS is the curated list of presets exposed in the picker. Each entry has:
//   - id      : machine-stable key (also used as the storage value)
//   - label   : user-facing name shown in the dropdown
//   - stack   : the actual CSS font-family stack written to the element
//
// Stacks include realistic fallbacks so the slide still reads on machines where
// a Word-bundled font (Calibri, Cambria, David) is not installed.

export interface FontPreset {
  id: string;
  label: string;
  stack: string;
}

export const FONTS: FontPreset[] = [
  { id: "default", label: "Default (Inter)", stack: "var(--font-sans)" },
  { id: "calibri", label: "Calibri", stack: '"Calibri", "Carlito", "Segoe UI", sans-serif' },
  { id: "cambria", label: "Cambria", stack: '"Cambria", "Caladea", Georgia, serif' },
  { id: "david", label: "David", stack: '"David", "Frank Ruehl CLM", "Times New Roman", serif' },
  { id: "arial", label: "Arial", stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  { id: "times", label: "Times New Roman", stack: '"Times New Roman", Times, serif' },
  { id: "georgia", label: "Georgia", stack: 'Georgia, "Times New Roman", serif' },
  { id: "verdana", label: "Verdana", stack: 'Verdana, Geneva, sans-serif' },
  { id: "tahoma", label: "Tahoma", stack: 'Tahoma, Geneva, sans-serif' },
  { id: "courier", label: "Courier New", stack: '"Courier New", Courier, monospace' },
  { id: "comic", label: "Comic Sans MS", stack: '"Comic Sans MS", "Comic Sans", cursive' },
];

function findPresetByStack(stack: string | undefined): FontPreset {
  if (!stack) return FONTS[0]!;
  return FONTS.find((f) => f.stack === stack) ?? FONTS[0]!;
}

interface Props {
  /** Current font-family stack stored on the element (or undefined → default). */
  value: string | undefined;
  /** Called with the new stack when the user picks a different font. */
  onChange: (stack: string | undefined) => void;
}

export function FontFamilyControl({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = findPresetByStack(value);

  // Close on outside click — the dropdown lives in the format toolbar, which
  // already swallows mousedown for the editor's blur, so we listen at window level.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        title="Font"
        className="flex h-5 items-center gap-1 rounded border border-gray-200 px-1.5 text-[11px] text-gray-700 hover:bg-gray-100"
        style={{ fontFamily: current.stack, minWidth: 88 }}
      >
        <span className="truncate">{current.label.replace(/^Default \(.+\)$/, "Default")}</span>
        <span className="text-[9px] text-gray-500">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[10000] mt-1 max-h-64 min-w-[180px] overflow-y-auto rounded border border-gray-200 bg-white py-1 shadow-lg">
          {FONTS.map((f) => (
            <button
              key={f.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                // "default" stores undefined so element falls back to global font.
                onChange(f.id === "default" ? undefined : f.stack);
                setOpen(false);
              }}
              className={`block w-full px-3 py-1 text-left text-xs ${
                f.stack === current.stack
                  ? "bg-indigo-50 font-medium text-indigo-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              style={{ fontFamily: f.stack }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
