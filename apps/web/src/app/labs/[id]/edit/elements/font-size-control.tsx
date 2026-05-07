"use client";

import { useEffect, useState } from "react";

// Word-style font-size controller: − / numeric input / ▾ presets / +.
// User-facing label is canvas-px ÷ 2, since 1920×1080 needs larger source pixels
// than typical document points to read at the same perceptual size.

const LABEL_TO_PX = (label: number) => label * 2;
const PX_TO_LABEL = (px: number) => Math.round(px / 2);
const MIN_LABEL = 6;
const MAX_LABEL = 200;
const STEP = 2;
// Microsoft Word's font-size dropdown presets.
const WORD_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

interface Props {
  /** Current canvas-px value (the actual stored fontSize). */
  valuePx: number;
  /** Called with the new canvas-px value when the user changes the size. */
  onChange: (px: number) => void;
  /** Visual size of the buttons — "sm" fits inside a toolbar; default is "md". */
  size?: "sm" | "md";
}

export function FontSizeControl({ valuePx, onChange, size = "md" }: Props) {
  const currentLabel = PX_TO_LABEL(valuePx);
  const [sizeInput, setSizeInput] = useState(String(currentLabel));
  const [presetOpen, setPresetOpen] = useState(false);

  // Mirror the canonical label into the editable buffer when it changes externally
  // (undo/redo, preset click, +/- buttons).
  useEffect(() => {
    setSizeInput(String(currentLabel));
  }, [currentLabel]);

  function applyLabel(label: number) {
    const clamped = Math.max(MIN_LABEL, Math.min(MAX_LABEL, Math.round(label)));
    const nextPx = LABEL_TO_PX(clamped);
    if (nextPx !== valuePx) onChange(nextPx);
  }

  function commitInput() {
    const n = parseInt(sizeInput, 10);
    if (Number.isFinite(n) && n > 0) applyLabel(n);
    else setSizeInput(String(currentLabel));
  }

  const btnSize = size === "sm" ? "h-5 w-5 text-xs" : "h-6 w-6 text-sm";
  const inputSize = size === "sm" ? "h-5 w-9 text-[11px]" : "h-6 w-10 text-xs";
  const caretSize = size === "sm" ? "h-5 px-1 text-[9px]" : "h-6 px-1 text-[10px]";

  return (
    <div className="flex items-center gap-1">
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => applyLabel(currentLabel - STEP)}
        disabled={currentLabel <= MIN_LABEL}
        aria-label="Decrease size"
        className={`flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent ${btnSize}`}
      >
        −
      </button>

      <div className="relative flex items-stretch">
        <input
          type="text"
          inputMode="numeric"
          value={sizeInput}
          onChange={(e) => setSizeInput(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={commitInput}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitInput();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === "Escape") {
              setSizeInput(String(currentLabel));
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={`rounded-l border border-r-0 border-gray-200 px-1 text-center text-gray-700 focus:border-indigo-400 focus:outline-none ${inputSize}`}
        />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setPresetOpen((o) => !o)}
          aria-label="Size presets"
          className={`flex items-center justify-center rounded-r border border-gray-200 text-gray-500 hover:bg-gray-100 ${caretSize}`}
        >
          ▾
        </button>
        {presetOpen && (
          <div className="absolute left-0 top-full z-[10000] mt-1 max-h-56 min-w-[64px] overflow-y-auto rounded border border-gray-200 bg-white py-1 shadow-lg">
            {WORD_SIZES.map((s) => (
              <button
                key={s}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  applyLabel(s);
                  setPresetOpen(false);
                }}
                className={`block w-full px-3 py-1 text-left text-xs ${
                  s === currentLabel
                    ? "bg-indigo-50 font-medium text-indigo-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => applyLabel(currentLabel + STEP)}
        disabled={currentLabel >= MAX_LABEL}
        aria-label="Increase size"
        className={`flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent ${btnSize}`}
      >
        +
      </button>
    </div>
  );
}
