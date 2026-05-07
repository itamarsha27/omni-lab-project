"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import katex from "katex";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@omnilab/lab-content";
import type { Slide, SlideElement } from "@omnilab/lab-content";
import { ContextMenu, type ContextMenuItem } from "./context-menu";

// Default font sizes — must match the corresponding editor element renderers
// (text-element.tsx BASE_FONT_PX, equation-element.tsx DEFAULT_FONT_PX) so the
// thumbnail is a true 1:1 mirror of how the slide renders in the editor.
const TEXT_FALLBACK_PX = 48;
const EQUATION_FALLBACK_PX = 48;

function ThumbElement({ el }: { el: SlideElement }) {
  // True-mirror rendering: every element is laid out in the same coordinate
  // space and at the same source font-size as the editor uses. The whole
  // thumbnail is then CSS-scaled by the parent's transform — equivalent to
  // taking a screenshot of the slide and shrinking it.
  const boxed: React.CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    zIndex: el.zIndex,
    overflow: "hidden",
  };
  if (el.type === "text") {
    return (
      <div
        style={{
          ...boxed,
          fontSize: el.fontSize ?? TEXT_FALLBACK_PX,
          fontFamily: el.fontFamily ?? "var(--font-sans)",
        }}
      >
        <div
          className="tiptap-content"
          dangerouslySetInnerHTML={{ __html: el.content }}
        />
      </div>
    );
  }
  if (el.type === "equation") {
    const html = katex.renderToString(el.latex, { throwOnError: false, displayMode: true });
    // Mirror the editor's equation wrapper exactly: flex-center the KaTeX HTML
    // so the equation sits dead-center in its box, same as on the slide.
    return (
      <div
        style={{
          ...boxed,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: el.fontSize ?? EQUATION_FALLBACK_PX,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  // Placeholder for other types — keep the structural footprint visible.
  return (
    <div
      style={{
        ...boxed,
        background: "rgba(99, 102, 241, 0.08)",
        border: "1px dashed #c7d2fe",
      }}
    />
  );
}

const THUMB_W = 220;
const THUMB_H = Math.round((THUMB_W * CANVAS_HEIGHT) / CANVAS_WIDTH); // ~124px
const THUMB_SCALE = THUMB_W / CANVAS_WIDTH;

interface SlideThumbnailProps {
  slide: Slide;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

export function SlideThumbnail({
  slide,
  index,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
  canDelete,
}: SlideThumbnailProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }

  const menuItems: ContextMenuItem[] = [
    { label: "Duplicate slide", onClick: onDuplicate },
    ...(canDelete
      ? [{ label: "Delete slide", onClick: onDelete, destructive: true }]
      : []),
  ];

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={onSelect}
        onContextMenu={handleContextMenu}
        className={`relative mx-auto cursor-pointer rounded select-none ${
          isSelected
            ? "ring-2 ring-indigo-500"
            : "ring-1 ring-gray-200 hover:ring-indigo-300"
        }`}
        title={`Slide ${index + 1}`}
      >
        {/* Thumbnail canvas */}
        <div
          style={{
            width: THUMB_W,
            height: THUMB_H,
            overflow: "hidden",
            position: "relative",
            borderRadius: 4,
          }}
        >
          <div
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: `scale(${THUMB_SCALE})`,
              transformOrigin: "top left",
              backgroundColor: slide.background,
              position: "absolute",
              pointerEvents: "none",
            }}
          >
            {[...slide.elements]
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((el) => (
                <ThumbElement key={el.id} el={el} />
              ))}
          </div>
        </div>

        {/* Slide number badge */}
        <span className="absolute bottom-1 right-1.5 text-[9px] font-medium text-gray-400 leading-none">
          {index + 1}
        </span>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}
