import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { App } from "./App";
import "./styles.css";

if (window.location.hostname === "localhost") {
  const next = new URL(window.location.href);
  next.hostname = "127.0.0.1";
  window.location.replace(next.toString());
}

const Router = import.meta.env.BASE_URL === "/" ? BrowserRouter : HashRouter;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
);
