import React from "react";
import { createRoot } from "react-dom/client";
import { WorkspaceControlApp } from "./WorkspaceControlApp";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WorkspaceControlApp />
  </React.StrictMode>,
);
