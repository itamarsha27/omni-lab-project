"use client";

import { useState } from "react";
import type { ImageElement as ImageElementType } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";
import { useElementDrag } from "./use-element-drag";

interface Props {
  element: ImageElementType;
  isSelected: boolean;
  slideIndex: number;
  scale: number;
  dispatch: React.Dispatch<EditorAction>;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function ImageElement({
  element,
  isSelected,
  slideIndex,
  scale,
  dispatch,
  onContextMenu,
}: Props) {
  const [loadError, setLoadError] = useState(false);
  const startDrag = useElementDrag({ element, scale, slideIndex, dispatch });

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd-click toggles this element in/out of the multi-selection;
      // no drag (the user is just adjusting the selection set).
      dispatch({ type: "TOGGLE_ELEMENT_SELECTION", id: element.id });
      return;
    }
    if (!isSelected) {
      dispatch({ type: "SELECT_ELEMENT", id: element.id });
    }
    startDrag(e);
  }

  const hasSrc = !!element.src.trim();
  const showPlaceholder = !hasSrc || loadError;

  return (
    <div
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex,
        cursor: "move",
        userSelect: "none",
        overflow: "hidden",
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={onContextMenu}
    >
      {showPlaceholder ? (
        <Placeholder failed={hasSrc && loadError} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={element.src}
          alt={element.alt}
          draggable={false}
          onError={() => setLoadError(true)}
          onLoad={() => setLoadError(false)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      )}
    </div>
  );
}

function Placeholder({ failed }: { failed: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background: "#f9fafb",
        border: "2px dashed #d1d5db",
        borderRadius: 8,
        color: "#9ca3af",
        fontSize: 32,
        fontWeight: 500,
        padding: 24,
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: 80, lineHeight: 1 }}>🖼</span>
      <span>
        {failed
          ? "Image failed to load — check the URL in the sidebar."
          : "Paste an image URL in the right sidebar."}
      </span>
    </div>
  );
}
