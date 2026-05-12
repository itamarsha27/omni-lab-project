"use client";

import type {
  QuizElement as QuizElementType,
  QuizQuestion,
  MultipleChoiceSingleQuestion,
  MultipleChoiceMultiQuestion,
  ShortTextQuestion,
  NumericQuestion,
  TrueFalseQuestion,
} from "@omnilab/lab-content";
import { createQuizQuestion } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";

interface Props {
  element: QuizElementType;
  slideIndex: number;
  dispatch: React.Dispatch<EditorAction>;
}

const KIND_LABELS: Record<QuizQuestion["kind"], string> = {
  "mc-single": "Multiple choice (single)",
  "mc-multi": "Multiple choice (multi)",
  "short-text": "Short text",
  numeric: "Numeric",
  "true-false": "True / False",
};

export function QuizSidebar({ element, slideIndex, dispatch }: Props) {
  // Shared shared-base fields (prompt / points / timeDecay / explanation) live
  // on every kind; kind-specific fields swap out when the kind changes.
  const { question } = element;

  function updateQuestion(next: QuizQuestion) {
    dispatch({
      type: "UPDATE_ELEMENT",
      slideIndex,
      element: { ...element, question: next },
    });
  }

  function changeKind(nextKind: QuizQuestion["kind"]) {
    if (nextKind === question.kind) return;
    const fresh = createQuizQuestion(nextKind);
    // Preserve the cross-kind base fields so the teacher doesn't lose their
    // prompt / points / explanation when experimenting with kinds.
    const next: QuizQuestion = {
      ...fresh,
      id: question.id,
      prompt: question.prompt,
      points: question.points,
      timeDecay: question.timeDecay,
      explanation: question.explanation,
    };
    updateQuestion(next);
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 text-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Quiz block
      </h2>

      <SidebarField label="Question type">
        <select
          value={question.kind}
          onChange={(e) => changeKind(e.target.value as QuizQuestion["kind"])}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        >
          {(Object.keys(KIND_LABELS) as QuizQuestion["kind"][]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </SidebarField>

      <SidebarField label="Prompt">
        <textarea
          value={question.prompt}
          onChange={(e) => updateQuestion({ ...question, prompt: e.target.value })}
          rows={3}
          placeholder="What's the question?"
          className="w-full resize-y rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </SidebarField>

      <KindEditor question={question} onChange={updateQuestion} />

      <SidebarField label="Points">
        <input
          type="number"
          min={0}
          value={question.points}
          onChange={(e) =>
            updateQuestion({ ...question, points: Number(e.target.value) || 0 })
          }
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </SidebarField>

      <label className="mb-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={question.timeDecay}
          onChange={(e) =>
            updateQuestion({ ...question, timeDecay: e.target.checked })
          }
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span>Time-decayed scoring</span>
      </label>

      <SidebarField label="Explanation (optional)">
        <textarea
          value={question.explanation ?? ""}
          onChange={(e) =>
            updateQuestion({
              ...question,
              explanation: e.target.value || undefined,
            })
          }
          rows={2}
          placeholder="Shown after the question closes"
          className="w-full resize-y rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </SidebarField>
    </div>
  );
}

// ============================================================================
// Per-kind editors
// ============================================================================

function KindEditor({
  question,
  onChange,
}: {
  question: QuizQuestion;
  onChange: (next: QuizQuestion) => void;
}) {
  switch (question.kind) {
    case "mc-single":
      return <McSingleEditor question={question} onChange={onChange} />;
    case "mc-multi":
      return <McMultiEditor question={question} onChange={onChange} />;
    case "short-text":
      return <ShortTextEditor question={question} onChange={onChange} />;
    case "numeric":
      return <NumericEditor question={question} onChange={onChange} />;
    case "true-false":
      return <TrueFalseEditor question={question} onChange={onChange} />;
  }
}

function McSingleEditor({
  question,
  onChange,
}: {
  question: MultipleChoiceSingleQuestion;
  onChange: (q: QuizQuestion) => void;
}) {
  function setOption(i: number, value: string) {
    const next = [...question.options];
    next[i] = value;
    onChange({ ...question, options: next });
  }
  function addOption() {
    onChange({ ...question, options: [...question.options, ""] });
  }
  function removeOption(i: number) {
    if (question.options.length <= 2) return;
    const next = question.options.filter((_, j) => j !== i);
    // Re-anchor correctIndex if we removed it or anything before it.
    let correctIndex = question.correctIndex;
    if (correctIndex === i) correctIndex = 0;
    else if (correctIndex > i) correctIndex -= 1;
    onChange({ ...question, options: next, correctIndex });
  }
  return (
    <SidebarField label="Options · pick the correct one">
      <div className="flex flex-col gap-1.5">
        {question.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={question.correctIndex === i}
              onChange={() => onChange({ ...question, correctIndex: i })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
            />
            <input
              type="text"
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <RemoveButton
              onClick={() => removeOption(i)}
              disabled={question.options.length <= 2}
            />
          </div>
        ))}
        <AddRowButton onClick={addOption} label="Add option" />
      </div>
    </SidebarField>
  );
}

function McMultiEditor({
  question,
  onChange,
}: {
  question: MultipleChoiceMultiQuestion;
  onChange: (q: QuizQuestion) => void;
}) {
  function setOption(i: number, value: string) {
    const next = [...question.options];
    next[i] = value;
    onChange({ ...question, options: next });
  }
  function toggleCorrect(i: number) {
    const set = new Set(question.correctIndices);
    if (set.has(i)) set.delete(i);
    else set.add(i);
    onChange({ ...question, correctIndices: [...set].sort((a, b) => a - b) });
  }
  function addOption() {
    onChange({ ...question, options: [...question.options, ""] });
  }
  function removeOption(i: number) {
    if (question.options.length <= 2) return;
    const next = question.options.filter((_, j) => j !== i);
    const correctIndices = question.correctIndices
      .filter((idx) => idx !== i)
      .map((idx) => (idx > i ? idx - 1 : idx));
    onChange({ ...question, options: next, correctIndices });
  }
  return (
    <SidebarField label="Options · check all that are correct">
      <div className="flex flex-col gap-1.5">
        {question.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={question.correctIndices.includes(i)}
              onChange={() => toggleCorrect(i)}
              className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <input
              type="text"
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <RemoveButton
              onClick={() => removeOption(i)}
              disabled={question.options.length <= 2}
            />
          </div>
        ))}
        <AddRowButton onClick={addOption} label="Add option" />
      </div>
    </SidebarField>
  );
}

