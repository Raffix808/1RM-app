import { useState, useEffect, useRef } from "react";

// ── Constants ─────────────────────────────────────────────
const DEFAULT_EXERCISES = [
  "Bicep Curl Barbell","Cable Row","Incline Bench","Bench Press",
  "Squat","Deadlift","Overhead Press","Lat Pulldown",
  "Incline Bench Press","Leg Press","Romanian Deadlift","Pull Up",
  "Barbell Row","Dumbbell Press","Tricep Pushdown"
];
const REP_RANGE = [1,2,3,4,5,6,7,8,9,10,11,12];
const TABS = ["Calculator","History","Exercise","Body","Badges"];
const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const REP_PERCENTAGES = [
  {reps:1,pct:100},{reps:2,pct:96},{reps:3,pct:92},
  {reps:4,pct:89},{reps:5,pct:86},{reps:6,pct:84},
  {reps:7,pct:81},{reps:8,pct:79},{reps:9,pct:76},
  {reps:10,pct:74},{reps:11,pct:72},{reps:12,pct:70}
];

// Tonnage badge definitions per exercise
// Tiers ordered highest first — only highest unlocked shown on badges page
const TONNAGE_BADGES = {
  "Bench Press": [
    {id:"bench_200",label:"200kg",desc:"200kg Bench Club",threshold:200,type:"1rm"},
    {id:"bench_150",label:"150kg",desc:"150kg Bench Club",threshold:150,type:"1rm"},
    {id:"bench_100",label:"100kg",desc:"100kg Bench Club",threshold:100,type:"1rm"},
    {id:"bench_60",label:"60kg",desc:"60kg Bench Club",threshold:60,type:"1rm"},
  ],
  "Squat": [
    {id:"squat_2bw",label:"2× BW",desc:"2× Bodyweight Squat",threshold:2,type:"bw_mult"},
    {id:"squat_15bw",label:"1.5× BW",desc:"1.5× Bodyweight Squat",threshold:1.5,type:"bw_mult"},
    {id:"squat_1bw",label:"1× BW",desc:"1× Bodyweight Squat",threshold:1,type:"bw_mult"},
    {id:"squat_100",label:"100kg",desc:"100kg Squat Club",threshold:100,type:"1rm"},
  ],
  "Deadlift": [
    {id:"dl_2bw",label:"2× BW",desc:"2× Bodyweight Deadlift",threshold:2,type:"bw_mult"},
    {id:"dl_200",label:"200kg",desc:"200kg Deadlift Club",threshold:200,type:"1rm"},
    {id:"dl_150",label:"150kg",desc:"150kg Deadlift Club",threshold:150,type:"1rm"},
    {id:"dl_100",label:"100kg",desc:"100kg Deadlift Club",threshold:100,type:"1rm"},
  ],
  "Overhead Press": [
    {id:"ohp_100",label:"100kg",desc:"100kg OHP Club",threshold:100,type:"1rm"},
    {id:"ohp_80",label:"80kg",desc:"80kg OHP Club",threshold:80,type:"1rm"},
    {id:"ohp_60",label:"60kg",desc:"60kg OHP Club",threshold:60,type:"1rm"},
  ],
};

// ── Colour Palette ────────────────────────────────────────
const C = {
  bg:       "#0d0608",
  surface:  "#141414",
  elevated: "#1e1e1e",
  border:   "#ffffff22",   // clean white borders
  borderW:  "#ffffff44",   // slightly stronger white border
  crimson:  "#c41e1e",
  crimsonL: "#e03030",
  gold:     "#d4a017",
  goldL:    "#f0c040",
  text:     "#ffffff",
  muted:    "#888888",
  dim:      "#444444",
  green:    "#4ade80",
  white:    "#ffffff",
};

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

// Returns true ONLY if this is a NEW record (not the first ever)
function checkPR(newSet, existingWorkouts, exercise, dateKey){
  // workouts from OTHER dates for this exercise
  const prevWorkouts = existingWorkouts.filter(w=>w.exercise===exercise && w.dateKey!==dateKey);
  const prevRecords = getRepRecords(prevWorkouts);
  const r = newSet.reps;
  if(!REP_RANGE.includes(r)) return false;
  if(!prevRecords[r]) return false; // first ever — no popup
  return newSet.weight > prevRecords[r].weight;
}

function calcBodyFat(gender,waist,neck,height,hips=0){
  if(gender==="male"){if(waist<=neck)return null;return 86.010*Math.log10(waist-neck)-70.041*Math.log10(height)+36.76;}
  if(waist+hips<=neck)return null;
  return 163.205*Math.log10(waist+hips-neck)-97.684*Math.log10(height)-78.387;
}
function bfCategory(gender,bf){
  if(gender==="male"){
    if(bf<6)return{label:"Essential Fat",color:"#a78bfa"};
    if(bf<14)return{label:"Athletic",color:C.green};
    if(bf<18)return{label:"Fitness",color:"#86efac"};
    if(bf<25)return{label:"Average",color:"#fbbf24"};
    return{label:"Obese",color:"#f87171"};
  }
  if(bf<14)return{label:"Essential Fat",color:"#a78bfa"};
  if(bf<21)return{label:"Athletic",color:C.green};
  if(bf<25)return{label:"Fitness",color:"#86efac"};
  if(bf<32)return{label:"Average",color:"#fbbf24"};
  return{label:"Obese",color:"#f87171"};
}

// Get best 1RM for an exercise across all workouts
function getBest1RM(workouts, exercise){
  const ex = workouts.filter(w=>w.exercise===exercise);
  if(!ex.length) return 0;
  return Math.max(...ex.map(w=>w.best1RM));
}

// Check which tonnage badges are unlocked for an exercise
function getUnlockedTonnageBadges(workouts, exercise, bwHistory){
  const defs = TONNAGE_BADGES[exercise];
  if(!defs) return [];
  const best1RM = getBest1RM(workouts, exercise);
  const latestBW = bwHistory.length ? bwHistory[bwHistory.length-1].bodyweight : null;
  return defs.filter(b=>{
    if(b.type==="1rm") return best1RM >= b.threshold;
    if(b.type==="bw_mult") return latestBW && best1RM >= latestBW * b.threshold;
    return false;
  });
}

