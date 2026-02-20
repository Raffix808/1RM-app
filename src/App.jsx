import { useState, useEffect, useRef } from "react";

// ── Constants ─────────────────────────────────────────────
const DEFAULT_EXERCISES = [
  // Original
  "Bench Press","Squat","Deadlift","Overhead Press","Barbell Row",
  "Incline Bench Press","Lat Pulldown","Leg Press","Romanian Deadlift",
  "Pull Up","Dumbbell Press","Tricep Pushdown","Bicep Curl Barbell","Cable Row",
  // Added for preset routines
  "Power Clean","Barbell Curl","Dumbbell Curl","Tricep Extension",
  "Face Pull","Cable Fly","Dumbbell Lateral Raise","Dumbbell Fly",
  "Seated Cable Row","Leg Curl","Leg Extension","Hip Thrust","Good Morning",
  "Pendlay Row","Dumbbell Row","Push Up","Dips","Chin Up",
  "Front Squat","Sumo Deadlift","Bulgarian Split Squat"
];

// ── Preset Routines ────────────────────────────────────────
const PRESET_ROUTINES = [
  {
    name:"StrongLifts 5×5",
    days:[
      [{exercise:"Squat",sets:5},{exercise:"Bench Press",sets:5},{exercise:"Barbell Row",sets:5}],
      [{exercise:"Squat",sets:5},{exercise:"Overhead Press",sets:5},{exercise:"Deadlift",sets:1}],
    ]
  },
  {
    name:"Starting Strength",
    days:[
      [{exercise:"Squat",sets:3},{exercise:"Bench Press",sets:3},{exercise:"Deadlift",sets:1}],
      [{exercise:"Squat",sets:3},{exercise:"Overhead Press",sets:3},{exercise:"Power Clean",sets:5}],
    ]
  },
  {
    name:"Push Pull Legs",
    days:[
      // Push
      [{exercise:"Bench Press",sets:4},{exercise:"Overhead Press",sets:3},{exercise:"Incline Bench Press",sets:3},{exercise:"Dumbbell Lateral Raise",sets:3},{exercise:"Tricep Pushdown",sets:3}],
      // Pull
      [{exercise:"Deadlift",sets:3},{exercise:"Barbell Row",sets:4},{exercise:"Lat Pulldown",sets:3},{exercise:"Face Pull",sets:3},{exercise:"Barbell Curl",sets:3}],
      // Legs
      [{exercise:"Squat",sets:4},{exercise:"Romanian Deadlift",sets:3},{exercise:"Leg Press",sets:3},{exercise:"Leg Curl",sets:3},{exercise:"Leg Extension",sets:3}],
    ]
  },
  {
    name:"Upper Lower",
    days:[
      // Upper A
      [{exercise:"Bench Press",sets:4},{exercise:"Barbell Row",sets:4},{exercise:"Overhead Press",sets:3},{exercise:"Pull Up",sets:3},{exercise:"Tricep Pushdown",sets:3},{exercise:"Barbell Curl",sets:3}],
      // Lower A
      [{exercise:"Squat",sets:4},{exercise:"Romanian Deadlift",sets:3},{exercise:"Leg Press",sets:3},{exercise:"Leg Curl",sets:3}],
      // Upper B
      [{exercise:"Incline Bench Press",sets:4},{exercise:"Seated Cable Row",sets:4},{exercise:"Dumbbell Lateral Raise",sets:3},{exercise:"Face Pull",sets:3},{exercise:"Dips",sets:3},{exercise:"Dumbbell Curl",sets:3}],
      // Lower B
      [{exercise:"Deadlift",sets:4},{exercise:"Bulgarian Split Squat",sets:3},{exercise:"Leg Extension",sets:3},{exercise:"Hip Thrust",sets:3}],
    ]
  },
  {
    name:"GZCLP (3 Day)",
    days:[
      [{exercise:"Squat",sets:5},{exercise:"Bench Press",sets:5},{exercise:"Lat Pulldown",sets:3},{exercise:"Romanian Deadlift",sets:3}],
      [{exercise:"Deadlift",sets:5},{exercise:"Overhead Press",sets:5},{exercise:"Barbell Row",sets:3},{exercise:"Leg Press",sets:3}],
      [{exercise:"Squat",sets:5},{exercise:"Bench Press",sets:5},{exercise:"Pull Up",sets:3},{exercise:"Dips",sets:3}],
    ]
  },
];
const REP_RANGE = [1,2,3,4,5,6,7,8,9,10,11,12];
const TABS = ["Log","Routines","Exercise","Progress","Badges"];
const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const REP_PERCENTAGES = [
  {reps:1,pct:100},{reps:2,pct:96},{reps:3,pct:92},
  {reps:4,pct:89},{reps:5,pct:86},{reps:6,pct:84},
  {reps:7,pct:81},{reps:8,pct:79},{reps:9,pct:76},
  {reps:10,pct:74},{reps:11,pct:72},{reps:12,pct:70}
];

// Milestone badge ladder — ordered lowest→highest
// "highest unlocked" is shown on main badges page
// Display name used on badge face
const BADGE_EXERCISES = {
  "Bench Press": { short:"BENCH",  icon:"bench"  },
  "Squat":       { short:"SQUAT",  icon:"squat"  },
  "Deadlift":    { short:"DEADLIFT", icon:"deadlift" },
  "Overhead Press": { short:"OHP", icon:"ohp"   },
};

function makeTiers(start, step, max, prefix, label){
  const tiers=[];
  for(let t=start;t<=max;t+=step)
    tiers.push({id:`${prefix}_${t}`,label:`${t}`,desc:`${t}kg ${label}`,threshold:t,type:"1rm"});
  return tiers; // low→high
}

