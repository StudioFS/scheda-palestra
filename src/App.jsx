import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dumbbell, LayoutDashboard, ClipboardList, Timer, Scale,
  BarChart2, Plus, Trash2, Play, Pause, RotateCcw,
  Flame, TrendingUp, Target, CheckCircle2, X, Edit3, Save, Zap, Cloud, CloudOff
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from "recharts";

// ─── THEME ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0a0f", surface: "#111118", card: "#16161f", border: "#1e1e2e",
  accent: "#ffe600", accentDim: "#ffe60022", text: "#e8e8f0", muted: "#5a5a7a",
  danger: "#ff4466", success: "#22dd88", blue: "#3b82f6",
};

// ─── CLOUD STORAGE HOOK ───────────────────────────────────────────────────────
// Usa window.storage (API di storage persistente cross-device degli Artifact di Claude).
// Fallback automatico su localStorage se non disponibile.
const STORE_KEY = "ironprogress-v1";
const defaultData = () => ({
  profile: { name: "Atleta", goalWeight: 75 },
  routine: [], workoutLog: [], weightLog: [], cardioLog: [],
});

function useCloudStore() {
  const [data, setData] = useState(defaultData());
  const [synced, setSynced] = useState(false);
  const [online, setOnline] = useState(true);
  const saveTimeout = useRef(null);

  // Carica i dati all'avvio
  useEffect(() => {
    async function load() {
      try {
        const result = await window.storage.get(STORE_KEY);
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          if (parsed.routine) {
            parsed.routine = parsed.routine.map(e => e.dayId ? e : { ...e, dayId: "day1" });
          }
          setData(d => ({ ...defaultData(), ...parsed }));
        }
        setOnline(true);
      } catch {
        try {
          const ls = localStorage.getItem(STORE_KEY);
          if (ls) setData(d => ({ ...defaultData(), ...JSON.parse(ls) }));
        } catch {}
        setOnline(false);
      } finally {
        setSynced(true);
      }
    }
    load();
  }, []);

  // Salva con debounce ad ogni modifica
  useEffect(() => {
    if (!synced) return;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const str = JSON.stringify(data);
      try {
        await window.storage.set(STORE_KEY, str);
        setOnline(true);
      } catch {
        try { localStorage.setItem(STORE_KEY, str); } catch {}
        setOnline(false);
      }
    }, 600);
    return () => clearTimeout(saveTimeout.current);
  }, [data, synced]);

  const setSlice = useCallback((key) => (valOrFn) => {
    setData(prev => {
      const next = typeof valOrFn === "function" ? valOrFn(prev[key]) : valOrFn;
      return { ...prev, [key]: next };
    });
  }, []);

  return {
    synced, online,
    profile: data.profile,       setProfile: setSlice("profile"),
    routine: data.routine,       setRoutine: setSlice("routine"),
    workoutLog: data.workoutLog, setWorkoutLog: setSlice("workoutLog"),
    weightLog: data.weightLog,   setWeightLog: setSlice("weightLog"),
    cardioLog: data.cardioLog,   setCardioLog: setSlice("cardioLog"),
  };
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const fmt = d => new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });

