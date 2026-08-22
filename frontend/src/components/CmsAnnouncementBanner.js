import React, { useEffect, useState } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CmsAnnouncementBanner() {
  const [text, setText] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`${API}/cms`, { headers: { Accept: "application/json" } });
        if (!response.ok) return;
        const data = await response.json();
        const value = data?.announcement?.announcement_text;
        if (!cancelled && value) setText(String(value).trim());
      } catch (error) {
        console.warn("CMS announcement load failed", error);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Keep the banner's height stable while CMS data loads. The previous
  // implementation returned a changing-width/height span, which made the
  // announcement bar collapse and expand as the homepage hydrated.
  return (
    <span
      className="inline-flex min-h-[20px] items-center justify-center leading-5"
      aria-live="polite"
    >
      {text || "\u00a0"}
    </span>
  );
}
