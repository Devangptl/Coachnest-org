"use client";
import { Toaster } from "react-hot-toast";
import { useTheme } from "@/components/ThemeProvider";

export function ToasterProvider() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background:    dark ? "rgba(28,28,28,0.85)"        : "#ffffff",
          backdropFilter: dark ? "blur(16px)"                 : "none",
          color:         dark ? "#f0f0f0"                    : "#1c1411",
          border:        dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #ddd5c9",
          borderRadius:  "0.75rem",
          fontSize:      "0.875rem",
          boxShadow:     dark ? "0 4px 24px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.10)",
        },
        success: {
          iconTheme: { primary: "#a78bfa", secondary: dark ? "#f0f0f0" : "#1c1411" },
        },
        error: {
          iconTheme: { primary: "#f87171", secondary: dark ? "#f0f0f0" : "#1c1411" },
        },
      }}
    />
  );
}
