import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App"; // Import the main App component

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    {/* The App component already includes CartProvider */}
    <App />
  </React.StrictMode>
);
