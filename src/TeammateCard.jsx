import React from "react";

const C = {
  surface: "#FFFFFF",
  line: "#D6DACC",
  text: "#1B2420",
  textMuted: "#5C6660",
  moss: "#2F5233",
};

// Semicircle progress gauge. score is 0-100 or null (shows an empty gray arc + "--").
function SemicircleGauge({ score, size = 90 }) {
  const strokeWidth = 8;
  const radius = size / 2 - strokeWidth;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius; // half circle length

  const pct = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const dashOffset = circumference * (1 - pct);

  const color =
    score == null ? "#C7CCC1" : score >= 80 ? "#2F5233" : score >= 50 ? "#C9A227" : "#9C4A2E";

  return (
    <div style={{ position: "relative", width: size, height: size / 2 + 6 }}>
      <svg width={size} height={size / 2 + strokeWidth} viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}>
        {/* background track */}
        <path
          d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
          fill="none"
          stroke="#E4E7DD"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* progress arc */}
        <path
          d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 18,
          fontWeight: 700,
          color: C.text,
        }}
      >
        {score == null ? "--" : score}
      </div>
    </div>
  );
}

function Avatar({ name, photoUrl, size = 40 }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
      />
    );
  }
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: C.moss,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 700,
      }}
    >
      {initial}
    </div>
  );
}

export default function TeammateCard({ name, photoUrl, score = null, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: "14px 14px 10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        minWidth: 120,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <SemicircleGauge score={score} />
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
        <Avatar name={name} photoUrl={photoUrl} size={24} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{name}</span>
      </div>
    </div>
  );
}

export { SemicircleGauge, Avatar };