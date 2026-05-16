"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  createBlankSlide,
  createTextElement,
  createEquationElement,
  createImageElement,
  createVideoElement,
  createQuizElement,
  createDrawingElement,
  createShapeElement,
  createArrowElement,
  createGroupFromElements,
  ungroupElement,
  parseLabContent,
  CANVAS_WIDTH,
} from "@omnilab/lab-content";
import type { LabContent, Slide, SlideElement } from "@omnilab/lab-content";
import { saveLabContent } from "../../actions";
import { LabEditorActions } from "./lab-editor-actions";
import { SlideFilmstrip } from "./slide-filmstrip";
import { EditorCanvas } from "./editor-canvas";
import { ElementToolbar, type PaletteType } from "./elements/element-toolbar";
import { QuizSidebar } from "./elements/quiz-sidebar";
import { ImageSidebar } from "./elements/image-sidebar";
import { VideoSidebar } from "./elements/video-sidebar";
import { DrawingSidebar } from "./elements/drawing-sidebar";
import { ShapeSidebar } from "./elements/shape-sidebar";

// ============================================================================
// State & reducer
// ============================================================================

export type EditorAction =
  | { type: "ADD_SLIDE"; afterIndex: number }
  | { type: "DELETE_SLIDE"; index: number }
  | { type: "DUPLICATE_SLIDE"; index: number }
  | { type: "REORDER_SLIDES"; fromIndex: number; toIndex: number }
  | { type: "SELECT_SLIDE"; index: number }
  | { type: "SELECT_ELEMENT"; id: string | null }
  | { type: "TOGGLE_ELEMENT_SELECTION"; id: string }
  | { type: "SELECT_ELEMENTS"; ids: string[] }
  | { type: "ADD_ELEMENT"; slideIndex: number; element: SlideElement }
  | { type: "UPDATE_ELEMENT"; slideIndex: number; element: SlideElement }
  | { type: "MOVE_ELEMENT_LIVE"; slideIndex: number; element: SlideElement }
  | { type: "MOVE_ELEMENTS_LIVE"; slideIndex: number; updates: Array<{ id: string; x: number; y: number }> }
  | { type: "DELETE_ELEMENT"; slideIndex: number; elementId: string }
  | { type: "DELETE_ELEMENTS"; slideIndex: number; elementIds: string[] }
  | { type: "GROUP_SELECTED"; slideIndex: number }
  | { type: "UNGROUP_ELEMENT"; slideIndex: number; elementId: string }
  | { type: "BRING_TO_FRONT"; slideIndex: number; elementId: string }
  | { type: "SEND_TO_BACK"; slideIndex: number; elementId: string }
  | { type: "SNAPSHOT" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "MARK_SAVED" };

const MAX_HISTORY = 20;

interface HistoryState {
  past: Slide[][];
  present: Slide[];
  future: Slide[][];
}

interface EditorState {
  history: HistoryState;
  selectedIndex: number;
  /** Selection is an array — single-select is just length 1. Empty = nothing
   *  selected. Multi-select (length 2+) drives the multi-bbox + Group button
   *  UI; single-select drives the existing per-element handles + sidebar. */
  selectedElementIds: string[];
  isDirty: boolean;
}

function cloneSlides(slides: Slide[]): Slide[] {
  return JSON.parse(JSON.stringify(slides)) as Slide[];
}

function cloneSlide(slide: Slide): Slide {
  const clone = JSON.parse(JSON.stringify(slide)) as Slide;
  clone.id = crypto.randomUUID();
  clone.elements = clone.elements.map((el) => ({ ...el, id: crypto.randomUUID() }));
  return clone;
}

