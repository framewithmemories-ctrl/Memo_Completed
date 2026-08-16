import React, { Component, lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import "./index.css";

// The storefront expects GET /api/products to resolve to an array. Some production
// responses can be wrapped as { products: [...] } (or another object), which used to
// reach ProductGrid unchanged and crash on `.filter()` with a white screen.
// Normalize only the collection endpoint; never alter product-detail object responses.
axios.interceptors.response.use((response) => {
  try {
    const requestUrl = response?.config?.url || "";
    const pathname = new URL(requestUrl, window.location.origin).pathname;
    if (pathname.endsWith("/api/products") && !Array.isArray(response.data)) {
      const normalized = Array.isArray(response.data?.products)
        ? response.data.products
        : Array.isArray(response.data?.items)
          ? response.data.items
          : [];
      console.warn("Memories: normalized unexpected /api/products response shape", response.data);
      response.data = normalized;
    }
  } catch (error) {
    console.warn("Memories: unable to normalize product response", error);
  }
  return response;
});

const App = lazy(() => import("./App"));

class RootErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Memories application failed to render:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      const message = this.state.error?.message || String(this.state.error);
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#fff7f9", fontFamily: "Arial, sans-serif" }}>
          <div style={{ width: "100%", maxWidth: 620, background: "white", border: "1px solid #fecdd3", borderRadius: 20, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,.08)" }}>
            <h1 style={{ margin: 0, color: "#be123c", fontSize: 26 }}>Memories is having trouble loading</h1>
            <p style={{ color: "#475569", lineHeight: 1.6, marginTop: 12 }}>
              The deployment is reachable, but a browser-side error prevented the app from rendering. We have captured the error below so it can be fixed instead of showing a blank page.
            </p>
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", background: "#f8fafc", borderRadius: 12, padding: 16, color: "#334155", fontSize: 13 }}>{message}</pre>
            <button onClick={this.handleReload} style={{ marginTop: 16, border: 0, borderRadius: 10, padding: "12px 18px", background: "#e11d48", color: "white", fontWeight: 700, cursor: "pointer" }}>
              Reload Memories
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const LoadingScreen = () => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff7f9", fontFamily: "Arial, sans-serif" }}>
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 42, marginBottom: 12 }}>🎁</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>Loading Memories…</div>
      <div style={{ color: "#64748b", marginTop: 6 }}>Preparing your memories and gifts</div>
    </div>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <App />
      </Suspense>
    </RootErrorBoundary>
  </React.StrictMode>,
);
