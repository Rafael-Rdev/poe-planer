import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import {
  Flame, ListTodo, ChevronRight, Package, Gem,
  Copy, Check, Trash2, Beaker, Skull, AlertTriangle,
  FastForward, LayoutDashboard, Swords, Shield,
  Star, ThumbsUp, ThumbsDown, Zap, Map
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

// ── Shared Components ─────────────────────────────────────
const Card = ({ children, className = '' }) => (
  <div className={`bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 ${className}`}>{children}</div>
);
const SectionTitle = ({ icon: Icon, label, color = 'text-orange-400' }) => (
  <h3 className={`${color} font-black uppercase text-xs mb-4 tracking-widest flex items-center gap-2 border-b border-white/5 pb-2`}>
    <Icon className="w-4 h-4" />{label}
  </h3>
);
const GemLink = ({ name, supports = [], tip, nameColor = 'text-orange-300' }) => (
  <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
    <p className={`font-black text-sm mb-2 ${nameColor}`}>{name}</p>
    {supports.length > 0 && (
      <div className="flex flex-wrap gap-1.5 mb-2">
        {supports.map((s, i) => (
          <span key={i} className="bg-white/5 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
            <span className="text-slate-600">└</span>{s}
          </span>
        ))}
      </div>
    )}
    {tip && <p className="text-[11px] text-slate-500 italic">{tip}</p>}
  </div>
);

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab,  setActiveTab]  = useState('guide');
  const [user,       setUser]       = useState(null);
  const [syncStatus, setSyncStatus] = useState('offline');
  const [copied,     setCopied]     = useState(false);
  const [showReset,  setShowReset]  = useState(false);

  const regexString = '"-w-.-|b-b-b|g-g-r|g-r-g|r-g-g|.*(?=\\S*r)(?=\\S*g)(?=\\S*b)|r-r-[gb]|r-[gb]-r|[gb]-r-r|Runn|rint|me Sh|at\'s h|lap|Earn|(o |d |r)int"';

  useEffect(() => { const t = setTimeout(() => setShowSplash(false), 2500); return () => clearTimeout(t); }, []);
  const handleCopy = () => { navigator.clipboard.writeText(regexString); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const [acts, setActs] = useState([
    { id: 1, act: 'Akt 1', title: 'Hexen-Mule & Rollende Magmakugel', done: false, steps: [
      '<span class="text-yellow-400 font-bold">MULE-TRICK:</span> Neue Hexe erstellen (Lvl 4), Quests "Breaking som..." & "Mercy Mission" abschließen. Dann kaufen: <span class="text-orange-300 font-bold">Rollende Magmakugel, Arkanewoge, Flammenwand, Elementare Ausweitung, Frostblinken</span>.',
      '<span class="text-red-400 font-bold">SPERRE:</span> Rollende Magmakugel auf Hexe NICHT leveln – Lvl 1 lassen!',
      'Händler aktiv prüfen: <span class="text-orange-400 font-bold italic">Ziegenhorn-Zauberstäbe</span> kaufen (weißer reicht – impliziter Feuerschaden verdoppelt deinen Schaden!).',
      'Rezept 2×: Eisenring + rote Gemme im Händler-Fenster ablegen → Tausch abwarten → <span class="text-orange-400 font-bold underline">Rubinring</span> erhalten. Zweimal machen!',
      'Blaue Items unidentifiziert verkaufen → <span class="text-blue-400 font-bold">Transmutationskugeln</span> sammeln (mind. 4 bis Akt 2 für Feuer-Resi-Craften).',
      'Rollende Magmakugel immer <span class="text-white font-bold">durch die Flammenwand schießen</span> für massiven Schadensbonus.',
    ]},
    { id: 2, act: 'Akt 2', title: 'Gerechtes Feuer aktivieren (Ziel: 120% Resi)', done: false, steps: [
      'Quest "Eindringlinge in Schwarz" abschließen → <span class="text-orange-400 font-bold">Gerechtes Feuer</span> bei Yeena kaufen.',
      'Banditen: <span class="text-green-400 font-black uppercase underline">Kraityn helfen</span> → +8% Lauftempo. (Alternative: Alle töten = 1 Skillpunkt, gut für Einsteiger.)',
      'Auf jedes offene Suffix <span class="text-red-400 font-bold">"Feuer-Resistenz"</span> craften (Werkbank, 1 Transmute). Ziel: 120%+!',
      'Mastery aktivieren: <span class="text-yellow-400 font-bold">"1 Leben/Sek. pro ungedeckelter Feuer-Widerstand"</span> – 125% Resi = 125 Leben/Sek. Regeneration. Pflicht!',
      'Waffe tauschen: Auf <span class="text-white font-bold">Schild + Schildsturm</span> wechseln.',
      'Optional: <span class="text-yellow-400 font-bold">Herold des Donners</span> kaufen → Schock verstärkt RF-Schaden.',
      'Optional: <span class="text-purple-400 font-bold">Blutdurst</span> kaufen → Rasereisladungen bei Kill (+4% Schaden/Ladung).',
    ]},
    { id: 3, act: 'Akt 3', title: 'Bibliothek & Auren-Pflicht', done: false, steps: [
      'Aufstieg 1 (Labor): <span class="text-orange-400 font-bold underline">Tasalio, Stille des Wassers</span> wählen (Häuptling).',
      'Nach Pietys erstem Tod: <span class="text-blue-400 font-bold">Reinheit der Elemente</span> kaufen → Immunität gegen Gefrierpunkt & Schock.',
      '<span class="text-red-500 font-black italic">PFLICHT-REGEL:</span> Auren (Vitalität, Reinheit der Elemente) NIEMALS mit Unterstützungsgemmen verlinken!',
      'Bibliothek aufsuchen (nach Piety 2. Tod – Pflicht für Unterstützungsgemmen!). Kaufen: <span class="text-yellow-400 font-bold">Feuerfalle, Effizienz, Elementarer Fokus, Schneller Schadenseffekt, Fallenschaden, Feuerschaden</span>. Alternative: Armagedon-Siegel statt Rollender Magmakugel.',
      'Feuerfalle sofort in <span class="text-white font-bold">Waffentausch legen</span> mit grüner Sockelfarbe → auf der Seite leveln lassen!',
      'Flammbarkeit + Lebensabgriff verlinken → Fluch kostet Leben statt Mana. Dann Flammenwand entfernen.',
      '4-Link gamble: Helm oder Handschuhe (<span class="text-blue-400 font-bold">Rüstung+Energieschild</span>) → Ziel: <span class="text-white font-bold">3 Blau + 1 Rot</span> für Gerechtes Feuer.',
    ]},
    { id: 4, act: 'Akt 4–5', title: 'Feuerfalle & Golem', done: false, steps: [
      'Erste Akt-4-Quest abschließen → <span class="text-green-400 font-bold">Steingolem</span> als Begleiter wählen (+Rüstung & Leben-Regen).',
      'Ca. Lvl 40: Rollende Magmakugel durch <span class="text-yellow-400 font-bold">Feuerfalle</span> ersetzen. 4-Link: <span class="text-white font-bold">Rüstung+Ausweichung (2G/1B/1R)</span>. Mit Ramako später: 3G/1R.',
      'Falls zu wenig Geschicklichkeit für Feuerfalle: Türkis-Amulett kaufen oder +30-Geschicklichkeit-Knoten bei Groll aktivieren.',
      'Quest nach Daresso & Kaom: <span class="text-white font-bold">Vergrößerter Wirkungsbereich</span> holen → Ersetzt Effizienz in RF.',
      'Aufstieg 2 (Grausames Labor): <span class="text-purple-400 font-bold">Hinekora, Zorn des Todes</span> (schnelle Map-Aufräumung) oder <span class="text-orange-400 font-bold">Ramako, Licht der Sonne</span> (höherer Schaden).',
      'Wenn Ramako: Verbrennung → <span class="text-green-400 font-bold">Schneller Schadenseffekt</span>. Fluch → <span class="text-yellow-400 font-bold">Bestrafung</span>.',
      'Wenn Hinekora: Obige Änderungen nach Gnadenlosem Labor (Lvl 65).',
    ]},
    { id: 5, act: 'Lvl 61–90', title: 'Maps starten & Pantheon', done: false, steps: [
      'Nach Kampagnenende: <span class="text-blue-400 font-bold">/Passives</span> eingeben und prüfen ob alle Skillpunkte abgeholt wurden!',
      'Gamble auf Handschuhe/Helm/Boots/Body für Upgrades. <span class="text-red-400 font-bold">NIEMALS</span> Waffe/Schmuck gamblen – Goldverschwendung!',
      'Fokus bei Items: <span class="text-orange-400 font-bold">Hohes Leben + Feuer-Resi, Chaos-Resi, Lebens-Regenerationsrate</span> (Multiplikator auf flattes Leben-Regen!).',
      '<span class="text-yellow-400 font-bold">Ausdauernder Schrei</span> nutzen → Ausdauerladungen generieren. Später passiv per Amulett-Anoint.',
      'Aufstieg 3 (Uber-Labor): Nach Abschluss Göttliches Gefäß kaufen. Atlas: <span class="text-blue-400 font-bold">"Meeresgott"</span> suchen → Map mit "100% Chance zu vermeiden, eingefroren zu stehen" mit Göttlichem Gefäß ins Gerät legen & abschließen!',
      'Aura-Wechsel nach Uber-Labor: <span class="text-purple-400 font-bold">Skitterbot + Ungebundene Qualen · Magieschild · Fleisch und Stein (Sandmodus) · Reinheit des Feuers</span>.',
      'Jetzt: <span class="text-orange-400 font-bold">Unsterbliches Fleisch</span> Gürtel + <span class="text-orange-400 font-bold">Aufstieg des Phönix</span> kaufen → 90%+ maximale Resistenzen!',
    ]},
    { id: 6, act: 'Lvl 90+', title: 'Block-Setup & Entzündungs-Ausbreitung', done: false, steps: [
      '<span class="text-purple-400 font-bold">Schaper-Schild</span> finden/kaufen (bevorzugt Rüstungsschild: Zinnen-, Ezomlythen- oder Grober Turmschild).',
      'Schild craften bis: <span class="text-green-400 font-bold">"3-5% Leben bei Block wiederherstellen"</span> – mit Unberührten Lebensfossilien oder Ernte-Leben-Neuberechnung.',
      'Passivbaum: Block-Knoten nehmen + Schlüsselstein <span class="text-yellow-400 font-bold">"Abschreckende Schläge"</span> aktivieren → 75% Block & Zauberblock!',
      '<span class="text-orange-400 font-bold">Entzündungs-Ausbreitung</span> auf Handschuhe via Exarch-Glut rollen (1/50 Chance) → Hinekora-Explosion kann Entzünden = massiver Clear!',
      '<span class="text-blue-400 font-bold">6 Leben-Meisterschaften</span> alle auf einmal nehmen – viele geben allein keinen Bonus, zusammen machen sie deinen Charakter extrem tanky (7k+ Leben möglich).',
      '<span class="text-orange-400 font-bold">Mantel der Flamme</span> kaufen → hilft bei großen physischen Treffern.',
      'Hinweis: Golems sterben in gelben Maps häufig – nicht unnötig Gold investieren.',
    ]},
    { id: 7, act: 'Lvl 95-100', title: 'Min/Maxing & Cluster-Juwelen', done: false, steps: [
      '<span class="text-orange-400 font-bold">Lvl 95+ (Bösartigkeit):</span> Nutze ein kleines Cluster-Juwel (Manabereich/Mana-Reservierung) um <span class="text-purple-400 font-bold">Bösartigkeit (Malevolence)</span> zu deiner Aura-Rotation hinzuzufügen.',
      '<span class="text-yellow-400 font-bold">Lvl 100 (25% Effekt Cluster):</span> Wechsle auf ein massives passives Cluster-Setup mit "25% erhöhter Effekt", um Rüstung, Leben und Schaden maximal zu optimieren (siehe PoB).',
      '<span class="text-blue-400 font-bold">Uhrwerk-Ring (Cogwork Ring):</span> Das absolute Endgame-Ziel für Schmuck, erlaubt extreme Suffix-Kombinationen (Attribut- und Resi-Stapeln).',
      'Erinnerung: Ubers sind mit dem Build weiterhin sehr schwer. Konzentriere dich auf schnelles Map-Clearing und starke Expeditionen/Rituale.'
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
    { id: 'guide',  icon: ListTodo,       label: 'Guide'  },
    { id: 'skills', icon: Zap,            label: 'Skills' },
    { id: 'gear',   icon: Package,        label: 'Gear'   },
    { id: 'meta',   icon: Star,           label: 'Infos'  },
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

      {/* ══ MAIN ══ */}
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

              {/* ══ GUIDE ══ */}
              {activeTab === 'guide' && (
                <motion.div key="guide" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-4">
                  {acts.map(act => (
                    <div key={act.id} className={`bg-white/[0.03] border rounded-[2.5rem] p-6 transition-all active:scale-[0.98] ${act.done ? 'border-green-500/20 opacity-50' : 'border-white/10'}`}>
                      <div onClick={() => toggleAct(act.id)} className="flex items-center justify-between cursor-pointer">
                        <div className="space-y-1 flex-1 pr-3">
                          <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{act.act}</span>
                          <h4 className="text-base font-bold text-white leading-tight">{act.title}</h4>
                        </div>
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${act.done ? 'bg-green-500 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-white/10'}`}>
                          {act.done && <Check className="w-6 h-6 text-white" />}
                        </div>
                      </div>
                      {!act.done && (
                        <div className="mt-5 space-y-3.5 pt-4 border-t border-white/5">
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

              {/* ══ SKILLS ══ */}
              {activeTab === 'skills' && (
                <motion.div key="skills" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }} className="space-y-4">

                  {/* Spielweise */}
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-[2.5rem] p-6">
                    <SectionTitle icon={FastForward} label="Spielweise" color="text-orange-400" />
                    <div className="space-y-2.5 text-[13px] text-slate-300 leading-relaxed">
                      {[
                        ['1.', 'Gerechtes Feuer', 'aktivieren. Mit', 'Schildsturm', 'durch Gegnerpacks stürmen.'],
                        ['2.', 'Hinekora, Zorn des Todes', 'zündet die Explosion – kann Map-Bosse 1-Hit töten!'],
                        ['3.', 'Bei blauen Packs:', 'Bestrafung', 'werfen +', 'Feuerfalle', 'für Einzelziel-Schaden.'],
                        ['4.', 'Frostblinken', 'zur Neupositionierung. Später alles einfach austanken.'],
                        ['5.', 'Kurz stehen bleiben →', 'Ramako, Licht der Sonne', 'räumt Packs automatisch.'],
                      ].map(([num, ...parts], i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="text-orange-500 font-black text-base leading-none shrink-0">{num}</span>
                          <p>{parts.map((p, j) => j % 2 === 0 ? p : <span key={j} className="text-white font-bold">{p}</span>)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lvl 1-20 Gems */}
                  <Card>
                    <SectionTitle icon={Zap} label="Lvl 1–20 · Mule-Gems" color="text-yellow-400" />
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 mb-3">
                      <p className="text-red-400 text-[11px] font-bold">⚠ Rollende Magmakugel auf Hexe NICHT leveln! Lvl 1 lassen!</p>
                    </div>
                    <div className="space-y-2">
                      <GemLink name="Rollende Magmakugel" supports={['Arkanewoge']} tip="Primärer Angriff bis RF" nameColor="text-red-400" />
                      <GemLink name="Flammenwand" supports={['Elementare Ausweitung']} tip="Immer vor dir aufstellen – Magmakugel hindurchschießen!" nameColor="text-orange-400" />
                      <GemLink name="Heilige Flammenwächter (optional)" supports={['Phantasmenbeschwörung']} tip="Alternative wenn du Rollende Magmakugel nicht magst." nameColor="text-yellow-400" />
                      <GemLink name="Frostblinken" supports={[]} tip="Bewegungsskill. Lvl 1 halten bevor du Maps machst!" nameColor="text-blue-400" />
                    </div>
                  </Card>

                  {/* Schaden Lvl 20+ */}
                  <Card>
                    <SectionTitle icon={Swords} label="Lvl 20+ · Schadens-Skills" color="text-red-400" />
                    <div className="space-y-2">
                      <GemLink name="Rollende Magmakugel" supports={['Verbrennung', 'Elementare Ausweitung']} nameColor="text-red-400" />
                      <GemLink name="Flammenwand" supports={[]} tip="Weiterhin nutzen bis Flammbarkeit + Lebensabgriff verfügbar." nameColor="text-orange-400" />
                      <GemLink name="Feuerfalle (ab Lvl 40)" supports={['Effizienz', 'Elementarer Fokus', 'Schneller Schadenseffekt', 'Fallenschaden']} tip="Für Einzelziele & Bosse. Pseudo 6-Link mit Elder-Helm!" nameColor="text-yellow-400" />
                      <GemLink name="Gerechtes Feuer (ab Akt 2)" supports={['Vergrößerter Wirkungsbereich', 'Elementarer Fokus', 'Effizienz']} tip="Haupt-Schaden. Immer aktiv halten." nameColor="text-orange-500" />
                    </div>
                    <div className="mt-3 bg-yellow-500/5 border border-yellow-500/15 rounded-2xl p-3">
                      <p className="text-yellow-400 text-[11px] font-bold">💡 Alle Gemmen auf Max leveln – AUSSER Lebensabgriff & Frostblinken (Lvl 1 halten)!</p>
                    </div>
                  </Card>

                  {/* Auren */}
                  <Card>
                    <SectionTitle icon={Shield} label="Auren, Herolde & Flüche" color="text-blue-400" />
                    <div className="space-y-2">
                      <GemLink name="Vitalität" supports={[]} tip="NIEMALS mit Supports verlinken! Gibt Leben-Regen." nameColor="text-red-400" />
                      <GemLink name="Reinheit der Elemente" supports={[]} tip="Ab Akt 3. Immunität gegen Gefrierpunkt & Schock." nameColor="text-blue-400" />
                      <GemLink name="Herold des Donners" supports={[]} tip="Ab Akt 2. Schock verstärkt RF-Schaden." nameColor="text-yellow-400" />
                      <GemLink name="Flammbarkeit (Fluch)" supports={['Lebensabgriff']} tip="Lebensabgriff = Fluch kostet Leben statt Mana!" nameColor="text-orange-300" />
                    </div>
                    <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-3">
                      <p className="text-red-400 text-[11px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Auren NIEMALS mit Unterstützungsgemmen verlinken!
                      </p>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* ══ GEAR ══ */}
              {activeTab === 'gear' && (
                <motion.div key="gear" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25 }} className="space-y-4">

                  <Card>
                    <SectionTitle icon={Package} label="Günstige Uniques (Kampagne)" color="text-orange-400" />
                    <div className="space-y-3">
                      {[
                        { n: 'Ascheschreier',            d: 'Bestes Akt-1-Waffe! Impliziter Feuerschaden.', l: 'Lvl 6',  hot: true },
                        { n: 'Ziegenhorn',               d: 'Händler Akt 1. +Feuerschaden implizit.',        l: 'Akt 1', hot: true },
                        { n: 'Kikazaru',                 d: 'Wenn RF schwer zu halten ist.',                l: 'Lvl 20' },
                        { n: 'Pyre',                     d: 'Mehr Schaden statt Sustain.',                  l: 'Lvl 11' },
                        { n: 'Goldfelge',                d: 'Großartige Resistenzen früh.',                 l: 'Lvl 1'  },
                        { n: 'Frühlingsblatt',           d: 'Gut für frühe Regen.',                         l: 'Lvl 7'  },
                        { n: 'Wanderlust',               d: 'Gute Boots: Movement Speed & Gefrierimmunität.',l: 'Lvl 1'  },
                        { n: 'Tausend Bänder',           d: 'Flacher Ele-Schaden, gut in Akt 1.',          l: 'Lvl 1'  },
                        { n: 'Perandus-Siegel',          d: 'Gute Attribute & Feuer-Resistenz.',            l: 'Lvl 16' },
                        { n: 'Siebenmeilenstiefel',      d: 'Zoomer-Boots! 50% Bewegungstempo.',            l: 'Lvl 1'  },
                        { n: 'Mantel der Flamme',        d: 'Bis Lvl 100 spielbar! Beste Rüstung.',        l: 'Lvl 18', hot: true },
                        { n: 'Replika: Atziris Schwäche',d: 'Extreme Regeneration.',                       l: 'Lvl 16' },
                        { n: 'Replika: Karui-Wächter',   d: 'Großartiger Schaden + AoE. Transmutes sammeln!',l: 'Lvl 5' },
                        { n: 'Xophs Herz',               d: 'Massiv Leben & Feuerschaden.',                l: 'Lvl 5'  },
                        { n: 'Lochtonials Pflege',       d: 'Gute Handschuhe für Wirkgeschwindigkeit.',    l: 'Lvl 1'  },
                      ].map((u, i) => (
                        <div key={i} className="flex justify-between items-start">
                          <div className="flex-1 pr-4">
                            <p className={`font-bold text-sm ${u.hot ? 'text-orange-300' : 'text-slate-200'}`}>{u.n} {u.hot && '🔥'}</p>
                            <p className="text-[10px] text-slate-500">{u.d}</p>
                          </div>
                          <span className="bg-orange-500/10 text-orange-500 text-[10px] font-black px-2 py-1 rounded-lg shrink-0">{u.l}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <SectionTitle icon={Package} label="Späteres Gear (Maps / Endgame)" color="text-purple-400" />
                    <div className="space-y-3">
                      {[
                        { n: 'Aufstieg des Phönix',     d: 'Einfachster Weg zu 90% Max-Resi. Exarch ist ein Witz!', l: 'Lvl 65', hot: true },
                        { n: 'Granitbrecher',           d: 'Falls gute Regen – für physische Schadensreduktion.', l: 'Lvl 67' },
                        { n: 'Unsterbliches Fleisch',   d: 'Bester Gürtel für Regen zum Preis.',                  l: 'Lvl 50', hot: true },
                        { n: 'Granitgestühl',           d: 'Gotta go Fast!',                                       l: 'Lvl 18' },
                        { n: 'Annihilations Vorgehen',  d: 'Lieblingsboots – Website-FAQ beachten.',               l: 'Lvl 95' },
                        { n: 'Todesstöße',              d: 'Sehr gut für Adrenalin für Maps.',                     l: 'Lvl 30' },
                        { n: 'Schicksalstrotz',         d: 'Teuer aber tanky – Verlust an Schaden.',              l: 'Lvl 49' },
                        { n: 'Agnostiker',              d: 'Für extreme Regeneration, aber Mana-Probleme.',        l: 'Lvl 68' },
                        { n: 'Blutmagie-Amulett',       d: 'Händler Akt 2. +1 zu allen Fertigkeitsgemmen.',        l: 'Akt 2', hot: true },
                        { n: 'Wut des Kriegsherrn',     d: 'Händler Akt 2. +1 zu allen Fertigkeitsgemmen.',        l: 'Akt 2', hot: true },
                        { n: 'Stahlring',               d: 'Händler Akt 2. +1 zu allen Fertigkeitsgemmen.',        l: 'Akt 2', hot: true },
                        { n: 'Meginords Gürtel',        d: 'Stärke, Leben, Kälte-Resi.',                          l: 'Lvl 8'  },
                        { n: 'Goldenes Gefäß',          d: 'Guter Flask für Movement Speed.',                     l: 'Lvl 12' },
                        { n: 'Karui-Schild',            d: 'Händler Akt 1. +1 zu allen Fertigkeitsgemmen.',        l: 'Akt 1', hot: true },
                      ].map((u, i) => (
                        <div key={i} className="flex justify-between items-start">
                          <div className="flex-1 pr-4">
                            <p className={`font-bold text-sm ${u.hot ? 'text-purple-300' : 'text-slate-200'}`}>{u.n} {u.hot && '⭐'}</p>
                            <p className="text-[10px] text-slate-500">{u.d}</p>
                          </div>
                          <span className="bg-purple-500/10 text-purple-400 text-[10px] font-black px-2 py-1 rounded-lg shrink-0">{u.l}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <SectionTitle icon={Star} label="Ziele für Seltene Ausrüstung (Rares)" color="text-yellow-400" />
                    <div className="space-y-3">
                      {[
                        { n: 'Quarz-Zepter (Quartz Sceptre)', d: 'Beste Basis für +1/2 auf alle/Feuer Fertigkeitsgemmen, Feuerschaden & DoT-Multiplikator.', hot: true },
                        { n: 'Rubinring (Ruby Ring)', d: 'Deine Hauptquelle für Leben, Feuer-Resistenz, Chaos-Resistenz und evtl. Geschicklichkeit.' },
                        { n: 'Barbute-Helm (Barbute Helmet)', d: 'Rüstung-Basis. Ziel: Ältesten-Einfluss (Elder) für "Unterstützt durch Brennschaden/Vergrößerter Wirkungsbereich" -> Pseudo 6-Link für deine Feuerfalle!', hot: true },
                        { n: 'Verstärkter Turmschild (Reinforced Tower Shield)', d: 'Rüstungs-Basis für hohen Basisblock. Ernte-Leben-Craften bis "Leben bei Block wiederherstellen".' },
                        { n: 'Bronze-Panzerhandschuhe (Bronze Gauntlets)', d: 'Rüstungs-Basis. Fokus auf Leben, Regeneration und Feuer/Chaos-Widerstand.' },
                        { n: 'Plattierte Beinschienen (Plated Greaves)', d: 'Rüstungs-Stiefel mit Bewegungsgeschwindigkeit, Leben und Resistenzen.' },
                        { n: 'Lapislazuli-Amulett (Lapis Amulet)', d: 'Gibt dir nötige Intelligenz für Gemmen. Roll hier auf +1 Level für Feuer-Gemmen und Schaden über Zeit.' }
                      ].map((u, i) => (
                        <div key={i} className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className={`font-bold text-sm ${u.hot ? 'text-yellow-300' : 'text-slate-200'}`}>{u.n} {u.hot && '⭐'}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{u.d}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <SectionTitle icon={Beaker} label="Tränke-Setup" color="text-green-400" />
                    <div className="space-y-2">
                      {[
                        { n: 'Leben (Sofort)',      d: 'Früh bei Nessa kaufen.',           b: 'Nessa',   bc: 'text-slate-500' },
                        { n: 'Rubintrank',          d: 'Feuer-Resi bei Nutzung. Pflicht!', b: 'PFLICHT', bc: 'text-orange-400 font-black' },
                        { n: 'Granittrank',         d: 'Massiver Rüstungsboost für Maps.', b: 'Optional', bc: 'text-slate-600' },
                      ].map((t, i) => (
                        <div key={i} className="bg-black/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-sm text-slate-200">{t.n}</p>
                            <p className="text-[11px] text-slate-500">{t.d}</p>
                          </div>
                          <span className={`text-[10px] uppercase ${t.bc}`}>{t.b}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <h4 className="text-blue-400 font-black uppercase text-[10px] mb-2 tracking-widest">Händler-Filter REGEX</h4>
                    <p className="text-[10px] text-slate-600 mb-3">Im Suchfeld bei Händlern eingeben – hebt INT-Items, blaue Links & nützliche 4-Links hervor.</p>
                    <div className="flex items-center space-x-3">
                      <div className="bg-black/60 p-4 rounded-2xl border border-white/5 flex-1 font-mono text-[8px] text-slate-400 break-all leading-tight">{regexString}</div>
                      <button onClick={handleCopy} className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg active:scale-90 transition-all shrink-0">
                        {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                      </button>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* ══ META / INFOS ══ */}
              {activeTab === 'meta' && (
                <motion.div key="meta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }} className="space-y-4">

                  {/* Stärken / Schwächen */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-green-500/5 border border-green-500/15 rounded-[2.5rem] p-6">
                      <SectionTitle icon={ThumbsUp} label="Stärken" color="text-green-400" />
                      <ul className="space-y-2">
                        {['Schnelle Map-Aufräumung (skaliert mit Entzündungs-Ausbreitung)',
                          'Sehr robust: 90%+ Resi + Block-Cap + Erholung',
                          '5+ Ausdauerladungen → physische & elementare Reduktion',
                          'Wenig Tasten – entspannter Spielstil',
                          'Ignoriert Kälte- & Blitz-Resis via Feuer-Resi-Stacking (Tasalio)',
                          'Günstig startbar – funktioniert mit einfachen seltenen Items',
                        ].map((s, i) => <li key={i} className="flex items-start gap-2 text-[13px] text-slate-300"><span className="text-green-500 shrink-0">✓</span>{s}</li>)}
                      </ul>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/15 rounded-[2.5rem] p-6">
                      <SectionTitle icon={ThumbsDown} label="Schwächen" color="text-red-400" />
                      <ul className="space-y-2">
                        {['Niedriger Einzelziel-Schaden (2–4M DPS)',
                          'Akt 1 langsam – RF erst ab Akt 2',
                          'Begrenzte Skalierung ins Spätspiel',
                          'Uber-Endbosse nicht empfohlen',
                        ].map((s, i) => <li key={i} className="flex items-start gap-2 text-[13px] text-slate-300"><span className="text-red-500 shrink-0">✗</span>{s}</li>)}
                      </ul>
                    </div>
                  </div>

                  {/* Stats Dashboard */}
                  <Card className="bg-gradient-to-br from-indigo-950/40 to-black border-indigo-500/20">
                    <SectionTitle icon={Zap} label="PoB Stats (Lvl 100)" color="text-indigo-400" />
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-black/40 p-3 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-black text-indigo-400 mb-1">94.6K</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">Effektives Leben<br/>(eHP)</span>
                      </div>
                      <div className="bg-black/40 p-3 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-black text-orange-400 mb-1">3.35M</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">Schaden pro Sekunde<br/>(DPS)</span>
                      </div>
                    </div>
                    <div className="bg-black/40 p-3 rounded-2xl border border-white/5 flex flex-wrap gap-2 justify-center text-[11px] text-slate-300 font-bold mb-3">
                      <span className="bg-slate-800 px-2 py-1 rounded text-white flex items-center gap-1"><Shield className="w-3 h-3 text-red-500"/> 8,334 Life</span>
                      <span className="bg-slate-800 px-2 py-1 rounded text-white flex items-center gap-1"><Shield className="w-3 h-3 text-orange-500"/> 88% Max Resis (75% Chaos)</span>
                      <span className="bg-slate-800 px-2 py-1 rounded text-white flex items-center gap-1"><Zap className="w-3 h-3 text-green-500"/> 13,009 Rüstung</span>
                    </div>
                  </Card>

                  {/* Level 100 Tattoos & Masteries */}
                  <Card>
                    <SectionTitle icon={Gem} label="Level 100 Min-Max (Tattoos & Masteries)" color="text-pink-400" />
                    
                    <div className="space-y-4">
                      {/* Tattoos & Runegraft */}
                      <div>
                        <p className="text-pink-400 font-black text-[10px] uppercase tracking-widest mb-2">Tattoos & Runegraft</p>
                        <div className="space-y-2">
                          {[
                            ['Runegraft of the Bound', '20% red. Schuh-Boni, 20% erhöhte Handschuh-Boni (Limitiert auf 1)'],
                            ['6x Tattoo of the Ngamahu Firewalker', '+6% Feuer-Resistenz (insgesamt +36%)'],
                            ['1x Tattoo of the Ramako Fleetfoot', '2% erhöhtes Bewegungs-Tempo'],
                            ['3x Tattoo of the Rongokurai Turtle', '5% reduz. Extra-Schaden von kritischen Treffern (insg. 15%)'],
                          ].map(([name, desc], i) => (
                            <div key={i} className="flex flex-col bg-black/40 p-2.5 rounded-xl border border-white/5">
                              <span className="text-[12px] font-bold text-white">{name}</span>
                              <span className="text-[11px] text-slate-400">{desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Masteries */}
                      <div>
                        <p className="text-blue-400 font-black text-[10px] uppercase tracking-widest mb-2">Lvl 100 Masteries & Keystones</p>
                        <div className="space-y-2">
                          <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
                            <span className="text-[10px] text-blue-300 font-bold uppercase block mb-1">Keystones</span>
                            <p className="text-[11px] text-slate-300 leading-relaxed font-bold">Unwavering Stance <span className="text-slate-500 font-normal">(Immunität gegen Betäubung)</span>, Glancing Blows <span className="text-slate-500 font-normal">(Doppelte Blockchance, aber man nimmt 65% Schaden)</span></p>
                          </div>
                          
                          {[
                            ['Life Mastery', '+30 Max Leben | Zählt als Volles Leben bei 90%+ | 10% mehr Max Leben (bei 6 vergebenen Life Masteries) | Zählt als Niedriges Leben bei 55% oder weniger | Skills kosten Leben statt 15% Mana | 15% erhöhtes Max Leben ohne Körperrüstungs-Lebensmods'],
                            ['Block & Armour', 'Block: +1% Zauberblock pro 5% Angriffsblock | Armour: 30% reduz. Extra-Schaden durch Crits'],
                            ['Fire & Elemental', 'Feuer: 1 Leben/Sek pro 1% ungedeckeltem Feuer-Widerstand | 50% Chance Entzündungsdauer bei Crit zu erneuern | Elemental: Exposure wendet mind. -18% Resi an'],
                            ['Protection & Reservation', 'Protection: Immun gegen Corrupted Blood | Reservation: Auren haben 10% erhöhten Effekt auf dich'],
                          ].map(([cat, desc], i) => (
                            <div key={i} className="bg-black/40 p-2.5 rounded-xl border border-white/5 flex flex-col">
                              <span className="text-[11px] font-bold text-slate-200">{cat}</span>
                              <span className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Wichtige Meisterschaften */}
                  <Card>
                    <SectionTitle icon={Star} label="Pflicht-Meisterschaften" color="text-yellow-400" />
                    
                    <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-2xl p-4 mb-3">
                      <p className="text-orange-400 font-bold text-[10px] uppercase mb-1 tracking-widest">Feuer-Meisterschaft (Fire Mastery)</p>
                      <p className="text-white font-bold text-sm mb-1">"1 Leben/Sek. pro ungedeckelter Feuer-Widerstand"</p>
                      <p className="text-[12px] text-slate-400">125% Feuer-Resi = <span className="text-yellow-400 font-bold">125 Leben/Sek.</span> Regen. Minimum 120% bevor RF aktiviert!</p>
                    </div>

                    <div className="bg-red-500/5 border border-red-500/15 rounded-2xl p-4 mb-4">
                      <p className="text-red-400 font-bold text-[10px] uppercase mb-1 tracking-widest">Erholungs-Meisterschaft (Recovery Mastery)</p>
                      <p className="text-white font-bold text-sm mb-1">"Regeneriere 50 Leben pro Sekunde"</p>
                      <p className="text-[12px] text-slate-400">Massiver Boost fürs Überleben in den ersten Akten. Extrem wichtig früh mitzunehmen!</p>
                    </div>

                    <div className="space-y-2">
                      {['„Feuer-Widerstand" auf offene Suffixe craften (1 Transmute, Werkbank in Versteck)',
                        '2× Eisenring + 2× rote Gemme = 2× Rubinring (Händler-Fenster)',
                        'ALT halten zum Anzeigen offener Affix-Slots (Erweiterte Anzeige aktivieren)'
                      ].map((t, i) => (
                        <div key={i} className="flex gap-2 text-[12px] text-slate-400">
                          <ChevronRight className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" /><p>{t}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Banditen */}
                  <Card>
                    <SectionTitle icon={Swords} label="Banditen-Wahl (Akt 2)" color="text-orange-400" />
                    <div className="space-y-2">
                      {[
                        { n: 'Kraityn helfen 🏆', d: '+8% Lauftempo – Empfehlung für Geschwindigkeit!', c: 'border-green-500/30 bg-green-500/5', t: 'text-green-400' },
                        { n: 'Oak helfen', d: '+40 Leben – Gut für Einsteiger.', c: 'border-white/10', t: 'text-slate-300' },
                        { n: 'Alle töten', d: '+1 Skillpunkt – Bestes für Einzelziel (höchster DPS).', c: 'border-white/10', t: 'text-slate-300' },
                      ].map((b, i) => (
                        <div key={i} className={`p-4 rounded-2xl border ${b.c}`}>
                          <p className={`font-bold text-sm ${b.t}`}>{b.n}</p>
                          <p className="text-[11px] text-slate-500">{b.d}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Pantheon */}
                  <Card>
                    <SectionTitle icon={Shield} label="Pantheon (ab Maps)" color="text-blue-400" />
                    <div className="space-y-2">
                      <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
                        <p className="text-blue-300 font-bold text-sm">Arakaali (Lvl 100 Setup) / Meergott</p>
                        <p className="text-[11px] text-slate-500">Im Level 100 Setup (Arakaali) für DoT-Reduktion, davor Meeresgott für "100% Chance gefrorenes Stehen zu vermeiden" via Göttliches Gefäß!</p>
                      </div>
                      <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
                        <p className="text-slate-300 font-bold text-sm">Ralakesh</p>
                        <p className="text-[11px] text-slate-500">Kleiner Pantheon. Reduziert Blutungs- & Gift-Debuffs. Standard für End-Game!</p>
                      </div>
                    </div>
                  </Card>

                  {/* Jewel Guide */}
                  <Card>
                    <SectionTitle icon={Gem} label="Juwelen (worauf achten?)" color="text-cyan-400" />
                    <div className="space-y-3">
                      <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                        <p className="text-cyan-400 font-bold text-xs uppercase tracking-widest mb-2">Prefix (Wertvolles)</p>
                        <p className="text-[12px] text-slate-300">Leben · Feuerschaden</p>
                      </div>
                      <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                        <p className="text-purple-400 font-bold text-xs uppercase tracking-widest mb-2">Suffix (Wertvolles)</p>
                        <p className="text-[12px] text-slate-300">Erhöhter Schaden · Feuerschaden-über-Zeit-Mult · Flächenschaden · Brennschaden · Chaos-Resistenz · Geschicklichkeit</p>
                      </div>
                      <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                        <p className="text-orange-400 font-bold text-xs uppercase tracking-widest mb-2">Große Cluster-Juwelen</p>
                        <p className="text-[12px] text-slate-300">"Prismatisches Herz" oder "Lodernde Helligkeit" vorne. Alternativ: 12-Passive-Cluster für +Leben & Chaos-Resi craften.</p>
                      </div>
                      <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                        <p className="text-yellow-400 font-bold text-xs uppercase tracking-widest mb-2">Mittlere Cluster-Juwelen</p>
                        <p className="text-[12px] text-slate-300">"Lebensfluss" + beliebige Kombination.</p>
                      </div>
                    </div>
                  </Card>

                  {/* Mana FAQ */}
                  <Card>
                    <SectionTitle icon={AlertTriangle} label="Kein Mana für alle Auren?" color="text-yellow-400" />
                    <div className="space-y-2">
                      {[
                        'Auren NIEMALS mit Lebensabgriff oder anderen Supports verlinken (außer explizit im PoB, z.B. Skitterbot + Ungebundene Qualen).',
                        'ALLE Reservierungs-Knoten aus dem PoB nehmen – dreimal prüfen!',
                        'PoB Loadout-Feature (oben rechts) nutzen – stellt sicher dass man die richtige Ausrüstung betrachtet.',
                        'Bei manchen Setups: Schild mit Gemm-Reservierung nutzen. Skills-Bereich im PoB zeigt welche Gemme wohin kommt.'
                      ].map((t, i) => (
                        <div key={i} className="flex gap-2 text-[12px] text-slate-400">
                          <ChevronRight className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" /><p>{t}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Tödlicher Aura-Fehler */}
                  <div className="bg-red-500/10 border-2 border-red-500/20 rounded-[2.5rem] p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Skull className="w-20 h-20 text-red-500" /></div>
                    <h3 className="text-red-500 font-black uppercase text-xs mb-3 tracking-widest flex items-center animate-pulse gap-2">
                      <AlertTriangle className="w-5 h-5" /> Tödlicher Anfängerfehler
                    </h3>
                    <p className="text-[13px] text-slate-200 font-bold leading-relaxed relative z-10">
                      Verlinke <span className="underline decoration-red-500">NIEMALS</span> Auren mit Unterstützungsgemmen (außer explizit im PoB z.B. Skitterbot + Ungebundene Qualen). Mana-Reservierung auf 100%+ = sofort handlungsunfähig!
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Nav */}
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl">
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
