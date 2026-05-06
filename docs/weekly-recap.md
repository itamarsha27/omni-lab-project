# OmniLab — Weekly Recap

---

## Day 1 — 2026-05-05

### What we built

**M0.6 — Realtime server deployed**
- Picked up mid-milestone. `apps/realtime/` was already scaffolded (Express + Socket.io + ioredis + `@socket.io/redis-adapter`).
- Created Upstash Redis database (Frankfurt region) and wired `REDIS_URL` secret to Fly.io.
- Hit a bug with `flyctl launch --no-deploy` (region-not-found even for valid codes). Workaround: use `flyctl apps create` instead, then `flyctl secrets set`, then `flyctl deploy`.
- Added `primary_region = "fra"` to `fly.toml`.
- Fixed `moduleResolution: Node16` requires `module: Node16` in `apps/realtime/tsconfig.json`.
- Deployed successfully. `/health` returns `{"status":"ok"}`. Live at `https://omnilab-realtime.fly.dev`.
- Committed: `815043e`

**M1 — My Labs page + lab CRUD**
- `/labs` page (RSC): lab cards grid, "New Lab" button, empty state.
- Lab cards: thumbnail area (gradient placeholder), title, description, updated date.
- Action bar per card: Edit (→ `/labs/[id]/edit`), Publish (disabled, v1.1), Initiate (disabled, M3), `···` kebab menu.
- Kebab menu: Rename (dialog, centered via `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`) + Delete (confirm dialog, same centering fix).
- `createLab`, `renameLab`, `deleteLab` server actions. Ownership checked via `authorId`.
- Lab editor placeholder at `/labs/[id]/edit`: Google Slides-style two-row top bar.
  - Row 1: `← My Labs` + editable inline title (click to edit, blur/Enter saves, Escape cancels)
  - Row 2: `File ▾` dropdown (Rename, Publish disabled, Initiate disabled, Delete)
- Shared `SiteHeader`: logo-mark top-left (links to `/`) + Settings + auth buttons + My Labs link. Added to root layout — appears on every page.
- Homepage: removed own header (replaced by SiteHeader), added CTA buttons ("Go to My Labs" when signed in, "Get started free" + "Sign in" when signed out).
- Middleware updated to protect `/labs(.*)`.
- Committed: `13cc598` + polish fix commit

**M2 — Full product spec locked (44 questions)**
- Went through 44 design questions covering canvas, widgets, editing interactions, STEM features, quiz/assessment, saving, preview, and polish.
- All decisions documented in `docs/PROJECT_CONTEXT.md` under "READ THIS IF ON M2".
- Key decisions: Google Slides-style editor is the explicit design muse. 16:9 canvas. Max 100 slides. Blockly OUT → real Python code editor (Pyodide). Custom physics engine (Matter.js). Full freehand drawing. All 6 quiz types. Time-decayed scoring (Kahoot-style). Autosave + manual Save button.
- M2 build order locked: Canvas foundation → Text/Equation → Quiz → Image/Video → Drawing/Shapes → Desmos → Code → Physics → Preview/Export.

### What's next
- **M2.1 — Canvas Foundation**: `packages/lab-content/` types, editor layout (filmstrip + canvas), slide CRUD, drag-to-reorder, autosave, undo/redo.

### Stats
- Commits today: 3 (`815043e`, `13cc598`, polish)
- Files created: ~15 new files across `apps/realtime/`, `apps/web/src/app/labs/`, `apps/web/src/components/`
- Decisions locked: 44 (full M2 spec)

---

## Day 2 — 2026-05-06

