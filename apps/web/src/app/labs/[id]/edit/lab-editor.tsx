"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { createBlankSlide, parseLabContent } from "@omnilab/lab-content";
import type { LabContent, Slide } from "@omnilab/lab-content";
import { saveLabContent } from "../../actions";
import { LabEditorActions } from "./lab-editor-actions";
import { SlideFilmstrip } from "./slide-filmstrip";
import { EditorCanvas } from "./editor-canvas";

// ============================================================================
// State & reducer
// ============================================================================

export type EditorAction =
  | { type: "ADD_SLIDE"; afterIndex: number }
  | { type: "DELETE_SLIDE"; index: number }
  | { type: "DUPLICATE_SLIDE"; index: number }
  | { type: "REORDER_SLIDES"; fromIndex: number; toIndex: number }
  | { type: "SELECT_SLIDE"; index: number }
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
  isDirty: boolean;
}

function cloneSlides(slides: Slide[]): Slide[] {
  return JSON.parse(JSON.stringify(slides)) as Slide[];
}

function cloneSlide(slide: Slide): Slide {
  const clone = JSON.parse(JSON.stringify(slide)) as Slide;
  // Give the duplicate a fresh id so it's independent
  clone.id = crypto.randomUUID();
  clone.elements = clone.elements.map((el) => ({
    ...el,
    id: crypto.randomUUID(),
  }));
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
      return {
        history: pushHistory(history, next),
        selectedIndex: action.afterIndex + 1,
        isDirty: true,
      };
    }

    case "DELETE_SLIDE": {
      if (slides.length <= 1) return state;
      const next = slides.filter((_, i) => i !== action.index);
      const newSelected = clamp(
        action.index === slides.length - 1 ? action.index - 1 : action.index,
        0,
        next.length - 1
      );
      return {
        history: pushHistory(history, next),
        selectedIndex: newSelected,
        isDirty: true,
      };
    }

    case "DUPLICATE_SLIDE": {
      const dupe = cloneSlide(slides[action.index]!);
      const next = [...slides];
      next.splice(action.index + 1, 0, dupe);
      return {
        history: pushHistory(history, next),
        selectedIndex: action.index + 1,
        isDirty: true,
      };
    }

    case "REORDER_SLIDES": {
      const next = cloneSlides(slides);
      const [moved] = next.splice(action.fromIndex, 1);
      if (!moved) return state;
      next.splice(action.toIndex, 0, moved);
      const newSelected =
        selectedIndex === action.fromIndex
          ? action.toIndex
          : selectedIndex;
      return {
        history: pushHistory(history, next),
        selectedIndex: newSelected,
        isDirty: true,
      };
    }

    case "SELECT_SLIDE":
      return { ...state, selectedIndex: action.index };

    case "UNDO": {
      if (history.past.length === 0) return state;
      const previous = history.past[history.past.length - 1]!;
      return {
        history: {
          past: history.past.slice(0, -1),
          present: previous,
          future: [history.present, ...history.future],
        },
        selectedIndex: clamp(selectedIndex, 0, previous.length - 1),
        isDirty: true,
      };
    }

    case "REDO": {
      if (history.future.length === 0) return state;
      const next = history.future[0]!;
      return {
        history: {
          past: [...history.past, history.present],
          present: next,
          future: history.future.slice(1),
        },
        selectedIndex: clamp(selectedIndex, 0, next.length - 1),
        isDirty: true,
      };
    }

    case "MARK_SAVED":
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

function initState(content: LabContent): EditorState {
  return {
    history: { past: [], present: content.slides, future: [] },
    selectedIndex: 0,
    isDirty: false,
  };
}

// ============================================================================
// Component
// ============================================================================

interface LabEditorProps {
  labId: string;
  initialTitle: string;
  initialContent: unknown; // raw Prisma Json
}

export function LabEditor({
  labId,
  initialTitle,
  initialContent,
}: LabEditorProps) {
  const content = parseLabContent(initialContent);
  const [state, dispatch] = useReducer(editorReducer, content, initState);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slidesRef = useRef(state.history.present);
  slidesRef.current = state.history.present;
  const selectedIndexRef = useRef(state.selectedIndex);
  selectedIndexRef.current = state.selectedIndex;

  // ── Save helpers ──────────────────────────────────────────────────────────

  const doSave = useCallback(async () => {
    const payload: LabContent = {
      contentVersion: 1,
      slides: slidesRef.current,
    };
    await saveLabContent(labId, payload);
    dispatch({ type: "MARK_SAVED" });
  }, [labId]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void doSave(), 2000);
  }, [doSave]);

  // Autosave on content changes
  useEffect(() => {
    if (state.isDirty) scheduleSave();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.history.present, state.isDirty]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          dispatch({ type: "UNDO" });
        } else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
          e.preventDefault();
          dispatch({ type: "REDO" });
        } else if (e.key === "s") {
          e.preventDefault();
          void doSave();
        }
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !isTyping
      ) {
        dispatch({ type: "DELETE_SLIDE", index: selectedIndexRef.current });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doSave]);

  // ── Render ────────────────────────────────────────────────────────────────

  const slides = state.history.present;
  const currentSlide = slides[state.selectedIndex] ?? slides[0]!;

  return (
    <main className="flex h-screen flex-col bg-gray-50 overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 border-b border-gray-200 bg-white">
        <LabEditorActions
          labId={labId}
          initialTitle={initialTitle}
          isDirty={state.isDirty}
          onSave={() => void doSave()}
        />
      </div>

      {/* Editor body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left filmstrip */}
        <SlideFilmstrip
          slides={slides}
          selectedIndex={state.selectedIndex}
          dispatch={dispatch}
        />

        {/* Canvas area */}
        <div className="flex flex-1 items-center justify-center overflow-hidden bg-gray-100 p-6">
          <div className="w-full max-w-5xl shadow-xl">
            <EditorCanvas slide={currentSlide} />
          </div>
        </div>

        {/* Right panel — placeholder for M2.2+ */}
        <aside className="w-60 shrink-0 border-l border-gray-200 bg-white" />
      </div>
    </main>
  );
}
