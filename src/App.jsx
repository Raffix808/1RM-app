import { useState, useEffect } from "react";

const DEFAULT_EXERCISES = [
  "Bicep Curl Barbell", "Cable Row", "Incline Bench", "Bench Press",
  "Squat", "Deadlift", "Overhead Press", "Lat Pulldown",
  "Incline Bench Press", "Leg Press", "Romanian Deadlift", "Pull Up",
  "Barbell Row", "Dumbbell Press", "Tricep Pushdown"
];

const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

// Epley formula adjusted by RPE
function calc1RM(weight, reps, rpe) {
  // Adjust reps for RPE (reps in reserve = 10 - rpe)
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
      <path d="M2 12c0-5.5 4.5-10 10-10" strokeDasharray="3 3"/>
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

export default function App() {
  const [tab, setTab] = useState("Calculator");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState(10);
  const [exercise, setExercise] = useState("Bench Press");
  const [exercises, setExercises] = useState(DEFAULT_EXERCISES);
  const [history, setHistory] = useState([]);
  const [unit, setUnit] = useState("kg");
  const [showRPEInfo, setShowRPEInfo] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [exerciseHistoryTab, setExerciseHistoryTab] = useState("History");
  const [saveToast, setSaveToast] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);

  // Load from storage
  useEffect(() => {
    (async () => {
      try {
        const h = await window.storage.get("history");
        if (h) setHistory(JSON.parse(h.value));
      } catch {}
      try {
        const e = await window.storage.get("exercises");
        if (e) setExercises(JSON.parse(e.value));
      } catch {}
      try {
        const u = await window.storage.get("unit");
        if (u) setUnit(u.value);
      } catch {}
    })();
  }, []);

  const oneRM = weight && reps ? calc1RM(parseFloat(weight), parseInt(reps), rpe) : 0;

  const saveHistory = async () => {
    if (!weight || !reps || !oneRM) return;
    const entry = {
      id: Date.now(),
      exercise,
      weight: parseFloat(weight),
      reps: parseInt(reps),
      rpe,
      oneRM,
      unit,
      date: new Date().toLocaleString("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).replace("T", " ")
    };
    const newHistory = [entry, ...history];
    setHistory(newHistory);
    await window.storage.set("history", JSON.stringify(newHistory));
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const deleteHistory = async (id) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    await window.storage.set("history", JSON.stringify(newHistory));
  };

  const exerciseHistory = selectedExercise
    ? history.filter(h => h.exercise === selectedExercise)
    : [];

  const deleteExerciseHistory = async (id) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    await window.storage.set("history", JSON.stringify(newHistory));
    if (newHistory.filter(h => h.exercise === selectedExercise).length === 0) {
      setSelectedExercise(null);
    }
  };

  const filteredExercises = exercises.filter(e =>
    e.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
  );

  const addExercise = async () => {
    if (!newExerciseName.trim()) return;
    const updated = [...exercises, newExerciseName.trim()];
    setExercises(updated);
    await window.storage.set("exercises", JSON.stringify(updated));
    setNewExerciseName("");
  };

  const s = {
    app: {
      background: "#0a0a0a",
      color: "#ffffff",
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      maxWidth: 430,
      margin: "0 auto",
      position: "relative",
      overflow: "hidden"
    },
    header: {
      padding: "20px 20px 12px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 700,
      letterSpacing: -0.5
    },
    content: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: 80
    },
    tabBar: {
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 430,
      background: "#111",
      borderTop: "1px solid #222",
      display: "flex",
      padding: "8px 0 16px"
    },
    tabItem: (active) => ({
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      cursor: "pointer",
      color: active ? "#7c6ff7" : "#555",
      fontSize: 11,
      fontWeight: active ? 600 : 400,
      transition: "color 0.2s"
    }),
    oneRMDisplay: {
      textAlign: "center",
      padding: "24px 20px 16px"
    },
    oneRMLabel: { color: "#888", fontSize: 15, marginBottom: 4 },
    oneRMValue: {
      fontSize: 88,
      fontWeight: 800,
      lineHeight: 1,
      letterSpacing: -4
    },
    oneRMUnit: { fontSize: 32, fontWeight: 400, color: "#aaa" },
    inputRow: {
      display: "flex",
      gap: 8,
      padding: "0 16px",
      marginBottom: 8
    },
    input: {
      background: "#1c1c1e",
      border: "none",
      borderRadius: 10,
      padding: "14px 14px",
      color: "#fff",
      fontSize: 16,
      outline: "none",
      width: "100%",
    },
    inputLabel: { color: "#888", fontSize: 12, marginBottom: 4 },
    inputWrap: (flex = 1) => ({ flex, display: "flex", flexDirection: "column" }),
    select: {
      background: "#1c1c1e",
      border: "none",
      borderRadius: 10,
      padding: "14px 10px",
      color: "#fff",
      fontSize: 16,
      outline: "none",
      width: "100%",
      appearance: "none",
      cursor: "pointer"
    },
    exerciseInput: {
      background: "#1c1c1e",
      border: "none",
      borderRadius: 10,
      padding: "10px 14px 14px",
      color: "#fff",
      fontSize: 17,
      outline: "none",
      width: "100%",
      cursor: "pointer"
    },
    btn: {
      background: "#7c6ff7",
      border: "none",
      borderRadius: 12,
      padding: "18px",
      color: "#fff",
      fontSize: 17,
      fontWeight: 600,
      cursor: "pointer",
      width: "100%",
      letterSpacing: -0.3
    },
    btnSecondary: (active) => ({
      background: "#1c1c1e",
      border: active ? "1px solid #7c6ff7" : "1px solid transparent",
      borderRadius: 12,
      padding: "18px",
      color: active ? "#7c6ff7" : "#555",
      fontSize: 17,
      fontWeight: 500,
      cursor: "pointer",
      width: "100%"
    }),
    section: { padding: "0 16px", marginBottom: 16 },
    link: { color: "#7c6ff7", fontSize: 15, cursor: "pointer", fontWeight: 500 },
    divider: { height: 1, background: "#222", margin: "0 16px" },
    repTable: { padding: "0 16px" },
    repRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 0",
      borderBottom: "1px solid #1a1a1a"
    },
    repLabel: { fontSize: 15, color: "#bbb", flex: 1 },
    repValue: { fontSize: 15, color: "#fff", flex: 1, textAlign: "center" },
    repPct: { fontSize: 15, color: "#666", flex: 1, textAlign: "right" },
    historyItem: {
      padding: "16px 16px",
      borderBottom: "1px solid #1a1a1a"
    },
    badge: {
      display: "inline-block",
      background: "#7c6ff7",
      color: "#fff",
      fontSize: 12,
      fontWeight: 600,
      padding: "3px 10px",
      borderRadius: 20,
      marginBottom: 8
    },
    historyDate: { color: "#555", fontSize: 12, float: "right" },
    historyRM: { fontSize: 44, fontWeight: 800, letterSpacing: -2, lineHeight: 1.1 },
    historyUnit: { fontSize: 18, color: "#888" },
    historyMeta: { display: "flex", gap: 20, marginTop: 6 },
    historyMetaItem: { color: "#888", fontSize: 13 },
    historyMetaValue: { color: "#fff", fontWeight: 600, fontSize: 14 },
    exerciseRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 16px",
      borderBottom: "1px solid #1a1a1a",
      cursor: "pointer"
    },
    exerciseName: { fontSize: 16, color: "#fff" },
    chevron: { color: "#444", fontSize: 18 },
    searchBox: {
      background: "#1c1c1e",
      border: "none",
      borderRadius: 10,
      padding: "12px 14px 12px 40px",
      color: "#fff",
      fontSize: 15,
      outline: "none",
      width: "100%"
    },
    toast: {
      position: "fixed",
      bottom: 90,
      left: "50%",
      transform: "translateX(-50%)",
      background: "#1c1c1e",
      color: "#fff",
      padding: "12px 24px",
      borderRadius: 20,
      fontSize: 14,
      fontWeight: 500,
      border: "1px solid #333",
      zIndex: 999,
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
    },
    modalOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 20
    },
    modal: {
      background: "#1a1a1a",
      borderRadius: 16,
      padding: 24,
      maxWidth: 340,
      width: "100%",
      border: "1px solid #333"
    }
  };

  const renderCalculator = () => (
    <div>
      <div style={s.oneRMDisplay}>
        <div style={s.oneRMLabel}>Your 1RM is...</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4 }}>
          <span style={s.oneRMValue}>{oneRM}</span>
          <span style={{ ...s.oneRMUnit, paddingBottom: 12 }}>{unit}</span>
        </div>
      </div>

      <div style={s.inputRow}>
        <div style={s.inputWrap(2)}>
          <div style={s.inputLabel}>Weight</div>
          <div style={{ position: "relative" }}>
            <input
              style={{ ...s.input, paddingRight: 36 }}
              type="number"
              placeholder="0"
              value={weight}
              onChange={e => setWeight(e.target.value)}
            />
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: 14 }}>{unit}</span>
          </div>
        </div>
        <div style={s.inputWrap(1.2)}>
          <div style={s.inputLabel}>Rep</div>
          <input
            style={s.input}
            type="number"
            placeholder="0"
            value={reps}
            onChange={e => setReps(e.target.value)}
          />
        </div>
        <div style={s.inputWrap(1.3)}>
          <div style={{ ...s.inputLabel, display: "flex", alignItems: "center", gap: 4 }}>
            RPE
          </div>
          <div style={{ position: "relative" }}>
            <select
              style={s.select}
              value={rpe}
              onChange={e => setRpe(parseFloat(e.target.value))}
            >
              {RPE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#555", pointerEvents: "none" }}>▾</span>
          </div>
        </div>
      </div>

      <div style={{ ...s.section, position: "relative" }}>
        <div style={s.inputLabel}>Exercise</div>
        <div
          style={{ ...s.exerciseInput, cursor: "pointer" }}
          onClick={() => setShowExerciseDropdown(!showExerciseDropdown)}
        >
          {exercise}
        </div>
        {showExerciseDropdown && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
            background: "#1c1c1e", borderRadius: 10, maxHeight: 200, overflowY: "auto",
            border: "1px solid #333", margin: "0 16px"
          }}>
            {exercises.map(ex => (
              <div
                key={ex}
                onClick={() => { setExercise(ex); setShowExerciseDropdown(false); }}
                style={{
                  padding: "12px 14px", cursor: "pointer", fontSize: 15,
                  borderBottom: "1px solid #2a2a2a",
                  color: ex === exercise ? "#7c6ff7" : "#fff",
                  background: ex === exercise ? "#1e1a3a" : "transparent"
                }}
              >{ex}</div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        <button style={s.btn} onClick={() => {/* calc is live */}}>Calculate 1RM</button>
        <button style={s.btnSecondary(!!oneRM)} onClick={saveHistory}>Save History</button>
      </div>

      <div style={s.section}>
        <span style={s.link} onClick={() => setShowRPEInfo(true)}>What is RPE?</span>
      </div>

      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Estimated Rep Maxes</div>
      </div>
      <div style={s.repTable}>
        {REP_PERCENTAGES.filter(r => r.reps > 1).map(({ reps: r, pct }) => (
          <div key={r} style={s.repRow}>
            <span style={s.repLabel}>{r} Reps</span>
            <span style={s.repValue}>{oneRM ? Math.round(oneRM * pct / 100) + " " + unit : "-"}</span>
            <span style={s.repPct}>{pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div>
      {history.length === 0 ? (
        <div style={{ textAlign: "center", color: "#555", padding: 60, fontSize: 15 }}>
          No history yet. Calculate and save your 1RM to see it here.
        </div>
      ) : history.map(entry => (
        <div key={entry.id} style={s.historyItem}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={s.badge}>{entry.exercise}</span>
            <span style={s.historyDate}>{entry.date}</span>
          </div>
          <div>
            <span style={s.historyRM}>{entry.oneRM}</span>
            <span style={s.historyUnit}>{entry.unit}</span>
          </div>
          <div style={s.historyMeta}>
            <div style={s.historyMetaItem}>Weight <span style={s.historyMetaValue}>{entry.weight.toFixed(1)}</span></div>
            <div style={s.historyMetaItem}>Rep <span style={s.historyMetaValue}>{entry.reps}</span></div>
            <div style={s.historyMetaItem}>RPE <span style={s.historyMetaValue}>{entry.rpe}</span></div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderExercise = () => {
    if (selectedExercise) {
      const exHistory = history.filter(h => h.exercise === selectedExercise);
      return (
        <div>
          <div style={{ ...s.header, paddingBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setSelectedExercise(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}>←</button>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{selectedExercise}</span>
            </div>
            <button
              onClick={async () => {
                const newHistory = history.filter(h => h.exercise !== selectedExercise);
                setHistory(newHistory);
                await window.storage.set("history", JSON.stringify(newHistory));
                setSelectedExercise(null);
              }}
              style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 20 }}
            >🗑</button>
          </div>
          <div style={{ display: "flex", padding: "12px 16px" }}>
            {["Chart", "History"].map(t => (
              <button key={t} onClick={() => setExerciseHistoryTab(t)} style={{
                flex: 1, background: "none", border: "none", borderBottom: `2px solid ${exerciseHistoryTab === t ? "#7c6ff7" : "transparent"}`,
                color: exerciseHistoryTab === t ? "#7c6ff7" : "#555", padding: "10px 0", fontSize: 16, cursor: "pointer", fontWeight: exerciseHistoryTab === t ? 600 : 400
              }}>{t}</button>
            ))}
          </div>
          {exerciseHistoryTab === "Chart" ? (
            <div style={{ padding: "0 16px" }}>
              {exHistory.length > 1 ? (
                <div>
                  <div style={{ color: "#888", fontSize: 13, marginBottom: 12 }}>1RM over time</div>
                  <div style={{ position: "relative", height: 160, background: "#1a1a1a", borderRadius: 10, padding: "12px 8px" }}>
                    <svg width="100%" height="100%" style={{ overflow: "visible" }}>
                      {(() => {
                        const pts = exHistory.slice().reverse();
                        const maxRM = Math.max(...pts.map(p => p.oneRM));
                        const minRM = Math.min(...pts.map(p => p.oneRM));
                        const range = maxRM - minRM || 1;
                        const w = 100, h = 100;
                        const coords = pts.map((p, i) => ({
                          x: (i / (pts.length - 1)) * w,
                          y: h - ((p.oneRM - minRM) / range) * h
                        }));
                        const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x}%,${c.y}%`).join(" ");
                        return (
                          <>
                            <path d={pathD} fill="none" stroke="#7c6ff7" strokeWidth="2"/>
                            {coords.map((c, i) => (
                              <circle key={i} cx={`${c.x}%`} cy={`${c.y}%`} r="4" fill="#7c6ff7"/>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#555", fontSize: 11, marginTop: 4 }}>
                    <span>{exHistory[exHistory.length - 1]?.date.split(" ")[0]}</span>
                    <span>{exHistory[0]?.date.split(" ")[0]}</span>
                  </div>
                </div>
              ) : (
                <div style={{ color: "#555", textAlign: "center", padding: 40 }}>Need at least 2 entries to show chart</div>
              )}
              <div style={{ marginTop: 16 }}>
                {REP_PERCENTAGES.map(({ reps: r, pct }) => {
                  const best = exHistory.length ? Math.max(...exHistory.map(e => e.oneRM)) : 0;
                  return (
                    <div key={r} style={s.repRow}>
                      <span style={s.repLabel}>{r} Reps</span>
                      <span style={s.repValue}>{best ? Math.round(best * pct / 100) + " " + (exHistory[0]?.unit || unit) : "-"}</span>
                      <span style={s.repPct}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              {exHistory.map(entry => (
                <div key={entry.id} style={s.historyItem}>
                  <div style={{ color: "#555", fontSize: 12, marginBottom: 4 }}>{entry.date}</div>
                  <div>
                    <span style={s.historyRM}>{entry.oneRM}</span>
                    <span style={s.historyUnit}>{entry.unit}</span>
                  </div>
                  <div style={s.historyMeta}>
                    <div style={s.historyMetaItem}>Weight <span style={s.historyMetaValue}>{entry.weight.toFixed(1)}</span></div>
                    <div style={s.historyMetaItem}>Rep <span style={s.historyMetaValue}>{entry.reps}</span></div>
                    <div style={s.historyMetaItem}>RPE <span style={s.historyMetaValue}>{entry.rpe}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        <div style={{ position: "relative", padding: "12px 16px" }}>
          <span style={{ position: "absolute", left: 28, top: "50%", transform: "translateY(-50%)", color: "#555" }}>🔍</span>
          <input
            style={s.searchBox}
            placeholder="Search"
            value={exerciseSearchQuery}
            onChange={e => setExerciseSearchQuery(e.target.value)}
          />
        </div>
        {filteredExercises.map(ex => (
          <div key={ex} style={s.exerciseRow} onClick={() => setSelectedExercise(ex)}>
            <span style={s.exerciseName}>{ex}</span>
            <span style={s.chevron}>›</span>
          </div>
        ))}
        <div style={{ padding: 16, borderTop: "1px solid #1a1a1a", display: "flex", gap: 8 }}>
          <input
            style={{ ...s.input, flex: 1 }}
            placeholder="Add custom exercise..."
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
      <div style={{ fontSize: 14, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Units</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {["kg", "lbs"].map(u => (
          <button key={u} onClick={async () => { setUnit(u); await window.storage.set("unit", u); }}
            style={{ flex: 1, background: unit === u ? "#7c6ff7" : "#1c1c1e", border: "none", borderRadius: 10, padding: 16, color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: unit === u ? 700 : 400 }}>
            {u}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 14, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Data</div>
      <button
        onClick={async () => {
          if (confirm("Clear all history?")) {
            setHistory([]);
            await window.storage.set("history", JSON.stringify([]));
          }
        }}
        style={{ ...s.btnSecondary(false), color: "#e55", borderColor: "#e55", marginBottom: 10 }}
      >Clear All History</button>

      <div style={{ marginTop: 32, color: "#333", fontSize: 13, textAlign: "center" }}>
        1RM Calculator<br/>
        <span style={{ color: "#2a2a2a" }}>Formula: Epley (RPE-adjusted)</span>
      </div>
    </div>
  );

  return (
    <div style={s.app}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.headerTitle}>
          {tab === "Exercise" && selectedExercise ? "" : tab}
        </span>
        {tab === "Calculator" && (
          <svg viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth={2} width={24} height={24} style={{ cursor: "pointer" }} onClick={() => setTab("Settings")}>
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        )}
      </div>

      <div style={s.content}>
        {tab === "Calculator" && renderCalculator()}
        {tab === "History" && renderHistory()}
        {tab === "Exercise" && renderExercise()}
        {tab === "Settings" && renderSettings()}
      </div>

      {/* Tab Bar */}
      <div style={s.tabBar}>
        {TABS.map(t => (
          <div key={t} style={s.tabItem(tab === t)} onClick={() => { setTab(t); setSelectedExercise(null); }}>
            {TAB_ICONS[t]}
            <span>{t}</span>
          </div>
        ))}
      </div>

      {/* Toast */}
      {saveToast && <div style={s.toast}>✓ Your 1RM is saved</div>}

      {/* RPE Modal */}
      {showRPEInfo && (
        <div style={s.modalOverlay} onClick={() => setShowRPEInfo(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>What is RPE?</div>
            <div style={{ color: "#aaa", fontSize: 14, lineHeight: 1.6 }}>
              <b style={{ color: "#fff" }}>Rate of Perceived Exertion (RPE)</b> is a scale from 1–10 that measures how hard you're working relative to your max effort.
              <br/><br/>
              <b style={{ color: "#fff" }}>RPE 10</b> = Maximum effort, you could not do another rep<br/>
              <b style={{ color: "#fff" }}>RPE 9</b> = Could do 1 more rep<br/>
              <b style={{ color: "#fff" }}>RPE 8</b> = Could do 2 more reps<br/>
              <b style={{ color: "#fff" }}>RPE 7</b> = Could do 3 more reps<br/><br/>
              Using RPE makes your 1RM estimate more accurate when you're not training to failure.
            </div>
            <button style={{ ...s.btn, marginTop: 16 }} onClick={() => setShowRPEInfo(false)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
