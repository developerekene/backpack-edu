import React, { useState, useEffect } from "react";
import { useAccessibility } from "../../../store/AccessibilityContext";
import { X, Sliders } from "lucide-react";

export const ReadingFocusRuler: React.FC = () => {
  const {
    readingRulerEnabled,
    setReadingRulerEnabled,
    readingRulerHeight,
    setReadingRulerHeight,
    readingRulerDim,
  } = useAccessibility();

  const [mouseY, setMouseY] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerHeight / 2 : 300,
  );
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (!readingRulerEnabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMouseY(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        setMouseY(e.touches[0].clientY);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [readingRulerEnabled]);

  if (!readingRulerEnabled) return null;

  const halfHeight = readingRulerHeight / 2;
  const topCutoff = Math.max(0, mouseY - halfHeight);
  const bottomStart = mouseY + halfHeight;

  return (
    <>
      {/* Top Dimmed Mask */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 pointer-events-none z-30 transition-[height] duration-75 bg-slate-950"
        style={{
          height: `${topCutoff}px`,
          opacity: readingRulerDim,
        }}
      />

      {/* Focus Reading Band / Ruler */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 pointer-events-none z-30 transition-[top,height] duration-75 border-y-2 border-indigo-500/60 bg-amber-300/10 shadow-[0_0_20px_rgba(99,102,241,0.25)]"
        style={{
          top: `${topCutoff}px`,
          height: `${readingRulerHeight}px`,
        }}
      >
        {/* Subtle center baseline guide line */}
        <div className="w-full h-full flex items-center justify-center opacity-30">
          <div className="w-full border-b border-dashed border-indigo-400/40" />
        </div>
      </div>

      {/* Bottom Dimmed Mask */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 bottom-0 pointer-events-none z-30 transition-[top] duration-75 bg-slate-950"
        style={{
          top: `${bottomStart}px`,
          opacity: readingRulerDim,
        }}
      />

      {/* Quick Floating Ruler Controller Badge */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center space-x-2 bg-slate-900/95 text-white backdrop-blur-md border border-slate-700/80 px-3.5 py-2 rounded-2xl shadow-xl text-xs">
        <span className="font-bold flex items-center text-indigo-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
          Focus Ruler
        </span>

        {showControls && (
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-700">
            <span className="text-[11px] text-slate-400">Height:</span>
            {[40, 64, 96, 120].map((h) => (
              <button
                key={h}
                onClick={() => setReadingRulerHeight(h)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  readingRulerHeight === h
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {h}px
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowControls(!showControls)}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 transition"
          title="Adjust Ruler Height"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setReadingRulerEnabled(false)}
          className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition"
          title="Turn off Focus Ruler"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </>
  );
};
