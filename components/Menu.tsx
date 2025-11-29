import React, { useState, useEffect } from 'react';
import { GameMode, GameState, Settings, PlayerResult } from '../types';
import { generateLevelWithGemini } from '../services/geminiService';
import { PeerService } from '../services/peerService';
import { Modal } from './Modal';
import { SettingsView } from './Settings';
import { HowToPlay } from './HowToPlay';
import { HighScores } from './HighScores';

interface MenuProps {
    gameState: GameState;
    score: number;
    gameMode: GameMode;
    onStart: () => void;
    onRestart: () => void;
    onSetMode: (mode: GameMode) => void;
    onLevelGenerated: (obstacles: any[]) => void;
    peerService?: PeerService;
    onOnlineStart: (id: number, count: number) => void;
    settings: Settings;
    onUpdateSettings: (s: Settings) => void;
    onBackToMenu?: () => void;
    lobbyPlayerCount?: number;
    showRoundResults?: boolean;
    roundResults?: PlayerResult[];
    hostDisconnected?: boolean;
    onHostDisconnectAck?: () => void;
    onReturnToLobby?: () => void;
    onlinePlayerId?: number; // To know if we're the host
}

type MenuState = 'MAIN' | 'LOCAL_SELECT' | 'ONLINE_LOBBY' | 'GENERATOR' | 'SETTINGS' | 'HOW_TO_PLAY' | 'HIGH_SCORES';