// ── Icons ─────────────────────────────────────────────────
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
  </svg>
);
const IconBadges=(
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={22} height={22}>
    <path d="M12 2 L20 7 L20 17 L12 22 L4 17 L4 7 Z"/>
    <polyline points="9,12 11,14 15,10"/>
  </svg>
);
const IconSettings=(
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={22} height={22}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const TAB_ICONS={Calculator:IconCalc,History:IconHistory,Exercise:IconDumbbell,Body:IconBody,Badges:IconBadges};

// ── Nike-style Pentagon Shield SVG ───────────────────────
// Shape: rectangle top, pointed bottom — exactly like Nike Run badges
function ShieldSVG({topText, midText, size=120, locked=false}){
  const w=size, h=size*1.25;
  const r=8; // corner radius
  // Pentagon points: flat top, angled bottom to a point
  const pts = `
    ${r},0
    ${w-r},0
    ${w},${r}
    ${w},${h*0.68}
    ${w/2},${h}
    0,${h*0.68}
    0,${r}
  `;
  return(
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:"block"}}>
      <defs>
        <clipPath id={`clip-${size}-${topText}`}>
          <polygon points={pts}/>
        </clipPath>
      </defs>
      {/* Fill */}
      <polygon points={pts} fill={locked?"#1a1a1a":C.crimson}/>
      {/* Outer border */}
      <polygon points={pts} fill="none" stroke={locked?C.dim:C.white} strokeWidth="3"/>
      {/* Inner border inset ~8px */}
      {!locked&&(
        <polygon
          points={`
            ${r+6},6
            ${w-r-6},6
            ${w-6},${r+6}
            ${w-6},${h*0.68-4}
            ${w/2},${h-8}
            6,${h*0.68-4}
            6,${r+6}
          `}
          fill="none" stroke={C.white} strokeWidth="1.5" strokeOpacity="0.5"
        />
      )}
      {/* Top text (exercise abbreviation) */}
      <text x={w/2} y={h*0.38} textAnchor="middle" dominantBaseline="middle"
        fontFamily="-apple-system,Arial Black,sans-serif"
        fontSize={size*0.22} fontWeight="900"
        fill={locked?C.dim:C.white} letterSpacing="1">
        {topText}
      </text>
      {/* Middle text (PR or weight) */}
      <text x={w/2} y={h*0.60} textAnchor="middle" dominantBaseline="middle"
        fontFamily="-apple-system,Arial Black,sans-serif"
        fontSize={size*0.18} fontWeight="700"
        fill={locked?C.dim:C.white} opacity={locked?0.4:1}>
        {midText}
      </text>
      {/* BUFF wordmark */}
      <text x={w/2} y={h*0.84} textAnchor="middle" dominantBaseline="middle"
        fontFamily="-apple-system,Arial Black,sans-serif"
        fontSize={size*0.10} fontWeight="700" letterSpacing="2"
        fill={locked?C.dim:C.white} opacity={locked?0.3:0.6}>
        BUFF
      </text>
    </svg>
  );
}

// ── PR Popup Badge (Nike style) ───────────────────────────
function PRBadge({pr, onClose}){
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState(0);

  useEffect(()=>{const t=setTimeout(()=>setPhase(1),30);return()=>clearTimeout(t);},[]);

  // Draw to canvas for sharing
  useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const W=400, H=520;
    // Background
    ctx.fillStyle = "#111111";
    ctx.fillRect(0,0,W,H);

    // Shield shape
    const sx=W/2, sy=60, sw=180, sh=sw*1.25;
    const drawShield=(inset=0)=>{
      const r=10;
      ctx.beginPath();
      ctx.moveTo(sx-sw/2+r+inset, sy+inset);
      ctx.lineTo(sx+sw/2-r-inset, sy+inset);
      ctx.arcTo(sx+sw/2-inset, sy+inset, sx+sw/2-inset, sy+r+inset, r);
      ctx.lineTo(sx+sw/2-inset, sy+sh*0.68-inset);
      ctx.lineTo(sx, sy+sh-inset*1.5);
      ctx.lineTo(sx-sw/2+inset, sy+sh*0.68-inset);
      ctx.lineTo(sx-sw/2+inset, sy+r+inset);
      ctx.arcTo(sx-sw/2+inset, sy+inset, sx-sw/2+r+inset, sy+inset, r);
      ctx.closePath();
    };
    // Fill
    drawShield();
    ctx.fillStyle = C.crimson;
    ctx.fill();
    // Outer border
    drawShield();
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 4;
    ctx.stroke();
    // Inner border
    drawShield(10);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Exercise text
    const shortName = pr.exercise.replace("Press","").replace("Barbell","BB").replace("Dumbbell","DB").trim();
    ctx.fillStyle = C.white;
    ctx.font = `900 ${Math.min(38, 160/shortName.length)}px Arial Black, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(shortName.toUpperCase(), sx, sy + sh*0.35);

    // PR text
    ctx.font = "700 28px Arial Black, sans-serif";
    ctx.fillText("PR", sx, sy + sh*0.57);

    // BUFF
    ctx.font = "700 13px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.letterSpacing = "3px";
    ctx.fillText("BUFF", sx, sy + sh*0.82);

    // Weight × reps below shield
    ctx.fillStyle = C.white;
    ctx.font = "700 36px -apple-system, Arial, sans-serif";
    ctx.fillText(`${pr.weight}kg × ${pr.reps}`, sx, sy+sh+52);

    // Watermark
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "500 14px Arial, sans-serif";
    ctx.fillText("buff.app", sx, H-18);
  },[pr]);

  const share = async()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    canvas.toBlob(async blob=>{
      const file = new File([blob],"buff-pr.png",{type:"image/png"});
      if(navigator.share&&navigator.canShare({files:[file]})){
        try{await navigator.share({files:[file],title:`${pr.exercise} PR!`,text:`New ${pr.exercise} PR on Buff — ${pr.weight}kg × ${pr.reps}!`});}catch(e){}
      } else {
        const a=document.createElement("a");a.href=canvas.toDataURL();a.download="buff-pr.png";a.click();
      }
    },"image/png");
  };

  const style={
    overlay:{position:"fixed",inset:0,zIndex:3000,background:"rgba(0,0,0,0.92)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,
      opacity:phase?1:0,transition:"opacity 0.25s"},
    badge:{transform:phase?"scale(1) translateY(0)":"scale(0.75) translateY(50px)",
      transition:"transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",
      display:"flex",flexDirection:"column",alignItems:"center"},
  };

  // Short label for shield
  const shortName = pr.exercise.replace("Press","").replace("Barbell","BB").replace("Dumbbell","DB").trim().toUpperCase();

  return(
    <div style={style.overlay}>
      <button onClick={onClose} style={{position:"absolute",top:24,right:24,
        background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",
        color:C.white,borderRadius:"50%",width:40,height:40,fontSize:20,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",fontWeight:300}}>×</button>

      <div style={style.badge}>
        {/* Shield */}
        <div style={{filter:"drop-shadow(0 8px 32px rgba(196,30,30,0.6))"}}>
          <ShieldSVG topText={shortName} midText="PR" size={160}/>
        </div>

        {/* Weight × reps */}
        <div style={{marginTop:22,fontSize:28,fontWeight:800,color:C.white,letterSpacing:-0.5}}>
          {pr.weight}kg × {pr.reps}
        </div>

        {/* Exercise name full */}
        <div style={{marginTop:6,fontSize:16,fontWeight:500,color:C.muted,letterSpacing:0.5}}>
          {pr.exercise}
        </div>

        {/* NEW RECORD label */}
        <div style={{marginTop:14,background:C.crimson,borderRadius:20,
          padding:"5px 18px",fontSize:13,fontWeight:700,color:C.white,letterSpacing:1.5}}>
          NEW RECORD
        </div>
      </div>

      <canvas ref={canvasRef} width={400} height={520} style={{display:"none"}}/>

      <button onClick={share} style={{marginTop:36,background:C.white,border:"none",
        borderRadius:14,padding:"16px 52px",color:"#000",fontSize:17,fontWeight:800,
        cursor:"pointer",letterSpacing:0.5,
        transform:phase?"translateY(0)":"translateY(20px)",opacity:phase?1:0,
        transition:"transform 0.4s ease 0.25s, opacity 0.4s ease 0.25s"}}>
        Share ↑
      </button>
    </div>
  );
}

// ── Charts ────────────────────────────────────────────────
function LineChart({data,valueKey,color,unitLabel="",formatVal}){
  const col=color||C.crimson;
  if(!data||data.length<2)return<div style={{color:C.dim,textAlign:"center",padding:"22px 0",fontSize:13}}>Save at least 2 entries to see the chart</div>;
  const W=320,H=140,PX=24,PY=18;
  const vals=data.map(d=>d[valueKey]);
  const maxV=Math.max(...vals),minV=Math.min(...vals),range=maxV-minV||1;
  const toX=i=>PX+(i/(data.length-1))*(W-PX*2);
  const toY=v=>PY+(1-(v-minV)/range)*(H-PY*2);
  const pts=data.map((d,i)=>({x:toX(i),y:toY(d[valueKey]),d}));
  const pathD=pts.map((p,i)=>`${i===0?"M":"L"}${p.x},${p.y}`).join(" ");
  const areaD=`${pathD} L${pts[pts.length-1].x},${H-PY} L${pts[0].x},${H-PY} Z`;
  const gid=`gl${col.replace(/[^a-z0-9]/gi,"")}${valueKey}`;
  const fmt=formatVal||(v=>`${v}${unitLabel}`);
  return(
    <div style={{background:C.surface,borderRadius:12,padding:"14px 6px 12px",border:`1px solid ${C.border}`}}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={col} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gid})`}/>
        <path d={pathD} fill="none" stroke={col} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
        {pts.map((p,i)=>(
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4.5" fill={col} stroke={C.bg} strokeWidth="2"/>
            {(i===0||i===pts.length-1)&&(
              <text x={p.x} y={p.y-9} textAnchor="middle" fill={col} fontSize="10" fontWeight="700">{fmt(p.d[valueKey])}</text>
            )}
          </g>
        ))}
        <text x={pts[0].x} y={H-1} textAnchor="middle" fill={C.dim} fontSize="8">{data[0].dateKey}</text>
        <text x={pts[pts.length-1].x} y={H-1} textAnchor="middle" fill={C.dim} fontSize="8">{data[data.length-1].dateKey}</text>
      </svg>
    </div>
  );
}
function BarChart({data,valueKey,color,unitLabel="",formatVal}){
  const col=color||C.green;
  if(!data||data.length<2)return<div style={{color:C.dim,textAlign:"center",padding:"22px 0",fontSize:13}}>Save at least 2 sessions to see the chart</div>;
  const W=320,H=140,PX=8,PY=20,GAP=4;
  const maxV=Math.max(...data.map(d=>d[valueKey]))||1;
  const barW=Math.max(4,(W-PX*2-(data.length-1)*GAP)/data.length);
  const fmt=formatVal||(v=>`${v}${unitLabel}`);
  return(
    <div style={{background:C.surface,borderRadius:12,padding:"14px 6px 12px",border:`1px solid ${C.border}`}}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
        {data.map((d,i)=>{
          const bh=(d[valueKey]/maxV)*(H-PY-8);
          const x=PX+i*(barW+GAP),y=H-PY-bh;
          return(<g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx="3" fill={col} fillOpacity="0.85"/>
            {(i===0||i===data.length-1)&&<>
              <text x={x+barW/2} y={y-4} textAnchor="middle" fill={col} fontSize="9" fontWeight="700">{fmt(d[valueKey])}</text>
              <text x={x+barW/2} y={H-2} textAnchor="middle" fill={C.dim} fontSize="7">{d.dateKey}</text>
            </>}
          </g>);
        })}
      </svg>
    </div>
  );
}