function pushHistory(history: HistoryState, next: Slide[]): HistoryState {
  const past = [...history.past, history.present].slice(-MAX_HISTORY);
  return { past, present: next, future: [] };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const { history, selectedIndex } = state;
  const slides = history.present;

  switch (action.type) {
    case "ADD_SLIDE": {
      const newSlide = createBlankSlide();
      const next = [...slides];
      next.splice(action.afterIndex + 1, 0, newSlide);
      return { history: pushHistory(history, next), selectedIndex: action.afterIndex + 1, selectedElementIds: [], isDirty: true };
    }
    case "DELETE_SLIDE": {
      if (slides.length <= 1) return state;
      const next = slides.filter((_, i) => i !== action.index);
      const newSelected = clamp(action.index === slides.length - 1 ? action.index - 1 : action.index, 0, next.length - 1);
      return { history: pushHistory(history, next), selectedIndex: newSelected, selectedElementIds: [], isDirty: true };
    }
    case "DUPLICATE_SLIDE": {
      const dupe = cloneSlide(slides[action.index]!);
      const next = [...slides];
      next.splice(action.index + 1, 0, dupe);
      return { history: pushHistory(history, next), selectedIndex: action.index + 1, selectedElementIds: [], isDirty: true };
    }
    case "REORDER_SLIDES": {
      const next = cloneSlides(slides);
      const [moved] = next.splice(action.fromIndex, 1);
      if (!moved) return state;
      next.splice(action.toIndex, 0, moved);
      const newSelected = selectedIndex === action.fromIndex ? action.toIndex : selectedIndex;
      return { history: pushHistory(history, next), selectedIndex: newSelected, selectedElementIds: [], isDirty: true };
    }
    case "SELECT_SLIDE":
      return { ...state, selectedIndex: action.index, selectedElementIds: [] };
    case "SELECT_ELEMENT":
      return { ...state, selectedElementIds: action.id === null ? [] : [action.id] };
    case "TOGGLE_ELEMENT_SELECTION": {
      // Ctrl/Cmd-click: flip the element's presence in the selection set.
      const ids = state.selectedElementIds.includes(action.id)
        ? state.selectedElementIds.filter((id) => id !== action.id)
        : [...state.selectedElementIds, action.id];
      return { ...state, selectedElementIds: ids };
    }
    case "SELECT_ELEMENTS":
      return { ...state, selectedElementIds: action.ids };
    case "ADD_ELEMENT": {
      const next = cloneSlides(slides);
      const slide = next[action.slideIndex];
      if (!slide) return state;
      slide.elements = [...slide.elements, action.element];
      return { history: pushHistory(history, next), selectedIndex, selectedElementIds: [action.element.id], isDirty: true };
    }
    case "UPDATE_ELEMENT": {
      const next = cloneSlides(slides);
      const slide = next[action.slideIndex];
      if (!slide) return state;
      slide.elements = slide.elements.map((el) => el.id === action.element.id ? action.element : el);
      return { history: pushHistory(history, next), selectedIndex, selectedElementIds: state.selectedElementIds, isDirty: true };
    }
    case "MOVE_ELEMENT_LIVE": {
      const next = cloneSlides(slides);
      const slide = next[action.slideIndex];
      if (!slide) return state;
      slide.elements = slide.elements.map((el) => el.id === action.element.id ? action.element : el);
      return { ...state, history: { ...history, present: next }, isDirty: true };
    }
    case "MOVE_ELEMENTS_LIVE": {
      // Multi-drag — move several elements in one tick. Caller passes the
      // *target* positions (not deltas) so each element's start position is
      // captured once in the caller's closure and isn't read back from
      // mutating state mid-drag.
      const next = cloneSlides(slides);
      const slide = next[action.slideIndex];
      if (!slide) return state;
      const updates = new Map(action.updates.map((u) => [u.id, u]));
      slide.elements = slide.elements.map((el) => {
        const u = updates.get(el.id);
        return u ? { ...el, x: u.x, y: u.y } : el;
      });
      return { ...state, history: { ...history, present: next }, isDirty: true };
    }
    case "DELETE_ELEMENT": {
      const next = cloneSlides(slides);
      const slide = next[action.slideIndex];
      if (!slide) return state;
      slide.elements = slide.elements.filter((el) => el.id !== action.elementId);
      return { history: pushHistory(history, next), selectedIndex, selectedElementIds: state.selectedElementIds.filter((id) => id !== action.elementId), isDirty: true };
    }
    case "DELETE_ELEMENTS": {
      const next = cloneSlides(slides);
      const slide = next[action.slideIndex];
      if (!slide) return state;
      const toDelete = new Set(action.elementIds);
      slide.elements = slide.elements.filter((el) => !toDelete.has(el.id));
      return { history: pushHistory(history, next), selectedIndex, selectedElementIds: state.selectedElementIds.filter((id) => !toDelete.has(id)), isDirty: true };
    }
    case "GROUP_SELECTED": {
      // Collapse all currently-selected top-level elements into one GroupElement.
      // No-op if <2 elements selected (a group of one is meaningless).
      if (state.selectedElementIds.length < 2) return state;
      const next = cloneSlides(slides);
      const slide = next[action.slideIndex];
      if (!slide) return state;
      const selected = new Set(state.selectedElementIds);
      const toGroup = slide.elements.filter((el) => selected.has(el.id));
      if (toGroup.length < 2) return state;
      // Defense-in-depth: only shape elements (which includes arrows — they're
      // shapes with an arrow-like `shape` kind) can be grouped in v1. The UI
      // disables the Group button when the selection contains anything else,
      // but reject here too in case the action fires via keyboard.
      if (toGroup.some((el) => el.type !== "shape")) return state;
      const remaining = slide.elements.filter((el) => !selected.has(el.id));
      const group = createGroupFromElements(toGroup);
      slide.elements = [...remaining, group];
      return { history: pushHistory(history, next), selectedIndex, selectedElementIds: [group.id], isDirty: true };
    }
    case "UNGROUP_ELEMENT": {
      const next = cloneSlides(slides);
      const slide = next[action.slideIndex];
      if (!slide) return state;
      const target = slide.elements.find((el) => el.id === action.elementId);
      if (!target || target.type !== "group") return state;
      const expanded = ungroupElement(target);
      slide.elements = slide.elements.flatMap((el) =>
        el.id === action.elementId ? expanded : [el],
      );
      return { history: pushHistory(history, next), selectedIndex, selectedElementIds: expanded.map((e) => e.id), isDirty: true };
    }
    case "BRING_TO_FRONT": {
      const next = cloneSlides(slides);
      const slide = next[action.slideIndex];
      if (!slide) return state;
      const maxZ = Math.max(0, ...slide.elements.map((el) => el.zIndex));
      slide.elements = slide.elements.map((el) => el.id === action.elementId ? { ...el, zIndex: maxZ + 1 } : el);
      return { history: pushHistory(history, next), selectedIndex, selectedElementIds: state.selectedElementIds, isDirty: true };
    }
    case "SEND_TO_BACK": {
      const next = cloneSlides(slides);
      const slide = next[action.slideIndex];
      if (!slide) return state;
      const minZ = Math.min(0, ...slide.elements.map((el) => el.zIndex));
      slide.elements = slide.elements.map((el) => el.id === action.elementId ? { ...el, zIndex: minZ - 1 } : el);
      return { history: pushHistory(history, next), selectedIndex, selectedElementIds: state.selectedElementIds, isDirty: true };
    }
    case "SNAPSHOT": {
      const past = [...history.past, history.present].slice(-MAX_HISTORY);
      return { ...state, history: { past, present: history.present, future: [] } };
    }
    case "UNDO": {
      if (history.past.length === 0) return state;
      const previous = history.past[history.past.length - 1]!;
      return { history: { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] }, selectedIndex: clamp(selectedIndex, 0, previous.length - 1), selectedElementIds: [], isDirty: true };
    }
    case "REDO": {
      if (history.future.length === 0) return state;
      const next = history.future[0]!;
      return { history: { past: [...history.past, history.present], present: next, future: history.future.slice(1) }, selectedIndex: clamp(selectedIndex, 0, next.length - 1), selectedElementIds: [], isDirty: true };
    }
    case "MARK_SAVED":
      return { ...state, isDirty: false };
    default:
      return state;
  }
}

