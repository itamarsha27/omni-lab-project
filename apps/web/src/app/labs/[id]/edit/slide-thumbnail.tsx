"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import katex from "katex";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@omnilab/lab-content";
import type { Slide, SlideElement } from "@omnilab/lab-content";
import { ContextMenu, type ContextMenuItem } from "./context-menu";

function ThumbElement({ el }: { el: SlideElement }) {
  const base: React.CSSProperties = {
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
        style={base}
        dangerouslySetInnerHTML={{ __html: el.content }}
      />
    );
  }
  if (el.type === "equation") {
    const html = katex.renderToString(el.latex, { throwOnError: false, displayMode: true });
    return (
      <div
        style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  // Placeholder for other types — keep the structural footprint visible.
  return (
    <div
      style={{
        ...base,
        background: "rgba(99, 102, 241, 0.08)",
        border: "1px dashed #c7d2fe",
      }}
    />
  );
}

const THUMB_W = 160;
const THUMB_H = Math.round((THUMB_W * CANVAS_HEIGHT) / CANVAS_WIDTH); // 90px
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
