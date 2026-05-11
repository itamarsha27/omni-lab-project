# OmniLab

A Google Classroom–style platform purpose-built for exact sciences teachers (math, physics, chemistry, biology). Teachers author interactive **labs** — slide-deck-style documents with embedded equations, function graphs, quizzes, and simulations — and run them live in Kahoot-style classroom sessions where students join from their phones.

## Status

Pre-alpha. Under active development — see build progress below.

## Stack

| Layer | Tech |
|---|---|
| Web app | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Editor canvas | Custom React + dnd-kit |
| Math input | MathLive |
| Math rendering | KaTeX |
| Function graphs | Desmos API |
| Code widget | Python via Pyodide (in-browser) |
| Database | PostgreSQL via Prisma 6 — lab content as JSONB |
| Database hosting | Neon (serverless Postgres, Frankfurt) |
| File storage | AWS S3 + CloudFront (planned) |
| Realtime | Socket.io + Redis adapter (Fly.io + Upstash) |
| Equation grading | mathjs |
| Auth | Clerk (`@clerk/nextjs`) |
| Web hosting | Vercel |
| Monorepo | pnpm workspaces |

## Repo layout

```
omni-lab-project/
├── apps/
│   ├── web/                    # Next.js app
│   │   └── src/
│   │       ├── app/            # App Router pages + API routes
│   │       ├── components/     # Shared React components
│   │       ├── lib/            # Server utilities (i18n, etc.)
│   │       └── middleware.ts   # Clerk session + route protection
│   └── realtime/               # Socket.io server (deployed on Fly.io)
├── packages/
│   ├── db/                     # @omnilab/db — Prisma schema + client
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── migrations/
│   └── lab-content/            # @omnilab/lab-content — content type model + factories
└── docs/
    └── PROJECT_CONTEXT.md      # Architecture decisions + collaboration notes
```

## Build progress

### Done

| Milestone | What shipped |
|---|---|
| M0.1 | Project skeleton, monorepo, GitHub |
| M0.2 | Next.js 15 + Tailwind v4 scaffold |
| M0.3 | Prisma schema (8 models) + Neon Postgres, migrations |
| M0.4a | Clerk provider wired into root layout |
| M0.4b | Sign-in/up pages, route protection, header auth controls |
| M0.4b+ | Hebrew localization for Clerk UI, `/settings` language toggle |
| M0.4c | Clerk → Postgres user sync via webhook (`/api/webhooks/clerk`) |
| M0.5 | Vercel deployment pipeline — build + Prisma generate on CI |
| M0.6 | Socket.io realtime server on Fly.io + Upstash Redis |
| M1 | My Labs page, lab CRUD, Google Slides-style editor top bar |
| M2.1 | Canvas foundation — filmstrip, 16:9 scaled canvas, slide CRUD, drag-to-reorder, undo/redo, autosave |
| M2.2 | Text + Equation blocks — TipTap rich text, KaTeX+MathLive equation editor, drag-from-toolbar, custom resize handles |
| M2.2 polish | Selection-based inline formatting, font-family picker (11 fonts), font-size controller, auto-grow textbox, drag-while-editing, horizontal snap, caret fixes |
| M2.2b | Inline equations in text boxes (custom TipTap node), shared equation popup, font-size toolbar on equation select |

### In progress

| Milestone | What's being built |
|---|---|
| M2.3 | Quiz blocks — all 6 question types, sidebar-based properties editing, max one quiz per slide |

### Planned

| Milestone | Description |
|---|---|
| M2.4 | Image + video blocks |
| M2.5 | Freehand drawing + shape library |
| M2.6 | Desmos graph widget (teacher-configured with sliders) |
| M2.7 | Code block — Python via Pyodide |
| M2.8 | Physics simulation widget |
| M2.9 | Preview mode, PDF export, presentation mode |
| M3 | Live session lobby + Kahoot-style classroom flow + quiz grading |
| M4 | Landing page, onboarding, gradebook |
| M5 | Lab marketplace (or deferred to v1.1) |