function initState(content: LabContent): EditorState {
  return { history: { past: [], present: content.slides, future: [] }, selectedIndex: 0, selectedElementIds: [], isDirty: false };
}

// ============================================================================
// Component
// ============================================================================

interface LabEditorProps {
  labId: string;
  initialTitle: string;
  initialContent: unknown;
}

interface PaletteDrag {
  type: PaletteType;
  mouseX: number;
  mouseY: number;
  overCanvas: boolean;
}

function paletteFactory(type: PaletteType) {
  switch (type) {
    case "text":
      return createTextElement;
    case "equation":
      return createEquationElement;
    case "image":
      return createImageElement;
    case "video":
      return createVideoElement;
    case "quiz":
      return createQuizElement;
    case "drawing":
      return createDrawingElement;
    case "shape":
      return createShapeElement;
    case "arrow":
      return createArrowElement;
  }
}

function paletteGhostLabel(type: PaletteType): string {
  switch (type) {
    case "text":
      return "T  Text";
    case "equation":
      return "∑  Equation";
    case "image":
      return "🖼  Image";
    case "video":
      return "▶  Video";
    case "quiz":
      return "?  Quiz";
    case "drawing":
      return "✎  Drawing";
    case "shape":
      return "▭  Shape";
    case "arrow":
      return "→  Arrow";
  }
}

