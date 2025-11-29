import React from 'react';
import { Settings } from '../types';

interface SettingsProps {
    settings: Settings;
    onUpdate: (s: Settings) => void;
    onBack: () => void;
}

const COLORS = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff0000', '#ffffff'];

export const SettingsView: React.FC<SettingsProps> = ({ settings, onUpdate, onBack }) => {
    return (
        <div className="bg-slate-900/90 border border-cyan-500/30 p-8 rounded-lg w-full max-w-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)]">
            <h2 className="text-3xl font-black italic text-cyan-400 mb-8 border-b border-cyan-500/30 pb-4 neon-text">SETTINGS</h2>

            <div className="space-y-8">
                {/* Username */}
                <div>
                    <label className="block text-cyan-400 font-bold mb-2 uppercase tracking-wider">Username</label>
                    <input
                        type="text"
                        value={settings.username}
                        onChange={(e) => onUpdate({ ...settings, username: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-600 text-white p-3 rounded focus:border-cyan-500 outline-none font-mono"
                        maxLength={12}
                    />
                </div>

                {/* Volume */}
                <div>
                    <label className="block text-cyan-400 font-bold mb-2 uppercase tracking-wider">Master Volume: {Math.round(settings.volume * 100)}%</label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.volume}
                        onChange={(e) => onUpdate({ ...settings, volume: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                </div>

                {/* Color */}
                <div>
                    <label className="block text-cyan-400 font-bold mb-2 uppercase tracking-wider">Player Color</label>
                    <div className="flex gap-4">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => onUpdate({ ...settings, playerColor: c })}
                                className={`w-12 h-12 rounded-full border-4 transition-transform hover:scale-110 ${settings.playerColor === c ? 'border-white scale-110 shadow-[0_0_15px_white]' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-4 border-t border-cyan-500/30">
                <button onClick={onBack} className="w-full py-4 px-6 font-black text-xl uppercase tracking-wider transition-all transform hover:translate-x-2 menu-btn-clip relative overflow-hidden group bg-cyan-900/40 text-cyan-100 hover:bg-cyan-500 hover:text-white border-l-4 border-cyan-500">
                    <span className="relative z-10">Save & Back</span>
                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                </button>
            </div>
        </div>
    );
};
