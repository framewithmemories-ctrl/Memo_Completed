import React, { useEffect, useMemo, useState } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function isActiveNow(item) {
  if (!item || item.active === false) return false;
  const now = Date.now();
  const start = item.start_date || item.startDate || item.starts_at || item.startsAt;
  const end = item.end_date || item.endDate || item.ends_at || item.endsAt;
  if (start && !Number.isNaN(Date.parse(start)) && now < Date.parse(start)) return false;
  if (end && !Number.isNaN(Date.parse(end)) && now > Date.parse(end)) return false;
  return true;
}

function hideLegacyWelcomePopup() {
  const candidates = Array.from(document.querySelectorAll("body *"));
  const target = candidates.find((el) => {
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    return text === "Welcome to Memories!";
  });
  if (!target) return;

  let node = target;
  for (let i = 0; i < 8 && node.parentElement; i += 1) {
    const style = window.getComputedStyle(node);
    if (style.position === "fixed" || style.position === "absolute") {
      node.setAttribute("data-legacy-welcome-popup", "true");
      node.style.setProperty("display", "none", "important");
      return;
    }
    node = node.parentElement;
  }
}

export default function CmsPromotionLayer() {
  const [cms, setCms] = useState(null);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Hide the old hard-coded welcome popup immediately and keep it hidden.
    hideLegacyWelcomePopup();
    const observer = new MutationObserver(() => hideLegacyWelcomePopup());
    observer.observe(document.body, { childList: true, subtree: true });

    let cancelled = false;
    const load = async () => {
      try {
        // /admin/cms requires admin authentication. /cms is the public storefront endpoint.
        const response = await fetch(`${API}/cms`, { headers: { Accept: "application/json" } });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setCms(data);
      } catch (error) {
        console.warn("CMS promotion load failed", error);
      }
    };
    load();

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  const offer = useMemo(() => {
    const offers = Array.isArray(cms?.offers) ? cms.offers : [];
    return offers.find((item) => isActiveNow(item) && (item.show_in_popup ?? item.showInPopup ?? false));
  }, [cms]);

  useEffect(() => {
    if (!offer) return undefined;

    const key = `cms_offer_popup_seen_${offer.id || offer._id || offer.title || "current"}`;
    const alreadySeen = localStorage.getItem(key) === "1";
    if (!alreadySeen) {
      const timer = window.setTimeout(() => setOpen(true), 800);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [offer]);

  if (!offer || !open || dismissed) return null;

  const close = () => {
    setOpen(false);
    setDismissed(true);
    localStorage.setItem(`cms_offer_popup_seen_${offer.id || offer._id || offer.title || "current"}`, "1");
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(15,23,42,.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div role="dialog" aria-modal="true" style={{ width: "100%", maxWidth: 520, background: "white", borderRadius: 22, boxShadow: "0 24px 80px rgba(0,0,0,.25)", overflow: "hidden", position: "relative" }}>
        <button onClick={close} aria-label="Close offer" style={{ position: "absolute", right: 14, top: 12, width: 38, height: 38, border: 0, borderRadius: 999, background: "rgba(255,255,255,.92)", fontSize: 24, cursor: "pointer", zIndex: 2 }}>×</button>
        <div style={{ padding: "34px 28px 30px", background: "linear-gradient(135deg,#fff1f7,#fff7fb)" }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#be123c", marginBottom: 10 }}>Special Offer</div>
          <h2 style={{ margin: 0, color: "#111827", fontSize: 30, lineHeight: 1.15 }}>{offer.title || "Special Offer"}</h2>
          {offer.discount && <div style={{ display: "inline-block", marginTop: 16, padding: "8px 14px", borderRadius: 999, background: "#be123c", color: "white", fontWeight: 800 }}>{offer.discount}</div>}
          {offer.description && <p style={{ margin: "18px 0 0", color: "#475569", fontSize: 17, lineHeight: 1.55 }}>{offer.description}</p>}
          <button onClick={close} style={{ marginTop: 24, width: "100%", border: 0, borderRadius: 12, padding: "13px 18px", background: "linear-gradient(90deg,#f43f5e,#ec4899)", color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Continue Browsing</button>
        </div>
      </div>
    </div>
  );
}
