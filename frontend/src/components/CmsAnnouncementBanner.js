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
        if (!cancelled && value) setText(value);
      } catch (error) {
        console.warn("CMS announcement load failed", error);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Keep the existing banner layout, but make its text CMS-controlled.
  return <span>{text || "🎉 Grand Opening Offer: 25% OFF All Frames + Free Home Delivery! 🎉"}</span>;
}
