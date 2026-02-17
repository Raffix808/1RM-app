import { useState, useEffect } from "react";

const DEFAULT_EXERCISES = [
  "Bicep Curl Barbell", "Cable Row", "Incline Bench", "Bench Press",
  "Squat", "Deadlift", "Overhead Press", "Lat Pulldown",
  "Incline Bench Press", "Leg Press", "Romanian Deadlift", "Pull Up",
  "Barbell Row", "Dumbbell Press", "Tricep Pushdown"
];

const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

function calc1RM(weight, reps, rpe) {
  const rir = 10 - rpe;
  const adjustedReps = reps + rir;
  if (adjustedReps <= 1) return weight;
  return Math.round(weight * (1 + adjustedReps / 30));
}

const REP_PERCENTAGES = [
  { reps: 1, pct: 100 }, { reps: 2, pct: 96 }, { reps: 3, pct: 92 },
  { reps: 4, pct: 89 }, { reps: 5, pct: 86 }, { reps: 6, pct: 84 },
  { reps: 7, pct: 81 }, { reps: 8, pct: 79 }, { reps: 9, pct: 76 },
  { reps: 10, pct: 74 }, { reps: 11, pct: 72 }, { reps: 12, pct: 70 }
];

const TABS = ["Calculator", "History", "Exercise", "Settings"];

const TAB_ICONS = {
  Calculator: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={22} height={22}>
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="12" y2="14"/>
    </svg>
  ),
  History: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={22} height={22}>
      <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
    </svg>
  ),
  Exercise: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={22} height={22}>
      <path d="M6 4v6M18 4v6M4 9h16M4 15h16M6 14v6M18 14v6"/>
    </svg>
  ),
  Settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={22} height={22}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )
};

