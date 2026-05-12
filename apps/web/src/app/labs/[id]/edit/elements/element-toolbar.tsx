"use client";

export type PaletteType = "text" | "equation" | "quiz";

interface ElementToolbarProps {
  onStartDrag: (type: PaletteType, e: React.MouseEvent) => void;
  activeType: PaletteType | null;
  /** Slide already contains a quiz block — disables the quiz button (max one
   *  quiz per slide is a v1 locked constraint). */
  quizDisabled: boolean;
}

export function ElementToolbar({
  onStartDrag,
  activeType,
  quizDisabled,
}: ElementToolbarProps) {
  const btn = (
    type: PaletteType,
    label: string,
    title: string,
    disabled = false,
  ) => {
    const active = activeType === type;
    return (
      <button
        // Mousedown begins the drag-from-button gesture; release on canvas creates an element.
        onMouseDown={(e) => {
          if (disabled) return;
          if (e.button !== 0) return;
          onStartDrag(type, e);
        }}
        title={disabled ? `${title} — already one on this slide` : title}
        disabled={disabled}
        className={`flex h-7 w-7 items-center justify-center rounded text-sm font-semibold transition-colors select-none ${
          active
            ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400"
            : disabled
              ? "text-gray-300"
              : "text-gray-600 hover:bg-gray-100"
        }`}
        style={{ cursor: disabled ? "not-allowed" : "grab" }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex items-center gap-0.5">
      {btn("text", "T", "Drag onto slide to insert a text box")}
      {btn("equation", "∑", "Drag onto slide to insert an equation")}
      {btn("quiz", "?", "Drag onto slide to insert a quiz question", quizDisabled)}
    </div>
  );
}
