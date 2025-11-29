export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  GENERATING_LEVEL = 'GENERATING_LEVEL',
}

export enum ObstacleType {
  BLOCK = 'BLOCK',
  SPIKE = 'SPIKE',
  PLATFORM = 'PLATFORM', // Floating block
  ORB = 'ORB', // Jump orb
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Player {
  id: number;
  pos: Vector2;
  velocity: Vector2;
  width: number;
  height: number;
  rotation: number;
  isGrounded: boolean;
  isDead: boolean;
  color: string;
  isAI: boolean;
  jumpInput: boolean; // Current frame input state
  hasFinished: boolean;
  name?: string;
}

export interface Obstacle {
  type: ObstacleType;
  x: number; // Grid units
  y: number; // Grid units
  width?: number; // Visual override
  height?: number; // Visual override
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface LevelData {
  name: string;
  obstacles: Obstacle[];
  floorY: number;
  length: number;
  seed?: string;
}

export type GameMode = 'SOLO' | 'LOCAL_MULTI' | 'VS_AI' | 'ONLINE';

export interface Settings {
  volume: number;
  username: string;
  playerColor: string;
}

export interface PlayerResult {
  id: number;
  name: string;
  isDead: boolean;
  hasFinished: boolean;
  progress: number; // percentage 0-100
}

export interface NetworkPacket {
  type: 'UPDATE' | 'DIE' | 'WIN' | 'RESTART' | 'PLAYER_JOIN' | 'PLAYER_LEAVE' | 'SYNC_PLAYERS' | 'WELCOME' | 'ROUND_OVER' | 'RETURN_TO_LOBBY' | 'HOST_DISCONNECT';
  data?: any;
}

export interface HighScoreEntry {
  name: string;
  score: number;
  mode: string;
  date: string;
}