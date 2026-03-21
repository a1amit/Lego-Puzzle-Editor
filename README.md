# Virtual Lego Puzzle Editor

A community-driven puzzle platform where users create, solve, and share virtual Lego brick puzzles. Features both 2D and 3D renderers, a built-in puzzle creator with live preview, gamification with XP and leaderboards, and an AI puzzle assistant.

![React](https://img.shields.io/badge/React-19.2-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![Three.js](https://img.shields.io/badge/Three.js-0.183-green) ![Vite](https://img.shields.io/badge/Vite-8-purple) ![Tailwind](https://img.shields.io/badge/Tailwind-4.2-cyan)

## Features

### Puzzle Solving
- **3D Renderer** — Interactive Three.js scene with orbit controls, contact shadows, and cinematic post-processing
- **2D Renderer** — Lightweight SVG-based grid view for simpler puzzles
- **45+ Brick Shapes** — Tetrominoes, pentominoes, dominoes, and custom polyominoes
- **Interactive Controls** — Click-to-select, click-to-place, right-click or R to rotate, undo/redo
- **Real-time Validation** — Visual feedback with the extensible ValidationRegistry (strategy pattern)

### Puzzle Types
- **Coverage** — Fill the board completely with pieces
- **Slider / Klotski** — Slide pieces to reach a goal position
- **Binary Safe** — Create binary ASCII patterns with bricks
- **Nonogram / Picross** — Fill cells according to row/column number hints

### Community Platform
- **User Profiles** — Sign up via Clerk (email, Google, passkeys)
- **Puzzle Gallery** — Browse, search, and filter community puzzles by category, difficulty, and popularity
- **Puzzle Creator** — Monaco editor with JSON schema intellisense, Zod validation, and live preview
- **Publish & Share** — Publish puzzles for the community, track plays and completions
- **Likes** — Like puzzles from other creators

### Gamification
- **XP System** — Earn XP for solving puzzles (easy: 50, medium: 100, hard: 200, expert: 400)
- **8 Level Tiers** — Brick Beginner through Puzzle Grandmaster
- **Day Streaks** — Track consecutive days of puzzle solving
- **Leaderboard** — All-time, monthly, and weekly rankings
- **Creator Milestones** — Bonus XP when your puzzles reach 10 and 50 unique solvers

### AI Assistant
- **Puzzle Helper** — Chat with an AI assistant for hints and puzzle-solving guidance
- **Server-side Proxy** — API key stays secure, with automatic model fallback

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# Required for auth
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Required for database
MONGODB_URI=mongodb+srv://...

# Optional — rate limiting
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Optional — AI chat assistant
OPENROUTER_API_KEY=sk-or-v1-...

# Optional — error tracking
VITE_SENTRY_DSN=https://...@sentry.io/...
```

## Architecture

```
src/
├── app/                    # Routing, layout, page components
│   ├── router.tsx          # React Router with lazy-loaded routes
│   ├── RootLayout.tsx      # Shell with header, modals, error boundary
│   ├── PuzzleShell.tsx     # Puzzle solving/editing container
│   └── routes/             # GalleryPage, ProfilePage, LeaderboardPage, etc.
├── auth/                   # Clerk authentication provider (safe fallbacks)
├── components/
│   ├── 3d/                 # Three.js scene, board, bricks (PuzzleScene)
│   ├── renderer/           # 2D/3D renderer strategy (PuzzleRenderer)
│   ├── gallery/            # Puzzle cards, grid, featured section
│   ├── layout/             # Header, resizable panels
│   └── ui/                 # Inventory, validation, chat, level-up, onboarding
├── engine/                 # View-agnostic puzzle engine (usePuzzleEngine)
├── hooks/                  # TanStack Query hooks (queries.ts)
├── lib/                    # Sentry (lazy-loaded)
├── services/               # API client, gamification service, sound manager
├── store/                  # Zustand stores (puzzle, user, gallery, gamification)
├── types/                  # TypeScript interfaces & Zod schemas
└── validation/             # ValidationRegistry with built-in rules

api/                        # Vercel serverless backend
├── [[...route]].ts         # Hono API router (all endpoints)
└── _lib/
    ├── models/             # Mongoose models (User, Puzzle, Completion, Like)
    ├── auth.ts             # Clerk token verification
    ├── db.ts               # MongoDB connection pooling
    ├── rateLimit.ts        # Upstash Redis rate limiting
    └── xp.ts               # XP/level calculations

scripts/                    # Migration scripts (fix-xp, fix-streaks, etc.)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript 5.9, Vite 8 |
| **3D Engine** | Three.js, @react-three/fiber, @react-three/drei |
| **State** | Zustand (UI state), TanStack Query (server state) |
| **Styling** | Tailwind CSS 4.2, shadcn/ui, Framer Motion |
| **Code Editor** | Monaco Editor (local workers, no CDN) |
| **Validation** | Zod 4 |
| **Auth** | Clerk (OAuth, passkeys) |
| **Backend** | Hono (Vercel serverless, Node.js runtime) |
| **Database** | MongoDB Atlas via Mongoose 9 |
| **Rate Limiting** | Upstash Redis |
| **Testing** | Vitest, Testing Library |
| **Monitoring** | Sentry (lazy-loaded), Vercel Analytics |
| **Deployment** | Vercel |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/puzzles` | List/search/filter published puzzles |
| `GET` | `/api/puzzles/:slug` | Get puzzle by slug |
| `POST` | `/api/puzzles/create` | Create a new puzzle |
| `PATCH` | `/api/puzzles/:slug` | Update puzzle definition |
| `PATCH` | `/api/puzzles/:slug/publish` | Publish a draft puzzle |
| `POST` | `/api/puzzles/:slug/complete` | Report puzzle completion |
| `POST` | `/api/puzzles/:slug/like` | Toggle like on a puzzle |
| `GET` | `/api/users/me` | Current user profile (upsert) |
| `GET` | `/api/users/:username` | Public user profile |
| `GET` | `/api/leaderboard` | Leaderboard (all/weekly/monthly) |
| `POST` | `/api/chat` | AI assistant proxy |

## Puzzle Definition

Puzzles are fully data-driven via JSON with Zod validation:

```json
{
  "title": "T-Time",
  "description": "Fill the board with T-shaped bricks",
  "board": {
    "dimensions": { "width": 8, "height": 4, "depth": 1 },
    "initial_state": [],
    "blocked_cells": []
  },
  "inventory": [
    { "shape": "T-tetromino", "color": "#D01012", "quantity": 1, "id": "t1" }
  ],
  "validation_rules": [
    { "type": "COVERAGE", "rule": "ALL_BOARD_SQUARES_MUST_BE_COVERED" },
    { "type": "PLACEMENT", "rule": "NO_BRICK_OVERLAP" },
    { "type": "PLACEMENT", "rule": "NO_BRICKS_OUT_OF_BOUNDS" }
  ]
}
```

## Deployment

Deployed on Vercel with:
- **Frontend** — Static build served from edge CDN
- **API** — Serverless functions (Node.js runtime, 256MB, 10s timeout)
- **Database** — MongoDB Atlas (connection pooled, max 2 for serverless)
- **Rate Limiting** — Upstash Redis (60 req/min API, 30 req/min chat)

## License

MIT