// ── Workout Card ──────────────────────────────────────────
function WorkoutCard({w,onTap,onDelete}){
  return(
    <div onClick={()=>onTap&&onTap(w.exercise)}
      style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,cursor:onTap?"pointer":"default"}}
      onTouchStart={e=>{if(onTap)e.currentTarget.style.background=C.elevated}}
      onTouchEnd={e=>{if(onTap)e.currentTarget.style.background="transparent"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <span style={{display:"inline-block",background:C.crimson,color:C.white,
          fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20,marginBottom:6,letterSpacing:0.3}}>
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
          <span style={{fontSize:36,fontWeight:800,letterSpacing:-2,color:C.text}}>{w.best1RM}</span>
          <span style={{fontSize:14,color:C.muted}}> {w.unit}</span>
        </div>
        {onTap&&<span style={{color:C.dim,fontSize:22,paddingBottom:4}}>›</span>}
      </div>
      <div style={{marginTop:6,background:C.elevated,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.border}`}}>
        {w.sets.map((s,i)=>(
          <div key={i} style={{display:"flex",gap:8,fontSize:13,color:C.muted,marginBottom:i<w.sets.length-1?4:0,alignItems:"center"}}>
            <span style={{color:C.dim,fontSize:11,width:40}}>Set {s.setNum}</span>
            <span style={{color:C.text,fontWeight:600}}>{s.weight}{w.unit}</span>
            <span>× {s.reps} reps</span>
            <span style={{marginLeft:"auto",color:C.white,fontWeight:600,fontSize:12,opacity:0.7}}>{s.weight*s.reps}{w.unit}</span>
          </div>
        ))}
        <div style={{marginTop:6,paddingTop:6,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between"}}>
          <span style={{color:C.muted,fontSize:12}}>Total Volume</span>
          <span style={{color:C.white,fontWeight:700,fontSize:13}}>{w.volume} {w.unit}</span>
        </div>
      </div>
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────
function CalendarView({workoutDates,selectedDateKey,onSelectDate,highlightOnly=false}){
  const today=new Date();
  const [vy,setVy]=useState(today.getFullYear());
  const [vm,setVm]=useState(today.getMonth());
  const fd=new Date(vy,vm,1).getDay();
  const dim=new Date(vy,vm+1,0).getDate();
  const cells=[];
  for(let i=0;i<fd;i++)cells.push(null);
  for(let d=1;d<=dim;d++)cells.push(d);
  const prev=()=>{if(vm===0){setVy(y=>y-1);setVm(11);}else setVm(m=>m-1);};
  const next=()=>{if(vm===11){setVy(y=>y+1);setVm(0);}else setVm(m=>m+1);};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 16px 12px"}}>
        <button onClick={prev} style={{background:C.elevated,border:`1px solid ${C.border}`,color:C.text,fontSize:20,borderRadius:8,width:36,height:36,cursor:"pointer"}}>‹</button>
        <span style={{fontSize:17,fontWeight:600,color:C.text}}>{MONTHS[vm]} {vy}</span>
        <button onClick={next} style={{background:C.elevated,border:`1px solid ${C.border}`,color:C.text,fontSize:20,borderRadius:8,width:36,height:36,cursor:"pointer"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"0 12px",marginBottom:4}}>
        {DAY_LABELS.map(d=><div key={d} style={{textAlign:"center",fontSize:11,color:C.muted,padding:"3px 0"}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"0 12px",gap:2}}>
        {cells.map((day,i)=>{
          if(!day)return<div key={i}/>;
          const dk=`${vy}-${String(vm+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isToday=dk===todayKey(),isSelected=dk===selectedDateKey,has=workoutDates.has(dk);
          const clickable=!highlightOnly||(highlightOnly&&has);
          return(
            <div key={i} onClick={()=>clickable&&onSelectDate(dk)}
              style={{aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                borderRadius:"50%",cursor:clickable?"pointer":"default",
                background:isSelected?C.crimson:isToday?C.elevated:"transparent",
                border:isToday&&!isSelected?`1px solid ${C.borderW}`:"1px solid transparent"}}>
              <span style={{fontSize:14,fontWeight:isToday||isSelected?700:400,
                color:isSelected?C.white:has?C.crimsonL:C.text}}>{day}</span>
              {has&&!isSelected&&<div style={{width:4,height:4,borderRadius:"50%",background:C.crimson,marginTop:1}}/>}
            </div>
          );
        })}
      </div>
      <div style={{padding:"10px 16px 0",color:C.dim,fontSize:12,textAlign:"center"}}>
        {highlightOnly?"Tap a highlighted day to view that workout":"Tap any day to log for that date"}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
export default function App(){
  const [tab,setTab]=useState("Calculator");
  const [showSettings,setShowSettings]=useState(false);
  const [selectedDateKey,setSelectedDateKey]=useState(todayKey());
  const [showCalPicker,setShowCalPicker]=useState(false);
  const [prBadge,setPrBadge]=useState(null);

  // Settings
  const [achievementsOn,setAchievementsOn]=useState(()=>lsGet("achievementsOn",true));

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

  // History
  const [historyTab,setHistoryTab]=useState("Lifts");
  const [calWorkoutDay,setCalWorkoutDay]=useState(null);

  // Body
  const [bwHistory,setBwHistory]=useState(()=>lsGet("bwHistory",[]));
  const [bwInput,setBwInput]=useState("");
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

  // Badges page
  const [badgeDetail,setBadgeDetail]=useState(null); // {exercise, type:"pr"|"tonnage"}

  useEffect(()=>{lsSet("workouts2",workouts);},[workouts]);
  useEffect(()=>{lsSet("unit",unit);},[unit]);
  useEffect(()=>{lsSet("exercises",exercises);},[exercises]);
  useEffect(()=>{lsSet("bwHistory",bwHistory);},[bwHistory]);
  useEffect(()=>{lsSet("bfHistory",bfHistory);},[bfHistory]);
  useEffect(()=>{lsSet("bfGender",bfGender);},[bfGender]);
  useEffect(()=>{lsSet("bfHeight",bfHeight);},[bfHeight]);
  useEffect(()=>{lsSet("achievementsOn",achievementsOn);},[achievementsOn]);

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
    const isPR = achievementsOn && checkPR(newSet,workouts,exercise,selectedDateKey);

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
    if(isPR){setTimeout(()=>setPrBadge({exercise,weight:weightNum,reps:repsNum,unit}),300);}
    else showToast(`✓ Set ${setNum} saved!`);
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
    setBfHistory(prev=>[...prev,{id:Date.now(),bodyfat:bfRounded,dateKey:selectedDateKey}]);
    setBfWaist("");setBfNeck("");setBfHips("");showToast("✓ Body fat saved!");
  };
  const saveBW=()=>{
    const bw=parseFloat(bwInput);
    if(!bw||bw<=0)return;
    setBwHistory(prev=>[...prev,{id:Date.now(),bodyweight:bw,dateKey:selectedDateKey}]);
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
  const inp={background:C.white,border:"none",borderRadius:10,padding:"14px",color:"#000",
    fontSize:16,outline:"none",width:"100%",boxSizing:"border-box",WebkitAppearance:"none",fontWeight:600};
  const btnP={background:C.crimson,border:"none",borderRadius:12,padding:18,color:C.white,
    fontSize:17,fontWeight:700,cursor:"pointer",width:"100%",letterSpacing:0.3};
  const btnGold={background:`linear-gradient(135deg,${C.gold},${C.goldL})`,border:"none",
    borderRadius:12,padding:18,color:"#000",fontSize:17,fontWeight:800,cursor:"pointer",width:"100%"};
  const btnO=(color)=>({background:"transparent",border:`1px solid ${color||C.dim}`,
    borderRadius:12,padding:18,color:color||C.dim,fontSize:17,fontWeight:500,cursor:"pointer",width:"100%"});
  const divRow={display:"flex",justifyContent:"space-between",alignItems:"center",
    padding:"13px 16px",borderBottom:`1px solid ${C.border}`};
  const secLabel={fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:2,
    marginBottom:12,fontWeight:700,marginTop:4};

  // ── CALCULATOR ────────────────────────────────────────────
  const setNum=currentSetNum();
  const renderCalculator=()=>(
    <div>
      <div style={{textAlign:"center",padding:"20px 20px 16px"}}>
        <div style={{color:C.muted,fontSize:12,marginBottom:4,letterSpacing:2,textTransform:"uppercase"}}>Estimated 1RM</div>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:4}}>
          <span style={{fontSize:82,fontWeight:900,lineHeight:1,letterSpacing:-4,color:C.text}}>{oneRM}</span>
          <span style={{fontSize:30,color:C.muted,paddingBottom:10,fontWeight:300}}>{unit}</span>
        </div>
        <div style={{height:1,background:`linear-gradient(90deg,transparent,${C.borderW},transparent)`,marginTop:16}}/>
      </div>

      <div style={{display:"flex",gap:8,padding:"0 16px",marginBottom:10}}>
        <div style={{flex:2}}>
          <div style={{color:C.muted,fontSize:11,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>Weight</div>
          <div style={{position:"relative"}}>
            <input style={{...inp,paddingRight:38}} inputMode="decimal" placeholder="0"
              value={weight} onChange={e=>setWeight(e.target.value)}/>
            <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"#666",fontSize:13,fontWeight:700,pointerEvents:"none"}}>{unit}</span>
          </div>
        </div>
        <div style={{flex:1.3}}>
          <div style={{color:C.muted,fontSize:11,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>Reps</div>
          <input style={inp} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0"
            value={reps} onChange={e=>setReps(e.target.value.replace(/[^0-9]/g,""))}/>
        </div>
      </div>

      <div style={{padding:"0 16px",marginBottom:10,position:"relative"}}>
        <div style={{color:C.muted,fontSize:11,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>Exercise</div>
        <div onClick={()=>setShowExDrop(v=>!v)}
          style={{...inp,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{exercise}</span><span style={{color:"#666",fontSize:12}}>▾</span>
        </div>
        {showExDrop&&(
          <div style={{position:"absolute",top:"calc(100% - 4px)",left:16,right:16,zIndex:200,
            background:"#1a1a1a",borderRadius:10,maxHeight:220,overflowY:"auto",
            border:`1px solid ${C.borderW}`,boxShadow:"0 8px 32px rgba(0,0,0,0.8)"}}>
            {exercises.map(ex=>(
              <div key={ex} onClick={()=>{setExercise(ex);setShowExDrop(false);}}
                style={{padding:"13px 14px",cursor:"pointer",fontSize:15,borderBottom:`1px solid ${C.border}`,
                  color:ex===exercise?C.crimsonL:C.text,background:ex===exercise?"#2a0808":"transparent"}}>
                {ex}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{display:"flex",gap:8,padding:"0 16px",marginBottom:10}}>
        <div style={{flex:1,background:C.surface,borderRadius:10,padding:"10px 14px",
          display:"flex",alignItems:"center",justifyContent:"space-between",border:`1px solid ${C.borderW}`}}>
          <span style={{color:C.muted,fontSize:13}}>Current set</span>
          <span style={{fontSize:22,fontWeight:800,color:C.white}}>{setNum}</span>
        </div>
        <div onClick={()=>setShowCalPicker(true)}
          style={{flex:1.2,background:C.surface,borderRadius:10,padding:"10px 14px",
            display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",border:`1px solid ${C.borderW}`}}>
          <div>
            <div style={{color:C.muted,fontSize:11,textTransform:"uppercase",letterSpacing:0.5}}>Date</div>
            <div style={{color:isToday?C.green:C.crimsonL,fontWeight:600,fontSize:14}}>{isToday?"Today":selectedDateKey}</div>
          </div>
          <span style={{fontSize:18}}>📅</span>
        </div>
      </div>

      {weightNum>0&&repsNum>0&&(
        <div style={{margin:"0 16px 10px",background:C.surface,borderRadius:10,padding:"10px 14px",
          display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${C.border}`}}>
          <span style={{color:C.muted,fontSize:13}}>Set {setNum} volume</span>
          <span style={{fontWeight:700,fontSize:15,color:C.white}}>{weightNum*repsNum} {unit}</span>
        </div>
      )}

      <div style={{padding:"0 16px 8px",display:"flex",flexDirection:"column",gap:10}}>
        <button style={btnP} onClick={saveSet}>Save Set {setNum}</button>
        <button style={btnO(C.dim)} onClick={()=>{setWeight("");setReps("");}}>Clear</button>
      </div>

      <div style={{padding:"10px 16px 6px"}}>
        <span style={{color:C.crimsonL,fontSize:14,cursor:"pointer"}} onClick={()=>setShowInfo(true)}>What is 1RM?</span>
      </div>
      <div style={{padding:"6px 16px 10px"}}>
        <div style={{fontSize:16,fontWeight:700,color:C.text}}>Estimated Rep Maxes</div>
      </div>
      {REP_PERCENTAGES.filter(r=>r.reps>1).map(({reps:r,pct})=>(
        <div key={r} style={divRow}>
          <span style={{fontSize:15,color:C.muted,flex:1}}>{r} Reps</span>
          <span style={{fontSize:15,flex:1,textAlign:"center",color:C.text,fontWeight:oneRM?600:400}}>
            {oneRM?`${Math.round(oneRM*pct/100)} ${unit}`:"—"}</span>
          <span style={{fontSize:14,color:C.dim,flex:1,textAlign:"right"}}>{pct}%</span>
        </div>
      ))}
    </div>
  );

  // ── HISTORY ───────────────────────────────────────────────
  const renderHistory=()=>{
    if(calWorkoutDay){
      const dw=workouts.filter(w=>w.dateKey===calWorkoutDay);
      return(
        <div>
          <div style={{padding:"20px 20px 12px",display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>setCalWorkoutDay(null)} style={{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer",padding:0}}>←</button>
            <span style={{fontSize:20,fontWeight:700,color:C.text}}>{calWorkoutDay}</span>
          </div>
          {dw.length===0
            ?<div style={{textAlign:"center",color:C.dim,padding:40,fontSize:15}}>No workouts on this day</div>
            :dw.map(w=><WorkoutCard key={w.id} w={w} onTap={goToExercise} onDelete={deleteWorkout}/>)}
        </div>
      );
    }
    return(
      <div>
        <div style={{display:"flex",padding:"0 16px",borderBottom:`1px solid ${C.border}`}}>
          {["Lifts","Workouts"].map(t=>(
            <button key={t} onClick={()=>setHistoryTab(t)} style={{
              flex:1,background:"none",border:"none",
              borderBottom:`2px solid ${historyTab===t?C.crimson:"transparent"}`,
              color:historyTab===t?C.white:C.dim,
              padding:"12px 0",fontSize:16,cursor:"pointer",fontWeight:historyTab===t?700:400}}>
              {t}
            </button>
          ))}
        </div>
        {historyTab==="Lifts"
          ?(workouts.length===0
            ?<div style={{textAlign:"center",color:C.dim,padding:60,fontSize:15}}>No history yet. Save your first set.</div>
            :workouts.map(w=><WorkoutCard key={w.id} w={w} onTap={goToExercise} onDelete={deleteWorkout}/>))
          :(<div style={{paddingTop:12}}>
              <CalendarView workoutDates={workoutDates} selectedDateKey={null}
                onSelectDate={dk=>{if(workoutDates.has(dk))setCalWorkoutDay(dk);}} highlightOnly={true}/>
            </div>)
        }
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
            <button onClick={()=>setSelEx(null)} style={{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer",padding:0}}>←</button>
            <span style={{fontSize:20,fontWeight:700,color:C.text}}>{selEx}</span>
          </div>
          <button onClick={()=>{setWorkouts(prev=>prev.filter(w=>w.exercise!==selEx));setSelEx(null);}}
            style={{background:"none",border:"none",color:"#e55",cursor:"pointer",fontSize:20}}>🗑</button>
        </div>
        <div style={{display:"flex",padding:"10px 16px 0"}}>
          {["Chart","History"].map(t=>(
            <button key={t} onClick={()=>setExDetailTab(t)} style={{
              flex:1,background:"none",border:"none",
              borderBottom:`2px solid ${exDetailTab===t?C.crimson:"transparent"}`,
              color:exDetailTab===t?C.white:C.dim,
              padding:"10px 0",fontSize:16,cursor:"pointer",fontWeight:exDetailTab===t?700:400}}>
              {t}
            </button>
          ))}
        </div>
        {exDetailTab==="Chart"?(
          <div style={{paddingTop:14}}>
            <div style={{display:"flex",gap:8,padding:"0 16px",marginBottom:12}}>
              {[["1rm","Est. 1RM",C.crimson],["volume","Volume",C.green]].map(([key,label,col])=>(
                <button key={key} onClick={()=>setChartMetric(key)} style={{
                  flex:1,background:chartMetric===key?col+"22":C.surface,
                  border:`1.5px solid ${chartMetric===key?col:C.border}`,
                  borderRadius:8,padding:"9px 0",color:chartMetric===key?col:C.muted,
                  fontSize:13,fontWeight:chartMetric===key?700:400,cursor:"pointer"}}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{padding:"0 16px 4px"}}>
              {chartMetric==="1rm"
                ?<><div style={{fontSize:12,color:C.muted,marginBottom:8}}>Best estimated 1RM per session</div>
                   <LineChart data={exWorkouts} valueKey="best1RM" unitLabel={ul} color={C.crimson}/></>
                :<><div style={{fontSize:12,color:C.muted,marginBottom:8}}>Total volume per session</div>
                   <BarChart data={exWorkouts} valueKey="volume" color={C.green}
                     formatVal={v=>v>=1000?`${(v/1000).toFixed(1)}k`:String(v)} unitLabel={ul}/></>
              }
            </div>
            <div style={{padding:"20px 16px 4px"}}>
              <div style={{fontSize:17,fontWeight:700,color:C.text}}>Rep Max Records</div>
              <div style={{fontSize:12,color:C.muted,marginTop:3}}>Heaviest weight ever lifted at each rep count</div>
            </div>
            {REP_RANGE.map(r=>{
              const record=repRecords[r];
              const allForRep=exWorkouts.flatMap(w=>w.sets.filter(s=>s.reps===r));
              const latestForRep=latest?.sets.find(s=>s.reps===r);
              const isNewPR=record&&latestForRep&&latestForRep.weight===record.weight&&allForRep.length>=2;
              return(
                <div key={r} style={{...divRow,background:isNewPR?C.elevated:"transparent"}}>
                  <span style={{fontSize:15,flex:1,fontWeight:500,color:C.text}}>{r} Rep Max</span>
                  <span style={{fontSize:17,flex:1.5,textAlign:"center",fontWeight:record?800:400,color:C.text}}>
                    {record?`${record.weight} `:<span style={{color:C.dim}}>—</span>}
                    {record&&<span style={{fontSize:12,color:C.muted,fontWeight:400}}>{record.unit}</span>}
                  </span>
                  <span style={{fontSize:12,flex:1,textAlign:"right"}}>
                    {isNewPR?<span style={{color:C.crimsonL,fontWeight:700}}>★ PR</span>
                      :record?<span style={{color:C.dim}}>{record.date}</span>:null}
                  </span>
                </div>
              );
            })}
          </div>
        ):(
          <div style={{paddingTop:8}}>
            {exWorkouts.length===0
              ?<div style={{textAlign:"center",color:C.dim,padding:40}}>No entries yet</div>
              :[...exWorkouts].reverse().map(w=>(
                <div key={w.id} style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`}}>
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
                      <span style={{marginLeft:"auto",color:C.white,fontSize:12,fontWeight:600,opacity:0.6}}>{s.weight*s.reps}{w.unit}</span>
                    </div>
                  ))}
                  <div style={{marginTop:6,paddingTop:6,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between"}}>
                    <span style={{color:C.muted,fontSize:12}}>Total Volume</span>
                    <span style={{color:C.text,fontWeight:700,fontSize:13}}>{w.volume} {w.unit}</span>
                  </div>
                </div>
              ))
            }
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
          <span style={{position:"absolute",left:28,top:"50%",transform:"translateY(-50%)",color:C.muted}}>🔍</span>
          <input style={{...inp,paddingLeft:40}} placeholder="Search exercises"
            value={exSearch} onChange={e=>setExSearch(e.target.value)}/>
        </div>
        {filteredExercises.map(ex=>{
          const has=workouts.some(w=>w.exercise===ex);
          return(
            <div key={ex} onClick={()=>{setSelEx(ex);setExDetailTab("Chart");setChartMetric("1rm");}}
              style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"16px",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>
              <div>
                <span style={{fontSize:16,color:C.text}}>{ex}</span>
                {has&&<span style={{marginLeft:8,fontSize:11,color:C.crimsonL}}>● tracked</span>}
              </div>
              <span style={{color:C.dim,fontSize:20}}>›</span>
            </div>
          );
        })}
        <div style={{padding:16,borderTop:`1px solid ${C.border}`,display:"flex",gap:8,marginTop:8}}>
          <input style={{...inp,flex:1}} placeholder="Add new exercise..."
            value={newExName} onChange={e=>setNewExName(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addExercise()}/>
          <button onClick={addExercise} style={{...btnP,width:"auto",padding:"14px 20px"}}>Add</button>
        </div>
      </div>
    );
  };

  // ── BODY ──────────────────────────────────────────────────
  const renderBody=()=>(
    <div style={{padding:16}}>
      <div style={secLabel}>Body Weight</div>
      <div style={{background:C.surface,borderRadius:14,padding:16,marginBottom:24,border:`1px solid ${C.border}`}}>
        <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"flex-end"}}>
          <div style={{flex:1}}>
            <div style={{color:C.muted,fontSize:12,marginBottom:5}}>Weight (kg)</div>
            <div style={{position:"relative"}}>
              <input style={{...inp,paddingRight:38}} inputMode="decimal" placeholder="0.0"
                value={bwInput} onChange={e=>setBwInput(e.target.value)}/>
              <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"#666",fontSize:13,pointerEvents:"none"}}>kg</span>
            </div>
          </div>
          <button onClick={saveBW} style={{...btnGold,width:"auto",padding:"14px 18px",flexShrink:0}}>Save</button>
        </div>
        {bwHistory.length>0&&(()=>{
          const lat=bwHistory[bwHistory.length-1];
          const p2=bwHistory.length>1?bwHistory[bwHistory.length-2]:null;
          const diff=p2?((lat.bodyweight-p2.bodyweight).toFixed(1)):null;
          const col=diff&&parseFloat(diff)<0?C.green:diff&&parseFloat(diff)>0?"#f87171":C.muted;
          return(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              marginBottom:14,background:C.elevated,borderRadius:10,padding:"10px 14px",border:`1px solid ${C.border}`}}>
              <div>
                <div style={{fontSize:11,color:C.muted}}>Latest</div>
                <div style={{fontSize:26,fontWeight:800,letterSpacing:-1,color:C.text}}>
                  {lat.bodyweight}<span style={{fontSize:13,color:C.muted,fontWeight:400}}> kg</span>
                </div>
              </div>
              {diff&&<div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:C.muted}}>{lat.dateKey}</div>
                <div style={{fontSize:14,color:col,fontWeight:700}}>{parseFloat(diff)>0?"+":""}{diff} kg</div>
              </div>}
            </div>
          );
        })()}
        <LineChart data={bwHistory} valueKey="bodyweight" unitLabel="kg" color={C.green}/>
        {bwHistory.length>0&&(
          <div style={{marginTop:12}}>
            {[...bwHistory].reverse().slice(0,5).map(e=>(
              <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:15,fontWeight:600,color:C.text}}>{e.bodyweight} kg</span>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:12,color:C.dim}}>{e.dateKey}</span>
                  <span onClick={()=>setBwHistory(prev=>prev.filter(x=>x.id!==e.id))} style={{color:"#e55",fontSize:18,cursor:"pointer"}}>×</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={secLabel}>Body Fat — US Navy Method</div>
      <div style={{background:C.surface,borderRadius:14,padding:16,marginBottom:24,border:`1px solid ${C.border}`}}>
        <div style={{fontSize:13,color:C.muted,marginBottom:14,lineHeight:1.5}}>All measurements in <b style={{color:C.text}}>centimetres</b>.</div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {["male","female"].map(g=>(
            <button key={g} onClick={()=>setBfGender(g)} style={{
              flex:1,background:bfGender===g?C.crimson:C.elevated,border:`1px solid ${bfGender===g?C.crimson:C.border}`,
              borderRadius:8,padding:"10px 0",color:C.white,fontSize:14,fontWeight:bfGender===g?700:400,cursor:"pointer",textTransform:"capitalize"}}>
              {g}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <div style={{flex:1}}>
            <div style={{color:C.muted,fontSize:12,marginBottom:5}}>Height (cm)</div>
            <input style={inp} inputMode="decimal" placeholder="175" value={bfHeight} onChange={e=>setBfHeight(e.target.value)}/>
          </div>
          <div style={{flex:1}}>
            <div style={{color:C.muted,fontSize:12,marginBottom:5}}>Neck (cm)</div>
            <input style={inp} inputMode="decimal" placeholder="38" value={bfNeck} onChange={e=>setBfNeck(e.target.value)}/>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <div style={{flex:1}}>
            <div style={{color:C.muted,fontSize:12,marginBottom:5}}>Waist (cm)</div>
            <input style={inp} inputMode="decimal" placeholder="85" value={bfWaist} onChange={e=>setBfWaist(e.target.value)}/>
          </div>
          {bfGender==="female"&&<div style={{flex:1}}>
            <div style={{color:C.muted,fontSize:12,marginBottom:5}}>Hips (cm)</div>
            <input style={inp} inputMode="decimal" placeholder="95" value={bfHips} onChange={e=>setBfHips(e.target.value)}/>
          </div>}
        </div>
        {bfRounded&&bfRounded>0?(
          <div style={{background:C.elevated,borderRadius:12,padding:16,marginBottom:14,textAlign:"center",border:`1px solid ${C.border}`}}>
            <div style={{fontSize:13,color:C.muted,marginBottom:4}}>Estimated Body Fat</div>
            <div style={{fontSize:50,fontWeight:800,letterSpacing:-2,color:bfCat?.color||C.text}}>
              {bfRounded}<span style={{fontSize:22,fontWeight:400,color:C.muted}}>%</span>
            </div>
            <div style={{display:"inline-block",background:bfCat?.color+"22",border:`1px solid ${bfCat?.color}`,
              borderRadius:20,padding:"4px 14px",fontSize:13,fontWeight:600,color:bfCat?.color,marginTop:4}}>
              {bfCat?.label}
            </div>
          </div>
        ):(
          <div style={{background:C.elevated,borderRadius:12,padding:14,marginBottom:14,textAlign:"center",color:C.dim,fontSize:14}}>
            Fill in all measurements to see your result
          </div>
        )}
        <button onClick={saveBF} style={{...btnP,opacity:bfRounded&&bfRounded>0?1:0.4}}>Save Body Fat Reading</button>
        {bfHistory.length>0&&(
          <div style={{marginTop:16}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:8}}>Body fat % over time</div>
            <LineChart data={bfHistory} valueKey="bodyfat" unitLabel="%" color={C.gold}/>
          </div>
        )}
      </div>
    </div>
  );

  // ── BADGES ────────────────────────────────────────────────
  // Get all exercises that have at least 2 entries (real PRs possible)
  const trackedExercises = exercises.filter(ex=>
    workouts.filter(w=>w.exercise===ex).length>0
  );

  // Badge detail page
  if(badgeDetail){
    const {exercise:bEx, type} = badgeDetail;
    if(type==="pr"){
      // Show all rep max records for this exercise
      const bWorkouts=[...workouts.filter(w=>w.exercise===bEx)].sort((a,b)=>a.dateKey.localeCompare(b.dateKey));
      const recs=getRepRecords(bWorkouts);
      const shortName=bEx.replace("Press","").replace("Barbell","BB").replace("Dumbbell","DB").trim().toUpperCase();
      return(
        <div style={{background:C.bg,minHeight:"100vh",maxWidth:430,margin:"0 auto"}}>
          <div style={{padding:"20px 20px 12px",display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>setBadgeDetail(null)} style={{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer",padding:0}}>←</button>
            <span style={{fontSize:20,fontWeight:700,color:C.text}}>{bEx} — PRs</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:24,justifyContent:"center",padding:"16px 16px 24px"}}>
            {REP_RANGE.map(r=>{
              const rec=recs[r];
              return(
                <div key={r} style={{display:"flex",flexDirection:"column",alignItems:"center",width:90}}>
                  <ShieldSVG topText={shortName} midText={`${r}RM`} size={80} locked={!rec}/>
                  <div style={{marginTop:8,textAlign:"center"}}>
                    <div style={{fontSize:13,fontWeight:700,color:rec?C.text:C.dim}}>{rec?`${rec.weight}${rec.unit}`:"—"}</div>
                    <div style={{fontSize:10,color:C.dim,marginTop:2}}>{r} Rep Max</div>
                    {rec&&<div style={{fontSize:9,color:C.dim,marginTop:1}}>{rec.date}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    } else {
      // Tonnage badge detail — show all tiers and which are unlocked
      const defs=TONNAGE_BADGES[bEx]||[];
      const unlocked=getUnlockedTonnageBadges(workouts,bEx,bwHistory);
      const unlockedIds=new Set(unlocked.map(b=>b.id));
      const shortName=bEx.replace("Press","").replace("Barbell","BB").replace("Dumbbell","DB").trim().toUpperCase();
      return(
        <div style={{background:C.bg,minHeight:"100vh",maxWidth:430,margin:"0 auto"}}>
          <div style={{padding:"20px 20px 12px",display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>setBadgeDetail(null)} style={{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer",padding:0}}>←</button>
            <span style={{fontSize:20,fontWeight:700,color:C.text}}>{bEx} — Milestones</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:24,justifyContent:"center",padding:"16px 16px 24px"}}>
            {[...defs].reverse().map(b=>{
              const isUnlocked=unlockedIds.has(b.id);
              return(
                <div key={b.id} style={{display:"flex",flexDirection:"column",alignItems:"center",width:90}}>
                  <ShieldSVG topText={shortName} midText={b.label} size={80} locked={!isUnlocked}/>
                  <div style={{marginTop:8,textAlign:"center"}}>
                    <div style={{fontSize:12,fontWeight:700,color:isUnlocked?C.text:C.dim}}>{b.desc}</div>
                    {!isUnlocked&&<div style={{fontSize:10,color:C.dim,marginTop:2}}>Locked</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  }

  const renderBadges=()=>{
    return(
      <div style={{paddingBottom:20}}>
        {/* Exercise PR Badges */}
        <div style={{padding:"16px 16px 8px"}}>
          <div style={secLabel}>Exercise PRs</div>
          {trackedExercises.length===0?(
            <div style={{textAlign:"center",color:C.dim,padding:"20px 0",fontSize:14}}>
              Start logging lifts to earn badges
            </div>
          ):(
            <div style={{display:"flex",flexWrap:"wrap",gap:20,justifyContent:"flex-start"}}>
              {trackedExercises.map(ex=>{
                const exW=[...workouts.filter(w=>w.exercise===ex)].sort((a,b)=>a.dateKey.localeCompare(b.dateKey));
                const recs=getRepRecords(exW);
                const best1RM=recs[1]?.weight||getBest1RM(workouts,ex);
                const shortName=ex.replace("Press","").replace("Barbell","BB").replace("Dumbbell","DB").trim().toUpperCase();
                return(
                  <div key={ex} onClick={()=>setBadgeDetail({exercise:ex,type:"pr"})}
                    style={{display:"flex",flexDirection:"column",alignItems:"center",width:90,cursor:"pointer"}}>
                    <ShieldSVG topText={shortName} midText={best1RM?`${best1RM}kg`:"PR"} size={80}/>
                    <div style={{marginTop:8,textAlign:"center"}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.text,lineHeight:1.3}}>{ex}</div>
                      {best1RM>0&&<div style={{fontSize:10,color:C.muted,marginTop:2}}>{best1RM}kg 1RM</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{height:1,background:C.border,margin:"12px 0"}}/>

        {/* Tonnage Badges */}
        <div style={{padding:"8px 16px"}}>
          <div style={secLabel}>Tonnage Milestones</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:20,justifyContent:"flex-start"}}>
            {Object.keys(TONNAGE_BADGES).map(ex=>{
              const unlocked=getUnlockedTonnageBadges(workouts,ex,bwHistory);
              // Show highest unlocked, or first (locked) if none
              const defs=TONNAGE_BADGES[ex];
              const toShow=unlocked.length>0?unlocked[0]:null; // unlocked[0] = highest tier
              const shortName=ex.replace("Press","").replace("Barbell","BB").replace("Dumbbell","DB").trim().toUpperCase();
              return(
                <div key={ex} onClick={()=>setBadgeDetail({exercise:ex,type:"tonnage"})}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",width:90,cursor:"pointer"}}>
                  <ShieldSVG
                    topText={shortName}
                    midText={toShow?toShow.label:defs[defs.length-1].label}
                    size={80}
                    locked={!toShow}
                  />
                  <div style={{marginTop:8,textAlign:"center"}}>
                    <div style={{fontSize:11,fontWeight:700,color:toShow?C.text:C.dim,lineHeight:1.3}}>{ex}</div>
                    <div style={{fontSize:10,color:toShow?C.muted:C.dim,marginTop:2}}>
                      {toShow?toShow.desc:"Locked"}
                </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── SETTINGS MODAL ────────────────────────────────────────
  const renderSettings=()=>(
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:1000,display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto"}}>
      <div style={{padding:"20px 20px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.border}`}}>
        <span style={{fontSize:24,fontWeight:700,color:C.text}}>Settings</span>
        <button onClick={()=>setShowSettings(false)}
          style={{background:C.elevated,border:`1px solid ${C.borderW}`,color:C.text,borderRadius:20,padding:"6px 16px",fontSize:15,cursor:"pointer",fontWeight:600}}>Done</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 16px 40px"}}>
        <div style={secLabel}>Units</div>
        <div style={{display:"flex",gap:10,marginBottom:28}}>
          {["kg","lbs"].map(u=>(
            <button key={u} onClick={()=>setUnit(u)} style={{
              flex:1,background:unit===u?C.crimson:C.elevated,
              border:`1px solid ${unit===u?C.crimson:C.border}`,
              borderRadius:10,padding:16,color:C.white,fontSize:16,cursor:"pointer",fontWeight:unit===u?700:400}}>{u}</button>
          ))}
        </div>

        <div style={secLabel}>Achievements</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          background:C.surface,borderRadius:12,padding:"14px 16px",marginBottom:28,border:`1px solid ${C.border}`}}>
          <div>
            <div style={{color:C.text,fontSize:15,fontWeight:600}}>PR Badge Popups</div>
            <div style={{color:C.muted,fontSize:12,marginTop:2}}>Show shield badge when you hit a new record</div>
          </div>
          <div onClick={()=>setAchievementsOn(v=>!v)}
            style={{width:48,height:28,borderRadius:14,background:achievementsOn?C.crimson:C.elevated,
              border:`1px solid ${achievementsOn?C.crimson:C.borderW}`,
              cursor:"pointer",display:"flex",alignItems:"center",padding:"0 3px",
              justifyContent:achievementsOn?"flex-end":"flex-start",transition:"all 0.2s"}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:C.white}}/>
          </div>
        </div>

        <div style={secLabel}>Exercises</div>
        <div style={{display:"flex",gap:8,marginBottom:28}}>
          <input style={{...inp,flex:1}} placeholder="Add new exercise..."
            value={newExName} onChange={e=>setNewExName(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addExercise()}/>
          <button onClick={addExercise} style={{...btnP,width:"auto",padding:"14px 20px"}}>Add</button>
        </div>

        <div style={secLabel}>Data</div>
        <button onClick={()=>{if(window.confirm("Clear all workout history?"))setWorkouts([]);}} style={{...btnO("#e55"),marginBottom:10}}>Clear All Workout History</button>
        <button onClick={()=>{if(window.confirm("Clear body weight history?"))setBwHistory([]);}} style={{...btnO("#e55"),marginBottom:10}}>Clear Body Weight History</button>
        <button onClick={()=>{if(window.confirm("Clear body fat history?"))setBfHistory([]);}} style={{...btnO("#e55"),marginBottom:10}}>Clear Body Fat History</button>
        <button onClick={()=>{if(window.confirm("Reset exercise list?"))setExercises(DEFAULT_EXERCISES);}} style={{...btnO(C.muted),marginBottom:28}}>Reset Exercise List</button>

        <div style={{textAlign:"center",marginTop:8}}>
          <div style={{fontSize:22,fontWeight:900,color:C.crimson,letterSpacing:3}}>BUFF</div>
          <div style={{fontSize:12,color:C.dim,marginTop:4}}>Track every rep. Own every PR.</div>
        </div>
      </div>
    </div>
  );

  // ── ROOT ──────────────────────────────────────────────────
  return(
    <div style={{background:C.bg,color:C.text,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      minHeight:"100vh",display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto"}}>

      {!(tab==="Exercise"&&selEx)&&!badgeDetail&&(
        <div style={{padding:"16px 20px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",
          borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:24,fontWeight:900,color:C.crimson,letterSpacing:3}}>BUFF</span>
          <button onClick={()=>setShowSettings(true)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",padding:4}}>
            {IconSettings}
          </button>
        </div>
      )}

      <div style={{flex:1,overflowY:"auto",paddingBottom:90}}>
        {tab==="Calculator"&&renderCalculator()}
        {tab==="History"&&renderHistory()}
        {tab==="Exercise"&&renderExercise()}
        {tab==="Body"&&renderBody()}
        {tab==="Badges"&&renderBadges()}
      </div>

      {/* Tab bar */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:430,background:C.surface,borderTop:`1px solid ${C.borderW}`,
        display:"flex",padding:"8px 0 20px"}}>
        {TABS.map(t=>(
          <div key={t} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,
            cursor:"pointer",color:tab===t?C.crimson:C.dim,fontSize:9,fontWeight:tab===t?700:400}}
            onClick={()=>{setTab(t);if(t!=="History")setCalWorkoutDay(null);if(t!=="Exercise")setSelEx(null);setBadgeDetail(null);}}>
            {TAB_ICONS[t]}<span>{t}</span>
          </div>
        ))}
      </div>

      {/* Calendar picker overlay */}
      {showCalPicker&&(
        <div style={{position:"fixed",inset:0,background:C.bg,zIndex:900,display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto"}}>
          <div style={{padding:"20px 20px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.border}`}}>
            <button onClick={()=>setShowCalPicker(false)} style={{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer",padding:0}}>←</button>
            <span style={{fontSize:20,fontWeight:700,color:C.text}}>Select Date</span>
            <button onClick={()=>{setSelectedDateKey(todayKey());setShowCalPicker(false);}}
              style={{background:"none",border:"none",color:C.crimsonL,fontSize:14,cursor:"pointer",fontWeight:600}}>Today</button>
          </div>
          <div style={{flex:1,overflowY:"auto"}}>
            <CalendarView workoutDates={workoutDates} selectedDateKey={selectedDateKey}
              onSelectDate={dk=>{setSelectedDateKey(dk);setShowCalPicker(false);}} highlightOnly={false}/>
          </div>
        </div>
      )}

      {showSettings&&renderSettings()}
      {prBadge&&<PRBadge pr={prBadge} onClose={()=>setPrBadge(null)}/>}

      {saveToast&&(
        <div style={{position:"fixed",bottom:95,left:"50%",transform:"translateX(-50%)",
          background:C.elevated,color:C.text,padding:"12px 24px",borderRadius:20,
          fontSize:14,fontWeight:500,border:`1px solid ${C.borderW}`,zIndex:999,whiteSpace:"nowrap"}}>
          {saveToast}
        </div>
      )}

      {showInfo&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",
          alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}
          onClick={()=>setShowInfo(false)}>
          <div style={{background:C.surface,borderRadius:16,padding:24,maxWidth:340,width:"100%",border:`1px solid ${C.borderW}`}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:20,fontWeight:700,marginBottom:12,color:C.text}}>What is 1RM?</div>
            <div style={{color:C.muted,fontSize:14,lineHeight:1.7}}>
              Your <b style={{color:C.text}}>1 Rep Max (1RM)</b> is the maximum weight you can lift for a single rep.<br/><br/>
              This app uses the <b style={{color:C.text}}>Epley formula</b>:<br/><br/>
              <span style={{fontFamily:"monospace",background:C.elevated,padding:"4px 8px",borderRadius:6,color:C.crimsonL}}>
                1RM = weight × (1 + reps ÷ 30)
              </span><br/><br/>
              Log multiple sets and Buff tracks your best 1RM and total volume automatically.
            </div>
            <button style={{...btnP,marginTop:16}} onClick={()=>setShowInfo(false)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
