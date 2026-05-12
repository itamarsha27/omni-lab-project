"use client";

export type PaletteType = "text" | "equation" | "image" | "video" | "quiz";

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
    label: React.ReactNode,
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
      {btn("image", <ImageGlyph />, "Drag onto slide to insert an image")}
      {btn("video", <VideoGlyph />, "Drag onto slide to insert a video")}
      {btn("quiz", "?", "Drag onto slide to insert a quiz question", quizDisabled)}
    </div>
  );
}

// Inline SVGs so the icons inherit `currentColor` from the surrounding text
// classes (text-gray-600 / text-gray-300 / text-indigo-700) and stay visually
// consistent with the letter-glyph buttons next to them.
function ImageGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path
        d="M21 17l-5-5-4 4-3-3-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VideoGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M10 9.5v5l5-2.5-5-2.5z" fill="currentColor" />
    </svg>
  );
}
