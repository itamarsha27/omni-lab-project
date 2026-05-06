"use client";

interface ElementToolbarProps {
  onStartDrag: (type: "text" | "equation", e: React.MouseEvent) => void;
  activeType: "text" | "equation" | null;
}

export function ElementToolbar({ onStartDrag, activeType }: ElementToolbarProps) {
  const btn = (type: "text" | "equation", label: string, title: string) => {
    const active = activeType === type;
    return (
      <button
        // Mousedown begins the drag-from-button gesture; release on canvas creates an element.
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          onStartDrag(type, e);
        }}
        title={title}
        className={`flex h-7 w-7 items-center justify-center rounded text-sm font-semibold transition-colors select-none ${
          active
            ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400"
            : "text-gray-600 hover:bg-gray-100"
        }`}
        style={{ cursor: "grab" }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex items-center gap-0.5">
      {btn("text", "T", "Drag onto slide to insert a text box")}
      {btn("equation", "∑", "Drag onto slide to insert an equation")}
    </div>
  );
}
