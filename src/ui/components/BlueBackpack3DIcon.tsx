import React from "react";

interface BlueBackpack3DIconProps {
  className?: string;
  size?: number | string;
  id?: string;
}

export const BlueBackpack3DIcon: React.FC<BlueBackpack3DIconProps> = ({
  className = "w-10 h-10",
  size,
  id,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      id={id}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none transform-gpu ${className}`}
      style={style}
      aria-label="3D Blue Backpack"
    >
      <defs>
        {/* Ambient Ground Shadow */}
        <radialGradient
          id="bp-shadow"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(60 110) scale(46 10)"
        >
          <stop stopColor="#0f172a" stopOpacity="0.35" />
          <stop offset="0.6" stopColor="#1e293b" stopOpacity="0.15" />
          <stop offset="1" stopColor="#334155" stopOpacity="0" />
        </radialGradient>

        {/* Back / Shoulder Straps Gradient */}
        <linearGradient id="bp-straps" x1="20" y1="25" x2="100" y2="105" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e3a8a" />
          <stop offset="0.5" stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#172554" />
        </linearGradient>

        {/* Top Handle Gradient */}
        <linearGradient id="bp-handle" x1="60" y1="12" x2="60" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="0.3" stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>

        {/* Main Body 3D Volume Gradient */}
        <linearGradient id="bp-body" x1="30" y1="20" x2="95" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="25%" stopColor="#2563eb" />
          <stop offset="70%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>

        {/* Main Body Depth / Left-Right Shading */}
        <radialGradient
          id="bp-body-highlight"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(48 42) rotate(45) scale(55 50)"
        >
          <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.4" />
          <stop offset="80%" stopColor="#2563eb" stopOpacity="0" />
        </radialGradient>

        {/* Front Pocket 3D Gradient */}
        <linearGradient id="bp-pocket" x1="35" y1="58" x2="85" y2="98" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="40%" stopColor="#3b82f6" />
          <stop offset="85%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>

        {/* Front Pocket Top Highlight */}
        <linearGradient id="bp-pocket-highlight" x1="60" y1="58" x2="60" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#bae6fd" stopOpacity="0.8" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>

        {/* Side Pocket Gradient */}
        <linearGradient id="bp-side-pocket" x1="18" y1="62" x2="30" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="bp-side-pocket-r" x1="102" y1="62" x2="90" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>

        {/* Zipper Metal Accent */}
        <linearGradient id="bp-zipper" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#94a3b8" />
          <stop offset="0.5" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#64748b" />
        </linearGradient>

        {/* Dark Zipper Seam */}
        <linearGradient id="bp-seam" x1="30" y1="0" x2="90" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0f172a" stopOpacity="0.6" />
          <stop offset="0.5" stopColor="#1e293b" stopOpacity="0.9" />
          <stop offset="1" stopColor="#0f172a" stopOpacity="0.6" />
        </linearGradient>

        {/* Neon/Cyan Accent Stripe */}
        <linearGradient id="bp-cyan-glow" x1="35" y1="78" x2="85" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00f2fe" />
          <stop offset="1" stopColor="#4facfe" />
        </linearGradient>

        {/* Clip for curved elements */}
        <filter id="bp-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1e3a8a" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* 1. Ambient Drop Shadow on Floor */}
      <ellipse cx="60" cy="110" rx="46" ry="7" fill="url(#bp-shadow)" />

      {/* 2. Top Handle (Loop) */}
      <g>
        {/* Outer Handle Ring */}
        <path
          d="M44 26 C44 14, 76 14, 76 26"
          stroke="url(#bp-handle)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        {/* Inner Handle Highlight */}
        <path
          d="M47 24 C47 16, 73 16, 73 24"
          stroke="#93c5fd"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
      </g>

      {/* 3. Shoulder Straps Peeking Behind */}
      <path
        d="M28 35 C18 48 16 80 24 98 C26 95 28 88 28 80 Z"
        fill="url(#bp-straps)"
        opacity="0.9"
      />
      <path
        d="M92 35 C102 48 104 80 96 98 C94 95 92 88 92 80 Z"
        fill="url(#bp-straps)"
        opacity="0.9"
      />

      {/* 4. Main Backpack Body */}
      <g filter="url(#bp-glow)">
        <path
          d="M26 44 C26 26, 40 20, 60 20 C80 20, 94 26, 94 44 L95 92 C95 102, 85 106, 60 106 C35 106, 25 102, 25 92 Z"
          fill="url(#bp-body)"
        />
        {/* Specular 3D Highlight Curve */}
        <path
          d="M26 44 C26 26, 40 20, 60 20 C80 20, 94 26, 94 44 L95 92 C95 102, 85 106, 60 106 C35 106, 25 102, 25 92 Z"
          fill="url(#bp-body-highlight)"
        />
      </g>

      {/* 5. Main Top Zipper Seam & Track */}
      <path
        d="M32 36 C40 30, 80 30, 88 36"
        stroke="url(#bp-seam)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M33 36 C40 30.5, 80 30.5, 87 36"
        stroke="#cbd5e1"
        strokeWidth="1.2"
        strokeDasharray="2 1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />

      {/* 6. Side Pockets (Left & Right) with Elastic Mesh Styling */}
      {/* Left Mesh Pocket */}
      <path
        d="M23 65 C23 62 27 62 27 64 L27 92 C27 94 23 93 22 90 C20 82 20 72 23 65 Z"
        fill="url(#bp-side-pocket)"
      />
      <path
        d="M22 64 C25 63 28 63 28 65"
        stroke="#60a5fa"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      {/* Right Mesh Pocket */}
      <path
        d="M97 65 C97 62 93 62 93 64 L93 92 C93 94 97 93 98 90 C100 82 100 72 97 65 Z"
        fill="url(#bp-side-pocket-r)"
      />
      <path
        d="M98 64 C95 63 92 63 92 65"
        stroke="#60a5fa"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* 7. Front 3D Compartment Pocket */}
      <g>
        {/* Pocket Body */}
        <rect
          x="34"
          y="56"
          width="52"
          height="42"
          rx="12"
          fill="url(#bp-pocket)"
        />

        {/* Pocket Highlight on Top Edge */}
        <path
          d="M36 64 C36 59, 42 56.5, 48 56.5 L72 56.5 C78 56.5, 84 59, 84 64"
          stroke="url(#bp-pocket-highlight)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Front Pocket Zipper Arc */}
        <path
          d="M38 64 C46 61, 74 61, 82 64"
          stroke="url(#bp-seam)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M39 64 C46 61.5, 74 61.5, 81 64"
          stroke="#cbd5e1"
          strokeWidth="1"
          strokeDasharray="2 1.5"
          fill="none"
          opacity="0.85"
        />

        {/* Metal Zipper Slider on Pocket */}
        <circle cx="58" cy="62.5" r="2.5" fill="url(#bp-zipper)" />
        <rect x="57" y="63" width="2" height="6" rx="1" fill="url(#bp-zipper)" />

        {/* Modern Cyan Dynamic Accent Ribbon / Badge */}
        <rect
          x="44"
          y="77"
          width="32"
          height="4"
          rx="2"
          fill="url(#bp-cyan-glow)"
          opacity="0.9"
        />

        {/* Modern Backpack Icon Emblem in Pocket Center */}
        <circle cx="60" cy="88" r="4" fill="#1e3a8a" opacity="0.4" />
        <circle cx="60" cy="88" r="2.5" fill="#e0f2fe" opacity="0.85" />
      </g>

      {/* 8. Modern 3D Reflection Gloss across the Front */}
      <path
        d="M38 28 C48 24, 66 23, 76 26 C64 30, 44 38, 32 50 C30 42, 34 33, 38 28 Z"
        fill="#ffffff"
        opacity="0.22"
      />
    </svg>
  );
};
