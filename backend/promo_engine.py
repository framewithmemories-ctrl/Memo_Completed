"""Server-side promotion rules for Memories checkout.

This module is intentionally independent from the existing checkout route so the
pricing pipeline can adopt it without replacing the working payment code.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, ROUND_DOWN
from typing import Any, Mapping, Optional


class PromoError(ValueError):
    """A promotion cannot be applied to the current checkout."""


@dataclass(frozen=True)
class PromoResult:
    code: str
    discount: Decimal
    eligible_subtotal: Decimal


def normalize_promo_code(code: str) -> str:
    """Normalize customer-entered codes consistently."""
    return (code or "").strip().upper()


def _money(value: Any) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


def _as_datetime(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        text = str(value).strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(text)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def validate_and_calculate_promo(
    promo: Mapping[str, Any],
    subtotal: Decimal,
    *,
    customer_id: Optional[str] = None,
    usage_count: int = 0,
    customer_usage_count: int = 0,
    now: Optional[datetime] = None,
) -> PromoResult:
    """Validate a promo document and calculate its discount.

    Expected Mongo fields:
      code, discount_type (percentage|fixed), discount_value,
      min_order_value, max_discount, starts_at, expires_at,
      usage_limit, per_customer_limit, is_active.
    """
    del customer_id  # Reserved for future eligibility rules.
    now = now or datetime.now(timezone.utc)
    subtotal = _money(subtotal)

    code = normalize_promo_code(str(promo.get("code", "")))
    if not code:
        raise PromoError("Promo code is required")
    if not promo.get("is_active", True):
        raise PromoError("This promo code is inactive")

    starts_at = _as_datetime(promo.get("starts_at"))
    expires_at = _as_datetime(promo.get("expires_at"))
    if starts_at and now < starts_at:
        raise PromoError("This promo code is not active yet")
    if expires_at and now >= expires_at:
        raise PromoError("This promo code has expired")

    minimum = _money(promo.get("min_order_value", 0))
    if subtotal < minimum:
        raise PromoError(f"Minimum order value is ₹{minimum:.2f}")

    usage_limit = promo.get("usage_limit")
    if usage_limit is not None and int(usage_limit) >= 0 and usage_count >= int(usage_limit):
        raise PromoError("This promo code has reached its usage limit")

    per_customer_limit = promo.get("per_customer_limit")
    if per_customer_limit is not None and int(per_customer_limit) >= 0 and customer_usage_count >= int(per_customer_limit):
        raise PromoError("You have already used this promo code the maximum allowed times")

    discount_type = str(promo.get("discount_type", "percentage")).lower().strip()
    raw_value = _money(promo.get("discount_value", 0))
    if raw_value <= 0:
        raise PromoError("Promo discount must be greater than zero")

    if discount_type in {"percentage", "percent"}:
        if raw_value > Decimal("100"):
            raise PromoError("Percentage discount cannot exceed 100%")
        discount = (subtotal * raw_value / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
        max_discount = promo.get("max_discount")
        if max_discount is not None:
            discount = min(discount, _money(max_discount))
    elif discount_type in {"fixed", "fixed_amount", "amount"}:
        discount = raw_value
    else:
        raise PromoError("Unsupported promo discount type")

    discount = min(max(discount, Decimal("0.00")), subtotal)
    return PromoResult(code=code, discount=discount, eligible_subtotal=subtotal)
