# OmniLab — Weekly Recap 2

---

## Day 1 — 2026-05-12

### Theme of the day
M2.3 — Quiz blocks. Designed and built the full quiz authoring system from scratch: canvas renderer, contextual sidebar properties editor, toolbar drag button, filmstrip placeholder, and the max-one-quiz-per-slide constraint. Also walked through the M3 Kahoot architecture end-to-end to verify no data-model rework will be needed when we get there.

### Pre-build lock-in

Confirmed locked decisions before touching code:
- **Quiz properties are edited in the right-panel sidebar** (Q20b) — no popup. When a quiz element is selected, the `<aside>` becomes the properties editor.
- **Default: 100 pts, time-decay = true** (Q29).
- **Max one quiz per slide** — enforced at save time in `saveLabContent` (server action) + UI gate on the toolbar button.

Reviewed the existing type model in `packages/lab-content/src/types.ts` before starting. `QuizElement` + all question kinds already existed from M2.1; only the factory, renderer, and sidebar were missing.

---

### What we built — M2.3 Quiz blocks

**Factory** (`packages/lab-content/src/index.ts`)
- `createQuizQuestion(kind)`: builds a fresh question shape for any of the 5 question kinds with correct defaults. Shared base fields (`id`, `prompt`, `points: 100`, `timeDecay: true`).
- `createQuizElement()`: `kind: "mc-single"`, two empty options, 1000×500 px canvas footprint, centered on drop point.

**`elements/quiz-element.tsx`** — view-only canvas renderer
- Full drag support via `useElementDrag` (same pattern as text/equation). No double-click-to-edit; the sidebar is the only editing surface.
- Renders a styled card (white bg, rounded border) containing the question prompt + a kind-specific read-only preview:
  - `mc-single`: radio buttons, green highlight on the correct option.
  - `mc-multi`: checkboxes, green highlight on all correct options.
  - `short-text`: dashed fake input (placeholder text).
  - `numeric`: dashed fake input; shows the expected value/expression and tolerance if set, or "Student types a value or expression…" if empty.
  - `true-false`: two full-width buttons — **True is highlighted green when correct; False is highlighted red when correct.** Non-highlighted button stays neutral grey. (See "Product adjustments" below.)
- Prompt renders grey placeholder text when empty.
- No `katex` import — the view-only renderer doesn't need it (no equation-fill kind).

**`elements/quiz-sidebar.tsx`** — contextual properties editor
- Shown in the right `<aside>` whenever `selectedEl?.type === "quiz"`. When nothing / a different element is selected, the aside is empty (Q20b pattern — text/equation sidebar migration is a post-M2.3 follow-up).
- Kind dropdown: switching kinds preserves prompt / points / timeDecay / explanation (the shared base fields).
- Prompt textarea.
- Kind-specific fields:
  - `mc-single` / `mc-multi`: option text inputs + radio / checkbox correct-answer pickers. Add option / remove option buttons (min 2 options enforced).
  - `short-text`: list of accepted answers (case-insensitive match at grade time). Add / remove.
  - `numeric`: text input for `correctValue` (supports plain numbers or symbolic expressions — see below). Tolerance (±) number input. "Check unit instead of value" toggle. Expected unit field appears when toggle is on.
  - `true-false`: True / False toggle buttons.
- Points (number input) + Time-decayed scoring (checkbox).
- Explanation textarea (shown after question closes — Q31). Optional.
- Every field dispatches `UPDATE_ELEMENT` immediately on change — autosave handles persistence.

**`element-toolbar.tsx`** extended
- New `PaletteType = "text" | "equation" | "quiz"` exported type (was a local union, now shared with lab-editor).
- `?` button added next to T / ∑. Accepts a `quizDisabled: boolean` prop — button is greyed out (`cursor: not-allowed`, `text-gray-300`) when the current slide already has a quiz block.

**`lab-editor.tsx`** extended
- `PaletteDrag.type` extended to `PaletteType`. `paletteFactory(type)` helper replaces the inline ternary.
- `paletteGhostLabel(type)` helper for the drag ghost tooltip ("?  Quiz").
- In `onUp` (palette drag drop): added defense-in-depth quiz check — if the slide already has a quiz at drop time, cancel silently even if the toolbar button was somehow not disabled.
- `selectedEl` and `slideHasQuiz` derived in render from `currentSlide.elements`.
- `<aside>` widened from `w-60` to `w-72` (288px) to give the properties form breathing room.
- `<QuizSidebar>` rendered inside the aside when `selectedEl?.type === "quiz"`.
- `doSave` now wrapped in `try/catch` — surfaces `saveLabContent` server errors via `alert()` (primarily for the max-one-quiz violation; the unsaved dot stays on too).

**`editor-canvas.tsx`**: `case "quiz"` added to the `renderElement` switch.

**`slide-thumbnail.tsx`**: `quiz` branch renders a soft-indigo card with a large `?` centered (no attempt to render the question content at thumbnail scale).

