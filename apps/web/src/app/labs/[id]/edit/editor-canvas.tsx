"use client";

import { useEffect, useRef, useState } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@omnilab/lab-content";
import type { Slide, SlideElement } from "@omnilab/lab-content";
import type { EditorAction } from "./lab-editor";
import { TextElement } from "./elements/text-element";
import { EquationElement } from "./elements/equation-element";
import { ImageElement } from "./elements/image-element";
import { VideoElement } from "./elements/video-element";
import { QuizElement } from "./elements/quiz-element";
import { DrawingElement } from "./elements/drawing-element";
import { ShapeElement } from "./elements/shape-element";
import { GroupElement } from "./elements/group-element";
import { ElementHandles } from "./elements/element-handles";
import { MultiSelectHandles } from "./elements/multi-select-handles";
import { ContextMenu, type ContextMenuItem } from "./context-menu";

interface EditorCanvasProps {
  slide: Slide;
  slideIndex: number;
  selectedElementIds: string[];
  dispatch: React.Dispatch<EditorAction>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isDropTarget: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  elementId: string;
}

interface LassoState {
  startCanvasX: number;
  startCanvasY: number;
  currentCanvasX: number;
  currentCanvasY: number;
}

const LASSO_THRESHOLD = 4; // screen-px before a click becomes a drag-lasso

