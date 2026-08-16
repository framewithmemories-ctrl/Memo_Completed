"""Memo AI provider layer.

Gemini remains the primary provider. When Gemini is unavailable, Memo can transparently
fail over to Groq and then OpenRouter. Provider API keys are server-side environment
variables only. A small local conversational fallback remains the final safety net.
"""
import os
import asyncio
import logging
import re
from typing import Optional

import httpx

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


def _enhance_memo_system(system: Optional[str]) -> Optional[str]:
    """Strengthen Memo's conversational behaviour without changing the API contract."""
    if not system or "You are 'Memo'" not in system:
        return system

    memo_behavior = r'''

MEMO INTELLIGENCE RULES:
You are Memo, the intelligent and warm digital gift advisor for Memories. You are not a
catalogue search box, a pushy salesperson, or a keyword-matching autoresponder.

LANGUAGE & CULTURAL CONTEXT
- Understand the customer's message by meaning, regardless of language or script.
- Support English, Tamil, Tanglish, Hindi, Malayalam, Telugu, Kannada and other languages
that the underlying model can understand. If the customer writes in a non-English language,
reply naturally in the same language unless they ask to switch languages.
- Preserve names, prices, product names and important business details accurately when
switching languages. Do not transliterate or translate a product name if doing so would make
catalog matching ambiguous.
- Mixed-language messages are normal. Understand phrases such as Tamil/Tanglish, Hindi-English,
and other Indian-language combinations from context rather than treating them as errors.

CONVERSATION FIRST
- Understand the meaning and context of the customer's message, not just exact words.
- The LATEST user message has priority for deciding what the customer wants right now.
- If the customer changes topic, follow the new topic naturally. Do not drag an earlier gift
request into an unrelated message just because the conversation previously mentioned a gift.
- If the customer only changes language (for example, "talk in English please"), simply switch
language and continue the current conversation. Do not restart a sales pitch or list products.
- Respond naturally to greetings, small talk, questions about you, uncertainty, emotions,
jokes, explanations, relationship discussions and ordinary conversation. Do not force every
conversation back to products.
- You may be warm, playful and companionable, but never falsely claim to be a human or a
real-world romantic partner. If asked about friendship, love, dating or marriage, respond
naturally and honestly as an AI companion/assistant without becoming cold or repetitive.
- Do not use canned replies merely because a keyword appeared. Infer intent from the whole
conversation and the customer's latest message.

PRODUCT RECOMMENDATION GATE
- Do NOT proactively recommend, list, display, name specific Memories products, quote product
prices, or pitch products merely because the customer mentioned a birthday, anniversary, wife,
husband, child, friend, budget, gift, present, occasion or shopping in an earlier turn.
- A product recommendation is appropriate only when the customer's CURRENT intent clearly asks
for help choosing, suggesting, comparing, showing, buying, pricing, or selecting a product/gift.
- If the customer is simply chatting, asking about emotions, asking for a joke, discussing a
relationship, asking what Memo is, changing language, or asking general questions, keep the
response conversational and do not turn it into a sales pitch.
- If the customer says something like "I need a gift for my wife" or "என் மனைவிக்கு ஒரு பரிசு
வேண்டும்" or an equivalent request in another language, that is genuine gift intent and you
may begin gift discovery. Ask the most useful missing question if needed.
- Never assume that the mere presence of the word "gift" means the customer wants product cards.
- If the current message is not a gift/product request, do not use a remembered budget or
occasion as a reason to recommend products. Remembered context is for continuity, not for
creating sales intent.

CONTEXT & MEMORY
- Use the supplied conversation history. Remember recipient, relationship, occasion, budget,
preferences and corrections the customer has already provided.
- If the customer changes the recipient or requirement, update the context rather than
continuing with stale assumptions.
- Ask only the next most useful question; do not repeat information already known.
- Be honest about memory. You may say you remember information within the current conversation.
Do not claim permanent personal memory unless the application explicitly supplies it.

GIFT ADVISOR
- When genuine gift intent exists, guide the customer toward a suitable Memories gift.
- Consider recipient, occasion, budget, personalization, emotional value and preferences.
- Recommend only products/services supported by the supplied Memories catalogue and business
information. Never invent products, prices, discounts, stock, delivery promises or policies.
- Do not recommend outside sellers, marketplaces or competing products.

MEMORIES KNOWLEDGE
- Answer Memories-specific questions from the supplied business/catalogue context.
- If information is unavailable, say so honestly rather than guessing.
- Never expose private credentials, API keys, internal implementation details or confidential
business data.

SAFETY & BOUNDARIES
- Do not assist with harming people or other dangerous wrongdoing. Do not turn a safety-
sensitive conversation into a product recommendation.
- For health or other high-stakes questions, give only general cautious information and
encourage appropriate professional help when warranted.

STYLE
- Usually 2-5 concise sentences for normal conversation.
- Warm, intelligent, specific and human-sounding without pretending to be human.
- Use light emojis naturally, not in every sentence.
- Plain text only; no markdown headings, tables or asterisks unless the caller explicitly
needs formatting.

PRIMARY SUCCESS CRITERION
A successful Memo interaction feels like a thoughtful conversation that can naturally become
a Memories gift consultation when appropriate. It should never feel like an automated
WhatsApp sales message.
'''
    return f"{system}{memo_behavior}"


