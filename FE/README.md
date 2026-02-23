# Facelessly — Frontend

The web dashboard for **Facelessly**, an AI-powered faceless video generation and auto-posting SaaS. Built with **Next.js 15**, **React 18**, **TypeScript**, **Tailwind CSS**, and **shadcn/ui**.

## Features

- 🎬 **Video Generation Wizard** — Multi-step flow: niche → style → connect → generate
- 📅 **Content Calendar** — Monthly grid with per-day status indicators (posted, queued, retrying, failed, generating)
- 🔗 **Platform Connect** — YouTube OAuth, TikTok & Instagram via upload-post.com
- 📊 **Dashboard** — Kanban project management board
- 💬 **AI Chat** — Conversational interface powered by the Agno agent backend
- 💳 **Credits** — Credit balance display with tier-based limits
- 🌙 **Dark Mode** — Theme support via `next-themes`

## Tech Stack

| Layer       | Technology                                    |
| ----------- | --------------------------------------------- |
| Framework   | Next.js 15 (App Router)                       |
| Language    | TypeScript                                    |
| Styling     | Tailwind CSS, tailwindcss-animate, DaisyUI    |
| Components  | shadcn/ui, Radix UI, Framer Motion            |
| State       | Zustand                                       |
| Icons       | Lucide React                                  |
| Markdown    | react-markdown, remark-gfm, rehype            |
| Drag & Drop | @dnd-kit                                      |

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm**
- Backend API running on `http://localhost:8000` (see `../BE/README.md`)

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Port conflict?** If port 3000 is already in use:
> ```bash
> lsof -ti:3000 | xargs kill -9
> ```

### Available Scripts

| Command            | Description                       |
| ------------------ | --------------------------------- |
| `npm run dev`      | Start development server          |
| `npm run build`    | Create production build           |
| `npm run start`    | Serve production build            |
| `npm run lint`     | Run ESLint                        |
| `npm run lint:fix` | Auto-fix lint issues              |
| `npm run typecheck`| Run TypeScript type checking      |

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Landing / Home
│   ├── dashboard/        # Kanban project board
│   ├── generate/         # Video generation wizard (4 steps)
│   ├── calendar/         # Content calendar with status chips
│   ├── connect/          # Platform OAuth connections
│   └── chat/             # AI chat interface
├── api/                  # API routes (routes.ts)
├── components/           # Shared UI components (shadcn/ui)
│   ├── ui/               # Base components (Button, Dialog, etc.)
│   └── chat/             # Chat-specific components
├── hooks/                # Custom hooks (streaming, chat actions)
├── lib/                  # Utilities, API client
├── store.ts              # Zustand global state
└── types/                # TypeScript types
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000   # Backend API URL
```

## User Flow

1. **Landing** (`/`) → "Get Started" CTA
2. **Generate Wizard** (`/generate`) → Niche → Style → Connect → Generate
3. **Calendar** (`/calendar`) → View scheduled/posted content by date
4. **Dashboard** (`/dashboard`) → Kanban project management
5. **Connections** (`/connect`) → Platform management & schedule status
6. **Chat** (`/chat`) → Direct AI agent interaction

## License

MIT
