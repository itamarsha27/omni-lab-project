# OmniLab

A Google Classroom–style platform purpose-built for exact sciences teachers (math, physics, chemistry, biology). Teachers author interactive **labs** — slide-deck-style documents with embedded equations, function graphs, quizzes, and simulations — and run them live in Kahoot-style classroom sessions where students join from their phones.

## Status

Pre-alpha. Under active development — see build progress below.

## Stack

| Layer | Tech |
|---|---|
| Web app | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Editor canvas | Custom React + dnd-kit + react-moveable |
| Math input | MathLive |
| Math rendering | KaTeX |
| Function graphs | Desmos API |
| Block-coding widget | Blockly (planned) |
| Database | PostgreSQL via Prisma 6 — lab content as JSONB |
| Database hosting | Neon (serverless Postgres) |
| File storage | AWS S3 + CloudFront (planned) |
| Realtime | Socket.io + Redis adapter (planned) |
| Equation grading | mathjs |
| Auth | Clerk (`@clerk/nextjs`) |
| Hosting | Vercel |
| Monorepo | pnpm workspaces |

## Repo layout

```
omni-lab-project/
├── apps/
│   └── web/                    # Next.js app
│       └── src/
│           ├── app/            # App Router pages + API routes
│           ├── components/     # Shared React components
│           ├── lib/            # Server utilities (i18n, etc.)
│           └── middleware.ts   # Clerk session + route protection
├── packages/
│   └── db/                     # @omnilab/db — Prisma schema + client
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
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

### In progress

| Milestone | What's next |
|---|---|
| M0.6 | Socket.io realtime server scaffold on Fly.io + Upstash Redis |

### Planned

| Milestone | What's next |
|---|---|
| M1 | Class + lab CRUD |
| M2 | Lab editor — slides, drag-and-drop widgets, equation input |
| M3 | Live session lobby + Kahoot-style classroom flow |
| M4 | Landing page, onboarding, gradebook |
| M5 | Lab marketplace (or deferred to v1.1) |
