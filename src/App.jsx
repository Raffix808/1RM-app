import { useState, useEffect } from "react";

// ── Constants ─────────────────────────────────────────────
const DEFAULT_EXERCISES = [
  "Bicep Curl Barbell","Cable Row","Incline Bench","Bench Press",
  "Squat","Deadlift","Overhead Press","Lat Pulldown",
  "Incline Bench Press","Leg Press","Romanian Deadlift","Pull Up",
  "Barbell Row","Dumbbell Press","Tricep Pushdown"
];
const REP_RANGE = [1,2,3,4,5,6,7,8,9,10,11,12];
const TABS = ["Calculator","History","Exercise","Body"];
const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const REP_PERCENTAGES = [
  {reps:1,pct:100},{reps:2,pct:96},{reps:3,pct:92},
  {reps:4,pct:89},{reps:5,pct:86},{reps:6,pct:84},
  {reps:7,pct:81},{reps:8,pct:79},{reps:9,pct:76},
  {reps:10,pct:74},{reps:11,pct:72},{reps:12,pct:70}
];

// ── Helpers ───────────────────────────────────────────────
function lsGet(k,fb){try{const v=localStorage.getItem(k);return v!==null?JSON.parse(v):fb;}catch{return fb;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}
function todayKey(){const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;}
function fmtDateKey(dk){const n=new Date();return `${dk} ${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;}
function calc1RM(w,r){if(r<=1)return w;return Math.round(w*(1+r/30));}
function calcVolume(sets){return sets.reduce((a,s)=>a+s.weight*s.reps,0);}

function getRepRecords(workouts){
  const rec={};
  for(const w of workouts) for(const s of w.sets){
    const r=s.reps;
    if(!REP_RANGE.includes(r))continue;
    if(!rec[r]||s.weight>rec[r].weight) rec[r]={weight:s.weight,unit:w.unit,date:w.dateKey};
  }
  return rec;
}

function calcBodyFat(gender,waist,neck,height,hips=0){
  if(gender==="male"){if(waist<=neck)return null;return 86.010*Math.log10(waist-neck)-70.041*Math.log10(height)+36.76;}
  if(waist+hips<=neck)return null;
  return 163.205*Math.log10(waist+hips-neck)-97.684*Math.log10(height)-78.387;
}
function bfCategory(gender,bf){
  if(gender==="male"){
    if(bf<6)return{label:"Essential Fat",color:"#a78bfa"};
    if(bf<14)return{label:"Athletic",color:"#4ade80"};
    if(bf<18)return{label:"Fitness",color:"#86efac"};
    if(bf<25)return{label:"Average",color:"#fbbf24"};
    return{label:"Obese",color:"#f87171"};
  }
  if(bf<14)return{label:"Essential Fat",color:"#a78bfa"};
  if(bf<21)return{label:"Athletic",color:"#4ade80"};
  if(bf<25)return{label:"Fitness",color:"#86efac"};
  if(bf<32)return{label:"Average",color:"#fbbf24"};
  return{label:"Obese",color:"#f87171"};
}

// ── SVG Icons ─────────────────────────────────────────────
const IconCalc=(
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={22} height={22}>
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/>
    <line x1="8" y1="14" x2="12" y2="14"/>
  </svg>
);
const IconHistory=(
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={22} height={22}>
    <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
  </svg>
);
const IconDumbbell=(
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={22} height={22}>
    <rect x="1" y="10" width="4" height="4" rx="1"/>
    <rect x="19" y="10" width="4" height="4" rx="1"/>
    <rect x="4" y="8" width="3" height="8" rx="1"/>
    <rect x="17" y="8" width="3" height="8" rx="1"/>
    <line x1="7" y1="12" x2="17" y2="12" strokeWidth={2.5}/>
  </svg>
);
const IconBody=(
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={22} height={22}>
    <circle cx="12" cy="4" r="2"/>
    <path d="M12 6v5M9 8l-3 4h3l-1 6h8l-1-6h3l-3-4"/>
    <path d="M9 13l-2 2M15 13l2 2"/>
  </svg>
);
const IconSettings=(
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={22} height={22}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

const TAB_ICONS={Calculator:IconCalc,History:IconHistory,Exercise:IconDumbbell,Body:IconBody};

// ── Line Chart ────────────────────────────────────────────
function LineChart({data,valueKey,color="#7c6ff7",unitLabel="",formatVal}){
  if(!data||data.length<2)return(
    <div style={{color:"#555",textAlign:"center",padding:"22px 0",fontSize:13}}>
      Save at least 2 entries to see the chart
    </div>
  );
  const W=320,H=140,PX=24,PY=18;
  const vals=data.map(d=>d[valueKey]);
  const maxV=Math.max(...vals),minV=Math.min(...vals),range=maxV-minV||1;
  const toX=i=>PX+(i/(data.length-1))*(W-PX*2);
  const toY=v=>PY+(1-(v-minV)/range)*(H-PY*2);
  const pts=data.map((d,i)=>({x:toX(i),y:toY(d[valueKey]),d}));
  const pathD=pts.map((p,i)=>`${i===0?"M":"L"}${p.x},${p.y}`).join(" ");
  const areaD=`${pathD} L${pts[pts.length-1].x},${H-PY} L${pts[0].x},${H-PY} Z`;
  const gid=`gl${color.replace(/[^a-z0-9]/gi,"")}`;
  const fmt=formatVal||(v=>`${v}${unitLabel}`);
  return(
    <div style={{background:"#161616",borderRadius:12,padding:"14px 6px 12px"}}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gid})`}/>
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
        {pts.map((p,i)=>(
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4.5" fill={color} stroke="#0a0a0a" strokeWidth="2"/>
            {(i===0||i===pts.length-1)&&(
              <text x={p.x} y={p.y-9} textAnchor="middle" fill={color} fontSize="10" fontWeight="700">
                {fmt(p.d[valueKey])}
              </text>
            )}
          </g>
        ))}
        <text x={pts[0].x} y={H-1} textAnchor="middle" fill="#555" fontSize="8">{data[0].dateKey}</text>
        <text x={pts[pts.length-1].x} y={H-1} textAnchor="middle" fill="#555" fontSize="8">{data[data.length-1].dateKey}</text>
      </svg>
    </div>
  );
}

