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

export default function Auth() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setInfo("Account created — you're signed in.");
      }
    }
    setLoading(false);
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
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: C.moss,
            marginBottom: 4,
          }}
        >
          run.xc
        </div>
        <div style={{ fontSize: 13.5, color: C.textMuted, marginBottom: 22 }}>
          {mode === "signin" ? "Sign in to your training log" : "Create your account"}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            style={inputStyle}
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          {error && <div style={{ fontSize: 13, color: C.clay }}>{error}</div>}
          {info && <div style={{ fontSize: 13, color: C.moss }}>{info}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: C.moss,
              color: "#fff",
              border: `1px solid ${C.moss}`,
              borderRadius: 7,
              padding: "10px 16px",
              fontSize: 14.5,
              fontWeight: 600,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {loading ? "..." : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <div style={{ marginTop: 18, fontSize: 13, color: C.textMuted, textAlign: "center" }}>
          {mode === "signin" ? (
            <>
              No account?{" "}
              <button
                onClick={() => { setMode("signup"); setError(""); setInfo(""); }}
                style={{ background: "none", border: "none", color: C.moss, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => { setMode("signin"); setError(""); setInfo(""); }}
                style={{ background: "none", border: "none", color: C.moss, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}