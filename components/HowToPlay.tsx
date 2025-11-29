import React from 'react';

interface HowToPlayProps {
    onBack: () => void;
}

export const HowToPlay: React.FC<HowToPlayProps> = ({ onBack }) => {
    return (
        <>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.5); 
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #00d4ff; 
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #00a0cc; 
                }
            `}</style>
            <div className="bg-slate-900/90 border border-cyan-500/30 p-8 rounded-lg w-full max-h-[85vh] overflow-y-auto custom-scrollbar shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                <h2 className="text-4xl font-black italic text-cyan-400 mb-8 border-b border-cyan-500/30 pb-4 flex justify-between items-center neon-text">
                    <span>HOW TO PLAY</span>
                    <span className="text-sm font-normal text-slate-500 not-italic">READ CAREFULLY</span>
                </h2>

                <div className="space-y-10 text-slate-300">
                    <section>
                        <h3 className="text-cyan-400 font-bold text-2xl mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <span className="w-2 h-8 bg-cyan-500 inline-block"></span>
                            CONTROLS
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 hover:border-green-500/50 transition-colors">
                                <div className="text-white font-bold text-lg mb-2">JUMP / FLY</div>
                                <div className="text-sm text-slate-400 font-mono bg-slate-900 p-2 rounded">Spacebar / Left Click / W / Up Arrow</div>
                            </div>
                            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 hover:border-green-500/50 transition-colors">
                                <div className="text-white font-bold text-lg mb-2">PAUSE</div>
                                <div className="text-sm text-slate-400 font-mono bg-slate-900 p-2 rounded">Escape Key</div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-cyan-400 font-bold text-2xl mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <span className="w-2 h-8 bg-cyan-500 inline-block"></span>
                            GAME MODES
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-800/30 rounded border border-slate-700/50">
                                <strong className="text-cyan-400 block mb-1">SOLO RUN</strong>
                                <span className="text-sm">Classic mode. Survive as long as you can.</span>
                            </div>
                            <div className="p-4 bg-slate-800/30 rounded border border-slate-700/50">
                                <strong className="text-orange-400 block mb-1">VS CPU</strong>
                                <span className="text-sm">Race against an AI bot. Don't get left behind!</span>
                            </div>
                            <div className="p-4 bg-slate-800/30 rounded border border-slate-700/50">
                                <strong className="text-pink-400 block mb-1">LOCAL MULTIPLAYER</strong>
                                <span className="text-sm">Split-screen. P1: WASD/Space, P2: Arrows/Enter.</span>
                            </div>
                            <div className="p-4 bg-slate-800/30 rounded border border-slate-700/50">
                                <strong className="text-green-400 block mb-1">ONLINE MULTIPLAYER</strong>
                                <span className="text-sm">Real-time race. Create a room and share the code!</span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-cyan-400 font-bold text-2xl mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <span className="w-2 h-8 bg-cyan-500 inline-block"></span>
                            OBSTACLES
                        </h3>
                        <div className="flex gap-6 flex-wrap">
                            <div className="flex items-center gap-4 bg-slate-800/80 px-6 py-4 rounded-xl border border-slate-700">
                                <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[32px] border-b-red-500 drop-shadow-[0_0_10px_red]"></div>
                                <div>
                                    <div className="font-bold text-white">Spikes</div>
                                    <div className="text-xs text-red-400">INSTANT DEATH</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-slate-800/80 px-6 py-4 rounded-xl border border-slate-700">
                                <div className="w-8 h-8 bg-cyan-500 shadow-[0_0_10px_cyan]"></div>
                                <div>
                                    <div className="font-bold text-white">Blocks</div>
                                    <div className="text-xs text-cyan-400">SAFE TO LAND</div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-10 pt-6 border-t border-cyan-500/30">
                    <button onClick={onBack} className="w-full py-4 px-6 font-black text-xl uppercase tracking-wider transition-all transform hover:translate-x-2 menu-btn-clip relative overflow-hidden group bg-cyan-900/40 text-cyan-100 hover:bg-cyan-500 hover:text-white border-l-4 border-cyan-500">
                        <span className="relative z-10">I'm Ready to Play</span>
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                    </button>
                </div>
            </div>
        </>
    );
};
