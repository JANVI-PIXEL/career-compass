import React, { useState, useMemo, useEffect, useRef } from "react";
import { ArrowRight, ArrowLeft, RotateCcw, Sparkles, User, Mail, Phone, Sun, Moon } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

// --- Google Sheets config ---
// 1. Create a Google Sheet, go to Extensions -> Apps Script, paste the doPost script
//    (see README), then Deploy -> New deployment -> Web app -> Execute as: Me,
//    Who has access: Anyone. Paste the resulting /exec URL below.
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";

async function saveResultToGoogleSheet({ contact, scores, topTypes, topCareers }) {
  const payload = {
    name: contact.name,
    email: contact.email,
    mobile: contact.mobile,
    scores,
    topTypes,
    topCareers: topCareers.map((c) => ({ name: c.name, match: c.match })),
  };
  // Sent as x-www-form-urlencoded (a "simple request") so the browser skips a
  // CORS preflight, which Apps Script web apps don't handle well.
  const res = await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    body: new URLSearchParams({ data: JSON.stringify(payload) }),
  });
  if (!res.ok) throw new Error(`Google Sheets insert failed: ${res.status}`);
}

// ---------- Theme tokens ----------
const THEMES = {
  dark: {
    bg: "#0F1B26",
    surface: "#182530",
    surfaceAlt: "#101B26",
    border: "#233240",
    text: "#F1EDE2",
    textMuted: "#8FA0AC",
    accent: "#E3A548",
    accentText: "#101B26",
    success: "#6FB99A",
    successSoft: "#1F3A2E",
    error: "#E2685C",
  },
  light: {
    bg: "#F6F3EC",
    surface: "#FFFFFF",
    surfaceAlt: "#F0ECE1",
    border: "#E3DDCC",
    text: "#25211B",
    textMuted: "#756F63",
    accent: "#B9762A",
    accentText: "#FFFFFF",
    success: "#3F8F6D",
    successSoft: "#E4F0EA",
    error: "#C0392B",
  },
};

const TYPES = {
  R: { name: "The Builder", angle: 0, blurb: "hands-on, practical, likes making things work" },
  I: { name: "The Analyst", angle: 60, blurb: "curious, logical, digs until things make sense" },
  A: { name: "The Creator", angle: 120, blurb: "expressive, original, drawn to crafting things" },
  S: { name: "The Helper", angle: 180, blurb: "people-first, calm under pressure, supportive" },
  E: { name: "The Leader", angle: 240, blurb: "driven, persuasive, likes owning outcomes" },
  C: { name: "The Organizer", angle: 300, blurb: "structured, precise, keeps things in order" },
};

const QUESTIONS = [
  { id: 1, type: "R", text: "I enjoy figuring out how a system, app, or network works under the hood." },
  { id: 2, type: "R", text: "I like tinkering with new tools, gadgets, or software just to see how they work." },
  { id: 3, type: "R", text: "I'd rather troubleshoot something hands-on than just read about the theory." },
  { id: 4, type: "I", text: "I enjoy tracing a bug or error until I find the exact root cause." },
  { id: 5, type: "I", text: "I like spotting patterns in data or numbers that others might miss." },
  { id: 6, type: "I", text: "I could spend hours learning how an algorithm or model actually works." },
  { id: 7, type: "I", text: "I prefer testing an idea logically before trusting my gut feeling." },
  { id: 8, type: "A", text: "I enjoy shaping raw footage, photos, or content into something polished." },
  { id: 9, type: "A", text: "I like experimenting with different styles until something feels 'just right.'" },
  { id: 10, type: "A", text: "I get a creative buzz from turning a rough idea into a finished piece." },
  { id: 11, type: "S", text: "I stay calm and helpful even when someone around me is stressed or upset." },
  { id: 12, type: "S", text: "I enjoy taking care of people's comfort, especially in unfamiliar situations." },
  { id: 13, type: "S", text: "I like guiding or reassuring someone who feels nervous or lost." },
  { id: 14, type: "S", text: "Helping a stranger have a smooth, pleasant experience genuinely satisfies me." },
  { id: 15, type: "E", text: "I like taking ownership of a project from start to finish." },
  { id: 16, type: "E", text: "I enjoy pitching an idea and getting others excited about it." },
  { id: 17, type: "E", text: "I'd rather lead through a tricky situation than wait for instructions." },
  { id: 18, type: "C", text: "I like organizing large amounts of information so it's easy to find later." },
  { id: 19, type: "C", text: "I feel satisfied when data or files are clean, structured, and error-free." },
  { id: 20, type: "C", text: "I prefer following a clear process or checklist over winging it." },
];