// localStorage helpers
function lsGet(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? JSON.parse(val) : fallback;
  } catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export default function App() {
  const [tab, setTab] = useState("Calculator");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState(10);
  const [exercise, setExercise] = useState("Bench Press");
  const [exercises, setExercises] = useState(() => lsGet("exercises", DEFAULT_EXERCISES));
  const [history, setHistory] = useState(() => lsGet("history", []));
  const [unit, setUnit] = useState(() => lsGet("unit", "kg"));
  const [showRPEInfo, setShowRPEInfo] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [exerciseDetailTab, setExerciseDetailTab] = useState("Chart");
  const [saveToast, setSaveToast] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);

  // Persist whenever state changes
  useEffect(() => { lsSet("exercises", exercises); }, [exercises]);
  useEffect(() => { lsSet("history", history); }, [history]);
  useEffect(() => { lsSet("unit", unit); }, [unit]);

  const weightNum = parseFloat(weight);
  const repsNum = parseInt(reps);
  const oneRM = weightNum > 0 && repsNum > 0 ? calc1RM(weightNum, repsNum, rpe) : 0;

  const saveHistory = () => {
    if (!weightNum || !repsNum || !oneRM) return;
    const entry = {
      id: Date.now(),
      exercise,
      weight: weightNum,
      reps: repsNum,
      rpe,
      oneRM,
      unit,
      date: new Date().toLocaleString("sv-SE", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
      }).replace("T", " ")
    };
    setHistory(prev => [entry, ...prev]);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const deleteEntry = (id) => setHistory(prev => prev.filter(h => h.id !== id));

  const addExercise = () => {
    const name = newExerciseName.trim();
    if (!name || exercises.includes(name)) return;
    setExercises(prev => [...prev, name]);
    setNewExerciseName("");
  };

  const filteredExercises = exercises.filter(e =>
    e.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
  );

  const exHistory = selectedExercise
    ? history.filter(h => h.exercise === selectedExercise).slice().reverse()
    : [];

  // ── Styles ──────────────────────────────────────────────
  const C = {
    purple: "#7c6ff7",
    bg: "#0a0a0a",
    card: "#1c1c1e",
    border: "#222",
    text: "#ffffff",
    muted: "#888",
    dim: "#555",
  };

  const s = {
    app: {
      background: C.bg, color: C.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      minHeight: "100vh", display: "flex", flexDirection: "column",
      maxWidth: 430, margin: "0 auto", position: "relative",
    },
    header: {
      padding: "20px 20px 12px", display: "flex",
      justifyContent: "space-between", alignItems: "center"
    },
    headerTitle: { fontSize: 28, fontWeight: 700, letterSpacing: -0.5 },
    content: { flex: 1, overflowY: "auto", paddingBottom: 90 },
    tabBar: {
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 430, background: "#111",
      borderTop: `1px solid ${C.border}`, display: "flex", padding: "8px 0 20px"
    },
    tabItem: (active) => ({
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      gap: 3, cursor: "pointer", color: active ? C.purple : C.dim,
      fontSize: 10, fontWeight: active ? 600 : 400, transition: "color 0.15s"
    }),
    input: {
      background: C.card, border: "none", borderRadius: 10,
      padding: "14px", color: C.text, fontSize: 16,
      outline: "none", width: "100%", boxSizing: "border-box",
      WebkitAppearance: "none",
    },
    select: {
      background: C.card, border: "none", borderRadius: 10,
      padding: "14px 10px", color: C.text, fontSize: 16,
      outline: "none", width: "100%", appearance: "none",
      WebkitAppearance: "none", cursor: "pointer",
    },
    btn: {
      background: C.purple, border: "none", borderRadius: 12,
      padding: 18, color: C.text, fontSize: 17, fontWeight: 600,
      cursor: "pointer", width: "100%",
    },
    btnOutline: (active) => ({
      background: "transparent",
      border: `1px solid ${active ? C.purple : C.dim}`,
      borderRadius: 12, padding: 18,
      color: active ? C.purple : C.dim,
      fontSize: 17, fontWeight: 500, cursor: "pointer", width: "100%",
    }),
    repRow: {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 16px", borderBottom: `1px solid #1a1a1a`
    },
    historyItem: { padding: "14px 16px", borderBottom: `1px solid #1a1a1a` },
    badge: {
      display: "inline-block", background: C.purple, color: C.text,
      fontSize: 12, fontWeight: 600, padding: "3px 10px",
      borderRadius: 20, marginBottom: 6
    },
    modal: {
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 20
    },
    modalBox: {
      background: "#1a1a1a", borderRadius: 16, padding: 24,
      maxWidth: 340, width: "100%", border: `1px solid #333`
    },
    toast: {
      position: "fixed", bottom: 95, left: "50%", transform: "translateX(-50%)",
      background: "#1c1c1e", color: C.text, padding: "12px 24px",
      borderRadius: 20, fontSize: 14, fontWeight: 500,
      border: `1px solid #333`, zIndex: 999, whiteSpace: "nowrap",
    }
  };

  // ── Chart component ──────────────────────────────────────
  const LineChart = ({ data, unitLabel }) => {
    if (data.length < 2) return (
      <div style={{ color: C.dim, textAlign: "center", padding: "40px 0", fontSize: 14 }}>
        Save at least 2 entries to see your progress chart
      </div>
    );
    const W = 340, H = 140, PX = 20, PY = 16;
    const maxV = Math.max(...data.map(d => d.oneRM));
    const minV = Math.min(...data.map(d => d.oneRM));
    const range = maxV - minV || 1;
    const toX = (i) => PX + (i / (data.length - 1)) * (W - PX * 2);
    const toY = (v) => PY + (1 - (v - minV) / range) * (H - PY * 2);
    const points = data.map((d, i) => ({ x: toX(i), y: toY(d.oneRM), d }));
    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const areaD = `${pathD} L${points[points.length-1].x},${H-PY} L${points[0].x},${H-PY} Z`;

    return (
      <div style={{ background: C.card, borderRadius: 12, padding: "16px 8px 8px", margin: "0 16px 8px" }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.purple} stopOpacity="0.3"/>
              <stop offset="100%" stopColor={C.purple} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#grad)"/>
          <path d={pathD} fill="none" stroke={C.purple} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill={C.purple} stroke={C.bg} strokeWidth="2"/>
              {i === points.length - 1 && (
                <text x={p.x} y={p.y - 10} textAnchor="middle" fill={C.purple} fontSize="11" fontWeight="700">
                  {p.d.oneRM}{unitLabel}
                </text>
              )}
            </g>
          ))}
          <text x={points[0].x} y={H - 2} textAnchor="middle" fill={C.dim} fontSize="9">
            {data[0].date.slice(0, 10)}
          </text>
          <text x={points[points.length-1].x} y={H - 2} textAnchor="middle" fill={C.dim} fontSize="9">
            {data[data.length-1].date.slice(0, 10)}
          </text>
        </svg>
      </div>
    );
  };

  // ── Screens ──────────────────────────────────────────────
  const renderCalculator = () => (
    <div>
      {/* 1RM Display */}
      <div style={{ textAlign: "center", padding: "24px 20px 16px" }}>
        <div style={{ color: C.muted, fontSize: 15, marginBottom: 4 }}>Your 1RM is...</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4 }}>
          <span style={{ fontSize: 88, fontWeight: 800, lineHeight: 1, letterSpacing: -4 }}>{oneRM}</span>
          <span style={{ fontSize: 32, color: C.muted, paddingBottom: 12 }}>{unit}</span>
        </div>
      </div>

      {/* Inputs */}
      <div style={{ display: "flex", gap: 8, padding: "0 16px", marginBottom: 8 }}>
        {/* Weight */}
        <div style={{ flex: 2 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Weight</div>
          <div style={{ position: "relative" }}>
            <input
              style={{ ...s.input, paddingRight: 36 }}
              inputMode="decimal"
              placeholder="0"
              value={weight}
              onChange={e => setWeight(e.target.value)}
            />
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: C.dim, fontSize: 13 }}>{unit}</span>
          </div>
        </div>
        {/* Reps — KEY FIX: inputMode="numeric" + type="text" avoids mobile lag */}
        <div style={{ flex: 1.2 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Reps</div>
          <input
            style={s.input}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="0"
            value={reps}
            onChange={e => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              setReps(val);
            }}
          />
        </div>
        {/* RPE */}
        <div style={{ flex: 1.3 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>RPE</div>
          <div style={{ position: "relative" }}>
            <select style={s.select} value={rpe} onChange={e => setRpe(parseFloat(e.target.value))}>
              {RPE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: C.dim, pointerEvents: "none", fontSize: 12 }}>▾</span>
          </div>
        </div>
      </div>

      {/* Exercise selector */}
      <div style={{ padding: "0 16px", marginBottom: 8, position: "relative" }}>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Exercise</div>
        <div
          onClick={() => setShowExerciseDropdown(v => !v)}
          style={{ ...s.input, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <span>{exercise}</span>
          <span style={{ color: C.dim, fontSize: 12 }}>▾</span>
        </div>
        {showExerciseDropdown && (
          <div style={{
            position: "absolute", top: "calc(100% - 4px)", left: 16, right: 16, zIndex: 100,
            background: "#2a2a2a", borderRadius: 10, maxHeight: 220, overflowY: "auto",
            border: `1px solid ${C.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.6)"
          }}>
            {exercises.map(ex => (
              <div
                key={ex}
                onClick={() => { setExercise(ex); setShowExerciseDropdown(false); }}
                style={{
                  padding: "13px 14px", cursor: "pointer", fontSize: 15,
                  borderBottom: `1px solid #333`,
                  color: ex === exercise ? C.purple : C.text,
                  background: ex === exercise ? "#1e1a3a" : "transparent"
                }}
              >{ex}</div>
            ))}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div style={{ padding: "0 16px 4px", display: "flex", flexDirection: "column", gap: 10 }}>
        <button style={s.btn} onClick={saveHistory}>Calculate &amp; Save 1RM</button>
        <button style={s.btnOutline(false)} onClick={() => { setWeight(""); setReps(""); }}>Clear</button>
      </div>

      {/* RPE link */}
      <div style={{ padding: "12px 16px 8px" }}>
        <span style={{ color: C.purple, fontSize: 15, cursor: "pointer" }} onClick={() => setShowRPEInfo(true)}>
          What is RPE?
        </span>
      </div>

      {/* Rep max table */}
      <div style={{ padding: "4px 16px 12px" }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Estimated Rep Maxes</div>
      </div>
      {REP_PERCENTAGES.filter(r => r.reps > 1).map(({ reps: r, pct }) => (
        <div key={r} style={s.repRow}>
          <span style={{ fontSize: 15, color: "#bbb", flex: 1 }}>{r} Reps</span>
          <span style={{ fontSize: 15, flex: 1, textAlign: "center" }}>
            {oneRM ? `${Math.round(oneRM * pct / 100)} ${unit}` : "-"}
          </span>
          <span style={{ fontSize: 15, color: C.dim, flex: 1, textAlign: "right" }}>{pct}%</span>
        </div>
      ))}
    </div>
  );

  const renderHistory = () => (
    <div>
      {history.length === 0 ? (
        <div style={{ textAlign: "center", color: C.dim, padding: 60, fontSize: 15 }}>
          No history yet. Calculate and save your 1RM to see it here.
        </div>
      ) : history.map(entry => (
        <div key={entry.id} style={s.historyItem}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={s.badge}>{entry.exercise}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: C.dim, fontSize: 12 }}>{entry.date}</span>
              <span onClick={() => deleteEntry(entry.id)} style={{ color: "#e55", fontSize: 18, cursor: "pointer" }}>×</span>
            </div>
          </div>
          <div>
            <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2 }}>{entry.oneRM}</span>
            <span style={{ fontSize: 18, color: C.muted }}> {entry.unit}</span>
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
            {[["Weight", entry.weight.toFixed(1)], ["Reps", entry.reps], ["RPE", entry.rpe]].map(([label, val]) => (
              <div key={label} style={{ color: C.muted, fontSize: 13 }}>
                {label} <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderExerciseDetail = () => {
    const unitLabel = exHistory[0]?.unit || unit;
    return (
      <div>
        {/* Back header */}
        <div style={{ ...s.header, paddingBottom: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSelectedExercise(null)}
              style={{ background: "none", border: "none", color: C.text, fontSize: 22, cursor: "pointer", padding: 0 }}>
              ←
            </button>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{selectedExercise}</span>
          </div>
          <button
            onClick={() => {
              setHistory(prev => prev.filter(h => h.exercise !== selectedExercise));
              setSelectedExercise(null);
            }}
            style={{ background: "none", border: "none", color: "#e55", cursor: "pointer", fontSize: 20 }}>
            🗑
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", padding: "12px 16px 0" }}>
          {["Chart", "History"].map(t => (
            <button key={t} onClick={() => setExerciseDetailTab(t)} style={{
              flex: 1, background: "none", border: "none",
              borderBottom: `2px solid ${exerciseDetailTab === t ? C.purple : "transparent"}`,
              color: exerciseDetailTab === t ? C.purple : C.dim,
              padding: "10px 0", fontSize: 16, cursor: "pointer",
              fontWeight: exerciseDetailTab === t ? 600 : 400, transition: "all 0.15s"
            }}>{t}</button>
          ))}
        </div>

        {exerciseDetailTab === "Chart" ? (
          <div style={{ paddingTop: 16 }}>
            <LineChart data={exHistory} unitLabel={unitLabel} />

            {/* Best lifts summary */}
            {exHistory.length > 0 && (
              <div style={{ padding: "12px 16px 4px" }}>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Best estimated maxes (from top 1RM)
                </div>
                {(() => {
                  const best = Math.max(...exHistory.map(e => e.oneRM));
                  return REP_PERCENTAGES.map(({ reps: r, pct }) => (
                    <div key={r} style={s.repRow}>
                      <span style={{ fontSize: 15, color: "#bbb", flex: 1 }}>{r} Rep{r > 1 ? "s" : ""}</span>
                      <span style={{ fontSize: 15, flex: 1, textAlign: "center" }}>{Math.round(best * pct / 100)} {unitLabel}</span>
                      <span style={{ fontSize: 15, color: C.dim, flex: 1, textAlign: "right" }}>{pct}%</span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        ) : (
          <div style={{ paddingTop: 8 }}>
            {exHistory.length === 0 ? (
              <div style={{ textAlign: "center", color: C.dim, padding: 40 }}>No entries yet</div>
            ) : exHistory.map(entry => (
              <div key={entry.id} style={s.historyItem}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.dim, fontSize: 12 }}>{entry.date}</span>
                  <span onClick={() => deleteEntry(entry.id)} style={{ color: "#e55", fontSize: 18, cursor: "pointer" }}>×</span>
                </div>
                <div>
                  <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2 }}>{entry.oneRM}</span>
                  <span style={{ fontSize: 18, color: C.muted }}> {entry.unit}</span>
                </div>
                <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
                  {[["Weight", entry.weight.toFixed(1)], ["Reps", entry.reps], ["RPE", entry.rpe]].map(([label, val]) => (
                    <div key={label} style={{ color: C.muted, fontSize: 13 }}>
                      {label} <span style={{ color: C.text, fontWeight: 600 }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderExercise = () => {
    if (selectedExercise) return renderExerciseDetail();
    return (
      <div>
        <div style={{ position: "relative", padding: "12px 16px" }}>
          <span style={{ position: "absolute", left: 28, top: "50%", transform: "translateY(-50%)", color: C.dim }}>🔍</span>
          <input
            style={{ ...s.input, paddingLeft: 40 }}
            placeholder="Search exercises"
            value={exerciseSearchQuery}
            onChange={e => setExerciseSearchQuery(e.target.value)}
          />
        </div>

        {filteredExercises.map(ex => {
          const hasHistory = history.some(h => h.exercise === ex);
          return (
            <div key={ex}
              onClick={() => { setSelectedExercise(ex); setExerciseDetailTab("Chart"); }}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "16px 16px", borderBottom: `1px solid #1a1a1a`, cursor: "pointer"
              }}>
              <div>
                <span style={{ fontSize: 16 }}>{ex}</span>
                {hasHistory && <span style={{ marginLeft: 8, fontSize: 11, color: C.purple }}>● tracked</span>}
              </div>
              <span style={{ color: C.dim, fontSize: 20 }}>›</span>
            </div>
          );
        })}

        {/* Add custom exercise */}
        <div style={{ padding: 16, borderTop: `1px solid #1a1a1a`, display: "flex", gap: 8, marginTop: 8 }}>
          <input
            style={{ ...s.input, flex: 1 }}
            placeholder="Add new exercise..."
            value={newExerciseName}
            onChange={e => setNewExerciseName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addExercise()}
          />
          <button onClick={addExercise} style={{ ...s.btn, width: "auto", padding: "14px 20px" }}>Add</button>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 13, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Units</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        {["kg", "lbs"].map(u => (
          <button key={u} onClick={() => setUnit(u)}
            style={{
              flex: 1, background: unit === u ? C.purple : C.card,
              border: "none", borderRadius: 10, padding: 16,
              color: C.text, fontSize: 16, cursor: "pointer", fontWeight: unit === u ? 700 : 400
            }}>{u}</button>
        ))}
      </div>

      <div style={{ fontSize: 13, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Data</div>
      <button
        onClick={() => {
          if (window.confirm("Clear all saved history? This cannot be undone.")) {
            setHistory([]);
          }
        }}
        style={{ ...s.btnOutline(false), color: "#e55", borderColor: "#e55", marginBottom: 10 }}
      >Clear All History</button>

      <button
        onClick={() => {
          if (window.confirm("Reset exercise list to defaults?")) {
            setExercises(DEFAULT_EXERCISES);
          }
        }}
        style={{ ...s.btnOutline(false), marginBottom: 28 }}
      >Reset Exercise List</button>

      <div style={{ color: "#333", fontSize: 13, textAlign: "center", marginTop: 16 }}>
        1RM Calculator · Epley formula (RPE-adjusted)
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────
  return (
    <div style={s.app}>
      {/* Header */}
      {!(tab === "Exercise" && selectedExercise) && (
        <div style={s.header}>
          <span style={s.headerTitle}>{tab}</span>
          {tab === "Calculator" && (
            <svg onClick={() => setTab("Settings")} viewBox="0 0 24 24" fill="none"
              stroke={C.dim} strokeWidth={2} width={24} height={24} style={{ cursor: "pointer" }}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          )}
        </div>
      )}

      <div style={s.content}>
        {tab === "Calculator" && renderCalculator()}
        {tab === "History" && renderHistory()}
        {tab === "Exercise" && renderExercise()}
        {tab === "Settings" && renderSettings()}
      </div>

      {/* Tab bar */}
      <div style={s.tabBar}>
        {TABS.map(t => (
          <div key={t} style={s.tabItem(tab === t)}
            onClick={() => { setTab(t); setSelectedExercise(null); }}>
            {TAB_ICONS[t]}
            <span>{t}</span>
          </div>
        ))}
      </div>

      {/* Toast */}
      {saveToast && <div style={s.toast}>✓ 1RM saved!</div>}

      {/* RPE modal */}
      {showRPEInfo && (
        <div style={s.modal} onClick={() => setShowRPEInfo(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>What is RPE?</div>
            <div style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7 }}>
              <b style={{ color: C.text }}>Rate of Perceived Exertion (RPE)</b> measures effort on a 1–10 scale relative to your max.
              <br/><br/>
              <b style={{ color: C.text }}>RPE 10</b> — Could not do another rep<br/>
              <b style={{ color: C.text }}>RPE 9</b> — 1 rep left in the tank<br/>
              <b style={{ color: C.text }}>RPE 8</b> — 2 reps left<br/>
              <b style={{ color: C.text }}>RPE 7</b> — 3 reps left<br/><br/>
              Using RPE gives a more accurate 1RM when you're not training to failure.
            </div>
            <button style={{ ...s.btn, marginTop: 16 }} onClick={() => setShowRPEInfo(false)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
