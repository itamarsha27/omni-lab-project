# OmniLab — Project Context

> **For a fresh Claude Code session (especially on a different machine):** read this file end-to-end before doing anything else. It captures the architectural and product decisions that have been locked, where we are in the build, and how to collaborate with the user. The codebase alone does not encode the *why*.

---

## What OmniLab is

A Google Classroom–style platform purpose-built for **exact sciences teachers** (math, physics, chemistry, biology). The differentiator is depth in STEM workflows that general-purpose classroom tools handle poorly: equation-heavy authoring, function graphs, lab protocols, quantitative grading.

The user's central abstraction is the **lab** — structurally a PowerPoint/Google Slides–style deck, but each slide can contain **interactive widgets**: equations (KaTeX-rendered), function graphs (Desmos), quizzes, code blocks (Blockly, later), and eventually physics/chemistry simulations. Teachers author labs in a slide-editor UI by dragging widgets onto slides.

The second core feature is **live sessions** — Kahoot-style classroom plays where the teacher launches a lab, students join from their phones using a short on-screen code, and progress through the lab interactively with a real-time leaderboard. This is a v1 feature, not a phase-2 add-on.

The third pillar is the **Lab Marketplace** — teachers publish labs for other teachers to import (copy-on-import, no shared editing). Marketplace is **deferred to v1.1**, not v1.

## Audience

- **K–12 (primary), university (secondary).** Israeli context; user is in Israel.
- **Multilingual:** chrome stays English LTR. RTL (Hebrew) is allowed inside text/quiz content blocks. Clerk auth UI is now translated to Hebrew when the user's browser/preference indicates Hebrew.

## The wedge

Three things in fusion:
1. Polished slide-deck authoring
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
| Block-coding widget | Blockly | One widget type, NOT the editor framework |
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
- Blockly as the slide editor framework (Blockly is for block-based programming only; the slide editor is custom)
- D3 / Chart.js for "Desmos-like" graphing (wrong tool category)
- Neon Auth (we use Clerk; redundant)

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

**`apps/realtime/` (M0.6 scaffold — not yet deployed):**
- `src/index.ts` — Express HTTP + Socket.io server, `/session` namespace stub
- `Dockerfile` — standalone multi-stage build (build context = `apps/realtime/`)
- `fly.toml` — Fly.io config (`omnilab-realtime`, region `ams`, shared-cpu-1x 256 MB)
- `.env.example` — `PORT`, `REDIS_URL`, `CORS_ORIGIN`

**Future packages (planned, not yet created):**
- `packages/lab-content/` — Zod schemas for Layer B JSON tree (whenever the editor needs it)
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
- **Logo** — added brand logo PNGs + reusable `<Logo>` component using static imports (`b5adb8b`)
- **M0.4a** — `@clerk/nextjs` installed; `<ClerkProvider>` wrapping root layout (`0745b6e`)
- **M0.4b** — sign-in/up pages, middleware route protection, header with `<UserButton />` and conditional sign-in/sign-up links (`f98b475`)
- **Localization (in same session as M0.4b)** — `@clerk/localizations`, browser-detect via Accept-Language, `omnilab-locale` cookie override, `/settings` page with toggle, server action with hard reload
- **M0.4c** — Clerk → Postgres user sync via webhook at `/api/webhooks/clerk`; `svix` signature verification; upserts `User` row on `user.created` / `user.updated`; `packages/db/index.ts` singleton PrismaClient; `CLERK_WEBHOOK_SECRET` in env; verified end-to-end with ngrok + Prisma Studio
- **M0.5** — Vercel deployment pipeline working. Build command override: `pnpm --filter @omnilab/db generate && next build`. Fixed pnpm 10 build-script blocking for Prisma via `pnpm.onlyBuiltDependencies` in root `package.json`. Live URL: `https://omni-lab-project-web.vercel.app` (build green; auth blocked — see deferred items below).
- **M0.6** — Socket.io realtime server deployed. `apps/realtime/` — Express + Socket.io + ioredis + `@socket.io/redis-adapter`. `/session` namespace stub. Deployed to Fly.io (`omnilab-realtime`, region `fra`). Upstash Redis (Frankfurt) wired via `REDIS_URL` secret. `CORS_ORIGIN` set to Vercel URL. `/health` returns `{"status":"ok"}`. Live at `https://omnilab-realtime.fly.dev`.

### Open follow-ups

- **Translate OmniLab's own UI strings** (not just Clerk). Right tool: `next-intl`. Likely a dedicated milestone in M4.
- **Sync user preference to `User.preferredLang`** — naturally folds into M0.4c webhook work (already done structurally; just needs the field wired in settings UI).
- **`packages/lab-content`** (Zod schemas for Layer B JSON tree) — defer until the editor needs it.
- **Clerk production instance + custom domain** — deferred from M0.5. Clerk rejects `*.vercel.app` domains for production instances; a real domain (e.g. `omnilab.app`) is required. When purchased: set up Clerk Production environment, swap Vercel env vars to `pk_live_*` / `sk_live_*`, register a new production webhook in Clerk pointing to the live URL, add its `CLERK_WEBHOOK_SECRET` to Vercel env vars.

### Next

- **M1** — class/lab CRUD. Start here next session.

After M0 closes, the heart of the product begins:

- **M1** — class/lab CRUD (mostly already designed; light implementation)
- **M2** — **the lab editor** (5–6 weeks full-time → 8–12 weeks calendar at sustained pace; the long pole of v1)
- **M3** — live session lobby + Kahoot flow
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

*Last updated: M0.6 complete — realtime server live at `https://omnilab-realtime.fly.dev`. M0 fully done. Next: M1 (class/lab CRUD).*
