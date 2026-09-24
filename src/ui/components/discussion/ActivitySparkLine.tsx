import React from "react";

export function ActivitySparkline({
  data,
}: {
  data: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const width = 220;
  const height = 50;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  const points = data
    .map((d, i) => {
      const x = i * stepX;
      const y = height - (d.count / max) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          className="text-indigo-500"
          strokeWidth={2}
        />
        {data.map((d, i) => (
          <circle
            key={i}
            cx={i * stepX}
            cy={height - (d.count / max) * height}
            r={2}
            className="fill-indigo-500"
          />
        ))}
      </svg>
      <div
        className="flex justify-between text-[9px] text-slate-400 mt-1"
        style={{ width }}
      >
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}
