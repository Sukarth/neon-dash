import React from 'react';
import { getHighScores, clearHighScores, HighScoreEntry } from '../services/highScoreService';

interface HighScoresProps {
  onBack: () => void;
}

export const HighScores: React.FC<HighScoresProps> = ({ onBack }) => {
  const [scores, setScores] = React.useState<HighScoreEntry[]>([]);
  const [showConfirm, setShowConfirm] = React.useState(false);

  React.useEffect(() => {
    setScores(getHighScores());
  }, []);

  const handleClear = () => {
    clearHighScores();
    setScores([]);
    setShowConfirm(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'SOLO': return 'Solo';
      case 'VS_AI': return 'vs AI';
      case 'LOCAL_MULTI': return '2P';
      default: return mode;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-yellow-500/30 p-6 rounded-lg shadow-[0_0_30px_rgba(234,179,8,0.1)]">
      <h2 className="text-yellow-500 text-2xl font-black italic mb-6 flex items-center gap-2">
        <span>🏆</span> HIGH SCORES
      </h2>

      {scores.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎮</div>
          <p className="text-slate-400">No high scores yet!</p>
          <p className="text-slate-500 text-sm mt-2">Play some games to set records</p>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-lg mb-4 border border-slate-700 overflow-hidden">
          <div className="bg-slate-700/50 px-4 py-2 border-b border-slate-600">
            <div className="grid grid-cols-5 text-xs text-slate-400 uppercase tracking-wider font-bold">
              <span>#</span>
              <span>Player</span>
              <span className="text-center">Score</span>
              <span className="text-center">Mode</span>
              <span className="text-right">Date</span>
            </div>
          </div>
          {scores.map((entry, idx) => (
            <div
              key={idx}
              className={`grid grid-cols-5 items-center px-4 py-3 ${
                idx % 2 === 0 ? 'bg-slate-800/30' : ''
              } ${idx === 0 ? 'bg-yellow-500/10' : ''}`}
            >
              <span className={`font-bold ${
                idx === 0 ? 'text-yellow-400' : 
                idx === 1 ? 'text-slate-300' : 
                idx === 2 ? 'text-orange-400' : 'text-slate-500'
              }`}>
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
              </span>
              <span className="text-white font-medium truncate">{entry.name}</span>
              <span className="text-cyan-400 font-mono font-bold text-center">{entry.score}%</span>
              <span className="text-slate-400 text-sm text-center">{getModeLabel(entry.mode)}</span>
              <span className="text-slate-500 text-xs text-right">{formatDate(entry.date)}</span>
            </div>
          ))}
        </div>
      )}

      {scores.length > 0 && !showConfirm && (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full py-2 text-red-400 hover:text-red-300 text-sm font-bold uppercase tracking-widest transition-colors"
        >
          Clear All Scores
        </button>
      )}

      {showConfirm && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleClear}
            className="flex-1 py-4 px-6 font-black text-xl uppercase tracking-wider transition-all transform hover:translate-x-2 menu-btn-clip relative overflow-hidden group bg-red-900/40 text-red-100 hover:bg-red-600 hover:text-white border-l-4 border-red-500"
          >
            <span className="relative z-10">Confirm</span>
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 py-4 px-6 font-black text-xl uppercase tracking-wider transition-all transform hover:translate-x-2 menu-btn-clip relative overflow-hidden group bg-slate-800/40 text-slate-300 hover:bg-slate-700 hover:text-white border-l-4 border-slate-600"
          >
            <span className="relative z-10">Cancel</span>
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
          </button>
        </div>
      )}

      <button
        onClick={onBack}
        className="text-slate-500 hover:text-white mt-6 w-full text-center text-sm font-bold uppercase tracking-widest"
      >
        Back
      </button>
    </div>
  );
};
