import React from 'react';
import { ListTodo, Gem, ShoppingCart, Lock, Package } from 'lucide-react';

const TABS = [
  { id: 'leveling', label: 'Akte', Icon: ListTodo, color: 'text-orange-500' },
  { id: 'setups', label: 'Setups', Icon: Gem, color: 'text-yellow-500' },
  { id: 'shop', label: 'Shop', Icon: ShoppingCart, color: 'text-blue-400' },
  { id: 'stops', label: 'Stopps', Icon: Lock, color: 'text-red-500' },
  { id: 'tips', label: 'Lexikon', Icon: Package, color: 'text-purple-400' },
];

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0f1115]/95 backdrop-blur-2xl border-t border-slate-800 pb-10 pt-4 px-6 z-50">
      <div className="flex justify-between items-center max-w-sm mx-auto">
        {TABS.map(({ id, label, Icon, color }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center transition-all duration-200 ${
                isActive ? `${color} scale-110 font-black` : 'text-slate-600'
              }`}
              aria-label={label}
            >
              <Icon className={`mb-1 ${id === 'setups' ? 'w-6 h-6' : 'w-5 h-5'}`} />
              <span className="text-[9px] uppercase">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export { TABS };