### What we fixed
- **Clerk key mismatch on desktop machine** — `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` were from different Clerk instances. Sign-in UI was blank; middleware loop once corrected. Fix: copy both keys together from the same Clerk dashboard row.
- **Missing Clerk redirect URL env vars** — `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` absent on desktop `.env.local`; Clerk component silently renders nothing without them.
- **`/dashboard` redirect loop** — Clerk fallback redirect pointed to `/dashboard` (page didn't exist). Created `apps/web/src/app/dashboard/page.tsx` that immediately redirects to `/labs`. Updated `.env.example` fallback URLs to `/labs`.
- **`@omnilab/db` not resolved** — `pnpm install` + `pnpm db:generate` not yet run on desktop. Documented fix.
- **User sync gap (`itamarshaf9`)** — user existed in Clerk but not in Postgres (webhook missed them). Added `apps/web/src/lib/get-or-create-user.ts`: helper that does a lazy upsert using Clerk's `currentUser()` on first visit. Replaced the `findUnique → redirect("/sign-in")` pattern in `labs/page.tsx`, `labs/[id]/edit/page.tsx`, and `labs/actions.ts`.

### What we built — M2.1 Canvas Foundation

**`packages/lab-content/` — new workspace package**
- Full v1 content model as TypeScript discriminated unions: `LabContent`, `Slide`, `SlideElement` (11 element types), `QuizQuestion` (6 question kinds).
- Helper exports: `createDefaultSlide()` (Title+Content template), `createBlankSlide()`, `parseLabContent()` (safe parser with fallback).
- `CANVAS_WIDTH = 1920`, `CANVAS_HEIGHT = 1080` constants.
- Wired into `apps/web` via `workspace:*` dep + `transpilePackages` in `next.config.ts`.

**Editor layout**
- `LabEditor` client component owns the full editor layout (top bar + filmstrip + canvas + right panel placeholder).
- Left filmstrip: 176px wide, scrollable, dnd-kit `SortableContext` for drag-to-reorder.
- Center: 16:9 canvas (`aspect-ratio` CSS + `ResizeObserver` scale = `containerWidth / 1920`). Inner div is `position:absolute` so it doesn't affect the outer div's height.
- Right panel: 240px placeholder for M2.2+ properties panel.

**Slide operations**
- Add slide (button at filmstrip bottom, inserts after selected).
- Delete slide (filmstrip context menu + keyboard Delete/Backspace — guarded so it doesn't fire while typing).
- Duplicate slide (right-click → "Duplicate slide"; deep-clones with fresh UUIDs).
- Drag to reorder (dnd-kit `PointerSensor`, `activationConstraint: { distance: 6 }` to avoid accidental drags).
- Select (click thumbnail; new slides auto-select).
- Min 1 slide enforced in reducer.

**Autosave + Save**
- `saveLabContent(labId, content)` server action.
- Debounced 2 s autosave on any `isDirty` change; immediate save on structural actions (add/delete/duplicate/reorder).
- Save button in top bar (indigo when dirty, gray when clean).
- Unsaved dot (●) on title, VS Code-style.

**Undo/redo**
- `useReducer`-based editor state with `{ past, present, future }` history.
- 20-step cap (`past.slice(-20)`).
- Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z keyboard shortcuts.
- Ctrl+S for manual save.

**`createLab` updated** — seeds first slide with Title+Content template instead of `{ slides: [] }`.

### What we built — M2.2 Text + Equation blocks (later in the day)

**Element model + factories**
- `createTextElement()` and `createEquationElement()` in `@omnilab/lab-content` for the toolbar to use.
- `EquationElement.fontSize?: number` added to the type — the equation's display font-size in canvas px (decoupled from box size).

**Reducer extensions** (`lab-editor.tsx`)
- New actions: `SELECT_ELEMENT`, `ADD_ELEMENT`, `UPDATE_ELEMENT`, `MOVE_ELEMENT_LIVE`, `DELETE_ELEMENT`, `BRING_TO_FRONT`, `SEND_TO_BACK`, `SNAPSHOT`.
- `SNAPSHOT` + `MOVE_ELEMENT_LIVE` pattern: drag/resize fires `SNAPSHOT` once at threshold (4 screen px) to record the pre-drag state in the undo stack, then 60fps `MOVE_ELEMENT_LIVE` updates `present` without polluting history. Result: one drag = exactly one undo step.
- Delete/Backspace now only removes the selected element (slide deletion moved to filmstrip right-click only — Delete-deletes-slide footgun removed by user request).

**Drag-from-toolbar (custom palette drop)**
- First attempt: click button → enters draw mode → drag on canvas. User rejected — wanted Figma-style drag from the button itself.
- Final: `onMouseDown` on **T** / **∑** registers window mousemove/mouseup. A ghost tag (`createPortal` to `document.body`) follows the cursor, turning indigo when over the canvas. Drop inside canvas → element placed centered on the drop point at default size; drop outside → cancel.

**Custom drag/resize handles** — react-moveable scrapped
- Initial implementation used `react-moveable`. It misbehaves inside CSS-scaled containers (translate values vs. screen-space mouse deltas) — handles didn't track correctly and resizing was buggy.
- Replaced with `elements/element-handles.tsx`: 8 corner/edge handles + a selection outline rendered **outside** the scaled canvas div, in container-relative screen space (`element.x * scale`). Each handle wires its own window mousemove for resizing with min-size clamping (40×20).
- `useElementDrag` hook: shared movement logic for text and equation elements. `e.preventDefault()` on the mousedown is critical — without it, Chromium on Windows hijacks the gesture as native text-selection and silently kills the window mousemove listener.

**Text element (TipTap)**
- TipTap rich text editor with StarterKit + Color + TextStyle + TextAlign + Tables.
- `immediatelyRender: false` to avoid Next.js SSR hydration mismatches.
- Shrinking-on-edit bug: format toolbar was inside the scaled canvas (visually halved); TipTap also stripped inline `font-size` on `<p>` tags. Fixed both:
  1. `FormatToolbarPortal` rendered via portal to `document.body`, repositioned on scroll/resize using `getBoundingClientRect()`.
  2. Base `font-size: 48` set on the text-element wrapper so view-mode HTML and TipTap's `.ProseMirror` inherit the same starting size.
- Added shared CSS in `globals.css` for `.tiptap-content` and `.ProseMirror` — zero `<p>` margins, heading sizes, table borders — so view and edit render identically.
- **Formatting applies to the whole text box** (not just current paragraph): per product decision, every command in the toolbar runs `editor.chain().focus().selectAll()` first. Insert-table is the only exception (still inserts at cursor).

**Equation element (KaTeX + MathLive)**
- View mode: `katex.renderToString(latex, { displayMode: true })` with `dangerouslySetInnerHTML`.
- Edit mode: popup editor in a portal at native screen size — bypasses canvas scaling so the math-field is full-size and clickable.
- Quick-insert toolbar: 15 Word-style template buttons (fraction, √, n-th root, x^n, x_n, Σ, ∫, lim, π, θ, ∞, ≤, ≥, ≠, ±) — each renders a KaTeX preview as the button label.
- Font-size selector: 12 / 14 / 16 / 18 / 24 / 32 (UI labels are doubled for canvas px → 24, 28, 32, 36, 48, 64). Stored in `element.fontSize`. Default 64.
- Live preview as you type: `onInput` writes to a `draftLatex` state, the slide-rendered KaTeX picks it up immediately.
- Click outside / Done commits, Cancel reverts.
- `math-virtual-keyboard-policy="manual"` so the on-screen keyboard appears when the keyboard icon on the math-field is clicked.
- **No auto-scaling on resize.** First version derived font-size from box height — user wanted explicit control instead. Resizing the box now only widens/narrows the equation's container (long equations = wider box).

**Filmstrip preview**
- `SlideThumbnail` now actually renders elements inside the scaled `THUMB_SCALE` div (was background-only). Text via `dangerouslySetInnerHTML`, equations via KaTeX, other types as colored placeholders.

**Right-click menu on elements**
- Re-uses the existing `ContextMenu` (shared with filmstrip). Items: "Bring to front" / "Send to back".

**Background**
- Editor `<main>` and canvas wrapper changed from `bg-gray-50`/`bg-gray-100` to `#e8e8e8` for clearer contrast against the white slide.

**Packages installed**
- `react-moveable` (later removed from imports), `@tiptap/react` + `@tiptap/starter-kit` + 5 extensions (color, text-style, text-align, table×4), `katex`, `mathlive`, `@types/katex`.

### What we learned today
- **react-moveable inside a CSS-scaled container is fragile.** The library uses matrix transforms for parent transforms but applying drag deltas via `transform: translate()` in the element's local coordinate system caused visible drift. Switching to plain `position: absolute` + `getBoundingClientRect()` math (`screenDelta / scale`) is dramatically more predictable.
- **Custom drag handlers MUST `e.preventDefault()` on mousedown.** Chromium on Windows starts a native text-selection drag otherwise, captures the mouse, and silently breaks `window.addEventListener('mousemove')`. `userSelect: none` is not enough.
- **TipTap `useEditor` needs `immediatelyRender: false`** in Next.js App Router — the editor can't initialize on the server.
- **Anything that needs to escape the scaled canvas** (selection handles, format toolbar, equation popup) should be rendered in container-relative or screen-relative space, not as a child of the 1920×1080 div. Nesting a counter-scaled element inside the scaled div technically works but is full of off-by-scale-factor pitfalls.

### What's next
- **M2.3 — Quiz blocks**: 6 question types (mc-single, mc-multi, short-text, numeric, equation-fill, true/false), grading helpers, max one quiz per slide enforced at save.

### Stats
- Files created: ~10 new (`packages/lab-content/src/`, `editor-canvas.tsx`, `slide-filmstrip.tsx`, `slide-thumbnail.tsx`, `context-menu.tsx`, `lab-editor.tsx`, `get-or-create-user.ts`, `dashboard/page.tsx`); plus M2.2: `elements/element-toolbar.tsx`, `elements/element-handles.tsx`, `elements/text-element.tsx`, `elements/equation-element.tsx`, `elements/use-element-drag.ts`.
- Files modified: `actions.ts`, `lab-editor-actions.tsx`, `page.tsx` (editor), `next.config.ts`, `apps/web/package.json`, `.env.example`; plus M2.2: `lab-editor.tsx`, `editor-canvas.tsx`, `slide-thumbnail.tsx`, `globals.css`, `lab-content/src/types.ts`, `lab-content/src/index.ts`.
