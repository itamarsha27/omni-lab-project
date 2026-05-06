# OmniLab — Project Context

> **For a fresh Claude Code session (especially on a different machine):** read this file end-to-end before doing anything else. It captures the architectural and product decisions that have been locked, where we are in the build, and how to collaborate with the user. The codebase alone does not encode the *why*.

---
## RESPONSE DEFAULTS (apply to every reply unless I override):

- Answer directly. No preamble, filler, affirmations, or trailing summary clauses.

- Use plain prose or tight lists. No decorative headers for short answers.

- Do not use Extended Thinking or web search unless my prompt is explicitly complex or time-sensitive.

- At 15+ messages, offer once to summarize key context for a fresh chat.

- If I request a correction, note once that editing my last message saves tokens.”

## What OmniLab is

A Google Classroom–style platform purpose-built for **exact sciences teachers** (math, physics, chemistry, biology). The differentiator is depth in STEM workflows that general-purpose classroom tools handle poorly: equation-heavy authoring, function graphs, lab protocols, quantitative grading.

The user's central abstraction is the **lab** — structurally modelled on **Google Slides / PowerPoint** (this is the explicit design muse: the editor UI, top bar with File menu, slide panel, canvas, etc. should feel immediately familiar to anyone who has used those tools). Each slide can contain **interactive widgets**: equations (KaTeX-rendered), function graphs (Desmos), quizzes, code blocks (Blockly, later), and eventually physics/chemistry simulations. Teachers author labs in a slide-editor UI by dragging widgets onto slides.

The second core feature is **live sessions** — Kahoot-style classroom plays where the teacher launches a lab, students join from their phones using a short on-screen code, and progress through the lab interactively with a real-time leaderboard. This is a v1 feature, not a phase-2 add-on.

The third pillar is the **Lab Marketplace** — teachers publish labs for other teachers to import (copy-on-import, no shared editing). Marketplace is **deferred to v1.1**, not v1.

## Audience

- **K–12 (primary), university (secondary).** Israeli context; user is in Israel.
- **Multilingual:** chrome stays English LTR. RTL (Hebrew) is allowed inside text/quiz content blocks. Clerk auth UI is now translated to Hebrew when the user's browser/preference indicates Hebrew.

## The wedge

Three things in fusion:
1. **Google Slides–style slide-deck authoring** — familiar UI (File menu, slide panel, canvas), but with deep STEM widgets: equations (KaTeX/MathLive), function graphs (Desmos), physics/chemistry simulations, code blocks. The editor is the moat.
2. Kahoot-style interactive classroom
3. Math typesetting quality high enough that students can self-study from a lab

Any of these alone exists elsewhere; the combination, with strong sciences depth, is the bet.

---

## Stack (locked)

| Layer | Tech | Notes |
|---|---|---|
| Web app | Next.js 15 (App Router) + TypeScript | Monorepo via pnpm workspaces |
| Styling | Tailwind CSS v4 + shadcn/ui (later) | CSS-first config, no `tailwind.config.ts` |
| Editor canvas | Custom React + dnd-kit + react-moveable | Built in M2 — the moat, not outsourced |
| Math input | MathLive | WYSIWYG equation editor with virtual keyboard |
| Math rendering | KaTeX | Faster than MathJax; pairs natively with MathLive |
| Function graphs | Desmos API (embed) | Free for education; switch to JSXGraph later if needed |
| Block-coding widget | ~~Blockly~~ → Real code editor | Python via Pyodide (in-browser); C#/Java deferred |
| Database | PostgreSQL via Prisma 6 | Lab content as JSONB |
| Database hosting | Neon (AWS Frankfurt) | Serverless, scale-to-zero |
| File storage | AWS S3 + CloudFront | Direct uploads via presigned URLs |
| Realtime | Socket.io + Redis adapter | Self-hosted on Fly.io (M0.6) |
| Equation grading | mathjs | Algebraic equivalence (not string match) for student answers |
| Auth | Clerk | `@clerk/nextjs` ^6, `@clerk/localizations` for i18n |
| Web hosting | Vercel | Auto-deploy from GitHub |
| Realtime hosting | Fly.io | `omnilab-realtime.fly.dev`, region `fra` |
| Redis | Upstash | Socket.io adapter, Frankfurt |

