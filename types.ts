export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export enum EntityType {
  PLAYER,
  ENEMY,
  BOSS,
  PROJECTILE,
  PARTICLE,
  COLLECTIBLE
}

export type EnemySubtype = 'patroller' | 'flyer' | 'turret';

export interface Entity extends Rect {
  id: string;
  type: EntityType;
  subtype?: EnemySubtype; // New field for enemy behavior
  vx: number;
  vy: number;
  color: string;
  health: number;
  maxHealth: number;
  isGrounded: boolean;
  facingRight: boolean;
  state: 'idle' | 'run' | 'jump' | 'attack' | 'hit' | 'dead';
  frameTimer: number;
  jumpCount: number;
  invincibleTimer: number; // Time in seconds remaining for invincibility
}

export interface Platform extends Rect {
  type: 'solid' | 'oneway' | 'hazard';
  renderType?: 'ground' | 'platform' | 'wall' | 'invisible';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  decay: number;
}

export interface GameSettings {
  rayTracing: boolean;
  particles: boolean;
  musicVolume: number;
  sfxVolume: number;
}

export interface LevelTheme {
  name: string;
  backgroundTop: string;
  backgroundBottom: string;
  platformColor: string;
  platformDetail: string;
  accentColor: string;
  hazardColor: string;
}

export interface LevelData {
  id: number;
  name: string;
  width: number;
  height: number;
  theme: LevelTheme;
  platforms: Platform[];
  enemies: Entity[];
  collectibles: Entity[]; 
  projectiles: Entity[]; // New array for turret shots
  boss?: Entity;
  startPos: Vector2;
  endPos: Vector2; 
}