export function EditorCanvas({
  slide,
  slideIndex,
  selectedElementIds,
  dispatch,
  containerRef,
  isDropTarget,
}: EditorCanvasProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [lasso, setLasso] = useState<LassoState | null>(null);

  // Forward the parent-provided ref to the same element we observe.
  useEffect(() => {
    if (containerRef && internalRef.current) {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = internalRef.current;
    }
  }, [containerRef]);

  useEffect(() => {
    const container = internalRef.current;
    if (!container) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setScale(entry.contentRect.width / CANVAS_WIDTH);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  function handleElementContextMenu(e: React.MouseEvent, el: SlideElement) {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: "SELECT_ELEMENT", id: el.id });
    setContextMenu({ x: e.clientX, y: e.clientY, elementId: el.id });
  }

  // ── Lasso selection ──────────────────────────────────────────────────────
  // Mousedown on the empty slide background starts a rectangle drag. Mouseup
  // computes which top-level elements intersect the rectangle and replaces
  // the selection. A no-move click clears the selection (same as the
  // previous click-deselect behavior).
  function handleSlideMouseDown(e: React.MouseEvent) {
    if (e.target !== e.currentTarget) return; // only on the background itself
    if (e.button !== 0) return;
    setContextMenu(null);

    const container = internalRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startCanvasX = (e.clientX - rect.left) / scale;
    const startCanvasY = (e.clientY - rect.top) / scale;
    let dragged = false;
    let currentLasso: LassoState = {
      startCanvasX,
      startCanvasY,
      currentCanvasX: startCanvasX,
      currentCanvasY: startCanvasY,
    };

    function onMove(ev: MouseEvent) {
      const sdx = ev.clientX - startMouseX;
      const sdy = ev.clientY - startMouseY;
      if (!dragged) {
        if (Math.abs(sdx) < LASSO_THRESHOLD && Math.abs(sdy) < LASSO_THRESHOLD) return;
        dragged = true;
      }
      currentLasso = {
        startCanvasX,
        startCanvasY,
        currentCanvasX: (ev.clientX - rect.left) / scale,
        currentCanvasY: (ev.clientY - rect.top) / scale,
      };
      setLasso(currentLasso);
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setLasso(null);
      if (!dragged) {
        // Plain click on empty canvas → clear selection.
        dispatch({ type: "SELECT_ELEMENT", id: null });
        return;
      }
      // Compute intersecting top-level elements.
      const minX = Math.min(currentLasso.startCanvasX, currentLasso.currentCanvasX);
      const minY = Math.min(currentLasso.startCanvasY, currentLasso.currentCanvasY);
      const maxX = Math.max(currentLasso.startCanvasX, currentLasso.currentCanvasX);
      const maxY = Math.max(currentLasso.startCanvasY, currentLasso.currentCanvasY);
      const ids = slide.elements
        .filter(
          (el) =>
            el.x < maxX &&
            el.x + el.width > minX &&
            el.y < maxY &&
            el.y + el.height > minY,
        )
        .map((el) => el.id);
      dispatch({ type: "SELECT_ELEMENTS", ids });
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const sorted = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);
  const selectedSet = new Set(selectedElementIds);
  // The single-element selection (drives ElementHandles + sidebar) — exactly
  // when one item is selected.
  const singleSelectedEl =
    selectedElementIds.length === 1
      ? slide.elements.find((el) => el.id === selectedElementIds[0]) ?? null
      : null;
  // The multi-selection (drives MultiSelectHandles) — when 2+ items selected.
  const multiSelectedEls =
    selectedElementIds.length >= 2
      ? slide.elements.filter((el) => selectedSet.has(el.id))
      : [];
  const othersFor = (id: string) => slide.elements.filter((e) => e.id !== id);

  function renderElement(el: SlideElement) {
    const isSelected = selectedSet.has(el.id);
    const common = {
      isSelected,
      slideIndex,
      scale,
      dispatch,
      onContextMenu: (e: React.MouseEvent) => handleElementContextMenu(e, el),
    };
    switch (el.type) {
      case "text":
        return <TextElement key={el.id} element={el} {...common} />;
      case "equation":
        return <EquationElement key={el.id} element={el} {...common} />;
      case "image":
        return <ImageElement key={el.id} element={el} {...common} />;
      case "video":
        return <VideoElement key={el.id} element={el} {...common} />;
      case "quiz":
        return <QuizElement key={el.id} element={el} {...common} />;
      case "drawing":
        return <DrawingElement key={el.id} element={el} {...common} />;
      case "shape":
        return (
          <ShapeElement
            key={el.id}
            element={el}
            otherElements={othersFor(el.id)}
            {...common}
          />
        );
      case "group":
        return (
          <GroupElement
            key={el.id}
            element={el}
            otherElements={othersFor(el.id)}
            {...common}
          />
        );
      default:
        return (
          <div
            key={el.id}
            style={{
              position: "absolute",
              left: el.x,
              top: el.y,
              width: el.width,
              height: el.height,
              zIndex: el.zIndex,
              border: "2px dashed #d1d5db",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              fontSize: 28,
            }}
          >
            {el.type}
          </div>
        );
    }
  }

  const contextMenuItems: ContextMenuItem[] = contextMenu
    ? [
        {
          label: "Bring to front",
          onClick: () =>
            dispatch({ type: "BRING_TO_FRONT", slideIndex, elementId: contextMenu.elementId }),
        },
        {
          label: "Send to back",
          onClick: () =>
            dispatch({ type: "SEND_TO_BACK", slideIndex, elementId: contextMenu.elementId }),
        },
      ]
    : [];

  // Lasso overlay coords in screen-px (scaled from canvas-px).
  const lassoRect = lasso
    ? {
        left: Math.min(lasso.startCanvasX, lasso.currentCanvasX) * scale,
        top: Math.min(lasso.startCanvasY, lasso.currentCanvasY) * scale,
        width: Math.abs(lasso.currentCanvasX - lasso.startCanvasX) * scale,
        height: Math.abs(lasso.currentCanvasY - lasso.startCanvasY) * scale,
      }
    : null;

  return (
    <div
      ref={internalRef}
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        outline: isDropTarget ? "3px solid #6366f1" : "none",
        outlineOffset: -3,
        transition: "outline-color 80ms",
      }}
    >
      <div
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          backgroundColor: slide.background,
          position: "absolute",
          top: 0,
          left: 0,
        }}
        onMouseDown={handleSlideMouseDown}
      >
        {sorted.map(renderElement)}
      </div>

      {/* Single-element handles (resize + rotate + delete + ungroup) */}
      {singleSelectedEl && (
        <ElementHandles
          element={singleSelectedEl}
          scale={scale}
          slideIndex={slideIndex}
          dispatch={dispatch}
          otherElements={othersFor(singleSelectedEl.id)}
        />
      )}

      {/* Multi-selection handles (combined bbox + Group button) */}
      {multiSelectedEls.length >= 2 && (
        <MultiSelectHandles
          elements={multiSelectedEls}
          scale={scale}
          slideIndex={slideIndex}
          dispatch={dispatch}
        />
      )}

      {/* Lasso rectangle while dragging on empty canvas */}
      {lassoRect && (
        <div
          style={{
            position: "absolute",
            left: lassoRect.left,
            top: lassoRect.top,
            width: lassoRect.width,
            height: lassoRect.height,
            border: "1px dashed #6366f1",
            background: "rgba(99, 102, 241, 0.08)",
            pointerEvents: "none",
          }}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
