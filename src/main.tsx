import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { registerServiceWorker } from "./pwa/registerServiceWorker";

const container = document.getElementById("root");
if (!container) {
  throw new Error("ORKIO root container not found");
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

void registerServiceWorker();
