// High Score Service - stores in both localStorage and cookies for redundancy

export interface HighScoreEntry {
  name: string;
  score: number;
  mode: string;
  date: string;
}

const STORAGE_KEY = 'neondash_highscores';
const COOKIE_KEY = 'neondash_highscores';
const MAX_SCORES = 10;

// Cookie helpers
const setCookie = (name: string, value: string, days: number = 365) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

// Get high scores from localStorage, fallback to cookies
export const getHighScores = (): HighScoreEntry[] => {
  try {
    // Try localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Fallback to cookies
    const cookieData = getCookie(COOKIE_KEY);
    if (cookieData) {
      const scores = JSON.parse(cookieData);
      // Sync to localStorage
      localStorage.setItem(STORAGE_KEY, cookieData);
      return scores;
    }
  } catch (e) {
    console.error('Failed to load high scores:', e);
  }
  return [];
};

// Save a new high score
export const saveHighScore = (entry: Omit<HighScoreEntry, 'date'>): boolean => {
  const scores = getHighScores();
  const now = new Date();
  const newEntry: HighScoreEntry = {
    ...entry,
    date: now.toISOString()
  };
  
  // Check for duplicate (same name, score, and mode within last 5 seconds)
  const isDuplicate = scores.some(s => 
    s.name === newEntry.name && 
    s.score === newEntry.score && 
    s.mode === newEntry.mode &&
    Math.abs(now.getTime() - new Date(s.date).getTime()) < 5000
  );
  
  if (isDuplicate) {
    console.log('Duplicate high score detected, skipping save');
    return false;
  }
  
  scores.push(newEntry);
  
  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  
  // Keep only top scores
  const trimmed = scores.slice(0, MAX_SCORES);
  
  try {
    const json = JSON.stringify(trimmed);
    // Save to both localStorage and cookies
    localStorage.setItem(STORAGE_KEY, json);
    setCookie(COOKIE_KEY, json);
    return true;
  } catch (e) {
    console.error('Failed to save high score:', e);
    return false;
  }
};

// Check if a score qualifies for the leaderboard
export const isHighScore = (score: number): boolean => {
  const scores = getHighScores();
  if (scores.length < MAX_SCORES) return true;
  return score > scores[scores.length - 1].score;
};

// Clear all high scores
export const clearHighScores = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  setCookie(COOKIE_KEY, '[]', -1);
};