// [R, I, A, S, E, C] on a 0-5 scale
const CAREERS = [
  { name: "Coding / Software Development", v: [2, 5, 2, 1, 2, 3], blurb: "Building and shipping working software through code." },
  { name: "Editing (Video / Content)", v: [2, 2, 5, 2, 2, 2], blurb: "Shaping raw footage or content into a polished final piece." },
  { name: "Artificial Intelligence (AI)", v: [1, 5, 3, 1, 2, 2], blurb: "Designing systems that reason, generate, and make decisions." },
  { name: "Machine Learning", v: [2, 5, 1, 1, 1, 4], blurb: "Training models to find patterns and predict outcomes." },
  { name: "Data Engineering", v: [2, 4, 1, 1, 2, 5], blurb: "Building the pipelines that move and structure data at scale." },
  { name: "Air Hostess / Cabin Crew", v: [2, 1, 2, 5, 3, 3], blurb: "Ensuring passenger safety and comfort, calmly, in real time." },
  { name: "Full Stack Development", v: [3, 4, 3, 1, 2, 3], blurb: "Building both the front-end and back-end of applications." },
  { name: "Database Administration", v: [1, 3, 1, 1, 1, 5], blurb: "Keeping an organization's data structured, safe, and fast." },
];

const MILESTONES = {
  5: "Nice — 5 down, 15 to go.",
  10: "Halfway there. Keep going!",
  15: "Almost done — final stretch!",
};

// ---------- Anti-spam validation ----------
const DISPOSABLE_EMAIL_DOMAINS = [
  "mailinator.com", "tempmail.com", "temp-mail.org", "guerrillamail.com",
  "10minutemail.com", "yopmail.com", "throwaway.email", "trashmail.com",
  "fakeinbox.com", "getnada.com", "sharklasers.com", "dispostable.com",
  "maildrop.cc", "mintemail.com",
];

function isSequentialOrRepeating(digits) {
  if (/^(\d)\1+$/.test(digits)) return true; // 0000000000
  const asc = "01234567890123456789";
  const desc = "98765432109876543210";
  if (asc.includes(digits) || desc.includes(digits)) return true;
  return false;
}

function validateContact(contact) {
  const errors = {};

  const name = contact.name.trim();
  if (!name) errors.name = "Please enter your name";
  else if (!/^[A-Za-z][A-Za-z .'-]{1,49}$/.test(name)) errors.name = "Enter a valid name (letters only)";

  const email = contact.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
    errors.email = "Enter a valid email address";
  } else {
    const domain = email.split("@")[1];
    if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
      errors.email = "Temporary/disposable emails aren't allowed";
    }
  }

  const mobileDigits = contact.mobile.replace(/[\s-]/g, "").replace(/^\+/, "");
  if (!/^\d{10,13}$/.test(mobileDigits)) {
    errors.mobile = "Enter a valid mobile number (10-13 digits)";
  } else {
    const last10 = mobileDigits.slice(-10);
    if (isSequentialOrRepeating(last10)) {
      errors.mobile = "Enter a real mobile number";
    }
  }

  return errors;
}