export function LabEditor({ labId, initialTitle, initialContent }: LabEditorProps) {
  const content = parseLabContent(initialContent);
  const [state, dispatch] = useReducer(editorReducer, content, initState);
  const [paletteDrag, setPaletteDrag] = useState<PaletteDrag | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slidesRef = useRef(state.history.present);
  slidesRef.current = state.history.present;
  const selectedIndexRef = useRef(state.selectedIndex);
  selectedIndexRef.current = state.selectedIndex;
  const selectedElementIdsRef = useRef(state.selectedElementIds);
  selectedElementIdsRef.current = state.selectedElementIds;

  const doSave = useCallback(async () => {
    const payload: LabContent = { contentVersion: 1, slides: slidesRef.current };
    try {
      await saveLabContent(labId, payload);
      dispatch({ type: "MARK_SAVED" });
    } catch (err) {
      // Surface server-side validation errors (e.g. max-one-quiz-per-slide) so
      // the teacher knows their lab didn't save. Unsaved dot stays on as well.
      const msg = err instanceof Error ? err.message : "Failed to save lab.";
      console.error("[lab-editor] save failed:", err);
      alert(msg);
    }
  }, [labId]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void doSave(), 2000);
  }, [doSave]);

  useEffect(() => {
    if (state.isDirty) scheduleSave();
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.history.present, state.isDirty]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable || target.tagName === "MATH-FIELD";

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) { e.preventDefault(); dispatch({ type: "UNDO" }); }
        else if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); dispatch({ type: "REDO" }); }
        else if (e.key === "s") { e.preventDefault(); void doSave(); }
        else if (e.key === "g" && !e.shiftKey && !isTyping) {
          // Ctrl/Cmd+G — group the current selection (when 2+ selected).
          e.preventDefault();
          if (selectedElementIdsRef.current.length >= 2) {
            dispatch({ type: "GROUP_SELECTED", slideIndex: selectedIndexRef.current });
          }
        } else if (e.key === "g" && e.shiftKey && !isTyping) {
          // Ctrl/Cmd+Shift+G — ungroup if the single selection is a group.
          e.preventDefault();
          const ids = selectedElementIdsRef.current;
          if (ids.length === 1) {
            dispatch({ type: "UNGROUP_ELEMENT", slideIndex: selectedIndexRef.current, elementId: ids[0]! });
          }
        }
      } else if (e.key === "Escape") {
        dispatch({ type: "SELECT_ELEMENT", id: null });
      } else if ((e.key === "Delete" || e.key === "Backspace") && !isTyping) {
        const ids = selectedElementIdsRef.current;
        if (ids.length > 0) {
          dispatch({ type: "DELETE_ELEMENTS", slideIndex: selectedIndexRef.current, elementIds: ids });
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doSave]);

  // ── Drag-from-toolbar to canvas ───────────────────────────────────────────
  // Mousedown on T/∑/? → ghost follows cursor → mouseup on canvas creates element.
  const startPaletteDrag = useCallback(
    (type: PaletteType, e: React.MouseEvent) => {
      e.preventDefault();
      const initial: PaletteDrag = {
        type,
        mouseX: e.clientX,
        mouseY: e.clientY,
        overCanvas: false,
      };
      setPaletteDrag(initial);

      function isOverCanvas(x: number, y: number): boolean {
        const c = canvasRef.current;
        if (!c) return false;
        const r = c.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      }

      function onMove(ev: MouseEvent) {
        setPaletteDrag({
          type,
          mouseX: ev.clientX,
          mouseY: ev.clientY,
          overCanvas: isOverCanvas(ev.clientX, ev.clientY),
        });
      }

      function onUp(ev: MouseEvent) {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        setPaletteDrag(null);

        const c = canvasRef.current;
        if (!c) return;
        const r = c.getBoundingClientRect();
        if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) {
          return; // dropped outside canvas — cancel
        }
        // Max-one-quiz-per-slide defense-in-depth: even if the toolbar button
        // wasn't disabled, refuse the drop if the slide already has a quiz.
        if (type === "quiz") {
          const slide = slidesRef.current[selectedIndexRef.current];
          if (slide && slide.elements.some((el) => el.type === "quiz")) return;
        }
        const scale = r.width / CANVAS_WIDTH;
        const cx = (ev.clientX - r.left) / scale;
        const cy = (ev.clientY - r.top) / scale;
        const factory = paletteFactory(type);
        // Center the new element on the drop point
        const def = factory();
        const el = factory({
          x: cx - def.width / 2,
          y: cy - def.height / 2,
        });
        dispatch({ type: "ADD_ELEMENT", slideIndex: selectedIndexRef.current, element: el });
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    []
  );

  const slides = state.history.present;
  const currentSlide = slides[state.selectedIndex] ?? slides[0]!;
  // Sidebar only opens for a single-element selection — multi-select shows
  // a Group button instead, and a group selection has its own minimal UI.
  const selectedEl =
    state.selectedElementIds.length === 1
      ? currentSlide.elements.find((el) => el.id === state.selectedElementIds[0]) ?? null
      : null;
  const slideHasQuiz = currentSlide.elements.some((el) => el.type === "quiz");

  return (
    <main className="flex h-screen flex-col bg-[#e8e8e8] overflow-hidden">
      <div className="shrink-0 border-b border-gray-200 bg-white">
        <LabEditorActions
          labId={labId}
          initialTitle={initialTitle}
          isDirty={state.isDirty}
          onSave={() => void doSave()}
          toolbarSlot={
            <ElementToolbar
              onStartDrag={startPaletteDrag}
              activeType={paletteDrag?.type ?? null}
              quizDisabled={slideHasQuiz}
            />
          }
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <SlideFilmstrip slides={slides} selectedIndex={state.selectedIndex} dispatch={dispatch} />

        {/* Clicking the gray padding around the canvas (or the right aside)
            deselects whatever element is currently selected. The
            `e.target === e.currentTarget` guard limits the handler to direct
            clicks on the wrapper itself — clicks bubbling up from the canvas
            are ignored so canvas-internal click logic keeps working. */}
        <div
          className="flex flex-1 items-center justify-center overflow-hidden bg-[#e8e8e8] p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              dispatch({ type: "SELECT_ELEMENT", id: null });
            }
          }}
        >
          <div className="w-full max-w-5xl shadow-xl">
            <EditorCanvas
              slide={currentSlide}
              slideIndex={state.selectedIndex}
              selectedElementIds={state.selectedElementIds}
              dispatch={dispatch}
              containerRef={canvasRef}
              isDropTarget={paletteDrag?.overCanvas ?? false}
            />
          </div>
        </div>

        <aside
          className="w-72 shrink-0 border-l border-gray-200 bg-white"
          onMouseDown={(e) => {
            // Mirror the canvas-padding wrapper: clicks on the empty aside
            // body deselect; clicks inside an interactive child bubble up
            // unaffected because of the e.target === e.currentTarget guard.
            if (e.target === e.currentTarget) {
              dispatch({ type: "SELECT_ELEMENT", id: null });
            }
          }}
        >
          {selectedEl?.type === "quiz" && (
            <QuizSidebar
              element={selectedEl}
              slideIndex={state.selectedIndex}
              dispatch={dispatch}
            />
          )}
          {selectedEl?.type === "image" && (
            <ImageSidebar
              element={selectedEl}
              slideIndex={state.selectedIndex}
              dispatch={dispatch}
            />
          )}
          {selectedEl?.type === "video" && (
            <VideoSidebar
              element={selectedEl}
              slideIndex={state.selectedIndex}
              dispatch={dispatch}
            />
          )}
          {selectedEl?.type === "drawing" && (
            <DrawingSidebar
              element={selectedEl}
              slideIndex={state.selectedIndex}
              dispatch={dispatch}
            />
          )}
          {selectedEl?.type === "shape" && (
            <ShapeSidebar
              element={selectedEl}
              slideIndex={state.selectedIndex}
              dispatch={dispatch}
            />
          )}
        </aside>
      </div>

      {/* Ghost cursor while dragging from toolbar */}
      {paletteDrag &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: paletteDrag.mouseX + 14,
              top: paletteDrag.mouseY + 14,
              pointerEvents: "none",
              zIndex: 99999,
              padding: "4px 10px",
              background: paletteDrag.overCanvas ? "#6366f1" : "#9ca3af",
              color: "white",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              userSelect: "none",
            }}
          >
            {paletteGhostLabel(paletteDrag.type)}
            {!paletteDrag.overCanvas && <span style={{ opacity: 0.7, marginLeft: 6 }}>· drag onto slide</span>}
          </div>,
          document.body
        )}
    </main>
  );
}
