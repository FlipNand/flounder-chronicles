import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Sparkles, Terminal } from 'lucide-react';
import { Entity, GameSettings, LevelData, EntityType, Particle, Vector2 } from '../types';
import { GRAVITY, FRICTION, MOVE_SPEED, MAX_SPEED, JUMP_FORCE, FLOUNDER_LOGO_URL, TOTAL_LEVELS, COLORS } from '../constants';
import { checkAABB, resolveCollision } from '../utils/geometry';
import { generateLevel } from '../services/LevelGenerator';
import { audioManager } from '../utils/audio';

interface GameProps {
  settings: GameSettings;
  onExit: () => void;
  onWin: () => void;
}

export const Game: React.FC<GameProps> = ({ settings, onExit, onWin }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [levelIndex, setLevelIndex] = useState(1);
  const [health, setHealth] = useState(5);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gameOver, setGameOver] = useState(false);

  // Dev Terminal State
  const [showTerminal, setShowTerminal] = useState(false);
  const [termInput, setTermInput] = useState('');
  const [termLog, setTermLog] = useState<string[]>(['> Flounder Dev Console v1.0']);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  // Assets
  const playerImage = useRef<HTMLImageElement>(new Image());

  // Game State Refs
  const gameState = useRef<{
    level: LevelData | null;
    player: Entity;
    particles: Particle[];
    camera: Vector2;
    keys: { [key: string]: boolean };
    prevJumpPressed: boolean;
    lastTime: number;
    shake: number;
    damageShake: number; 
    backgroundOffset: number;
  }>({
    level: null,
    player: {
      id: 'player',
      type: EntityType.PLAYER,
      x: 0, y: 0, w: 40, h: 40,
      vx: 0, vy: 0,
      color: COLORS.player,
      health: 5, maxHealth: 5,
      isGrounded: false,
      facingRight: true,
      state: 'idle',
      frameTimer: 0,
      jumpCount: 0,
      invincibleTimer: 0
    },
    particles: [],
    camera: { x: 0, y: 0 },
    keys: {},
    prevJumpPressed: false,
    lastTime: 0,
    shake: 0,
    damageShake: 0,
    backgroundOffset: 0
  });

  // Load Assets and Init Audio
  useEffect(() => {
    playerImage.current.src = FLOUNDER_LOGO_URL;
    playerImage.current.onload = () => setLoading(false);
    playerImage.current.onerror = () => setLoading(false);
    
    // Init Audio
    audioManager.init();
    audioManager.setVolume(settings.sfxVolume);

    startLevel(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update Volume when settings change
  useEffect(() => {
      audioManager.setVolume(settings.sfxVolume);
  }, [settings.sfxVolume]);

  // Handle Resize & High DPI
  const handleResize = useCallback(() => {
    if (canvasRef.current) {
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = window.innerWidth * dpr;
      canvasRef.current.height = window.innerHeight * dpr;
      canvasRef.current.style.width = `${window.innerWidth}px`;
      canvasRef.current.style.height = `${window.innerHeight}px`;
      
      const ctx = canvasRef.current.getContext('2d');
      if(ctx) ctx.scale(dpr, dpr);
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Focus terminal input when opened
  useEffect(() => {
    if (showTerminal && terminalInputRef.current) {
        terminalInputRef.current.focus();
    }
  }, [showTerminal]);

  const startLevel = (idx: number) => {
    const data = generateLevel(idx);
    gameState.current.level = data;
    resetPlayerPosition(data);
    gameState.current.particles = [];
    setGameOver(false);
    setHealth(5);
    setPaused(false);
    gameState.current.shake = 0;
    gameState.current.damageShake = 0;
    gameState.current.player.invincibleTimer = 0;
    
    // Snap camera immediately to player, clamped to bounds
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    
    // Center camera on player start pos
    let camX = data.startPos.x - screenW / 2 + 20; // +20 for half player width
    let camY = data.startPos.y - screenH / 2;

    // Clamp Camera
    camX = Math.max(0, Math.min(camX, data.width - screenW));
    camY = Math.max(-200, Math.min(camY, data.height - screenH + 200));

    gameState.current.camera.x = camX;
    gameState.current.camera.y = camY;

    // Reset lastTime to avoid huge dt spike on restart
    gameState.current.lastTime = performance.now();
  };

  const resetPlayerPosition = (level: LevelData) => {
    gameState.current.player.x = level.startPos.x;
    gameState.current.player.y = level.startPos.y;
    gameState.current.player.vx = 0;
    gameState.current.player.vy = 0;
    gameState.current.player.jumpCount = 0;
    gameState.current.player.invincibleTimer = 0;
  };

  const handleRestart = () => {
    startLevel(levelIndex);
  };

  const executeCommand = (input: string) => {
      const parts = input.trim().split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);
      
      setTermLog(prev => [...prev, `$ ${input}`]);

      if (cmd === 'level.set' || cmd === 'level') {
          const lvl = parseInt(args[0]);
          if (!isNaN(lvl) && lvl >= 1 && lvl <= TOTAL_LEVELS) {
              setLevelIndex(lvl);
              startLevel(lvl);
              setTermLog(prev => [...prev, `> Loaded level ${lvl}`]);
              setShowTerminal(false);
          } else {
              setTermLog(prev => [...prev, `> Error: Invalid level (1-${TOTAL_LEVELS})`]);
          }
      } else if (cmd === 'heal') {
          setHealth(5);
          setTermLog(prev => [...prev, `> Health restored to 5`]);
      } else if (cmd === 'clear') {
          setTermLog(['> Console cleared']);
      } else if (cmd === 'help') {
          setTermLog(prev => [...prev, `> Commands: level.set <n>, heal, clear`]);
      } else {
          setTermLog(prev => [...prev, `> Unknown command: ${cmd}`]);
      }
      setTermInput('');
  };

  const createParticle = (x: number, y: number, color: string, speed = 2, size = 3, count = 1) => {
    if (!settings.particles) return;
    for(let i=0; i<count; i++) {
        gameState.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        life: 1.0,
        maxLife: 1.0,
        size: Math.random() * size + 1,
        color,
        decay: 0.02 + Math.random() * 0.03
        });
    }
  };

  const spawnProjectile = (x: number, y: number, vx: number, vy: number) => {
      if(!gameState.current.level) return;
      audioManager.playShoot(); // Turret sound
      gameState.current.level.projectiles.push({
          id: `proj-${Date.now()}-${Math.random()}`,
          type: EntityType.PROJECTILE,
          x, y, w: 15, h: 15,
          vx, vy,
          color: '#fbbf24', // Amber
          health: 1, maxHealth: 1,
          isGrounded: false, facingRight: vx > 0, state: 'idle', frameTimer: 0, jumpCount: 0, invincibleTimer: 0
      });
  };

  const update = (dt: number) => {
    if (paused || gameOver || showTerminal || !gameState.current.level) return;
    const state = gameState.current;
    const { player, keys, level } = state;

    // Invincibility Timer
    if (player.invincibleTimer > 0) {
        player.invincibleTimer -= (dt * 0.01667); // Approx seconds
    }

    // --- Player Movement ---
    if (keys['ArrowRight'] || keys['d']) {
      player.vx += MOVE_SPEED;
      player.facingRight = true;
    }
    if (keys['ArrowLeft'] || keys['a']) {
      player.vx -= MOVE_SPEED;
      player.facingRight = false;
    }

    player.vx *= FRICTION;
    player.vy += GRAVITY;
    player.vx = Math.max(Math.min(player.vx, MAX_SPEED), -MAX_SPEED);

    // Double Jump
    const jumpPressed = keys['ArrowUp'] || keys['w'] || keys[' '];
    if (player.isGrounded) player.jumpCount = 0;
    if (jumpPressed && !state.prevJumpPressed) {
        if (player.isGrounded || player.jumpCount < 2) {
            player.vy = JUMP_FORCE;
            player.isGrounded = false;
            player.jumpCount++;
            audioManager.playJump(); // SOUND
            if (player.jumpCount === 2) {
                createParticle(player.x + player.w/2, player.y + player.h, level.theme.accentColor, 8, 4, 10);
            } else {
                createParticle(player.x + player.w/2, player.y + player.h, '#fff', 5, 5, 5);
            }
        }
    }
    state.prevJumpPressed = jumpPressed;

    player.x += player.vx;
    player.y += player.vy;

    // --- Collision Detection ---
    player.isGrounded = false;
    level.platforms.forEach(plat => {
      const xOverlap = player.x < plat.x + plat.w + 100 && player.x + player.w > plat.x - 100;
      const yDist = Math.abs(player.y - plat.y);
      if (xOverlap && yDist < 1000) resolveCollision(player, plat);
    });

    if (player.y > 2000) {
      setHealth(0);
      state.shake = 20; // Falling to death is instant, ignores invincibility
      audioManager.playDamage(); // SOUND
    }

    // --- Collectibles ---
    for (let i = level.collectibles.length - 1; i >= 0; i--) {
        const c = level.collectibles[i];
        c.frameTimer += 0.05;
        c.y += Math.sin(c.frameTimer) * 0.3;
        if (checkAABB(player, c)) {
            createParticle(c.x + c.w/2, c.y + c.h/2, level.theme.accentColor, 6, 4, 12);
            if (health < 5) setHealth(h => Math.min(h + 1, 5));
            audioManager.playCollect(); // SOUND
            level.collectibles.splice(i, 1);
        }
    }

    // --- Enemies ---
    for (let i = level.enemies.length - 1; i >= 0; i--) {
        const enemy = level.enemies[i];
        
        if (enemy.subtype === 'flyer') {
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 600) {
                enemy.vx += (dx / dist) * 0.2;
                enemy.vy += (dy / dist) * 0.2;
                enemy.vx *= 0.95;
                enemy.vy *= 0.95;
            }
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
        } else if (enemy.subtype === 'turret') {
            enemy.frameTimer += dt;
            if (enemy.frameTimer > 150) { 
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 800) {
                     spawnProjectile(enemy.x + enemy.w/2, enemy.y + enemy.h/2, (dx/dist)*8, (dy/dist)*8);
                }
                enemy.frameTimer = 0;
            }
        } else {
            // Patroller
            if (!enemy.vx) enemy.vx = 2;
            enemy.x += enemy.vx;
            if (Math.random() < 0.01) enemy.vx *= -1;
            enemy.vy += GRAVITY;
            enemy.y += enemy.vy;
            level.platforms.forEach(plat => {
                 if (Math.abs(enemy.x - plat.x) < 500 && Math.abs(enemy.y - plat.y) < 500) resolveCollision(enemy, plat);
            });
        }
        
        enemy.facingRight = enemy.vx > 0;
        
        if (checkAABB(player, enemy)) {
             if (player.vy > 0 && player.y + player.h < enemy.y + enemy.h * 0.8) {
                 // Player kills enemy (Stomp)
                 createParticle(enemy.x + enemy.w/2, enemy.y + enemy.h/2, enemy.color, 8, 8, 12);
                 level.enemies.splice(i, 1);
                 player.vy = -12;
                 player.jumpCount = 0;
                 state.shake = 3; 
                 audioManager.playEnemyDeath(); // SOUND
             } else {
                 // Enemy hits player
                 if (player.invincibleTimer <= 0) {
                     // Reduced knockback (MAX_SPEED is 6, so 3 is half speed)
                     // This prevents "speeding up" when hit
                     player.vx = player.x < enemy.x ? -3 : 3;
                     player.vy = -5; // Slight pop up
                     setHealth(h => h - 1);
                     state.damageShake = 10; 
                     createParticle(player.x, player.y, '#fff', 5, 2, 5);
                     
                     // Trigger Invincibility (2 seconds)
                     player.invincibleTimer = 2.0;
                     audioManager.playDamage(); // SOUND
                 }
             }
        }
    }

    // --- Projectiles ---
    for (let i = level.projectiles.length - 1; i >= 0; i--) {
        const p = level.projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        
        if (Math.abs(p.x - player.x) > 1500) {
            level.projectiles.splice(i, 1);
            continue;
        }

        if (checkAABB(p, player)) {
            if (player.invincibleTimer <= 0) {
                setHealth(h => h - 1);
                state.damageShake = 8;
                createParticle(player.x, player.y, level.theme.hazardColor, 5, 3, 8);
                player.invincibleTimer = 2.0; // Invincibility on projectile hit
                audioManager.playDamage(); // SOUND
            }
            level.projectiles.splice(i, 1);
            continue;
        }
        
        let hit = false;
        level.platforms.forEach(plat => {
            if (checkAABB(p, plat)) hit = true;
        });
        if (hit) {
            createParticle(p.x, p.y, p.color, 3, 2, 4);
            level.projectiles.splice(i, 1);
        }
    }

    // --- Boss ---
    if (level.boss && level.boss.health > 0) {
         const boss = level.boss;
         const dx = player.x - boss.x;
         const dy = player.y - boss.y;
         boss.x += (dx * 0.01);
         boss.y += (dy * 0.01);
         if (checkAABB(player, boss)) {
             if (player.vy > 0 && player.y < boss.y) {
                 boss.health--;
                 player.vy = -12;
                 audioManager.playEnemyDeath(); // Sound for boss hit
             } else {
                 if (player.invincibleTimer <= 0) {
                     setHealth(h => h-1);
                     player.vx = -8;
                     state.damageShake = 15;
                     player.invincibleTimer = 2.0;
                     audioManager.playDamage(); // SOUND
                 }
             }
         }
    }

    // --- Particles ---
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    // --- Level End ---
    const distToEnd = Math.sqrt(Math.pow(player.x - level.endPos.x, 2) + Math.pow(player.y - level.endPos.y, 2));
    if (distToEnd < 150 && (!level.boss || level.boss.health <= 0)) {
      if (levelIndex < TOTAL_LEVELS) {
        setLevelIndex(prev => {
          const next = prev + 1;
          startLevel(next);
          audioManager.playCollect(); // Level finish sound
          return next;
        });
      } else {
        onWin();
      }
    }

    // --- Camera Follow ---
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const targetCamX = player.x - (screenW / 2) + (player.vx * 20);
    const targetCamY = player.y - (screenH / 2) + (player.vy * 10);
    
    // Smooth Lerp
    state.camera.x += (targetCamX - state.camera.x) * 0.08; 
    state.camera.y += (targetCamY - state.camera.y) * 0.08;

    // Clamp Camera to Level Bounds
    state.camera.x = Math.max(0, Math.min(state.camera.x, level.width - screenW));
    state.camera.y = Math.max(-500, Math.min(state.camera.y, level.height - screenH + 200));

    state.backgroundOffset += 0.2;

    // Decay Shakes
    if (state.shake > 0) {
      state.camera.x += (Math.random() - 0.5) * state.shake;
      state.camera.y += (Math.random() - 0.5) * state.shake;
      state.shake *= 0.9;
      if (state.shake < 0.5) state.shake = 0;
    }

    if (state.damageShake > 0) {
        state.damageShake *= 0.9;
        if (state.damageShake < 0.5) state.damageShake = 0;
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;
    if (!state.level) return;
    const theme = state.level.theme;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    drawBackground(ctx, width, height, theme);

    ctx.save();
    
    if (state.damageShake > 0) {
        const dx = (Math.random() - 0.5) * state.damageShake;
        const dy = (Math.random() - 0.5) * state.damageShake;
        ctx.translate(dx, dy);
    }
    
    ctx.translate(-state.camera.x, -state.camera.y);

    // --- Draw Platforms ---
    state.level.platforms.forEach(plat => {
      if (plat.renderType === 'invisible') return;
      if (plat.x > state.camera.x + width || plat.x + plat.w < state.camera.x) return;

      if (plat.renderType === 'ground') {
          ctx.fillStyle = theme.platformColor;
          ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
          ctx.fillStyle = theme.platformDetail;
          ctx.fillRect(plat.x, plat.y, plat.w, 15);
          ctx.fillStyle = theme.backgroundTop;
          for (let i=0; i < plat.w; i+= 50) {
              if ((plat.x + i) % 200 === 0) {
                 ctx.fillRect(plat.x + i, plat.y + 15, 4, 30);
              }
          }
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(plat.x, plat.y, plat.w, 2);

      } else {
          const grad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
          grad.addColorStop(0, theme.platformDetail);
          grad.addColorStop(1, theme.platformColor);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 4);
          ctx.fill();
          ctx.strokeStyle = theme.accentColor;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
      }
    });

    // --- Draw Collectibles ---
    state.level.collectibles.forEach(c => {
        ctx.save();
        ctx.translate(c.x + c.w/2, c.y + c.h/2);
        const scale = 1.0 + Math.sin(Date.now() / 200) * 0.1;
        ctx.scale(scale, scale);
        ctx.fillStyle = theme.hazardColor;
        if (settings.rayTracing) {
            ctx.shadowColor = theme.hazardColor;
            ctx.shadowBlur = 15;
        }
        const w = c.w, h = c.h;
        ctx.beginPath();
        const topCurveHeight = h * 0.3;
        ctx.moveTo(0, topCurveHeight);
        ctx.bezierCurveTo(0, -h * 0.2, -w / 2, -h * 0.2, -w / 2, topCurveHeight);
        ctx.bezierCurveTo(-w / 2, h * 0.4, 0, h * 0.5, 0, h * 0.5);
        ctx.bezierCurveTo(0, h * 0.5, w / 2, h * 0.4, w / 2, topCurveHeight);
        ctx.bezierCurveTo(w / 2, -h * 0.2, 0, -h * 0.2, 0, topCurveHeight);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    });

    // --- Draw Projectiles ---
    state.level.projectiles.forEach(p => {
        ctx.fillStyle = p.color;
        if(settings.rayTracing) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // --- Draw Enemies ---
    state.level.enemies.forEach(enemy => {
        if (enemy.subtype === 'turret') {
            // Draw Turret
            ctx.save();
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(enemy.x, enemy.y + enemy.h/2, enemy.w, enemy.h/2);
            ctx.translate(enemy.x + enemy.w/2, enemy.y + enemy.h/2);
            ctx.rotate(Date.now() / 1000);
            ctx.fillStyle = enemy.color;
            if (settings.rayTracing) {
                ctx.shadowColor = enemy.color;
                ctx.shadowBlur = 15;
            }
            ctx.fillRect(-enemy.w/2, -enemy.h/2, enemy.w, enemy.h/2);
            ctx.shadowBlur = 0;
            ctx.restore();
        } else if (enemy.subtype === 'flyer') {
            // Updated Flying Enemy Visuals (Mechanical Bat/Drone)
            const cx = enemy.x + enemy.w/2;
            const cy = enemy.y + enemy.h/2;
            const floatOffset = Math.sin(Date.now()/200)*5;
            
            ctx.save();
            ctx.translate(cx, cy + floatOffset);
            
            // Wings Animation
            const wingFlap = Math.sin(Date.now()/50); // Fast flap
            
            // Left Wing
            ctx.save();
            ctx.scale(1, 1 + (wingFlap * 0.2));
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-enemy.w/2 - 10, -20);
            ctx.lineTo(-enemy.w/2, 10);
            ctx.lineTo(-10, 5);
            ctx.fill();
            ctx.strokeStyle = enemy.color;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
            
            // Right Wing
            ctx.save();
            ctx.scale(-1, 1 + (wingFlap * 0.2)); // Mirror
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-enemy.w/2 - 10, -20);
            ctx.lineTo(-enemy.w/2, 10);
            ctx.lineTo(-10, 5);
            ctx.fill();
            ctx.strokeStyle = enemy.color;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();

            // Main Body
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI*2);
            ctx.fill();

            // Glowing Eye
            ctx.fillStyle = enemy.color;
            if (settings.rayTracing) {
                ctx.shadowColor = enemy.color;
                ctx.shadowBlur = 15;
            }
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI*2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            ctx.restore();

        } else {
            // Draw Patroller
            ctx.save();
            const cx = enemy.x + enemy.w/2;
            const cy = enemy.y + enemy.h/2;
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.arc(cx, cy, enemy.w/2, Math.PI, 0);
            ctx.lineTo(cx + enemy.w/2, cy + enemy.h/2);
            ctx.lineTo(cx - enemy.w/2, cy + enemy.h/2);
            ctx.fill();
            ctx.fillStyle = '#000';
            for(let i=0; i<3; i++) {
                ctx.beginPath();
                ctx.moveTo(cx - 10 + (i*10), cy - 10);
                ctx.lineTo(cx - 5 + (i*10), cy - 25);
                ctx.lineTo(cx + (i*10), cy - 10);
                ctx.fill();
            }
            ctx.restore();
        }
    });

    // --- Boss ---
    if (state.level.boss && state.level.boss.health > 0) {
        const b = state.level.boss;
        ctx.fillStyle = b.color;
        if (settings.rayTracing) {
             ctx.shadowBlur = 50;
             ctx.shadowColor = b.color;
        }
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.shadowBlur = 0;
        
        const hpPercent = b.health / b.maxHealth;
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(b.x, b.y - 40, b.w, 12);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(b.x, b.y - 40, b.w * hpPercent, 12);
    }

    // --- Draw Player ---
    const p = state.player;
    ctx.save();
    
    // Invincibility Flash
    if (p.invincibleTimer > 0) {
        // Flash every 0.1s
        if (Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.3;
        }
    }
    
    if (playerImage.current && playerImage.current.complete && playerImage.current.naturalWidth > 0) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (!p.facingRight) {
            ctx.translate(p.x + p.w, p.y);
            ctx.scale(-1, 1);
            ctx.drawImage(playerImage.current, 0, 0, p.w, p.h);
        } else {
            ctx.drawImage(playerImage.current, p.x, p.y, p.w, p.h);
        }
    } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
    }
    ctx.restore();

    // --- Particles ---
    state.particles.forEach(pt => {
        ctx.globalAlpha = pt.life;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    // --- Exit Portal ---
    const end = state.level.endPos;
    if (settings.rayTracing) {
        ctx.shadowBlur = 40;
        ctx.shadowColor = theme.accentColor;
    }
    const t = Date.now() / 1000;
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(end.x, end.y, 40 + Math.sin(t)*5, 0, Math.PI*2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // --- Lighting/Vignette ---
    if (settings.rayTracing) {
       const grad = ctx.createRadialGradient(
           state.player.x + p.w/2, state.player.y + p.h/2, 100,
           state.player.x + p.w/2, state.player.y + p.h/2, window.innerHeight
       );
       grad.addColorStop(0, 'rgba(0,0,0,0)');
       grad.addColorStop(1, 'rgba(0,0,0,0.7)');
       ctx.fillStyle = grad;
       ctx.fillRect(state.camera.x, state.camera.y, width, height);
    }

    ctx.restore();
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, theme: any) => {
      const { camera, backgroundOffset } = gameState.current;
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, theme.backgroundTop);
      grad.addColorStop(1, theme.backgroundBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      const p1 = 0.15;
      const off1 = -(camera.x * p1) % width;
      const yOff1 = -(camera.y * p1 * 0.2) + height/2;
      ctx.fillStyle = theme.platformColor;
      ctx.globalAlpha = 0.5;
      
      const drawPillars = (offset: number) => {
          for(let i=0; i<8; i++) {
              const x = offset + (i * (width/6));
              const w = 60 + Math.sin(i*99) * 30;
              ctx.fillRect(x, -500, w, height * 2); 
              ctx.save();
              ctx.fillStyle = theme.accentColor;
              ctx.globalAlpha = 0.1;
              ctx.fillRect(x+10, yOff1 + Math.sin(i)*100, 5, 200);
              ctx.restore();
          }
      };
      drawPillars(off1);
      drawPillars(off1 + width);
      drawPillars(off1 - width);
      ctx.restore();
      
      if (settings.particles) {
          ctx.save();
          ctx.fillStyle = theme.accentColor;
          for(let i=0; i<40; i++) {
              const mx = (i * 200 + backgroundOffset * 0.5) % (width + 200) - 100;
              const my = (i * 137) % height;
              const size = (i % 3) + 1;
              ctx.globalAlpha = 0.1 + (Math.sin(i + backgroundOffset*0.01) * 0.05);
              ctx.beginPath();
              ctx.arc(mx, my, size, 0, Math.PI*2);
              ctx.fill();
          }
          ctx.restore();
      }
  };

  const loop = useCallback((time: number) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const dt = (time - gameState.current.lastTime) / 16.67;
    gameState.current.lastTime = time;
    update(dt);
    if (health <= 0 && !gameOver) setGameOver(true);
    draw(ctx);
    requestAnimationFrame(loop);
  }, [paused, levelIndex, settings, health, gameOver, showTerminal]);

  useEffect(() => {
    const animationId = requestAnimationFrame(loop);
    const handleKeyDown = (e: KeyboardEvent) => {
        // Toggle Terminal
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            setShowTerminal(prev => {
                const next = !prev;
                // Clear inputs if opening so we don't keep moving
                if (next) gameState.current.keys = {};
                return next;
            });
            return;
        }

        if (showTerminal) return; 

        gameState.current.keys[e.key] = true;
        if(e.key === 'Escape') setPaused(p => !p);
    };
    const handleKeyUp = (e: KeyboardEvent) => gameState.current.keys[e.key] = false;
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [loop, showTerminal]);

  if (gameOver) {
      return (
          <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white z-50 animate-fade-in">
              <div className="text-center p-8 border border-red-900/50 bg-red-950/20 rounded-xl backdrop-blur-sm">
                <h1 className="text-6xl font-cinzel text-red-600 mb-4 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]">YOU DIED</h1>
                <p className="mb-8 opacity-70 font-cinzel text-xl">The ink has dried on your story.</p>
                <div className="flex gap-4 justify-center">
                    <button onClick={handleRestart} className="px-8 py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition-transform hover:scale-105">
                        TRY AGAIN
                    </button>
                    <button onClick={onExit} className="px-8 py-3 border border-white/30 text-white font-bold rounded hover:bg-white/10 transition-colors">
                        GIVE UP
                    </button>
                </div>
              </div>
          </div>
      )
  }

  return (
    <div className="relative w-full h-screen bg-neutral-900 overflow-hidden cursor-none">
        {/* HUD */}
        <div className="absolute top-4 left-4 z-10 flex gap-4 text-white">
            <div className="bg-black/50 p-4 rounded-lg backdrop-blur-sm border border-white/10 shadow-lg">
                <div className="text-sm uppercase tracking-widest opacity-50 mb-1 flex items-center gap-2">
                    <Sparkles size={12} /> Vitality
                </div>
                <div className="flex gap-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-5 h-5 transition-all duration-300 transform ${i < health ? 'scale-100' : 'scale-75 opacity-30'}`}>
                             <svg viewBox="0 0 24 24" fill={i < health ? "#fb7185" : "none"} stroke="#fff" className="w-full h-full drop-shadow-md">
                                 <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                             </svg>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-black/50 p-4 rounded-lg backdrop-blur-sm border border-white/10 shadow-lg">
                <div className="text-sm uppercase tracking-widest opacity-50 mb-1">Chronicle</div>
                <div className="font-cinzel text-xl text-white">
                    {gameState.current.level?.name || levelIndex} 
                    <span className="text-xs opacity-50 ml-2">/ {TOTAL_LEVELS}</span>
                </div>
            </div>
        </div>

        {/* Dev Terminal */}
        {showTerminal && (
            <div className="absolute top-0 left-0 w-full bg-black/90 text-green-400 font-mono text-sm z-50 border-b border-green-900 shadow-xl p-4 animate-slide-down">
                <div className="flex items-center gap-2 mb-2 border-b border-green-900/50 pb-2">
                    <Terminal size={16} /> 
                    <span className="font-bold">FLOUNDER_DEV_CONSOLE</span>
                </div>
                <div className="max-h-40 overflow-y-auto mb-2 space-y-1 opacity-80">
                    {termLog.map((log, i) => <div key={i}>{log}</div>)}
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-green-600">{'>'}</span>
                    <input 
                        ref={terminalInputRef}
                        type="text" 
                        value={termInput}
                        onChange={(e) => setTermInput(e.target.value)}
                        onKeyDown={(e) => {
                            e.stopPropagation(); // Prevent game keys
                            if (e.key === 'Enter') executeCommand(termInput);
                        }}
                        className="bg-transparent border-none outline-none flex-1 text-green-400 placeholder-green-900"
                        placeholder="Enter command..."
                    />
                </div>
            </div>
        )}

        {paused && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-40 flex flex-col items-center justify-center animate-fade-in">
                <h2 className="text-5xl font-cinzel text-white mb-10 tracking-wider">PAUSED</h2>
                <div className="flex flex-col gap-4 w-64">
                    <button onClick={() => setPaused(false)} className="px-6 py-4 bg-white text-black hover:scale-105 transition-all font-bold tracking-widest">RESUME</button>
                    <button onClick={handleRestart} className="px-6 py-4 border border-white/20 text-white hover:bg-white/10 transition-all tracking-widest">RESTART LEVEL</button>
                    <button onClick={onExit} className="px-6 py-4 border border-red-500/50 text-red-400 hover:bg-red-950/30 transition-all tracking-widest">EXIT TO MENU</button>
                </div>
            </div>
        )}

        <canvas ref={canvasRef} className="block w-full h-full" />
        
        {loading && (
            <div className="absolute inset-0 bg-black z-50 flex items-center justify-center text-white">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="font-cinzel text-2xl tracking-widest animate-pulse">LOADING</div>
                </div>
            </div>
        )}
    </div>
  );
};