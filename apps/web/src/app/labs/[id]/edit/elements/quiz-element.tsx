"use client";

import type {
  QuizElement as QuizElementType,
  QuizQuestion,
} from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";
import { useElementDrag } from "./use-element-drag";

interface Props {
  element: QuizElementType;
  isSelected: boolean;
  slideIndex: number;
  scale: number;
  dispatch: React.Dispatch<EditorAction>;
  onContextMenu: (e: React.MouseEvent) => void;
}

// Canvas-px sizes — chosen so the read-only preview reads comfortably on the
// 1920×1080 slide and shrinks legibly in the filmstrip thumbnail.
const PROMPT_FONT_PX = 44;
const OPTION_FONT_PX = 36;
const PLACEHOLDER_COLOR = "#9ca3af";

export function QuizElement({
  element,
  isSelected,
  slideIndex,
  scale,
  dispatch,
  onContextMenu,
}: Props) {
  const startDrag = useElementDrag({ element, scale, slideIndex, dispatch });

  function handleMouseDown(e: React.MouseEvent) {
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
        background: "white",
        border: "2px solid #e5e7eb",
        borderRadius: 12,
        padding: 28,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        overflow: "hidden",
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={onContextMenu}
    >
      <QuizPrompt prompt={element.question.prompt} />
      <QuizBody question={element.question} />
    </div>
  );
}

function QuizPrompt({ prompt }: { prompt: string }) {
  const empty = !prompt.trim();
  return (
    <div
      style={{
        fontSize: PROMPT_FONT_PX,
        fontWeight: 600,
        lineHeight: 1.2,
        color: empty ? PLACEHOLDER_COLOR : "#111827",
      }}
    >
      {empty ? "Question prompt…" : prompt}
    </div>
  );
}

function QuizBody({ question }: { question: QuizQuestion }) {
  switch (question.kind) {
    case "mc-single":
      return (
        <OptionList
          options={question.options}
          marker="radio"
          highlightIndices={[question.correctIndex]}
        />
      );
    case "mc-multi":
      return (
        <OptionList
          options={question.options}
          marker="checkbox"
          highlightIndices={question.correctIndices}
        />
      );
    case "short-text":
      return <FakeInput placeholder="Student types an answer…" />;
    case "numeric": {
      // String()-coerce defensively: pre-M2.3-fix labs saved correctValue as
      // a number (e.g. 0). Crashes-on-render are worse than rendering "0" once
      // and letting the next edit migrate the field shape.
      const value = String(question.correctValue ?? "").trim();
      const placeholder = question.checkUnit
        ? `Expected unit: ${question.unit ?? "—"}`
        : value
          ? `Expected: ${value}${question.tolerance ? ` (±${question.tolerance})` : ""}`
          : "Student types a value or expression…";
      return <FakeInput placeholder={placeholder} align="left" />;
    }
    case "true-false":
      return (
        <div style={{ display: "flex", gap: 24 }}>
          <TFButton
            label="True"
            highlighted={question.correctAnswer === true}
            tone="positive"
          />
          <TFButton
            label="False"
            highlighted={question.correctAnswer === false}
            tone="negative"
          />
        </div>
      );
  }
}

function OptionList({
  options,
  marker,
  highlightIndices,
}: {
  options: string[];
  marker: "radio" | "checkbox";
  highlightIndices: number[];
}) {
  const highlight = new Set(highlightIndices);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {options.map((opt, i) => {
        const isCorrect = highlight.has(i);
        const empty = !opt.trim();
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: OPTION_FONT_PX,
              color: empty ? PLACEHOLDER_COLOR : "#111827",
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: marker === "radio" ? "50%" : 6,
                border: `3px solid ${isCorrect ? "#16a34a" : "#9ca3af"}`,
                background: isCorrect ? "#16a34a" : "transparent",
                flexShrink: 0,
              }}
            />
            <span>{empty ? `Option ${i + 1}` : opt}</span>
          </div>
        );
      })}
    </div>
  );
}

function FakeInput({
  placeholder,
  align = "left",
}: {
  placeholder: string;
  align?: "left" | "center";
}) {
  return (
    <div
      style={{
        fontSize: OPTION_FONT_PX,
        color: PLACEHOLDER_COLOR,
        border: "2px dashed #d1d5db",
        borderRadius: 8,
        padding: "14px 18px",
        textAlign: align,
      }}
    >
      {placeholder}
    </div>
  );
}

function TFButton({
  label,
  highlighted,
  tone,
}: {
  label: string;
  highlighted: boolean;
  tone: "positive" | "negative";
}) {
  // True-is-correct → green; False-is-correct → red. The non-highlighted
  // button always renders neutral grey so the "correct" choice pops visually.
  const borderColor = highlighted
    ? tone === "positive"
      ? "#16a34a"
      : "#dc2626"
    : "#d1d5db";
  const textColor = highlighted
    ? tone === "positive"
      ? "#15803d"
      : "#b91c1c"
    : "#6b7280";
  const background = highlighted
    ? tone === "positive"
      ? "rgba(22,163,74,0.08)"
      : "rgba(220,38,38,0.08)"
    : "white";
  return (
    <div
      style={{
        flex: 1,
        textAlign: "center",
        fontSize: OPTION_FONT_PX,
        fontWeight: 600,
        padding: "18px 0",
        borderRadius: 10,
        border: `3px solid ${borderColor}`,
        color: textColor,
        background,
      }}
    >
      {label}
    </div>
  );
}
