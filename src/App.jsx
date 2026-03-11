import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  Flame, ListTodo, ChevronRight,
  Package, Gem, Copy, Check, Trash2,
  Beaker, Skull, AlertTriangle, FastForward,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- FIREBASE KONFIGURATION ---
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

let app, auth, db;
try {
  app  = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db   = getFirestore(app);
} catch (e) {
  // Firebase noch nicht konfiguriert – Offline-Modus
}

const APP_ID = 'poe-mirage-helper';

export default function App() {
  const [showSplash, setShowSplash]           = useState(true);
  const [activeTab, setActiveTab]             = useState('leveling');
  const [user, setUser]                       = useState(null);
  const [syncStatus, setSyncStatus]           = useState('offline');
  const [copied, setCopied]                   = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const regexString = '"-w-.-|b-b-b|g-g-r|g-r-g|r-g-g|.*(?=\\S*r)(?=\\S*g)(?=\\S*b)|r-r-[gb]|r-[gb]-r|[gb]-r-r|Runn|rint|me Sh|at\'s h|lap|Earn|(o |d |r)int"';

  // ── Splash-Screen Timer ──────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleCopyRegex = () => {
    navigator.clipboard.writeText(regexString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [acts, setActs] = useState([
    { id: 1, act: 'Akt 1', title: 'Start & Magmakugel', done: false, steps: [
      'MULE-TRICK: Hexe erstellen (Lvl 4). Kaufe Magmakugel, Frostspurt, Arkane Woge, Flammenwand &amp; Elementare Ausweitung.',
      '<span class="text-red-400 font-bold">SPERRE:</span> Magmakugel auf Hexe NICHT leveln (Lvl 1 lassen!).',
      'Händler: Kaufe zwei <span class="text-orange-400 font-bold italic">Ziegenhorn</span> (Goat\'s Horn).',
      'Rezept: Eisenring + rote Gemme = <span class="text-orange-400 font-bold underline">Rubinring</span> (2x!).'
    ]},
    { id: 2, act: 'Akt 2', title: 'Fidelitas & Kraityn', done: false, steps: [
      'Quest "Eindringlinge in Schwarz": Kaufe <span class="text-orange-400 font-bold">Gerechtes Feuer (RF)</span> bei Yeena.',
      'Banditen: <span class="text-green-400 font-black uppercase underline">Kraityn helfen</span> für +8% Lauftempo!',
      'Waffe: Wechsle auf Schild &amp; nutze <span class="text-white font-bold">Schildsturm</span>.',
      'Aura: <span class="text-yellow-400 font-bold">Herold des Donners</span> für Magmakugel-Boost.'
    ]},
    { id: 3, act: 'Akt 3', title: '120% Resi & Auren', done: false, steps: [
      'Werkbank: Ziel <span class="text-red-400 font-black underline">120% Feuer-Resi</span> für Mastery.',
      'Aura: Kaufe <span class="text-blue-400 font-bold">Reinheit der Elemente</span> (Immunität).',
      '<span class="text-red-500 font-black italic">ACHTUNG:</span> Auren NIEMALS mit Support-Gems verlinken!',
      'Labyrinth 1: Wähle <span class="text-orange-400 font-bold underline">Tasalio</span> (Häuptling).'
    ]}
  ]);

  const progress = Math.round((acts.filter(a => a.done).length / acts.length) * 100);

  // ── Firebase Auth ────────────────────────────────────────
  useEffect(() => {
    if (!auth) return;
    const init = async () => {
      try { await signInAnonymously(auth); }
      catch { setSyncStatus('error'); }
    };
    init();
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // ── Firestore Sync ───────────────────────────────────────
  useEffect(() => {
    if (!user || !db) return;
    const ref = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'progress');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const saved = snap.data().acts;
        if (saved) setActs(prev => prev.map(a => ({ ...a, done: saved.find(s => s.id === a.id)?.done || false })));
      }
      setSyncStatus('synced');
    }, () => setSyncStatus('error'));
    return () => unsub();
  }, [user]);

  const toggleAct = (id) => {
    const next = acts.map(a => a.id === id ? { ...a, done: !a.done } : a);
    setActs(next);
    if (user && db) {
      setSyncStatus('loading');
      setDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'progress'), {
        acts: next.map(a => ({ id: a.id, done: a.done })), lastUpdated: Date.now()
      });
    }
  };

  const resetProgress = () => {
    const next = acts.map(a => ({ ...a, done: false }));
    setActs(next);
    if (user && db) setDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'progress'), {
      acts: next.map(a => ({ id: a.id, done: a.done })), lastUpdated: Date.now()
    });
    setShowResetConfirm(false);
  };

  return (
    <>
      {/* ══════════════════ SPLASH SCREEN ══════════════════ */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="fixed inset-0 z-[200] bg-[#050505] flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="flex flex-col items-center"
            >
              {/* Logo mit Glow-Puls */}
              <div className="w-24 h-24 bg-gradient-to-tr from-orange-600 to-red-700 rounded-3xl flex items-center justify-center shadow-[0_0_60px_rgba(234,88,12,0.5)] mb-8 relative">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="absolute inset-0 bg-orange-500 rounded-3xl blur-xl"
                />
                <Flame className="w-12 h-12 text-white relative z-10" />
              </div>

              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                Mirage
              </h1>
              <p className="text-orange-500 text-[10px] font-bold tracking-[0.3em] uppercase opacity-80">
                System Loading
              </p>

              {/* Ladebalken */}
              <div className="mt-12 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.2, ease: 'easeInOut' }}
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════ HAUPT APP ══════════════════════ */}
      {!showSplash && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="min-h-screen bg-black text-slate-200 font-sans pb-32 overflow-x-hidden"
        >
          {/* iOS Style Header */}
          <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 pt-14 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-orange-600 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-900/20">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">Mirage</h1>
                  <div className="flex items-center space-x-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      syncStatus === 'synced'  ? 'bg-green-500' :
                      syncStatus === 'loading' ? 'bg-orange-500 animate-pulse' :
                      syncStatus === 'error'   ? 'bg-red-500' : 'bg-slate-600'
                    }`} />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{syncStatus}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="p-2 bg-white/5 rounded-full text-slate-500 active:text-red-500 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="relative h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="absolute h-full bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
              />
            </div>
          </header>

          <main className="p-4">
            <AnimatePresence mode="wait">

              {/* ── Guide Tab ── */}
              {activeTab === 'leveling' && (
                <motion.div
                  key="guide"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  {acts.map((act) => (
                    <div
                      key={act.id}
                      className={`bg-white/[0.03] border rounded-[2.5rem] p-6 transition-all active:scale-[0.98] ${act.done ? 'border-green-500/20 opacity-50' : 'border-white/10'}`}
                    >
                      <div onClick={() => toggleAct(act.id)} className="flex items-center justify-between cursor-pointer">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{act.act}</span>
                          <h4 className="text-lg font-bold text-white leading-tight">{act.title}</h4>
                        </div>
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${act.done ? 'bg-green-500 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-white/10'}`}>
                          {act.done && <Check className="w-6 h-6 text-white" />}
                        </div>
                      </div>
                      {!act.done && (
                        <div className="mt-5 space-y-4 pt-4 border-t border-white/5">
                          {act.steps.map((step, idx) => (
                            <div key={idx} className="flex items-start space-x-3 text-[13px] text-slate-400 leading-relaxed">
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

              {/* ── Details Tab ── */}
              {activeTab === 'setups' && (
                <motion.div
                  key="setups"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="bg-orange-500/5 border border-orange-500/10 rounded-[2.5rem] p-6">
                    <h3 className="text-orange-500 font-black uppercase text-xs mb-4 tracking-widest flex items-center">
                      <FastForward className="w-4 h-4 mr-2" /> Kraityn-Option (Speed)
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed italic border-l-2 border-orange-500/30 pl-4">
                      "Hilf Kraityn in Akt 2 für <span className="text-white font-bold">8% Lauftempo</span>. Das ist der ultimative Tipp für schnelleres Leveln auf der Konsole!"
                    </p>
                  </div>

                  <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center">
                      <Beaker className="w-5 h-5 mr-3 text-green-500" /> Tränke-Setup
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center font-bold text-xs">
                        <span className="text-red-400">Leben (Instant)</span>
                        <span className="text-[10px] uppercase text-slate-600">Nessa</span>
                      </div>
                      <div className="bg-black/40 p-4 rounded-2xl border border-orange-500/20 flex justify-between items-center font-bold text-xs">
                        <span className="text-orange-400 underline underline-offset-4 uppercase">Rubin (Charge on Hit)</span>
                        <span className="text-[10px] uppercase text-orange-900 font-black tracking-tighter">Pflicht</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Lexikon Tab ── */}
              {activeTab === 'tips' && (
                <motion.div
                  key="tips"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6 pb-10"
                >
                  <div className="bg-red-500/10 border-2 border-red-500/20 rounded-[2.5rem] p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                      <Skull className="w-20 h-20 text-red-500" />
                    </div>
                    <h3 className="text-red-500 font-black uppercase text-xs mb-3 tracking-widest flex items-center animate-pulse">
                      <AlertTriangle className="w-5 h-5 mr-2" /> Tödlicher Aura-Fehler
                    </h3>
                    <p className="text-[13px] text-slate-200 font-bold leading-relaxed relative z-10">
                      Verlinke Auren (Vitalität, Reinheit der Elemente){' '}
                      <span className="underline decoration-red-500 uppercase tracking-tighter">NIEMALS</span>{' '}
                      mit Support-Gems! Deine Mana-Reservierung steigt sonst über 100% und macht dich handlungsunfähig.
                    </p>
                  </div>

                  <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6">
                    <h3 className="text-orange-400 font-black uppercase text-xs mb-4 tracking-widest flex items-center border-b border-white/5 pb-2">
                      <Package className="w-5 h-5 mr-2" /> Top Leveling Uniques
                    </h3>
                    <div className="space-y-4">
                      {[
                        { n: 'Mantel der Flamme',        d: 'Beste Rüstung (Lvl 18). Bis Lvl 100 spielbar.',   l: '18' },
                        { n: 'Replika: Atziris Schwäche', d: 'Extreme Regeneration (Lvl 16).',                  l: '16' },
                        { n: 'Xophs Herz',               d: 'Massiv Leben & Feuerschaden.',                    l: '5'  },
                        { n: 'Siebenmeilenstiefel',       d: '50% Movement Speed (Zoomer).',                   l: '1'  },
                      ].map((u, i) => (
                        <div key={i} className="flex justify-between items-center group">
                          <div className="flex-1 pr-4">
                            <p className="font-bold text-slate-200 group-active:text-orange-400 transition-colors">{u.n}</p>
                            <p className="text-[10px] text-slate-500">{u.d}</p>
                          </div>
                          <span className="bg-orange-500/10 text-orange-500 text-[10px] font-black px-2 py-1 rounded-lg shrink-0">LVL {u.l}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6">
                    <h4 className="text-blue-400 font-black uppercase text-[10px] mb-3 tracking-widest">Händler Filter (REGEX)</h4>
                    <div className="flex items-center space-x-3">
                      <div className="bg-black/60 p-4 rounded-2xl border border-white/5 flex-1 font-mono text-[8px] text-slate-400 break-all leading-tight">
                        {regexString}
                      </div>
                      <button
                        onClick={handleCopyRegex}
                        className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg active:scale-90 transition-all shrink-0"
                      >
                        {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* iOS Navigation Bar */}
          <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-3xl border-t border-white/5 pt-4 pb-10 px-8 flex justify-between items-center z-50">
            {[
              { id: 'leveling', icon: ListTodo,       label: 'Guide'   },
              { id: 'setups',   icon: Gem,             label: 'Details' },
              { id: 'tips',     icon: LayoutDashboard, label: 'Lexikon' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center space-y-1 transition-all ${activeTab === tab.id ? 'text-orange-500 scale-110' : 'text-slate-600'}`}
              >
                <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]' : ''}`} />
                <span className="text-[9px] font-black uppercase tracking-tighter">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Reset Confirmation Modal */}
          <AnimatePresence>
            {showResetConfirm && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                  className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl"
                >
                  <h3 className="text-xl font-black text-white mb-2 uppercase italic tracking-tighter">Fortschritt löschen?</h3>
                  <p className="text-slate-400 text-sm mb-8 leading-relaxed">Alle gesetzten Häkchen in den Akten werden unwiderruflich auf Null gesetzt.</p>
                  <div className="flex space-x-3">
                    <button onClick={() => setShowResetConfirm(false)} className="flex-1 bg-white/5 text-white font-bold py-4 rounded-2xl active:bg-white/10 transition-colors">Abbrechen</button>
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