// ── Bar Chart ─────────────────────────────────────────────
function BarChart({data,valueKey,color="#4ade80",unitLabel="",formatVal}){
  if(!data||data.length<2)return(
    <div style={{color:"#555",textAlign:"center",padding:"22px 0",fontSize:13}}>
      Save at least 2 sessions to see the chart
    </div>
  );
  const W=320,H=140,PX=8,PY=20,GAP=4;
  const vals=data.map(d=>d[valueKey]);
  const maxV=Math.max(...vals)||1;
  const barW=Math.max(4,(W-PX*2-(data.length-1)*GAP)/data.length);
  const fmt=formatVal||(v=>`${v}${unitLabel}`);
  return(
    <div style={{background:"#161616",borderRadius:12,padding:"14px 6px 12px"}}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
        {data.map((d,i)=>{
          const bh=(d[valueKey]/maxV)*(H-PY-8);
          const x=PX+i*(barW+GAP),y=H-PY-bh;
          return(
            <g key={i}>
              <rect x={x} y={y} width={barW} height={bh} rx="3" fill={color} fillOpacity="0.85"/>
              {(i===0||i===data.length-1)&&(
                <text x={x+barW/2} y={y-4} textAnchor="middle" fill={color} fontSize="9" fontWeight="700">
                  {fmt(d[valueKey])}
                </text>
              )}
              {(i===0||i===data.length-1)&&(
                <text x={x+barW/2} y={H-2} textAnchor="middle" fill="#555" fontSize="7">{d.dateKey}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Workout Card (reusable) ───────────────────────────────
function WorkoutCard({w,onTap,onDelete,C}){
  return(
    <div onClick={()=>onTap&&onTap(w.exercise)}
      style={{padding:"14px 16px",borderBottom:"1px solid #1a1a1a",cursor:onTap?"pointer":"default"}}
      onTouchStart={e=>{if(onTap)e.currentTarget.style.background="#161616"}}
      onTouchEnd={e=>{if(onTap)e.currentTarget.style.background="transparent"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <span style={{display:"inline-block",background:C.purple,color:"#fff",
          fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:20,marginBottom:6}}>
          {w.exercise}
        </span>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{color:C.dim,fontSize:12}}>{w.dateKey}</span>
          {onDelete&&<span onClick={e=>{e.stopPropagation();onDelete(w.id);}}
            style={{color:"#e55",fontSize:22,lineHeight:1,cursor:"pointer",padding:"0 4px"}}>×</span>}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:11,color:C.muted,marginBottom:1}}>Best est. 1RM</div>
          <span style={{fontSize:36,fontWeight:800,letterSpacing:-2}}>{w.best1RM}</span>
          <span style={{fontSize:14,color:C.muted}}> {w.unit}</span>
        </div>
        {onTap&&<span style={{color:C.dim,fontSize:22,paddingBottom:4}}>›</span>}
      </div>
      <div style={{marginTop:6,background:"#161616",borderRadius:8,padding:"8px 10px"}}>
        {w.sets.map((s,i)=>(
          <div key={i} style={{display:"flex",gap:8,fontSize:13,color:C.muted,marginBottom:i<w.sets.length-1?4:0,alignItems:"center"}}>
            <span style={{color:C.dim,fontSize:11,width:40}}>Set {s.setNum}</span>
            <span style={{color:"#fff",fontWeight:600}}>{s.weight}{w.unit}</span>
            <span>× {s.reps} reps</span>
            <span style={{marginLeft:"auto",color:C.purple,fontWeight:600,fontSize:12}}>{s.weight*s.reps}{w.unit}</span>
          </div>
        ))}
        <div style={{marginTop:6,paddingTop:6,borderTop:"1px solid #2a2a2a",display:"flex",justifyContent:"space-between"}}>
          <span style={{color:C.muted,fontSize:12}}>Total Volume</span>
          <span style={{color:"#fff",fontWeight:700,fontSize:13}}>{w.volume} {w.unit}</span>
        </div>
      </div>
    </div>
  );
}

// ── Calendar Component ────────────────────────────────────
function CalendarView({workoutDates,selectedDateKey,onSelectDate,highlightOnly=false}){
  const today=new Date();
  const [viewYear,setViewYear]=useState(today.getFullYear());
  const [viewMonth,setViewMonth]=useState(today.getMonth());
  const C={purple:"#7c6ff7",bg:"#0a0a0a",text:"#fff",muted:"#888"};

  const firstDay=new Date(viewYear,viewMonth,1).getDay();
  const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
  const cells=[];
  for(let i=0;i<firstDay;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);

  const prevMonth=()=>{if(viewMonth===0){setViewYear(y=>y-1);setViewMonth(11);}else setViewMonth(m=>m-1);};
  const nextMonth=()=>{if(viewMonth===11){setViewYear(y=>y+1);setViewMonth(0);}else setViewMonth(m=>m+1);};

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 16px 12px"}}>
        <button onClick={prevMonth} style={{background:"#1c1c1e",border:"none",color:C.text,fontSize:20,borderRadius:8,width:36,height:36,cursor:"pointer"}}>‹</button>
        <span style={{fontSize:17,fontWeight:600}}>{MONTHS[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={{background:"#1c1c1e",border:"none",color:C.text,fontSize:20,borderRadius:8,width:36,height:36,cursor:"pointer"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"0 12px",marginBottom:4}}>
        {DAY_LABELS.map(d=><div key={d} style={{textAlign:"center",fontSize:11,color:C.muted,padding:"3px 0"}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"0 12px",gap:2}}>
        {cells.map((day,i)=>{
          if(!day)return<div key={i}/>;
          const dk=`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isToday=dk===todayKey();
          const isSelected=dk===selectedDateKey;
          const hasWorkout=workoutDates.has(dk);
          const clickable=!highlightOnly||(highlightOnly&&hasWorkout);
          return(
            <div key={i} onClick={()=>clickable&&onSelectDate(dk)}
              style={{aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",borderRadius:"50%",
                cursor:clickable?"pointer":"default",
                background:isSelected?C.purple:isToday?"#2a2a2a":"transparent",
                border:isToday&&!isSelected?"1px solid #444":"1px solid transparent"}}>
              <span style={{fontSize:14,fontWeight:isToday||isSelected?700:400,
                color:isSelected?"#fff":hasWorkout?C.purple:C.text}}>{day}</span>
              {hasWorkout&&!isSelected&&(
                <div style={{width:4,height:4,borderRadius:"50%",background:C.purple,marginTop:1}}/>
              )}
              {hasWorkout&&isSelected&&(
                <div style={{width:4,height:4,borderRadius:"50%",background:"#fff",marginTop:1}}/>
              )}
            </div>
          );
        })}
      </div>
      <div style={{padding:"10px 16px 0",color:"#444",fontSize:12,textAlign:"center"}}>
        {highlightOnly?"Tap a highlighted day to view that workout":"Purple = workout logged · Tap any day to log for that date"}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
export default function App(){
  const [tab,setTab]=useState("Calculator");
  const [showSettings,setShowSettings]=useState(false);
  const [selectedDateKey,setSelectedDateKey]=useState(todayKey());
  const [showCalendarPicker,setShowCalendarPicker]=useState(false);

  // Calculator
  const [weight,setWeight]=useState("");
  const [reps,setReps]=useState("");
  const [exercise,setExercise]=useState("Bench Press");
  const [showExDrop,setShowExDrop]=useState(false);
  const [showInfo,setShowInfo]=useState(false);
  const [saveToast,setSaveToast]=useState("");

  // Data
  const [workouts,setWorkouts]=useState(()=>lsGet("workouts2",[]));
  const [unit,setUnit]=useState(()=>lsGet("unit","kg"));
  const [exercises,setExercises]=useState(()=>lsGet("exercises",DEFAULT_EXERCISES));
  const [newExName,setNewExName]=useState("");

  // History sub-tabs
  const [historyTab,setHistoryTab]=useState("Lifts");
  // Workouts calendar — when a day is tapped, show its workouts
  const [calWorkoutDay,setCalWorkoutDay]=useState(null); // dateKey string

  // Body weight
  const [bwHistory,setBwHistory]=useState(()=>lsGet("bwHistory",[]));
  const [bwInput,setBwInput]=useState("");

  // Body fat
  const [bfGender,setBfGender]=useState(()=>lsGet("bfGender","male"));
  const [bfHeight,setBfHeight]=useState(()=>lsGet("bfHeight",""));
  const [bfWaist,setBfWaist]=useState("");
  const [bfNeck,setBfNeck]=useState("");
  const [bfHips,setBfHips]=useState("");
  const [bfHistory,setBfHistory]=useState(()=>lsGet("bfHistory",[]));

  // Exercise page
  const [selEx,setSelEx]=useState(null);
  const [exSearch,setExSearch]=useState("");
  const [exDetailTab,setExDetailTab]=useState("Chart");
  const [chartMetric,setChartMetric]=useState("1rm");

  useEffect(()=>{lsSet("workouts2",workouts);},[workouts]);
  useEffect(()=>{lsSet("unit",unit);},[unit]);
  useEffect(()=>{lsSet("exercises",exercises);},[exercises]);
  useEffect(()=>{lsSet("bwHistory",bwHistory);},[bwHistory]);
  useEffect(()=>{lsSet("bfHistory",bfHistory);},[bfHistory]);
  useEffect(()=>{lsSet("bfGender",bfGender);},[bfGender]);
  useEffect(()=>{lsSet("bfHeight",bfHeight);},[bfHeight]);

  const weightNum=parseFloat(weight),repsNum=parseInt(reps);
  const oneRM=weightNum>0&&repsNum>0?calc1RM(weightNum,repsNum):0;
  const showToast=(msg)=>{setSaveToast(msg);setTimeout(()=>setSaveToast(""),2200);};

  const currentSetNum=()=>{
    const w=workouts.find(w=>w.exercise===exercise&&w.dateKey===selectedDateKey);
    return w?w.sets.length+1:1;
  };

  const saveSet=()=>{
    if(!weightNum||!repsNum)return;
    const setNum=currentSetNum();
    const newSet={weight:weightNum,reps:repsNum,setNum,oneRM:calc1RM(weightNum,repsNum)};
    setWorkouts(prev=>{
      const idx=prev.findIndex(w=>w.exercise===exercise&&w.dateKey===selectedDateKey);
      if(idx>=0){
        const updated=[...prev];
        const w={...updated[idx],sets:[...updated[idx].sets,newSet]};
        w.best1RM=Math.max(...w.sets.map(s=>s.oneRM));
        w.volume=calcVolume(w.sets);
        updated[idx]=w;
        return updated;
      }
      const w={id:Date.now(),exercise,dateKey:selectedDateKey,date:fmtDateKey(selectedDateKey),
        unit,sets:[newSet],best1RM:newSet.oneRM,volume:calcVolume([newSet])};
      return [w,...prev].sort((a,b)=>b.dateKey.localeCompare(a.dateKey));
    });
    setWeight("");setReps("");
    showToast(`✓ Set ${setNum} saved!`);
  };

  const deleteWorkout=(id)=>setWorkouts(prev=>prev.filter(w=>w.id!==id));
  const goToExercise=(name)=>{setSelEx(name);setExDetailTab("Chart");setChartMetric("1rm");setTab("Exercise");};

  const exWorkouts=selEx?[...workouts.filter(w=>w.exercise===selEx)].sort((a,b)=>a.dateKey.localeCompare(b.dateKey)):[];
  const repRecords=selEx?getRepRecords(exWorkouts):{};
  const workoutDates=new Set(workouts.map(w=>w.dateKey));

  // Body fat
  const bfW=parseFloat(bfWaist),bfN=parseFloat(bfNeck),bfH=parseFloat(bfHeight),bfHp=parseFloat(bfHips);
  const bfResult=(bfW>0&&bfN>0&&bfH>0&&(bfGender==="male"||bfHp>0))?calcBodyFat(bfGender,bfW,bfN,bfH,bfHp):null;
  const bfRounded=bfResult?Math.round(bfResult*10)/10:null;
  const bfCat=bfRounded?bfCategory(bfGender,bfRounded):null;

  const saveBF=()=>{
    if(!bfRounded||bfRounded<=0)return;
    setBfHistory(prev=>[...prev,{id:Date.now(),bodyfat:bfRounded,dateKey:selectedDateKey,date:fmtDateKey(selectedDateKey)}]);
    setBfWaist("");setBfNeck("");setBfHips("");
    showToast("✓ Body fat saved!");
  };
  const saveBW=()=>{
    const bw=parseFloat(bwInput);
    if(!bw||bw<=0)return;
    setBwHistory(prev=>[...prev,{id:Date.now(),bodyweight:bw,dateKey:selectedDateKey,date:fmtDateKey(selectedDateKey)}]);
    setBwInput("");showToast("✓ Body weight saved!");
  };

  const filteredExercises=exercises.filter(e=>e.toLowerCase().includes(exSearch.toLowerCase()));
  const addExercise=()=>{
    const name=newExName.trim();
    if(!name||exercises.includes(name))return;
    setExercises(prev=>[...prev,name]);setNewExName("");
  };

  const isToday=selectedDateKey===todayKey();

  // ── Styles ────────────────────────────────────────────────
  const C={purple:"#7c6ff7",green:"#4ade80",orange:"#fb923c",
    bg:"#0a0a0a",card:"#1c1c1e",border:"#222",text:"#ffffff",muted:"#888",dim:"#555"};
  const inp={background:"#fff",border:"none",borderRadius:10,padding:"14px",color:"#000",
    fontSize:16,outline:"none",width:"100%",boxSizing:"border-box",WebkitAppearance:"none",fontWeight:600};
  const sel={...inp,appearance:"none",WebkitAppearance:"none",cursor:"pointer"};
  const btnP={background:C.purple,border:"none",borderRadius:12,padding:18,color:"#fff",fontSize:17,fontWeight:600,cursor:"pointer",width:"100%"};
  const btnG={background:C.green,border:"none",borderRadius:12,padding:18,color:"#000",fontSize:17,fontWeight:700,cursor:"pointer",width:"100%"};
  const btnO=(color)=>({background:"transparent",border:`1px solid ${color||C.dim}`,borderRadius:12,padding:18,color:color||C.dim,fontSize:17,fontWeight:500,cursor:"pointer",width:"100%"});
  const divRow={display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",borderBottom:"1px solid #1a1a1a"};

  // ── CALCULATOR ────────────────────────────────────────────
  const setNum=currentSetNum();
  const renderCalculator=()=>(
    <div>
      <div style={{textAlign:"center",padding:"20px 20px 16px"}}>
        <div style={{color:C.muted,fontSize:15,marginBottom:4}}>Estimated 1RM</div>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:4}}>
          <span style={{fontSize:82,fontWeight:800,lineHeight:1,letterSpacing:-4}}>{oneRM}</span>
          <span style={{fontSize:30,color:C.muted,paddingBottom:10}}>{unit}</span>
        </div>
      </div>

      <div style={{display:"flex",gap:8,padding:"0 16px",marginBottom:10}}>
        <div style={{flex:2}}>
          <div style={{color:C.muted,fontSize:12,marginBottom:5}}>Weight</div>
          <div style={{position:"relative"}}>
            <input style={{...inp,paddingRight:38}} inputMode="decimal" placeholder="0"
              value={weight} onChange={e=>setWeight(e.target.value)}/>
            <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"#999",fontSize:13,fontWeight:600,pointerEvents:"none"}}>{unit}</span>
          </div>
        </div>
        <div style={{flex:1.3}}>
          <div style={{color:C.muted,fontSize:12,marginBottom:5}}>Reps</div>
          <input style={inp} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0"
            value={reps} onChange={e=>setReps(e.target.value.replace(/[^0-9]/g,""))}/>
        </div>
      </div>

      <div style={{padding:"0 16px",marginBottom:10,position:"relative"}}>
        <div style={{color:C.muted,fontSize:12,marginBottom:5}}>Exercise</div>
        <div onClick={()=>setShowExDrop(v=>!v)}
          style={{...inp,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{exercise}</span><span style={{color:"#999",fontSize:12}}>▾</span>
        </div>
        {showExDrop&&(
          <div style={{position:"absolute",top:"calc(100% - 4px)",left:16,right:16,zIndex:200,
            background:"#2a2a2a",borderRadius:10,maxHeight:220,overflowY:"auto",
            border:`1px solid ${C.border}`,boxShadow:"0 8px 32px rgba(0,0,0,0.7)"}}>
            {exercises.map(ex=>(
              <div key={ex} onClick={()=>{setExercise(ex);setShowExDrop(false);}}
                style={{padding:"13px 14px",cursor:"pointer",fontSize:15,borderBottom:"1px solid #333",
                  color:ex===exercise?C.purple:C.text,background:ex===exercise?"#1e1a3a":"transparent"}}>
                {ex}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Set indicator + Date */}
      <div style={{display:"flex",gap:8,padding:"0 16px",marginBottom:10}}>
        <div style={{flex:1,background:C.card,borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{color:C.muted,fontSize:13}}>Current set</span>
          <span style={{fontSize:22,fontWeight:800,color:C.purple}}>{setNum}</span>
        </div>
        <div onClick={()=>setShowCalendarPicker(true)}
          style={{flex:1.2,background:C.card,borderRadius:10,padding:"10px 14px",
            display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}>
          <div>
            <div style={{color:C.muted,fontSize:11}}>Date</div>
            <div style={{color:isToday?C.green:C.purple,fontWeight:600,fontSize:14}}>
              {isToday?"Today":selectedDateKey}
            </div>
          </div>
          <span style={{fontSize:18}}>📅</span>
        </div>
      </div>

      {weightNum>0&&repsNum>0&&(
        <div style={{margin:"0 16px 10px",background:"#161616",borderRadius:10,padding:"10px 14px",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{color:C.muted,fontSize:13}}>Set {setNum} volume</span>
          <span style={{fontWeight:700,fontSize:15}}>{weightNum*repsNum} {unit}</span>
        </div>
      )}

      <div style={{padding:"0 16px 8px",display:"flex",flexDirection:"column",gap:10}}>
        <button style={btnP} onClick={saveSet}>Save Set {setNum}</button>
        <button style={btnO(C.dim)} onClick={()=>{setWeight("");setReps("");}}>Clear</button>
      </div>

      <div style={{padding:"10px 16px 6px"}}>
        <span style={{color:C.purple,fontSize:15,cursor:"pointer"}} onClick={()=>setShowInfo(true)}>What is 1RM?</span>
      </div>
      <div style={{padding:"6px 16px 10px"}}>
        <div style={{fontSize:16,fontWeight:600}}>Estimated Rep Maxes</div>
      </div>
      {REP_PERCENTAGES.filter(r=>r.reps>1).map(({reps:r,pct})=>(
        <div key={r} style={divRow}>
          <span style={{fontSize:15,color:"#bbb",flex:1}}>{r} Reps</span>
          <span style={{fontSize:15,flex:1,textAlign:"center"}}>{oneRM?`${Math.round(oneRM*pct/100)} ${unit}`:"—"}</span>
          <span style={{fontSize:15,color:C.dim,flex:1,textAlign:"right"}}>{pct}%</span>
        </div>
      ))}
    </div>
  );

  // ── HISTORY ───────────────────────────────────────────────
  const renderHistory=()=>{
    // If viewing a specific workout day from calendar
    if(calWorkoutDay){
      const dayWorkouts=workouts.filter(w=>w.dateKey===calWorkoutDay);
      return(
        <div>
          <div style={{padding:"20px 20px 12px",display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>setCalWorkoutDay(null)}
              style={{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer",padding:0}}>←</button>
            <span style={{fontSize:20,fontWeight:700}}>{calWorkoutDay}</span>
          </div>
          {dayWorkouts.length===0?(
            <div style={{textAlign:"center",color:C.dim,padding:40,fontSize:15}}>No workouts on this day</div>
          ):dayWorkouts.map(w=>(
            <WorkoutCard key={w.id} w={w} onTap={goToExercise} onDelete={deleteWorkout} C={C}/>
          ))}
        </div>
      );
    }

    return(
      <div>
        {/* Sub-tabs */}
        <div style={{display:"flex",padding:"0 16px",borderBottom:`1px solid ${C.border}`}}>
          {["Lifts","Workouts"].map(t=>(
            <button key={t} onClick={()=>setHistoryTab(t)} style={{
              flex:1,background:"none",border:"none",
              borderBottom:`2px solid ${historyTab===t?C.purple:"transparent"}`,
              color:historyTab===t?C.purple:C.dim,
              padding:"12px 0",fontSize:16,cursor:"pointer",fontWeight:historyTab===t?600:400}}>
              {t}
            </button>
          ))}
        </div>

        {historyTab==="Lifts"?(
          workouts.length===0?(
            <div style={{textAlign:"center",color:C.dim,padding:60,fontSize:15}}>
              No history yet. Save your first set to see it here.
            </div>
          ):workouts.map(w=>(
            <WorkoutCard key={w.id} w={w} onTap={goToExercise} onDelete={deleteWorkout} C={C}/>
          ))
        ):(
          // Workouts calendar view
          <div style={{paddingTop:12}}>
            <CalendarView
              workoutDates={workoutDates}
              selectedDateKey={null}
              onSelectDate={(dk)=>{
                if(workoutDates.has(dk)) setCalWorkoutDay(dk);
              }}
              highlightOnly={true}
            />
          </div>
        )}
      </div>
    );
  };

  // ── EXERCISE DETAIL ───────────────────────────────────────
  const renderExerciseDetail=()=>{
    const ul=exWorkouts[0]?.unit||unit;
    const latest=exWorkouts[exWorkouts.length-1];
    return(
      <div>
        <div style={{padding:"20px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>setSelEx(null)}
              style={{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer",padding:0}}>←</button>
            <span style={{fontSize:20,fontWeight:700}}>{selEx}</span>
          </div>
          <button onClick={()=>{setWorkouts(prev=>prev.filter(w=>w.exercise!==selEx));setSelEx(null);}}
            style={{background:"none",border:"none",color:"#e55",cursor:"pointer",fontSize:20}}>🗑</button>
        </div>
        <div style={{display:"flex",padding:"10px 16px 0"}}>
          {["Chart","History"].map(t=>(
            <button key={t} onClick={()=>setExDetailTab(t)} style={{
              flex:1,background:"none",border:"none",
              borderBottom:`2px solid ${exDetailTab===t?C.purple:"transparent"}`,
              color:exDetailTab===t?C.purple:C.dim,
              padding:"10px 0",fontSize:16,cursor:"pointer",fontWeight:exDetailTab===t?600:400}}>
              {t}
            </button>
          ))}
        </div>

        {exDetailTab==="Chart"?(
          <div style={{paddingTop:14}}>
            <div style={{display:"flex",gap:8,padding:"0 16px",marginBottom:12}}>
              {[["1rm","Estimated 1RM","#7c6ff7"],["volume","Volume","#4ade80"]].map(([key,label,col])=>(
                <button key={key} onClick={()=>setChartMetric(key)} style={{
                  flex:1,background:chartMetric===key?col+"22":"#1c1c1e",
                  border:`1.5px solid ${chartMetric===key?col:"transparent"}`,
                  borderRadius:8,padding:"9px 0",
                  color:chartMetric===key?col:"#888",
                  fontSize:13,fontWeight:chartMetric===key?700:400,cursor:"pointer"}}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{padding:"0 16px 4px"}}>
              {chartMetric==="1rm"?(
                <>
                  <div style={{fontSize:12,color:C.muted,marginBottom:8}}>Best estimated 1RM per session</div>
                  <LineChart data={exWorkouts} valueKey="best1RM" unitLabel={ul} color={C.purple}/>
                </>
              ):(
                <>
                  <div style={{fontSize:12,color:C.muted,marginBottom:8}}>Total volume per session (weight × reps)</div>
                  <BarChart data={exWorkouts} valueKey="volume" color={C.green}
                    formatVal={v=>v>=1000?`${(v/1000).toFixed(1)}k`:String(v)} unitLabel={ul}/>
                </>
              )}
            </div>

            <div style={{padding:"20px 16px 4px"}}>
              <div style={{fontSize:17,fontWeight:700}}>Rep Max Records</div>
              <div style={{fontSize:12,color:C.muted,marginTop:3,lineHeight:1.5}}>
                Heaviest weight ever lifted at each rep count.
              </div>
            </div>
            {REP_RANGE.map(r=>{
              const record=repRecords[r];
              const allForRep=exWorkouts.flatMap(w=>w.sets.filter(s=>s.reps===r));
              const latestForRep=latest?.sets.find(s=>s.reps===r);
              const isNewPR=record&&latestForRep&&latestForRep.weight===record.weight&&allForRep.length>=2;
              return(
                <div key={r} style={{...divRow,background:isNewPR?"#1a1535":"transparent"}}>
                  <span style={{fontSize:15,flex:1,fontWeight:500}}>{r} Rep Max</span>
                  <span style={{fontSize:17,flex:1.5,textAlign:"center",fontWeight:record?800:400}}>
                    {record?`${record.weight} `:<span style={{color:C.dim}}>—</span>}
                    {record&&<span style={{fontSize:12,color:C.muted,fontWeight:400}}>{record.unit}</span>}
                  </span>
                  <span style={{fontSize:12,flex:1,textAlign:"right"}}>
                    {isNewPR?<span style={{color:C.purple,fontWeight:700}}>● NEW PR</span>
                      :record?<span style={{color:C.dim}}>{record.date}</span>:null}
                  </span>
                </div>
              );
            })}
          </div>
        ):(
          <div style={{paddingTop:8}}>
            {exWorkouts.length===0?(
              <div style={{textAlign:"center",color:C.dim,padding:40}}>No entries yet</div>
            ):[...exWorkouts].reverse().map(w=>(
              <div key={w.id} style={{padding:"14px 16px",borderBottom:"1px solid #1a1a1a"}}>
                <div style={{color:C.dim,fontSize:12,marginBottom:6}}>{w.dateKey}</div>
                <div style={{fontSize:13,color:C.muted,marginBottom:8}}>
                  Best 1RM: <span style={{color:C.text,fontWeight:700,fontSize:15}}>{w.best1RM} {w.unit}</span>
                  <span style={{marginLeft:16}}>Vol: <span style={{color:C.green,fontWeight:700}}>{w.volume} {w.unit}</span></span>
                </div>
                {w.sets.map((s,i)=>(
                  <div key={i} style={{display:"flex",gap:8,fontSize:13,color:C.muted,marginBottom:3,alignItems:"center"}}>
                    <span style={{color:C.dim,fontSize:11,width:40}}>Set {s.setNum}</span>
                    <span style={{color:C.text,fontWeight:600}}>{s.weight}{w.unit}</span>
                    <span>× {s.reps} reps</span>
                    <span style={{marginLeft:"auto",color:C.purple,fontSize:12,fontWeight:600}}>{s.weight*s.reps}{w.unit}</span>
                  </div>
                ))}
                <div style={{marginTop:6,paddingTop:6,borderTop:"1px solid #2a2a2a",display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:C.muted,fontSize:12}}>Total Volume</span>
                  <span style={{color:C.text,fontWeight:700,fontSize:13}}>{w.volume} {w.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── EXERCISE LIST ─────────────────────────────────────────
  const renderExercise=()=>{
    if(selEx)return renderExerciseDetail();
    return(
      <div>
        <div style={{position:"relative",padding:"12px 16px"}}>
          <span style={{position:"absolute",left:28,top:"50%",transform:"translateY(-50%)",color:"#999"}}>🔍</span>
          <input style={{...inp,paddingLeft:40}} placeholder="Search exercises"
            value={exSearch} onChange={e=>setExSearch(e.target.value)}/>
        </div>
        {filteredExercises.map(ex=>{
          const has=workouts.some(w=>w.exercise===ex);
          return(
            <div key={ex} onClick={()=>{setSelEx(ex);setExDetailTab("Chart");setChartMetric("1rm");}}
              style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"16px",borderBottom:"1px solid #1a1a1a",cursor:"pointer"}}>
              <div>
                <span style={{fontSize:16}}>{ex}</span>
                {has&&<span style={{marginLeft:8,fontSize:11,color:C.purple}}>● tracked</span>}
              </div>
              <span style={{color:C.dim,fontSize:20}}>›</span>
            </div>
          );
        })}
        <div style={{padding:16,borderTop:"1px solid #1a1a1a",display:"flex",gap:8,marginTop:8}}>
          <input style={{...inp,flex:1}} placeholder="Add new exercise..."
            value={newExName} onChange={e=>setNewExName(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addExercise()}/>
          <button onClick={addExercise} style={{...btnP,width:"auto",padding:"14px 20px"}}>Add</button>
        </div>
      </div>
    );
  };

  // ── BODY TAB ──────────────────────────────────────────────
  const renderBody=()=>(
    <div style={{padding:16}}>

      {/* Body Weight */}
      <div style={{fontSize:13,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Body Weight</div>
      <div style={{background:"#161616",borderRadius:14,padding:16,marginBottom:24}}>
        <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"flex-end"}}>
          <div style={{flex:1}}>
            <div style={{color:C.muted,fontSize:12,marginBottom:5}}>Weight (kg)</div>
            <div style={{position:"relative"}}>
              <input style={{...inp,paddingRight:38}} inputMode="decimal" placeholder="0.0"
                value={bwInput} onChange={e=>setBwInput(e.target.value)}/>
              <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"#999",fontSize:13,pointerEvents:"none"}}>kg</span>
            </div>
          </div>
          <button onClick={saveBW} style={{...btnG,width:"auto",padding:"14px 18px",flexShrink:0}}>Save</button>
        </div>
        {bwHistory.length>0&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            marginBottom:14,background:"#1e1e1e",borderRadius:10,padding:"10px 14px"}}>
            <div>
              <div style={{fontSize:11,color:C.muted}}>Latest</div>
              <div style={{fontSize:26,fontWeight:800,letterSpacing:-1}}>
                {bwHistory[bwHistory.length-1].bodyweight}
                <span style={{fontSize:13,color:C.muted,fontWeight:400}}> kg</span>
              </div>
            </div>
            {bwHistory.length>1&&(()=>{
              const diff=(bwHistory[bwHistory.length-1].bodyweight-bwHistory[bwHistory.length-2].bodyweight).toFixed(1);
              const col=parseFloat(diff)<0?C.green:parseFloat(diff)>0?"#f87171":C.muted;
              return(
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,color:C.muted}}>{bwHistory[bwHistory.length-1].dateKey}</div>
                  <div style={{fontSize:14,color:col,fontWeight:700}}>{parseFloat(diff)>0?"+":""}{diff} kg</div>
                </div>
              );
            })()}
          </div>
        )}
        <LineChart data={bwHistory} valueKey="bodyweight" unitLabel="kg" color={C.green}/>
        {bwHistory.length>0&&(
          <div style={{marginTop:12}}>
            {[...bwHistory].reverse().slice(0,5).map(e=>(
              <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"8px 0",borderBottom:"1px solid #2a2a2a"}}>
                <span style={{fontSize:15,fontWeight:600}}>{e.bodyweight} kg</span>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:12,color:C.dim}}>{e.dateKey}</span>
                  <span onClick={()=>setBwHistory(prev=>prev.filter(x=>x.id!==e.id))}
                    style={{color:"#e55",fontSize:18,cursor:"pointer"}}>×</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Body Fat */}
      <div style={{fontSize:13,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Body Fat — US Navy Method</div>
      <div style={{background:"#161616",borderRadius:14,padding:16,marginBottom:24}}>
        <div style={{fontSize:13,color:C.muted,marginBottom:14,lineHeight:1.5}}>
          All measurements in <b style={{color:C.text}}>centimetres</b>.
        </div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {["male","female"].map(g=>(
            <button key={g} onClick={()=>setBfGender(g)} style={{
              flex:1,background:bfGender===g?C.purple:"#2a2a2a",border:"none",
              borderRadius:8,padding:"10px 0",color:"#fff",
              fontSize:14,fontWeight:bfGender===g?700:400,cursor:"pointer",textTransform:"capitalize"}}>
              {g}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <div style={{flex:1}}>
            <div style={{color:C.muted,fontSize:12,marginBottom:5}}>Height (cm)</div>
            <input style={inp} inputMode="decimal" placeholder="175"
              value={bfHeight} onChange={e=>setBfHeight(e.target.value)}/>
          </div>
          <div style={{flex:1}}>
            <div style={{color:C.muted,fontSize:12,marginBottom:5}}>Neck (cm)</div>
            <input style={inp} inputMode="decimal" placeholder="38"
              value={bfNeck} onChange={e=>setBfNeck(e.target.value)}/>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <div style={{flex:1}}>
            <div style={{color:C.muted,fontSize:12,marginBottom:5}}>Waist (cm)</div>
            <input style={inp} inputMode="decimal" placeholder="85"
              value={bfWaist} onChange={e=>setBfWaist(e.target.value)}/>
          </div>
          {bfGender==="female"&&(
            <div style={{flex:1}}>
              <div style={{color:C.muted,fontSize:12,marginBottom:5}}>Hips (cm)</div>
              <input style={inp} inputMode="decimal" placeholder="95"
                value={bfHips} onChange={e=>setBfHips(e.target.value)}/>
            </div>
          )}
        </div>
        {bfRounded&&bfRounded>0?(
          <div style={{background:"#1e1e1e",borderRadius:12,padding:"16px",marginBottom:14,textAlign:"center"}}>
            <div style={{fontSize:13,color:C.muted,marginBottom:4}}>Estimated Body Fat</div>
            <div style={{fontSize:50,fontWeight:800,letterSpacing:-2,color:bfCat?.color||C.text}}>
              {bfRounded}<span style={{fontSize:22,fontWeight:400,color:C.muted}}>%</span>
            </div>
            <div style={{display:"inline-block",background:bfCat?.color+"22",
              border:`1px solid ${bfCat?.color}`,borderRadius:20,
              padding:"4px 14px",fontSize:13,fontWeight:600,color:bfCat?.color,marginTop:4}}>
              {bfCat?.label}
            </div>
          </div>
        ):(
          <div style={{background:"#1e1e1e",borderRadius:12,padding:14,marginBottom:14,textAlign:"center",color:C.dim,fontSize:14}}>
            Fill in all measurements to see your result
          </div>
        )}
        <button onClick={saveBF} style={{...btnP,opacity:bfRounded&&bfRounded>0?1:0.4}}>
          Save Body Fat Reading
        </button>
        {bfHistory.length>0&&(
          <div style={{marginTop:16}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:8}}>Body fat % over time</div>
            <LineChart data={bfHistory} valueKey="bodyfat" unitLabel="%" color={C.orange}/>
            <div style={{marginTop:10}}>
              {[...bfHistory].reverse().slice(0,5).map(e=>(
                <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"8px 0",borderBottom:"1px solid #2a2a2a"}}>
                  <span style={{fontSize:15,fontWeight:600}}>{e.bodyfat}%</span>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:12,color:C.dim}}>{e.dateKey}</span>
                    <span onClick={()=>setBfHistory(prev=>prev.filter(x=>x.id!==e.id))}
                      style={{color:"#e55",fontSize:18,cursor:"pointer"}}>×</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── SETTINGS MODAL ────────────────────────────────────────
  const renderSettingsModal=()=>(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:1000,display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto"}}>
      <div style={{padding:"20px 20px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:24,fontWeight:700}}>Settings</span>
        <button onClick={()=>setShowSettings(false)}
          style={{background:"#2a2a2a",border:"none",color:"#fff",borderRadius:20,padding:"6px 14px",fontSize:15,cursor:"pointer"}}>Done</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 16px 40px"}}>
        <div style={{fontSize:13,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:10,marginTop:8}}>Units</div>
        <div style={{display:"flex",gap:10,marginBottom:28}}>
          {["kg","lbs"].map(u=>(
            <button key={u} onClick={()=>setUnit(u)} style={{
              flex:1,background:unit===u?C.purple:C.card,border:"none",
              borderRadius:10,padding:16,color:"#fff",fontSize:16,
              cursor:"pointer",fontWeight:unit===u?700:400}}>{u}</button>
          ))}
        </div>
        <div style={{fontSize:13,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Exercises</div>
        <div style={{display:"flex",gap:8,marginBottom:28}}>
          <input style={{...inp,flex:1}} placeholder="Add new exercise..."
            value={newExName} onChange={e=>setNewExName(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addExercise()}/>
          <button onClick={addExercise} style={{...btnP,width:"auto",padding:"14px 20px"}}>Add</button>
        </div>
        <div style={{fontSize:13,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Data</div>
        <button onClick={()=>{if(window.confirm("Clear all workout history?"))setWorkouts([]);}}
          style={{...btnO("#e55"),marginBottom:10}}>Clear All Workout History</button>
        <button onClick={()=>{if(window.confirm("Clear body weight history?"))setBwHistory([]);}}
          style={{...btnO("#e55"),marginBottom:10}}>Clear Body Weight History</button>
        <button onClick={()=>{if(window.confirm("Clear body fat history?"))setBfHistory([]);}}
          style={{...btnO("#e55"),marginBottom:10}}>Clear Body Fat History</button>
        <button onClick={()=>{if(window.confirm("Reset exercise list to defaults?"))setExercises(DEFAULT_EXERCISES);}}
          style={{...btnO(C.dim),marginBottom:28}}>Reset Exercise List</button>
        <div style={{color:"#333",fontSize:13,textAlign:"center",marginTop:8}}>1RM Calculator · Epley formula</div>
      </div>
    </div>
  );

  // ── CALENDAR PICKER (full screen overlay) ─────────────────
  const renderCalendarPicker=()=>(
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:900,display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto"}}>
      <div style={{padding:"20px 20px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <button onClick={()=>setShowCalendarPicker(false)}
          style={{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer",padding:0}}>←</button>
        <span style={{fontSize:20,fontWeight:700}}>Select Date</span>
        <button onClick={()=>{setSelectedDateKey(todayKey());setShowCalendarPicker(false);}}
          style={{background:"none",border:"none",color:C.purple,fontSize:14,cursor:"pointer",fontWeight:600}}>Today</button>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        <CalendarView
          workoutDates={workoutDates}
          selectedDateKey={selectedDateKey}
          onSelectDate={(dk)=>{setSelectedDateKey(dk);setShowCalendarPicker(false);}}
          highlightOnly={false}
        />
      </div>
    </div>
  );

  // ── ROOT ──────────────────────────────────────────────────
  return(
    <div style={{background:C.bg,color:C.text,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      minHeight:"100vh",display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto"}}>

      {/* Header — hide when in exercise detail */}
      {!(tab==="Exercise"&&selEx)&&(
        <div style={{padding:"20px 20px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:28,fontWeight:700,letterSpacing:-0.5}}>{tab}</span>
          <button onClick={()=>setShowSettings(true)}
            style={{background:"none",border:"none",color:C.dim,cursor:"pointer",padding:4}}>
            {IconSettings}
          </button>
        </div>
      )}

      <div style={{flex:1,overflowY:"auto",paddingBottom:90}}>
        {tab==="Calculator"&&renderCalculator()}
        {tab==="History"&&renderHistory()}
        {tab==="Exercise"&&renderExercise()}
        {tab==="Body"&&renderBody()}
      </div>

      {/* Tab bar */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:430,background:"#111",borderTop:`1px solid ${C.border}`,
        display:"flex",padding:"8px 0 20px"}}>
        {TABS.map(t=>(
          <div key={t}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              cursor:"pointer",color:tab===t?C.purple:C.dim,fontSize:10,fontWeight:tab===t?600:400}}
            onClick={()=>{setTab(t);if(t!=="History")setCalWorkoutDay(null);if(t!=="Exercise")setSelEx(null);}}>
            {TAB_ICONS[t]}<span>{t}</span>
          </div>
        ))}
      </div>

      {/* Overlays */}
      {showCalendarPicker&&renderCalendarPicker()}
      {showSettings&&renderSettingsModal()}

      {/* Toast */}
      {saveToast&&(
        <div style={{position:"fixed",bottom:95,left:"50%",transform:"translateX(-50%)",
          background:"#1c1c1e",color:C.text,padding:"12px 24px",borderRadius:20,
          fontSize:14,fontWeight:500,border:"1px solid #333",zIndex:999,whiteSpace:"nowrap"}}>
          {saveToast}
        </div>
      )}

      {/* 1RM info */}
      {showInfo&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",
          alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}
          onClick={()=>setShowInfo(false)}>
          <div style={{background:"#1a1a1a",borderRadius:16,padding:24,maxWidth:340,width:"100%",border:"1px solid #333"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:20,fontWeight:700,marginBottom:12}}>What is 1RM?</div>
            <div style={{color:"#aaa",fontSize:14,lineHeight:1.7}}>
              Your <b style={{color:C.text}}>1 Rep Max (1RM)</b> is the maximum weight you can lift for a single rep.<br/><br/>
              This app uses the <b style={{color:C.text}}>Epley formula</b>:<br/><br/>
              <span style={{fontFamily:"monospace",background:"#2a2a2a",padding:"4px 8px",borderRadius:6,color:C.purple}}>
                1RM = weight × (1 + reps ÷ 30)
              </span><br/><br/>
              Log multiple sets and the app tracks your best 1RM and total volume automatically.
            </div>
            <button style={{...btnP,marginTop:16}} onClick={()=>setShowInfo(false)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
