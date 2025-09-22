import React from "react";
import ReactDOM from "react-dom/client";
import { AppRoutes } from "@app/routes";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppRoutes />
  </React.StrictMode>,
);
