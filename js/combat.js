// ── combat.js ──

// ═══════════════════════════════════════════════════
//  ENEMY SPRITE PALETTES  (used by renderer-units.js)
// ═══════════════════════════════════════════════════
const ENEMY_INF_PAL  = { '.':null, 'K':'#b02828','k':'#501010','V':'#080306','A':'#882020','L':'#d04040' };
const ENEMY_ARC_PAL  = { '.':null, 'V':'#5a1a1a','v':'#3a0e0e','s':'#d4a060','e':'#180800','G':'#6a2020','g':'#4a1010','Q':'#3a1a08','L':'#4a2010','l':'#2a1008' };
const ENEMY_VILLAGER_PAL = { '.':null,'V':'#7a4040','v':'#4a2020','s':'#b08060','e':'#180800','G':'#5a3030','g':'#3a1818','L':'#6a4040','l':'#3a2020','O':'#d06040','o':'#a04030','A':'#8a5050','D':'#4a2828','d':'#3a1818','c':'#6a3030','C':'#8a4040','b':'#7a4040','B':'#602020','r':'#5a2020','R':'#7a3030','m':'#4a2828','M':'#6a3838','S':'#8a5a50','Q':'#3a1a08' };

// ═══════════════════════════════════════════════════
//  STATE  (populated by net.js _applyState)
// ═══════════════════════════════════════════════════
let enemyKingdoms = [];
let enemyUnits    = [];
let projectiles   = [];
let dmgNumbers    = [];
let screenShake   = 0;
let gameState     = 'playing';
let alertMode     = false;
let particles     = [];   // death particle squares
let lootDrops     = [];   // gold coins flying to HUD

// ═══════════════════════════════════════════════════
//  PROJECTILES
// ═══════════════════════════════════════════════════
function updateProjectiles(dt) {
  for (const p of projectiles) {
    if (p._done) continue;
    p.life -= dt;
    if (p.life <= 0) { p._done = true; continue; }
    p.x += p.vx * p.speed * dt;
    p.y += p.vy * p.speed * dt;
  }
  if (projectiles.some(p => p._done)) projectiles = projectiles.filter(p => !p._done);
}

// ═══════════════════════════════════════════════════
//  CLICK-TO-ATTACK  (sends move_villager to server)
// ═══════════════════════════════════════════════════
function findCombatTarget(wx, wy) {
  for (const eu of enemyUnits) {
    if (Math.hypot(eu.x - wx, eu.y - wy) < 0.7) return { kind: 'unit', obj: eu };
  }
  for (const ek of enemyKingdoms) {
    for (const b of ek.buildings) {
      if (Math.hypot(b.tx + 0.5 - wx, b.ty + 0.5 - wy) < 0.7) return { kind: 'enemyBuilding', obj: b, ek };
    }
    if (ek.hp > 0 && Math.hypot(ek.tx + 0.5 - wx, ek.ty + 0.5 - wy) < 1.1)
      return { kind: 'keep', ek };
  }
  return null;
}

function directKnightAttack(v, target) {
  let destTx, destTy;
  if      (target.kind === 'unit')          { destTx = Math.floor(target.obj.x); destTy = Math.floor(target.obj.y); }
  else if (target.kind === 'keep')          { destTx = target.ek.tx;  destTy = target.ek.ty; }
  else if (target.kind === 'enemyBuilding') { destTx = target.obj.tx; destTy = target.obj.ty; }
  else return;
  netSend({ type: 'move_villager', villagerId: v.id, tx: destTx, ty: destTy });
}

// ═══════════════════════════════════════════════════
//  VISUAL UPDATE  (60 fps: animations, screen shake, damage numbers)
// ═══════════════════════════════════════════════════
function spawnDeathParticles(wx, wy, color) {
  const count = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 2.2;
    particles.push({
      x: wx, y: wy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      color,
      size: 0.10 + Math.random() * 0.13,
    });
  }
}

function updateCombatVisuals(dt) {
  updateProjectiles(dt);

  for (const v of villagers) {
    if (v.attackAnim > 0) v.attackAnim = Math.max(0, v.attackAnim - dt * 3.2);
    if (v._hitFlash  > 0) v._hitFlash  = Math.max(0, v._hitFlash  - dt * 6);
  }
  for (const eu of enemyUnits) {
    if (eu.attackAnim > 0) eu.attackAnim = Math.max(0, eu.attackAnim - dt * 3.2);
    if (eu._hitFlash  > 0) eu._hitFlash  = Math.max(0, eu._hitFlash  - dt * 6);
  }
  if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 5);
  for (const n of dmgNumbers) { n.life -= dt * 1.4; n.wy -= dt * 0.85; }
  dmgNumbers = dmgNumbers.filter(n => n.life > 0);

  // Death particles
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.88; p.vy *= 0.88;
    p.life -= dt * 1.8;
  }
  particles = particles.filter(p => p.life > 0);

  // Loot drop coins
  for (const d of lootDrops) { d.t += dt; }
  lootDrops = lootDrops.filter(d => d.t < 1.1);
}
