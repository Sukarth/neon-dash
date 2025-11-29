import React, { useState, useCallback, useEffect } from 'react';
import GameEngine from './components/GameEngine';
import { Menu } from './components/Menu';
import { GameState, GameMode, LevelData, Obstacle, Settings, PlayerResult } from './types';
import { INITIAL_LEVEL } from './constants';
import { PeerService } from './services/peerService';
import { saveHighScore, isHighScore } from './services/highScoreService';

const DEFAULT_SETTINGS: Settings = {
  volume: 0.5,
  username: 'Player ' + Math.floor(Math.random() * 1000),
  playerColor: '#00ffff'
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [gameMode, setGameMode] = useState<GameMode>('SOLO');
  const [score, setScore] = useState(0);
  const [levelData, setLevelData] = useState<LevelData>(INITIAL_LEVEL);
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('neondash_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Online State - Initialize immediately so it's available on first render
  const [peerService] = useState<PeerService>(() => new PeerService());
  const [onlineId, setOnlineId] = useState<number>(1); // Default to Host (1)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      peerService?.destroy();
    };
  }, [peerService]);

  // Track if score was already saved this session to prevent duplicates
  const scoreSavedRef = React.useRef(false);

  const handleStart = () => {
    setGameState(GameState.PLAYING);
    setScore(0);
    scoreSavedRef.current = false; // Reset on new game
  };

  const [playerCount, setPlayerCount] = useState(1);
  const [lobbyPlayerCount, setLobbyPlayerCount] = useState(1);
  const [showRoundResults, setShowRoundResults] = useState(false);
  const [roundResults, setRoundResults] = useState<PlayerResult[]>([]);
  const [hostDisconnected, setHostDisconnected] = useState(false);

  const handleOnlineStart = (id: number, count: number) => {
    setOnlineId(id);
    setPlayerCount(count);
    handleStart();
    // Send RESTART/START signal to sync
    peerService?.send({ type: 'RESTART' });
  };

  const handleRestart = () => {
    // If online, send restart signal
    if (gameMode === 'ONLINE') {
      peerService?.send({ type: 'RESTART' });
    }

    setGameState(GameState.MENU);
    setTimeout(() => {
      setGameState(GameState.PLAYING);
      setScore(0);
    }, 50);
  };

  // Listen for network packets that affect global UI / session state
  useEffect(() => {
    if (!peerService) return;

    const unsubscribe = peerService.addDataListener((packet: any) => {
      if (packet.type === 'RESTART') {
        // Any RESTART coming over the wire means we are entering an online round
        setGameMode('ONLINE');
        setShowRoundResults(false);
        setGameState(GameState.MENU);
        setTimeout(() => {
          setGameState(GameState.PLAYING);
          setScore(0);
        }, 50);
      } else if (packet.type === 'SYNC_PLAYERS') {
        setLobbyPlayerCount(packet.data.count);
        setPlayerCount(packet.data.count);
      } else if (packet.type === 'WELCOME') {
        setOnlineId(packet.data.id);
      } else if (packet.type === 'PLAYER_LEAVE') {
        // Handle player disconnect - detailed removal is done in GameEngine
        console.log('Player left:', packet.data.id);
      } else if (packet.type === 'ROUND_OVER') {
        console.log('ROUND_OVER received:', packet.data);
        setShowRoundResults(true);
        if (packet.data?.results) {
          setRoundResults(packet.data.results);
        }
      } else if (packet.type === 'RETURN_TO_LOBBY') {
        setShowRoundResults(false);
        setRoundResults([]);
        setGameState(GameState.MENU);
      } else if (packet.type === 'HOST_DISCONNECT') {
        // Host left, return to online lobby screen (not main menu)
        console.log('HOST_DISCONNECT packet received');
        setGameState(GameState.MENU);
        setShowRoundResults(false);
        setRoundResults([]);
        setHostDisconnected(true);
        // Don't reset gameMode here - Menu will handle showing the lobby
      }
    });

    return () => {
      unsubscribe();
    };
  }, [peerService]);

  // Setup disconnect handler (host disconnecting unexpectedly)
  useEffect(() => {
    if (!peerService) return;

    peerService.onDisconnect = (playerId: number) => {
      console.log('onDisconnect called, playerId:', playerId, 'gameMode:', gameMode);
      if (playerId === 1 && gameMode === 'ONLINE') {
        // Host disconnected unexpectedly (connection lost)
        // Note: HOST_DISCONNECT packet is now emitted by peerService, so this is just a backup
        console.log('Host disconnect detected via onDisconnect callback');
      }
    };
  }, [peerService, gameMode]);

  const handleLevelGenerated = (obstacles: Obstacle[]) => {
    setLevelData({
      ...INITIAL_LEVEL,
      obstacles: obstacles,
      name: "AI Generated Level",
      length: Math.max(100, obstacles[obstacles.length - 1].x + 20)
    });
    alert("Level Generated! Press Start.");
  };

  const handleWin = useCallback(() => {
    setGameState(GameState.LEVEL_COMPLETE);
    // Save high score on win (100%) - only once per session
    if (gameMode !== 'ONLINE' && !scoreSavedRef.current) {
      scoreSavedRef.current = true;
      saveHighScore({
        name: settings.username,
        score: 100,
        mode: gameMode
      });
    }
  }, [gameMode, settings.username]);

  const handleDie = useCallback(() => {
    setGameState(GameState.GAME_OVER);
    // Save high score on death if it qualifies - only once per session
    if (gameMode !== 'ONLINE' && !scoreSavedRef.current && isHighScore(score)) {
      scoreSavedRef.current = true;
      saveHighScore({
        name: settings.username,
        score: score,
        mode: gameMode
      });
    }
  }, [gameMode, settings.username, score]);

  const handleBackToMenu = () => {
    setGameState(GameState.MENU);
    setGameMode('SOLO'); // Optional: reset mode
    // If online, maybe disconnect or leave room?
    // For now, just go back to menu.
  };

  const handleHostDisconnectAck = useCallback(() => {
    setHostDisconnected(false);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0f0f13]">
      <GameEngine
        gameState={gameState}
        setGameState={setGameState}
        gameMode={gameMode}
        levelData={levelData}
        onScoreUpdate={setScore}
        onWin={handleWin}
        onDie={handleDie}
        peerService={peerService}
        onlinePlayerId={onlineId}
        playerCount={playerCount}
        settings={settings}
      />

      {/* Always render Menu to preserve state, but hide during gameplay unless showing results */}
      <div className={gameState === GameState.PLAYING && !showRoundResults ? 'hidden' : ''}>
        <Menu
          gameState={gameState}
          score={score}
          gameMode={gameMode}
          onStart={handleStart}
          onRestart={handleRestart}
          onSetMode={setGameMode}
          onLevelGenerated={handleLevelGenerated}
          peerService={peerService}
          onOnlineStart={handleOnlineStart}
          settings={settings}
          onUpdateSettings={setSettings}
          onBackToMenu={handleBackToMenu}
          lobbyPlayerCount={lobbyPlayerCount}
          showRoundResults={showRoundResults}
          roundResults={roundResults}
          hostDisconnected={hostDisconnected}
          onHostDisconnectAck={handleHostDisconnectAck}
          onlinePlayerId={onlineId}
          onReturnToLobby={() => {
            if (gameMode === 'ONLINE') {
              peerService?.send({ type: 'RETURN_TO_LOBBY' });
            }
            setShowRoundResults(false);
            setRoundResults([]);
            setGameState(GameState.MENU);
          }}
        />
      </div>
    </div>
  );
};

export default App;