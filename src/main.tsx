import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

const rootEl = document.getElementById("root");

function showFatalError(message: string) {
  if (!rootEl) return;
  // якщо застосунок уже відмальований — не чіпаємо сторінку
  if (rootEl.querySelector("[data-app-mounted]")) return;
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:system-ui,sans-serif;background:#f6f3ea;color:#6b6555">
      <div style="max-width:420px">
        <p style="font-size:20px;font-weight:700;color:#17140c;margin:0 0 10px">Щось пішло не так</p>
        <p style="font-size:14px;line-height:1.6;margin:0 0 8px">Спробуй відкрити файл у Google Chrome. Деталі помилки:</p>
        <code style="display:block;font-size:12px;background:#eee8d8;border-radius:12px;padding:12px;color:#17140c;word-break:break-word">${message}</code>
      </div>
    </div>`;
}

window.addEventListener("error", (e) => showFatalError(e.message || "Невідома помилка"));
window.addEventListener("unhandledrejection", (e) => showFatalError(String(e.reason)));

if (rootEl) {
  try {
    const root = createRoot(rootEl);
    rootEl.setAttribute("data-app-mounted", "");
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (e) {
    showFatalError(e instanceof Error ? e.message : String(e));
  }
}
