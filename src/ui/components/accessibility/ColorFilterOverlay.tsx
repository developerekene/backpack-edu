import React from "react";
import { useAccessibility } from "../../../store/AccessibilityContext";

export const ColorFilterOverlay: React.FC = () => {
  const { colorFilter, colorFilterIntensity } = useAccessibility();

  if (colorFilter === "none") return null;

  const config: Record<
    string,
    { bgClass: string; blendMode: React.CSSProperties["mixBlendMode"] }
  > = {
    "soft-yellow": { bgClass: "bg-amber-200", blendMode: "multiply" },
    "warm-sepia": { bgClass: "bg-amber-600", blendMode: "color-burn" },
    "calm-sage": { bgClass: "bg-emerald-300", blendMode: "multiply" },
    "high-contrast": { bgClass: "bg-blue-900", blendMode: "overlay" },
    "dark-high-contrast": { bgClass: "bg-black", blendMode: "color" },
  };

  const current = config[colorFilter];
  if (!current) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-30 transition-opacity duration-300 ${current.bgClass}`}
      style={{
        opacity: colorFilterIntensity,
        mixBlendMode: current.blendMode,
      }}
    />
  );
};
