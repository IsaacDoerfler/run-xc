import React, { useState } from "react";
import { supabase } from "./supabaseClient";

const C = {
  bg: "#EEF0EA",
  surface: "#FFFFFF",
  line: "#D6DACC",
  text: "#1B2420",
  textMuted: "#5C6660",
  moss: "#2F5233",
  clay: "#9C4A2E",
};

const inputStyle = {
  border: `1px solid ${C.line}`,
  borderRadius: 7,
  padding: "10px 12px",
  fontSize: 14.5,
  background: "#FCFCFA",
  color: C.text,
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
};

export default function ProfileSetup({ userId, onDone }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, display_name: name.trim() });
    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      onDone(name.trim());
    }
  };

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          padding: "32px 30px",
          width: 340,
        }}
      >
        <div
          style={{
            fontFamily: "'Barlow Condensed', 'IBM Plex Sans', sans-serif",
            fontSize: 24,
            fontWeight: 700,
            color: C.moss,
            marginBottom: 4,
          }}
        >
          One more thing
        </div>
        <div style={{ fontSize: 13.5, color: C.textMuted, marginBottom: 20 }}>
          What should your teammates see your name as?
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            style={inputStyle}
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          {error && <div style={{ fontSize: 13, color: C.clay }}>{error}</div>}
          <button
            type="submit"
            disabled={saving}
            style={{
              background: C.moss,
              color: "#fff",
              border: `1px solid ${C.moss}`,
              borderRadius: 7,
              padding: "10px 16px",
              fontSize: 14.5,
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}