'use client'

import { useState, useEffect } from 'react'
import { Zap, CheckCircle, Loader2, Receipt, TrendingUp, Star, Rocket } from 'lucide-react'
import { toast } from 'sonner'

import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'

interface Plan {
  name: string
  price: number
  credits: number
  max_series: number
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  created_at: string
}

const PLAN_ICONS = {
  free: <Zap className="h-5 w-5" />,
  basic: <Star className="h-5 w-5" />,
  pro: <Rocket className="h-5 w-5" />,
  scale: <TrendingUp className="h-5 w-5" />,
}

const PLAN_COLORS: Record<string, string> = {
  free: 'border-base-300',
  basic: 'border-blue-500',
  pro: 'border-primary',
  scale: 'border-purple-500',
}

const PLAN_GRADIENT: Record<string, string> = {
  free: 'from-base-200 to-base-200',
  basic: 'from-blue-500/10 to-base-100',
  pro: 'from-primary/10 to-base-100',
  scale: 'from-purple-500/10 to-base-100',
}

export default function BillingPage() {
  const { currentUser, credits, tier } = useStore()
  const [plans, setPlans] = useState<Record<string, Plan>>({})
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)
  const [checkingOut, setCheckingOut] = useState<string | null>(null)

  const userId = currentUser?.id || 'anonymous'

  useEffect(() => {
    // Load plans
    fetch(APIRoutes.GetPlans())
      .then(r => r.json())
      .then(setPlans)
      .catch(() => {})
      .finally(() => setIsLoadingPlans(false))

    // Load transactions
    if (currentUser?.id) {
      fetch(APIRoutes.GetTransactions(currentUser.id))
        .then(r => r.json())
        .then(setTransactions)
        .catch(() => {})
    }
  }, [currentUser?.id])

  const handleCheckout = async (planKey: string) => {
    if (userId === 'anonymous') {
      toast.error('Please connect your YouTube account first')
      return
    }
    setCheckingOut(planKey)
    try {
      const resp = await fetch(APIRoutes.CreateCheckout(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          tier: planKey,
          base_url: window.location.origin,
        }),
      })
      const data = await resp.json()
      if (data.mock) {
        toast.info('Stripe not configured — this is a simulated redirect.')
        return
      }
      if (data.session_url) {
        window.location.href = data.session_url
      } else {
        toast.error(data.error || 'Checkout failed')
      }
    } catch {
      toast.error('Failed to start checkout')
    } finally {
      setCheckingOut(null)
    }
  }

  const currentPlan = plans[tier] || { name: tier, price: 0, credits: 0, max_series: 0 }

  return (
    <div className="mx-auto max-w-4xl px-8 py-8 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-display">Billing & Plans</h1>
        <p className="mt-2 text-base-content/50">
          Upgrade to get more credits and features
        </p>
      </div>

      {/* Current usage */}
      <div className="rounded-2xl border border-base-300 p-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-base-content/50">Current plan</p>
          <h2 className="mt-1 text-2xl font-bold font-display capitalize">{tier}</h2>
        </div>
        <div className="text-right">
          <p className="text-sm text-base-content/50">Credits remaining</p>
          <p className="text-3xl font-bold text-primary">{credits}</p>
        </div>
        <div className="w-48">
          <div className="mb-1 flex justify-between text-xs text-base-content/50">
            <span>Used</span>
            <span>{currentPlan.credits > 0 ? Math.max(0, currentPlan.credits - credits) : 0} / {currentPlan.credits}</span>
          </div>
          <div className="h-2 rounded-full bg-base-300 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: currentPlan.credits > 0
                  ? `${Math.min(100, ((currentPlan.credits - credits) / currentPlan.credits) * 100)}%`
                  : '0%'
              }}
            />
          </div>
        </div>
      </div>

      {/* Plans */}
      {isLoadingPlans ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(plans).map(([key, plan]) => {
            const isCurrent = key === tier
            const isPopular = key === 'pro'
            return (
              <div
                key={key}
                className={`relative flex flex-col rounded-2xl border-2 bg-gradient-to-b ${PLAN_GRADIENT[key]} ${PLAN_COLORS[key]} p-5 ${isPopular ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-brand px-3 py-0.5 text-[11px] font-bold text-white">
                    Most Popular
                  </span>
                )}
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isCurrent ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'}`}>
                  {PLAN_ICONS[key as keyof typeof PLAN_ICONS] ?? <Zap className="h-5 w-5" />}
                </div>
                <h3 className="mt-4 font-bold font-display capitalize">{plan.name}</h3>
                <p className="mt-1 text-3xl font-black">
                  {plan.price === 0 ? 'Free' : `$${(plan.price / 100).toFixed(0)}`}
                  {plan.price > 0 && <span className="text-sm font-normal text-base-content/50">/mo</span>}
                </p>
                <ul className="mt-4 space-y-2 flex-1 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    {plan.credits} credits/mo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    {plan.max_series === -1 ? 'Unlimited' : plan.max_series} series
                  </li>
                  {key !== 'free' && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      No watermark
                    </li>
                  )}
                  {(key === 'pro' || key === 'scale') && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      Priority queue
                    </li>
                  )}
                  {key === 'scale' && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      API access
                    </li>
                  )}
                </ul>
                <button
                  onClick={() => handleCheckout(key)}
                  disabled={isCurrent || checkingOut !== null}
                  className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
                    isCurrent
                      ? 'bg-base-300 text-base-content/40 cursor-default'
                      : 'gradient-brand text-white hover:shadow-glow'
                  }`}
                >
                  {checkingOut === key && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCurrent ? 'Current Plan' : key === 'free' ? 'Downgrade' : 'Upgrade'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Credit pack */}
      <div className="rounded-2xl border border-base-300 p-6 flex items-center justify-between">
        <div>
          <h3 className="font-bold font-display">Need more credits?</h3>
          <p className="mt-1 text-sm text-base-content/50">Buy a one-time credit pack — 200 credits for $10</p>
        </div>
        <button
          onClick={() => handleCheckout('credits')}
          disabled={checkingOut !== null}
          className="flex items-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-bold text-white hover:shadow-glow transition disabled:opacity-50"
        >
          {checkingOut === 'credits' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Buy 200 Credits — $10
        </button>
      </div>

      {/* Transaction history */}
      {transactions.length > 0 && (
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold font-display">
            <Receipt className="h-5 w-5 text-primary" /> Transaction History
          </h2>
          <div className="overflow-hidden rounded-2xl border border-base-300">
            <table className="w-full text-sm">
              <thead className="bg-base-200 text-left text-xs uppercase tracking-wider text-base-content/50">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-base-200/40 transition">
                    <td className="px-4 py-3 text-base-content/50">{new Date(tx.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{tx.description}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${tx.type === 'subscription' ? 'bg-primary/10 text-primary' : 'bg-green-500/10 text-green-600'}`}>
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">${(tx.amount / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
