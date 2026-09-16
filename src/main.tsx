import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "@kfonts/line-seed-sans-kr/index.css";
import "./shared/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