**Not chosen / actively rejected:**
- Blockly — originally considered for code widget; replaced by real code editor (Python/Pyodide). Blockly is visual block-coding; teachers want real code.
- D3 / Chart.js for "Desmos-like" graphing (wrong tool category)
- Neon Auth (we use Clerk; redundant)
- PhET simulations — physics widgets will be custom-built (Matter.js recommended)

---

## Locked product decisions

### Data model

- **Lab content is JSONB**, not normalized into Slide/Block tables. Editor experience is unaffected; storage is dramatically simpler for tree-shaped documents.
- **Layer B (the JSON shape)** is intentionally extensible — adding a widget type requires only a new TypeScript variant + Zod validator + React renderer. No DB migration. `Lab.contentVersion` handles eventual breaking JSON-shape changes.
- **`contentSnapshot` is frozen at session start.** Mid-session lab edits do not affect the running session. Past sessions show what was actually played.
- **Single author per lab in v1.** Co-authoring deferred.
- **`User.primaryRole` is a UX default, not a capability gate.** A teacher account can also enroll in a class as a student (TA case). Schema does not enforce role-based capabilities.
- **Join codes:** Class join codes are 8 chars (persistent, per-class). Session join codes are 6 chars (ephemeral, per-play). Both via nanoid with ambiguous chars (0/O/1/I/l) excluded.
- **Max one quiz block per slide** in v1, validated at save time. Avoids "which question is currently active?" ambiguity.
- **Not every slide contains a question.** Session state machine separates *slide state* from *question state*; non-quiz slides advance with a simple "next" — no question lifecycle is triggered.

### Live session UX (locked)

- **Player view (student phone):** intentionally minimal. Shows answer-input UI only when a question is active; otherwise placeholder telling them to watch the board.
- **Presenter view:** PowerPoint-style. Stage view (slides only, projector) is fully separate from teacher's controller (notes + next/prev/reveal + upcoming + live answer distribution). v1 implementation: two browser tabs, one dragged to the projector.
- **Server-authoritative timing.** Client clocks lie. Server timestamps when a question opens and each answer arrives; scoring computed server-side. The correct answer is never sent to clients until the question is closed (anti-cheat).
- **Answer lock-in:** once a student submits, they cannot change their answer.
- **Reconnection:** supported. Same nickname/account rejoins and resumes.
- **Two account modes for sessions:** ANONYMOUS (nickname only) or ROSTER (logged-in students in the class).

### Equation answers

- **Fill-in-the-blank is the primary mode.** Teacher authors a templated equation with `\boxed{?_blankId}` slots; student fills only the gap(s). Mobile-friendly.
- **Free equation entry** is secondary, for desktop/tablet. Uses MathLive's virtual math keyboard.
- **Server-side checking** uses `mathjs` for algebraic equivalence. `2x+4`, `2(x+2)`, and `4+2x` all score correct.
- **v1 grammar restricted to simple algebra.** No integrals, sums, matrices.

### Marketplace (deferred to v1.1)

- Copy-on-import; original author's lab untouched.
- Sciences-aware tags (subject, grade, curriculum, language).
- v1 ships marketplace stub at most: `Lab.visibility = PRIVATE | UNLISTED | PUBLISHED` field exists; UI is minimal. Ratings, moderation, paid labs come later.

### Localization

- **Browser-detected** via Accept-Language header on first visit (Hebrew or English).
- **Cookie override** via `/settings` page (`omnilab-locale` cookie).
- **Hard reload** on language change (Clerk's provider doesn't re-react to localization changes mid-session).
- **Currently only Clerk auth strings translate.** Translating OmniLab's own UI strings is a deferred follow-up (likely M4+); right tool is `next-intl` or similar.
- Eventually: sync with `User.preferredLang` for logged-in users (M0.4c webhook plumbing).

---

## Repo layout

