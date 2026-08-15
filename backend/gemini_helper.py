"""Reusable Google Gemini helper (uses the user's own GEMINI_API_KEY).

Independent of Emergent's LLM proxy. The SDK calls are synchronous, so we run them
in a thread to keep FastAPI endpoints non-blocking. Every function fails GRACEFULLY:
if the key is missing/invalid/quota-exceeded, it returns None and callers fall back.
"""
import os
import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_client = None


def gemini_available() -> bool:
    return bool(os.environ.get("GEMINI_API_KEY", "").strip())


def _get_client():
    global _client
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    if _client is None:
        from google import genai
        _client = genai.Client(api_key=api_key)
    return _client


async def gemini_generate(
    prompt: str,
    system: Optional[str] = None,
    json_mode: bool = False,
    max_tokens: int = 1024,
    temperature: float = 0.7,
    model: Optional[str] = None,
) -> Optional[str]:
    """Generate text with Gemini. Retries on transient errors and falls back to a
    secondary model. Returns the text, or None on any failure (callers handle fallback).
    Pass `model` to override the primary model for this call (e.g. a faster flash model)."""
    client = _get_client()
    if client is None:
        return None
    primary = (model or os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")).strip() or "gemini-2.5-flash"
    fallback = os.environ.get("GEMINI_FALLBACK_MODEL", "gemini-2.5-flash-lite").strip() or "gemini-2.5-flash-lite"
    models = [primary] if primary == fallback else [primary, fallback]

    def _call(model_name):
        from google.genai import types
        kwargs = {"temperature": temperature, "max_output_tokens": max_tokens}
        if system:
            kwargs["system_instruction"] = system
        if json_mode:
            kwargs["response_mime_type"] = "application/json"
        # Older Gemini 2.5 flash models "think" by default, consuming the max_output_tokens
        # budget and truncating the answer, so disable thinking for those. Newer 3.x / *-latest
        # flash models REJECT thinking_budget=0 (400 INVALID_ARGUMENT), so do NOT set it there.
        if "2.5" in model_name:
            kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
        config = types.GenerateContentConfig(**kwargs)
        resp = client.models.generate_content(model=model_name, contents=prompt, config=config)
        return (resp.text or "").strip()

    for model_name in models:
        for attempt in range(3):
            try:
                text = await asyncio.to_thread(_call, model_name)
                if text:
                    return text
            except Exception as e:
                msg = str(e)
                transient = any(code in msg for code in ("503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED", "overloaded"))
                logger.error(f"Gemini error (model={model_name}, attempt={attempt + 1}): {e}")
                if transient and attempt < 2:
                    await asyncio.sleep(1.2 * (attempt + 1))
                    continue
                break  # non-transient or out of attempts -> try next model
    return None
