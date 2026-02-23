'use client'

import { CheckCircle, PartyPopper, Download } from 'lucide-react'
import Link from 'next/link'

export default function BillingSuccessPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500/10 mx-auto mb-6">
          <PartyPopper className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold font-display">Payment Successful!</h1>
        <p className="mt-3 text-base-content/60">
          Your plan has been upgraded and credits have been added to your account.
          It may take a few seconds to reflect.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/billing"
            className="flex items-center justify-center gap-2 rounded-xl border border-base-300 px-5 py-3 text-sm font-medium hover:bg-base-200 transition"
          >
            <CheckCircle className="h-4 w-4 text-green-500" />
            View Plan Details
          </Link>
          <Link
            href="/series"
            className="flex items-center justify-center gap-2 rounded-xl gradient-brand px-5 py-3 text-sm font-bold text-white hover:shadow-glow transition"
          >
            <Download className="h-4 w-4" />
            Start Creating Videos
          </Link>
        </div>
      </div>
    </div>
  )
}
