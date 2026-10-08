import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// AuthProvider is mounted once inside App.tsx (with BrowserRouter).
// Keeping a second copy here created duplicate Supabase auth listeners
// and a context-init delay that left the homepage blank on first paint.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
