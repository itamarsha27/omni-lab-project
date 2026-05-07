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

---

## Day 3 — 2026-05-07

### Theme of the day
M2.2 polish + UX quality. Started with a manual bug-list pass on the text/equation editor before greenlighting M2.3, which uncovered a surprising number of cross-cutting issues: scaled-canvas interactions with ProseMirror's auto-scroll, Tailwind v4's preflight stripping list/font defaults, contenteditable caret rendering on empty paragraphs, and several small product-feel asks (font picker, font-size controller, drag-while-editing, snap to grid). Spent the whole day on these instead of starting M2.3 — call sequence felt right; quality > speed.

### Bugs fixed

**Bold/italic now apply to selection, not whole box** (`text-element.tsx`)
- Original M2.2 product decision was "all formatting applies to whole textbox" via `selectAll()` before each command. User reversed: selection-based for inline (B/I/H1/H2/P/lists/color/table); whole-box only for L/C/R alignment.

**Equation popup pre-fills with current LaTeX** (`equation-element.tsx`)
- Race condition: `mf.value = element.latex` ran before MathLive upgraded the `<math-field>` custom element, so opening an existing equation showed an empty editor. Fix: `customElements.whenDefined("math-field").then(...)` before calling `setValue()`. Also keyed the math-field on `element.id` to force clean remount.
- Same fix kills the spurious `Cannot read properties of undefined (reading 'options')` console error — that was the same race accessing MathLive internals before init.

**Equation popup flips above when near bottom of screen** (`equation-element.tsx`)
- Was always pinned `r.bottom + 8` (below the equation). Now measures viewport space, places above when below has < popup height. Re-measures via `requestAnimationFrame` so first-render heights are picked up.

**Format toolbar tracks the textbox during drag** (`text-element.tsx`)
- Toolbar position was measured only on scroll/resize. Drag fires neither, so the toolbar lagged behind the moved box. Fix: pass the element to `FormatToolbarPortal` as a prop so its `useLayoutEffect` re-fires on every position change.

**Drag-while-editing** (`element-handles.tsx`)
- Mousedown on the text-element body returned early when `isEditing` was true (correct — clicks inside should land in the text editor). But there was no other way to grab the box. Added 4 invisible 10px draggable strips along the selection border, hooked to `useElementDrag`, with z-index below the resize handles so corner resize still wins.

**Tailwind v4 preflight kills list markers** (`globals.css`)
- `<ul>`/`<ol>` had no bullets/numbers because Tailwind v4 zeroes `list-style` globally. Restored `list-style: disc` / `list-style: decimal` scoped to `.tiptap-content` / `.ProseMirror`.

**Inline `font-family` did not affect editor view** (`globals.css`)
- After adding the font picker, picking Calibri/David/etc. only applied in the thumbnail. Cause: a `font-family: var(--font-sans)` rule on `.tiptap-content` / `.ProseMirror` overrode the inline `fontFamily` on the wrapper. Removed the rule; let inheritance work.

**Pressing Enter made text disappear** (`text-element.tsx`)
- ProseMirror auto-calls `scrollIntoView` on every transaction's selection. Combined with the canvas's CSS transform + `overflow: hidden` ancestors, the scroll math went wrong and shifted the visible text out of the box. Fix: `editorProps.handleScrollToSelection: () => true` (suppresses globally). Plus `editor.commands.focus("end", { scrollIntoView: false })` on initial double-click.

**Caret invisible on fresh blank lines** — three compounding fixes
1. `caret-color: auto` on `.ProseMirror` (was hardcoded indigo, then changed to `auto` so the browser picks a contrasting color against the slide background).
2. `min-height: 1.25em` on `<p>` so empty paragraphs reserve a full line-height worth of vertical space.
3. Added `@tiptap/extension-placeholder` so an `is-empty::before` pseudo-element manifests a real line-box on empty paragraphs — without inline content, browsers don't anchor the caret. Placeholder is `"|"` with `showOnlyCurrent: false`, so every empty line shows the bar glyph (also serves as a clear "you can type here" affordance).

**Auto-grow on overflow** (`text-element.tsx`)
- Listens to TipTap's `update` event, reads `proseEl.scrollHeight`, dispatches `MOVE_ELEMENT_LIVE` with `height = scrollHeight + 8` (8 px buffer so the cursor's line isn't flush against the `overflow: hidden` boundary). Uses `MOVE_ELEMENT_LIVE` so per-keystroke grows don't pollute history; the final height lands in history on blur via `commitContent`. Required `elementRef` / `slideIndexRef` so the editor's onBlur closure (created once by `useEditor`) sees the latest auto-grown height.

**Click outside canvas deselects** (`lab-editor.tsx`)
- `onMouseDown` on the gray padding wrapper around the canvas + on the right aside, with `e.target === e.currentTarget` so descendant clicks don't trigger deselect. `onMouseDown` (not `onClick`) so deselect happens before any subsequent drag.

**Horizontal snap-to-grid on drag** (`use-element-drag.ts`)
- New `snapHorizontal()` helper. Snaps element's left edge to slide left (x = 0), right edge to slide right (x = 1920), or horizontal center to slide center (x = 960 − width/2). 24 px threshold. Edges win over center if both are in range (cleaner visual).

### Features added

