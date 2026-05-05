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
