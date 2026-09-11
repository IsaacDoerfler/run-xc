import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
// ---------- Design tokens ----------
const C = {
  bg: "#EEF0EA",
  surface: "#FFFFFF",
  line: "#D6DACC",
  text: "#1B2420",
  textMuted: "#5C6660",
  moss: "#2F5233",
  clay: "#9C4A2E",
  sky: "#3A6B7A",
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

function paceFromDistDuration(distance, durationMin) {
  if (!distance || !durationMin) return null;
  const paceMin = durationMin / distance;
  const m = Math.floor(paceMin);
  const s = Math.round((paceMin - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}/mi`;
}

// ---------- Supabase-backed table hook ----------
// Fetches all rows for a table on mount, and exposes insertRow / deleteRow
// that write straight to Supabase and update local state to match.
function useSupabaseTable(table) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("date", { ascending: false });
    if (error) {
      console.error(`Failed to load ${table}:`, error.message);
    } else {
      setRows(data);
    }
    setLoading(false);
  }, [table]);

  useEffect(() => {
    load();
  }, [load]);

  const insertRow = useCallback(
    async (row) => {
      const { data, error } = await supabase.from(table).insert(row).select();
      if (error) {
        console.error(`Failed to insert into ${table}:`, error.message);
        return;
      }
      setRows((prev) => [data[0], ...prev]);
    },
    [table]
  );

  const deleteRow = useCallback(
    async (id) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) {
        console.error(`Failed to delete from ${table}:`, error.message);
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
    },
    [table]
  );

  return { rows, loading, insertRow, deleteRow };
}

// ---------- UI atoms ----------
function Card({ children, style }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: "20px 22px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function StatBlock({ label, value, sub, accent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 13, color: C.textMuted }}>{label}</div>
      <div
        style={{
          fontSize: 34,
          fontWeight: 700,
          color: accent || C.text,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 12.5, color: C.textMuted }}>{sub}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, color: C.textMuted }}>{label}</span>
      {children}
    </label>
  );
}

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

function Button({ children, onClick, variant = "primary" }) {
  const styles = {
    primary: { background: C.moss, color: "#fff", border: `1px solid ${C.moss}` },
    ghost: { background: "transparent", color: C.text, border: `1px solid ${C.line}` },
  };
  return (
    <button
      onClick={onClick}
      style={{
        ...styles[variant],
        borderRadius: 7,
        padding: "9px 16px",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function EmptyState({ text }) {
  return <div style={{ color: C.textMuted, fontSize: 13.5, padding: "10px 0" }}>{text}</div>;
}

const TABS = [
  { id: "today", label: "Today" },
  { id: "runs", label: "Runs" },
  { id: "recovery", label: "Recovery" },
  { id: "hydration", label: "Hydration" },
  { id: "nutrition", label: "Nutrition" },
  { id: "strength", label: "Strength" },
];

export default function App() {
  const [session, setSession] = useState(null);
const [sessionLoading, setSessionLoading] = useState(true);

useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setSessionLoading(false);
  });
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
  });
  return () => subscription.unsubscribe();
}, []);
  const [tab, setTab] = useState("today");

  const runsTable = useSupabaseTable("runs");
  const recoveryTable = useSupabaseTable("recovery");
  const hydrationTable = useSupabaseTable("hydration");
  const nutritionTable = useSupabaseTable("nutrition");
  const strengthTable = useSupabaseTable("strength");

  const anyLoading =
    runsTable.loading || recoveryTable.loading || hydrationTable.loading ||
    nutritionTable.loading || strengthTable.loading;

  const runs = runsTable.rows;
  const recovery = recoveryTable.rows;
  const hydration = hydrationTable.rows;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);
  const weekRuns = runs.filter((r) => r.date >= weekAgoStr);
  const weekMiles = weekRuns.reduce((s, r) => s + Number(r.distance || 0), 0);
  const todayHydration = hydration.filter((h) => h.date === todayStr());
  const todayOz = todayHydration.reduce((s, h) => s + Number(h.oz || 0), 0);
  const latestRecovery = [...recovery].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const streakDays = (() => {
    const dates = new Set(runs.map((r) => r.date));
    let streak = 0;
    let d = new Date();
    while (true) {
      const s = d.toISOString().slice(0, 10);
      if (dates.has(s)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return streak;
  })();

    if (sessionLoading) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh" }} />
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (anyLoading) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontFamily: "'IBM Plex Sans', sans-serif" }}>
        Loading run.xc…
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif", color: C.text, padding: "0 0 40px 0" }}>
      <div style={{ padding: "26px 24px 18px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
  <div>
    <div style={{ fontFamily: "'Barlow Condensed', 'IBM Plex Sans', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: C.moss }}>
      run.xc
    </div>
    <div style={{ fontSize: 13.5, color: C.textMuted, marginTop: 2 }}>
      {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
    </div>
  </div>
  <button
    onClick={() => supabase.auth.signOut()}
    style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 14px", fontSize: 13, color: C.textMuted, cursor: "pointer", fontFamily: "inherit" }}
  >
    Sign out
  </button>
</div>

      <div style={{ display: "flex", gap: 4, padding: "14px 20px 0", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              border: "none",
              background: tab === t.id ? C.surface : "transparent",
              color: tab === t.id ? C.text : C.textMuted,
              borderRadius: "8px 8px 0 0",
              padding: "9px 16px",
              fontSize: 14,
              fontWeight: tab === t.id ? 700 : 500,
              cursor: "pointer",
              borderBottom: tab === t.id ? `2px solid ${C.moss}` : "2px solid transparent",
              fontFamily: "inherit",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 20px 0", maxWidth: 720 }}>
        {tab === "today" && (
          <TodayTab
            weekMiles={weekMiles}
            weekRunsCount={weekRuns.length}
            todayOz={todayOz}
            latestRecovery={latestRecovery}
            streakDays={streakDays}
            recentRuns={[...runs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3)}
          />
        )}
        {tab === "runs" && <RunsTab table={runsTable} />}
        {tab === "recovery" && <RecoveryTab table={recoveryTable} />}
        {tab === "hydration" && <HydrationTab table={hydrationTable} />}
        {tab === "nutrition" && <NutritionTab table={nutritionTable} />}
        {tab === "strength" && <StrengthTab table={strengthTable} />}
      </div>
    </div>
  );
}

function TodayTab({ weekMiles, weekRunsCount, todayOz, latestRecovery, streakDays, recentRuns }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <Card><StatBlock label="This week" value={`${weekMiles.toFixed(1)} mi`} sub={`${weekRunsCount} run${weekRunsCount === 1 ? "" : "s"}`} accent={C.moss} /></Card>
        <Card><StatBlock label="Recovery score" value={latestRecovery ? latestRecovery.score : "—"} sub={latestRecovery ? fmtDate(latestRecovery.date) : "not logged yet"} accent={C.clay} /></Card>
        <Card><StatBlock label="Hydration today" value={`${todayOz} oz`} sub="tap Hydration to log" accent={C.sky} /></Card>
        <Card><StatBlock label="Run streak" value={`${streakDays}d`} sub={streakDays > 0 ? "keep it going" : "log a run to start"} /></Card>
      </div>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Recent runs</div>
        {recentRuns.length === 0 ? (
          <EmptyState text="No runs logged yet — head to the Runs tab to add your first one." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentRuns.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
                <span style={{ color: C.textMuted }}>{fmtDate(r.date)}</span>
                <span>{r.distance} mi</span>
                <span style={{ color: C.textMuted }}>{r.duration} min</span>
                <span style={{ fontWeight: 600 }}>{paceFromDistDuration(Number(r.distance), Number(r.duration)) || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function RunsTab({ table }) {
  const { rows, insertRow, deleteRow } = table;
  const [form, setForm] = useState({ date: todayStr(), distance: "", duration: "", effort: "5", notes: "" });

  const addRun = () => {
    if (!form.distance || !form.duration) return;
    insertRow({
      date: form.date,
      distance: Number(form.distance),
      duration: Number(form.duration),
      effort: Number(form.effort),
      notes: form.notes,
    });
    setForm({ date: todayStr(), distance: "", duration: "", effort: "5", notes: "" });
  };

  const sorted = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Log a run</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
          <Field label="Date"><input style={inputStyle} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Distance (mi)"><input style={inputStyle} type="number" step="0.1" placeholder="3.1" value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} /></Field>
          <Field label="Duration (min)"><input style={inputStyle} type="number" placeholder="24" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></Field>
          <Field label="Effort (1–10)"><input style={inputStyle} type="number" min="1" max="10" value={form.effort} onChange={(e) => setForm({ ...form, effort: e.target.value })} /></Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="Notes"><input style={inputStyle} type="text" placeholder="Trail loop, felt strong" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        <div style={{ marginTop: 14 }}><Button onClick={addRun}>Save run</Button></div>
      </Card>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>History</div>
        {sorted.length === 0 ? (
          <EmptyState text="Nothing here yet." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sorted.map((r) => (
              <div key={r.id} style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>{fmtDate(r.date)}</span>
                  <span>{r.distance} mi · {r.duration} min · {paceFromDistDuration(Number(r.distance), Number(r.duration))}</span>
                  <button onClick={() => deleteRow(r.id)} style={{ border: "none", background: "none", color: C.clay, cursor: "pointer", fontSize: 13 }}>remove</button>
                </div>
                {r.notes && <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 3 }}>{r.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function RecoveryTab({ table }) {
  const { rows, insertRow } = table;
  const [form, setForm] = useState({ date: todayStr(), sleepHours: "", soreness: "3", restingHR: "" });

  const addEntry = () => {
    if (!form.sleepHours) return;
    const sleepScore = Math.min(Number(form.sleepHours) / 8, 1) * 50;
    const sorenessScore = (10 - Number(form.soreness)) * 3;
    const hrPenalty = form.restingHR ? Math.max(0, (Number(form.restingHR) - 50) * 0.5) : 0;
    const score = Math.max(0, Math.min(100, Math.round(sleepScore + sorenessScore + 20 - hrPenalty)));
    insertRow({
      date: form.date,
      sleep_hours: Number(form.sleepHours),
      soreness: Number(form.soreness),
      resting_hr: form.restingHR ? Number(form.restingHR) : null,
      score,
    });
    setForm({ date: todayStr(), sleepHours: "", soreness: "3", restingHR: "" });
  };

  const sorted = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Log recovery</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
          <Field label="Date"><input style={inputStyle} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Sleep (hrs)"><input style={inputStyle} type="number" step="0.5" placeholder="7.5" value={form.sleepHours} onChange={(e) => setForm({ ...form, sleepHours: e.target.value })} /></Field>
          <Field label="Soreness (1–10)"><input style={inputStyle} type="number" min="1" max="10" value={form.soreness} onChange={(e) => setForm({ ...form, soreness: e.target.value })} /></Field>
          <Field label="Resting HR (optional)"><input style={inputStyle} type="number" placeholder="55" value={form.restingHR} onChange={(e) => setForm({ ...form, restingHR: e.target.value })} /></Field>
        </div>
        <div style={{ marginTop: 14 }}><Button onClick={addEntry}>Save recovery</Button></div>
      </Card>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>History</div>
        {sorted.length === 0 ? (
          <EmptyState text="Nothing here yet." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sorted.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{fmtDate(r.date)}</span>
                <span>{r.sleep_hours}h sleep · soreness {r.soreness}/10</span>
                <span style={{ fontWeight: 700, color: C.clay }}>{r.score}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function HydrationTab({ table }) {
  const { rows, insertRow } = table;
  const [oz, setOz] = useState("8");
  const addOz = (amount) => insertRow({ date: todayStr(), oz: amount });
  const todayEntries = rows.filter((h) => h.date === todayStr());
  const todayTotal = todayEntries.reduce((s, h) => s + Number(h.oz || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <StatBlock label="Today's intake" value={`${todayTotal} oz`} sub="goal: 80–100 oz on run days" accent={C.sky} />
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {[8, 12, 16, 24].map((amt) => <Button key={amt} variant="ghost" onClick={() => addOz(amt)}>+{amt} oz</Button>)}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input style={{ ...inputStyle, width: 70 }} type="number" value={oz} onChange={(e) => setOz(e.target.value)} />
            <Button onClick={() => addOz(Number(oz))}>Add</Button>
          </div>
        </div>
      </Card>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Today's log</div>
        {todayEntries.length === 0 ? <EmptyState text="Nothing logged today yet." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todayEntries.map((h) => <div key={h.id} style={{ fontSize: 14, color: C.textMuted }}>+ {h.oz} oz</div>)}
          </div>
        )}
      </Card>
    </div>
  );
}

function NutritionTab({ table }) {
  const { rows, insertRow } = table;
  const [form, setForm] = useState({ date: todayStr(), meal: "Breakfast", notes: "", calories: "" });

  const addMeal = () => {
    if (!form.notes) return;
    insertRow({
      date: form.date,
      meal: form.meal,
      notes: form.notes,
      calories: form.calories ? Number(form.calories) : null,
    });
    setForm({ date: todayStr(), meal: "Breakfast", notes: "", calories: "" });
  };

  const todayMeals = rows.filter((n) => n.date === todayStr());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Log a meal</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
          <Field label="Date"><input style={inputStyle} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Meal">
            <select style={inputStyle} value={form.meal} onChange={(e) => setForm({ ...form, meal: e.target.value })}>
              {["Breakfast", "Lunch", "Dinner", "Snack", "Pre-run", "Post-run"].map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Calories (optional)"><input style={inputStyle} type="number" placeholder="450" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} /></Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="What did you eat?"><input style={inputStyle} type="text" placeholder="Oatmeal, banana, coffee" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        <div style={{ marginTop: 14 }}><Button onClick={addMeal}>Save meal</Button></div>
      </Card>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Today</div>
        {todayMeals.length === 0 ? <EmptyState text="No meals logged today yet." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {todayMeals.map((m) => (
              <div key={m.id} style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>{m.meal}</span>
                  {m.calories && <span style={{ color: C.textMuted }}>{m.calories} cal</span>}
                </div>
                <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{m.notes}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StrengthTab({ table }) {
  const { rows, insertRow } = table;
  const [form, setForm] = useState({ date: todayStr(), exercise: "", sets: "", reps: "", weight: "" });

  const addSet = () => {
    if (!form.exercise) return;
    insertRow({
      date: form.date,
      exercise: form.exercise,
      sets: form.sets ? Number(form.sets) : null,
      reps: form.reps ? Number(form.reps) : null,
      weight: form.weight ? Number(form.weight) : null,
    });
    setForm({ date: todayStr(), exercise: "", sets: "", reps: "", weight: "" });
  };

  const todayEntries = rows.filter((s) => s.date === todayStr());
  const sorted = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Log strength work</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 12 }}>
          <Field label="Date"><input style={inputStyle} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Exercise"><input style={inputStyle} type="text" placeholder="Single-leg squat" value={form.exercise} onChange={(e) => setForm({ ...form, exercise: e.target.value })} /></Field>
          <Field label="Sets"><input style={inputStyle} type="number" placeholder="3" value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} /></Field>
          <Field label="Reps"><input style={inputStyle} type="number" placeholder="10" value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} /></Field>
          <Field label="Weight (lb, optional)"><input style={inputStyle} type="number" placeholder="0" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></Field>
        </div>
        <div style={{ marginTop: 14 }}><Button onClick={addSet}>Save exercise</Button></div>
      </Card>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Today's session</div>
        {todayEntries.length === 0 ? <EmptyState text="No strength work logged today yet." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todayEntries.map((s) => (
              <div key={s.id} style={{ fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>{s.exercise}</span>{" "}
                <span style={{ color: C.textMuted }}>{s.sets}×{s.reps}{s.weight ? ` @ ${s.weight}lb` : ""}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Recent history</div>
        {sorted.length === 0 ? <EmptyState text="Nothing here yet." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sorted.map((s) => (
              <div key={s.id} style={{ fontSize: 13.5, color: C.textMuted }}>
                {fmtDate(s.date)} — {s.exercise} {s.sets}×{s.reps}{s.weight ? ` @ ${s.weight}lb` : ""}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}