```
omni-lab-project/
├── apps/
│   └── web/                    # Next.js app (Clerk-wrapped, i18n-aware)
│       ├── public/             # Static files: logos, favicons
│       ├── src/
│       │   ├── app/            # App Router pages
│       │   │   ├── page.tsx              # homepage with header
│       │   │   ├── layout.tsx            # ClerkProvider + locale detection
│       │   │   ├── sign-in/[[...sign-in]]/page.tsx
│       │   │   ├── sign-up/[[...sign-up]]/page.tsx
│       │   │   ├── dashboard/page.tsx    # protected
│       │   │   └── settings/             # language toggle (more later)
│       │   ├── components/     # shared React components (Logo)
│       │   ├── lib/            # i18n.ts and other server utilities
│       │   └── middleware.ts   # Clerk session + route protection
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       └── postcss.config.mjs
├── packages/
│   └── db/                     # @omnilab/db — Prisma schema + client
│       ├── prisma/
│       │   ├── schema.prisma   # 8 tables, 5 enums (see below)
│       │   └── migrations/     # versioned SQL migrations
│       ├── package.json
│       └── .env.example
├── docs/
│   └── PROJECT_CONTEXT.md      # this file
├── package.json                # workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json          # shared TS strict config
├── README.md
├── .gitignore
├── .editorconfig
└── .npmrc
```

**`apps/realtime/` (deployed M0.6):**
- `src/index.ts` — Express HTTP + Socket.io server, `/session` namespace stub
- `Dockerfile` — standalone multi-stage build
- `fly.toml` — Fly.io config (`omnilab-realtime`, region `fra`, shared-cpu-1x 256 MB)
- `.env.example` — `PORT`, `REDIS_URL`, `CORS_ORIGIN`

**`apps/web/src/app/labs/` (M1):**
- `page.tsx` — My Labs page (RSC, Prisma direct query, lab card grid)
- `actions.ts` — `createLab`, `renameLab`, `deleteLab` server actions
- `new-lab-button.tsx` — client component, triggers createLab
- `lab-card-menu.tsx` — kebab menu (···) with rename/delete dialogs (centered via `fixed`)
- `[id]/edit/page.tsx` — lab editor page (Google Slides-style two-row top bar)
- `[id]/edit/lab-editor-actions.tsx` — client: editable title + File dropdown menu
- `[id]/edit/lab-editor-actions.tsx` — File menu: Rename, Publish (disabled), Initiate (disabled), Delete

**`apps/web/src/components/site-header.tsx` (M1):**
- Shared header: logo-mark (links to /) + Settings + auth buttons + My Labs link
- Rendered in root layout — appears on every page

**Future packages (planned, not yet created):**
- `packages/lab-content/` — TypeScript types + Zod schemas for Layer B JSON tree — **CREATE THIS IN M2.1**
- `packages/ui/` — shared React components (whenever shared UI emerges)

## Database schema (current — see `packages/db/prisma/schema.prisma`)

8 models, 5 enums:

