import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  GameState, Player, Obstacle, Vector2, GameMode, LevelData, Particle, ObstacleType, PlayerResult
} from '../types';
import {
  GRAVITY, JUMP_FORCE, MOVE_SPEED, TERMINAL_VELOCITY,
  GRID_SIZE, PLAYER_SIZE, CAMERA_OFFSET_X, COLORS, FLOOR_Y_GRID,
  SPIKE_HITBOX_INSET_X, SPIKE_HITBOX_INSET_TOP, SPIKE_HITBOX_INSET_BOTTOM, BLOCK_HITBOX_INSET
} from '../constants';
import { audioService } from '../services/audioService';
import { PeerService } from '../services/peerService';

interface GameEngineProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  gameMode: GameMode;
  levelData: LevelData;
  onScoreUpdate: (percent: number) => void;
  onWin: () => void;
  onDie: () => void;
  // New props for Online
  peerService?: PeerService;
  onlinePlayerId?: number; // 1 (Host) or 2 (Client)
  playerCount?: number;
  settings?: any; // Settings type
}

const GameEngine: React.FC<GameEngineProps> = ({
  gameState,
  setGameState,
  gameMode,
  levelData,
  onScoreUpdate,
  onWin,
  onDie,
  peerService,
  onlinePlayerId,
  playerCount,
  settings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  // Game State Mutable Refs (for high perf loop)
  const playersRef = useRef<Player[]>([]);
  const cameraRef = useRef<Vector2>({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const levelEndXRef = useRef<number>(0);
  const screenShakeRef = useRef<number>(0);
  const trailsRef = useRef<{ x: number, y: number, color: string, life: number, size: number }[]>([]);
  const frameCountRef = useRef<number>(0);
  const roundOverSentRef = useRef<boolean>(false);

  const gameModeRef = useRef<GameMode>(gameMode);
  const onlineIdRef = useRef<number | undefined>(onlinePlayerId);
  
  // Spectator state - use ref for immediate access in event handlers
  const spectatingPlayerIdRef = useRef<number | null>(null);

  useEffect(() => {
    gameModeRef.current = gameMode;
    onlineIdRef.current = onlinePlayerId;
  }, [gameMode, onlinePlayerId]);

  // Initialize inputs
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const initGame = useCallback(() => {
    // Reset keys to prevent stuck inputs
    keysPressed.current = {};

    // Calculate grounded Y position based on current window height
    const floorPixelY = window.innerHeight - 100;
    const startY = floorPixelY - PLAYER_SIZE;

    // Setup Players
    // P1 Starts at 0
    const p1: Player = {
      id: 1,
      pos: { x: 0, y: startY },
      velocity: { x: MOVE_SPEED, y: 0 },
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      rotation: 0,
      isGrounded: true,
      isDead: false,
      color: settings?.playerColor || COLORS.player1,
      isAI: false,
      jumpInput: false,
      hasFinished: false,
    };

    const newPlayers: Player[] = [p1];

    // Setup additional players based on mode
    let p2StartX = -GRID_SIZE;
    if (gameMode === 'ONLINE') {
      p2StartX = 0; // In online, start together
    }

    if (gameMode === 'LOCAL_MULTI') {
      newPlayers.push({
        ...p1,
        id: 2,
        pos: { x: p2StartX, y: startY },
        velocity: { x: MOVE_SPEED, y: 0 },
        color: COLORS.player2,
        isAI: false,
      });
    } else if (gameMode === 'VS_AI') {
      newPlayers.push({
        ...p1,
        id: 2,
        pos: { x: p2StartX, y: startY },
        velocity: { x: MOVE_SPEED, y: 0 },
        color: '#ff9900', // Orange AI
        isAI: true,
      });
    } else if (gameMode === 'ONLINE') {
      // Create exactly playerCount slots (including host as id 1)
      const totalPlayers = Math.max(1, playerCount ?? 1);
      for (let id = 2; id <= totalPlayers; id++) {
        newPlayers.push({
          ...p1,
          id,
          pos: { x: 0, y: startY },
          color:
            id === 2
              ? COLORS.player2
              : id === 3
              ? '#00ff00'
              : '#ffff00',
          isAI: false,
        });
      }
    }

    // Set the local player's name from settings
    if (gameMode === 'ONLINE' && onlinePlayerId) {
      const myPlayer = newPlayers.find(p => p.id === onlinePlayerId);
      if (myPlayer) {
        myPlayer.name = settings?.username || `Player ${onlinePlayerId}`;
      }
    }

    playersRef.current = newPlayers;
    cameraRef.current = { x: 0, y: 0 };
    particlesRef.current = [];
    obstaclesRef.current = levelData.obstacles;
    levelEndXRef.current = levelData.length * GRID_SIZE;
  }, [levelData, settings, gameMode, playerCount, onlinePlayerId]);

  // Handle Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      keysPressed.current[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'Enter'].includes(e.code)) e.preventDefault();
      
      // Spectator switching (only when dead/finished in online mode)
      if (gameModeRef.current === 'ONLINE') {
        const me = playersRef.current.find(p => p.id === onlineIdRef.current);
        if (me && (me.isDead || me.hasFinished)) {
          const alivePlayers = playersRef.current.filter(p => !p.isDead && !p.hasFinished);
          if (alivePlayers.length > 1 && (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD')) {
            e.preventDefault();
            const currentIdx = alivePlayers.findIndex(p => p.id === spectatingPlayerIdRef.current);
            let newIdx: number;
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
              newIdx = currentIdx <= 0 ? alivePlayers.length - 1 : currentIdx - 1;
            } else {
              newIdx = currentIdx >= alivePlayers.length - 1 ? 0 : currentIdx + 1;
            }
            spectatingPlayerIdRef.current = alivePlayers[newIdx].id;
            console.log('Switched to spectating player:', alivePlayers[newIdx].id);
          }
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };
    const handleTouchStart = (e: TouchEvent) => {
      if (e.target === canvasRef.current) {
        e.preventDefault();
        keysPressed.current['Space'] = true;
      }
    };
    const handleTouchEnd = () => {
      keysPressed.current['Space'] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Handle Network Data
  useEffect(() => {
    if (!peerService) return;

    const unsubscribe = peerService.addDataListener((packet: any) => {
      if (packet.type === 'UPDATE' && packet.data) {
        const remoteId = packet.data.id;
        const remoteP = playersRef.current.find((p) => p.id === remoteId);
        if (remoteP) {
          // LERP for smoothing
          remoteP.pos.x =
            remoteP.pos.x + (packet.data.pos.x - remoteP.pos.x) * 0.5;
          remoteP.pos.y =
            remoteP.pos.y + (packet.data.pos.y - remoteP.pos.y) * 0.5;
          remoteP.rotation = packet.data.rot;
          remoteP.isDead = packet.data.isDead;
          remoteP.hasFinished = packet.data.hasFinished || false;
          // Update name if provided
          if (packet.data.name) {
            remoteP.name = packet.data.name;
          }
        }
      } else if (packet.type === 'DIE') {
        const remoteP = playersRef.current.find(
          (p) => p.id === packet.data.id,
        );
        if (remoteP) remoteP.isDead = true;
      } else if (packet.type === 'WIN') {
        const remoteP = playersRef.current.find(
          (p) => p.id === packet.data.id,
        );
        if (remoteP) remoteP.hasFinished = true;
      } else if (packet.type === 'PLAYER_LEAVE') {
        // Remove player from game
        playersRef.current = playersRef.current.filter(
          (p) => p.id !== packet.data.id,
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [peerService]);

  // Initialize on mount or restart
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      if (playersRef.current.length === 0 || playersRef.current.every(p => p.isDead)) {
        initGame();
        roundOverSentRef.current = false;
        spectatingPlayerIdRef.current = null;
      }
      audioService.initialize();
    }
  }, [gameState, initGame]);


  // Helper: AABB Collision
  const checkCollision = (rect1: { x: number, y: number, w: number, h: number }, rect2: { x: number, y: number, w: number, h: number }) => {
    return (
      rect1.x < rect2.x + rect2.w &&
      rect1.x + rect1.w > rect2.x &&
      rect1.y < rect2.y + rect2.h &&
      rect1.y + rect1.h > rect2.y
    );
  };

  // Helper: AI Logic
  const getAIJumpInput = (bot: Player) => {
    const gridX = bot.pos.x / GRID_SIZE;

    for (let i = 1; i <= 5; i++) {
      const checkX = Math.floor(gridX + i);
      const nearbyObs = obstaclesRef.current.filter(o => Math.round(o.x) === checkX);

      for (const obs of nearbyObs) {
        if (obs.type === ObstacleType.SPIKE && obs.y <= 1) return true;
        if ((obs.type === ObstacleType.BLOCK || obs.type === ObstacleType.PLATFORM) && obs.y === 0) return true;
        if (obs.type === ObstacleType.BLOCK && obs.y === 1) return true;
      }
    }
    return false;
  };

  // Main Loop
  const update = useCallback((time: number) => {
    if (gameState !== GameState.PLAYING) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    frameCountRef.current++;

    const currentMode = gameModeRef.current;
    const FLOOR_PIXEL_Y = canvas.height - 100;

    // Define Input Groups
    const isP1Jump = !!(keysPressed.current['Space'] || keysPressed.current['KeyW'] || keysPressed.current['Click']);
    const isP2Jump = !!(keysPressed.current['ArrowUp'] || keysPressed.current['Enter']);

    // 1. Update Players
    playersRef.current.forEach(p => {
      // If Online and this is NOT my player, skip physics update (it is handled by network interpolation)
      if (currentMode === 'ONLINE') {
        if (p.id !== onlineIdRef.current) return;
      }

      if (p.isDead || p.hasFinished) return;

      p.jumpInput = false;

      // Inputs
      if (p.isAI) {
        p.jumpInput = getAIJumpInput(p);
      } else if (currentMode === 'ONLINE') {
        // I control ONLY my player
        if (p.id === onlineIdRef.current) {
          p.jumpInput = isP1Jump || isP2Jump; // Any jump key works for my player
        }
      } else if (currentMode === 'LOCAL_MULTI') {
        if (p.id === 1) p.jumpInput = isP1Jump;
        else if (p.id === 2) p.jumpInput = isP2Jump;
      } else {
        // Solo
        if (p.id === 1) p.jumpInput = isP1Jump || isP2Jump;
      }

      // Physics
      p.pos.x += p.velocity.x;

      if (p.jumpInput && p.isGrounded) {
        p.velocity.y = JUMP_FORCE;
        p.isGrounded = false;
        audioService.playJump();
        // Spawn jump particles
        for (let i = 0; i < 5; i++) {
          particlesRef.current.push({
            x: p.pos.x + p.width / 2,
            y: p.pos.y + p.height,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 1.0,
            color: '#fff',
            size: 3
          });
        }
      }

      p.velocity.y += GRAVITY;
      if (p.velocity.y > TERMINAL_VELOCITY) p.velocity.y = TERMINAL_VELOCITY;
      p.pos.y += p.velocity.y;

      // Trails
      if (frameCountRef.current % 3 === 0) { // More frequent trails (every 3 frames)
        trailsRef.current.push({
          x: p.pos.x,
          y: p.pos.y,
          color: p.color,
          life: 0.8, // Start with higher opacity
          size: p.width
        });
      }

      // Rotation
      if (!p.isGrounded) {
        p.rotation += 6;
      } else {
        const rem = p.rotation % 90;
        if (rem !== 0) {
          if (rem > 45) p.rotation += (90 - rem) * 0.2;
          else p.rotation -= rem * 0.2;
        }
      }

      // --- Collision Detection ---
      p.isGrounded = false;

      // Floor Collision
      const playerBottom = p.pos.y + p.height;
      if (playerBottom >= FLOOR_PIXEL_Y) {
        p.pos.y = FLOOR_PIXEL_Y - p.height;
        p.velocity.y = 0;
        p.isGrounded = true;
      }

      // Obstacle Collision
      const pRect = { x: p.pos.x + 4, y: p.pos.y + 4, w: p.width - 8, h: p.height - 8 };

      for (const obs of obstaclesRef.current) {
        const obsH = obs.height || GRID_SIZE;
        const obsW = obs.width || GRID_SIZE;
        const obsPixelX = obs.x * GRID_SIZE;
        const obsPixelY = FLOOR_PIXEL_Y - (obs.y * GRID_SIZE) - obsH;
        
        // Create hitbox with appropriate insets based on obstacle type
        let obsRect: { x: number, y: number, w: number, h: number };
        
        if (obs.type === ObstacleType.SPIKE) {
          // Significantly smaller hitbox for spikes - triangular shape means edges are less dangerous
          // Clamp insets to ensure positive dimensions
          const insetX = Math.min(SPIKE_HITBOX_INSET_X, obsW / 2 - 1);
          const insetTop = Math.min(SPIKE_HITBOX_INSET_TOP, obsH / 2 - 1);
          const insetBottom = Math.min(SPIKE_HITBOX_INSET_BOTTOM, obsH - insetTop - 1);
          obsRect = { 
            x: obsPixelX + insetX, 
            y: obsPixelY + insetTop, 
            w: Math.max(1, obsW - (insetX * 2)), 
            h: Math.max(1, obsH - insetTop - insetBottom) 
          };
        } else if (obs.type === ObstacleType.BLOCK || obs.type === ObstacleType.PLATFORM) {
          // Slightly smaller hitbox for blocks
          // Clamp inset to ensure positive dimensions
          const inset = Math.min(BLOCK_HITBOX_INSET, Math.min(obsW, obsH) / 2 - 1);
          obsRect = { 
            x: obsPixelX + inset, 
            y: obsPixelY + inset, 
            w: Math.max(1, obsW - (inset * 2)), 
            h: Math.max(1, obsH - (inset * 2)) 
          };
        } else {
          obsRect = { x: obsPixelX, y: obsPixelY, w: obsW, h: obsH };
        }

        if (checkCollision(pRect, obsRect)) {
          if (obs.type === ObstacleType.SPIKE) {
            p.isDead = true;
            audioService.playDeath();
            screenShakeRef.current = 20; // Shake!
            // Send Death Event
            if (currentMode === 'ONLINE') {
              peerService?.send({ type: 'DIE', data: { id: p.id } });
            }
          } else if (obs.type === ObstacleType.BLOCK || obs.type === ObstacleType.PLATFORM) {
            const prevY = p.pos.y - p.velocity.y;
            if (prevY + p.height <= obsPixelY + 20 && p.velocity.y >= 0) {
              p.pos.y = obsPixelY - p.height;
              p.velocity.y = 0;
              p.isGrounded = true;
            } else {
              p.isDead = true;
              audioService.playDeath();
              if (currentMode === 'ONLINE') {
                peerService?.send({ type: 'DIE', data: { id: p.id } });
              }
            }
          }
        }
      }

      // Check Level Finish
      if (p.pos.x > levelEndXRef.current) {
        p.hasFinished = true;
        audioService.playWin();
        if (currentMode === 'ONLINE') {
          peerService?.send({ type: 'WIN', data: { id: p.id } });
        }
      }
    });

    // 1b. Network Sync (Send my data)
    if (currentMode === 'ONLINE' && peerService) {
      const myP = playersRef.current.find(p => p.id === onlineIdRef.current);
      if (myP) {
        peerService.send({
          type: 'UPDATE',
          data: {
            id: myP.id,
            pos: myP.pos,
            vel: myP.velocity,
            rot: myP.rotation,
            isDead: myP.isDead,
            hasFinished: myP.hasFinished,
            name: myP.name
          }
        });
      }
    }

    // 2. Update Particles
    particlesRef.current.forEach(pt => {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life -= 0.02;
    });
    particlesRef.current = particlesRef.current.filter(pt => pt.life > 0);

    // 3. Update Camera (SPECTATOR MODE)
    let maxX = -Infinity;
    let targetPlayer: Player | null = null;
    const alivePlayers = playersRef.current.filter(p => !p.isDead && !p.hasFinished);

    // In Online, track ME if alive, otherwise spectate
    if (currentMode === 'ONLINE') {
      const me = playersRef.current.find(p => p.id === onlineIdRef.current);
      if (me && !me.isDead && !me.hasFinished) {
        targetPlayer = me;
      } else if (alivePlayers.length > 0) {
        // SPECTATOR MODE: Check if currently spectated player is still alive
        const currentSpectate = playersRef.current.find(p => p.id === spectatingPlayerIdRef.current);
        if (currentSpectate && !currentSpectate.isDead && !currentSpectate.hasFinished) {
          targetPlayer = currentSpectate;
        } else {
          // Auto-switch to next alive player
          targetPlayer = alivePlayers[0];
          spectatingPlayerIdRef.current = targetPlayer.id;
        }
      }
    }

    if (!targetPlayer) {
      playersRef.current.forEach(p => {
        if (!p.isDead && !p.hasFinished && p.pos.x > maxX) {
          maxX = p.pos.x;
          targetPlayer = p;
        }
      });
    }

    if (!targetPlayer) targetPlayer = playersRef.current[0];

    if (targetPlayer) {
      const targetX = targetPlayer.pos.x - CAMERA_OFFSET_X;
      cameraRef.current.x = targetX;
    }
    
    // Store alive players for spectator UI
    const alivePlayerIds = alivePlayers.map(p => p.id);

    // 4. Update Game State / UI
    const percent = Math.min(100, Math.max(0, (cameraRef.current.x / levelEndXRef.current) * 100));
    onScoreUpdate(Math.floor(percent));

    // Win/Loss Conditions
    if (currentMode === 'ONLINE') {
      // Check if round is over (all players dead or finished)
      const allDoneOrDead = playersRef.current.every(p => p.isDead || p.hasFinished);

      if (allDoneOrDead && onlineIdRef.current === 1 && !roundOverSentRef.current) {
        // Host broadcasts ROUND_OVER with player results
        roundOverSentRef.current = true;
        const results: PlayerResult[] = playersRef.current.map(p => ({
          id: p.id,
          name: p.name || `Player ${p.id}`,
          isDead: p.isDead,
          hasFinished: p.hasFinished,
          progress: Math.min(100, Math.max(0, Math.floor((p.pos.x / levelEndXRef.current) * 100)))
        }));
        console.log('Host sending ROUND_OVER with results:', results);
        peerService?.send({ type: 'ROUND_OVER', data: { results } });
      }
    } else {
      const allDead = playersRef.current.every(p => p.isDead);
      if (allDead) onDie();
      if (playersRef.current.some(p => p.hasFinished)) onWin();
    }

    // 5. Draw
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = COLORS.backgroundGrid;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const startGrid = Math.floor(cameraRef.current.x / GRID_SIZE) * GRID_SIZE;
      for (let i = startGrid; i < startGrid + canvas.width + GRID_SIZE; i += GRID_SIZE) {
        const xLine = i - cameraRef.current.x;
        ctx.moveTo(xLine, 0);
        ctx.lineTo(xLine, canvas.height);
      }
      ctx.stroke();

      ctx.save();

      // Screen Shake
      let shakeX = 0;
      let shakeY = 0;
      if (screenShakeRef.current > 0) {
        shakeX = (Math.random() - 0.5) * screenShakeRef.current;
        shakeY = (Math.random() - 0.5) * screenShakeRef.current;
        screenShakeRef.current *= 0.9;
        if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      }

      ctx.translate(-cameraRef.current.x + shakeX, shakeY);

      // Floor
      ctx.strokeStyle = COLORS.floorLine;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cameraRef.current.x, FLOOR_PIXEL_Y);
      ctx.lineTo(cameraRef.current.x + canvas.width + 200, FLOOR_PIXEL_Y);
      ctx.stroke();

      ctx.fillStyle = COLORS.floor;
      ctx.fillRect(cameraRef.current.x, FLOOR_PIXEL_Y, canvas.width + 200, canvas.height - FLOOR_PIXEL_Y);

      // Draw Trails
      trailsRef.current.forEach(t => {
        ctx.globalAlpha = t.life * 0.6; // Higher max alpha
        ctx.fillStyle = t.color;
        ctx.fillRect(t.x, t.y, t.size, t.size);
        t.life -= 0.02;
      });
      trailsRef.current = trailsRef.current.filter(t => t.life > 0);
      ctx.globalAlpha = 1.0;

      // Obstacles
      const viewStart = cameraRef.current.x;
      const viewEnd = viewStart + canvas.width;

      obstaclesRef.current.forEach(obs => {
        const obsX = obs.x * GRID_SIZE;
        if (obsX < viewStart - 100 || obsX > viewEnd + 100) return;

        const obsH = obs.height || GRID_SIZE;
        const obsW = obs.width || GRID_SIZE;
        const obsY = FLOOR_PIXEL_Y - (obs.y * GRID_SIZE) - obsH;

        if (obs.type === ObstacleType.BLOCK || obs.type === ObstacleType.PLATFORM) {
          ctx.fillStyle = COLORS.block;
          ctx.fillRect(obsX, obsY, obsW, obsH);
          ctx.strokeStyle = COLORS.blockBorder;
          ctx.lineWidth = 2;
          ctx.strokeRect(obsX, obsY, obsW, obsH);
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(obsX + 5, obsY + 5, obsW - 10, obsH - 10);
        } else if (obs.type === ObstacleType.SPIKE) {
          ctx.fillStyle = COLORS.spike;
          ctx.beginPath();
          ctx.moveTo(obsX, obsY + obsH);
          ctx.lineTo(obsX + obsW / 2, obsY);
          ctx.lineTo(obsX + obsW, obsY + obsH);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Players
      const sortedPlayers = [...playersRef.current].sort((a, b) => b.id - a.id);

      sortedPlayers.forEach(p => {
        if (p.isDead) return;

        // In online, ghost the opponent slightly
        if (currentMode === 'ONLINE' && p.id !== onlineIdRef.current) {
          ctx.globalAlpha = 0.6;
        } else {
          ctx.globalAlpha = 1.0;
        }

        ctx.save();
        ctx.translate(p.pos.x + p.width / 2, p.pos.y + p.height / 2);
        ctx.rotate((p.rotation * Math.PI) / 180);

        ctx.shadowBlur = 20;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);

        ctx.fillStyle = '#000';
        ctx.shadowBlur = 0;
        ctx.fillRect(-p.width / 4, -p.height / 4, p.width / 2, p.height / 2);

        ctx.fillStyle = '#fff';
        ctx.fillRect(0, -p.height / 6, p.width / 6, p.height / 6);

        ctx.restore();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        let label = p.id === 1 ? 'P1' : (p.isAI ? 'BOT' : 'P2');
        if (currentMode === 'ONLINE') label = p.id === onlineIdRef.current ? 'YOU' : 'OPPONENT';
        ctx.fillText(label, p.pos.x + p.width / 2, p.pos.y - 20);
      });
      ctx.globalAlpha = 1.0;

      // Particles
      particlesRef.current.forEach(pt => {
        ctx.fillStyle = `rgba(255, 255, 255, ${pt.life})`;
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
      });

      ctx.restore();

      // --- SPECTATOR / STATUS OVERLAY ---
      if (currentMode === 'ONLINE') {
        const me = playersRef.current.find(p => p.id === onlineIdRef.current);
        const spectatingPlayer = targetPlayer && targetPlayer.id !== onlineIdRef.current ? targetPlayer : null;
        const isSpectating = me && (me.isDead || me.hasFinished) && alivePlayerIds.length > 0;

        if (isSpectating && spectatingPlayer) {
          // Show spectator overlay
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(0, 0, canvas.width, 100);
          
          ctx.fillStyle = me.isDead ? '#ff4444' : '#00ff00';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(me.isDead ? 'YOU DIED' : 'LEVEL COMPLETE!', canvas.width / 2, 30);
          
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText(`SPECTATING PLAYER ${spectatingPlayer.id}`, canvas.width / 2, 55);
          
          // Show player switching hint if multiple alive
          if (alivePlayerIds.length > 1) {
            ctx.fillStyle = '#aaa';
            ctx.font = '14px sans-serif';
            ctx.fillText(`Press LEFT/RIGHT to switch (${alivePlayerIds.length} players alive)`, canvas.width / 2, 80);
          }
        } else if (me && me.hasFinished && alivePlayerIds.length === 0) {
          // All done, waiting for results
          ctx.fillStyle = 'rgba(0, 100, 0, 0.7)';
          ctx.fillRect(0, 0, canvas.width, 80);
          ctx.fillStyle = '#00ff00';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('LEVEL COMPLETE!', canvas.width / 2, 30);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('Waiting for results...', canvas.width / 2, 60);
        } else if (me && me.isDead && alivePlayerIds.length === 0) {
          // All dead, waiting for results
          ctx.fillStyle = 'rgba(100, 0, 0, 0.7)';
          ctx.fillRect(0, 0, canvas.width, 80);
          ctx.fillStyle = '#ff4444';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('GAME OVER', canvas.width / 2, 30);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('Waiting for results...', canvas.width / 2, 60);
        }
      }
    }

    requestRef.current = requestAnimationFrame((t) => update(t));
  }, [gameState, onScoreUpdate, onDie, onWin, peerService, onlinePlayerId]);

  // Start Loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update]);

  // Canvas Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      onMouseDown={() => { keysPressed.current['Click'] = true; }}
      onMouseUp={() => { keysPressed.current['Click'] = false; }}
    />
  );
};

export default GameEngine;