**`actions.ts`** (`saveLabContent`)
- Before saving, iterates slides and throws on any slide with > 1 quiz element.

---

### Product adjustments (made during build)

**Equation-fill kind removed**
- Dropped on review: felt redundant given that numeric now absorbs symbolic answers, and adding a KaTeX template editor in the sidebar would have been disproportionate complexity.
- `EquationFillQuestion` removed from `types.ts` and the `QuizQuestion` union.
- The `InlineMathField` component (written then cut) is also gone.
- **Impact on M3 grading**: numeric absorbs all symbolic-answer use cases. Q22 ("one blank per equation") and the "fill-in-the-blank is the primary mode" section of PROJECT_CONTEXT.md are now stale — flagged in the Last Updated note.

**`NumericQuestion.correctValue` changed from `number` to `string`**
- Teachers can now author `3.14`, `2a`, `g*sin(theta)`, etc.
- M3 grader will pick the strategy at runtime: if both sides parse as pure numbers → apply tolerance; otherwise → `math.simplify(submitted − expected).toString() === "0"` via mathjs. Grammar restricted to simple algebra (v1 lock).
- Data model comment added to the field explaining the dual-mode intent.

**True/False colors**
- Was: both options highlighted green.
- Now: **True-correct → green**, **False-correct → red**. Non-highlighted button stays neutral grey.
- `TFButton` now takes a `tone: "positive" | "negative"` prop that gates the color.

---

### Bug fixed

**`question.correctValue.trim is not a function`** (runtime crash on existing quiz data)
- A quiz block already in the dev DB had `correctValue: 0` (number, from before the type change).
- Fix: `String(question.correctValue ?? "").trim()` in `quiz-element.tsx`. React auto-coerces `0 → "0"` on the sidebar input's `value` prop; the next edit writes a string back and the field self-migrates.

---

### M3 architecture walkthrough

Verified end-to-end that M2.3's data shape won't require rework in M3. Full design points documented in `docs/PROJECT_CONTEXT.md` → "M3" section. Non-obvious points for future reference:

- **`sanitizeQuestion()` is the single anti-cheat boundary.** Strip correct-answer fields before broadcasting to students. Use an exhaustive discriminated switch with an `assertNever` default — new question kinds must be covered at compile time.
- **`contentSnapshot` is `JsonValue` (untyped) coming out of Prisma.** Add a `parseLabContent()` guard at the realtime-server entry point. One corrupted blob without a guard kills the whole session room.
- **No module-scope mutable state in `apps/realtime/`.** Push session state to Redis from day one. Single-instance today, but HA requires a storage-layer swap, not a handler rewrite.
- **`Answer.@@unique([participantId, blockId])` is the answer-lock.** Treat a `P2002` Prisma error on insert as the "already answered" success case.
- **`apps/realtime/` needs `@omnilab/lab-content` + `mathjs` as workspace deps** when M3 starts. Currently a stub.

---

### What's next — M2.4 — Image + Video blocks

M2 build order step 4. Covers Q7 (images) and Q8 (videos).

**Image blocks** (`ImageElement` type already exists):
- Two insertion paths: **upload from device** (S3 presigned URL → CloudFront CDN src) and **embed by URL** (paste any URL directly into `src`). URL embed is simpler and can ship first.
- S3 upload requires AWS setup (bucket + CloudFront + presigned-URL server action) — this is real infrastructure work. If not yet configured, start with URL embed and add S3 upload in a follow-up.
- Renderer: `<img src={el.src} alt={el.alt} />` inside the existing absolute-positioned box. Resize handles already work.
- Thumbnail: `<img>` at the thumbnail scale (same element, same src).
- Sidebar (Q20b): image URL input + alt text field when selected.

**Video embeds** (`VideoElement` type already exists):
- YouTube + Vimeo. Extract the video ID from the URL → render an `<iframe>` embed.
- In the editor: show a static thumbnail image (YouTube: `https://img.youtube.com/vi/{id}/0.jpg`) + a play icon overlay so the canvas doesn't get stuck in an iframe interaction trap. Actual playback only in preview/session mode.
- Sidebar: URL input field.

**Open question before starting**: Is the S3 bucket provisioned? If not, start with URL-embed-only for both image and video, do S3 upload as a follow-up.

---

### Stats
- Files created: `elements/quiz-element.tsx`, `elements/quiz-sidebar.tsx`.
- Files modified: `packages/lab-content/src/types.ts`, `packages/lab-content/src/index.ts`, `elements/element-toolbar.tsx`, `lab-editor.tsx`, `editor-canvas.tsx`, `slide-thumbnail.tsx`, `actions.ts`, `docs/PROJECT_CONTEXT.md`.
- Types removed: `EquationFillQuestion` (and from `QuizQuestion` union).
- Types changed: `NumericQuestion.correctValue: number → string`.
- Decisions: equation-fill kind cut; numeric absorbs symbolic answers; True/False two-color highlight.
