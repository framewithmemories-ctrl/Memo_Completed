"""CMS domain models for Memories.

This module is intentionally isolated from the legacy server until the API
integration can be made safely. It defines the database contract for the
admin-managed storefront content.
"""
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class OfferContent(BaseModel):
    id: Optional[str] = None
    title: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=500)
    discount_text: str = Field(default="", max_length=80)
    image_url: str = Field(default="", max_length=2000)
    cta_text: str = Field(default="Shop Now", max_length=60)
    cta_url: str = Field(default="/shop", max_length=500)
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    active: bool = True
    show_on_homepage: bool = True
    show_in_popup: bool = False
    sort_order: int = 0
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class AnnouncementContent(BaseModel):
    id: Optional[str] = None
    text: str = Field(default="", max_length=240)
    link_text: str = Field(default="", max_length=60)
    link_url: str = Field(default="", max_length=500)
    active: bool = True
    updated_at: datetime = Field(default_factory=utc_now)


class PopupContent(BaseModel):
    id: Optional[str] = None
    enabled: bool = False
    title: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=500)
    image_url: str = Field(default="", max_length=2000)
    cta_text: str = Field(default="Shop Now", max_length=60)
    cta_url: str = Field(default="/shop", max_length=500)
    frequency: str = Field(default="once_per_session", max_length=40)
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=utc_now)


class HomepageContent(BaseModel):
    id: Optional[str] = None
    hero_title: str = Field(default="", max_length=160)
    hero_subtitle: str = Field(default="", max_length=500)
    hero_image_url: str = Field(default="", max_length=2000)
    hero_cta_text: str = Field(default="", max_length=60)
    hero_cta_url: str = Field(default="", max_length=500)
    featured_product_ids: List[str] = Field(default_factory=list, max_length=20)
    updated_at: datetime = Field(default_factory=utc_now)
