import React from "react";
import { createRoot } from "react-dom/client";
import { ReferenceApp } from "./ReferenceApp";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ReferenceApp />
  </React.StrictMode>,
);
