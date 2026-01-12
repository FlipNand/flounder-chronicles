import React, { useState } from 'react';
import { Play, Settings, Monitor, Cpu, Info } from 'lucide-react';
import { GameSettings } from '../types';
import { FLOUNDER_LOGO_URL } from '../constants';

interface MenuProps {
  onStart: () => void;
  settings: GameSettings;
  setSettings: (s: GameSettings) => void;
}

export const MainMenu: React.FC<MenuProps> = ({ onStart, settings, setSettings }) => {
  const [showSettings, setShowSettings] = useState(false);

  const toggleSetting = (key: keyof GameSettings) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden flex flex-col items-center justify-center">
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2568&auto=format&fit=crop')] bg-cover bg-center filter grayscale contrast-150"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black"></div>

      {/* Main Content */}
      <div className="z-10 text-center flex flex-col items-center animate-fade-in">
        <img 
            src={FLOUNDER_LOGO_URL} 
            alt="Flounder Logo" 
            className="w-32 h-32 mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
        />
        <h1 className="text-6xl md:text-8xl font-cinzel mb-2 tracking-tighter">THE FLOUNDER</h1>
        <h2 className="text-xl md:text-3xl font-light opacity-70 mb-12 tracking-[0.5em] uppercase">Chronicles</h2>

        {!showSettings ? (
          <div className="flex flex-col gap-4 w-64">
            <button 
                onClick={onStart}
                className="group relative px-8 py-4 bg-white text-black font-bold text-lg overflow-hidden transition-all hover:scale-105"
            >
                <span className="relative z-10 flex items-center justify-center gap-2">
                    <Play size={20} /> START GAME
                </span>
                <div className="absolute inset-0 bg-blue-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 opacity-20"></div>
            </button>

            <button 
                onClick={() => setShowSettings(true)}
                className="px-8 py-4 border border-white/20 text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
                <Settings size={18} /> SETTINGS
            </button>
          </div>
        ) : (
          <div className="w-96 bg-black/80 border border-white/10 p-8 backdrop-blur-md rounded-lg">
             <h3 className="text-2xl font-cinzel mb-6 border-b border-white/10 pb-4">Visual Settings</h3>
             
             <div className="space-y-6">
                 <div className="flex items-center justify-between group">
                     <div className="flex items-center gap-3">
                         <div className={`p-2 rounded ${settings.rayTracing ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-400'}`}>
                             <Cpu size={24} />
                         </div>
                         <div className="text-left">
                             <div className="font-bold">Ray Tracing</div>
                             <div className="text-xs text-gray-400">RDNA 2 / RTX / M-Series</div>
                         </div>
                     </div>
                     <button 
                        onClick={() => toggleSetting('rayTracing')}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.rayTracing ? 'bg-blue-500' : 'bg-gray-700'}`}
                     >
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.rayTracing ? 'left-7' : 'left-1'}`} />
                     </button>
                 </div>

                 <div className="flex items-center justify-between group">
                     <div className="flex items-center gap-3">
                         <div className={`p-2 rounded ${settings.particles ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-400'}`}>
                             <Monitor size={24} />
                         </div>
                         <div className="text-left">
                             <div className="font-bold">Particles & FX</div>
                             <div className="text-xs text-gray-400">High Fidelity Atmosphere</div>
                         </div>
                     </div>
                     <button 
                        onClick={() => toggleSetting('particles')}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.particles ? 'bg-purple-500' : 'bg-gray-700'}`}
                     >
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.particles ? 'left-7' : 'left-1'}`} />
                     </button>
                 </div>
             </div>

             <button 
                onClick={() => setShowSettings(false)}
                className="mt-8 w-full py-3 bg-white/10 hover:bg-white/20 transition-all font-bold"
             >
                 BACK
             </button>
          </div>
        )}
      </div>
      
      <div className="absolute bottom-8 text-white/30 text-xs flex gap-4">
        <span>v1.0.0</span>
        <span>•</span>
        <span>Made for Flounder.news</span>
      </div>
    </div>
  );
};
