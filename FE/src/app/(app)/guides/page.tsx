'use client'

import { BookOpen, ExternalLink, PlayCircle, Lightbulb } from 'lucide-react'


const GUIDES = [
  {
    title: 'Getting Started',
    desc: 'Set up your first series and generate your first video in under 5 minutes.',
    icon: PlayCircle,
    color: 'text-green-600 bg-green-500/10',
    tag: 'Beginner',
  },
  {
    title: 'Choosing the Right Niche',
    desc: 'Learn which niches get the most views and how to pick yours.',
    icon: Lightbulb,
    color: 'text-yellow-600 bg-yellow-500/10',
    tag: 'Strategy',
  },
  {
    title: 'Optimizing for YouTube Algorithm',
    desc: 'Title, description, and hashtag tips to maximize your Shorts reach.',
    icon: BookOpen,
    color: 'text-blue-600 bg-blue-500/10',
    tag: 'Growth',
  },
  {
    title: 'Understanding Credits',
    desc: 'How credits work, what each video costs, and how to maximize your plan.',
    icon: BookOpen,
    color: 'text-purple-600 bg-purple-500/10',
    tag: 'Billing',
  },
]

export default function GuidesPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold font-display">Guides</h1>
      <p className="mt-1 text-sm text-base-content/50">Tutorials and tips to get the most out of Facelessly</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {GUIDES.map((guide) => (
          <div
            key={guide.title}
            className="group rounded-2xl border border-base-300 bg-base-100 p-6 transition-all hover:border-primary/30 hover:shadow-glow cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${guide.color}`}>
                <guide.icon className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-base-200 px-2 py-0.5 text-[10px] font-medium text-base-content/50">
                {guide.tag}
              </span>
            </div>
            <h3 className="mt-4 font-semibold font-display">{guide.title}</h3>
            <p className="mt-1 text-sm text-base-content/50">{guide.desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition">
              Read guide <ExternalLink className="h-3 w-3" />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
