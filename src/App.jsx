import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { TAB_ORDER } from './data/actsData';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import LevelingTab from './components/tabs/LevelingTab';
import ShopTab from './components/tabs/ShopTab';
import SetupsTab from './components/tabs/SetupsTab';
import StopsTab from './components/tabs/StopsTab';
import TipsTab from './components/tabs/TipsTab';

// Slide animation variants
const variants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const TAB_COMPONENTS = {
  leveling: LevelingTab,
  shop: ShopTab,
  setups: SetupsTab,
  stops: StopsTab,
  tips: TipsTab,
};

export default function App() {
  const [activeTab, setActiveTab] = useState('leveling');
  const [direction, setDirection] = useState(0);
  const { acts, toggleAct, resetProgress, syncStatus } = useFirebaseSync();

  const progress = Math.round(
    (acts.filter((a) => a.done).length / acts.length) * 100
  );

  const navigateTo = (tabId) => {
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    const nextIndex = TAB_ORDER.indexOf(tabId);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveTab(tabId);
  };

  // Swipe gesture handler
  const handleDragEnd = (_e, info) => {
    const threshold = 50;
    const currentIndex = TAB_ORDER.indexOf(activeTab);

    if (info.offset.x < -threshold && currentIndex < TAB_ORDER.length - 1) {
      // Swiped left → next tab
      setDirection(1);
      setActiveTab(TAB_ORDER[currentIndex + 1]);
    } else if (info.offset.x > threshold && currentIndex > 0) {
      // Swiped right → previous tab
      setDirection(-1);
      setActiveTab(TAB_ORDER[currentIndex - 1]);
    }
  };

  const ActiveComponent = TAB_COMPONENTS[activeTab];
  const tabProps =
    activeTab === 'leveling' ? { acts, onToggle: toggleAct } : {};

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 pb-28 selection:bg-orange-500/30">
      <Header progress={progress} syncStatus={syncStatus} onReset={resetProgress} />

      {/* Swipeable Content Area */}
      <div className="overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.main
            key={activeTab}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="p-4 space-y-6 cursor-grab active:cursor-grabbing"
          >
            <ActiveComponent {...tabProps} />
          </motion.main>
        </AnimatePresence>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={navigateTo} />
    </div>
  );
}