function ShortTextEditor({
  question,
  onChange,
}: {
  question: ShortTextQuestion;
  onChange: (q: QuizQuestion) => void;
}) {
  function setAnswer(i: number, value: string) {
    const next = [...question.correctAnswers];
    next[i] = value;
    onChange({ ...question, correctAnswers: next });
  }
  function addAnswer() {
    onChange({ ...question, correctAnswers: [...question.correctAnswers, ""] });
  }
  function removeAnswer(i: number) {
    if (question.correctAnswers.length <= 1) return;
    onChange({
      ...question,
      correctAnswers: question.correctAnswers.filter((_, j) => j !== i),
    });
  }
  return (
    <SidebarField label="Accepted answers">
      <div className="flex flex-col gap-1.5">
        {question.correctAnswers.map((ans, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="text"
              value={ans}
              onChange={(e) => setAnswer(i, e.target.value)}
              placeholder={`Answer ${i + 1}`}
              className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <RemoveButton
              onClick={() => removeAnswer(i)}
              disabled={question.correctAnswers.length <= 1}
            />
          </div>
        ))}
        <AddRowButton onClick={addAnswer} label="Add accepted answer" />
        <p className="text-[11px] text-gray-400">
          Any match (case-insensitive) is correct.
        </p>
      </div>
    </SidebarField>
  );
}

function NumericEditor({
  question,
  onChange,
}: {
  question: NumericQuestion;
  onChange: (q: QuizQuestion) => void;
}) {
  return (
    <>
      <SidebarField label="Correct value">
        <input
          type="text"
          value={question.correctValue}
          onChange={(e) => onChange({ ...question, correctValue: e.target.value })}
          placeholder="e.g. 3.14  or  2a  or  g*sin(theta)"
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-gray-400">
          Pure numbers use the tolerance below. Expressions with parameters
          (e.g. <code className="rounded bg-gray-100 px-1">2a</code>) are
          compared symbolically.
        </p>
      </SidebarField>
      <SidebarField label="Tolerance (±)">
        <input
          type="number"
          min={0}
          step="any"
          value={question.tolerance}
          onChange={(e) =>
            onChange({ ...question, tolerance: Number(e.target.value) || 0 })
          }
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </SidebarField>
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={question.checkUnit}
          onChange={(e) => onChange({ ...question, checkUnit: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span>Check unit instead of value</span>
      </label>
      {question.checkUnit && (
        <SidebarField label="Expected unit">
          <input
            type="text"
            value={question.unit ?? ""}
            onChange={(e) =>
              onChange({ ...question, unit: e.target.value || undefined })
            }
            placeholder="e.g. m/s"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </SidebarField>
      )}
    </>
  );
}

function TrueFalseEditor({
  question,
  onChange,
}: {
  question: TrueFalseQuestion;
  onChange: (q: QuizQuestion) => void;
}) {
  return (
    <SidebarField label="Correct answer">
      <div className="flex gap-2">
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange({ ...question, correctAnswer: v })}
            className={`flex-1 rounded border px-3 py-1.5 text-sm font-medium transition-colors ${
              question.correctAnswer === v
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {v ? "True" : "False"}
          </button>
        ))}
      </div>
    </SidebarField>
  );
}

// ============================================================================
// Tiny shared UI atoms
// ============================================================================

function SidebarField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-3 flex flex-col">
      <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-dashed border-gray-300 px-2 py-1 text-xs font-medium text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
    >
      + {label}
    </button>
  );
}

function RemoveButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Remove"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
    >
      ×
    </button>
  );
}