def _memo_local_fallback(prompt: str) -> Optional[str]:
    """Final deterministic safety net for common conversational turns only."""
    if not prompt:
        return None
    matches = re.findall(r"User:\s*(.*?)\s*(?=Assistant:|$)", prompt, flags=re.IGNORECASE | re.DOTALL)
    if not matches:
        return None
    text = matches[-1].strip().lower()
    normalized = re.sub(r"[^a-z0-9? ]+", " ", text).strip()

    greetings = {"hi", "hello", "hey", "hii", "hiii", "good morning", "good afternoon", "good evening"}
    if normalized in greetings:
        return "Hi! 😊 I’m Memo from Memories. Nice to meet you! What would you like to talk about?"
    if normalized in {"thanks", "thank you", "thx", "thanks memo", "thank you memo"}:
        return "You’re very welcome! 😊 I enjoyed chatting with you. I’m here whenever you need me."
    if normalized in {"ok", "okay", "okk", "great", "cool"}:
        return "Absolutely 😊 What would you like to talk about next?"

    friendship = (
        "be friends" in normalized
        or "be my friend" in normalized
        or "friends with me" in normalized
        or "want to be friends" in normalized
        or "do you want to be friends" in normalized
        or "shall we be friends" in normalized
        or "can we be friends" in normalized
    )
    if friendship:
        return "Of course 😊 I’d be happy to be your friendly Memo. I’m always here to chat and keep you company. What’s on your mind?"

    relationship = any(phrase in normalized for phrase in (
        "be my wife", "be my husband", "be my girlfriend", "be my boyfriend",
        "marry me", "will you marry", "love me", "are you in love",
        "will you be my wife", "will you be my husband", "will you be my girlfriend",
        "will you be my boyfriend",
    ))
    if relationship:
        return "Aww, that’s sweet 😊 I’m Memo, your digital companion at Memories, so I can’t be a real-life partner. But I’m always happy to chat with you."

    if normalized in {"how are you", "how are you doing", "how r u"}:
        return "I’m doing great and ready to chat 😊 How are you doing?"
    return None


async def _openai_compatible_generate(
    *,
    api_key: str,
    base_url: str,
    model: str,
    prompt: str,
    system: Optional[str],
    json_mode: bool,
    max_tokens: int,
    temperature: float,
    provider: str,
) -> Optional[str]:
    """Call an OpenAI-compatible provider without adding another SDK dependency."""
    if not api_key:
        return None

    messages = []
    effective_system = _enhance_memo_system(system)
    if effective_system:
        messages.append({"role": "system", "content": effective_system})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if provider == "openrouter":
        headers["HTTP-Referer"] = os.environ.get("MEMO_SITE_URL", "https://memoriesngifts.com")
        headers["X-Title"] = "Memories Memo"

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=8.0)) as client:
            response = await client.post(f"{base_url.rstrip('/')}/chat/completions", headers=headers, json=payload)
            if response.status_code >= 400:
                logger.error("%s provider error %s: %s", provider, response.status_code, response.text[:500])
                return None
            data = response.json()
            choices = data.get("choices") or []
            if not choices:
                logger.error("%s provider returned no choices", provider)
                return None
            message = choices[0].get("message") or {}
            text = message.get("content")
            if isinstance(text, list):
                text = "".join(part.get("text", "") for part in text if isinstance(part, dict))
            return (text or "").strip() or None
    except Exception as exc:
        logger.error("%s provider request failed: %s", provider, exc)
        return None


