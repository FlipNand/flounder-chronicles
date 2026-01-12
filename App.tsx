import React, { useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { Game } from './components/Game';
import { GameSettings } from './types';

function App() {
  const [view, setView] = useState<'menu' | 'game' | 'win'>('menu');
  const [settings, setSettings] = useState<GameSettings>({
    rayTracing: true, // Default to on for the wow factor
    particles: true,
    musicVolume: 0.5,
    sfxVolume: 0.5
  });

  const handleStart = () => setView('game');
  const handleExit = () => setView('menu');
  const handleWin = () => setView('win');

  return (
    <div className="font-sans antialiased text-gray-900">
      {view === 'menu' && (
        <MainMenu 
            onStart={handleStart} 
            settings={settings} 
            setSettings={setSettings} 
        />
      )}
      
      {view === 'game' && (
        <Game 
            settings={settings} 
            onExit={handleExit}
            onWin={handleWin}
        />
      )}

      {view === 'win' && (
        <div className="w-full h-screen bg-black flex flex-col items-center justify-center text-white p-8 text-center animate-fade-in">
             <div className="max-w-2xl">
                 <h1 className="text-6xl font-cinzel text-yellow-500 mb-6 drop-shadow-[0_0_25px_rgba(234,179,8,0.5)]">VICTORY</h1>
                 <p className="text-xl opacity-80 mb-8 leading-relaxed">
                     You have navigated the treacherous depths of the printing press, defeated the editors of chaos, 
                     and delivered the truth to the masses. The Flounder Chronicle continues.
                 </p>
                 <button 
                    onClick={handleExit} 
                    className="px-8 py-4 bg-white text-black font-bold text-lg hover:scale-105 transition-transform"
                 >
                     RETURN TO MENU
                 </button>
             </div>
        </div>
      )}
    </div>
  );
}

export default App;