- **User** (clerkId mirrors Clerk's id, primaryRole = TEACHER | STUDENT | ADMIN, preferredLang)
- **Class** (joinCode 8-char, teacherId, archived)
- **Enrollment** (composite PK [classId, studentId])
- **Lab** (content as Json, visibility, tags[], forkedFromLabId, contentVersion)
- **LiveSession** (contentSnapshot frozen, joinCode 6-char, mode, state, currentBlockId/OpenedAt/ClosedAt)
- **Participant** (sessionId+nickname unique, status enum, score, lastSeenAt)
- **Answer** (`@@unique([participantId, blockId])` — DB-enforced one-answer-per-question lock; latencyMs for time-scoring)
- **Asset** (s3Key unique, ownerId, mimeType, bytes)

Defense-in-depth uniqueness: the `Answer` and `Participant` constraints exist both in app code AND in the DB.

---

## Build progress

### Done

- **M0.1** — project skeleton + GitHub remote (`b5324f9`)
- **M0.2** — Next.js + Tailwind v4 + monorepo (`773bc4d`)
- **M0.3** — Prisma + Neon Postgres, full schema migrated (`987d92b`)
- **Logo** — brand logo PNGs + reusable `<Logo>` component (`b5adb8b`)
- **M0.4a** — `@clerk/nextjs`; `<ClerkProvider>` wrapping root layout (`0745b6e`)
- **M0.4b** — sign-in/up pages, middleware route protection, header with `<UserButton />` (`f98b475`)
- **Localization** — `@clerk/localizations`, browser-detect, `omnilab-locale` cookie, `/settings` toggle
- **M0.4c** — Clerk → Postgres user sync via webhook; `svix` verification; `User` upsert on created/updated
- **M0.5** — Vercel deploy pipeline live at `https://omni-lab-project-web.vercel.app` (auth blocked until custom domain)
- **M0.6** — Socket.io realtime server deployed (`815043e`). Fly.io `omnilab-realtime` (fra) + Upstash Redis. Live: `https://omnilab-realtime.fly.dev/health`. **Fly.io note:** use `flyctl apps create` not `flyctl launch --no-deploy` (region bug).
- **M1** — My Labs page + lab CRUD (`13cc598` + polish commits). `/labs` page, lab cards with Edit/Publish/Initiate/··· actions. Create/rename/delete labs. Google Slides-style editor top bar (two-row: title row + File menu row). Shared `SiteHeader` on all pages. Homepage CTA buttons.
- **M2.1** — Canvas Foundation. `packages/lab-content/` workspace package: full v1 TypeScript content model (11 element types, 6 quiz question kinds), `createDefaultSlide()` / `createBlankSlide()` / `parseLabContent()` helpers, `CANVAS_WIDTH=1920` / `CANVAS_HEIGHT=1080` constants. Editor layout: left filmstrip (dnd-kit drag-to-reorder) + 16:9 scaled canvas (ResizeObserver + CSS `position:absolute` inner div) + right panel placeholder. Slide ops: add, delete, duplicate, reorder, select. Autosave: debounced 2 s + immediate on structural changes + Save button + unsaved dot indicator. Undo/redo: 20-step `useReducer` history stack. Keyboard: Ctrl+Z/Y/Shift+Z, Ctrl+S, Delete/Backspace (guarded from inputs). `createLab` seeded with first Title+Content slide. `getOrCreateUser()` helper for lazy Clerk→DB sync (fixes webhook-miss loop).
- **M2.2** — Text + Equation blocks. Reducer extended with element actions + `SNAPSHOT`/`MOVE_ELEMENT_LIVE` pattern (one drag = one undo step). **Drag-from-toolbar**: T / ∑ buttons act as drag handles — mousedown on the button → ghost tag follows cursor (`createPortal` to body) → drop on canvas creates element centered on cursor at default size. **Custom resize handles** (`elements/element-handles.tsx`): 8 corner/edge handles + selection outline rendered outside the scaled canvas div in container-relative px (`element.x * scale`). react-moveable was tried first and abandoned — it's fragile inside CSS-scaled containers. **Text element**: TipTap (StarterKit + Color + TextStyle + TextAlign + Tables, `immediatelyRender:false`); FormatToolbar lives in a portal at native screen size; base `font-size:48` on the wrapper so view-mode HTML and `.ProseMirror` render identically. Formatting commands run `selectAll()` first → alignment, headings, color, lists apply to the whole text box (per Q15-extended product call). **Equation element**: KaTeX view mode + popup MathLive editor in a portal (Word-style — quick-insert toolbar with 15 templates, font-size selector 12/14/16/18/24/32, live preview, virtual keyboard via `math-virtual-keyboard-policy="manual"`). `EquationElement.fontSize?: number` field added; box can be widened to fit longer equations (no auto-scaling). **Filmstrip thumbnails** now render elements (text + KaTeX + placeholder boxes). **Right-click menu** on elements: Bring to front / Send to back. Delete/Backspace deletes element only (slide deletion via filmstrip context menu). Editor background changed from gray-50/100 to `#e8e8e8` for clearer slide contrast. `e.preventDefault()` on every custom-drag mousedown — without it Chromium on Windows hijacks the gesture as native text-selection. Packages: `react-moveable` (installed but unused), `@tiptap/react` + starter-kit + 5 extensions, `katex`, `mathlive`.

### Open follow-ups

- **Translate OmniLab's own UI strings** (not just Clerk). Right tool: `next-intl`. Likely a dedicated milestone in M4.
- **Sync user preference to `User.preferredLang`** — naturally folds into M0.4c webhook work (already done structurally; just needs the field wired in settings UI).
- **`packages/lab-content`** (Zod schemas for Layer B JSON tree) — defer until the editor needs it.
- **Clerk production instance + custom domain** — deferred from M0.5. Clerk rejects `*.vercel.app` domains for production instances; a real domain (e.g. `omnilab.app`) is required. When purchased: set up Clerk Production environment, swap Vercel env vars to `pk_live_*` / `sk_live_*`, register a new production webhook in Clerk pointing to the live URL, add its `CLERK_WEBHOOK_SECRET` to Vercel env vars.

### Next

**M2.3 — Quiz Blocks (START HERE)**

The third sub-milestone of M2. The data model already exists (`QuizElement` in `packages/lab-content/src/types.ts` — discriminated union of 6 question kinds: `mc-single`, `mc-multi`, `short-text`, `numeric`, `equation-fill`, `true-false`). What's missing is the **renderer + authoring UI + grading helpers**.

Build in this order:
1. **Add `createQuizElement()` factory** in `packages/lab-content/src/index.ts`. Default `kind: "mc-single"` with two empty options.
2. **`elements/quiz-element.tsx`** — renderer that switches on `question.kind`:
   - View mode (always visible): question prompt + answer-input UI (radio buttons / checkboxes / text input / numeric input / MathLive blank / true-false buttons). Read-only in the editor; interactive in M3 live sessions.
   - Edit mode (double-click): a properties panel in the popup (or in the right panel) — kind dropdown, prompt textarea, options list (add/remove), correct-answer pickers, points field, time-decay toggle, optional `explanation` field (Q31).
3. **Equation-fill question editor**: MathLive math-field with the `\boxed{?_blankId}` placeholder; teacher fills in `correctLatex`. Re-use the popup math-field pattern from `equation-element.tsx`.
4. **Numeric question**: value, tolerance, unit-or-value toggle (Q23 — checkUnit boolean). Use `mathjs` later in M3 for grading.
5. **Multi-correct UI**: checkbox list, multiple correct answers stored in `correctIndices[]`.
6. **Constraint** (per locked product decision): max one quiz per slide. Validate at save time in `saveLabContent` server action — return error if a slide has more than one quiz element. Block the toolbar's "add quiz" button when the current slide already has one.
7. **Quiz toolbar button**: add a `?` (or `Q`) drag-from-toolbar button next to T / ∑. Same drag-from-button pattern.
8. **Filmstrip thumbnails**: render quiz blocks as a recognizable placeholder (not interactive in the thumbnail).
9. **Author-facing only**: no scoring, no submission, no answer-correctness logic in M2.3. That all moves to M3 (live session). For now we just author the question; grading-runtime is a stub.

Open product questions still to answer before / during build:
- Default points (probably 100, time-decayed = true).
- Where the quiz-properties UI lives — popup like equation, or right-panel sidebar (currently a placeholder `<aside>`)?

After M2:
- **M3** — live session lobby + Kahoot flow + quiz grading runtime (uses `mathjs` for equation-fill / numeric).
- **M4** — landing, polished onboarding, gradebook basics
- **M5** — marketplace stub (or defer to v1.1)

---

## How to collaborate with the user

### Profile
- Solo builder. Full-time CS student; about 10–18 effective hrs/week (more on engaged days).
- Background: some Python and C#. **No JS/TS/web stack experience.** Learning the stack as we build.
- I (Claude) write ~95% of the code; user reviews, runs locally, tests, approves before pushing.
- User retains all product/UX decision-making authority.
- No deadline pressure. Quality > speed. Realistic v1 ship: 6–9 months at sustained pace, 12 months conservative.

### Tone and style
- **Lead with verdicts**, then concise reasoning. Avoid stacking caveats.
- **Translate library names into "what it does for the product"** before debating tradeoffs. They'll ask "what is X" sometimes — answer directly without making them feel behind.
- **Take the call** when asked to choose between options. Don't punt back. Show reasoning so they can override.
- When they propose a tool that's mismatched to the job, **gently correct the category** before evaluating.

### Learning mode
- User explicitly asked to learn coding/CS skills as we build.
- Use the **📚** prefix for short callouts (2–5 sentences).
- Anchor every callout to a concrete file or piece of code that just appeared.
- Use Python or C# analogies where they exist.
- Don't pause progress to teach. Build first, annotate as we go.

### Safety / authorization
- **Never push without explicit user approval.** Even if I commit, the user runs `git push`.
- **Never modify env files in chat** (don't paste secrets even when asked). Walk the user through the change locally instead.
- **Student data implicates child-privacy regulations** (COPPA, FERPA in US, GDPR-K in EU). Flag relevant trade-offs explicitly when auth/sync decisions touch student records.

### Verification rhythm
- After every change: small testable artifact + clear "your turn" with what to run/click/check.
- The user runs commands and clicks UI; I cannot. If something broke locally, I need the full error text.
- Commit only after the user verifies the change works.

---

## Local state (per machine, NOT in Git)

These files exist on each developer machine but are gitignored. After cloning, recreate them by copying from another machine you trust.

- **`apps/web/.env.local`** — Clerk publishable + secret keys, sign-in/up URLs, fallback redirect URLs (`pk_test_*` / `sk_test_*` for dev)
- **`packages/db/.env`** — `DATABASE_URL` for Neon Postgres (same Neon project from any machine; both machines hit the same dev database)
- **`apps/web/.env.example`** and **`packages/db/.env.example`** — committed as documentation; they show what env vars are required, with placeholder values

The user's auto-memory directory at `~/.claude/projects/.../memory/` is *also* per-machine and does NOT travel via Git. This file (`docs/PROJECT_CONTEXT.md`) is the cross-machine bridge.

## Dev environment

- User is on **Windows 11**, working across two machines — check which one at the start of each session.
  - **Laptop:** `C:\Users\itama\omni-lab-project`
  - **Home Desktop:** `C:\Users\itama\Desktop\OmniLab Project` (note the space — quote in shell commands)
- Default terminal switched to **Git Bash** in VS Code; bash syntax (`&&`, single quotes, etc.) works.
- The `Bash` tool's PATH does NOT include `node` / `pnpm` — the user runs all `pnpm install`, `pnpm dev`, `pnpm db:migrate` commands themselves and reports back.
- `.env.local` and `packages/db/.env` are per-machine and gitignored — must be recreated on each machine from `.env.example`.

## Vercel deployment

- Project: `omni-lab-project` on Vercel, connected to GitHub `main` branch — auto-deploys on push.
- Live URL: `https://omni-lab-project-web.vercel.app`
- Root directory set to `apps/web` in Vercel project settings.
- Build command override: `pnpm --filter @omnilab/db generate && next build`
- Env vars configured on Vercel: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (both still `pk_test_*` / `sk_test_*`), `DATABASE_URL`, all `NEXT_PUBLIC_CLERK_*_URL` redirect vars. `CLERK_WEBHOOK_SECRET` not yet set on Vercel (webhook not registered for prod domain yet).
- **Auth is broken on the live URL** until the Clerk production instance + custom domain are set up (see deferred items).

## At the start of any session

1. Read this entire file.
2. Look at `git log --oneline` to see what's actually been committed (this file may be ahead of or behind reality).
3. Check `git status` to see if there's uncommitted work.
4. Ask the user "what shall we work on?" — don't assume. They may want to continue the next milestone, fix a bug, or pivot.

---

*Last updated: M2.2 complete. Starting M2.3 (Quiz blocks) next session.*

---

## READ THIS IF ON M2 — Lab Editor Design Decisions

This section captures the full product Q&A for M2. Answered questions are locked decisions. Unanswered questions still need a response from the user before implementation begins.

### Canvas & Slides

**Q1 — Aspect ratio**
✅ **16:9 locked as default.** No other options needed — 99% of modern screens are 16:9 and teachers won't print labs.

**Q2 — Slide panel position**
✅ **Left-side vertical filmstrip.** Mirrors to right side when locale is Hebrew (full RTL layout flip — this applies to the entire editor chrome when in Hebrew mode).

**Q3 — Slide limit**
✅ **Max 100 slides per lab.** Enforced at save time. Can be raised later based on demand.

**Q4 — Slide backgrounds**
✅ **User's choice. Default white.** Teacher can change per-slide background color (and eventually gradient/image).

**Q5 — Slide templates**
✅ **First slide defaults to "Title + Content" layout. Additional slides are blank.**

### Widget Types

**Q6 — Text blocks**
✅ **Full rich text: bold, italic, size, color, alignment, bullet lists, numbered lists, headings, tables.**

**Q7 — Image blocks**
✅ **Both upload from device (S3) and embed by URL. Do whichever is easier first; both are needed by v1.**

**Q8 — Video embeds**
✅ **Yes — YouTube/Vimeo embeds on slides.**

**Q9 — Desmos graphs**
✅ **Teacher-controlled only in v1.** Teacher configures the graph at authoring time and can add sliders that manipulate parameters live during presentation (e.g. `y = x² + c` with a slider for `c` from 0–10). Students view but do not interact with the graph directly.

**Q10 — Physics simulations**
✅ **Custom-built physics engine (not PhET).** Must-have for v1: projectile motion, kinematics, basic dynamics. Teachers can place physics objects on a canvas: point masses (balls), ropes, wheels/pulleys. This is a custom widget — not an iframe embed.

**Q11 — Chemistry simulations**
✅ **Basic chemistry only for v1, deeper later.** Minimum viable: periodic table reference widget and basic reaction display. Full molecule builder / reaction balancer deferred to a later version.

**Q12 — Code blocks**
✅ **Real code editor + in-browser execution. Blockly is OUT.** Teachers write actual code (language TBD — Python via Pyodide is the strong recommendation: runs in-browser, no server needed, students see output live). Teacher writes e.g. `print("hello world")` or a loop, runs it during the lab, output appears in the widget. No visual block-coding.

**Q13 — Drawing / freehand**
✅ **Yes, full freehand drawing tool.** Teachers can sketch freely on the canvas — diagrams, annotations, free body diagrams, arrows, anything. This is a core feature, not a nice-to-have.

**Q14 — Shapes**
✅ **Yes — basic shape library in v1.** Rectangle, circle, triangle, arrow, line. Used for diagrams and annotations alongside the freehand tool.

### Editing Interactions

**Q15 — Snap to grid / alignment guides**
✅ **Snap to grid on by default; user can disable in an "Advanced" settings panel.** Smart alignment guides (show when dragging near other elements) also included.

**Q16 — Z-ordering**
✅ **Yes — Bring to front / Send to back in v1.**

**Q17 — Multi-select**
✅ **Yes — Ctrl+click to select multiple elements; move and delete together.**

**Q18 — Copy/paste across slides**
✅ **Required in v1.** Implement if straightforward; push to post-v1 only if it proves genuinely complex (expectation: it won't be).

**Q19 — Undo/redo depth**
✅ **Up to 20 steps. Step cost is widget-dependent:** regular edits = 1 step each; physics simulation state changes = heavier, counted differently to avoid blowing the stack. Undo/redo is granular and context-aware.

**Q20 — Keyboard shortcuts**
✅ **Yes — standard set required:** Ctrl+Z (undo), Ctrl+Y / Ctrl+Shift+Z (redo), Ctrl+C (copy), Ctrl+V (paste), Ctrl+X (cut), Delete/Backspace (remove selected), arrow keys (nudge element by 1px), Shift+arrow (nudge by 10px).

**Code block languages (addition to Q12)**
✅ **Python via Pyodide in v1 (runs fully in-browser, no server needed).** C# and Java deferred — they require server-side execution sandboxes or heavy WASM runtimes, not worth the complexity for v1. Revisit post-launch.

### STEM-specific

**Q21 — Standalone equation blocks**
✅ **Yes — a dedicated "Equation" element type** that renders a KaTeX equation anywhere on the slide (like an equation in Microsoft Word — placed as a content block, not just inside text). Separately, quiz answer inputs also support equation entry via MathLive when the question type calls for it.

**Q22 — Fill-in-the-blank: number of blanks**
✅ **One blank per equation in v1.** Multiple blanks deferred to post-v1.

**Q23 — Unit handling in numeric answers**
✅ **Question-dependent: teacher chooses whether the grader checks the number or the unit, but not both simultaneously.** Each numeric question has a setting: "check value" or "check unit". Not both at once in v1.

**Q24 — Graphing quiz**
⬜ *Deferred post-v1.* Good feature, too complex for now. Students cannot sketch functions or place points on Desmos as an answer in v1.

**Q25 — Lab protocol / procedure blocks**
⬜ *Not a must-have for v1.* Nice-to-have; revisit after core editor is stable.

**Q26 — Data table widget**
⬜ *Not a must-have for v1.* Nice-to-have; revisit after core editor is stable.

### Quiz & Assessment

**Q27 — Question types in v1**
✅ **All of them:** multiple choice (single answer), multiple choice (multi-correct), short text, numeric (with tolerance), equation fill-in-the-blank, true/false.

**Q28 — Answer feedback timing**
✅ **Live session:** feedback revealed only after the whole class has answered OR the teacher manually closes the question — whichever comes first.
✅ **Self-study mode:** instant feedback on submit.
⬜ **Exam mode** (deferred post-v1): answers hidden until the teacher explicitly ends the exam and releases results. Save as a planned feature — `LiveSession.mode` can gain an `EXAM` variant later.

**Q29 — Point values**
✅ **Configurable per question; default is time-decayed scoring.** Base value = 100 points, drops based on how long the student took to answer (faster = more points, Kahoot-style). Exact decay curve TBD when we implement scoring in M3. Teacher can override with a fixed point value per question if they prefer.

**Q30 — Hints**
⬜ *Deferred post-v1.* Teacher-authored hints that students can reveal at a point penalty. Planned feature — design the question data model to have an optional `hint` field from day one so it's non-breaking to add later.

**Q31 — Worked solution / explanation**
✅ **Yes, teacher's choice per question.** Teacher can optionally attach a worked solution/explanation. If attached, it is revealed to students after the question closes (live session) or after they submit (self-study). Teacher can choose not to add one or to keep it hidden.

### Saving & History

**Q32 — Autosave**
✅ **Both: autosave + explicit Save button.** Autosave triggers on a timer and also immediately on meaningful events (new slide added, slide deleted, widget dropped). Save button always visible for manual saves. Unsaved indicator (dot on title) like VS Code.

**Q33 — Version history**
⬜ *Deferred post-v1.* Good feature — worth designing the DB to append snapshots cheaply (e.g. periodic `LabVersion` rows) so it's easy to add later.

**Q34 — Offline / connection loss**
✅ **Warn the user that connection is lost; do not silently queue.** On reconnect, attempt to re-save the current in-memory state. Queuing writes across a disconnect risks silent conflicts — safer to surface the problem and let the teacher decide. (Recommendation accepted.)

### Preview & Student View

**Q35 — "Preview as student" mode**
✅ **Yes — high priority.** A "Preview" button in the editor launches a full student-view simulation in a new tab (or modal): interactive widgets active, questions answerable, no live session needed. Teacher sees exactly what a student would see.

**Q36 — Presentation / projector mode**
✅ **Yes, but lower priority for v1.** Full-screen clean slide view. Teacher drags this tab to the projector. Include as v1 but build after the core editor is stable.

**Q37 — Print / PDF export**
✅ **Yes — static content only.** Export renders each slide to PDF, skipping all interactive widgets (quiz blocks, physics sims, code runners, Desmos interactive sliders). Text, images, static equations (KaTeX), and static graph snapshots are included. Interactive widgets show a placeholder ("Interactive content — open in OmniLab").

### Polish & Power Features

**Q38 — Themes**
⬜ *Deferred post-v1.* Built-in color themes planned. Add the data model field (`Lab.theme`) now so it's non-breaking to implement later.

**Q39 — Speaker notes**
✅ **Yes.** Per-slide teacher notes panel in the editor (below the canvas or in a collapsible drawer). Visible only to the teacher during presentation mode, never to students.

**Q40 — Slide transitions / animations**
✅ **Teacher picks from a preset list** (e.g. None, Fade, Slide, Zoom — mirroring Google Slides presets). Applied per-slide. Stored in the slide's JSON metadata.

**Q41 — Duplicate slide**
✅ **Yes — via right-click context menu on the slide filmstrip** → "Duplicate slide". Also available from the Edit menu (future).

**Q42 — Reorder slides**
✅ **Drag to reorder in the filmstrip — essential.** Must feel smooth and fast. Use dnd-kit (already in the stack).

**Q43 — Mobile authoring**
✅ **Desktop-only for v1.** No responsive layout effort for the editor. Students joining live sessions on mobile is fully supported — only the authoring editor is desktop-only.

**Q44 — Accessibility**
⬜ *Deferred to v2.* Alt text on images and screen reader support are planned. Flag when adding image blocks to include an `alt` field in the data model so it's non-breaking later.

---

### M2 Build Order (locked)

1. **Canvas foundation** — slide filmstrip, drag/resize/select widgets, undo/redo, autosave
2. **Text + Equation blocks**
3. **Quiz blocks** — all 6 question types + grading logic
4. **Image + Video blocks**
5. **Freehand drawing + Shapes**
6. **Desmos graph widget** — teacher-configured with sliders
7. **Code block** — Python via Pyodide (C# / Java deferred post-v1)
8. **Physics simulation widget** — most complex, built last
9. **Preview mode + PDF export + Presentation mode** — caps M2
