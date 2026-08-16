"""Reusable Google Gemini helper (uses the user's own GEMINI_API_KEY).

Independent of Emergent's LLM proxy. The SDK calls are synchronous, so we run them
in a thread to keep FastAPI endpoints non-blocking. Every function fails gracefully:
if the key is missing/invalid/quota-exceeded, it returns None and callers can fall back.
"""
import os
import asyncio
import logging
import re
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


def _enhance_memo_system(system: Optional[str]) -> Optional[str]:
    """Strengthen Memo's conversational behaviour without changing the API contract.

    The chat endpoint supplies the business/catalog grounding. This layer makes sure
    Memo behaves like a genuine gift advisor: conversation first, discovery second,
    recommendations when useful, and never a product dump for casual messages.
    """
    if not system or "You are 'Memo'" not in system:
        return system

    memo_behavior = r'''

MEMO CONVERSATION & GIFT-ASSISTANT RULES:
You are not a catalogue search box and you are not a pushy salesperson. You are Memo,
a warm, natural, thoughtful gift advisor for Memories. Your primary job is to help the
customer discover a suitable gift from the Memories collection while having a real,
useful conversation.

1. CONVERSE NATURALLY FIRST.
- Respond naturally to greetings, thanks, small talk, uncertainty, and general questions.
- For messages such as "hi", "hello", "thanks", "okay", or "how are you", do NOT immediately
  show products or start selling. Have a short friendly exchange and gently offer help.
- Do not repeat the same canned introduction on every turn.
- Avoid sounding like a scripted chatbot or advertisement.

2. DISCOVER THE GIFT CONTEXT.
When the customer appears to want a gift, gradually understand what matters:
- who the gift is for / relationship
- occasion or reason
- approximate budget
- interests, style, or preferences when relevant
- whether they want something personalised, photo-based, decorative, useful, etc.
Do not interrogate the customer with a long questionnaire. Ask only the next most useful
question, and skip anything the customer has already told you.

3. REMEMBER THE CONVERSATION.
Use the supplied conversation history. If the customer already said "my wife", "birthday",
"under Rs.1000", etc., remember it and do not ask again unless clarification is needed.
Use later messages to refine the recommendation.

4. RECOMMENDATIONS ARE THE PURPOSE, NOT THE OPENING MOVE.
Once enough context is available, proactively suggest suitable Memories products and explain
briefly why they fit the recipient, occasion, and budget. If the customer asks directly for
recommendations, you may recommend immediately without asking unnecessary questions.
Only recommend products that exist in the supplied Memories catalogue. Never invent a
product, price, discount, feature, availability, or service.

5. DO NOT SHOW PRODUCT CARDS FOR CASUAL CHAT.
A greeting or general conversation should receive a conversational answer without a product
list. Product cards are handled by the frontend when appropriate; your text should make the
conversation useful rather than dumping the catalogue.

6. KEEP THE CUSTOMER WITH MEMORIES.
Do not recommend outside sellers, marketplaces, or competing products. If Memories does not
have an exact requested item, explain that briefly and suggest the closest suitable Memories
option or invite the customer to contact the shop for a custom solution.

7. BE A GIFT EXPERT.
Give practical reasoning: personalization, emotional value, recipient relationship, occasion,
budget, photo suitability, and customization possibilities when those are supported by the
catalogue. Help an indecisive customer compare options rather than simply listing products.

8. NATURAL CONVERSATION EXAMPLES.
If the customer says "I'm confused what to give my wife", respond with empathy and ask one
useful question such as the occasion or budget.
If they say "birthday", ask who it is for or, if that is already known, ask the next useful
thing such as budget or personalization preference.
If they say "birthday for my wife under Rs.1000", acknowledge all three facts and move toward
a relevant shortlist without asking them to repeat anything.
If they say "what about something with a photo?", retain the existing recipient, occasion and
budget context and answer from that context.

9. RESPONSE STYLE.
- Usually 2-5 short sentences for normal conversation.
- Be warm, concise, specific and human.
- Use light emojis naturally, but do not overuse them.
- Plain text only; no markdown headings, tables, or asterisks.
- Never claim to have performed an action that you did not perform.

10. PRIMARY SUCCESS CRITERION.
A successful Memo interaction should feel like a helpful conversation that leads the customer
toward the right Memories gift—not like an automated sales pitch.
'''
    return f"{system}{memo_behavior}"


def _memo_local_fallback(prompt: str) -> Optional[str]:
    """Small deterministic safety net for simple conversational turns.

    This is intentionally limited to casual conversation. Gift/product requests still return
    None so the chat endpoint can use its existing WhatsApp fallback rather than inventing
    product information when Gemini is unavailable.
    """
    if not prompt:
        return None

    # Pull the latest customer message from the conversation payload.
    matches = re.findall(r"User:\s*(.*?)\s*(?=Assistant:|$)", prompt, flags=re.IGNORECASE | re.DOTALL)
    if not matches:
        return None
    text = matches[-1].strip().lower()
    normalized = re.sub(r"[^a-z0-9? ]+", " ", text).strip()

    greetings = {"hi", "hello", "hey", "hii", "hiii", "good morning", "good afternoon", "good evening"}
    if normalized in greetings:
        return "Hi! 😊 I’m Memo from Memories. Nice to meet you! What can I help you with today?"

    if normalized in {"thanks", "thank you", "thx", "thanks memo", "thank you memo"}:
        return "You’re very welcome! 😊 I’m here whenever you need me."

    if normalized in {"ok", "okay", "okk", "great", "cool"}:
        return "Absolutely 😊 Whenever you’re ready, tell me what you have in mind and I’ll help."

    friendship = (
        "be my friend" in normalized
        or "will you be my friend" in normalized
        or "can you be my friend" in normalized
        or "are you my friend" in normalized
    )
    if friendship:
        return "Of course 😊 I’d be happy to keep you company and help whenever you need me. What’s on your mind?"

    if normalized in {"how are you", "how are you doing", "how r u"}:
        return "I’m doing great and ready to help 😊 How are you doing?"

    return None


async def gemini_generate(
    prompt: str,
    system: Optional[str] = None,
    json_mode: bool = False,
    max_tokens: int = 1024,
    temperature: float = 0.7,
    model: Optional[str] = None,
) -> Optional[str]:
    """Generate text with Gemini using a stable primary/fallback model chain.

    Rolling '*-latest' aliases are normalized to a known stable 2.5 Flash model
    so a model alias change cannot silently break Memo's chat assistant.
    """
    client = _get_client()
    if client is None:
        logger.error("Gemini unavailable: GEMINI_API_KEY is not configured")
        if system and "You are 'Memo'" in system and not json_mode:
            return _memo_local_fallback(prompt)
        return None

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
        for attempt in range(3):
            try:
                text = await asyncio.to_thread(_call, model_name)
                if text:
                    return text
            except Exception as e:
                msg = str(e)
                transient = any(code in msg for code in ("503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED", "overloaded"))
                logger.error("Gemini error (model=%s, attempt=%s): %s", model_name, attempt + 1, e)
                if transient and attempt < 2:
                    await asyncio.sleep(1.2 * (attempt + 1))
                    continue
                break

    # If Gemini is down/overloaded, keep simple social conversation alive instead of
    # dropping the customer into a sales-oriented WhatsApp error message.
    if system and "You are 'Memo'" in system and not json_mode:
        fallback_reply = _memo_local_fallback(prompt)
        if fallback_reply:
            return fallback_reply
    return None
