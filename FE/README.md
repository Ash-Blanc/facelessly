# Facelessly — Frontend

The web dashboard for **Facelessly**, an AI-powered faceless video generation and auto-posting SaaS. Built with **Next.js 15**, **React 18**, **TypeScript**, **Tailwind CSS**, and **shadcn/ui**.

## Features

- 🎬 **Video Generation Wizard** — Multi-step flow to pick niche, style, and generate viral short-form videos
- � **Content Calendar** — Visual calendar showing scheduled and posted content
- � **Platform Connect** — OAuth integration for YouTube (TikTok & Instagram via upload-post.com)
- 📊 **Dashboard** — Overview of pipelines, credits, and recent activity
- 💬 **AI Chat** — Conversational interface powered by the Agno agent backend
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
- **npm** (or bun/pnpm)
- Backend API running on `http://localhost:8000` (see `../BE/README.md`)

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Port conflict?** If port 3000 is in use, kill the existing process:
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
│   ├── dashboard/        # Main dashboard
│   ├── generate/         # Video generation wizard
│   ├── calendar/         # Content calendar
│   ├── connect/          # Platform OAuth connections
│   └── chat/             # AI chat interface
├── components/           # Shared UI components (shadcn/ui)
├── lib/                  # Utilities, API client, helpers
└── stores/               # Zustand state management
```

## Environment Variables

Create a `.env.local` file if needed:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000   # Backend API URL
```

## License

MIT
