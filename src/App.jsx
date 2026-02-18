import { useState, useEffect } from "react";

const DEFAULT_EXERCISES = [
  "Bicep Curl Barbell",  "Cable Row", "Incline Bench", "Bench Press",
  "Squat", "Deadlift", "Overhead Press", "Lat Pulldown",
  "Incline Bench Press", "Leg Press", "Romanian Deadlift", "Pull Up",
  "Barbell Row", "Dumbbell Press", "Tricep Pushdown"
];

const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const REP_RANGE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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

function lsGet(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? JSON.parse(val) : fallback;
  } catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function formatDate(d) {
  return new Date(d).toLocaleString("sv-SE", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  }).replace("T", " ");
}

// For each rep count 1-12, find the heaviest ACTUAL weight ever lifted at exactly that rep count
function getRepRecords(exHistory) {
  const records = {};
  for (const entry of exHistory) {
    const r = entry.reps;
    if (!REP_RANGE.includes(r)) continue;
    if (!records[r] || entry.weight > records[r].weight) {
      records[r] = {
        weight: entry.weight,
        unit: entry.unit,
        date: entry.date,
      };
    }
  }
  return records;
}

// Generic line chart used for both 1RM progress and bodyweight
function LineChart({ data, valueKey = "oneRM", color = "#7c6ff7", unitLabel = "", bg = "#0a0a0a" }) {
  if (!data || data.length < 2) return (
    <div style={{ color: "#555", textAlign: "center", padding: "28px 0", fontSize: 14 }}>
      {data && data.length === 1
        ? "Add one more entry to see your chart"
        : "No entries yet — save your first one above"}
    </div>
  );
  const W = 340, H = 150, PX = 28, PY = 20;
  const vals = data.map(d => d[valueKey]);
  const maxV = Math.max(...vals);
  const minV = Math.min(...vals);
  const range = maxV - minV || 1;
  const toX = i => PX + (i / (data.length - 1)) * (W - PX * 2);
  const toY = v => PY + (1 - (v - minV) / range) * (H - PY * 2);
  const points = data.map((d, i) => ({ x: toX(i), y: toY(d[valueKey]), d }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = `${pathD} L${points[points.length - 1].x},${H - PY} L${points[0].x},${H - PY} Z`;
  const gradId = `g-${color.replace("#", "")}`;
  return (
    <div style={{ background: "#161616", borderRadius: 12, padding: "16px 8px 14px", margin: "0 16px 4px" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`}/>
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill={color} stroke={bg} strokeWidth="2"/>
            {(i === 0 || i === points.length - 1) && (
              <text x={p.x} y={p.y - 10} textAnchor="middle" fill={color} fontSize="11" fontWeight="700">
                {p.d[valueKey]}{unitLabel}
              </text>
            )}
          </g>
        ))}
        <text x={points[0].x} y={H - 2} textAnchor="middle" fill="#555" fontSize="9">
          {data[0].date.slice(0, 10)}
        </text>
        {data.length > 1 && (
          <text x={points[points.length - 1].x} y={H - 2} textAnchor="middle" fill="#555" fontSize="9">
            {data[data.length - 1].date.slice(0, 10)}
          </text>
        )}
      </svg>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("Calculator");

  // Calculator state
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState(10);
  const [exercise, setExercise] = useState("Bench Press");
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const [showRPEInfo, setShowRPEInfo] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // Data
  const [exercises, setExercises] = useState(() => lsGet("exercises", DEFAULT_EXERCISES));
  const [history, setHistory] = useState(() => lsGet("history", []));
  const [unit, setUnit] = useState(() => lsGet("unit", "kg"));

  // Bodyweight
  const [bwHistory, setBwHistory] = useState(() => lsGet("bwHistory", []));
  const [bwInput, setBwInput] = useState("");
  const [bwToast, setBwToast] = useState(false);

  // Exercise page
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [exerciseDetailTab, setExerciseDetailTab] = useState("Chart");
  const [newExerciseName, setNewExerciseName] = useState("");

  // Persist
  useEffect(() => { lsSet("exercises", exercises); }, [exercises]);
  useEffect(() => { lsSet("history", history); }, [history]);
  useEffect(() => { lsSet("unit", unit); }, [unit]);
  useEffect(() => { lsSet("bwHistory", bwHistory); }, [bwHistory]);

  const weightNum = parseFloat(weight);
  const repsNum = parseInt(reps);
  const oneRM = weightNum > 0 && repsNum > 0 ? calc1RM(weightNum, repsNum, rpe) : 0;

  const saveEntry = () => {
    if (!weightNum || !repsNum || !oneRM) return;
    const entry = {
      id: Date.now(),
      exercise,
      weight: weightNum,
      reps: repsNum,
      rpe,
      oneRM,
      unit,
      date: formatDate(Date.now()),
    };
    setHistory(prev => [entry, ...prev]);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const deleteEntry = (id, e) => {
    if (e) e.stopPropagation();
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  const saveBW = () => {
    const bw = parseFloat(bwInput);
    if (!bw || bw <= 0) return;
    const entry = { id: Date.now(), bodyweight: bw, date: formatDate(Date.now()) };
    setBwHistory(prev => [...prev, entry]);
    setBwInput("");
    setBwToast(true);
    setTimeout(() => setBwToast(false), 2000);
  };

  const addExercise = () => {
    const name = newExerciseName.trim();
    if (!name || exercises.includes(name)) return;
    setExercises(prev => [...prev, name]);
    setNewExerciseName("");
  };

  const goToExercise = (name) => {
    setSelectedExercise(name);
    setExerciseDetailTab("Chart");
    setTab("Exercise");
  };

  const filteredExercises = exercises.filter(e =>
    e.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
  );

  // For selected exercise: oldest-first for chart
  const exHistory = selectedExercise
    ? history.filter(h => h.exercise === selectedExercise).slice().reverse()
    : [];

  const repRecords = selectedExercise ? getRepRecords(exHistory) : {};

  // ── Styles ───────────────────────────────────────────────
  const C = { purple: "#7c6ff7", green: "#4ade80", bg: "#0a0a0a", card: "#1c1c1e", border: "#222", text: "#ffffff", muted: "#888", dim: "#555" };

  const inp = {
    background: "#fff", border: "none", borderRadius: 10, padding: "14px",
    color: "#000", fontSize: 16, outline: "none", width: "100%",
    boxSizing: "border-box", WebkitAppearance: "none", fontWeight: 600,
  };
  const sel = { ...inp, appearance: "none", WebkitAppearance: "none", cursor: "pointer" };
  const btnP = { background: C.purple, border: "none", borderRadius: 12, padding: 18, color: "#fff", fontSize: 17, fontWeight: 600, cursor: "pointer", width: "100%" };
  const btnO = (color) => ({ background: "transparent", border: `1px solid ${color || C.dim}`, borderRadius: 12, padding: 18, color: color || C.dim, fontSize: 17, fontWeight: 500, cursor: "pointer", width: "100%" });
  const btnG = { background: C.green, border: "none", borderRadius: 12, padding: 18, color: "#000", fontSize: 17, fontWeight: 700, cursor: "pointer", width: "100%" };
  const row = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", borderBottom: "1px solid #1a1a1a" };

  // ── Calculator ───────────────────────────────────────────
  const renderCalculator = () => (
    <div>
      <div style={{ textAlign: "center", padding: "24px 20px 20px" }}>
        <div style={{ color: C.muted, fontSize: 15, marginBottom: 4 }}>Your 1RM is...</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4 }}>
          <span style={{ fontSize: 88, fontWeight: 800, lineHeight: 1, letterSpacing: -4 }}>{oneRM}</span>
          <span style={{ fontSize: 32, color: C.muted, paddingBottom: 12 }}>{unit}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "0 16px", marginBottom: 10 }}>
        <div style={{ flex: 2 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 5 }}>Weight</div>
          <div style={{ position: "relative" }}>
            <input style={{ ...inp, paddingRight: 38 }} inputMode="decimal" placeholder="0"
              value={weight} onChange={e => setWeight(e.target.value)} />
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 13, fontWeight: 600, pointerEvents: "none" }}>{unit}</span>
          </div>
        </div>
        <div style={{ flex: 1.2 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 5 }}>Reps</div>
          <input style={inp} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0"
            value={reps} onChange={e => setReps(e.target.value.replace(/[^0-9]/g, ""))} />
        </div>
        <div style={{ flex: 1.3 }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 5 }}>RPE</div>
          <div style={{ position: "relative" }}>
            <select style={sel} value={rpe} onChange={e => setRpe(parseFloat(e.target.value))}>
              {RPE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#999", pointerEvents: "none", fontSize: 12 }}>▾</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px", marginBottom: 12, position: "relative" }}>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 5 }}>Exercise</div>
        <div onClick={() => setShowExerciseDropdown(v => !v)}
          style={{ ...inp, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{exercise}</span>
          <span style={{ color: "#999", fontSize: 12 }}>▾</span>
        </div>
        {showExerciseDropdown && (
          <div style={{ position: "absolute", top: "calc(100% - 4px)", left: 16, right: 16, zIndex: 200,
            background: "#2a2a2a", borderRadius: 10, maxHeight: 220, overflowY: "auto",
            border: `1px solid ${C.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.7)" }}>
            {exercises.map(ex => (
              <div key={ex} onClick={() => { setExercise(ex); setShowExerciseDropdown(false); }}
                style={{ padding: "13px 14px", cursor: "pointer", fontSize: 15,
                  borderBottom: "1px solid #333", color: ex === exercise ? C.purple : C.text,
                  background: ex === exercise ? "#1e1a3a" : "transparent" }}>
                {ex}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: "0 16px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
        <button style={btnP} onClick={saveEntry}>Calculate &amp; Save 1RM</button>
        <button style={btnO(C.dim)} onClick={() => { setWeight(""); setReps(""); }}>Clear</button>
      </div>

      <div style={{ padding: "10px 16px 6px" }}>
        <span style={{ color: C.purple, fontSize: 15, cursor: "pointer" }} onClick={() => setShowRPEInfo(true)}>What is RPE?</span>
      </div>

      <div style={{ padding: "6px 16px 10px" }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Estimated Rep Maxes</div>
      </div>
      {REP_PERCENTAGES.filter(r => r.reps > 1).map(({ reps: r, pct }) => (
        <div key={r} style={row}>
          <span style={{ fontSize: 15, color: "#bbb", flex: 1 }}>{r} Reps</span>
          <span style={{ fontSize: 15, flex: 1, textAlign: "center" }}>{oneRM ? `${Math.round(oneRM * pct / 100)} ${unit}` : "—"}</span>
          <span style={{ fontSize: 15, color: C.dim, flex: 1, textAlign: "right" }}>{pct}%</span>
        </div>
      ))}
    </div>
  );

  // ── History ──────────────────────────────────────────────
  const renderHistory = () => (
    <div>
      {history.length === 0 ? (
        <div style={{ textAlign: "center", color: C.dim, padding: 60, fontSize: 15 }}>
          No history yet. Calculate and save your 1RM to see it here.
        </div>
      ) : history.map(entry => (
        <div key={entry.id} onClick={() => goToExercise(entry.exercise)}
          style={{ padding: "14px 16px", borderBottom: "1px solid #1a1a1a", cursor: "pointer", transition: "background 0.1s" }}
          onTouchStart={e => e.currentTarget.style.background = "#161616"}
          onTouchEnd={e => e.currentTarget.style.background = "transparent"}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ display: "inline-block", background: C.purple, color: "#fff",
              fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, marginBottom: 6 }}>
              {entry.exercise}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: C.dim, fontSize: 12 }}>{entry.date}</span>
              <span onClick={e => deleteEntry(entry.id, e)} style={{ color: "#e55", fontSize: 22, lineHeight: 1, cursor: "pointer", padding: "0 4px" }}>×</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2 }}>{entry.oneRM}</span>
              <span style={{ fontSize: 18, color: C.muted }}> {entry.unit}</span>
            </div>
            <span style={{ color: C.dim, fontSize: 24, paddingBottom: 4 }}>›</span>
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 2 }}>
            {[["Weight", `${entry.weight} ${entry.unit}`], ["Reps", entry.reps], ["RPE", entry.rpe]].map(([label, val]) => (
              <div key={label} style={{ color: C.muted, fontSize: 13 }}>
                {label} <span style={{ color: C.text, fontWeight: 600 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // ── Exercise detail ──────────────────────────────────────
  const renderExerciseDetail = () => {
    const unitLabel = exHistory[0]?.unit || unit;
    // Find the most recent entry's rep count and weight to check for PR
    const latestEntry = exHistory[exHistory.length - 1];

    return (
      <div>
        <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSelectedExercise(null)}
              style={{ background: "none", border: "none", color: C.text, fontSize: 22, cursor: "pointer", padding: 0 }}>←</button>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{selectedExercise}</span>
          </div>
          <button onClick={() => { setHistory(prev => prev.filter(h => h.exercise !== selectedExercise)); setSelectedExercise(null); }}
            style={{ background: "none", border: "none", color: "#e55", cursor: "pointer", fontSize: 20 }}>🗑</button>
        </div>

        <div style={{ display: "flex", padding: "12px 16px 0" }}>
          {["Chart", "History"].map(t => (
            <button key={t} onClick={() => setExerciseDetailTab(t)} style={{
              flex: 1, background: "none", border: "none",
              borderBottom: `2px solid ${exerciseDetailTab === t ? C.purple : "transparent"}`,
              color: exerciseDetailTab === t ? C.purple : C.dim,
              padding: "10px 0", fontSize: 16, cursor: "pointer",
              fontWeight: exerciseDetailTab === t ? 600 : 400,
            }}>{t}</button>
          ))}
        </div>

        {exerciseDetailTab === "Chart" ? (
          <div style={{ paddingTop: 16 }}>
            {/* 1RM progress chart */}
            <div style={{ padding: "0 16px 8px" }}>
              <div style={{ fontSize: 13, color: C.muted }}>Estimated 1RM over time</div>
            </div>
            <LineChart data={exHistory} valueKey="oneRM" unitLabel={unitLabel} color={C.purple} bg={C.bg} />

            {/* Rep Max Records */}
            <div style={{ padding: "22px 16px 4px" }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Rep Max Records</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                Your best (heaviest) weight ever lifted at each rep count.
                Each time you lift more at that rep count, the record updates automatically.
              </div>
            </div>

            {REP_RANGE.map(r => {
              const record = repRecords[r];
              // Is the latest entry a NEW record for this rep count?
              const isLatestForThisRep = latestEntry && latestEntry.reps === r;
              const allForThisRep = exHistory.filter(e => e.reps === r);
              const isNewPR = isLatestForThisRep && allForThisRep.length >= 2 && latestEntry.weight === record?.weight;

              return (
                <div key={r} style={{ ...row, background: isNewPR ? "#1a1535" : "transparent" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, color: C.text, fontWeight: 600 }}>{r} Rep{r > 1 ? " Max" : "M"}</div>
                  </div>
                  <div style={{ flex: 1.5, textAlign: "center" }}>
                    {record ? (
                      <span style={{ fontSize: 18, fontWeight: 800, color: C.text }}>
                        {record.weight} <span style={{ fontSize: 13, fontWeight: 500, color: C.muted }}>{record.unit}</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: 15, color: C.dim }}>—</span>
                    )}
                  </div>
                  <div style={{ flex: 1, textAlign: "right" }}>
                    {isNewPR ? (
                      <span style={{ fontSize: 12, color: C.purple, fontWeight: 700 }}>● NEW PR</span>
                    ) : record ? (
                      <span style={{ fontSize: 11, color: C.dim }}>{record.date.slice(0, 10)}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ paddingTop: 8 }}>
            {exHistory.length === 0 ? (
              <div style={{ textAlign: "center", color: C.dim, padding: 40 }}>No entries yet</div>
            ) : [...exHistory].reverse().map(entry => (
              <div key={entry.id} style={{ padding: "14px 16px", borderBottom: "1px solid #1a1a1a" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.dim, fontSize: 12 }}>{entry.date}</span>
                  <span onClick={e => deleteEntry(entry.id, e)} style={{ color: "#e55", fontSize: 22, cursor: "pointer" }}>×</span>
                </div>
                <div>
                  <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2 }}>{entry.oneRM}</span>
                  <span style={{ fontSize: 18, color: C.muted }}> {entry.unit} (est. 1RM)</span>
                </div>
                <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
                  {[["Lifted", `${entry.weight} ${entry.unit}`], ["Reps", entry.reps], ["RPE", entry.rpe]].map(([label, val]) => (
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

  // ── Exercise list ────────────────────────────────────────
  const renderExercise = () => {
    if (selectedExercise) return renderExerciseDetail();
    return (
      <div>
        <div style={{ position: "relative", padding: "12px 16px" }}>
          <span style={{ position: "absolute", left: 28, top: "50%", transform: "translateY(-50%)", color: "#999" }}>🔍</span>
          <input style={{ ...inp, paddingLeft: 40 }} placeholder="Search exercises"
            value={exerciseSearchQuery} onChange={e => setExerciseSearchQuery(e.target.value)} />
        </div>
        {filteredExercises.map(ex => {
          const hasHistory = history.some(h => h.exercise === ex);
          return (
            <div key={ex} onClick={() => { setSelectedExercise(ex); setExerciseDetailTab("Chart"); }}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "16px", borderBottom: "1px solid #1a1a1a", cursor: "pointer" }}>
              <div>
                <span style={{ fontSize: 16 }}>{ex}</span>
                {hasHistory && <span style={{ marginLeft: 8, fontSize: 11, color: C.purple }}>● tracked</span>}
              </div>
              <span style={{ color: C.dim, fontSize: 20 }}>›</span>
            </div>
          );
        })}
        <div style={{ padding: 16, borderTop: "1px solid #1a1a1a", display: "flex", gap: 8, marginTop: 8 }}>
          <input style={{ ...inp, flex: 1 }} placeholder="Add new exercise..."
            value={newExerciseName} onChange={e => setNewExerciseName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addExercise()} />
          <button onClick={addExercise} style={{ ...btnP, width: "auto", padding: "14px 20px" }}>Add</button>
        </div>
      </div>
    );
  };

  // ── Settings ─────────────────────────────────────────────
  const renderSettings = () => (
    <div style={{ padding: 16 }}>

      {/* Units */}
      <div style={{ fontSize: 13, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Units</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        {["kg", "lbs"].map(u => (
          <button key={u} onClick={() => setUnit(u)} style={{
            flex: 1, background: unit === u ? C.purple : C.card,
            border: "none", borderRadius: 10, padding: 16, color: "#fff",
            fontSize: 16, cursor: "pointer", fontWeight: unit === u ? 700 : 400
          }}>{u}</button>
        ))}
      </div>

      {/* Body Weight Tracker */}
      <div style={{ fontSize: 13, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Body Weight</div>
      <div style={{ background: "#161616", borderRadius: 14, padding: 16, marginBottom: 28 }}>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>
          Log your body weight to track it over time
        </div>

        {/* Input row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 5 }}>Weight (kg)</div>
            <div style={{ position: "relative" }}>
              <input style={{ ...inp, paddingRight: 38 }} inputMode="decimal" placeholder="0.0"
                value={bwInput} onChange={e => setBwInput(e.target.value)} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 13, fontWeight: 600, pointerEvents: "none" }}>kg</span>
            </div>
          </div>
          <button onClick={saveBW} style={{ ...btnG, width: "auto", padding: "14px 20px", flexShrink: 0 }}>Save Weight</button>
        </div>

        {/* Latest reading */}
        {bwHistory.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
            background: "#1e1e1e", borderRadius: 10, padding: "10px 14px" }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted }}>Latest</div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
                {bwHistory[bwHistory.length - 1].bodyweight}
                <span style={{ fontSize: 14, color: C.muted, fontWeight: 400 }}> kg</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: C.muted }}>{bwHistory[bwHistory.length - 1].date.slice(0, 10)}</div>
              {bwHistory.length > 1 && (() => {
                const diff = (bwHistory[bwHistory.length - 1].bodyweight - bwHistory[bwHistory.length - 2].bodyweight).toFixed(1);
                const col = parseFloat(diff) < 0 ? C.green : parseFloat(diff) > 0 ? "#e55" : C.muted;
                return <div style={{ fontSize: 14, color: col, fontWeight: 700 }}>{parseFloat(diff) > 0 ? "+" : ""}{diff} kg</div>;
              })()}
            </div>
          </div>
        )}

        {/* Chart */}
        <div style={{ margin: "0 -16px" }}>
          <LineChart data={bwHistory} valueKey="bodyweight" unitLabel="kg" color={C.green} bg={C.bg} />
        </div>

        {/* Log */}
        {bwHistory.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>History</div>
            {[...bwHistory].reverse().slice(0, 10).map(entry => (
              <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid #2a2a2a" }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{entry.bodyweight} kg</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: C.dim }}>{entry.date.slice(0, 10)}</span>
                  <span onClick={() => setBwHistory(prev => prev.filter(e => e.id !== entry.id))}
                    style={{ color: "#e55", fontSize: 18, cursor: "pointer" }}>×</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data management */}
      <div style={{ fontSize: 13, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Data</div>
      <button onClick={() => { if (window.confirm("Clear all lift history?")) setHistory([]); }}
        style={{ ...btnO("#e55"), marginBottom: 10 }}>Clear All Lift History</button>
      <button onClick={() => { if (window.confirm("Clear all body weight history?")) setBwHistory([]); }}
        style={{ ...btnO("#e55"), marginBottom: 10 }}>Clear Body Weight History</button>
      <button onClick={() => { if (window.confirm("Reset exercise list to defaults?")) setExercises(DEFAULT_EXERCISES); }}
        style={{ ...btnO(C.dim), marginBottom: 28 }}>Reset Exercise List</button>

      <div style={{ color: "#333", fontSize: 13, textAlign: "center" }}>
        1RM Calculator · Epley formula (RPE-adjusted)
      </div>
    </div>
  );

  // ── Root ─────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: "100vh", display: "flex", flexDirection: "column", maxWidth: 430, margin: "0 auto" }}>

      {!(tab === "Exercise" && selectedExercise) && (
        <div style={{ padding: "20px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>{tab}</span>
          {tab === "Calculator" && (
            <svg onClick={() => setTab("Settings")} viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth={2} width={24} height={24} style={{ cursor: "pointer" }}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 90 }}>
        {tab === "Calculator" && renderCalculator()}
        {tab === "History" && renderHistory()}
        {tab === "Exercise" && renderExercise()}
        {tab === "Settings" && renderSettings()}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#111", borderTop: `1px solid ${C.border}`, display: "flex", padding: "8px 0 20px" }}>
        {TABS.map(t => (
          <div key={t} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", color: tab === t ? C.purple : C.dim, fontSize: 10, fontWeight: tab === t ? 600 : 400 }}
            onClick={() => { setTab(t); setSelectedExercise(null); }}>
            {TAB_ICONS[t]}
            <span>{t}</span>
          </div>
        ))}
      </div>

      {saveToast && (
        <div style={{ position: "fixed", bottom: 95, left: "50%", transform: "translateX(-50%)", background: "#1c1c1e", color: C.text, padding: "12px 24px", borderRadius: 20, fontSize: 14, fontWeight: 500, border: "1px solid #333", zIndex: 999, whiteSpace: "nowrap" }}>
          ✓ 1RM saved!
        </div>
      )}

      {bwToast && (
        <div style={{ position: "fixed", bottom: 95, left: "50%", transform: "translateX(-50%)", background: "#1c1c1e", color: C.text, padding: "12px 24px", borderRadius: 20, fontSize: 14, fontWeight: 500, border: "1px solid #333", zIndex: 999, whiteSpace: "nowrap" }}>
          ✓ Body weight saved!
        </div>
      )}

      {showRPEInfo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
          onClick={() => setShowRPEInfo(false)}>
          <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 24, maxWidth: 340, width: "100%", border: "1px solid #333" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>What is RPE?</div>
            <div style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7 }}>
              <b style={{ color: C.text }}>Rate of Perceived Exertion (RPE)</b> measures effort on a 1–10 scale.
              <br/><br/>
              <b style={{ color: C.text }}>RPE 10</b> — Could not do another rep<br/>
              <b style={{ color: C.text }}>RPE 9</b> — 1 rep left in the tank<br/>
              <b style={{ color: C.text }}>RPE 8</b> — 2 reps left<br/>
              <b style={{ color: C.text }}>RPE 7</b> — 3 reps left<br/><br/>
              Using RPE gives a more accurate 1RM when not training to failure.
            </div>
            <button style={{ ...btnP, marginTop: 16 }} onClick={() => setShowRPEInfo(false)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