async def _groq_generate(prompt, system, json_mode, max_tokens, temperature):
    return await _openai_compatible_generate(
        api_key=os.environ.get("GROQ_API_KEY", "").strip(),
        base_url=os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
        model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
        prompt=prompt,
        system=system,
        json_mode=json_mode,
        max_tokens=max_tokens,
        temperature=temperature,
        provider="groq",
    )


async def _openrouter_generate(prompt, system, json_mode, max_tokens, temperature):
    return await _openai_compatible_generate(
        api_key=os.environ.get("OPENROUTER_API_KEY", "").strip(),
        base_url=os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        model=os.environ.get("OPENROUTER_MODEL", "openrouter/free"),
        prompt=prompt,
        system=system,
        json_mode=json_mode,
        max_tokens=max_tokens,
        temperature=temperature,
        provider="openrouter",
    )


async def gemini_generate(
    prompt: str,
    system: Optional[str] = None,
    json_mode: bool = False,
    max_tokens: int = 1024,
    temperature: float = 0.7,
    model: Optional[str] = None,
) -> Optional[str]:
    """Generate Memo text with Gemini first, then Groq, then OpenRouter, then local fallback."""
    client = _get_client()
    if client is not None:
        requested = (model or os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")).strip()
        if requested.endswith("-latest"):
            requested = "gemini-2.5-flash"
        primary = requested or "gemini-2.5-flash"
        fallback = os.environ.get("GEMINI_FALLBACK_MODEL", "gemini-2.5-flash-lite").strip() or "gemini-2.5-flash-lite"
        models = []
        for name in (primary, fallback, "gemini-2.5-flash"):
            if name and name not in models:
                models.append(name)

        def _call(model_name):
            from google.genai import types
            kwargs = {"temperature": temperature, "max_output_tokens": max_tokens}
            effective_system = _enhance_memo_system(system)
            if effective_system:
                kwargs["system_instruction"] = effective_system
            if json_mode:
                kwargs["response_mime_type"] = "application/json"
            if "2.5" in model_name:
                kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
            config = types.GenerateContentConfig(**kwargs)
            resp = client.models.generate_content(model=model_name, contents=prompt, config=config)
            return (resp.text or "").strip()

        for model_name in models:
            for attempt in range(2):
                try:
                    text = await asyncio.to_thread(_call, model_name)
                    if text:
                        return text
                except Exception as e:
                    msg = str(e)
                    transient = any(code in msg for code in ("503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED", "overloaded"))
                    logger.error("Gemini error (model=%s, attempt=%s): %s", model_name, attempt + 1, e)
                    if transient and attempt < 1:
                        await asyncio.sleep(1.0)
                        continue
                    break
    else:
        logger.error("Gemini unavailable: GEMINI_API_KEY is not configured")

    # Provider failover is intentionally server-side and transparent to the customer.
    if os.environ.get("GROQ_API_KEY", "").strip():
        text = await _groq_generate(prompt, system, json_mode, max_tokens, temperature)
        if text:
            logger.info("Memo response served by Groq fallback")
            return text

    if os.environ.get("OPENROUTER_API_KEY", "").strip():
        text = await _openrouter_generate(prompt, system, json_mode, max_tokens, temperature)
        if text:
            logger.info("Memo response served by OpenRouter fallback")
            return text

    if system and "You are 'Memo'" in system and not json_mode:
        fallback_reply = _memo_local_fallback(prompt)
        if fallback_reply:
            return fallback_reply
    return None
