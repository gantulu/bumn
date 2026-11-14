
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Best-effort global zoom lock. Normal one-finger scrolling remains enabled.
const preventZoomGesture = (event: Event) => event.preventDefault();

document.addEventListener("gesturestart", preventZoomGesture, { passive: false });
document.addEventListener("gesturechange", preventZoomGesture, { passive: false });
document.addEventListener("gestureend", preventZoomGesture, { passive: false });
document.addEventListener("dblclick", preventZoomGesture, { passive: false });

document.addEventListener(
  "touchmove",
  (event: TouchEvent) => {
    if (event.touches.length > 1) event.preventDefault();
  },
  { passive: false }
);

window.addEventListener(
  "wheel",
  (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey) event.preventDefault();
  },
  { passive: false }
);

document.addEventListener("keydown", (event: KeyboardEvent) => {
  if (!(event.ctrlKey || event.metaKey)) return;
  if (["+", "-", "=", "0"].includes(event.key)) event.preventDefault();
});

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
