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

### What's next
- **M2.2 — Text + Equation blocks**: react-moveable for drag/resize, TipTap rich text editor, KaTeX + MathLive for equation elements, element selection system, add-element toolbar.

### Stats
- Files created: ~10 new (`packages/lab-content/src/`, `editor-canvas.tsx`, `slide-filmstrip.tsx`, `slide-thumbnail.tsx`, `context-menu.tsx`, `lab-editor.tsx`, `get-or-create-user.ts`, `dashboard/page.tsx`)
- Files modified: `actions.ts`, `lab-editor-actions.tsx`, `page.tsx` (editor), `next.config.ts`, `apps/web/package.json`, `.env.example`
