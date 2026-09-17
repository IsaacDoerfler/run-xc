import React, { useState } from "react";
import TeammateCard from "./TeammateCard";

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
  padding: "9px 10px",
  fontSize: 14.5,
  background: "#FCFCFA",
  color: C.text,
  outline: "none",
  fontFamily: "inherit",
};

function Card({ children, style }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "20px 22px", ...style }}>
      {children}
    </div>
  );
}

function Button({ children, onClick, variant = "primary" }) {
  const styles = {
    primary: { background: C.moss, color: "#fff", border: `1px solid ${C.moss}` },
    ghost: { background: "transparent", color: C.text, border: `1px solid ${C.line}` },
  };
  return (
    <button
      onClick={onClick}
      style={{ ...styles[variant], borderRadius: 7, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
    >
      {children}
    </button>
  );
}

export default function TeamTab({ userId, teamHook }) {
  const { team, teammates, loading, createTeam, joinTeam, leaveTeam } = teamHook;
  const [teamName, setTeamName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  if (loading) return <div style={{ color: C.textMuted, fontSize: 13.5 }}>Loading team…</div>;

  if (!team) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Create a team</div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              type="text"
              placeholder="Team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
            <Button
              onClick={async () => {
                if (!teamName.trim()) return;
                const { error } = await createTeam(teamName.trim());
                if (error) setError(error.message);
              }}
            >
              Create
            </Button>
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Join a team</div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              type="text"
              placeholder="Invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <Button
              variant="ghost"
              onClick={async () => {
                if (!joinCode.trim()) return;
                const { error } = await joinTeam(joinCode.trim());
                if (error) setError(error.message);
              }}
            >
              Join
            </Button>
          </div>
        </Card>

        {error && <div style={{ fontSize: 13, color: C.clay }}>{error}</div>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{team.name}</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
              Invite code: <span style={{ fontWeight: 700, color: C.text }}>{team.invite_code}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(team.invite_code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied!" : "Copy code"}
            </Button>
            <Button variant="ghost" onClick={leaveTeam}>
              Leave team
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Team readiness</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {teammates.map((t) => (
            <TeammateCard key={t.id} name={t.display_name} score={null} />
          ))}
        </div>
      </Card>
    </div>
  );
}