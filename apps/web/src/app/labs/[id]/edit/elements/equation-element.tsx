"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import katex from "katex";
import "katex/dist/katex.min.css";
import type { EquationElement as EquationElementType } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";
import { useElementDrag } from "./use-element-drag";
import { EquationPopup } from "./equation-popup";
import { FontSizeControl } from "./font-size-control";

interface Props {
  element: EquationElementType;
  isSelected: boolean;
  slideIndex: number;
  scale: number;
  dispatch: React.Dispatch<EditorAction>;
  onContextMenu: (e: React.MouseEvent) => void;
}

const DEFAULT_FONT_PX = 64;

// Floating size toolbar — shown above a selected equation that isn't currently
// being edited. Mirrors the text-element FormatToolbarPortal pattern: portalled
// to document.body so it lives at native screen scale (not the canvas's
// transform-scaled coordinate space), repositioned on scroll/resize and on
// element drag/resize (drags don't fire scroll/resize, so we depend on the
// element prop changing to retrigger).
function EquationToolbarPortal({
  element,
  anchorRef,
  onChangeFontSize,
}: {
  element: EquationElementType;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onChangeFontSize: (px: number) => void;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    function update() {
      if (anchorRef.current) {
        const r = anchorRef.current.getBoundingClientRect();
        setPos({ top: r.top, left: r.left });
      }
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef, element.x, element.y, element.width, element.height]);

  if (!pos) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: pos.top - 8,
        left: pos.left,
        transform: "translateY(-100%)",
        zIndex: 9999,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white px-1.5 py-1 shadow-md">
        <FontSizeControl
          valuePx={element.fontSize ?? DEFAULT_FONT_PX}
          onChange={onChangeFontSize}
          size="sm"
        />
      </div>
    </div>,
    document.body,
  );
}

export function EquationElement({
  element,
  isSelected,
  slideIndex,
  scale,
  dispatch,
  onContextMenu,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  // Live-preview value driven by the popup as the user types in the math-field.
  // While editing, the in-canvas KaTeX renders from this; when not editing, we
  // render from element.latex (the committed value).
  const [draftLatex, setDraftLatex] = useState(element.latex);
  const rootRef = useRef<HTMLDivElement>(null);
  const startDrag = useElementDrag({ element, scale, slideIndex, dispatch });

  useEffect(() => {
    if (!isSelected) setIsEditing(false);
  }, [isSelected]);

  // Sync draft when the underlying element changes (e.g. undo/redo).
  useEffect(() => {
    setDraftLatex(element.latex);
  }, [element.latex]);

  function commit(latex: string) {
    setIsEditing(false);
    setDraftLatex(latex);
    if (latex === element.latex) return;
    dispatch({ type: "UPDATE_ELEMENT", slideIndex, element: { ...element, latex } });
  }

  function cancel() {
    setIsEditing(false);
    setDraftLatex(element.latex);
  }

  function setFontSize(value: number) {
    if (value === (element.fontSize ?? DEFAULT_FONT_PX)) return;
    dispatch({
      type: "UPDATE_ELEMENT",
      slideIndex,
      element: { ...element, fontSize: value },
    });
  }

  const renderedLatex = isEditing ? draftLatex : element.latex;
  const renderedHtml = katex.renderToString(renderedLatex || "\\,", {
    throwOnError: false,
    displayMode: true,
  });

  function handleMouseDown(e: React.MouseEvent) {
    if (isEditing) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      dispatch({ type: "TOGGLE_ELEMENT_SELECTION", id: element.id });
      return;
    }
    if (!isSelected) {
      dispatch({ type: "SELECT_ELEMENT", id: element.id });
    }
    startDrag(e);
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setIsEditing(true);
  }

  return (
    <>
      <div
        ref={rootRef}
        style={{
          position: "absolute",
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          zIndex: element.zIndex,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isEditing ? "default" : "move",
          userSelect: "none",
          fontSize: element.fontSize ?? DEFAULT_FONT_PX,
          overflow: "hidden",
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={onContextMenu}
      >
        <div
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
          style={{ pointerEvents: "none" }}
        />
      </div>

      {isSelected && !isEditing && (
        <EquationToolbarPortal
          element={element}
          anchorRef={rootRef}
          onChangeFontSize={setFontSize}
        />
      )}

      {isEditing && (
        <EquationPopup
          key={element.id}
          initialLatex={element.latex}
          getAnchorRect={() => rootRef.current?.getBoundingClientRect() ?? null}
          fontSize={element.fontSize ?? DEFAULT_FONT_PX}
          onFontSizeChange={setFontSize}
          onDraftChange={setDraftLatex}
          onCommit={commit}
          onCancel={cancel}
        />
      )}
    </>
  );
}
