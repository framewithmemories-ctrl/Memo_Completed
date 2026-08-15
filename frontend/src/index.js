import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import AdminProductV2Page from "./components/AdminProductV2Page";
import CatalogueAuditPage from "./components/CatalogueAuditPage";

const root = ReactDOM.createRoot(document.getElementById("root"));
const path = window.location.pathname;
const isProductManagerRoute = path === "/admin/products-v2";
const isCatalogueAuditRoute = path === "/admin/catalogue-audit";

root.render(
  <React.StrictMode>
    {isProductManagerRoute ? <AdminProductV2Page /> : isCatalogueAuditRoute ? <CatalogueAuditPage /> : <App />}
  </React.StrictMode>,
);