**Word-style font-size controller** (`font-size-control.tsx` — new shared component)
- `−` / numeric input / `▾` presets / `+` controller. Type any size, Enter/blur commits, Escape reverts. Step is 2; clamp 6 ≤ label ≤ 200. Preset dropdown lists Word's font sizes (8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72).
- User-facing label is canvas-px ÷ 2 (typing "42" stores `fontSize: 84`) since 1920×1080 canvases need bigger source pixels than typical document points to read at the same perceptual size.
- Used in: equation popup, text format toolbar (`size="sm"` variant for the floating toolbar).
- `TextElement.fontSize?: number` added to the type model. Default 48 in `createTextElement`.

**Font-family picker** (`font-family-control.tsx` — new component)
- Dropdown of 11 fonts: Default (Inter), Calibri, Cambria, David, Arial, Times New Roman, Georgia, Verdana, Tahoma, Courier New, Comic Sans MS. Each option preview-rendered in its own font. Stored as a full font-family stack (`'"Calibri", "Carlito", "Segoe UI", sans-serif'`) so absent fonts fall back gracefully — Carlito is the metric-compatible Linux clone of Calibri, Frank Ruehl CLM the Linux fallback for David, etc.
- `TextElement.fontFamily?: string` added. Stored stack is applied via inline `style.fontFamily` on the element wrapper.
- Inter is the global default, loaded via `next/font/google` and exposed as the `--font-sans` CSS variable. Hooked into Tailwind v4's `@theme` block so `font-sans` utilities resolve to it; html element gets the `inter.variable` class so the variable is defined at the root level.

**Equation default font size aligned to text default**
- `createEquationElement` default `fontSize: 64 → 48` so a fresh equation reads at the same visual height as a fresh text box.

### Thumbnail saga
Long arc — five iterations to land on the right behavior.
1. Started M2.2's strict-proportional rendering: tiny but accurate (~5 px text in a 220-wide thumbnail).
2. User said unreadable. Bumped source font-size to 96 ("boost"); thumbnail was readable but text was now 2× wider than the proportionally-scaled boxes — content drifted right and got clipped.
3. Dropped width/height constraints + `whiteSpace: nowrap` to stop wrapping. Solved clipping but broke `text-align: center` (no width = nothing to center against).
4. Restored width with `overflow: visible`. Fixed centering for one slide but boost still made content drift on the right side.
5. **Final**: dropped the boost entirely, mirrored the editor 1:1 (same `fontSize`, same `fontFamily`, same wrapper styles). Equation thumbnails use the same flex-centered wrapper as the editor. Text appears small (~5 px for default 48-source text in a 220-wide thumbnail) — accepted tradeoff for true "screenshot" accuracy. `THUMB_W` settled at 220, aside `w-60`.

### Lessons learned
- **ProseMirror's auto scroll-into-view bites in scaled containers.** `transform: scale()` ancestors + `overflow: hidden` somewhere up the tree = scroll math goes wrong, content ends up shifted off-screen. `editorProps.handleScrollToSelection: () => true` suppresses globally; pair with `focus(_, { scrollIntoView: false })` for explicit focus calls.
- **Empty `<p><br></p>` doesn't always manifest a line-box.** Without an inline run for the caret to anchor in, the browser doesn't render the caret even on a focused contenteditable. Placeholder's `::before` pseudo-content is the cleanest fix — it builds the line-box and makes the caret render. `min-height` alone reserves vertical space but doesn't create a line-box.
- **Tailwind v4's `@theme` is great for CSS-variable-based design tokens** (font-sans, colors, etc.) but its preflight can quietly strip defaults you assumed (list-style, font-family chains in some places). Always grep preflight when something visual "doesn't work" globally.
- **Custom elements + React refs have a race window.** Setting `mf.value = ...` on a `<math-field>` before MathLive's JS upgrades the element fails silently. Always wait via `customElements.whenDefined("math-field").then(...)` before touching custom-element internals. Same pattern applies to any custom element with deferred upgrade (Lit components, custom video players, etc.).
- **Refs + `useEditor` (TipTap) closures.** `useEditor`'s callbacks (onBlur, etc.) capture closures *once*; they don't see prop updates. For any state that should be "current" at callback time (latest element height after auto-grow), thread it through a `useRef` that's reassigned on every render.
- **The thumbnail tradeoff is not solvable without compromise.** Either accurate-but-tiny or readable-but-distorted. We picked accurate. If the user later wants both, the fix is bigger thumbnails (e.g., a separate "full-size preview" panel), not changing the rendering math.

### What's next
- Decision pending: when to start **M2.3 (Quiz blocks)**. The next session.
- Smaller pending ask: **inline equation inside a text box** (a TipTap inline node + the existing equation popup). User asked, agreed to skip for now, queued for a dedicated pass.

### Stats
- Files created today: 2 (`elements/font-size-control.tsx`, `elements/font-family-control.tsx`).
- Files modified today: `text-element.tsx`, `equation-element.tsx`, `element-handles.tsx`, `use-element-drag.ts`, `slide-thumbnail.tsx`, `slide-filmstrip.tsx`, `lab-editor.tsx`, `globals.css`, `layout.tsx`, `packages/lab-content/src/types.ts`, `packages/lab-content/src/index.ts`.
- New dependency: `@tiptap/extension-placeholder`.
- Decisions reversed: **inline formatting (bold/italic/etc.) is now selection-based**, not whole-box — only L/C/R alignment remains whole-box.
- Decisions added: 11-font preset list (Inter default + 10 Word fonts including Calibri & David); horizontal snap-to-grid; auto-grow textbox vertical; click-outside-canvas deselects.
