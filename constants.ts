export const GRAVITY = 0.6;
export const FRICTION = 0.85;
export const MOVE_SPEED = 0.8;
export const MAX_SPEED = 6;
export const JUMP_FORCE = -14;
export const WALL_SLIDE_SPEED = 2;
export const WALL_JUMP_FORCE = { x: 8, y: -12 };

export const BOSS_LEVELS = [6, 12];
export const TOTAL_LEVELS = 12;

export const FLOUNDER_LOGO_URL = 'https://flounder.news/assets/img/logo.png';

export const THEMES = {
  INDUSTRIAL: {
    name: 'Industrial Deep',
    backgroundTop: '#020617', // Slate 950
    backgroundBottom: '#1e293b', // Slate 800
    platformColor: '#0f172a', // Slate 900
    platformDetail: '#334155', // Slate 700
    accentColor: '#38bdf8', // Sky Blue
    hazardColor: '#ef4444',
  },
  MAGMA: {
    name: 'Core Foundry',
    backgroundTop: '#270808', // Dark Red
    backgroundBottom: '#450a0a', // Red 900
    platformColor: '#1a0505', 
    platformDetail: '#7f1d1d', // Red 900
    accentColor: '#f59e0b', // Amber
    hazardColor: '#ff0000',
  },
  CYBER: {
    name: 'Neon District',
    backgroundTop: '#0f0518', // Dark Purple
    backgroundBottom: '#2e1065', // Violet 900
    platformColor: '#170621',
    platformDetail: '#4c1d95',
    accentColor: '#d8b4fe', // Lavender
    hazardColor: '#d946ef', // Fuschia
  },
  VOID: {
    name: 'The Ethereal',
    backgroundTop: '#000000',
    backgroundBottom: '#171717', // Neutral 900
    platformColor: '#000000',
    platformDetail: '#404040',
    accentColor: '#ffffff',
    hazardColor: '#dc2626',
  }
};

export const COLORS = {
  background: '#0a0a0e',
  foreground: '#000000',
  player: '#ffffff',
  accent: '#a3cdff',
  danger: '#ff4d4d',
  gold: '#ffd700',
  boss: '#ff2a2a',
  shadow: 'rgba(0,0,0,0.7)',
  light: 'rgba(255, 255, 255, 0.1)'
};