function cosineSim(a, b) {
  const dot = a.reduce((s, x, i) => s + x * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  const magB = Math.sqrt(b.reduce((s, x) => s + x * x, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

// ---------- Illustrations (inline SVG, no external assets) ----------
function IntroIllustration({ p }) {
  return (
    <svg viewBox="0 0 240 140" className="w-full h-auto">
      <circle cx="200" cy="30" r="22" fill={p.accent} opacity="0.25" />
      <circle cx="200" cy="30" r="12" fill={p.accent} />
      <rect x="0" y="110" width="240" height="4" rx="2" fill={p.border} />
      <line x1="120" y1="110" x2="120" y2="55" stroke={p.textMuted} strokeWidth="4" strokeLinecap="round" />
      <g>
        <rect x="90" y="40" width="60" height="18" rx="4" fill={p.accent} />
        <polygon points="150,40 162,49 150,58" fill={p.accent} />
        <text x="120" y="53" fontSize="10" textAnchor="middle" fill={p.accentText} fontFamily="Inter, sans-serif" fontWeight="600">{"</>"}</text>
      </g>
      <g>
        <rect x="55" y="62" width="60" height="18" rx="4" fill={p.success} />
        <polygon points="55,62 43,71 55,80" fill={p.success} />
        <text x="85" y="75" fontSize="9" textAnchor="middle" fill={p.surface} fontFamily="Inter, sans-serif" fontWeight="600">AI / ML</text>
      </g>
      <g>
        <rect x="125" y="84" width="66" height="18" rx="4" fill={p.text} opacity="0.85" />
        <polygon points="191,84 203,93 191,102" fill={p.text} opacity="0.85" />
        <text x="158" y="97" fontSize="9" textAnchor="middle" fill={p.surface} fontFamily="Inter, sans-serif" fontWeight="600">Design</text>
      </g>
      <g transform="translate(112,95)">
        <circle cx="8" cy="0" r="8" fill={p.text} />
        <rect x="0" y="8" width="16" height="20" rx="6" fill={p.text} />
      </g>
    </svg>
  );
}

function ResultsIllustration({ p }) {
  return (
    <svg viewBox="0 0 240 140" className="w-full h-auto">
      <polygon points="30,120 100,30 170,120" fill={p.surfaceAlt} stroke={p.border} strokeWidth="2" />
      <polygon points="100,30 130,70 70,70" fill={p.accent} opacity="0.35" />
      <line x1="100" y1="30" x2="100" y2="6" stroke={p.textMuted} strokeWidth="3" />
      <polygon points="100,6 100,20 122,13" fill={p.success} />
      <circle cx="185" cy="25" r="4" fill={p.accent} />
      <circle cx="200" cy="45" r="3" fill={p.success} />
      <circle cx="170" cy="15" r="2.5" fill={p.success} />
      <circle cx="45" cy="35" r="3" fill={p.accent} />
      <circle cx="60" cy="20" r="2.5" fill={p.success} />
      <rect x="0" y="120" width="240" height="4" rx="2" fill={p.border} />
    </svg>
  );
}

export default function CareerCompass() {
  const [themeName, setThemeName] = useState("dark");
  const p = THEMES[themeName];

  const [stage, setStage] = useState("intro"); // intro | quiz | results
  const [answers, setAnswers] = useState({});
  const [qIndex, setQIndex] = useState(0);
  const [contact, setContact] = useState({ name: "", email: "", mobile: "" });
  const [errors, setErrors] = useState({});
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const hasSaved = useRef(false);

  const progress = Math.round((qIndex / QUESTIONS.length) * 100);
  const current = QUESTIONS[qIndex];
  const firstName = contact.name.trim().split(" ")[0];

  const scores = useMemo(() => {
    const sums = { R: [0, 0], I: [0, 0], A: [0, 0], S: [0, 0], E: [0, 0], C: [0, 0] };
    QUESTIONS.forEach((q) => {
      const a = answers[q.id];
      if (a) {
        sums[q.type][0] += a;
        sums[q.type][1] += 1;
      }
    });
    const out = {};
    Object.keys(sums).forEach((k) => {
      out[k] = sums[k][1] ? sums[k][0] / sums[k][1] : 0;
    });
    return out;
  }, [answers]);

  const topTypes = useMemo(() => {
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);
  }, [scores]);

  const userVector = ["R", "I", "A", "S", "E", "C"].map((k) => scores[k]);

  const topCareers = useMemo(() => {
    if (Object.values(scores).every((v) => v === 0)) return [];
    return CAREERS.map((c) => ({ ...c, match: cosineSim(userVector, c.v) }))
      .sort((a, b) => b.match - a.match)
      .slice(0, 3);
  }, [scores]);

  useEffect(() => {
    if (stage === "results" && !hasSaved.current && topCareers.length) {
      hasSaved.current = true;
      setSaveStatus("saving");
      saveResultToGoogleSheet({ contact, scores, topTypes, topCareers })
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }
  }, [stage, topCareers, scores, topTypes, contact]);

  const needleAngle = topTypes.length ? TYPES[topTypes[0]].angle : progress * 3.6;

  function handleStart() {
    const errs = validateContact(contact);
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStage("quiz");
  }

  function selectAnswer(rating) {
    setAnswers((prev) => ({ ...prev, [current.id]: rating }));
    setTimeout(() => {
      if (qIndex < QUESTIONS.length - 1) {
        setQIndex((i) => i + 1);
      } else {
        setStage("results");
      }
    }, 220);
  }

  function restart() {
    setAnswers({});
    setQIndex(0);
    setStage("intro");
    setSaveStatus("idle");
    hasSaved.current = false;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative" style={{ background: p.bg, transition: "background 300ms ease" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        .cc-display { font-family: 'Fraunces', serif; }
        .cc-body { font-family: 'Inter', sans-serif; }
        .cc-needle { transition: transform 900ms cubic-bezier(.34,1.4,.64,1); }
        .cc-fade-in { animation: ccFadeIn 400ms ease both; }
        .cc-pop { animation: ccPop 500ms ease both; }
        @keyframes ccFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ccPop { 0% { opacity: 0; transform: scale(.9); } 60% { opacity: 1; transform: scale(1.03); } 100% { transform: scale(1); } }
      `}</style>

      <button
        onClick={() => setThemeName((t) => (t === "dark" ? "light" : "dark"))}
        className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium cc-body"
        style={{ background: p.surface, border: `1px solid ${p.border}`, color: p.text }}
      >
        {themeName === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        {themeName === "dark" ? "Light" : "Dark"}
      </button>

      <div className="w-full max-w-md cc-body" style={{ color: p.text }}>
        {/* Compass header */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-24 h-24 mb-3">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="46" fill="none" stroke={p.border} strokeWidth="2" />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke={p.accent}
                strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 46}`}
                strokeDashoffset={`${2 * Math.PI * 46 * (1 - (stage === "results" ? 1 : progress / 100))}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: "stroke-dashoffset 400ms ease" }}
              />
              <g className="cc-needle" style={{ transformOrigin: "50px 50px", transform: `rotate(${needleAngle}deg)` }}>
                <polygon points="50,14 45,50 50,58 55,50" fill={p.accent} />
                <polygon points="50,86 45,50 50,42 55,50" fill={p.success} />
              </g>
              <circle cx="50" cy="50" r="4" fill={p.text} />
            </svg>
          </div>
          <h1 className="cc-display text-2xl font-semibold tracking-tight">Career Compass</h1>
          {stage === "quiz" && (
            <p className="text-xs mt-1" style={{ color: p.textMuted }}>
              {firstName ? `${firstName}, question` : "Question"} {qIndex + 1} of {QUESTIONS.length}
            </p>
          )}
        </div>

        {/* Intro */}
        {stage === "intro" && (
          <div className="cc-fade-in rounded-2xl p-6" style={{ background: p.surface, border: `1px solid ${p.border}` }}>
            <div className="mb-4 -mt-1">
              <IntroIllustration p={p} />
            </div>
            <p className="mb-5 leading-relaxed" style={{ color: p.textMuted }}>
              Answer 20 quick statements about how you naturally think and work.
              There are no right answers — just react honestly. At the end you'll
              get your top 3 career matches from coding, AI, editing, and more.
            </p>

            <div className="flex flex-col gap-3 mb-2">
              <div>
                <div className="flex items-center gap-2 rounded-lg px-3" style={{ background: p.surfaceAlt, border: `1px solid ${errors.name ? p.error : p.border}` }}>
                  <User size={16} style={{ color: p.textMuted }} />
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                    placeholder="Full name"
                    className="w-full bg-transparent py-3 outline-none cc-body"
                    style={{ color: p.text }}
                  />
                </div>
                {errors.name && <p className="text-xs mt-1" style={{ color: p.error }}>{errors.name}</p>}
              </div>

              <div>
                <div className="flex items-center gap-2 rounded-lg px-3" style={{ background: p.surfaceAlt, border: `1px solid ${errors.email ? p.error : p.border}` }}>
                  <Mail size={16} style={{ color: p.textMuted }} />
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                    placeholder="Email address"
                    className="w-full bg-transparent py-3 outline-none cc-body"
                    style={{ color: p.text }}
                  />
                </div>
                {errors.email && <p className="text-xs mt-1" style={{ color: p.error }}>{errors.email}</p>}
              </div>

              <div>
                <div className="flex items-center gap-2 rounded-lg px-3" style={{ background: p.surfaceAlt, border: `1px solid ${errors.mobile ? p.error : p.border}` }}>
                  <Phone size={16} style={{ color: p.textMuted }} />
                  <input
                    type="tel"
                    value={contact.mobile}
                    onChange={(e) => setContact((c) => ({ ...c, mobile: e.target.value }))}
                    placeholder="Mobile number"
                    className="w-full bg-transparent py-3 outline-none cc-body"
                    style={{ color: p.text }}
                  />
                </div>
                {errors.mobile && <p className="text-xs mt-1" style={{ color: p.error }}>{errors.mobile}</p>}
              </div>
            </div>

            <p className="text-sm mb-5 mt-3" style={{ color: p.textMuted }}>
              Takes about 3 minutes. Your info is only used to save your results.
            </p>

            <button
              onClick={handleStart}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-medium cc-body"
              style={{ background: p.accent, color: p.accentText }}
            >
              Start assessment <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Quiz */}
        {stage === "quiz" && current && (
          <div>
            {MILESTONES[qIndex] && (
              <p key={`m-${qIndex}`} className="cc-pop text-center text-sm mb-3 rounded-full py-2 px-4" style={{ background: p.successSoft, color: p.success }}>
                {MILESTONES[qIndex]}
              </p>
            )}
            <div key={current.id} className="cc-fade-in rounded-2xl p-6" style={{ background: p.surface, border: `1px solid ${p.border}` }}>
              <p className="cc-display text-lg mb-6 leading-snug">{current.text}</p>
              <div className="flex flex-col gap-2">
                {[
                  { v: 1, label: "Strongly disagree" },
                  { v: 2, label: "Disagree" },
                  { v: 3, label: "Neutral" },
                  { v: 4, label: "Agree" },
                  { v: 5, label: "Strongly agree" },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => selectAnswer(opt.v)}
                    className="text-left rounded-lg px-4 py-3 transition-colors"
                    style={{
                      background: answers[current.id] === opt.v ? p.successSoft : p.surfaceAlt,
                      border: `1px solid ${answers[current.id] === opt.v ? p.success : p.border}`,
                      color: p.text,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {qIndex > 0 && (
                <button
                  onClick={() => setQIndex((i) => i - 1)}
                  className="mt-5 flex items-center gap-1 text-sm"
                  style={{ color: p.textMuted }}
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {stage === "results" && (
          <div className="cc-fade-in">
            <div className="rounded-2xl p-5 mb-4 text-center" style={{ background: p.surface, border: `1px solid ${p.border}` }}>
              <div className="mb-3 max-w-[180px] mx-auto">
                <ResultsIllustration p={p} />
              </div>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: p.textMuted }}>
                {firstName ? `${firstName}'s top traits` : "Your top traits"}
              </p>
              <p className="cc-display text-xl font-semibold">
                {topTypes.map((t) => TYPES[t].name).join(" · ")}
              </p>
              <p className="text-sm mt-2" style={{ color: p.textMuted }}>
                {topTypes.map((t) => TYPES[t].blurb).join("; ")}.
              </p>
            </div>

            <p className="text-sm mb-3 flex items-center gap-1" style={{ color: p.textMuted }}>
              <Sparkles size={14} /> Your response profile
            </p>
            <div className="rounded-2xl p-4 mb-4" style={{ background: p.surface, border: `1px solid ${p.border}` }}>
              <ResponsiveContainer width="100%" height={230}>
                <RadarChart
                  data={["R", "I", "A", "S", "E", "C"].map((k) => ({
                    trait: TYPES[k].name.replace("The ", ""),
                    value: Math.round((scores[k] / 5) * 100),
                  }))}
                >
                  <PolarGrid stroke={p.border} />
                  <PolarAngleAxis dataKey="trait" tick={{ fill: p.textMuted, fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: p.textMuted, fontSize: 9 }} />
                  <Radar dataKey="value" stroke={p.accent} fill={p.accent} fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <p className="text-sm mb-3 flex items-center gap-1" style={{ color: p.textMuted }}>
              <Sparkles size={14} /> Your top 3 career matches
            </p>

            <div className="flex flex-col gap-3 mb-6">
              {topCareers.map((c, i) => (
                <div key={c.name} className="rounded-xl p-4" style={{ background: p.surface, border: `1px solid ${p.border}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="cc-display font-semibold">
                      {i + 1}. {c.name}
                    </span>
                    <span className="text-xs font-medium" style={{ color: p.success }}>
                      {Math.round(c.match * 100)}% match
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full mb-2" style={{ background: p.surfaceAlt }}>
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${Math.round(c.match * 100)}%`, background: p.success }}
                    />
                  </div>
                  <p className="text-sm" style={{ color: p.textMuted }}>
                    {c.blurb}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-xs text-center mb-3" style={{ color: p.textMuted }}>
              {saveStatus === "saving" && "Saving your result…"}
              {saveStatus === "saved" && "✓ Result saved"}
              {saveStatus === "error" && "Couldn't save result (check connection)"}
            </p>

            <button
              onClick={restart}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-medium"
              style={{ background: p.surfaceAlt, border: `1px solid ${p.border}`, color: p.text }}
            >
              <RotateCcw size={16} /> Retake assessment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
