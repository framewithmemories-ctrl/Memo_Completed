import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import AdminProductV2Page from "./components/AdminProductV2Page";

const root = ReactDOM.createRoot(document.getElementById("root"));
const isProductManagerRoute = window.location.pathname === "/admin/products-v2";

root.render(
  <React.StrictMode>
    {isProductManagerRoute ? <AdminProductV2Page /> : <App />}
  </React.StrictMode>,
);
