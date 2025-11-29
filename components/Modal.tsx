import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-cyan-500/50 p-6 rounded-lg max-w-md w-full shadow-[0_0_50px_rgba(6,182,212,0.2)] transform transition-all scale-100">
                <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                    <h2 className="text-2xl font-black italic text-white neon-text">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-xl">&times;</button>
                </div>
                <div className="text-slate-300">
                    {children}
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="py-3 px-8 font-black text-lg uppercase tracking-wider transition-all transform hover:translate-x-2 menu-btn-clip relative overflow-hidden group bg-cyan-900/40 text-cyan-100 hover:bg-cyan-500 hover:text-white border-l-4 border-cyan-500">
                        <span className="relative z-10">Close</span>
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                    </button>
                </div>
            </div>
        </div>
    );
};
