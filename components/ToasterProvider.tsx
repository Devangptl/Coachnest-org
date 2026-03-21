"use client";
import { Toaster } from "react-hot-toast";

export function ToasterProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(16px)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "0.75rem",
          fontSize: "0.875rem",
        },
        success: {
          iconTheme: { primary: "#a78bfa", secondary: "#fff" },
        },
        error: {
          iconTheme: { primary: "#f87171", secondary: "#fff" },
        },
      }}
    />
  );
}