const TONNAGE_BADGES = {
  "Bench Press":    makeTiers(40, 10, 200, "bench", "Bench"),
  "Squat":          makeTiers(60, 20, 300, "squat", "Squat"),
  "Deadlift":       makeTiers(80, 20, 360, "dl",    "Deadlift"),
  "Overhead Press": makeTiers(20, 10, 150, "ohp",   "OHP"),
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

// Get best 1RM for an exercise across all workouts
function getBest1RM(workouts, exercise){
  const ex = workouts.filter(w=>w.exercise===exercise);
  if(!ex.length) return 0;
  return Math.max(...ex.map(w=>w.best1RM));
}

// Returns unlocked tiers ordered highest→lowest (index 0 = best achieved)
function getUnlockedTonnageBadges(workouts, exercise){
  const defs = TONNAGE_BADGES[exercise];
  if(!defs) return [];
  const best1RM = getBest1RM(workouts, exercise);
  const unlocked = defs.filter(b=> best1RM >= b.threshold);
  return [...unlocked].reverse(); // highest first
}
// Next locked milestone
function getNextTonnageBadge(workouts, exercise){
  const defs = TONNAGE_BADGES[exercise];
  if(!defs) return null;
  const best1RM = getBest1RM(workouts, exercise);
  return defs.find(b=> best1RM < b.threshold) || null;
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
const IconBody=(active)=>(
  <img src={BODY_ICON_SRC} width={26} height={26}
    style={{display:"block",filter:active
      ? "brightness(0) saturate(100%) invert(20%) sepia(90%) saturate(3000%) hue-rotate(340deg) brightness(85%)"
      : "brightness(0) invert(1) opacity(0.35)"
    }} alt="body"/>
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
const TAB_ICONS={Log:IconCalc,Routines:IconHistory,Exercise:IconDumbbell,Body:null,Badges:IconBadges};

const LIFT_ICON_SRCS = {
  bench: "data:image/png;base64,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",
  deadlift: "data:image/png;base64,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",
  ohp: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAYAAACLz2ctAAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAAWjElEQVR42u1de8wc1XX/nd3vYRuD+WyMAYPBvLHDM1ACCcWBkJBECQ1VHwppK0CNIEVIjVDVSm2TtqhJW6SoCm2TNkRJgKTQhjYBEfFqgs2zJDzKwzwMtgFjHMc2fn6fP+/Or3/MOd7r653d2Z2732PnHmk1O7M7d2bO/c153XPPFQQmkgKgCoAAEhEhySoA0f2EZMXZp55TAUARSRCpZ6S8FuU1nWNw9iutfp/qD9fymILR3a+0ayNSb/qHZNXlf5O+qbrHSMqU7R+7MZIjJH+L5CX2cCQvIHkZySW6v0CPzdT9YZJnO79HEPa2rw4nOeTsj5A8wNk/juShzv4BJA+Zyg9U0bdjEcnX2KAVJO919mskbyH5lu7/UIH3su7XSf51M8kYKUj/HEXyEZLbSK4ieS3Jy0luJLmG5NUkHyK5h+QWkt8meTPJt3X/v0nOtfam0gNWdfsDBdKYgskoUfC5VCe50wHsHt3uIjk3SsKg/TOg2286/dEt3dJMXU/q26XbhSRHFViJA7JaEyAmTcDobi+cUg/ZB3YfyQF92Wv6qTv8Tpy+sv5LVCjscf5bI7md5PxQAiKEmrM2LgAwQ71fcX5zQWQesnvjdNowD/gU5/+RipHxcBGAo5X/Fedj/VVxfjNPeUA/Fef4bADnhMJPSDvr1/Rh2CWDXDou4iY4AI8FMKgvubThfxYl2r/vDyUgQgDQpNYS580pSgsjboIDcLHXX0XaO8PRXpMHQJLiBJaPDvBW2LmHBmJWpAYdHdDcOlH7vj5VVPAIgMMCAnAk1BsWaS8dGVCaLrQ+KuqIVALd0HwABwVk1mySFWeYLlIBRaXbBQEFxMGBBE4wAM71PKqiNAvAUMROEDIzZl7A9gTA4VMBgPBUZhII0DMADEfsFBR9qZ1GtdHnBPJcrY+nlAQ8OLDNNhQBGJSGARwQuM35IRoJJQHn9IBhw4He2EjATP2E5GcQm3+g4PlVkq4EDEWDDsMiFdNQVJNmRuC2x53cwskBoIjsVltjODDDKkiHfPLaOtUmjEjgJFVOd1vO0Vbi8L+W41zjZWiTZqval7UJB6Bj3H4cwMkAPhxYpRMaisnzhrUKiGo4J5nOwNPnq3cpJBKS42iMyYdSwQs0h7AKYFtRJ6Ib8I0AeFtDJqGpBuBdAN8A8FV9yKwOqAL4RwC7APwSwE4A6wG8IiIv6D0PBHCQJtwWNQlH8iAAp6nhP1NDIFsB3KJChBl8SQB8EMANAC7FvokhRWkUwHsANgM4T0S2GzZ6/VZa+tUZmrIz7uX+hSDLDfxqjvv5VEYbCcmnSZ47jVXvCMm7NCG0Gf12jja+qP8dZ+/oVBcbvVbBbqzOUnZCSweb1PQZkksd29D34BMAS1U6ulkeZjOdCeBuko+2UEFssp/ox9qlc9z9Xvf+6+4nTc5pt+9HJ84AcJl3X9DrVAH8HcmzWvCnrhKwHlj6wblncUI80nO1QrIqInWSHwDwOMKNfvSCesH4iaY9PXrJQ4FQAJwvIo8bNibKC6b3FoS2AasA/kltwEE91sxjvhfAqSodKs69javn91MAf+DYRK6U9L9nHev0P8i4Rt5jJt2PAXC7vkjiOXnG+2sArHTOcbVIDcDvA7jaOdYLGp9IL9hE/XsIl/+XJZ3HRWRdG4k8lPFWDquh/K8i8tY0lX6Pkfw8gAubSHQLV/1cRJ5pwZ+P6jl7AgPQNTE2ZpgzvQGghgfWAHgCaSLqLBQParsAqgK4EsDPnHkhzJCAm5vYJNsBfAfA10XkNW2j1/FA6UF7CYBPAvgzANciTfqgZwOP6vP5EtDu5/saGfhK4PszafwKgHcsN3SivbTZJOeTvNHzXrulxJkZN9LKs3Jmet3ueHkJyTdIHu/F0qY9kTyS5J3O9FbbHp/FJydisSigx2vXvlWndJ5ShM9FA8e7RGQjgHcC83sM6TCf5JBcv3JUggB4U0RWkRy0nMJpDjwhOSQibwP4c0f1mqaYlSNsNj/kLen2/0TkLhFZqTFLTgYAq04tmNDe656cDzXiqZyjtMP2oA8yqpUHNQXSHnUsxFG3c1uYAKYWB7q10VrQkE71LJS3WRSANta6exJsKuuAxd6zHKWfXthlkwnEBOkoiA+mhTmetRd82KUjNclkAtBodCLB502GWuA8S11DNmcHfr5Jx59uD/Okn/sCtlKXu3oAxO0hPZmi9sC2wA+Y5Hyzqgo4/36Wob/IqlKd5kl/IN8c6p1ojKWHGhN/byoAEN7NSCBAj6u908k57vN8WEMT9T4BoJk6Fzp8zjPflw4AxwJL41+FAHQoCbgJ+5bYKEo7ctqVdew7QmLe4YnQydO9qi+j3mnVr7HXi+vo0OfBSMuf2HMaEI7QIbCkRShkp/I0lNAi0syjKQPAjfqQRW9o7yiLMbSZJ2zH1DAfbQJKAXB1r0Iw2uEUkbp+EgVkL4BokYZLkM5sq3sScATtk3d3OWZSiP7ZCmDDVACg0eZQb4Qn3istQFDx7E86diEBfI7kQgBJSGA4yRhDJH+d5Pkkj1ZAJj0Aoanfz2bwdyYyYoE2r1oTBLYEBOB6a6/oS16IWTblT2NuawI+4IYOQgv+OKSolDgQwA3KIAkEvoqC7zMAngHwMIBHAawkeT/JpSFB6FzvcJWA9oK5NOA4YtKij38Z4pZ0u1qfs7B5E7I822sBJeDbHRjDb2V4xwRwFckF2okSAAwJyb8EcBfSMXAbkJ+pAHmY5KkBQWht/AbSnLtaE5CNO/YyW/BpXUAB8XKoqEdIdfFSlw/X7Jw1HZy/KoPpdaRTB38nQ3J0qnYTklcD+CsFQuI4A1SvfR6AO0jOMgciQDgKAC7H/mlvblbS1hxtrQ7oAT8bCjQhAGiMeAr756w1i+clGQ/l3s/rOd5W++3FjGcxYHyyRZgilxeqduQggD9FY8y54l1rUEF4CoBr1UEqAnoLti8AcC6a5wMCwHoRGWsxH6OV1Oq0nqMF+58swtPQADT3/xcqjSqqEmpoVNasOR9z421/VB9kXLdjOdV54gBwp9MuvFjZ8SQH24Qp2pi6QqQB38XYv+prM9X/eQVsPUDfnKT2bJIhAV9v05f2v+fRiK3WHXVu2qKu/7VpBe5+HY2k06cAvBZqtmFhAGrnVERkHMAX9WaH1Th+HcBzaJR6HVBVYHNJngTwZb2PIT32iIisb/eAjoe3QZnrv5Hu8NVcJ2euW7VzFBpZ1e34eQKAk526LF2xVs89vI20eaGVPebYo6u1L6r6GXBUtx2zxJKKt1/V/hEAXwrp2AVJIjUjX0Tu1llol2rs6VaVcFepfbQeaYLkBaqq/kNE3iT5EtIJRFsA3NmBsWxp5/cD+EATCVjXEMVVIvIVJ3xTAVDPGUKwYbC5Oe/LAvKHdGuo6z1WRaRG8rQ2YH8mz33py3ANgC8hTc9aBeBGpOV2rwawHMAjAK7Xl3Yt0ikR5wP4hPLyZhG537xzTDXq5m0vYqg7CZenO5Xe/QTXuibKXkdyTqf36yS+/maOpFt3dYBFnfKkycpEn9Y1PereygL2fYeGaCZsXZUpn+Cri5gM6Ef0M+Adq+r3isP4vb93CcIHvYzdZrSe5H0kryc5o13H6bNUSJ5C8qcZIG8GwhrJf+5kaStvyaxFJP/WW0bBz0pOSK7oBHz6LFWnDyretur9XnV+r8RlM7KZKiRP1XVKahkLsfjAeYrksa060FmA59wc4HavUye5Og/4XJCSvJDkHSr12GJRGZPCv+dK6UiTB0IDynVtgGLSyaoErG6lKh0JPkxyQwaQs8DxL+3A4Umir2dIuaz27+3h+HOkLkBottp9OaWVdeTTJGep+t/HNPBA+GmSy70VhpoBPNE18k72AeKZJ1UN1UDXz6OzilHSQrraizM/AnAKOkAklzr1atqtiWaS8KYMh8DaNKBc28YRMYCc50lmybKfSN7gzeprZVvW1fE4y21/OlPf2A42OC4iL5K8VUM/tTbPOKDxtetInqz7PwfwPRF51QNRFe0rAJg02m2LPjvlKuokj0Baym4WgDc0xvf3GuJoV37D/nOliDxNciBPfcBIk+OQHKMrceaRgs1olORtJM/2bLXfbaHe7Tq7SS7Wc0xyHqXLnm4pOBf3G65EjjS1HZKbOpgsnzj21x5Ppd7qrA75kRwA3ORWjCX5OV2P1wWTuwJlksOrTnQ93wMtTBJ7euoCUFQSziX5bhunoR0gDRzPk7zIcXDqLcBSI3mD3ssXPKenG2lsL8Qn+sXuK5MUvCJAccZal+c96zkPRQp1/lu/xvukn0GoY9S3AbhCHYhuZ/FbJkreiVcJiid6mAP1AtJx7jEAST8UXS8LAC3VaAjAPQAuRiPFqDoBz26glS7Oswn26wAs01o307bYep6wQd+RSgqKyBiATwH4LhppSCbNaj3mbV7w1dDIHawo+J4FcLGCr9qP4OtrCehKQlNbJC9CWnfwQjTqx0yp20WajPtdAF8TkdFuyt5GAE5RdWxShORspGV9lyFNsz9wkvhhc0nuBPA/SLPKX9bkXvSr2i0dAH3v2JUoJN9BOiIx0cXWzVF5TkTOaHKffedwNKNSpfEY8JwVmOZg3+JGmAQAvqiAG1BpyH5WuaVxQtoJQ+3kbWjMi5gsafMLGysWkVJIvdID0KnoUAPw5iQB0EY0npzkFyACcJKf/blJAIDZmxuc6ycRgOWkxybBIbOA+GMissOqbUUAlotM4jwBrco/gVLQRkjuKWM0IgIQexNYRVdRehb7LgbYa/VbRVrN4SeORIwALCGZI/BfaL7iZC/V7wNaAaK06jcCsCHxbleJNBFq2GKQ34rmd8kB6MwjWQfge2iU8+gl4AVppar7rfJWhGGJyZlHspDk1gLzSDpJMP1DvXacUB5pnznFXy6YBd1uboel9w8b8CP3I7nzSA4iuS5nBYRuAbhMrxnndkQnZK8taDUOtwG42XNQQpAV5rxDRH7W7zl+HfE+sqBhC6oHfDzSqqsDAfljMcZzkMYcKxGAUQLuBxKVhGuRrn8cykM1z/ddACv1GtHzjQBsqoah2chbenCJWEYjAjCXGgbCLDvmUwy5RADmtok3hsS1bt9BWrRIyjz0FgGYD4BPBZSA1sZyBV4Mv0QAtgXLQ7qtBgT1/0b2RgDmBWC9B23OjyMfEYB5+XFpQCAa6D5m1Roim/dnTiTsE4x+BsDpCFNkyOZ/bAVwLAKtsxslYP+Bz+qvXBAQfPaS15HOQb48OiKRmoHPKuHPI/lSwZp+rQqMbyB5XKxuHyWgT5YW/8dI17CrB+aNDesdCuDGkIv9RQD2B9nY7DLsvyxqMJCrPXgRydkhVnGPAOwT9aup+SMAlqCxxnGvnL55AI6ITmAEoM+D9wEY6aEEtFl3Vb1OBGAE4D4gONdTx71U9YdEtkcA7tXCuj1vAq+1NErACECz/+okh5Cu2D5RPDnHA2QEYMnV77EAFk0AT6zts0gORk84AtCe/0x1DuoTcD0COAbASVENRwAavX8CVaIFuT8U+yAC0LzSMyZBGl0U7cASA9AJQA8DOGECAWg8P5/kzLLbgWWWgNbpC5Eu0zCRAKRe97Sy90MEYOoQDKJ3IyBZdiAcOzBKwBIDcLFnD07ktT9UdjswesHF14xLCgDw9LLHAyMAG/ZfN7Qd6RpvnQJRHPAfXWY1XGYAmtobKXDuFgD3dSkBE6TVEo6LACw3dbNSpgFwK9JlHroBUOLZoBGAJZWAswq0sRPpUl81dF9l/7Ayv/0RgMCMAueOOuDrluZEAJaQnHm5QwVU4G6kMcQi0ywHIwDLTd2Ch0gDysMqBbvNpBkrM/NjzbrOgVPXT1XBV4SPRNhScFECThsDsDExvKZAyOtAVFVt1xU8bwL4B6Srbq7vxArQz+ooA8oJwKpu/ybn2iC2eM0PSV5B8hRN5XfbPJDkwznas8VwXid5sFVmiL1SLgBaOY4ZJN9oszaIgW+U5LwmbQ2QHNTvf+GtitSMDJyfdV+GqILL5wVXRWQM6WqZQPZwmh1/HsAWkoPuSkciUgOQ6P7jbXhrc4M3Abi77OvFxcoIKQDajWaYffigVtCiiCReiTXbfxrpEF0lw640sL0kItu9kFAEYNnwp53/Zht+2PF7PEDuI1G1xNtmdUjarQeyS8Ef54SUGYC63d5CAlqdwNcAPNVGZdr5/4n2ge1D4qI1EYBoYvsx47d/F5E9aJRya0YWU/yxquFmC2AbMA8lOaySM2ZEl5yGmwDEqApgD4Db2jgqvhr+kQdKv/2Z6G4cOgKwn5xh3R6UAa66/me5iLxKsqJOSB7H5vY2PK6j9xPhIwCnCc3Lci6Uvt+Bw2De8AoAa/ScJEPtx9owZZeACqyTmgDQ4nW7ANyf12FQNTwgIrsBPNBCbc9ByVOxIgAb0mpZE/vPwPi6iLyt4OrUY30sQ+0nSBNhl5S9H2JlBPJQAB/sET92ZDg2BuSPZfweAVgCsvHXi5DOC6l7QLDvR2r9aHQRLjkiw7Y0vn9cx4HrEYDlpYszQGJzPEYAnNglv5a04DuRLgmxRO3GSgRgucikTqtyufafMztUlXbe+9q0XQFwfpn7opQPbYtGq9SZlwNcZ3bR9gFIK6+24/NJ0Qsutx3YalKQgfJ4z3lAjnPmI181/AMjAMtLNaQz29rRnAw7sRXNdsDdSrqORgCWjCwBQGOAm3KAa2uHNiCQhmBqOdpeHwFYXvULAGtbgMSOrcjLL40tCoC3AKxs0baB+ZUIwHLTi1n+BBqZMD/owAYE0pStOoBvtzjP4n8vdth2pD7xhG1W3KUZE5Js4tAD+r9KB22LbueTfM+b2ORe62WSpZ6bXWYJaBLnOaQJB/4cDvv+SKep846NuRHAy00knGXCrBCRWplBWOpZcQqS9QBeaKEGN3Q5achmzW3MsP8EwE/KroliHDClh1s4C6PdY1wIYLPXttmWW53rxrHgspqCun2oBT+KOgdbMtp7WEQ2aZZ1nJZZcjvwCaTxwGZzeYumSm3PAP2P47TMkj+8M4nILbWbZACmW9rhtTWAtCTbg3FaZpSAroR7wAOcFLQBjXY287xFZK0lxUYARjUMAMsdB8EF4OaCknBXE2m63HOCIgCjI4KVANahMWfDeLMpIAAN1I9HtkcA+nbgGNLCQq5UrHsqtIiENYlHAK8G8rAjAPsFh15pNdcOLMojf87xzgBSNQKwHyWhY+/ZfJAKGkml3YZjTvD2BwEMKuAlArDsBmAKBGq53S84fOl2Poivepd6bQ4D+IgCPgqACMC0zjPJm7wsGCuxe6f+Xu0Q1CBZJfmqkwFjtaFXkzxISwRHEJYYfJaSdVmTwuKWMvWCgSTvvGAHgAeT3OSlY9k1fmQAjAXKywk+A9U1JMcc6eQDcI0D1NwA1M8QyVVN8g0NhHeolIwgLKnk+xNHOiUZCanXd6qC9f8Duv2jjGUbxnX7tW7ajzS9nQ6TUqsUCOMOCBPdr5F8xJWWXUrYE7UtF+SJSkS7zrHdXme6U+kycd0ZcSS3o/m8YDt2i5Ox0m3QeCcaQ25ufNGNMUZHpKT23yUkV5BcS3IzyW3qNKwl+U2Sw0VWMVLbrkLyWyR3O+p3jOS7JB8leWUn9mXfCYQIR4DkTKQ1mweRzuXdoQUmQ15jMRpVuHYC2KJpYJHKLAmzJI96pxLoOtLCWy618xElYAZAQqfJN3EwWOZU/EiRIkWKFCnSpNL/A87sVh+Wlq/5AAAAAElFTkSuQmCC",
  squat: "data:image/png;base64,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",
};

const BODY_ICON_SRC = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAYAAAByDd+UAAAD10lEQVR42qWWTaiVVRSGn33u8fpXQj8DyRykRmYSQWZp/iRoTS4UTgrCQeHEpgbNC8IGzjItg4gcGBJWkv2KBSppQUYIJVcis9BSQ7uo3XvOeZq83+3zcO/1hBs2+/v2Wvtde6/9rrU2dDW1qI0x5hsZl6h/qr+qC+uybv2x5ruV+mrfA+pu9XP1gcxNVg/7X9uvNiNbpO5TP1QHxsIEaNQFpZS2OkvdBewBbgMK8HgWzgfuB9rpy4H5MfpEoGYCe9Rd6uxgjhqtdtcspbTUpcAO4A5gA3A2ACWbuwnoA1q19bdE9gfwPnA6c1uBRerTpZRDlY3RI6ur1aG4anvmpqqr1Bn5fyny4XTVFyO7MbrT8v9G5EPq6qvcG2MX1Y7aVherk2pEqcZ1MdRKH1bXdek0snZx8Az26srYdPV4jQhHxyOUOkU9VdM9lbm+cdYcrekeV6c3gJXAnUAHuAC8HYauiEtnqv2llHYp5QpwoIZ5oJRyJcToj+4UdWWY+lYwO7HxCOqmuKejfqoequ1qi3pGHVTXqg+r52su/UtdFtlgdLfU1h8MZif6r6AeqymcydiOwrmMVXu9Kw4Pq9tq/61saCQYqqdr8mON0P9IaH0O+BIYCf0bwHC6wLrQvpN+OnPW9KpwGQnW+WAfATaUKp0BLwAbgZ3Az8BDwFfAAuC5BHq1gUkBHgH6Y7wvsXcsvPg68fwUsLmUsqliUjP5c456oHb8YfV59dmam9tdLm7XuuozWTPcdY9zYqM5esJSijnpemAVcCiZ5XZgbbJHGS8N5zreA36PG5cC+4E3K+xSiqVeJUopdsXR9hidC9wXF06KC6tc3MqdfQecAC6UUtZ3V6AKezR5V7uIiycnmD8G7gJ2hyCNnOZgiFC1k8An0d2bJNFfXVf9IFfVq1KKpZQWMFxKaccl0xK874QYBfgNuFRj5A7gIjAV2J+1I6WUVrfXrlkb1a2J1QH1VfUndam6MTnyI3W9+oO6bawa2KvBRlw8N8AfqAvU19TH1AeTVVaoe1MV5o33YriqHo7VSimdFOUT6ru5u3uAR+Pa5cBQ3N4BdpZSBqtCPh5uo4eTFmAfMBu4HLKcDXFGwtJZwGfRnbA1r2Uv7P0FOA4sBpbESF9i7W7ge+BkdL0eg1W7nPfMZuBl4G/gVuALYDDvmaFegHo12AJuBuYAAzF0LzAjWeWGWjKYsDV6JW1ea03g29znJeCbYCzo1WCzhw11crICPAksq8k7ybkC84AfJ8i3/+uECzMuAv6pvUuvZK7ExVyvwU6CeE3++2q1EGBK5gDWRHdC1/4Lcn8DVBd1bvEAAAAASUVORK5CYII=";

// ── Hexagon Badge ─────────────────────────────────────────
// Regular pointy-top hexagon. All content fits inside inner border ring.
function HexBadge({topLine, bottomLine, iconKey, size=130, locked=false}){
  const W = size;
  const H = size * (2 / Math.sqrt(3));  // exact regular hex ratio
  const cx = W / 2, cy = H / 2;
  const r  = W / 2 * 0.90;  // outer hex radius (slightly inset so stroke doesn't clip)
  const ri = r * 0.82;       // inner border ring radius

  const hexPts = Array.from({length:6},(_,i)=>{
    const a = (Math.PI/180)*(60*i - 90);
    return `${cx + r*Math.cos(a)},${cy + r*Math.sin(a)}`;
  }).join(" ");

  const innerPts = Array.from({length:6},(_,i)=>{
    const a = (Math.PI/180)*(60*i - 90);
    return `${cx + ri*Math.cos(a)},${cy + ri*Math.sin(a)}`;
  }).join(" ");

  const fill   = locked ? "#252525" : C.crimson;
  const stroke = locked ? "#3a3a3a" : C.white;
  const tFill  = locked ? "#484848" : C.white;
  const clipId = `hx${iconKey||"x"}${size}${(topLine+bottomLine).replace(/[^a-z0-9]/gi,"")}`;

  // Icon: 28% of size wide, sits in the upper portion centred horizontally
  const iconSize = size * 0.28;
  const iconX = cx - iconSize / 2;
  const iconY = H * 0.22;  // icon pushed lower into hex

  // Text moved up to give icon room
  const topTextY  = H * 0.595;
  const botTextY  = H * 0.72;   // exercise name — moved up

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display:"block",overflow:"visible"}}>
      <defs>
        <clipPath id={clipId}><polygon points={hexPts}/></clipPath>
      </defs>
      {/* Hex fill */}
      <polygon points={hexPts} fill={fill}/>
      {/* Outer border */}
      <polygon points={hexPts} fill="none" stroke={stroke} strokeWidth={W*0.038}/>
      {/* Inner border ring */}
      <polygon points={innerPts} fill="none" stroke={stroke} strokeWidth={W*0.018}
        strokeOpacity={locked ? 0.25 : 0.6}/>
      {/* Icon clipped inside hex */}
      {iconKey && LIFT_ICON_SRCS[iconKey] && (
        <image
          href={LIFT_ICON_SRCS[iconKey]}
          x={iconX} y={iconY}
          width={iconSize} height={iconSize}
          clipPath={`url(#${clipId})`}
          opacity={locked ? 0.18 : 0.95}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      {/* Number / weight */}
      <text
        x={cx} y={topTextY}
        textAnchor="middle" dominantBaseline="middle"
        fontFamily="-apple-system,'Arial Black',Arial,sans-serif"
        fontSize={W*0.135} fontWeight="900"
        fill={tFill}>
        {topLine}
      </text>
      {/* Exercise name */}
      <text
        x={cx} y={botTextY}
        textAnchor="middle" dominantBaseline="middle"
        fontFamily="-apple-system,'Arial Black',Arial,sans-serif"
        fontSize={W*0.105} fontWeight="900"
        fill={tFill} opacity={locked ? 0.45 : 1}>
        {bottomLine}
      </text>
    </svg>
  );
}


// ── PR Popup Badge ────────────────────────────────────────
function PRBadge({pr, onClose}){
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState(0);

  useEffect(()=>{const t=setTimeout(()=>setPhase(1),30);return()=>clearTimeout(t);},[]);

  const exInfo = Object.entries(BADGE_EXERCISES).find(([k])=>k===pr.exercise);
  const iconKey = exInfo?exInfo[1].icon:null;
  const shortName = exInfo?exInfo[1].short:pr.exercise.replace("Press","").replace("Barbell","BB").trim().toUpperCase();

  // Draw to canvas for sharing
  useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const W=400, H=500;
    // Background
    ctx.fillStyle = "#111111";
    ctx.fillRect(0,0,W,H);

    // Draw hex
    const cx2=W/2,cy2=170,r2=130;
    const hpts=[];
    for(let i=0;i<6;i++){const a=(Math.PI/180)*(60*i);hpts.push([cx2+r2*Math.cos(a),cy2+r2*Math.sin(a)]);}
    ctx.beginPath();hpts.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y));ctx.closePath();
    ctx.fillStyle=C.crimson;ctx.fill();
    ctx.strokeStyle=C.white;ctx.lineWidth=7;ctx.stroke();
    const ri2=r2*0.85;const ipts2=[];
    for(let i=0;i<6;i++){const a=(Math.PI/180)*(60*i);ipts2.push([cx2+ri2*Math.cos(a),cy2+ri2*Math.sin(a)]);}
    ctx.beginPath();ipts2.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y));ctx.closePath();
    ctx.strokeStyle="rgba(255,255,255,0.55)";ctx.lineWidth=3;ctx.stroke();
    // Text inside hex
    ctx.fillStyle=C.white;ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.font=`900 30px Arial Black,sans-serif`;ctx.fillText(`${pr.weight}kg × ${pr.reps}`,cx2,cy2+72);
    ctx.font=`900 24px Arial Black,sans-serif`;ctx.fillText(shortName,cx2,cy2+100);
    // Label below
    ctx.font=`700 32px Arial,sans-serif`;ctx.fillText(`${pr.exercise} PR!`,cx2,cy2+r2+52);
    ctx.fillStyle="rgba(255,255,255,0.25)";ctx.font=`600 15px Arial,sans-serif`;ctx.fillText("BUFF",cx2,H-20);
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

  return(
    <div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(0,0,0,0.92)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,
      opacity:phase?1:0,transition:"opacity 0.25s"}}>
      <button onClick={onClose} style={{position:"absolute",top:24,right:24,
        background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",
        color:C.white,borderRadius:"50%",width:40,height:40,fontSize:20,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>

      <div style={{transform:phase?"scale(1) translateY(0)":"scale(0.7) translateY(50px)",
        transition:"transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",
        display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{filter:"drop-shadow(0 8px 40px rgba(196,30,30,0.7))"}}>
          <HexBadge
            topLine={`${pr.weight} × ${pr.reps}`}
            bottomLine={shortName}
            iconKey={iconKey}
            size={200}
          />
        </div>
        <div style={{marginTop:20,fontSize:26,fontWeight:800,color:C.white,textAlign:"center"}}>
          {pr.exercise} PR!
        </div>
        <div style={{marginTop:10,background:C.crimson,borderRadius:20,
          padding:"5px 18px",fontSize:13,fontWeight:700,color:C.white,letterSpacing:1.5}}>
          NEW RECORD
        </div>
      </div>

      <canvas ref={canvasRef} width={400} height={500} style={{display:"none"}}/>

      <button onClick={share} style={{marginTop:32,background:C.white,border:"none",
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

// ── Helper: add exercise picker inside routine builder ────
function AddExerciseToDay({exercises, onAdd}){
  const [open,setOpen] = useState(false);
  const [search,setSearch] = useState("");
  const filtered = exercises.filter(e=>e.toLowerCase().includes(search.toLowerCase()));
  if(!open) return(
    <button onClick={()=>setOpen(true)}
      style={{width:"100%",padding:"13px",borderRadius:10,border:"1px dashed #444",
        background:"transparent",color:"#888",fontSize:14,cursor:"pointer",textAlign:"center"}}>
      + Add Exercise
    </button>
  );
  return(
    <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #333",overflow:"hidden"}}>
      <input autoFocus placeholder="Search exercises..."
        value={search} onChange={e=>setSearch(e.target.value)}
        style={{width:"100%",padding:"12px 14px",background:"transparent",border:"none",
          borderBottom:"1px solid #333",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
      <div style={{maxHeight:200,overflowY:"auto"}}>
        {filtered.map(ex=>(
          <div key={ex} onClick={()=>{onAdd(ex);setOpen(false);setSearch("");}}
            style={{padding:"12px 14px",cursor:"pointer",fontSize:14,color:"#fff",
              borderBottom:"1px solid #222"}}>
            {ex}
          </div>
        ))}
        {filtered.length===0&&<div style={{padding:"12px 14px",color:"#666",fontSize:13}}>No matches</div>}
      </div>
      <button onClick={()=>{setOpen(false);setSearch("");}}
        style={{width:"100%",padding:"10px",background:"transparent",border:"none",
          borderTop:"1px solid #333",color:"#888",cursor:"pointer",fontSize:13}}>
        Cancel
      </button>
    </div>
  );
}

// ── Body weight latest card (extracted to avoid IIFE in JSX) ──
function BwLatest({bwHistory, C}){
  const lat = bwHistory[bwHistory.length-1];
  const p2  = bwHistory.length>1 ? bwHistory[bwHistory.length-2] : null;
  const diff = p2 ? (lat.bodyweight - p2.bodyweight).toFixed(1) : null;
  const col  = diff && parseFloat(diff)<0 ? C.green
             : diff && parseFloat(diff)>0 ? "#f87171" : C.muted;
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
}

// ── Active routine preview card (extracted to avoid IIFE in JSX) ──
function ActiveRoutinePreview({active, routines, activeRoutine, C, onEdit}){
  if(!active) return null;
  const activeIdx = routines.findIndex(r=>r.name===activeRoutine);
  return(
    <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"12px 14px",borderBottom:`1px solid ${C.border}`}}>
        <span style={{fontSize:15,fontWeight:700,color:C.text}}>{active.name}</span>
        <button onClick={()=>onEdit(active, activeIdx)}
          style={{background:"#1e3a5f",border:"none",color:"#60a5fa",
            padding:"6px 14px",borderRadius:8,fontSize:13,cursor:"pointer",fontWeight:600}}>
          ✏ Edit
        </button>
      </div>
      <div style={{padding:"12px 14px"}}>
        {active.days.map((day,di)=>(
          <div key={di} style={{marginBottom:di<active.days.length-1?14:0}}>
            <div style={{fontSize:11,fontWeight:700,color:C.crimsonL,marginBottom:6,
              textTransform:"uppercase",letterSpacing:1}}>Day {di+1}</div>
            {day.map((ex,ei)=>(
              <div key={ei} style={{display:"flex",justifyContent:"space-between",
                padding:"5px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:14,color:C.text}}>{ex.exercise}</span>
                <span style={{fontSize:13,color:C.muted}}>{ex.sets} sets</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Log tab routine row (extracted to avoid IIFE in JSX) ──
function LogRoutineRow({activeR, logDay, setLogDay, setLogExIdx, setExercise, showLogDayDrop, setShowLogDayDrop, C, inp}){
  if(!activeR) return(
    <div style={{margin:"0 16px 12px",background:"#1a1a1a",borderRadius:10,padding:"12px 14px",border:"1px solid #2a2a2a"}}>
      <span style={{fontSize:13,color:"#666"}}>No active routine — set one in the Routines tab</span>
    </div>
  );
  return(
    <div style={{padding:"0 16px",marginBottom:12}}>
      <div style={{display:"flex",gap:8}}>
        <div style={{flex:1}}>
          <div style={{color:"#888",fontSize:11,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>Workout</div>
          <div style={{...inp,background:"#e8e8e8",color:"#555",cursor:"default",padding:"12px 14px",fontSize:14,fontWeight:600}}>
            {activeR.name}
          </div>
        </div>
        <div style={{flex:1,position:"relative"}}>
          <div style={{color:"#888",fontSize:11,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>Day</div>
          <div onClick={()=>setShowLogDayDrop(v=>!v)}
            style={{...inp,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px"}}>
            <span style={{fontSize:14,color:"#000",fontWeight:600}}>Day {logDay+1}</span>
            <span style={{color:"#999",fontSize:12}}>▾</span>
          </div>
          {showLogDayDrop&&(
            <div style={{position:"absolute",top:"calc(100% - 4px)",left:0,right:0,zIndex:200,
              background:"#1a1a1a",borderRadius:10,maxHeight:200,overflowY:"auto",
              border:"1px solid #333",boxShadow:"0 8px 32px rgba(0,0,0,0.8)"}}>
              {activeR.days.map((_,di)=>(
                <div key={di} onClick={()=>{
                  setLogDay(di); setLogExIdx(0);
                  if(activeR.days[di]&&activeR.days[di][0]) setExercise(activeR.days[di][0].exercise);
                  setShowLogDayDrop(false);
                }} style={{padding:"13px 14px",cursor:"pointer",fontSize:14,borderBottom:"1px solid #222",
                  color:logDay===di?"#ff6b6b":"#fff",background:logDay===di?"#2a0808":"transparent"}}>
                  Day {di+1}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Exercise progress strip (extracted to avoid IIFE in JSX) ──
function ExerciseProgressStrip({activeR, logDay, logExIdx, setLogExIdx, setExercise, workouts, selectedDateKey, C}){
  if(!activeR||!activeR.days||!activeR.days[logDay]) return null;
  return(
    <div style={{margin:"0 16px 10px",background:"#1a1a1a",borderRadius:10,padding:"10px 14px",
      border:"1px solid #2a2a2a",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      {activeR.days[logDay].map((ex,i)=>{
        const done = workouts.find(w=>w.exercise===ex.exercise&&w.dateKey===selectedDateKey);
        const doneSets = done ? done.sets.length : 0;
        const complete = doneSets >= ex.sets;
        return(
          <div key={i} onClick={()=>{setLogExIdx(i);setExercise(ex.exercise);}}
            style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",
              padding:"4px 10px",borderRadius:20,
              background:i===logExIdx?C.crimson:complete?"#1a3a1a":"transparent",
              border:`1px solid ${i===logExIdx?C.crimson:complete?"#2d5a2d":C.border}`}}>
            <span style={{fontSize:12,fontWeight:700,color:complete?"#4ade80":i===logExIdx?"#fff":C.muted}}>
              {ex.exercise.split(" ").map(w=>w[0]).join("").substring(0,4).toUpperCase()}
            </span>
            <span style={{fontSize:10,color:complete?"#4ade80":i===logExIdx?"#fff":C.dim}}>
              {doneSets}/{ex.sets}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
export default function App(){
  const [tab,setTab]=useState("Log");
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
  // Progress tab — selected exercise for chart drill-down
  const [progSelEx,setProgSelEx]=useState(null);
  // Routines
  const [routines,setRoutines]=useState(()=>{
    const saved=lsGet("routines",null);
    if(!saved||saved.length===0) return PRESET_ROUTINES;
    // Merge: add any presets not already present by name
    const names=new Set(saved.map(r=>r.name));
    const missing=PRESET_ROUTINES.filter(r=>!names.has(r.name));
    return missing.length>0?[...missing,...saved]:saved;
  });
  const [activeRoutine,setActiveRoutine]=useState(()=>lsGet("activeRoutine",null));
  const [showAddRoutine,setShowAddRoutine]=useState(false);
  const [newRoutineName,setNewRoutineName]=useState("");
  const [newRoutineDays,setNewRoutineDays]=useState(3);
  const [newRoutineExercises,setNewRoutineExercises]=useState({});// {dayIdx: [{exercise,sets}]}
  const [buildStep,setBuildStep]=useState("name"); // name|days|exercises
  const [buildDay,setBuildDay]=useState(0);
  const [showRoutineDrop,setShowRoutineDrop]=useState(false);
  const [editingRoutineIdx,setEditingRoutineIdx]=useState(null); // index into routines[] being edited
  // Log-tab routine selection
  const [logRoutine,setLogRoutine]=useState(null);
  const [logDay,setLogDay]=useState(0);
  const [logExIdx,setLogExIdx]=useState(0);
  const [showLogRoutineDrop,setShowLogRoutineDrop]=useState(false);
  const [showLogDayDrop,setShowLogDayDrop]=useState(false);


  useEffect(()=>{lsSet("workouts2",workouts);},[workouts]);
  useEffect(()=>{lsSet("unit",unit);},[unit]);
  useEffect(()=>{lsSet("exercises",exercises);},[exercises]);
  useEffect(()=>{lsSet("bwHistory",bwHistory);},[bwHistory]);
  useEffect(()=>{lsSet("bfHistory",bfHistory);},[bfHistory]);
  useEffect(()=>{lsSet("bfGender",bfGender);},[bfGender]);
  useEffect(()=>{lsSet("bfHeight",bfHeight);},[bfHeight]);
  useEffect(()=>{lsSet("achievementsOn",achievementsOn);},[achievementsOn]);
  useEffect(()=>{lsSet("routines",routines);},[routines]);
  useEffect(()=>{lsSet("activeRoutine",activeRoutine);},[activeRoutine]);


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

    // Auto-advance: if using a routine, check if all sets for this exercise are done
    const _activeR = routines.find(r=>r.name===activeRoutine)||null;
    if(_activeR && _activeR.days && _activeR.days[logDay]){
      const dayExercises = _activeR.days[logDay];
      const currentEx = dayExercises[logExIdx];
      if(currentEx){
        const setsTarget = currentEx.sets;
        if(setNum >= setsTarget && logExIdx < dayExercises.length - 1){
          const nextIdx = logExIdx + 1;
          setLogExIdx(nextIdx);
          setExercise(dayExercises[nextIdx].exercise);
          setTimeout(()=>showToast(`✓ Moving to: ${dayExercises[nextIdx].exercise}`),400);
        }
      }
    }
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


  // ── ROUTINES ──────────────────────────────────────────────
  const renderRoutines=()=>{
    // ---- Day history drill-down ----
    if(calWorkoutDay){
      const dw=workouts.filter(w=>w.dateKey===calWorkoutDay);
      return(
        <div>
          <div style={{padding:"20px 20px 12px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${C.border}`}}>
            <button onClick={()=>setCalWorkoutDay(null)} style={{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer",padding:0}}>←</button>
            <div>
              <div style={{fontSize:20,fontWeight:700,color:C.text}}>{calWorkoutDay}</div>
              <div style={{fontSize:12,color:C.muted}}>Workout summary</div>
            </div>
          </div>
          {dw.length===0
            ?<div style={{textAlign:"center",color:C.dim,padding:40,fontSize:15}}>No workouts logged this day</div>
            :dw.map(w=><WorkoutCard key={w.id} w={w} onTap={goToExercise} onDelete={deleteWorkout}/>)
          }
        </div>
      );
    }

    // ---- Add / Edit Routine builder ----
    if(showAddRoutine){
      const isEditing = editingRoutineIdx !== null;

      if(buildStep==="name") return(
        <div style={{padding:"20px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
            <button onClick={()=>{setShowAddRoutine(false);setEditingRoutineIdx(null);}}
              style={{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer"}}>←</button>
            <span style={{fontSize:20,fontWeight:700,color:C.text}}>{isEditing?"Edit Routine":"New Routine"}</span>
          </div>
          <div style={{color:C.muted,fontSize:11,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Routine Name</div>
          <input style={{...inp,marginBottom:16}} placeholder="e.g. Push Pull Legs"
            value={newRoutineName} onChange={e=>setNewRoutineName(e.target.value)}/>
          <div style={{color:C.muted,fontSize:11,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>How many days?</div>
          <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"}}>
            {[2,3,4,5,6,7].map(d=>(
              <button key={d} onClick={()=>setNewRoutineDays(d)}
                style={{flex:1,minWidth:44,padding:"14px 0",borderRadius:10,
                  border:`1px solid ${d===newRoutineDays?C.crimson:C.borderW}`,
                  background:d===newRoutineDays?C.crimson:"transparent",
                  color:C.white,fontSize:16,fontWeight:700,cursor:"pointer"}}>
                {d}
              </button>
            ))}
          </div>
          <button style={btnP} onClick={()=>{
            if(!newRoutineName.trim())return;
            // When editing and day count changes, preserve existing days up to new count
            if(!isEditing) setNewRoutineExercises({});
            setBuildDay(0);
            setBuildStep("exercises");
          }}>Next →</button>
        </div>
      );

      if(buildStep==="exercises"){
        const dayExs = newRoutineExercises[buildDay]||[];
        return(
          <div style={{padding:"20px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
              <button onClick={()=>setBuildStep("name")}
                style={{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer"}}>←</button>
              <span style={{fontSize:20,fontWeight:700,color:C.text}}>{newRoutineName}</span>
              {isEditing&&<span style={{marginLeft:"auto",fontSize:12,color:C.crimsonL,fontWeight:600}}>Editing</span>}
            </div>

            {/* Day tabs */}
            <div style={{display:"flex",gap:6,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
              {Array.from({length:newRoutineDays},(_,i)=>(
                <button key={i} onClick={()=>setBuildDay(i)}
                  style={{flexShrink:0,padding:"8px 16px",borderRadius:20,
                    border:`1px solid ${i===buildDay?C.crimson:C.borderW}`,
                    background:i===buildDay?C.crimson:"transparent",
                    color:C.white,fontSize:14,fontWeight:600,cursor:"pointer"}}>
                  Day {i+1} {(newRoutineExercises[i]||[]).length>0?`(${(newRoutineExercises[i]||[]).length})`:""}
                </button>
              ))}
            </div>

            <div style={{color:C.muted,fontSize:11,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>
              Day {buildDay+1} Exercises
            </div>

            {dayExs.map((ex,i)=>(
              <div key={i} style={{background:C.surface,borderRadius:10,padding:"12px 14px",marginBottom:8,
                display:"flex",alignItems:"center",gap:10,border:`1px solid ${C.border}`}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text}}>{ex.exercise}</div>
                  <div style={{fontSize:12,color:C.muted}}>{ex.sets} sets</div>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <button onClick={()=>{
                    const u={...newRoutineExercises};const a=[...dayExs];
                    a[i]={...a[i],sets:Math.max(1,a[i].sets-1)};u[buildDay]=a;setNewRoutineExercises(u);
                  }} style={{background:C.elevated,border:"none",color:C.white,width:30,height:30,borderRadius:15,cursor:"pointer",fontSize:18}}>−</button>
                  <span style={{fontSize:16,fontWeight:700,color:C.white,minWidth:20,textAlign:"center"}}>{ex.sets}</span>
                  <button onClick={()=>{
                    const u={...newRoutineExercises};const a=[...dayExs];
                    a[i]={...a[i],sets:a[i].sets+1};u[buildDay]=a;setNewRoutineExercises(u);
                  }} style={{background:C.elevated,border:"none",color:C.white,width:30,height:30,borderRadius:15,cursor:"pointer",fontSize:18}}>+</button>
                  <button onClick={()=>{
                    const u={...newRoutineExercises};u[buildDay]=dayExs.filter((_,j)=>j!==i);setNewRoutineExercises(u);
                  }} style={{background:"transparent",border:"none",color:C.dim,fontSize:18,cursor:"pointer",marginLeft:4}}>✕</button>
                </div>
              </div>
            ))}

            <AddExerciseToDay exercises={exercises} onAdd={(ex)=>{
              const u={...newRoutineExercises};
              u[buildDay]=[...(u[buildDay]||[]),{exercise:ex,sets:3}];
              setNewRoutineExercises(u);
            }}/>

            <div style={{marginTop:16,display:"flex",gap:8}}>
              {buildDay < newRoutineDays-1 ? (
                <button style={btnP} onClick={()=>setBuildDay(buildDay+1)}>Next Day →</button>
              ) : (
                <button style={btnP} onClick={()=>{
                  const days=Array.from({length:newRoutineDays},(_,i)=>newRoutineExercises[i]||[]);
                  const routine={name:newRoutineName.trim(),days};
                  if(isEditing){
                    // Update in place
                    setRoutines(prev=>{const u=[...prev];u[editingRoutineIdx]=routine;return u;});
                    // Update logRoutine if it was the one being edited
                    if(logRoutine&&logRoutine.name===routines[editingRoutineIdx]?.name) setLogRoutine(routine);
                    if(activeRoutine===routines[editingRoutineIdx]?.name) setActiveRoutine(routine.name);
                  } else {
                    setRoutines(prev=>[...prev,routine]);
                    setActiveRoutine(routine.name);
                  }
                  setShowAddRoutine(false);setEditingRoutineIdx(null);
                  setBuildStep("name");setNewRoutineName("");setNewRoutineExercises({});
                }}>{isEditing?"Save Changes ✓":"Save Routine ✓"}</button>
              )}
            </div>
          </div>
        );
      }
    }

    // ---- Main Routines view ----
    const active = routines.find(r=>r.name===activeRoutine)||null;
    return(
      <div style={{paddingBottom:20}}>
        {/* Calendar */}
        <CalendarView workoutDates={workoutDates} selectedDateKey={selectedDateKey}
          onSelectDate={dk=>{
            setSelectedDateKey(dk);
            if(workoutDates.has(dk)) setCalWorkoutDay(dk);
          }} highlightOnly={false}/>

        <div style={{padding:"16px 16px 0"}}>
          <div style={secLabel}>Active Routine</div>

          {/* Dropdown */}
          <div style={{position:"relative",marginBottom:12}}>
            <div onClick={()=>setShowRoutineDrop(v=>!v)}
              style={{...inp,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:active?"#000":"#888",fontSize:15}}>{active?active.name:"No routine selected"}</span>
              <span style={{color:"#999",fontSize:12}}>▾</span>
            </div>
            {showRoutineDrop&&(
              <div style={{position:"absolute",top:"calc(100% - 4px)",left:0,right:0,zIndex:200,
                background:"#1a1a1a",borderRadius:10,maxHeight:260,overflowY:"auto",
                border:`1px solid ${C.borderW}`,boxShadow:"0 8px 32px rgba(0,0,0,0.8)"}}>
                {routines.map((r,i)=>(
                  <div key={i} onClick={()=>{setActiveRoutine(r.name);setShowRoutineDrop(false);}}
                    style={{padding:"13px 14px",cursor:"pointer",fontSize:15,borderBottom:`1px solid ${C.border}`,
                      color:activeRoutine===r.name?C.crimsonL:C.text,
                      background:activeRoutine===r.name?"#2a0808":"transparent",
                      display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span>{r.name}</span>
                    <div style={{display:"flex",gap:8,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
                      {/* Edit button */}
                      <button onClick={()=>{
                        setShowRoutineDrop(false);
                        setEditingRoutineIdx(i);
                        setNewRoutineName(r.name);
                        setNewRoutineDays(r.days.length);
                        const exMap={};r.days.forEach((d,di)=>{exMap[di]=[...d];});
                        setNewRoutineExercises(exMap);
                        setBuildDay(0);setBuildStep("exercises");
                        setShowAddRoutine(true);
                      }} style={{background:"#1e3a5f",border:"none",color:"#60a5fa",
                        padding:"4px 10px",borderRadius:6,fontSize:12,cursor:"pointer",fontWeight:600}}>
                        Edit
                      </button>
                      {/* Delete button */}
                      <button onClick={()=>{
                        setRoutines(prev=>prev.filter((_,j)=>j!==i));
                        if(activeRoutine===r.name)setActiveRoutine(null);
                      }} style={{background:"none",border:"none",color:C.dim,fontSize:16,cursor:"pointer",padding:"4px 6px"}}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active routine preview with Edit button */}
          <ActiveRoutinePreview
            active={active}
            routines={routines}
            activeRoutine={activeRoutine}
            C={C}
            onEdit={(r, idx)=>{
              setEditingRoutineIdx(idx);
              setNewRoutineName(r.name);
              setNewRoutineDays(r.days.length);
              const exMap={};r.days.forEach((d,di)=>{exMap[di]=[...d];});
              setNewRoutineExercises(exMap);
              setBuildDay(0);setBuildStep("exercises");
              setShowAddRoutine(true);
            }}
          />

          <button style={{...btnP,marginTop:16}} onClick={()=>{
            setShowAddRoutine(true);setEditingRoutineIdx(null);
            setBuildStep("name");setNewRoutineName("");
            setNewRoutineDays(3);setNewRoutineExercises({});setBuildDay(0);
          }}>+ Add Routine</button>
        </div>
      </div>
    );
  };

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

      {/* Active routine row */}
      <LogRoutineRow
        activeR={routines.find(r=>r.name===activeRoutine)||null}
        logDay={logDay}
        setLogDay={setLogDay}
        setLogExIdx={setLogExIdx}
        setExercise={setExercise}
        showLogDayDrop={showLogDayDrop}
        setShowLogDayDrop={setShowLogDayDrop}
        C={C}
        inp={inp}
      />

      {/* Exercise progress strip */}
      <ExerciseProgressStrip
        activeR={routines.find(r=>r.name===activeRoutine)||null}
        logDay={logDay}
        logExIdx={logExIdx}
        setLogExIdx={setLogExIdx}
        setExercise={setExercise}
        workouts={workouts}
        selectedDateKey={selectedDateKey}
        C={C}
      />

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


  // ── BADGES ────────────────────────────────────────────────
  // Get all exercises that have at least 2 entries (real PRs possible)
  const trackedExercises = exercises.filter(ex=>
    workouts.filter(w=>w.exercise===ex).length>0
  );

  // Badge detail page
  if(badgeDetail){
    const {exercise:bEx, type} = badgeDetail;
    const exMeta = BADGE_EXERCISES[bEx]||{short:bEx.substring(0,6).toUpperCase(),icon:null};
    if(type==="pr"){
      const bWorkouts=[...workouts.filter(w=>w.exercise===bEx)].sort((a,b)=>a.dateKey.localeCompare(b.dateKey));
      const recs=getRepRecords(bWorkouts);
      return(
        <div style={{background:C.bg,minHeight:"100vh",maxWidth:430,margin:"0 auto"}}>
          <div style={{padding:"20px 20px 12px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${C.border}`}}>
            <button onClick={()=>setBadgeDetail(null)} style={{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer",padding:0}}>←</button>
            <span style={{fontSize:20,fontWeight:700,color:C.text}}>{bEx} — Rep PRs</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:20,justifyContent:"center",padding:"20px 16px 40px"}}>
            {REP_RANGE.map(r=>{
              const rec=recs[r];
              return(
                <div key={r} style={{display:"flex",flexDirection:"column",alignItems:"center",width:120}}>
                  <HexBadge
                    topLine={rec?`${rec.weight}`:"—"}
                    bottomLine={`${r}RM`}
                    iconKey={exMeta.icon}
                    size={115}
                    locked={!rec}
                  />
                  <div style={{marginTop:6,textAlign:"center"}}>
                    <div style={{fontSize:11,fontWeight:700,color:rec?C.text:C.dim}}>{r} Rep Max</div>
                    {rec&&<div style={{fontSize:10,color:C.dim,marginTop:1}}>{rec.date}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    } else {
      // Tonnage badge detail
      const defs=TONNAGE_BADGES[bEx]||[];
      const unlocked=getUnlockedTonnageBadges(workouts,bEx);
      const unlockedIds=new Set(unlocked.map(b=>b.id));
      return(
        <div style={{background:C.bg,minHeight:"100vh",maxWidth:430,margin:"0 auto"}}>
          <div style={{padding:"20px 20px 12px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${C.border}`}}>
            <button onClick={()=>setBadgeDetail(null)} style={{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer",padding:0}}>←</button>
            <span style={{fontSize:20,fontWeight:700,color:C.text}}>{bEx} — Milestones</span>
          </div>
          {/* Progress bar */}
          <div style={{padding:"12px 20px 0"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:13,color:C.muted}}>{unlocked.length} / {defs.length} unlocked</span>
              <span style={{fontSize:13,color:C.crimsonL,fontWeight:700}}>{Math.round(unlocked.length/defs.length*100)}%</span>
            </div>
            <div style={{height:4,background:C.elevated,borderRadius:2}}>
              <div style={{height:4,background:C.crimson,borderRadius:2,width:`${unlocked.length/defs.length*100}%`,transition:"width 0.5s"}}/>
            </div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:20,justifyContent:"center",padding:"20px 16px 40px"}}>
            {[...defs].reverse().map(b=>{
              const isU=unlockedIds.has(b.id);
              return(
                <div key={b.id} style={{display:"flex",flexDirection:"column",alignItems:"center",width:120}}>
                  <HexBadge
                    topLine={b.label}
                    bottomLine={exMeta.short}
                    iconKey={exMeta.icon}
                    size={115}
                    locked={!isU}
                  />
                  <div style={{marginTop:6,textAlign:"center"}}>
                    <div style={{fontSize:10,fontWeight:700,color:isU?C.text:C.dim,lineHeight:1.3}}>{b.desc}</div>
                    {!isU&&<div style={{fontSize:9,color:C.dim,marginTop:2}}>Locked</div>}
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
      <div style={{paddingBottom:24}}>
        {/* Exercise PR Badges */}
        <div style={{padding:"16px 16px 8px"}}>
          <div style={secLabel}>Exercise PRs</div>
          {trackedExercises.length===0?(
            <div style={{textAlign:"center",color:C.dim,padding:"20px 0",fontSize:14}}>
              Start logging lifts to earn badges
            </div>
          ):(
            <div style={{display:"flex",flexWrap:"wrap",gap:20}}>
              {trackedExercises.map(ex=>{
                const exMeta=BADGE_EXERCISES[ex]||{short:ex.substring(0,5).toUpperCase(),icon:null};
                const exW=[...workouts.filter(w=>w.exercise===ex)].sort((a,b)=>a.dateKey.localeCompare(b.dateKey));
                const recs=getRepRecords(exW);
                const best=recs[1]?.weight||getBest1RM(workouts,ex);
                return(
                  <div key={ex} onClick={()=>setBadgeDetail({exercise:ex,type:"pr"})}
                    style={{display:"flex",flexDirection:"column",alignItems:"center",width:120,cursor:"pointer"}}>
                    <HexBadge
                      topLine={best?`${best}`:"PR"}
                      bottomLine={exMeta.short}
                      iconKey={exMeta.icon}
                      size={115}
                    />
                    <div style={{marginTop:6,textAlign:"center"}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.text,lineHeight:1.3}}>{ex}</div>
                      {best>0&&<div style={{fontSize:10,color:C.muted,marginTop:1}}>{best}kg 1RM</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{height:1,background:C.border,margin:"16px 0"}}/>

        {/* Tonnage Milestones */}
        <div style={{padding:"0 16px"}}>
          <div style={secLabel}>Milestones</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:20}}>
            {Object.entries(BADGE_EXERCISES).map(([ex,meta])=>{
              const unlocked=getUnlockedTonnageBadges(workouts,ex);
              const defs=TONNAGE_BADGES[ex]||[];
              const best=unlocked[0]; // highest unlocked
              const next=getNextTonnageBadge(workouts,ex);
              return(
                <div key={ex} onClick={()=>setBadgeDetail({exercise:ex,type:"tonnage"})}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",width:120,cursor:"pointer"}}>
                  <HexBadge
                    topLine={best?best.label:(defs.length?defs[0].label:"—")}
                    bottomLine={meta.short}
                    iconKey={meta.icon}
                    size={115}
                    locked={!best}
                  />
                  <div style={{marginTop:6,textAlign:"center"}}>
                    <div style={{fontSize:11,fontWeight:700,color:best?C.text:C.dim,lineHeight:1.3}}>{ex}</div>
                    <div style={{fontSize:10,color:best?C.muted:C.dim,marginTop:1}}>
                      {best
                        ?(next?`Next: ${next.label}kg`:`Max unlocked!`)
                        :`Goal: ${defs.length?defs[0].label+"kg":"—"}`}
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

  const renderProgress=()=>{
    if(progSelEx){
      const pWorkouts=[...workouts.filter(w=>w.exercise===progSelEx)].sort((a,b)=>a.dateKey.localeCompare(b.dateKey));
      const ul=pWorkouts[0]?.unit||unit;
      const latest=pWorkouts[pWorkouts.length-1];
      const recs=getRepRecords(pWorkouts);
      return(
        <div>
          <div style={{padding:"20px 20px 0",display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>setProgSelEx(null)} style={{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer",padding:0}}>←</button>
            <span style={{fontSize:20,fontWeight:700,color:C.text}}>{progSelEx}</span>
          </div>
          <div style={{display:"flex",padding:"10px 16px 0"}}>
            {["Chart","History"].map(t=>(
              <button key={t} onClick={()=>setExDetailTab(t)} style={{flex:1,background:"none",border:"none",
                borderBottom:`2px solid ${exDetailTab===t?C.crimson:"transparent"}`,
                color:exDetailTab===t?C.white:C.dim,padding:"10px 0",fontSize:16,cursor:"pointer",
                fontWeight:exDetailTab===t?700:400}}>{t}</button>
            ))}
          </div>
          {exDetailTab==="Chart"?(
            <div style={{paddingTop:14}}>
              <div style={{display:"flex",gap:8,padding:"0 16px",marginBottom:12}}>
                {[["1rm","Est. 1RM",C.crimson],["volume","Volume",C.green]].map(([key,label,col])=>(
                  <button key={key} onClick={()=>setChartMetric(key)} style={{flex:1,
                    background:chartMetric===key?col+"22":C.surface,
                    border:`1.5px solid ${chartMetric===key?col:C.border}`,
                    borderRadius:8,padding:"9px 0",color:chartMetric===key?col:C.muted,
                    fontSize:13,fontWeight:chartMetric===key?700:400,cursor:"pointer"}}>{label}</button>
                ))}
              </div>
              <div style={{padding:"0 16px 4px"}}>
                {chartMetric==="1rm"
                  ?<div><div style={{fontSize:12,color:C.muted,marginBottom:8}}>Best estimated 1RM per session</div>
                     <LineChart data={pWorkouts} valueKey="best1RM" unitLabel={ul} color={C.crimson}/></div>
                  :<div><div style={{fontSize:12,color:C.muted,marginBottom:8}}>Total volume per session</div>
                     <BarChart data={pWorkouts} valueKey="volume" color={C.green}
                       formatVal={v=>v>=1000?`${(v/1000).toFixed(1)}k`:String(v)} unitLabel={ul}/></div>
                }
              </div>
              <div style={{padding:"20px 16px 4px"}}>
                <div style={{fontSize:17,fontWeight:700,color:C.text}}>Rep Max Records</div>
                <div style={{fontSize:12,color:C.muted,marginTop:3}}>Heaviest weight lifted at each rep count</div>
              </div>
              {REP_RANGE.map(r=>{
                const rec=recs[r];
                return(
                  <div key={r} style={{...divRow}}>
                    <span style={{fontSize:15,flex:1,fontWeight:500,color:C.text}}>{r} Rep Max</span>
                    <span style={{fontSize:17,flex:1.5,textAlign:"center",fontWeight:rec?800:400,color:C.text}}>
                      {rec?rec.weight:<span style={{color:C.dim}}>—</span>}
                      {rec&&<span style={{fontSize:12,color:C.muted,fontWeight:400}}> {rec.unit}</span>}
                    </span>
                    <span style={{fontSize:12,flex:1,textAlign:"right"}}>
                      {rec?<span style={{color:C.dim}}>{rec.date}</span>:null}
                    </span>
                  </div>
                );
              })}
            </div>
          ):(
            <div style={{paddingTop:8}}>
              {pWorkouts.length===0
                ?<div style={{textAlign:"center",color:C.dim,padding:40}}>No entries yet</div>
                :[...pWorkouts].reverse().map(w=>(
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
                        <span>x {s.reps} reps</span>
                      </div>
                    ))}
                  </div>
                ))
              }
            </div>
          )}
        </div>
      );
    }

    // Main Progress view
    const trackedExs=exercises.filter(ex=>workouts.some(w=>w.exercise===ex));
    const latestBw=bwHistory.length>0?bwHistory[bwHistory.length-1]:null;
    const prevBw=bwHistory.length>1?bwHistory[bwHistory.length-2]:null;
    const bwDiff=latestBw&&prevBw?(latestBw.bodyweight-prevBw.bodyweight).toFixed(1):null;
    const bwDiffNum=bwDiff?parseFloat(bwDiff):null;
    const bwDiffCol=bwDiffNum&&bwDiffNum<0?C.green:bwDiffNum&&bwDiffNum>0?"#f87171":C.muted;
    const catColor=bfCat?bfCat.color:"#888";
    const catLabel=bfCat?bfCat.label:"";

    return(
      <div style={{paddingBottom:30}}>
        <div style={{padding:"16px 16px 0"}}>

          {/* Body Weight */}
          <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:12,fontWeight:700,marginTop:4}}>Body Weight</div>
          <div style={{background:C.surface,borderRadius:14,padding:16,marginBottom:20,border:`1px solid ${C.border}`}}>
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
            {latestBw&&(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                marginBottom:14,background:C.elevated,borderRadius:10,padding:"10px 14px",border:`1px solid ${C.border}`}}>
                <div>
                  <div style={{fontSize:11,color:C.muted}}>Latest</div>
                  <div style={{fontSize:26,fontWeight:800,letterSpacing:-1,color:C.text}}>
                    {latestBw.bodyweight}<span style={{fontSize:13,color:C.muted,fontWeight:400}}> kg</span>
                  </div>
                </div>
                {bwDiff&&(
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:C.muted}}>{latestBw.dateKey}</div>
                    <div style={{fontSize:14,color:bwDiffCol,fontWeight:700}}>{bwDiffNum>0?"+":""}{bwDiff} kg</div>
                  </div>
                )}
              </div>
            )}
            <LineChart data={bwHistory} valueKey="bodyweight" unitLabel="kg" color={C.green}/>
            {bwHistory.length>0&&(
              <div style={{marginTop:12}}>
                {[...bwHistory].reverse().slice(0,5).map(e=>(
                  <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                    <span style={{fontSize:15,fontWeight:600,color:C.text}}>{e.bodyweight} kg</span>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:12,color:C.dim}}>{e.dateKey}</span>
                      <span onClick={()=>setBwHistory(prev=>prev.filter(x=>x.id!==e.id))}
                        style={{color:"#e55",fontSize:18,cursor:"pointer"}}>x</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Body Fat */}
          <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:12,fontWeight:700,marginTop:4}}>Body Fat — US Navy Method</div>
          <div style={{background:C.surface,borderRadius:14,padding:16,marginBottom:24,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:13,color:C.muted,marginBottom:14,lineHeight:1.5}}>All measurements in <b style={{color:C.text}}>centimetres</b>.</div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {["male","female"].map(g=>(
                <button key={g} onClick={()=>setBfGender(g)} style={{flex:1,
                  background:bfGender===g?C.crimson:C.elevated,
                  border:`1px solid ${bfGender===g?C.crimson:C.border}`,
                  borderRadius:8,padding:"10px 0",color:C.white,fontSize:14,
                  fontWeight:bfGender===g?700:400,cursor:"pointer",textTransform:"capitalize"}}>{g}</button>
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
              {bfGender==="female"&&(
                <div style={{flex:1}}>
                  <div style={{color:C.muted,fontSize:12,marginBottom:5}}>Hips (cm)</div>
                  <input style={inp} inputMode="decimal" placeholder="95" value={bfHips} onChange={e=>setBfHips(e.target.value)}/>
                </div>
              )}
            </div>
            {bfRounded&&bfRounded>0?(
              <div style={{background:C.elevated,borderRadius:12,padding:16,marginBottom:14,textAlign:"center",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:13,color:C.muted,marginBottom:4}}>Estimated Body Fat</div>
                <div style={{fontSize:50,fontWeight:800,letterSpacing:-2,color:catColor}}>
                  {bfRounded}<span style={{fontSize:22,fontWeight:400,color:C.muted}}>%</span>
                </div>
                <div style={{display:"inline-block",background:catColor+"33",border:`1px solid ${catColor}`,
                  borderRadius:20,padding:"4px 14px",fontSize:13,fontWeight:600,color:catColor,marginTop:4}}>
                  {catLabel}
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

          {/* Exercise Progress */}
          <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:12,fontWeight:700,marginTop:4}}>Exercise Progress</div>
          {trackedExs.length===0?(
            <div style={{background:C.surface,borderRadius:14,padding:24,textAlign:"center",
              color:C.dim,fontSize:14,border:`1px solid ${C.border}`}}>
              Start logging sets to track your exercise progress here
            </div>
          ):(
            <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:8}}>
              {trackedExs.map((ex,i)=>{
                const exWkts=[...workouts.filter(w=>w.exercise===ex)].sort((a,b)=>a.dateKey.localeCompare(b.dateKey));
                const best=exWkts.length?Math.max(...exWkts.map(w=>w.best1RM)):0;
                const exLatest=exWkts[exWkts.length-1];
                const exPrev=exWkts.length>1?exWkts[exWkts.length-2]:null;
                const trend=exPrev?exLatest.best1RM-exPrev.best1RM:null;
                return(
                  <div key={ex} onClick={()=>{setProgSelEx(ex);setExDetailTab("Chart");setChartMetric("1rm");}}
                    style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                      padding:"14px 16px",borderBottom:i<trackedExs.length-1?`1px solid ${C.border}`:"none",cursor:"pointer"}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:600,color:C.text}}>{ex}</div>
                      <div style={{fontSize:12,color:C.muted,marginTop:2}}>{exWkts.length} session{exWkts.length!==1?"s":""}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:16,fontWeight:800,color:C.text}}>{best}<span style={{fontSize:11,color:C.muted,fontWeight:400}}> {unit}</span></div>
                        {trend!==null&&(
                          <div style={{fontSize:11,fontWeight:600,color:trend>0?C.green:trend<0?"#f87171":C.dim}}>
                            {trend>0?"+":""}{trend} {unit}
                          </div>
                        )}
                      </div>
                      <span style={{color:C.dim,fontSize:20}}>›</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

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
        {tab==="Log"&&renderCalculator()}
        {tab==="Routines"&&renderRoutines()}
        {tab==="Exercise"&&renderExercise()}
        {tab==="Progress"&&renderProgress()}
        {tab==="Badges"&&renderBadges()}
      </div>

      {/* Tab bar */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:430,background:C.surface,borderTop:`1px solid ${C.borderW}`,
        display:"flex",padding:"8px 0 20px"}}>
        {TABS.map(t=>(
          <div key={t} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,
            cursor:"pointer",color:tab===t?C.crimson:C.dim,fontSize:9,fontWeight:tab===t?700:400}}
            onClick={()=>{setTab(t);if(t!=="Routines")setCalWorkoutDay(null);if(t!=="Exercise"&&t!=="Progress")setSelEx(null);setBadgeDetail(null);setProgSelEx(null);}}>
            {t==="Progress" ? IconBody(tab===t) : TAB_ICONS[t]}<span>{t}</span>
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
}  // ── PROGRESS ──────────────────────────────────────────────
