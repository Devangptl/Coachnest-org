import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "Coachnest — Modern Learning Platform";
  const subtitle = searchParams.get("subtitle") ?? "Expert-crafted courses. Learn at your own pace.";
  const type = searchParams.get("type") ?? "site"; // "course" | "blog" | "site"

  const accentColor = type === "blog" ? "#a855f7" : "#f97316"; // purple for blog, orange for course/site

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0a",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(${accentColor}18 1px, transparent 1px), linear-gradient(90deg, ${accentColor}18 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Glow blob */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-120px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentColor}40 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            padding: "64px 72px",
          }}
        >
          {/* Logo area */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: accentColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                fontWeight: 900,
                color: "white",
              }}
            >
              C
            </div>
            <span style={{ color: "white", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.5px" }}>
              Coachnest
            </span>
          </div>

          {/* Title block */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "900px" }}>
            {type !== "site" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: `${accentColor}20`,
                  border: `1px solid ${accentColor}50`,
                  borderRadius: "100px",
                  padding: "6px 16px",
                  width: "fit-content",
                  color: accentColor,
                  fontSize: "13px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {type === "course" ? "Course" : "Article"}
              </div>
            )}
            <div
              style={{
                color: "white",
                fontSize: title.length > 60 ? "48px" : "58px",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-1.5px",
              }}
            >
              {title}
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: "22px",
                lineHeight: 1.5,
                fontWeight: 400,
              }}
            >
              {subtitle.length > 100 ? subtitle.slice(0, 100) + "…" : subtitle}
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#22c55e",
                }}
              />
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "15px" }}>
                coachnest.com
              </span>
            </div>
            <div
              style={{
                color: accentColor,
                fontSize: "15px",
                fontWeight: 600,
                background: `${accentColor}15`,
                border: `1px solid ${accentColor}30`,
                borderRadius: "8px",
                padding: "6px 16px",
              }}
            >
              Start learning free →
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
