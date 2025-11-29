import { LevelData, ObstacleType } from './types';

export const GRAVITY = 1.8;
export const JUMP_FORCE = -21;
export const MOVE_SPEED = 9.5;
export const TERMINAL_VELOCITY = 25;

export const GRID_SIZE = 60; // Size of one block in pixels
export const FLOOR_Y_GRID = 0; // The floor is at y=0 in grid coordinates

// Visuals
export const PLAYER_SIZE = 50;
export const CAMERA_OFFSET_X = 300; // Player stays at this X on screen

// Colors
export const COLORS = {
  background: '#1a1a2e',
  backgroundGrid: '#252540',
  floor: '#16213e',
  floorLine: '#00d4ff',
  player1: '#00d4ff', // Cyan
  player2: '#ff2e63', // Red
  spike: '#e94560',
  block: '#0f3460',
  blockBorder: '#533483',
  orb: '#fcd307',
};

// Default "Stereo Madness" inspired level segment
// Shifted by +20 grid units (approx 2 screens) to give player time to prepare
const START_OFFSET = 25;

const BASE_LEVEL: LevelData = {
  name: "Neon Genesis",
  floorY: 0,
  length: 400, // Grid units
  obstacles: [
    // Intro (Simple Jumps)
    { type: ObstacleType.SPIKE, x: START_OFFSET + 8, y: 0 },
    { type: ObstacleType.SPIKE, x: START_OFFSET + 15, y: 0 },
    { type: ObstacleType.BLOCK, x: START_OFFSET + 21, y: 0 }, // Moved from 18 to 21 to make it easier
    { type: ObstacleType.SPIKE, x: START_OFFSET + 25, y: 0 },
    { type: ObstacleType.SPIKE, x: START_OFFSET + 26, y: 0 },

    // Simple Staircase
    { type: ObstacleType.BLOCK, x: START_OFFSET + 32, y: 0 },
    { type: ObstacleType.BLOCK, x: START_OFFSET + 33, y: 1 },
    { type: ObstacleType.BLOCK, x: START_OFFSET + 34, y: 2 },
    { type: ObstacleType.SPIKE, x: START_OFFSET + 35, y: 0 },
    { type: ObstacleType.SPIKE, x: START_OFFSET + 36, y: 0 },
    { type: ObstacleType.BLOCK, x: START_OFFSET + 39, y: 0 },

    // Drops
    { type: ObstacleType.BLOCK, x: START_OFFSET + 45, y: 0 },
    { type: ObstacleType.SPIKE, x: START_OFFSET + 45, y: 1 }, // Spike on block
    { type: ObstacleType.BLOCK, x: START_OFFSET + 50, y: 0 },
    { type: ObstacleType.BLOCK, x: START_OFFSET + 50, y: 1 },

    // Double Spikes
    { type: ObstacleType.SPIKE, x: START_OFFSET + 60, y: 0 },
    { type: ObstacleType.SPIKE, x: START_OFFSET + 61, y: 0 },

    // Platforming
    { type: ObstacleType.PLATFORM, x: START_OFFSET + 68, y: 2 },
    { type: ObstacleType.PLATFORM, x: START_OFFSET + 72, y: 4 },
    { type: ObstacleType.SPIKE, x: START_OFFSET + 75, y: 0 },
    { type: ObstacleType.PLATFORM, x: START_OFFSET + 78, y: 3 },

    // Rapid section
    { type: ObstacleType.BLOCK, x: START_OFFSET + 88, y: 0 },
    { type: ObstacleType.BLOCK, x: START_OFFSET + 89, y: 0 },
    { type: ObstacleType.BLOCK, x: START_OFFSET + 90, y: 0 },
    { type: ObstacleType.SPIKE, x: START_OFFSET + 91, y: 0 },

    // Rhythm section
    { type: ObstacleType.BLOCK, x: START_OFFSET + 100, y: 0 },
    { type: ObstacleType.SPIKE, x: START_OFFSET + 103, y: 0 },
    { type: ObstacleType.BLOCK, x: START_OFFSET + 106, y: 0 },
    { type: ObstacleType.SPIKE, x: START_OFFSET + 109, y: 0 },

    // Finale
    { type: ObstacleType.BLOCK, x: START_OFFSET + 120, y: 0 },
    { type: ObstacleType.BLOCK, x: START_OFFSET + 121, y: 1 },
    { type: ObstacleType.BLOCK, x: START_OFFSET + 122, y: 2 },
    { type: ObstacleType.BLOCK, x: START_OFFSET + 123, y: 3 },
    { type: ObstacleType.BLOCK, x: START_OFFSET + 124, y: 2 },
    { type: ObstacleType.BLOCK, x: START_OFFSET + 125, y: 1 },
    { type: ObstacleType.BLOCK, x: START_OFFSET + 126, y: 0 },
  ],
};

// Generate more obstacles procedurally for a longer level
// Start generating after the manual section
const GEN_START = START_OFFSET + 135;
const GEN_END = START_OFFSET + 300;

for (let i = GEN_START; i < GEN_END; i += 8) {
  if (Math.random() > 0.3) {
    BASE_LEVEL.obstacles.push({ type: ObstacleType.SPIKE, x: i, y: 0 });
  } else {
    BASE_LEVEL.obstacles.push({ type: ObstacleType.BLOCK, x: i, y: 0 });
    if (Math.random() > 0.5) BASE_LEVEL.obstacles.push({ type: ObstacleType.SPIKE, x: i, y: 1 });
  }
}

export const INITIAL_LEVEL = BASE_LEVEL;