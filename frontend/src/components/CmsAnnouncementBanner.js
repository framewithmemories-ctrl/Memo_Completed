import React, { useEffect, useState } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const CACHE_KEY = "memories_cms_announcement";

export default function CmsAnnouncementBanner() {
  const [text, setText] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return String(window.localStorage.getItem(CACHE_KEY) || "").trim();
    } catch (_) {
      return "";
    }
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 4500);

    const load = async () => {
      try {
        const response = await fetch(`${API}/cms`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
          cache: "no-store"
        });
        if (!response.ok) return;
        const data = await response.json();
        const value = String(data?.announcement?.announcement_text || "").trim();
        if (!cancelled && value) {
          setText(value);
          try { window.localStorage.setItem(CACHE_KEY, value); } catch (_) {}
        }
      } catch (error) {
        if (!cancelled) console.warn("CMS announcement load failed", error);
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    load();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, []);

  // Fixed height + single-line clipping prevents the banner from folding,
  // expanding, or pushing the hero up/down while CMS content hydrates.
  return (
    <span
      className="inline-flex h-[44px] w-full items-center justify-center px-4 leading-5 whitespace-nowrap overflow-hidden text-ellipsis"
      aria-live="polite"
    >
      {text || "\u00a0"}
    </span>
  );
}