export const Menu: React.FC<MenuProps> = ({
    gameState, score, gameMode, onStart, onRestart, onSetMode, onLevelGenerated, peerService, onOnlineStart, settings, onUpdateSettings, onBackToMenu, lobbyPlayerCount = 1, showRoundResults = false, roundResults = [], hostDisconnected = false, onHostDisconnectAck, onReturnToLobby, onlinePlayerId
}) => {
    const [menuView, setMenuView] = useState<MenuState>('MAIN');
    const [isGenerating, setIsGenerating] = useState(false);
    const [genError, setGenError] = useState('');
    const [customPrompt, setCustomPrompt] = useState('');

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalContent, setModalContent] = useState<React.ReactNode>(null);

    const showModal = (title: string, content: React.ReactNode) => {
        setModalTitle(title);
        setModalContent(content);
        setModalOpen(true);
    };

    // Online State
    const [roomCode, setRoomCode] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<'IDLE' | 'HOSTING' | 'JOINING' | 'CONNECTED'>('IDLE');
    const [connectedPlayers, setConnectedPlayers] = useState<number>(1); // 1 = Just me

    // Handle URL Params for Quick Join
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('room');
        if (code && menuView === 'MAIN') {
            setJoinCode(code);
            setMenuView('ONLINE_LOBBY');
        }
    }, []);

    // Handle host disconnect - show online lobby with message
    useEffect(() => {
        console.log('Menu hostDisconnected effect, hostDisconnected:', hostDisconnected, 'gameMode:', gameMode);
        if (hostDisconnected) {
            console.log('Handling host disconnect - setting ONLINE_LOBBY view');
            setConnectionStatus('IDLE');
            setRoomCode('');
            setJoinCode('');
            setConnectedPlayers(1);
            setMenuView('ONLINE_LOBBY');
            showModal('Host Disconnected', 'The host has left the game. You can join another room or create your own.');
            if (onHostDisconnectAck) {
                onHostDisconnectAck();
            }
        }
    }, [hostDisconnected, onHostDisconnectAck]);

    // When returning to menu from online game, show the lobby view
    useEffect(() => {
        if (gameState === GameState.MENU && gameMode === 'ONLINE' && (connectionStatus === 'HOSTING' || connectionStatus === 'CONNECTED')) {
            setMenuView('ONLINE_LOBBY');
        }
    }, [gameState, gameMode, connectionStatus]);

    // Sync connected players count with lobby player count (for hosts)
    useEffect(() => {
        if (connectionStatus === 'HOSTING') {
            setConnectedPlayers(lobbyPlayerCount);
        }
    }, [lobbyPlayerCount, connectionStatus]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGenError('');
        try {
            if (!process.env.API_KEY) {
                throw new Error("Env API_KEY is missing. Cannot generate.");
            }
            const obs = await generateLevelWithGemini(customPrompt);
            if (obs.length > 0) {
                onLevelGenerated(obs);
                setMenuView('MAIN'); // Go back to start
            } else {
                setGenError("AI returned no obstacles.");
            }
        } catch (e: any) {
            setGenError(e.message || "Failed to generate");
        } finally {
            setIsGenerating(false);
        }
    };

    const startHost = async () => {
        if (!peerService) return;
        setConnectionStatus('HOSTING');
        try {
            const code = await peerService.host();
            setRoomCode(code);
            setConnectedPlayers(1);
        } catch (e) {
            console.error(e);
            setConnectionStatus('IDLE');
            showModal("Error", "Failed to create room. Try again.");
        }
    };

    const startJoin = async () => {
        if (!peerService || !joinCode) return;
        setConnectionStatus('JOINING');
        try {
            await peerService.join(joinCode);
            setConnectionStatus('CONNECTED');
        } catch (e) {
            console.error(e);
            setConnectionStatus('IDLE');
            showModal("Error", "Could not find room: " + joinCode);
        }
    };

    const handleOnlineStartGame = () => {
        // Host starts the game
        const myId = roomCode ? 1 : 2; // Simple logic for now, Host=1
        onSetMode('ONLINE');
        onOnlineStart(myId, connectedPlayers);
    };

    // Helper to copy link
    const copyLink = () => {
        const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
        navigator.clipboard.writeText(url);
        showModal("Success", "Invite link copied to clipboard!");
    };

    const copyCode = () => {
        navigator.clipboard.writeText(roomCode);
        showModal("Success", "Room code copied to clipboard!");
    };

    const handleLeave = () => {
        if (peerService) {
            peerService.destroy();
        }
        setConnectionStatus('IDLE');
        setRoomCode('');
        setJoinCode('');
        setConnectedPlayers(1);
        setMenuView('MAIN'); // Return to main menu
    };

    // HUD (only when not showing round results overlay)
    if (gameState === GameState.PLAYING && !showRoundResults) {
        return (
            <div className="absolute top-0 left-0 w-full p-6 pointer-events-none flex justify-between items-start z-50">
                <div className="text-white text-3xl font-black italic tracking-wider neon-text">
                    {score}%
                </div>
                <div className="text-right">
                    <div className="text-white font-bold opacity-80 neon-text animate-pulse">
                        {gameMode === 'ONLINE' ? 'LIVE MULTIPLAYER' : gameMode === 'LOCAL_MULTI' ? 'P1 vs P2' : gameMode === 'VS_AI' ? 'HUMAN vs BOT' : 'SOLO RUN'}
                    </div>
                    <div className="text-cyan-200 text-xs opacity-60 mt-1">
                        {gameMode === 'LOCAL_MULTI' ? 'P1: Space/W | P2: Up/Enter' : 'Jump: Space / Click / W'}
                    </div>
                </div>
            </div>
        );
    }

    // --- MENU COMPONENTS ---

    const MenuButton = ({ onClick, children, variant = 'primary', className = '' }: any) => {
        const baseClass = "w-full py-4 px-6 font-black text-xl uppercase tracking-wider transition-all transform hover:translate-x-2 menu-btn-clip relative overflow-hidden group";
        const colors: any = {
            primary: "bg-cyan-900/40 text-cyan-100 hover:bg-cyan-500 hover:text-white border-l-4 border-cyan-500",
            secondary: "bg-slate-800/40 text-slate-300 hover:bg-slate-700 border-l-4 border-slate-600",
            danger: "bg-red-900/40 text-red-100 hover:bg-red-600 border-l-4 border-red-500",
            success: "bg-green-900/40 text-green-100 hover:bg-green-600 border-l-4 border-green-500"
        };

        return (
            <button onClick={onClick} className={`${baseClass} ${colors[variant]} ${className}`}>
                <span className="relative z-10">{children}</span>
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
            </button>
        );
    };

    // Round Results Overlay (Online Multiplayer)
    if (showRoundResults && gameMode === 'ONLINE') {
        // Sort results: finished players first (by progress desc), then dead players (by progress desc)
        const sortedResults = [...roundResults].sort((a, b) => {
            if (a.hasFinished && !b.hasFinished) return -1;
            if (!a.hasFinished && b.hasFinished) return 1;
            return b.progress - a.progress;
        });

        // Determine if current user is host (id === 1)
        const isHost = onlinePlayerId === 1;

        return (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f13] z-50 overflow-hidden scanline">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(500px)_rotateX(60deg)_translateY(0)] animate-float origin-top"></div>
                </div>

                <div className="max-w-2xl w-full p-8 z-10">
                    <div className="bg-slate-900/90 border border-cyan-500/30 p-8 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                        <h2 className="text-cyan-400 text-4xl font-black italic mb-2 text-center">ROUND OVER</h2>
                        <p className="text-slate-400 text-center mb-6">All players have finished or died</p>

                        {/* Scoreboard */}
                        <div className="bg-slate-800/50 rounded-lg mb-6 border border-slate-700 overflow-hidden">
                            <div className="bg-slate-700/50 px-4 py-2 border-b border-slate-600">
                                <div className="flex justify-between text-xs text-slate-400 uppercase tracking-wider font-bold">
                                    <span>Rank</span>
                                    <span>Player</span>
                                    <span>Status</span>
                                    <span>Progress</span>
                                </div>
                            </div>
                            {sortedResults.length > 0 ? (
                                sortedResults.map((result, idx) => {
                                    const isMe = result.id === onlinePlayerId;
                                    const isFirst = idx === 0;
                                    return (
                                        <div key={result.id} className={`flex justify-between items-center px-4 py-3 ${idx % 2 === 0 ? 'bg-slate-800/30' : ''} ${isFirst ? 'bg-yellow-500/10 border-l-4 border-yellow-500' : ''} ${isMe && !isFirst ? 'bg-cyan-500/10 border-l-4 border-cyan-500' : ''}`}>
                                            <span className={`font-bold ${isFirst ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-orange-400' : 'text-slate-500'}`}>
                                                #{idx + 1}
                                            </span>
                                            <span className={`font-medium ${isMe ? 'text-cyan-400' : 'text-white'}`}>
                                                {result.name} {isMe && <span className="text-xs opacity-70">(YOU)</span>}
                                            </span>
                                            <span className={`text-sm font-bold ${result.hasFinished ? 'text-green-400' : 'text-red-400'}`}>
                                                {result.hasFinished ? '✓ FINISHED' : '✗ DIED'}
                                            </span>
                                            <span className="text-cyan-400 font-mono font-bold">{result.progress}%</span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-6 text-center">
                                    <div className="text-6xl font-black text-white mb-2">{score}%</div>
                                    <div className="text-slate-400 text-sm">YOUR PROGRESS</div>
                                </div>
                            )}
                        </div>

                        {isHost ? (
                            <MenuButton onClick={onReturnToLobby} variant="success">
                                RETURN TO LOBBY
                            </MenuButton>
                        ) : (
                            <div className="text-center py-4">
                                <div className="text-slate-400 animate-pulse mb-4">Waiting for host to return to lobby...</div>
                                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f13] z-50 overflow-hidden scanline">
            {/* Background Particles/Grid Effect */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(500px)_rotateX(60deg)_translateY(0)] animate-float origin-top"></div>
            </div>

            {/* Container - Full width layout for How to Play, standard layout for others */}
            <div className={`w-full flex gap-8 items-center justify-center p-8 z-10 ${menuView === 'HOW_TO_PLAY' ? 'max-w-7xl' : 'max-w-4xl flex-col md:flex-row'}`}>

                {/* Left Side: Branding */}
                <div className={`text-center md:text-left ${menuView === 'HOW_TO_PLAY' ? 'flex-shrink-0' : 'flex-1'}`}>
                    <h1 className="text-7xl md:text-8xl font-black text-white italic tracking-tighter neon-text mb-2">
                        NEON<br /><span className="text-cyan-500">DASH</span>
                    </h1>
                    <p className="text-cyan-200/60 uppercase tracking-[0.6em] text-sm ml-2 mb-8">
                        Multiplayer Protocol
                    </p>

                    {gameState === GameState.GAME_OVER && (
                        <div className="inline-block px-6 py-2 bg-red-500/20 border border-red-500 text-red-500 font-bold tracking-widest animate-pulse">
                            SYSTEM FAILURE: {score}%
                        </div>
                    )}
                    {gameState === GameState.LEVEL_COMPLETE && (
                        <div className="inline-block px-6 py-2 bg-green-500/20 border border-green-500 text-green-500 font-bold tracking-widest">
                            SEQUENCE COMPLETE
                        </div>
                    )}
                </div>

                {/* Right Side: Interactive Menu */}
                <div className={`flex flex-col gap-4 backdrop-blur-md p-1 ${menuView === 'HOW_TO_PLAY' ? 'flex-1 w-full' : 'w-full md:w-96'}`}>

                    {/* VIEW: MAIN */}
                    {menuView === 'MAIN' && (
                        <>
                            <MenuButton onClick={() => setMenuView('LOCAL_SELECT')}>
                                Play Local
                            </MenuButton>
                            <MenuButton onClick={() => setMenuView('ONLINE_LOBBY')} variant="secondary" className="border-pink-500 text-pink-100 hover:bg-pink-600">
                                Online Multiplayer
                            </MenuButton>
                            <MenuButton onClick={() => setMenuView('GENERATOR')} variant="secondary">
                                AI Level Editor
                            </MenuButton>
                            <MenuButton onClick={() => setMenuView('HIGH_SCORES')} variant="secondary" className="border-yellow-500 text-yellow-100 hover:bg-yellow-600">
                                🏆 High Scores
                            </MenuButton>
                            <div className="flex gap-4">
                                <MenuButton onClick={() => setMenuView('SETTINGS')} variant="secondary" className="flex-1 text-sm py-3">
                                    Settings
                                </MenuButton>
                                <MenuButton onClick={() => setMenuView('HOW_TO_PLAY')} variant="secondary" className="flex-1 text-sm py-3">
                                    How to Play
                                </MenuButton>
                            </div>
                            {gameState === GameState.GAME_OVER || gameState === GameState.LEVEL_COMPLETE ? (
                                <>
                                    <MenuButton onClick={onRestart} variant="success">RESTART LEVEL</MenuButton>
                                    <button onClick={() => {
                                        if (onBackToMenu) onBackToMenu();
                                        setMenuView('MAIN');
                                    }} className="text-slate-500 hover:text-white mt-2 text-sm font-bold uppercase tracking-widest text-center w-full">Back to Menu</button>
                                </>
                            ) : null}
                        </>
                    )}

                    {/* VIEW: LOCAL SELECT */}
                    {menuView === 'LOCAL_SELECT' && (
                        <>
                            <h2 className="text-white text-xl font-bold mb-4 border-b border-cyan-500/30 pb-2">LOCAL MODES</h2>
                            <MenuButton onClick={() => { onSetMode('SOLO'); onStart(); }}>Solo Run</MenuButton>
                            <MenuButton onClick={() => { onSetMode('VS_AI'); onStart(); }} variant="secondary">Vs CPU Bot</MenuButton>
                            <MenuButton onClick={() => { onSetMode('LOCAL_MULTI'); onStart(); }} variant="secondary">Split Screen (2P)</MenuButton>
                            <button onClick={() => setMenuView('MAIN')} className="text-slate-500 hover:text-white mt-4 text-sm font-bold uppercase tracking-widest">Back</button>
                        </>
                    )}

                    {/* VIEW: ONLINE LOBBY */}
                    {menuView === 'ONLINE_LOBBY' && (
                        <div className="bg-slate-900/90 border border-pink-500/30 p-6 rounded-lg shadow-[0_0_30px_rgba(236,72,153,0.1)]">
                            <h2 className="text-pink-500 text-2xl font-black italic mb-6">ONLINE LOBBY</h2>

                            {connectionStatus === 'IDLE' && (
                                <div className="space-y-4">
                                    <button onClick={startHost} className="w-full py-4 px-6 font-black text-xl uppercase tracking-wider transition-all transform hover:translate-x-2 menu-btn-clip relative overflow-hidden group bg-pink-900/40 text-pink-100 hover:bg-pink-500 hover:text-white border-l-4 border-pink-500">
                                        <span className="relative z-10">CREATE ROOM</span>
                                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <div className="h-px bg-slate-700 flex-1"></div>
                                        <span className="text-slate-500 text-xs">OR JOIN</span>
                                        <div className="h-px bg-slate-700 flex-1"></div>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="ENTER CODE"
                                            maxLength={4}
                                            value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                            className="flex-1 bg-slate-800 border border-slate-600 text-white text-center font-mono text-xl p-2 rounded focus:border-pink-500 outline-none placeholder:text-slate-600 uppercase tracking-wider"
                                        />
                                        <button onClick={startJoin} className="px-6 py-4 font-black text-xl uppercase tracking-wider transition-all transform hover:translate-x-2 menu-btn-clip relative overflow-hidden group bg-pink-900/40 text-pink-100 hover:bg-pink-500 hover:text-white border-l-4 border-pink-500">
                                            <span className="relative z-10">GO</span>
                                            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {connectionStatus === 'HOSTING' && (
                                <div className="text-center py-4">
                                    <p className="text-slate-400 text-sm mb-2">ROOM CODE</p>
                                    <div onClick={copyCode} className="text-5xl font-mono text-white mb-4 tracking-widest cursor-pointer hover:text-pink-400 transition-colors" title="Click to copy code">
                                        {roomCode}
                                    </div>
                                    <div className="animate-pulse text-pink-500 font-bold text-sm mb-4">WAITING FOR PLAYERS...</div>

                                    {/* Player List */}
                                    <div className="bg-slate-800/50 p-4 rounded mb-4">
                                        <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Connected Players: {connectedPlayers}</div>
                                        <div className="flex justify-center gap-2">
                                            {Array.from({ length: connectedPlayers }).map((_, i) => (
                                                <div key={i} className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
                                            ))}
                                        </div>
                                    </div>

                                    <button onClick={copyLink} className="mt-2 text-xs text-slate-500 hover:text-white underline">Copy Invite Link</button>

                                    {connectedPlayers > 1 && (
                                        <button onClick={handleOnlineStartGame} className="w-full mt-6 py-4 px-6 font-black text-xl uppercase tracking-wider transition-all transform hover:translate-x-2 menu-btn-clip relative overflow-hidden group bg-green-900/40 text-green-100 hover:bg-green-500 hover:text-white border-l-4 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)] animate-pulse">
                                            <span className="relative z-10">START GAME</span>
                                            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                                        </button>
                                    )}
                                </div>
                            )}

                            {connectionStatus === 'JOINING' && (
                                <div className="text-center py-8">
                                    <div className="relative w-16 h-16 mx-auto mb-6">
                                        <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                    <div className="text-white font-bold text-xl mb-2">CONNECTING...</div>
                                    <div className="text-slate-400 text-sm mb-8">Room: <span className="text-pink-400 font-mono">{joinCode}</span></div>

                                    <button onClick={handleLeave} className="w-full py-4 px-6 font-black text-xl uppercase tracking-wider transition-all transform hover:translate-x-2 menu-btn-clip relative overflow-hidden group bg-slate-800/40 text-slate-300 hover:bg-slate-700 hover:text-white border-l-4 border-slate-600">
                                        <span className="relative z-10">CANCEL</span>
                                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                                    </button>
                                </div>
                            )}

                            {connectionStatus === 'CONNECTED' && (
                                <div className="text-center py-4">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500 rounded-full text-green-400 font-bold text-sm mb-6 animate-pulse">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        CONNECTED
                                    </div>

                                    <div className="bg-slate-800/50 p-6 rounded-lg mb-6 border border-slate-700">
                                        <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">LOBBY STATUS</p>
                                        <div className="text-3xl font-black text-white mb-1">{lobbyPlayerCount} <span className="text-lg font-normal text-slate-500">PLAYERS</span></div>
                                        <div className="flex justify-center gap-2 mt-3">
                                            {Array.from({ length: lobbyPlayerCount }).map((_, i) => (
                                                <div key={i} className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></div>
                                            ))}
                                        </div>
                                    </div>

                                    <p className="text-slate-400 text-sm mb-6 animate-pulse">Waiting for Host to start game...</p>

                                    <button onClick={handleLeave} className="w-full py-4 px-6 font-black text-xl uppercase tracking-wider transition-all transform hover:translate-x-2 menu-btn-clip relative overflow-hidden group bg-red-900/40 text-red-100 hover:bg-red-600 hover:text-white border-l-4 border-red-500">
                                        <span className="relative z-10">LEAVE ROOM</span>
                                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                                    </button>
                                </div>
                            )}

                            {connectionStatus === 'IDLE' && (
                                <button onClick={() => { setConnectionStatus('IDLE'); setMenuView('MAIN'); }} className="text-slate-500 hover:text-white mt-6 w-full text-center text-sm font-bold uppercase tracking-widest">
                                    Cancel
                                </button>
                            )}
                            {connectionStatus === 'HOSTING' && (
                                <button onClick={handleLeave} className="text-slate-500 hover:text-white mt-6 w-full text-center text-sm font-bold uppercase tracking-widest">
                                    Close Room
                                </button>
                            )}
                        </div>
                    )}

                    {/* VIEW: GENERATOR */}
                    {menuView === 'GENERATOR' && (
                        <div className="bg-slate-900/80 p-6 border border-cyan-500/30 rounded">
                            <h2 className="text-cyan-400 text-xl font-bold mb-4">AI GENERATOR</h2>
                            <textarea
                                className="w-full h-32 bg-slate-950 border border-slate-700 text-slate-200 p-4 text-sm rounded resize-none focus:border-cyan-500 outline-none"
                                placeholder="Describe your level (e.g. 'Hardcore fast section with lots of spikes and platforms')"
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                            ></textarea>
                            {genError && <p className="text-red-400 text-xs mt-2">{genError}</p>}
                            <div className="mt-4 flex gap-4">
                                <button onClick={() => setMenuView('MAIN')} className="flex-1 py-4 px-6 font-black text-xl uppercase tracking-wider transition-all transform hover:translate-x-2 menu-btn-clip relative overflow-hidden group bg-slate-800/40 text-slate-300 hover:bg-slate-700 hover:text-white border-l-4 border-slate-600">
                                    <span className="relative z-10">CANCEL</span>
                                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="flex-[2] py-4 px-6 font-black text-xl uppercase tracking-wider transition-all transform hover:translate-x-2 menu-btn-clip relative overflow-hidden group bg-cyan-900/40 text-cyan-100 hover:bg-cyan-500 hover:text-white border-l-4 border-cyan-500 disabled:opacity-50"
                                >
                                    <span className="relative z-10">{isGenerating ? 'GENERATING...' : 'CREATE LEVEL'}</span>
                                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* VIEW: SETTINGS */}
                    {menuView === 'SETTINGS' && (
                        <SettingsView
                            settings={settings}
                            onUpdate={onUpdateSettings}
                            onBack={() => setMenuView('MAIN')}
                        />
                    )}

                    {/* VIEW: HOW TO PLAY */}
                    {menuView === 'HOW_TO_PLAY' && (
                        <HowToPlay onBack={() => setMenuView('MAIN')} />
                    )}

                    {/* VIEW: HIGH SCORES */}
                    {menuView === 'HIGH_SCORES' && (
                        <HighScores onBack={() => setMenuView('MAIN')} />
                    )}
                </div>
            </div>

            {/* Footer / Version */}
            <div className="absolute bottom-4 left-6 text-slate-700 text-xs font-mono">
                NEON DASH v2.0 // ONLINE ENABLED
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalTitle}
            >
                {modalContent}
            </Modal>
        </div>
    );
};