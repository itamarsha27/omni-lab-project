# OmniLab

A Google Classroom–style platform purpose-built for exact sciences teachers (math, physics, chemistry, biology). Teachers author interactive **labs** — slide-deck-style documents with embedded equations, function graphs, quizzes, and (later) simulations — and run them live in Kahoot-style classroom sessions where students join from their phones.

## Status

🚧 **Pre-alpha.** v1 is under active construction. See [docs/roadmap.md](docs/roadmap.md) once that exists.

## Stack

| Layer | Tech | Why |
|---|---|---|
| Web app | **Next.js 14** (App Router) + TypeScript | One framework for both the marketing site and the app |
| Styling | **Tailwind CSS** + **shadcn/ui** | Fast, accessible, RTL-friendly |
| Editor canvas | **dnd-kit** + **react-moveable** + custom React | The slide editor is our moat — we own this code |
| Math input | **MathLive** | WYSIWYG equation entry, virtual keyboard for phones |
| Math rendering | **KaTeX** | Fast, beautiful, paired with MathLive |
| Function graphs | **Desmos API** (embed) | Real Desmos, free for education |
| Block-coding widget | **Blockly** (later) | One widget type, not the editor framework |
| Database | **PostgreSQL** via **Prisma** | Type-safe queries; lab content stored as JSONB |
| File storage | **AWS S3** + **CloudFront** | Direct uploads via presigned URLs |
| Real-time sessions | **Socket.io** + **Redis** adapter | Kahoot-style live sessions, server-authoritative timing |
| Equation grading | **mathjs** | Algebraic equivalence checking for student answers |
| Auth | **Clerk** | Email + Google sign-in; teacher and student roles |
| Hosting | **Vercel** (web) + **Fly.io** (realtime server) + **Neon** (Postgres) + **Upstash** (Redis) | All have generous free tiers |

## Repo layout

This is a **monorepo** managed with [pnpm workspaces](https://pnpm.io/workspaces) and [Turborepo](https://turbo.build/). The layout will be:

```
omnilab/
├── apps/
│   ├── web/                  # Next.js app (the main product)
│   └── realtime/             # Socket.io server for live sessions
├── packages/
│   ├── db/                   # Prisma schema + client
│   ├── lab-content/          # Zod schemas for the lab JSON tree (Layer B)
│   └── ui/                   # Shared React components
├── README.md                 # this file
├── package.json              # workspace root
├── pnpm-workspace.yaml
└── turbo.json
```

These folders don't all exist yet — they appear over the course of M0.

## Prerequisites — install these on your machine

Before we can start writing code, you need four things installed locally:

### 1. Node.js (version 20 or newer)

Node is the JavaScript runtime everything runs on.

- Download from [nodejs.org](https://nodejs.org) — pick the **LTS** (Long Term Support) version, which is currently 20.x.
- Run the installer. Default options are fine.
- Verify in a terminal:
  ```sh
  node --version
  ```
  You should see something like `v20.11.0` or higher.

### 2. pnpm (package manager)

`pnpm` is a faster, more disk-efficient alternative to npm. We'll use it because it handles monorepos natively.

- Easiest install: in a terminal, run:
  ```sh
  npm install -g pnpm
  ```
- Verify:
  ```sh
  pnpm --version
  ```
  Should output something like `9.x.x`.

### 3. Git

Version control. You probably already have it; check with:

```sh
git --version
```

If not installed, get it from [git-scm.com](https://git-scm.com).

### 4. VS Code (recommended editor)

- Download from [code.visualstudio.com](https://code.visualstudio.com).
- After installing, open VS Code and install these extensions (Ctrl+Shift+X):
  - **ESLint** by Microsoft
  - **Prettier - Code formatter** by Prettier
  - **Tailwind CSS IntelliSense** by Tailwind Labs
  - **Prisma** by Prisma
  - **TypeScript Vue Plugin** — skip this one, not needed

You can use any editor, but the rest of the docs assume VS Code.

## Accounts you'll need (don't sign up yet — we'll do these one at a time)

These will come up in later M0 sub-steps. **Don't sign up in advance** — I'll walk you through each one when it's time, so you know exactly what to copy where.

- **Neon** ([neon.tech](https://neon.tech)) — managed Postgres database. Free tier is generous.
- **Clerk** ([clerk.com](https://clerk.com)) — authentication. Free up to 10K monthly active users.
- **Vercel** ([vercel.com](https://vercel.com)) — hosting for the web app. Free tier covers us for a long time.
- **Fly.io** ([fly.io](https://fly.io)) — hosting for the realtime server. Generous free tier.
- **Upstash** ([upstash.com](https://upstash.com)) — managed Redis for the realtime server. Free tier is fine.
- **AWS** — for S3 file storage. Free tier covers the first year. We'll set this up only when we add image upload.

## How we work

- I (the AI engineer) write the code.
- You install things, run commands, click buttons in the browser, and review what I write.
- After every M0 sub-step, you'll run a verification command and tell me the result. Then we move on.
- If something breaks, paste the full error output to me — don't try to debug alone, that's my job.

## Next step

Once you've installed Node 20+, pnpm, and Git, run this in a terminal **inside the project directory** (`C:\Users\itama\Desktop\OmniLab Project`):

```sh
node --version && pnpm --version && git --version
```

Paste the three version numbers back to me. If any of the three commands fail, paste the error.

Then we start M0.2: scaffolding the Next.js app.
