import { LevelData, Platform, Entity, EntityType, LevelTheme, EnemySubtype } from '../types';
import { BOSS_LEVELS, THEMES } from '../constants';

// Deterministic Random Number Generator
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  
  // Returns 0 to 1
  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  // Returns range [min, max)
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Returns true/false based on probability
  bool(chance: number = 0.5): boolean {
    return this.next() < chance;
  }
}

const getThemeForLevel = (levelIndex: number): LevelTheme => {
  if (levelIndex <= 3) return THEMES.INDUSTRIAL;
  if (levelIndex <= 6) return THEMES.MAGMA;
  if (levelIndex <= 9) return THEMES.CYBER;
  return THEMES.VOID;
};

export const generateLevel = (levelIndex: number): LevelData => {
  const isBoss = BOSS_LEVELS.includes(levelIndex);
  // Longer levels: Base 4000 + scaling
  const width = isBoss ? 2000 : 4000 + (levelIndex * 600); 
  const height = 1400; // Taller for more verticality
  const theme = getThemeForLevel(levelIndex);
  
  // Initialize seeded random for this specific level
  const rng = new SeededRandom(levelIndex * 12345);

  const platforms: Platform[] = [];
  const enemies: Entity[] = [];
  const collectibles: Entity[] = [];
  const projectiles: Entity[] = [];
  let boss: Entity | undefined;

  // --- Boundaries ---
  platforms.push({ x: -200, y: -2000, w: 200, h: 4000, type: 'solid', renderType: 'invisible' });
  platforms.push({ x: width, y: -2000, w: 200, h: 4000, type: 'solid', renderType: 'wall' });

  // --- Level Architecture ---
  const groundY = height - 150;
  
  if (isBoss) {
    // Arena Floor
    platforms.push({ x: 0, y: groundY, w: width, h: 500, type: 'solid', renderType: 'ground' });
    
    // Boss Platforms
    platforms.push({ x: 200, y: height - 400, w: 300, h: 30, type: 'solid', renderType: 'platform' });
    platforms.push({ x: width - 500, y: height - 400, w: 300, h: 30, type: 'solid', renderType: 'platform' });
    platforms.push({ x: width / 2 - 150, y: height - 600, w: 300, h: 30, type: 'solid', renderType: 'platform' });

    boss = {
      id: `boss-${levelIndex}`,
      type: EntityType.BOSS,
      x: width - 400,
      y: height - 300,
      w: 180,
      h: 180,
      vx: 0,
      vy: 0,
      color: theme.hazardColor,
      health: 40 + (levelIndex * 10),
      maxHealth: 40 + (levelIndex * 10),
      isGrounded: false,
      facingRight: false,
      state: 'idle',
      frameTimer: 0,
      jumpCount: 0,
      invincibleTimer: 0
    };
  } else {
    // Procedural (Deterministic) Generation
    
    let cx = 0;
    
    // 1. Safe Start Zone
    platforms.push({ x: cx, y: groundY, w: 800, h: 500, type: 'solid', renderType: 'ground' });
    cx += 800;

    while (cx < width - 800) {
        const sectionType = rng.range(0, 10);

        if (sectionType < 3) {
            // A. The Pit (No ground, just floating platforms)
            const gapSize = rng.range(600, 1200);
            const numPlats = Math.floor(gapSize / 300);
            
            for(let i=0; i<numPlats; i++) {
                const px = cx + (i * 250) + rng.range(0, 50);
                const py = groundY - rng.range(100, 400);
                const pw = rng.range(120, 200);
                
                platforms.push({
                    x: px, y: py, w: pw, h: 30, type: 'solid', renderType: 'platform'
                });

                // Chance for Flyer Enemy over pits
                if (rng.bool(0.4)) {
                     enemies.push({
                        id: `flyer-${px}`,
                        type: EntityType.ENEMY,
                        subtype: 'flyer',
                        x: px, y: py - 200, w: 50, h: 40,
                        vx: 0, vy: 0,
                        color: theme.accentColor,
                        health: 2, maxHealth: 2,
                        isGrounded: false, facingRight: false, state: 'idle', frameTimer: 0, jumpCount: 0, invincibleTimer: 0
                    });
                }
            }
            cx += gapSize;

        } else if (sectionType < 6) {
            // B. High Ground / Low Ground
            const length = rng.range(500, 900);
            // Lower ground
            platforms.push({ x: cx, y: groundY, w: length, h: 500, type: 'solid', renderType: 'ground' });
            
            // High platform
            const platH = 40;
            const platY = groundY - 300;
            platforms.push({ x: cx + 100, y: platY, w: length - 200, h: platH, type: 'solid', renderType: 'platform' });

            // Place Turret on high ground
            enemies.push({
                id: `turret-${cx}`,
                type: EntityType.ENEMY,
                subtype: 'turret',
                x: cx + (length/2), y: platY - 50, w: 50, h: 50,
                vx: 0, vy: 0,
                color: theme.hazardColor,
                health: 4, maxHealth: 4,
                isGrounded: true, facingRight: false, state: 'idle', frameTimer: 0, jumpCount: 0, invincibleTimer: 0
            });

            cx += length;
        } else {
            // C. Standard Broken Ground
            const length = rng.range(300, 700);
            platforms.push({ x: cx, y: groundY, w: length, h: 500, type: 'solid', renderType: 'ground' });

            // Patroller Enemy
            if (length > 400) {
                 enemies.push({
                    id: `patrol-${cx}`,
                    type: EntityType.ENEMY,
                    subtype: 'patroller',
                    x: cx + 200, y: groundY - 60, w: 60, h: 60,
                    vx: 0, vy: 0,
                    color: '#ffffff',
                    health: 3, maxHealth: 3,
                    isGrounded: true, facingRight: rng.bool(), state: 'idle', frameTimer: 0, jumpCount: 0, invincibleTimer: 0
                });
            }

            // Gap after ground
            cx += length + rng.range(50, 200);
        }

        // Random floating platforms throughout
        if (rng.bool(0.3)) {
             const px = cx - 100;
             const py = groundY - rng.range(200, 500);
             platforms.push({
                x: px, y: py, w: rng.range(100, 150), h: 20, type: 'solid', renderType: 'platform'
             });
             
             // Heart on hard to reach platform
             if (rng.bool(0.5)) {
                 collectibles.push({
                    id: `heart-${px}`,
                    type: EntityType.COLLECTIBLE,
                    x: px + 20, y: py - 50, w: 30, h: 30,
                    vx: 0, vy: 0, color: '#fb7185',
                    health: 1, maxHealth: 1, isGrounded: false, facingRight: true, state: 'idle', frameTimer: 0, jumpCount: 0, invincibleTimer: 0
                 });
             }
        }
    }
    
    // Final End Zone
    platforms.push({ x: cx, y: groundY, w: 800, h: 500, type: 'solid', renderType: 'ground' });
  }

  return {
    id: levelIndex,
    name: isBoss ? `BOSS: ${theme.name}` : `${theme.name} - Zone ${levelIndex}`,
    width,
    height,
    theme,
    platforms,
    enemies,
    collectibles,
    projectiles,
    boss,
    startPos: { x: 200, y: height - 400 },
    endPos: { x: width - 200, y: height - 400 }
  };
};