// ─── GLOBAL STYLES ───────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { background: ${C.bg}; color: ${C.text}; font-family: 'DM Sans', sans-serif; min-height: 100vh; }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: ${C.bg}; }
    ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
    input, select, textarea { outline: none; }
    button { cursor: pointer; border: none; background: none; }
    .iron-num { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.03em; }
    .fade-in { animation: fadeIn 0.25s ease; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
    .pulse-ring { animation: pulseRing 1.5s ease-in-out infinite; }
    @keyframes pulseRing { 0%,100%{box-shadow:0 0 0 0 ${C.accent}44;} 50%{box-shadow:0 0 0 8px transparent;} }
    @keyframes spin { to { transform: rotate(360deg); } }
  `}</style>
);

// ─── BASE COMPONENTS ─────────────────────────────────────────────────────────
const Card = ({ children, style = {}, className = "" }) => (
  <div className={`fade-in ${className}`} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, ...style }}>{children}</div>
);

const Btn = ({ children, onClick, variant = "primary", small = false, style = {}, disabled = false }) => {
  const styles = {
    primary: { background: C.accent, color: "#000", fontWeight: 600 },
    ghost: { background: "transparent", color: C.text, border: `1px solid ${C.border}` },
    danger: { background: `${C.danger}22`, color: C.danger, border: `1px solid ${C.danger}44` },
    success: { background: `${C.success}22`, color: C.success, border: `1px solid ${C.success}44` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant], borderRadius: 10, padding: small ? "6px 14px" : "10px 20px",
      fontSize: small ? 13 : 14, display: "flex", alignItems: "center", gap: 6,
      transition: "all 0.15s", opacity: disabled ? 0.5 : 1, fontFamily: "'DM Sans', sans-serif", ...style
    }}>{children}</button>
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder = "", min, max, step, style = {} }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && <label style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} min={min} max={max} step={step}
      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 15, width: "100%", transition: "border-color 0.15s", ...style }}
      onFocus={e => e.target.style.borderColor = C.accent}
      onBlur={e => e.target.style.borderColor = C.border}
    />
  </div>
);

const StatBox = ({ label, value, unit, icon: Icon, accent = false }) => (
  <Card style={{ flex: 1, minWidth: 120 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
        <div className="iron-num" style={{ fontSize: 32, color: accent ? C.accent : C.text, lineHeight: 1 }}>{value}</div>
        {unit && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{unit}</div>}
      </div>
      {Icon && <div style={{ background: accent ? C.accentDim : `${C.blue}22`, borderRadius: 10, padding: 8 }}>
        <Icon size={18} color={accent ? C.accent : C.blue} />
      </div>}
    </div>
  </Card>
);

// ─── RECOVERY TIMER ──────────────────────────────────────────────────────────
const RecoveryTimer = () => {
  const [seconds, setSeconds] = useState(90);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(90);
  const interval = useRef(null);

  useEffect(() => {
    if (running) {
      interval.current = setInterval(() => {
        setRemaining(r => { if (r <= 1) { clearInterval(interval.current); setRunning(false); return 0; } return r - 1; });
      }, 1000);
    } else clearInterval(interval.current);
    return () => clearInterval(interval.current);
  }, [running]);

  const reset = () => { clearInterval(interval.current); setRunning(false); setRemaining(seconds); };
  const pct = (remaining / seconds) * 100;

  return (
    <Card>
      <div style={{ fontSize: 13, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>⏱ Recovery Timer</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[60, 90, 120, 180].map(p => (
          <button key={p} onClick={() => { setSeconds(p); setRemaining(p); setRunning(false); }} style={{
            flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: seconds === p ? C.accentDim : C.surface, color: seconds === p ? C.accent : C.muted,
            border: `1px solid ${seconds === p ? C.accent : C.border}`, transition: "all 0.15s"
          }}>{p}s</button>
        ))}
      </div>
      <div style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <svg width={120} height={120} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={60} cy={60} r={52} fill="none" stroke={C.border} strokeWidth={8} />
          <circle cx={60} cy={60} r={52} fill="none" stroke={C.accent} strokeWidth={8}
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct / 100)}`}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <div className="iron-num" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 34, color: remaining === 0 ? C.success : C.text }}>
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => setRunning(r => !r)} variant={running ? "ghost" : "primary"} style={{ flex: 1 }}>
          {running ? <><Pause size={16} /> Pausa</> : <><Play size={16} /> Start</>}
        </Btn>
        <Btn onClick={reset} variant="ghost" small><RotateCcw size={16} /></Btn>
      </div>
    </Card>
  );
};

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
const Dashboard = ({ weightLog, workoutLog, profile, setProfile, setTab }) => {
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(profile.goalWeight || "");

  const lastWeight = weightLog.length ? weightLog[weightLog.length - 1].weight : null;
  const goal = profile.goalWeight;
  const diff = lastWeight && goal ? (lastWeight - goal).toFixed(1) : null;

  const thisWeek = workoutLog.filter(w => {
    const d = new Date(w.date); const now = new Date();
    const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1);
    return d >= mon;
  });
  const recentWeight = weightLog.slice(-7).map(w => ({ date: fmt(w.date), weight: w.weight }));
  const totalVol = thisWeek.reduce((s, w) => s + w.sets.reduce((ss, se) => ss + (se.reps * se.weight), 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <div className="iron-num" style={{ fontSize: 28, marginTop: 2 }}>
            Ciao, <span style={{ color: C.accent }}>{profile.name || "Atleta"}</span> 💪
          </div>
        </div>
        <div style={{ background: C.accentDim, borderRadius: 12, padding: "8px 14px", textAlign: "center" }}>
          <Zap size={20} color={C.accent} />
          <div className="iron-num" style={{ fontSize: 20, color: C.accent }}>{thisWeek.length}</div>
          <div style={{ fontSize: 10, color: C.muted }}>sessioni</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatBox label="Peso Attuale" value={lastWeight ?? "—"} unit="kg" icon={Scale} accent />
        <StatBox label="Obiettivo" value={goal ?? "—"} unit="kg" icon={Target} />
        <StatBox label="Volume Sett." value={Math.round(totalVol / 1000)} unit="t totali" icon={TrendingUp} />
      </div>

      {!editGoal ? (
        diff !== null && (
          <Card style={{ background: diff < 0 ? `${C.success}11` : `${C.danger}11`, border: `1px solid ${diff < 0 ? C.success : C.danger}33` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 14, color: diff < 0 ? C.success : C.danger }}>
                {diff < 0 ? "✅ Sotto l'obiettivo di" : "⚠️ Sopra l'obiettivo di"} <strong>{Math.abs(diff)} kg</strong>
              </div>
              <Btn variant="ghost" small onClick={() => setEditGoal(true)}><Edit3 size={14} /> Modifica</Btn>
            </div>
          </Card>
        )
      ) : (
        <Card>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}><Input label="Peso Obiettivo (kg)" type="number" value={goalInput} onChange={setGoalInput} step="0.1" /></div>
            <Btn onClick={() => { setProfile(p => ({ ...p, goalWeight: parseFloat(goalInput) })); setEditGoal(false); }}>
              <Save size={14} /> Salva
            </Btn>
          </div>
        </Card>
      )}

      {recentWeight.length > 1 && (
        <Card>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>📈 Andamento Peso — Ultimi 7 giorni</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={recentWeight}>
              <defs>
                <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
              <Area type="monotone" dataKey="weight" stroke={C.accent} strokeWidth={2.5} fill="url(#wg)" dot={{ fill: C.accent, r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={() => setTab("logger")} style={{ flex: 1, background: C.accent, borderRadius: 14, padding: "14px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <Play size={22} color="#000" />
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, color: "#000", letterSpacing: "0.05em" }}>Inizia Workout</span>
        </button>
        <button onClick={() => setTab("weight")} style={{ flex: 1, background: C.surface, borderRadius: 14, padding: "14px 0", border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <Scale size={22} color={C.accent} />
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, color: C.text, letterSpacing: "0.05em" }}>Log Peso</span>
        </button>
      </div>
    </div>
  );
};

// ─── DAYS CONFIG ─────────────────────────────────────────────────────────────
const DAYS = [
  { id: "day1", label: "DAY 1", title: "Chest + Triceps", emoji: "💪", color: "#ff6b6b" },
  { id: "day2", label: "DAY 2", title: "Back + Biceps",   emoji: "🏋️", color: "#3b82f6" },
  { id: "day3", label: "DAY 3", title: "Shoulders + Abs", emoji: "🔥", color: C.accent },
  { id: "day4", label: "DAY 4", title: "Legs",            emoji: "🦵", color: "#22dd88" },
];

// ─── ROUTINE MANAGER ─────────────────────────────────────────────────────────
const RoutineManager = ({ routine, setRoutine }) => {
  const [activeDay, setActiveDay] = useState("day1");
  const [adding, setAdding] = useState(false);
  const [newEx, setNewEx] = useState({ name: "", sets: 3, reps: 10, notes: "" });

  const dayExercises = routine.filter(e => e.dayId === activeDay);
  const currentDay = DAYS.find(d => d.id === activeDay);

  const add = () => {
    if (!newEx.name.trim()) return;
    setRoutine(r => [...r, { ...newEx, id: uid(), dayId: activeDay, sets: +newEx.sets, reps: +newEx.reps }]);
    setNewEx({ name: "", sets: 3, reps: 10, notes: "" });
    setAdding(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="iron-num" style={{ fontSize: 26 }}>📋 La Mia <span style={{ color: C.accent }}>Scheda</span></div>
        <button onClick={() => { if (window.confirm("Cancellare tutti gli esercizi?")) setRoutine([]); }} style={{ fontSize: 11, color: C.muted, padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.border}` }}>Reset</button>
      </div>

      {/* Day grid 2×2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {DAYS.map(d => {
          const active = activeDay === d.id;
          const count = routine.filter(e => e.dayId === d.id).length;
          return (
            <button key={d.id} onClick={() => { setActiveDay(d.id); setAdding(false); }} style={{
              background: active ? `${d.color}18` : C.card,
              border: `1px solid ${active ? d.color : C.border}`,
              borderRadius: 14, padding: "12px 14px", textAlign: "left",
              transition: "all 0.18s", cursor: "pointer"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontFamily: "'Bebas Neue'", fontSize: 13, color: active ? d.color : C.muted, letterSpacing: "0.08em" }}>{d.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, background: active ? `${d.color}33` : C.surface, color: active ? d.color : C.muted, borderRadius: 6, padding: "2px 7px" }}>{count} ex</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: active ? C.text : C.muted }}>{d.emoji} {d.title}</div>
            </button>
          );
        })}
      </div>

      {/* Active day header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: `${currentDay.color}12`, border: `1px solid ${currentDay.color}44`, borderRadius: 12, padding: "10px 16px" }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 13, color: currentDay.color, letterSpacing: "0.08em" }}>{currentDay.label}</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{currentDay.emoji} {currentDay.title}</div>
        </div>
        <Btn onClick={() => setAdding(a => !a)} small variant={adding ? "ghost" : "primary"}>
          {adding ? <><X size={14} /> Annulla</> : <><Plus size={14} /> Esercizio</>}
        </Btn>
      </div>

      {/* Add form */}
      {adding && (
        <Card style={{ border: `1px solid ${currentDay.color}55` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input label="Nome Esercizio" value={newEx.name} onChange={v => setNewEx(p => ({ ...p, name: v }))} placeholder="es. Bench Press, Skull Crusher..." />
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Serie" type="number" value={newEx.sets} onChange={v => setNewEx(p => ({ ...p, sets: v }))} min={1} max={20} />
              <Input label="Rip. Target" type="number" value={newEx.reps} onChange={v => setNewEx(p => ({ ...p, reps: v }))} min={1} max={100} />
            </div>
            <Input label="Note (opzionale)" value={newEx.notes} onChange={v => setNewEx(p => ({ ...p, notes: v }))} placeholder="es. Presa larga, ROM completo..." />
            <Btn onClick={add} style={{ background: currentDay.color, color: "#000" }}>
              <CheckCircle2 size={16} /> Aggiungi a {currentDay.label}
            </Btn>
          </div>
        </Card>
      )}

      {/* Exercise list */}
      {dayExercises.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 36 }}>
          <Dumbbell size={28} color={C.muted} style={{ margin: "0 auto 10px" }} />
          <div style={{ color: C.muted, fontSize: 14 }}>Nessun esercizio per {currentDay.label}.<br />Aggiungine uno!</div>
        </Card>
      ) : dayExercises.map((ex, i) => (
        <Card key={ex.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ background: `${currentDay.color}22`, borderRadius: 10, padding: "8px 12px", textAlign: "center", minWidth: 44 }}>
            <div className="iron-num" style={{ fontSize: 20, color: currentDay.color, lineHeight: 1 }}>{i + 1}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{ex.name}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{ex.sets} serie × {ex.reps} rip{ex.notes ? ` • ${ex.notes}` : ""}</div>
          </div>
          <Btn variant="danger" small onClick={() => setRoutine(r => r.filter(e => e.id !== ex.id))}>
            <Trash2 size={14} />
          </Btn>
        </Card>
      ))}
    </div>
  );
};

// ─── WORKOUT LOGGER ──────────────────────────────────────────────────────────
const WorkoutLogger = ({ routine, workoutLog, setWorkoutLog }) => {
  const [active, setActive] = useState(null);
  const [sets, setSets] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (running) timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [running]);

  const startSession = (dayId) => {
    const dayRoutine = routine.filter(e => e.dayId === dayId);
    const initialSets = {};
    dayRoutine.forEach(ex => {
      initialSets[ex.id] = Array.from({ length: ex.sets }, () => ({ weight: "", reps: "", done: false }));
    });
    setSets(initialSets); setActive(dayId); setElapsed(0); setRunning(true);
  };

  const updateSet = (exId, si, field, val) =>
    setSets(prev => ({ ...prev, [exId]: prev[exId].map((s, i) => i === si ? { ...s, [field]: val } : s) }));
  const toggleDone = (exId, si) =>
    setSets(prev => ({ ...prev, [exId]: prev[exId].map((s, i) => i === si ? { ...s, done: !s.done } : s) }));

  const finishSession = () => {
    const dayRoutine = routine.filter(e => e.dayId === active);
    const currentDay = DAYS.find(d => d.id === active);
    setWorkoutLog(l => [...l, {
      id: uid(), date: today(), duration: elapsed, dayId: active,
      dayLabel: currentDay ? `${currentDay.label} — ${currentDay.title}` : "",
      sets: dayRoutine.flatMap(ex => (sets[ex.id] || []).filter(s => s.done).map(s => ({
        exercise: ex.name, weight: parseFloat(s.weight) || 0, reps: parseInt(s.reps) || 0
      })))
    }]);
    setActive(null); setRunning(false); setElapsed(0);
  };

  const elFmt = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
  const activeDay = DAYS.find(d => d.id === active);

  if (!active) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="iron-num" style={{ fontSize: 26 }}>🏋️ <span style={{ color: C.accent }}>Workout</span> Logger</div>
      <div style={{ fontSize: 13, color: C.muted }}>Seleziona il giorno di oggi per iniziare:</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {DAYS.map(d => {
          const dayEx = routine.filter(e => e.dayId === d.id);
          const hasEx = dayEx.length > 0;
          return (
            <button key={d.id} onClick={() => hasEx && startSession(d.id)} disabled={!hasEx} style={{
              background: C.card, border: `1px solid ${hasEx ? d.color : C.border}`,
              borderRadius: 14, padding: "14px 16px", textAlign: "left", width: "100%",
              opacity: hasEx ? 1 : 0.45, cursor: hasEx ? "pointer" : "not-allowed",
              display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.18s"
            }}>
              <div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 13, color: d.color, letterSpacing: "0.08em" }}>{d.label}</div>
                <div style={{ fontWeight: 600, fontSize: 16, color: C.text, marginTop: 2 }}>{d.emoji} {d.title}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                  {hasEx ? `${dayEx.length} esercizi` : "Nessun esercizio — aggiungi dalla Scheda"}
                </div>
              </div>
              {hasEx && (
                <div style={{ background: `${d.color}22`, borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                  <Play size={16} color={d.color} />
                  <span style={{ fontFamily: "'Bebas Neue'", fontSize: 16, color: d.color }}>Go</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {workoutLog.length > 0 && (
        <div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Sessioni Recenti</div>
          {[...workoutLog].reverse().slice(0, 4).map(w => {
            const d = DAYS.find(dd => dd.id === w.dayId);
            return (
              <Card key={w.id} style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{fmt(w.date)}</div>
                  <div style={{ fontSize: 12, color: d ? d.color : C.muted, marginTop: 2 }}>{w.dayLabel || "Sessione"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, color: C.muted }}>{w.sets.length} set</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{Math.round(w.duration / 60)} min</div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const sessionRoutine = routine.filter(e => e.dayId === active);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="iron-num" style={{ fontSize: 24 }}>🔥 <span style={{ color: activeDay?.color || C.accent }}>Live</span></div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{activeDay?.emoji} {activeDay?.title}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="iron-num pulse-ring" style={{ fontSize: 22, color: C.accent, background: C.accentDim, padding: "4px 12px", borderRadius: 8 }}>{elFmt}</div>
          <Btn variant="success" small onClick={finishSession}><CheckCircle2 size={16} /> Fine</Btn>
        </div>
      </div>
      <RecoveryTimer />
      {sessionRoutine.map(ex => (
        <Card key={ex.id}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: activeDay?.color || C.accent }}>{ex.name}</div>
          {(sets[ex.id] || []).map((s, si) => (
            <div key={si} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, opacity: s.done ? 0.45 : 1, transition: "opacity 0.2s" }}>
              <div style={{ fontSize: 12, color: C.muted, minWidth: 30 }}>S{si + 1}</div>
              <input type="number" placeholder="kg" value={s.weight} onChange={e => updateSet(ex.id, si, "weight", e.target.value)}
                style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 15, fontFamily: "'Bebas Neue'" }} />
              <span style={{ color: C.muted }}>×</span>
              <input type="number" placeholder="rip" value={s.reps} onChange={e => updateSet(ex.id, si, "reps", e.target.value)}
                style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 15, fontFamily: "'Bebas Neue'" }} />
              <button onClick={() => toggleDone(ex.id, si)} style={{
                width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                background: s.done ? `${C.success}33` : C.surface, border: `1px solid ${s.done ? C.success : C.border}`,
                transition: "all 0.15s", cursor: "pointer"
              }}>
                <CheckCircle2 size={16} color={s.done ? C.success : C.muted} />
              </button>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
};

// ─── WEIGHT & CARDIO ─────────────────────────────────────────────────────────
const WeightCardio = ({ weightLog, setWeightLog, cardioLog, setCardioLog }) => {
  const [wInput, setWInput] = useState("");
  const [cMin, setCMin] = useState("");
  const [cInt, setCInt] = useState("moderata");
  const [cDate, setCDate] = useState(today());
  const [wDate, setWDate] = useState(today());
  const calMap = { leggera: 5, moderata: 8, intensa: 11, "molto intensa": 14 };

  const addWeight = () => {
    if (!wInput) return;
    setWeightLog(l => [...l.filter(e => e.date !== wDate), { date: wDate, weight: parseFloat(wInput) }].sort((a, b) => a.date.localeCompare(b.date)));
    setWInput("");
  };

  const addCardio = () => {
    if (!cMin) return;
    const mins = parseInt(cMin);
    setCardioLog(l => [...l, { id: uid(), date: cDate, minutes: mins, intensity: cInt, kcal: Math.round(mins * calMap[cInt]) }]);
    setCMin("");
  };

  const weekCardio = cardioLog.filter(c => {
    const d = new Date(c.date); const now = new Date();
    const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1); return d >= mon;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="iron-num" style={{ fontSize: 26 }}>⚖️ Peso & <span style={{ color: C.accent }}>Cardio</span></div>
      <div style={{ display: "flex", gap: 12 }}>
        <StatBox label="Kcal Sett." value={weekCardio.reduce((s, c) => s + c.kcal, 0)} unit="kcal" icon={Flame} accent />
        <StatBox label="Sessioni Cardio" value={weekCardio.length} unit="questa settimana" icon={TrendingUp} />
      </div>

      <Card>
        <div style={{ fontSize: 13, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Log Peso Corporeo</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}><Input label="Data" type="date" value={wDate} onChange={setWDate} /></div>
          <div style={{ flex: 1 }}><Input label="Peso (kg)" type="number" value={wInput} onChange={setWInput} step="0.1" placeholder="78.5" /></div>
          <Btn onClick={addWeight}><Plus size={16} /></Btn>
        </div>
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[...weightLog].reverse().slice(0, 5).map((e, i) => (
            <div key={i} style={{ background: C.surface, borderRadius: 8, padding: "6px 12px", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: C.muted }}>{fmt(e.date)}</span>
              <span className="iron-num" style={{ color: C.accent, fontSize: 18 }}>{e.weight}</span>
              <span style={{ fontSize: 11, color: C.muted }}>kg</span>
              <button onClick={() => setWeightLog(l => l.filter(w => w.date !== e.date))} style={{ color: C.muted }}><X size={12} /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 13, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Log Cardio</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}><Input label="Data" type="date" value={cDate} onChange={setCDate} /></div>
            <div style={{ flex: 1 }}><Input label="Minuti" type="number" value={cMin} onChange={setCMin} placeholder="30" /></div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Intensità</label>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {["leggera", "moderata", "intensa", "molto intensa"].map(opt => (
                <button key={opt} onClick={() => setCInt(opt)} style={{
                  flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: cInt === opt ? C.accentDim : C.surface, color: cInt === opt ? C.accent : C.muted,
                  border: `1px solid ${cInt === opt ? C.accent : C.border}`, textTransform: "capitalize", transition: "all 0.15s"
                }}>{opt}</button>
              ))}
            </div>
          </div>
          <Btn onClick={addCardio}><Flame size={16} /> Aggiungi Cardio</Btn>
        </div>
        <div style={{ marginTop: 12 }}>
          {[...cardioLog].reverse().slice(0, 10).map(c => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{fmt(c.date)}</span>
                <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>{c.minutes} min • {c.intensity}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="iron-num" style={{ color: C.accent, fontSize: 18 }}>{c.kcal}</span>
                <span style={{ fontSize: 11, color: C.muted }}>kcal</span>
                <button onClick={() => setCardioLog(l => l.filter(e => e.id !== c.id))} style={{ color: C.muted }}><X size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ─── PROGRESS ────────────────────────────────────────────────────────────────
const Progress = ({ workoutLog, weightLog }) => {
  const exerciseNames = [...new Set(workoutLog.flatMap(w => w.sets.map(s => s.exercise)))];
  const [selEx, setSelEx] = useState(exerciseNames[0] || "");

  const strengthData = workoutLog
    .filter(w => w.sets.some(s => s.exercise === selEx))
    .map(w => {
      const exSets = w.sets.filter(s => s.exercise === selEx);
      return { date: fmt(w.date), maxWeight: Math.max(...exSets.map(s => s.weight)), volume: exSets.reduce((s, e) => s + e.weight * e.reps, 0) };
    });

  const weightData = weightLog.slice(-30).map(w => ({ date: fmt(w.date), weight: w.weight }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="iron-num" style={{ fontSize: 26 }}>📊 <span style={{ color: C.accent }}>Progressi</span></div>
      {weightData.length > 1 && (
        <Card>
          <div style={{ fontSize: 13, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Andamento Peso</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weightData}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
              <Line type="monotone" dataKey="weight" stroke={C.accent} strokeWidth={2.5} dot={{ fill: C.accent, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
      <Card>
        <div style={{ fontSize: 13, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Progressive Overload</div>
        {exerciseNames.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: C.muted }}>Completa sessioni per vedere i progressi.</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {exerciseNames.map(e => (
                <button key={e} onClick={() => setSelEx(e)} style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: selEx === e ? C.accentDim : C.surface, color: selEx === e ? C.accent : C.muted,
                  border: `1px solid ${selEx === e ? C.accent : C.border}`, transition: "all 0.15s"
                }}>{e}</button>
              ))}
            </div>
            {strengthData.length > 1 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={strengthData}>
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
                  <Line type="monotone" dataKey="maxWeight" name="Peso Max (kg)" stroke={C.accent} strokeWidth={2.5} dot={{ fill: C.accent, r: 4 }} />
                  <Line type="monotone" dataKey="volume" name="Volume" stroke={C.blue} strokeWidth={2} dot={{ fill: C.blue, r: 3 }} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: "center", padding: 30, color: C.muted }}>Servono almeno 2 sessioni con "{selEx}".</div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

// ─── APP SHELL ───────────────────────────────────────────────────────────────
export default function IronProgress() {
  const [tab, setTab] = useState("dashboard");
  const store = useCloudStore();

  const tabs = [
    { id: "dashboard", icon: LayoutDashboard, label: "Home" },
    { id: "routine",   icon: ClipboardList,   label: "Scheda" },
    { id: "logger",    icon: Timer,            label: "Workout" },
    { id: "weight",    icon: Scale,            label: "Peso" },
    { id: "progress",  icon: BarChart2,        label: "Progressi" },
  ];

  // Loading splash
  if (!store.synced) return (
    <>
      <GlobalStyles />
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, background: C.bg }}>
        <div style={{ background: C.accent, borderRadius: 14, padding: "10px 22px" }}>
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: "#000", letterSpacing: "0.05em" }}>IRON PROGRESS</span>
        </div>
        <div style={{ color: C.muted, fontSize: 14 }}>Caricamento dati…</div>
        <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    </>
  );

  return (
    <>
      <GlobalStyles />
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", background: C.bg }}>

        {/* TOP BAR */}
        <div style={{ padding: "14px 20px 10px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}`, background: C.surface, position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ background: C.accent, borderRadius: 10, padding: "4px 10px" }}>
            <span style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: "#000", letterSpacing: "0.05em" }}>IRON</span>
          </div>
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: "0.05em", color: C.text }}>PROGRESS</span>
          <div style={{ flex: 1 }} />
          {/* Sync indicator */}
          <div title={store.online ? "Dati sincronizzati nel cloud" : "Salvataggio locale"}>
            {store.online
              ? <Cloud size={16} color={C.success} />
              : <CloudOff size={16} color={C.muted} />
            }
          </div>
          <Dumbbell size={20} color={C.accent} />
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, padding: "20px 16px 100px", overflowY: "auto" }}>
          {tab === "dashboard" && <Dashboard weightLog={store.weightLog} workoutLog={store.workoutLog} profile={store.profile} setProfile={store.setProfile} setTab={setTab} />}
          {tab === "routine"   && <RoutineManager routine={store.routine} setRoutine={store.setRoutine} />}
          {tab === "logger"    && <WorkoutLogger routine={store.routine} workoutLog={store.workoutLog} setWorkoutLog={store.setWorkoutLog} />}
          {tab === "weight"    && <WeightCardio weightLog={store.weightLog} setWeightLog={store.setWeightLog} cardioLog={store.cardioLog} setCardioLog={store.setCardioLog} />}
          {tab === "progress"  && <Progress workoutLog={store.workoutLog} weightLog={store.weightLog} />}
        </div>

        {/* BOTTOM NAV */}
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", padding: "8px 0 12px", zIndex: 20 }}>
          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 0", cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ padding: "6px 14px", borderRadius: 10, background: active ? C.accentDim : "transparent", transition: "all 0.15s" }}>
                  <t.icon size={20} color={active ? C.accent : C.muted} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: active ? C.accent : C.muted, letterSpacing: "0.04em" }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
