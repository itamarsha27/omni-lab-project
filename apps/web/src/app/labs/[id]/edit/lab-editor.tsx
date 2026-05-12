"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  createBlankSlide,
  createTextElement,
  createEquationElement,
  createQuizElement,
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
  | { type: "ADD_ELEMENT"; slideIndex: number; element: SlideElement }
  | { type: "UPDATE_ELEMENT"; slideIndex: number; element: SlideElement }
  | { type: "MOVE_ELEMENT_LIVE"; slideIndex: number; element: SlideElement }
  | { type: "DELETE_ELEMENT"; slideIndex: number; elementId: string }
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
  selectedElementId: string | null;
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
      return { history: pushHistory(history, next), selectedIndex: action.afterIndex + 1, selectedElementId: null, isDirty: true };
    }
    case "DELETE_SLIDE": {
      if (slides.length <= 1) return state;
      const next = slides.filter((_, i) => i !== action.index);
      const newSelected = clamp(action.index === slides.length - 1 ? action.index - 1 : action.index, 0, next.length - 1);
      return { history: pushHistory(history, next), selectedIndex: newSelected, selectedElementId: null, isDirty: true };
    }
    case "DUPLICATE_SLIDE": {
      const dupe = cloneSlide(slides[action.index]!);
      const next = [...slides];
      next.splice(action.index + 1, 0, dupe);
      return { history: pushHistory(history, next), selectedIndex: action.index + 1, selectedElementId: null, isDirty: true };
    }
    case "REORDER_SLIDES": {
      const next = cloneSlides(slides);
      const [moved] = next.splice(action.fromIndex, 1);
      if (!moved) return state;
      next.splice(action.toIndex, 0, moved);
      const newSelected = selectedIndex === action.fromIndex ? action.toIndex : selectedIndex;
      return { history: pushHistory(history, next), selectedIndex: newSelected, selectedElementId: null, isDirty: true };
    }
    case "SELECT_SLIDE":
      return { ...state, selectedIndex: action.index, selectedElementId: null };
    case "SELECT_ELEMENT":
      return { ...state, selectedElementId: action.id };
    case "ADD_ELEMENT": {
      const next = cloneSlides(slides);
      const slide = next[action.slideIndex];
      if (!slide) return state;
      slide.elements = [...slide.elements, action.element];
      return { history: pushHistory(history, next), selectedIndex, selectedElementId: action.element.id, isDirty: true };
    }
    case "UPDATE_ELEMENT": {
      const next = cloneSlides(slides);
      const slide = next[action.slideIndex];
      if (!slide) return state;
      slide.elements = slide.elements.map((el) => el.id === action.element.id ? action.element : el);
      return { history: pushHistory(history, next), selectedIndex, selectedElementId: state.selectedElementId, isDirty: true };
    }
    case "MOVE_ELEMENT_LIVE": {
      const next = cloneSlides(slides);
      const slide = next[action.slideIndex];
      if (!slide) return state;
      slide.elements = slide.elements.map((el) => el.id === action.element.id ? action.element : el);
      return { ...state, history: { ...history, present: next }, isDirty: true };
    }
    case "DELETE_ELEMENT": {
      const next = cloneSlides(slides);
      const slide = next[action.slideIndex];
      if (!slide) return state;
      slide.elements = slide.elements.filter((el) => el.id !== action.elementId);
      return { history: pushHistory(history, next), selectedIndex, selectedElementId: null, isDirty: true };
    }
    case "BRING_TO_FRONT": {
      const next = cloneSlides(slides);
      const slide = next[action.slideIndex];
      if (!slide) return state;
      const maxZ = Math.max(0, ...slide.elements.map((el) => el.zIndex));
      slide.elements = slide.elements.map((el) => el.id === action.elementId ? { ...el, zIndex: maxZ + 1 } : el);
      return { history: pushHistory(history, next), selectedIndex, selectedElementId: state.selectedElementId, isDirty: true };
    }
    case "SEND_TO_BACK": {
      const next = cloneSlides(slides);
      const slide = next[action.slideIndex];
      if (!slide) return state;
      const minZ = Math.min(0, ...slide.elements.map((el) => el.zIndex));
      slide.elements = slide.elements.map((el) => el.id === action.elementId ? { ...el, zIndex: minZ - 1 } : el);
      return { history: pushHistory(history, next), selectedIndex, selectedElementId: state.selectedElementId, isDirty: true };
    }
    case "SNAPSHOT": {
      const past = [...history.past, history.present].slice(-MAX_HISTORY);
      return { ...state, history: { past, present: history.present, future: [] } };
    }
    case "UNDO": {
      if (history.past.length === 0) return state;
      const previous = history.past[history.past.length - 1]!;
      return { history: { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] }, selectedIndex: clamp(selectedIndex, 0, previous.length - 1), selectedElementId: null, isDirty: true };
    }
    case "REDO": {
      if (history.future.length === 0) return state;
      const next = history.future[0]!;
      return { history: { past: [...history.past, history.present], present: next, future: history.future.slice(1) }, selectedIndex: clamp(selectedIndex, 0, next.length - 1), selectedElementId: null, isDirty: true };
    }
    case "MARK_SAVED":
      return { ...state, isDirty: false };
    default:
      return state;
  }
}

function initState(content: LabContent): EditorState {
  return { history: { past: [], present: content.slides, future: [] }, selectedIndex: 0, selectedElementId: null, isDirty: false };
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
  if (type === "text") return createTextElement;
  if (type === "equation") return createEquationElement;
  return createQuizElement;
}

function paletteGhostLabel(type: PaletteType): string {
  if (type === "text") return "T  Text";
  if (type === "equation") return "∑  Equation";
  return "?  Quiz";
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
  const selectedElementIdRef = useRef(state.selectedElementId);
  selectedElementIdRef.current = state.selectedElementId;

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
      } else if (e.key === "Escape") {
        dispatch({ type: "SELECT_ELEMENT", id: null });
      } else if ((e.key === "Delete" || e.key === "Backspace") && !isTyping) {
        const elId = selectedElementIdRef.current;
        if (elId) {
          dispatch({ type: "DELETE_ELEMENT", slideIndex: selectedIndexRef.current, elementId: elId });
        }
        // Slide deletion via Delete key removed — slides are deleted via filmstrip right-click menu only.
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
  const selectedEl =
    currentSlide.elements.find((el) => el.id === state.selectedElementId) ?? null;
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
              selectedElementId={state.selectedElementId}
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
