"""Stripe billing and subscription management."""

import os
import uuid
from datetime import datetime
from typing import Any

from faceless.database import get_db

# Plans configuration
PLANS = {
    "free": {"name": "Free", "price": 0, "credits": 30, "max_series": 1},
    "basic": {"name": "Basic", "price": 1900, "credits": 300, "max_series": 3},  # cents
    "pro": {"name": "Pro", "price": 4900, "credits": 1200, "max_series": -1},  # -1 = unlimited
    "scale": {"name": "Scale", "price": 9900, "credits": 3000, "max_series": -1},
}

CREDIT_PACK_PRICE = 1000  # $10 in cents
CREDIT_PACK_AMOUNT = 200


async def get_or_create_stripe_customer(user_id: str, email: str | None = None) -> str | None:
    """Get or create a Stripe customer for a user."""
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe_key:
        return None
    try:
        import stripe
        stripe.api_key = stripe_key
        async with get_db() as db:
            async with db.execute(
                "SELECT stripe_customer_id FROM users WHERE id = ?", (user_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if row and row["stripe_customer_id"]:
                    return row["stripe_customer_id"]
        customer = stripe.Customer.create(
            metadata={"user_id": user_id},
            email=email or "",
        )
        async with get_db() as db:
            await db.execute(
                "UPDATE users SET stripe_customer_id = ? WHERE id = ?",
                (customer.id, user_id),
            )
            await db.commit()
        return customer.id
    except Exception:
        return None


async def create_checkout_session(user_id: str, tier: str, success_url: str, cancel_url: str) -> dict[str, Any]:
    """Create a Stripe Checkout session for a subscription or credit pack."""
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe_key:
        return {"error": "Stripe not configured. Set STRIPE_SECRET_KEY in .env", "mock": True,
                "session_url": success_url + "?session_id=mock_session"}

    price_ids = {
        "basic": os.getenv("STRIPE_BASIC_PRICE_ID"),
        "pro": os.getenv("STRIPE_PRO_PRICE_ID"),
        "scale": os.getenv("STRIPE_SCALE_PRICE_ID"),
        "credits": os.getenv("STRIPE_CREDITS_PRICE_ID"),
    }

    if tier not in price_ids:
        return {"error": f"Unknown tier: {tier}"}

    price_id = price_ids[tier]
    if not price_id:
        return {
            "error": f"Price ID not set for {tier}. Set STRIPE_{tier.upper()}_PRICE_ID in .env",
            "mock": True,
            "session_url": success_url + f"?session_id=mock_{tier}",
        }

    try:
        import stripe
        stripe.api_key = stripe_key

        customer_id = await get_or_create_stripe_customer(user_id)
        mode = "payment" if tier == "credits" else "subscription"

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode=mode,
            success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=cancel_url,
            metadata={"user_id": user_id, "tier": tier},
        )
        return {"session_url": session.url, "session_id": session.id}
    except Exception as e:
        return {"error": str(e)}


async def handle_stripe_webhook(payload: bytes, sig_header: str) -> dict[str, Any]:
    """Handle Stripe webhook events."""
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    if not stripe_key:
        return {"error": "Stripe not configured"}

    try:
        import stripe
        stripe.api_key = stripe_key

        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret or "")
        event_type = event["type"]
        data = event["data"]["object"]

        if event_type == "checkout.session.completed":
            user_id = data.get("metadata", {}).get("user_id")
            tier = data.get("metadata", {}).get("tier")
            if user_id and tier:
                await _handle_successful_payment(user_id, tier)

        elif event_type == "customer.subscription.deleted":
            # Downgrade to free
            customer_id = data.get("customer")
            await _handle_subscription_cancelled(customer_id)

        return {"received": True, "event": event_type}
    except Exception as e:
        return {"error": str(e)}


async def _handle_successful_payment(user_id: str, tier: str) -> None:
    """Apply credits/tier upgrade after successful payment."""
    plan = PLANS.get(tier)
    if not plan:
        return

    async with get_db() as db:
        if tier == "credits":
            await db.execute(
                "UPDATE users SET credits = credits + ? WHERE id = ?",
                (CREDIT_PACK_AMOUNT, user_id),
            )
            await db.execute(
                """INSERT INTO transactions (id, user_id, amount, type, description, created_at)
                   VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)""",
                (str(uuid.uuid4()), user_id, CREDIT_PACK_PRICE, "credit_purchase",
                 f"Purchased {CREDIT_PACK_AMOUNT} credits"),
            )
        else:
            await db.execute(
                "UPDATE users SET tier = ?, credits = credits + ? WHERE id = ?",
                (tier, plan["credits"], user_id),
            )
            await db.execute(
                """INSERT INTO transactions (id, user_id, amount, type, description, created_at)
                   VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)""",
                (str(uuid.uuid4()), user_id, plan["price"], "subscription",
                 f"Upgraded to {plan['name']} plan"),
            )
        await db.commit()


async def _handle_subscription_cancelled(customer_id: str) -> None:
    """Downgrade user to free tier when subscription is cancelled."""
    async with get_db() as db:
        await db.execute(
            "UPDATE users SET tier = 'free', credits = 30 WHERE stripe_customer_id = ?",
            (customer_id,),
        )
        await db.commit()


async def get_transactions(user_id: str, limit: int = 20) -> list[dict]:
    """Get transaction history for a user."""
    async with get_db() as db:
        async with db.execute(
            """SELECT id, amount, type, description, created_at
               FROM transactions WHERE user_id = ?
               ORDER BY created_at DESC LIMIT ?""",
            (user_id, limit),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]


async def check_plan_limit(user_id: str, resource: str) -> dict[str, Any]:
    """Check if a user has hit their plan limits.
    Resources: 'series', 'credits', 'videos_today'
    """
    async with get_db() as db:
        async with db.execute(
            "SELECT tier, credits FROM users WHERE id = ?", (user_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                return {"allowed": False, "reason": "User not found"}

        tier = row["tier"] or "free"
        credits = row["credits"] or 0
        plan = PLANS.get(tier, PLANS["free"])

        if resource == "credits":
            if credits <= 0:
                return {"allowed": False, "reason": "No credits remaining. Please upgrade or purchase more."}
            return {"allowed": True, "credits_remaining": credits}

        if resource == "series":
            max_series = plan["max_series"]
            if max_series == -1:
                return {"allowed": True}
            async with db.execute(
                "SELECT COUNT(*) as count FROM projects WHERE user_id = ?", (user_id,)
            ) as cursor:
                row2 = await cursor.fetchone()
                count = row2["count"] if row2 else 0
            if count >= max_series:
                return {
                    "allowed": False,
                    "reason": f"Your {tier} plan allows {max_series} series. Upgrade to create more.",
                    "current": count,
                    "limit": max_series,
                }
            return {"allowed": True}

        return {"allowed": True}
