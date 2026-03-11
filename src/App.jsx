import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import {
  Flame, ListTodo, ChevronRight,
  Package, Gem, Copy, Check, Trash2,
  Beaker, Skull, AlertTriangle, FastForward,
  LayoutDashboard, Swords, Shield, Star, ThumbsUp, ThumbsDown, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- FIREBASE ---
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};
let app, auth, db;
try { app = initializeApp(firebaseConfig); auth = getAuth(app); db = getFirestore(app); } catch {}
const APP_ID = 'poe-mirage-helper';

// ─── Shared Card Component ────────────────────────────────
const Card = ({ children, className = '' }) => (
  <div className={`bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 ${className}`}>
    {children}
  </div>
);
const SectionTitle = ({ icon: Icon, label, color = 'text-orange-400' }) => (
  <h3 className={`${color} font-black uppercase text-xs mb-4 tracking-widest flex items-center gap-2 border-b border-white/5 pb-2`}>
    <Icon className="w-4 h-4" /> {label}
  </h3>
);

export default function App() {
  const [showSplash, setShowSplash]               = useState(true);
  const [activeTab,  setActiveTab]                = useState('guide');
  const [user,       setUser]                     = useState(null);
  const [syncStatus, setSyncStatus]               = useState('offline');
  const [copied,     setCopied]                   = useState(false);
  const [showReset,  setShowReset]                = useState(false);

  const regexString = '"-w-.-|b-b-b|g-g-r|g-r-g|r-g-g|.*(?=\\S*r)(?=\\S*g)(?=\\S*b)|r-r-[gb]|r-[gb]-r|[gb]-r-r|Runn|rint|me Sh|at\'s h|lap|Earn|(o |d |r)int"';

  useEffect(() => { const t = setTimeout(() => setShowSplash(false), 2500); return () => clearTimeout(t); }, []);
  const handleCopy = () => { navigator.clipboard.writeText(regexString); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const [acts, setActs] = useState([
    { id: 1, act: 'Akt 1', title: 'Start & Rollende Magmakugel', done: false, steps: [
      'MULE-TRICK: Hexe erstellen (Lvl 4). Kaufe <span class="text-orange-300 font-bold">Rollende Magmakugel</span>, Frostspurt, Arkane Woge, Flammenwand &amp; Elementare Ausweitung.',
      '<span class="text-red-400 font-bold">SPERRE:</span> Rollende Magmakugel auf Hexe NICHT leveln (Lvl 1 lassen!).',
      'Händler: Kaufe zwei <span class="text-orange-400 font-bold italic">Ziegenhorn</span> – selbst weiße geben +50% Feuerschaden durch den impliziten Wert!',
      'Rezept: Eisenring + rote Gemme = <span class="text-orange-400 font-bold underline">Rubinring</span>. Zweimal machen!',
      'Feuerwand nutzen: Rollende Magmakugel immer <span class="text-white font-bold">durch die Flammenwand schießen</span> für massiven Schadensbonus.',
    ]},
    { id: 2, act: 'Akt 2', title: 'Gerechtes Feuer & Kraityn', done: false, steps: [
      'Quest "Eindringlinge in Schwarz" abschließen → <span class="text-orange-400 font-bold">Gerechtes Feuer</span> bei Yeena kaufen.',
      'Banditen: <span class="text-green-400 font-black uppercase underline">Kraityn helfen</span> → +8% Lauftempo (Pflicht fürs schnelle Leveln!)',
      'Waffe tauschen: Auf <span class="text-white font-bold">Schild &amp; Schildsturm</span> wechseln. Durch Gegner stürmen statt laufen.',
      'Aura: <span class="text-yellow-400 font-bold">Herold des Donners</span> kaufen → Schock verstärkt RF-Schaden.',
      'Ziel: <span class="text-red-400 font-black underline">120%+ Feuer-Resistenz</span> → Mastery "1 Leben/Sek. pro ungedeckelter Feuer-Resi" = Pflicht!',
      'Rezept x2: 2× Eisenring + 2× rote Gemme = 2× Rubinring. Auf <span class="text-white font-bold">Feuer-Resi craften</span> nicht vergessen!',
      'Optional: <span class="text-purple-400 font-bold">Blutdurst</span> kaufen → Rasereisladungen bei Kill (+4% Schaden/Ladung), aber zusätzliches Degen-Risiko.',
    ]},
    { id: 3, act: 'Akt 3', title: 'Labyrinth & Auren-Regel', done: false, steps: [
      'Labyrinth 1: Aufstieg wählen → <span class="text-orange-400 font-bold underline">Tasalio, Stille des Wassers</span> (Häuptling).',
      '<span class="text-red-500 font-black italic">ACHTUNG:</span> Auren (Vitalität, Reinheit der Elemente) NIEMALS mit Unterstützungsgemmen verlinken! Mana-Reservierung steigt sonst auf 100%+.',
      'Aura kaufen: <span class="text-blue-400 font-bold">Reinheit der Elemente</span> → Immunität gegen Gefrierpunkt &amp; Schock.',
      'Spielablauf: Schildsturm → Bestrafung bei blauen Gegnerpacks → Feuerfalle für Einzelziele → Frostblinken zur Neupositionierung.',
    ]},
  ]);

  const progress = Math.round((acts.filter(a => a.done).length / acts.length) * 100);

  useEffect(() => {
    if (!auth) return;
    signInAnonymously(auth).catch(() => setSyncStatus('error'));
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const ref = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'progress');
    return onSnapshot(ref, snap => {
      if (snap.exists()) {
        const saved = snap.data().acts;
        if (saved) setActs(p => p.map(a => ({ ...a, done: saved.find(s => s.id === a.id)?.done || false })));
      }
      setSyncStatus('synced');
    }, () => setSyncStatus('error'));
  }, [user]);

  const toggleAct = id => {
    const next = acts.map(a => a.id === id ? { ...a, done: !a.done } : a);
    setActs(next);
    if (user && db) { setSyncStatus('loading'); setDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'progress'), { acts: next.map(a => ({ id: a.id, done: a.done })), lastUpdated: Date.now() }); }
  };

  const resetProgress = () => {
    const next = acts.map(a => ({ ...a, done: false }));
    setActs(next);
    if (user && db) setDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'progress'), { acts: next.map(a => ({ id: a.id, done: a.done })), lastUpdated: Date.now() });
    setShowReset(false);
  };

  const tabs = [
    { id: 'guide',    icon: ListTodo,      label: 'Guide'    },
    { id: 'skills',   icon: Zap,           label: 'Skills'   },
    { id: 'gear',     icon: Package,       label: 'Ausrüst.' },
    { id: 'meta',     icon: Star,          label: 'Infos'    },
  ];

  return (
    <>
      {/* ══ SPLASH ══ */}
      <AnimatePresence>
        {showSplash && (
          <motion.div key="splash" initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }} transition={{ duration: 0.6 }}
            className="fixed inset-0 z-[200] bg-[#050505] flex flex-col items-center justify-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8 }} className="flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-tr from-orange-600 to-red-700 rounded-3xl flex items-center justify-center shadow-[0_0_60px_rgba(234,88,12,0.5)] mb-8 relative">
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-orange-500 rounded-3xl blur-xl" />
                <Flame className="w-12 h-12 text-white relative z-10" />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Mirage</h1>
              <p className="text-orange-500 text-[10px] font-bold tracking-[0.3em] uppercase opacity-80">RF Häuptling · PoE 3.28</p>
              <div className="mt-12 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2.2 }} className="h-full bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ MAIN APP ══ */}
      {!showSplash && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
          className="min-h-screen bg-black text-slate-200 font-sans pb-32 overflow-x-hidden">

          {/* Header */}
          <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 pt-14 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-orange-600 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-900/20">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">Mirage</h1>
                  <div className="flex items-center space-x-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-green-500' : syncStatus === 'loading' ? 'bg-orange-500 animate-pulse' : syncStatus === 'error' ? 'bg-red-500' : 'bg-slate-600'}`} />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{syncStatus}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowReset(true)} className="p-2 bg-white/5 rounded-full text-slate-500 active:text-red-500 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <div className="relative h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.6 }}
                className="absolute h-full bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
            </div>
          </header>

          <main className="p-4">
            <AnimatePresence mode="wait">

              {/* ══ GUIDE TAB ══ */}
              {activeTab === 'guide' && (
                <motion.div key="guide" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-4">
                  {acts.map(act => (
                    <div key={act.id} className={`bg-white/[0.03] border rounded-[2.5rem] p-6 transition-all active:scale-[0.98] ${act.done ? 'border-green-500/20 opacity-50' : 'border-white/10'}`}>
                      <div onClick={() => toggleAct(act.id)} className="flex items-center justify-between cursor-pointer">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{act.act}</span>
                          <h4 className="text-lg font-bold text-white leading-tight">{act.title}</h4>
                        </div>
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${act.done ? 'bg-green-500 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-white/10'}`}>
                          {act.done && <Check className="w-6 h-6 text-white" />}
                        </div>
                      </div>
                      {!act.done && (
                        <div className="mt-5 space-y-4 pt-4 border-t border-white/5">
                          {act.steps.map((step, i) => (
                            <div key={i} className="flex items-start space-x-3 text-[13px] text-slate-400 leading-relaxed">
                              <ChevronRight className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                              <p dangerouslySetInnerHTML={{ __html: step }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}

              {/* ══ SKILLS TAB ══ */}
              {activeTab === 'skills' && (
                <motion.div key="skills" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }} className="space-y-4">

                  {/* Spielweise */}
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-[2.5rem] p-6">
                    <SectionTitle icon={FastForward} label="Spielweise" color="text-orange-400" />
                    <div className="space-y-3 text-[13px] text-slate-300 leading-relaxed">
                      <div className="flex items-start gap-3">
                        <span className="text-orange-500 font-black text-lg leading-none">1.</span>
                        <p><span className="text-white font-bold">Gerechtes Feuer</span> aktivieren und mit <span className="text-white font-bold">Schildsturm</span> durch Gegner stürmen.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-orange-500 font-black text-lg leading-none">2.</span>
                        <p>Bei blauen Gegnerpacks: <span className="text-yellow-400 font-bold">Bestrafung</span> und <span className="text-red-400 font-bold">Feuerfalle</span> einsetzen.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-orange-500 font-black text-lg leading-none">3.</span>
                        <p><span className="text-blue-400 font-bold">Frostblinken</span> zur Neupositionierung – später einfach alles austanken.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-orange-500 font-black text-lg leading-none">4.</span>
                        <p>Kurz stehen bleiben → <span className="text-orange-300 font-bold">Ramako, Licht der Sonne</span> räumt Gegnerpacks automatisch.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-orange-500 font-black text-lg leading-none">5.</span>
                        <p><span className="text-purple-400 font-bold">Hinekora, Zorn des Todes</span> kann selbst Map-Bosse mit einem Treffer töten!</p>
                      </div>
                    </div>
                  </div>

                  {/* Skill-Links */}
                  <Card>
                    <SectionTitle icon={Zap} label="Wichtigste Skill-Links" color="text-yellow-400" />
                    <div className="space-y-3">
                      {[
                        {
                          name: 'Rollende Magmakugel',
                          color: 'text-red-400',
                          links: ['Elementare Ausweitung', 'Verbrennung (Combustion)'],
                          tip: 'Immer durch die Flammenwand schießen!'
                        },
                        {
                          name: 'Gerechtes Feuer',
                          color: 'text-orange-400',
                          links: ['Konzentrierte Wirkung', 'Elementare Konzentration'],
                          tip: 'Haupt-Schadensfähigkeit – einfach aktiviert lassen.'
                        },
                        {
                          name: 'Schildsturm',
                          color: 'text-blue-400',
                          links: ['Schnellerer Angriff', 'Fortitude'],
                          tip: 'Hauptbewegungsskill – NICHT durch Unterstützungen bremsen.'
                        },
                        {
                          name: 'Feuerfalle',
                          color: 'text-yellow-400',
                          links: ['Konzentrierte Wirkung', 'Kontrolliertere Zerstörung'],
                          tip: 'Für Einzelziele und Bosse. Pseudo 6-Link mit Elder-Helm!'
                        },
                      ].map((s, i) => (
                        <div key={i} className="bg-black/40 p-4 rounded-2xl border border-white/5">
                          <div className="flex justify-between items-start mb-2">
                            <span className={`font-black text-sm ${s.color}`}>{s.name}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {s.links.map((l, j) => (
                              <span key={j} className="bg-white/5 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10">{l}</span>
                            ))}
                          </div>
                          <p className="text-[11px] text-slate-500 italic">{s.tip}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Auren */}
                  <Card>
                    <SectionTitle icon={Shield} label="Auren & Herolde" color="text-blue-400" />
                    <div className="space-y-3">
                      {[
                        { n: 'Vitalität', d: 'Leben-Regeneration. NIEMALS mit Supports verlinken!', c: 'text-red-400' },
                        { n: 'Reinheit der Elemente', d: 'Immunität gegen Gefrierpunkt & Schock.', c: 'text-blue-400' },
                        { n: 'Herold des Donners', d: 'Akt 2+ · Schock-Effekt verstärkt RF-Schaden.', c: 'text-yellow-400' },
                      ].map((a, i) => (
                        <div key={i} className="bg-black/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                          <div>
                            <p className={`font-bold text-sm ${a.c}`}>{a.n}</p>
                            <p className="text-[11px] text-slate-500">{a.d}</p>
                          </div>
                        </div>
                      ))}
                      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3">
                        <p className="text-red-400 font-black text-[11px] uppercase tracking-widest flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Auren NIEMALS mit Unterstützungsgemmen verlinken!
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* ══ GEAR TAB ══ */}
              {activeTab === 'gear' && (
                <motion.div key="gear" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25 }} className="space-y-4">

                  {/* Tränke */}
                  <Card>
                    <SectionTitle icon={Beaker} label="Tränke-Setup" color="text-green-400" />
                    <div className="space-y-3">
                      {[
                        { n: 'Leben (Sofort)', d: 'Früh bei Nessa kaufen. Sofort-Heilung hat Priorität.', badge: 'Nessa', bc: 'text-slate-500' },
                        { n: 'Rubintrank', d: 'Feuer-Resistenz bei Nutzung. Pflicht für Gerechtes Feuer!', badge: 'PFLICHT', bc: 'text-orange-400 font-black' },
                        { n: 'Granittrank', d: 'Massiver Rüstungsboost. Gut für Maps.', badge: 'Optional', bc: 'text-slate-600' },
                      ].map((t, i) => (
                        <div key={i} className="bg-black/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                          <div className="flex-1 pr-2">
                            <p className="font-bold text-sm text-slate-200">{t.n}</p>
                            <p className="text-[11px] text-slate-500">{t.d}</p>
                          </div>
                          <span className={`text-[10px] uppercase shrink-0 ${t.bc}`}>{t.badge}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Frühes Gear */}
                  <Card>
                    <SectionTitle icon={Package} label="Frühe Unique-Items" color="text-orange-400" />
                    <div className="space-y-4">
                      {[
                        { n: 'Ziegenhorn (Zauberstab)', d: 'Akt 1 Händler · +Feuerschaden zu Zaubern. Auch weiß ist stark!', l: 'Akt 1' },
                        { n: 'Kikazaru (Ring)', d: 'Falls RF schwer zu halten ist & du nicht Pyre hast.', l: 'Drop' },
                        { n: 'Pyre (Ring)', d: 'Wenn du mehr Schaden statt Sustain willst.', l: 'Drop' },
                        { n: 'Mantel der Flamme', d: 'Beste Rüstung – bis Lvl 100 spielbar!', l: 'Lvl 18' },
                        { n: 'Replika: Atziris Schwäche', d: 'Extreme Regeneration. Sehr gut früh.', l: 'Lvl 16' },
                        { n: 'Xophs Herz (Amulett)', d: 'Massiv Leben & Feuerschaden.', l: 'Lvl 5' },
                        { n: 'Siebenmeilenstiefel', d: '50% Bewegungstempo – perfekt zum Leveln.', l: 'Lvl 1' },
                      ].map((u, i) => (
                        <div key={i} className="flex justify-between items-start">
                          <div className="flex-1 pr-4">
                            <p className="font-bold text-sm text-slate-200">{u.n}</p>
                            <p className="text-[10px] text-slate-500">{u.d}</p>
                          </div>
                          <span className="bg-orange-500/10 text-orange-500 text-[10px] font-black px-2 py-1 rounded-lg shrink-0">{u.l}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Gegnerfilter REGEX */}
                  <Card>
                    <h4 className="text-blue-400 font-black uppercase text-[10px] mb-3 tracking-widest">Händler-Filter (REGEX für Sockelfarben)</h4>
                    <div className="flex items-center space-x-3">
                      <div className="bg-black/60 p-4 rounded-2xl border border-white/5 flex-1 font-mono text-[8px] text-slate-400 break-all leading-tight">{regexString}</div>
                      <button onClick={handleCopy} className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg active:scale-90 transition-all shrink-0">
                        {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-3">Hilft beim Suchen nach Intelligenz-Items (z.B. Lapislazuli-Amulett) und Sockelfarben für Rollende Magmakugel.</p>
                  </Card>
                </motion.div>
              )}

              {/* ══ META/INFOS TAB ══ */}
              {activeTab === 'meta' && (
                <motion.div key="meta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }} className="space-y-4">

                  {/* Stärken */}
                  <div className="bg-green-500/5 border border-green-500/15 rounded-[2.5rem] p-6">
                    <SectionTitle icon={ThumbsUp} label="Stärken" color="text-green-400" />
                    <ul className="space-y-2">
                      {[
                        'Schnelle Map-Aufräumung – skaliert mit Entzündungs-Ausbreitung',
                        'Sehr robust: 90%+ Resistenz + Block-Cap + Erholung',
                        '5+ Ausdauerladungen → massive Schadensreduktion',
                        'Wenig Tasten nötig – entspannter Spielstil',
                        'Ignoriert Kälte- & Blitz-Resistenz via Feuer-Resistenz-Stacking',
                        'Günstig startbar – funktioniert schon mit seltenen Items',
                      ].map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13px] text-slate-300">
                          <span className="text-green-500 mt-0.5 shrink-0">✓</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Schwächen */}
                  <div className="bg-red-500/5 border border-red-500/15 rounded-[2.5rem] p-6">
                    <SectionTitle icon={ThumbsDown} label="Schwächen" color="text-red-400" />
                    <ul className="space-y-2">
                      {[
                        'Niedriger Einzelziel-Schaden (2–4M DPS durchschnittlich)',
                        'Akt 1 langsam wegen spätem RF-Start (Akt 2)',
                        'Begrenzte Skalierung – andere Builds skalieren besser',
                        'Schwacher Boss-Schaden – Uber-Bosse nicht empfohlen',
                      ].map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13px] text-slate-300">
                          <span className="text-red-500 mt-0.5 shrink-0">✗</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Mastery / Pflicht-Passivm */}
                  <Card>
                    <SectionTitle icon={Star} label="Pflicht-Meisterschaft (Passive)" color="text-yellow-400" />
                    <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-2xl p-4">
                      <p className="text-white font-bold text-sm mb-1">"1 Leben/Sek. pro ungedeckelter Feuer-Resistenz"</p>
                      <p className="text-[12px] text-slate-400 leading-relaxed">
                        Bei 125% Feuer-Resistenz = <span className="text-yellow-400 font-bold">125 Leben/Sek.</span> Regeneration.
                        Das ist die Basis, damit Gerechtes Feuer nicht tötet.
                        <span className="text-red-400 font-bold"> Minimum: 120% Feuer-Resi bevor RF aktiviert wird!</span>
                      </p>
                    </div>
                    <div className="mt-4 space-y-2">
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Tipps fürs Erreichen:</p>
                      {[
                        '„Feuer-Resistenz" auf jedes offene Suffix craften (Werkbank in Versteck)',
                        '2× Eisenring + 2× rote Gemme verkaufen = 2× Rubinring',
                        'ALT halten zum Anzeigen offener Affix-Slots (Erweiterte Anzeige aktivieren)',
                      ].map((t, i) => (
                        <div key={i} className="flex gap-2 text-[12px] text-slate-400">
                          <ChevronRight className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
                          <p>{t}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Tödlicher Aura-Fehler */}
                  <div className="bg-red-500/10 border-2 border-red-500/20 rounded-[2.5rem] p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                      <Skull className="w-20 h-20 text-red-500" />
                    </div>
                    <h3 className="text-red-500 font-black uppercase text-xs mb-3 tracking-widest flex items-center animate-pulse">
                      <AlertTriangle className="w-5 h-5 mr-2" /> Tödlicher Aura-Fehler
                    </h3>
                    <p className="text-[13px] text-slate-200 font-bold leading-relaxed relative z-10">
                      Verlinke <span className="underline decoration-red-500">NIEMALS</span> Auren (Vitalität, Reinheit der Elemente) mit Unterstützungsgemmen! Mana-Reservierung steigt auf 100%+ → Handlungsunfähig.
                    </p>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </main>

          {/* Nav Bar */}
          <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-3xl border-t border-white/5 pt-4 pb-10 px-6 flex justify-between items-center z-50">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center space-y-1 transition-all ${activeTab === tab.id ? 'text-orange-500 scale-110' : 'text-slate-600'}`}>
                <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]' : ''}`} />
                <span className="text-[9px] font-black uppercase tracking-tighter">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Reset Modal */}
          <AnimatePresence>
            {showReset && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                  className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl">
                  <h3 className="text-xl font-black text-white mb-2 uppercase italic tracking-tighter">Fortschritt löschen?</h3>
                  <p className="text-slate-400 text-sm mb-8 leading-relaxed">Alle gesetzten Häkchen werden unwiderruflich zurückgesetzt.</p>
                  <div className="flex space-x-3">
                    <button onClick={() => setShowReset(false)} className="flex-1 bg-white/5 text-white font-bold py-4 rounded-2xl active:bg-white/10 transition-colors">Abbrechen</button>
                    <button onClick={resetProgress} className="flex-1 bg-red-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-900/20 active:bg-red-700 transition-colors">Ja, Reset</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}
