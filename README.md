# Alpe Games Jam HQ

Central command for [Alpe Games](https://alpegames.cl) game jam projects.

Jam HQ is a lightweight admin app for managing 10–15 day game jams. Create projects, track tasks on a kanban board, and manage your game development pipeline — all from a single dashboard.

## Live

**[jam.alpegames.cl](https://jam.alpegames.cl)**

## Features

- **Dashboard** — Overview of all jam projects with status (upcoming / active / completed)
- **Kanban Board** — Drag-and-drop task management across BACKLOG → TODO → IN PROGRESS → DONE
- **Project Management** — Create, edit, and delete jam projects with engine, dates, and descriptions
- **Task Assignment** — Assign tasks to team members (matias / friend)
- **REST API** — Full API for automation (Matobot integration)
- **Dark Retro Theme** — Gaming-inspired UI with pixel-style aesthetics

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **SQLite** via better-sqlite3 (no external DB)
- **Tailwind CSS** (dark theme)
- **@hello-pangea/dnd** (drag-and-drop kanban)
- **Nginx** reverse proxy with Let's Encrypt SSL

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/[id]` | Get project details |
| PATCH | `/api/projects/[id]` | Update a project |
| DELETE | `/api/projects/[id]` | Delete a project |
| GET | `/api/projects/[id]/tasks` | List tasks for a project |
| POST | `/api/projects/[id]/tasks` | Create a task |
| POST | `/api/projects/[id]/tasks/bulk` | Bulk create tasks |
| PATCH | `/api/tasks/[id]` | Update a task |
| DELETE | `/api/tasks/[id]` | Delete a task |
| POST | `/api/tasks/[id]/move` | Move task between columns |
| GET | `/api/automation/events` | List automation events |
| POST | `/api/automation/events/[id]/retry` | Retry a failed automation event (Bearer token) |

## Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Deployment

The app runs on a DigitalOcean VPS as a systemd service.

```bash
# Deploy to VPS
ssh root@161.35.55.246
cd /opt/alpegames/jam-hq
git pull origin master
npm ci
npm run build
systemctl restart jam-hq
```

### Standalone static assets (critical)

Jam HQ uses `output: 'standalone'`. In this mode, Next.js runtime files are emitted under `.next/standalone`, but static frontend assets still live under `.next/static` unless explicitly copied.

If `.next/static` is missing from the runtime tree, pages can load as plain white/black unstyled HTML because CSS/JS files under `/_next/static/...` return 404.

This repository now guarantees the copy in two places:

- `npm run build` runs `postbuild` → `scripts/prepare-standalone.sh`
- `scripts/deploy.sh` also runs `scripts/prepare-standalone.sh`

Manual check:

```bash
test -d .next/standalone/.next/static && echo "static assets present"
find .next/standalone/.next/static -type f | head
```

Health endpoint `/api/health` reports whether `.next/static` and `public/` are present at runtime.

### Automation worker

Jam HQ now includes a SQLite-backed automation queue and a dedicated worker service.

- `POST /api/projects` creates the project, stores `jam_number` / `jam_slug`, enqueues `project.created`, and still returns `201` immediately even if enqueueing fails.
- `GET /api/automation/events` exposes recent worker history.
- `POST /api/automation/events/[id]/retry` resets a failed event to `pending` and requires `Authorization: Bearer $JAMHQ_ADMIN_TOKEN`.
- `scripts/create-jam-repo.sh` accepts `--skip-hq-register` and tags script-originated API calls with `X-Jamhq-Automation-Source: script` to avoid loops.
- `scripts/jamhq-automation-worker.service` runs `node scripts/worker.mjs` under systemd.

Deploys install and enable the worker automatically via `scripts/deploy.sh`.

## Project Structure

```
alpegames-jam-hq/
├── app/
│   ├── api/              # REST API routes
│   │   ├── projects/     # Project CRUD
│   │   └── tasks/        # Task CRUD + move
│   ├── project/
│   │   ├── [id]/         # Project detail (kanban)
│   │   └── new/          # Create project form
│   ├── globals.css       # Tailwind + retro theme
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Dashboard
├── components/
│   ├── KanbanBoard.tsx   # Drag-and-drop kanban
│   ├── ProjectCard.tsx   # Project cards
│   ├── StatusBadge.tsx   # Status indicators
│   └── TaskForm.tsx      # Task creation form
├── lib/
│   ├── db.ts             # SQLite database layer
│   ├── api.ts            # API client helpers
│   ├── types.ts          # TypeScript types
│   ├── constants.ts      # App constants
│   └── utils.ts          # Utility functions
├── data/
│   └── jam-hq.db         # SQLite database (auto-created)
└── scripts/
    ├── vps-setup.sh      # VPS initial setup
    └── deploy.sh         # Deployment script
```

## Part of the Alpe Games Ecosystem

- **[alpegames-jam-template](https://github.com/matiaspereiraobando/alpegames-jam-template)** — Template for new jam projects
- **[alpegames-jam-000-hello-world](https://github.com/matiaspereiraobando/alpegames-jam-000-hello-world)** — Jam #0 test game (Love2D)

## License

Internal project for Alpe Games.
# Jam HQ
