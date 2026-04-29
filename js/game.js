// ── game.js ──

// ═══════════════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════
function notify(msg, type) {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' toast-'+type : '');
  el.textContent = msg;
  stack.appendChild(el);
  // Animate in
  requestAnimationFrame(()=>el.classList.add('toast-show'));
  setTimeout(()=>{
    el.classList.remove('toast-show');
    setTimeout(()=>el.remove(), 400);
  }, 2800);
}

// ═══════════════════════════════════════════════════
//  VILLAGER PANEL HUD
// ═══════════════════════════════════════════════════
const vpanel  = document.getElementById('villager-panel');
const vpName  = document.getElementById('vp-name');
const vpRole  = document.getElementById('vp-role');
const vpStatus= document.getElementById('vp-status');

function updateVillagerPanel() {
  if (activeGroup !== null && !selectedVillager) {
    const members = villagers.filter(v => knightGroups[activeGroup].has(v.id));
    vpanel.classList.add('visible');
    const dot = document.getElementById('vp-dot');
    if (dot) dot.style.background = 'rgba(255,215,0,0.9)';
    vpName.textContent = `Group ${activeGroup}`;
    vpRole.textContent = `${members.length} knight${members.length !== 1 ? 's' : ''}`;
    vpStatus.textContent = 'Click to move  ·  Right-click to attack';
    const tierPill = document.getElementById('vp-tier'); if (tierPill) tierPill.textContent = '';
    const xpBar = document.getElementById('vp-xp-bar'); if (xpBar) xpBar.style.width = '0%';
    const xpLabel = document.getElementById('vp-xp-label'); if (xpLabel) xpLabel.textContent = '';
    const hv = document.getElementById('vp-hunger-val'); if (hv) hv.textContent = '';
    const explorerDiv = document.getElementById('vp-explorer-note'); if (explorerDiv) explorerDiv.style.display = 'none';
    document.getElementById('vp-upgrade').style.display = 'none';
    const possessDiv = document.getElementById('vp-possess'); if (possessDiv) possessDiv.style.display = 'none';
    const groupDiv = document.getElementById('vp-group'); if (groupDiv) groupDiv.style.display = 'none';
    return;
  }
  if (!selectedVillager) { vpanel.classList.remove('visible'); return; }
  vpanel.classList.add('visible');
  const v = selectedVillager;

  // Role dot color
  const dot = document.getElementById('vp-dot');
  if (dot) {
    const rc = ROLE_COLOR[v.role] || [200,168,122];
    dot.style.background = `rgb(${rc[0]},${rc[1]},${rc[2]})`;
  }

  vpName.textContent = v.name;
  const tierLabel = ['I','II','III','IV','V'][v.tier-1] || 'I';
  const toolLabel = ['Wood','Stone','Iron'][v.toolTier||0] || 'Wood';
  const toolSuffix = TOOL_ROLES.has(v.role) ? ` · ${toolLabel} Tools` : '';
  const displayRole = (v.tier >= 5 && v.role === 'StoneMiner') ? 'Ironminer' : v.role;
  vpRole.textContent = displayRole;

  // Tier pill
  const tierPill = document.getElementById('vp-tier');
  if (tierPill) tierPill.textContent = `Tier ${tierLabel}${toolSuffix}`;

  // XP bar
  const xpBar = document.getElementById('vp-xp-bar');
  const xpLabel = document.getElementById('vp-xp-label');
  if (xpBar && xpLabel) {
    const maxTier = v.tier >= 5 || (v.tier >= 3 && _accountTier4Slots === 0);
    if (!maxTier && v.tier < 5) {
      const reqs = [TIER_XP_REQ[0], TIER_XP_REQ[1], TIER_XP_REQ[2], TIER_XP_REQ[3]];
      const bases = [0, TIER_XP_REQ[0], TIER_XP_REQ[1], TIER_XP_REQ[2]];
      const req  = reqs[v.tier - 1];
      const base = bases[v.tier - 1];
      const pct = Math.min(100, ((v.xp - base) / (req - base)) * 100);
      xpBar.style.width = pct.toFixed(1) + '%';
      xpLabel.textContent = `${v.xp - base} / ${req - base} xp`;
    } else {
      xpBar.style.width = '100%';
      xpLabel.textContent = v.tier >= 5 ? 'Max Tier' : 'Need T4 Slot';
    }
  }

  const labels = { idle:'Resting', roaming:'Wandering', patrolling:'Patrolling', moving:'Moving', building:'Building…', chopping:'Chopping…', sleeping:'Sleeping', farming:'Farming…', baking:'Baking…', mining:'Mining…', forging:'Forging…', guarding:'On Guard', repairing:'Repairing…', training:'Training…', exploring:'Exploring' };
  vpStatus.textContent = labels[v.state] || '—';
  const hv = document.getElementById('vp-hunger-val');
  if (hv) hv.textContent = Math.round(v.hunger*100) + '%';

  // Explorer note
  const explorerDiv = document.getElementById('vp-explorer-note');
  if (explorerDiv) explorerDiv.style.display = v.role === VROLE.EXPLORER ? 'block' : 'none';

  // Upgrade section — only for Basic villagers (or training)
  const upgDiv  = document.getElementById('vp-upgrade');
  const upgBtns = document.getElementById('vp-upgrade-btns');
  if ((v.role === VROLE.BASIC || v.state === 'training') && v.role !== VROLE.EXPLORER) {
    upgDiv.style.display = 'block';
    upgBtns.innerHTML = '';
    if (v.state === 'training') {
      const pct = Math.round((1 - v._trainingTimer / TRAIN_TIME) * 100);
      document.getElementById('vp-upgrade-cost').textContent =
        `Training ${v._trainingRole}… ${pct}% (${Math.ceil(v._trainingTimer)}s left)`;
    } else {
      const trainRoles = [VROLE.WOODCUTTER,VROLE.BUILDER,VROLE.FARMER,VROLE.BAKER,VROLE.STONE_MINER,VROLE.TOOLSMITH,VROLE.KNIGHT,VROLE.ARCHER,VROLE.MECHANIC];
      for (const r of trainRoles) {
        if (!hasPrereq(r)) continue; // hide roles whose building hasn't been built yet
        const btn = document.createElement('button');
        btn.className = 'upgrade-btn';
        btn.textContent = r;
        btn.disabled = gold < 20;
        btn.addEventListener('click', ()=>netSend({ type: 'upgrade_villager', villagerId: selectedVillager.id, role: r }));
        upgBtns.appendChild(btn);
      }
      const timeLeft = v.upgradeTimer !== null ? Math.ceil(v.upgradeTimer)+'s' : '—';
      document.getElementById('vp-upgrade-cost').innerHTML = `Cost: ${iconHTML('gold',12)} 20 gold  ·  Auto in: ${timeLeft}`;
    }
  } else {
    upgDiv.style.display = 'none';
  }

  // Group assignment buttons — knights only
  const groupDiv  = document.getElementById('vp-group');
  const groupBtns = document.getElementById('vp-group-btns');
  if (groupDiv && groupBtns) {
    if (v.role === VROLE.KNIGHT) {
      groupDiv.style.display = 'block';
      groupBtns.innerHTML = '';
      // Find which group this knight currently belongs to (if any)
      let currentGroup = null;
      for (let g = 1; g <= 9; g++) if (knightGroups[g].has(v.id)) { currentGroup = g; break; }
      for (let g = 1; g <= 9; g++) {
        const btn = document.createElement('button');
        btn.className = 'group-btn' + (currentGroup === g ? ' group-btn-active' : '');
        btn.textContent = String(g);
        btn.title = `Assign to group ${g}`;
        const _g = g;
        btn.addEventListener('click', () => {
          const sv = selectedVillager; if (!sv) return;
          // Remove from all groups, then assign to this one
          for (let x = 1; x <= 9; x++) knightGroups[x].delete(sv.id);
          knightGroups[_g].add(sv.id);
          activeGroup = _g;
          updateVillagerPanel();
        });
        groupBtns.appendChild(btn);
      }
    } else {
      groupDiv.style.display = 'none';
    }
  }

  // Possess button for knights
  const possessDiv = document.getElementById('vp-possess');
  if (possessDiv) {
    if (v.role === VROLE.KNIGHT) {
      possessDiv.style.display = 'block';
      const btn = possessDiv.querySelector('button');
      if (possessedVillager === v) {
        btn.innerHTML = '■ Release';
        btn.onclick = releasePossession;
      } else {
        btn.innerHTML = iconHTML('sword', 11) + ' Possess';
        btn.onclick = () => possessKnight(v);
      }
    } else {
      possessDiv.style.display = 'none';
    }
  }
}

// ═══════════════════════════════════════════════════
//  FOG OF WAR
// ═══════════════════════════════════════════════════
function updateFog() {
  fogVisible.fill(0);
  for (const v of villagers) {
    const vx = Math.round(v.x), vy = Math.round(v.y);
    const vr = v.role === VROLE.EXPLORER ? EXPLORER_FOG_RADIUS : FOG_RADIUS;
    for (let dy = -vr; dy <= vr; dy++) {
      const ty = vy + dy;
      if (ty < 0 || ty >= MAP_H) continue;
      const maxDx = Math.floor(Math.sqrt(vr*vr - dy*dy));
      for (let dx = -maxDx; dx <= maxDx; dx++) {
        const tx = vx + dx;
        if (tx < 0 || tx >= MAP_W) continue;
        const idx = ty * MAP_W + tx;
        fogVisible[idx]  = 1;
        fogExplored[idx] = 1;
      }
    }
  }

  // Town center fog reveal
  if (townCenter) {
    const r = 5;
    for (let dy=-r; dy<=r; dy++) for (let dx=-r; dx<=r; dx++) {
      const nx=townCenter.tx+dx, ny=townCenter.ty+dy;
      if (nx<0||nx>=MAP_W||ny<0||ny>=MAP_H) continue;
      const idx=ny*MAP_W+nx;
      fogVisible[idx]=1; fogExplored[idx]=1;
    }
  }

  // Outpost fog reveal
  for (const b of buildings) {
    if (b.type !== 9 || !b.complete) continue;
    const OR = 8;
    for (let dy=-OR; dy<=OR; dy++) {
      const ty2=b.ty+dy;
      if (ty2<0||ty2>=MAP_H) continue;
      const maxDx=Math.floor(Math.sqrt(OR*OR-dy*dy));
      for (let dx=-maxDx; dx<=maxDx; dx++) {
        const tx2=b.tx+dx;
        if (tx2<0||tx2>=MAP_W) continue;
        const idx=ty2*MAP_W+tx2;
        fogVisible[idx]=1; fogExplored[idx]=1;
      }
    }
  }

}

// ═══════════════════════════════════════════════════
//  HUD UPDATE
// ═══════════════════════════════════════════════════
function updateHUD() {
  // Throttle DOM work — server state updates at 10Hz anyway.
  // But run every frame until the settle UI transition fires (one-shot).
  if (frameCount % 4 !== 0 && _settledUiDone) return;
  document.getElementById('res-gold').textContent  = gold;
  document.getElementById('res-wood').textContent  = wood;
  document.getElementById('res-food').textContent  = food;
  document.getElementById('res-crops').textContent = crops;
  document.getElementById('res-stone').textContent = stone;
  document.getElementById('res-iron').textContent  = iron;

  // Population display (house-based cap)
  const popEl = document.getElementById('pop-display');
  if (popEl) {
    const cap = getPopCap();
    popEl.textContent = cap > 0 ? `${villagers.length}/${cap}` : `${villagers.length}/—`;
    popEl.style.color = (cap > 0 && villagers.length >= cap) ? '#e06060' : '';
  }

  // Day display
  const dayEl = document.getElementById('day-display');
  if (dayEl) dayEl.textContent = `Day ${day} · ${SEASON_NAMES[season] ?? ''}`;

  // Time label
  document.getElementById('time-display').textContent = getTimeLabel();

  // Hunger bar (average)
  const avg = villagers.length ? villagers.reduce((s,v)=>s+v.hunger,0)/villagers.length : 1;
  const fill = document.getElementById('hunger-bar-inner');
  fill.style.width = (avg*100).toFixed(1)+'%';
  const r=cl(240-avg*180), g=cl(avg*200+20);
  fill.style.background = `rgb(${r},${g},20)`;

  // Food-low warning on food chip
  const foodChip = document.getElementById('food-chip');
  if (foodChip) foodChip.classList.toggle('res-low', food < villagers.length * 2);

  // Save button — visible only while playing a settled game
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) saveBtn.classList.toggle('hidden', !settled || gameState !== 'playing');

  // Sync settled UI state (server is authoritative)
  if (settled && !_settledUiDone) {
    _settledUiDone = true;
    document.getElementById('settle-btn').classList.add('hidden');
    document.getElementById('build-fab-wrap').classList.remove('hidden');
    const hint = document.getElementById('hint');
    hint.classList.remove('hidden');
    hint.innerHTML = '<b>B</b> Build &nbsp;·&nbsp; <b>Click</b> Select/Move &nbsp;·&nbsp; <b>Scroll</b> Zoom &nbsp;·&nbsp; <b>F</b> Follow';
    setTimeout(() => hint.classList.add('hidden'), 5000);
    cameraFollow = true;
    tutorialOnSettled();
  }
}

// ═══════════════════════════════════════════════════
//  CAMERA FOLLOW
// ═══════════════════════════════════════════════════
function updateCameraFollow(dt) {
  if (!cameraFollow||!villagers.length) return;
  let cx=0, cy=0;
  for (const v of villagers) { cx+=v.x; cy+=v.y; }
  cx/=villagers.length; cy/=villagers.length;
  const sz=TILE_SZ*zoom;
  // Frame-rate independent exponential lerp — half-life ~125ms
  const alpha=1-Math.pow(0.5, dt*8);
  camX+=(cx*sz-canvas.width/2  - camX)*alpha;
  camY+=(cy*sz-canvas.height/2 - camY)*alpha;
  clamp();
}

// ═══════════════════════════════════════════════════
//  TOWN CENTER
// ═══════════════════════════════════════════════════
function canSettleAt(tx, ty) {
  if (tx<1||tx>=MAP_W-1||ty<1||ty>=MAP_H-1) return false;
  if (!WALKABLE_TILES.has(mapTiles[ty][tx])) return false;
  if (buildings.some(b=>b.tx===tx&&b.ty===ty)) return false;
  let w=0;
  for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++) {
    const nx=tx+dx, ny=ty+dy;
    if (nx>=0&&nx<MAP_W&&ny>=0&&ny<MAP_H&&WALKABLE_TILES.has(mapTiles[ny][nx])) w++;
  }
  return w>=15;
}

// ═══════════════════════════════════════════════════
//  INPUT
// ═══════════════════════════════════════════════════
const keys={};
let msx=canvas.width/2, msy=canvas.height/2;

addEventListener('keydown', e=>{
  if (!e.key) return;
  if (e.key==='t'||e.key==='T') { if (typeof openChat==='function' && !_chatOpen) { openChat(); e.preventDefault(); return; } }
  if (_chatOpen) return;
  keys[e.key.toLowerCase()]=true;
  if (e.key==='g'||e.key==='G') showGrid=!showGrid;
  if (e.key==='f'||e.key==='F') { cameraFollow=!cameraFollow; }
  if (e.key==='b'||e.key==='B') { if (settled) toggleBuildPanel(); }
  if (e.key==='Escape') {
    if (possessedVillager) {
      releasePossession();
    } else if (buildMode||placingType!==null) {
      buildMode=false; placingType=null;
      document.getElementById('build-menu').classList.remove('open');
      document.getElementById('build-fab').classList.remove('open');
      document.getElementById('build-tooltip').classList.remove('visible');
      document.querySelectorAll('.build-btn').forEach(b=>b.classList.remove('active'));
    } else {
      for (const v of villagers) v.selected=false;
      activeGroup=null; selectedVillager=null;
      updateVillagerPanel();
    }
  }
  // Group hotkeys: 1–9 selects group
  const _digit = parseInt(e.key);
  if (_digit >= 1 && _digit <= 9 && !e.altKey && !e.ctrlKey && !e.metaKey) {
    const members = villagers.filter(v => knightGroups[_digit].has(v.id));
    if (members.length) {
      for (const v of villagers) v.selected = false;
      selectedVillager = null; activeGroup = _digit;
      for (const v of members) v.selected = true;
      cameraFollow = false;
      updateVillagerPanel();
    }
  }
  if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
});
addEventListener('keyup', e=>{ if (e.key) keys[e.key.toLowerCase()]=false; });

canvas.addEventListener('mousedown', e=>{
  // Possessed knight: left-click attacks nearest enemy, right-click also attacks
  if (possessedVillager && (e.button===0 || e.button===2)) {
    const sz=TILE_SZ*zoom;
    const wx=(e.clientX+camX)/sz, wy=(e.clientY+camY)/sz;
    const target=findCombatTarget(wx,wy);
    if (target) { directKnightAttack(possessedVillager, target); e.preventDefault(); return; }
  }
  // Right-click: group attack
  if (e.button===2 && activeGroup!==null && !possessedVillager) {
    const sz=TILE_SZ*zoom;
    const wx=(e.clientX+camX)/sz, wy=(e.clientY+camY)/sz;
    const target=findCombatTarget(wx,wy);
    if (target) {
      villagers.filter(v=>knightGroups[activeGroup].has(v.id)).forEach(v=>directKnightAttack(v,target));
      e.preventDefault(); return;
    }
  }
  // Right-click: combat attack if knight selected (non-possessed)
  if (e.button===2 && selectedVillager?.role===VROLE.KNIGHT && !possessedVillager) {
    const sz=TILE_SZ*zoom;
    const wx=(e.clientX+camX)/sz, wy=(e.clientY+camY)/sz;
    const target=findCombatTarget(wx,wy);
    if (target) { directKnightAttack(selectedVillager,target); e.preventDefault(); return; }
  }
  // Only prevent default for right-clicks (context menu suppression).
  // Left-click must NOT be prevented here — doing so swallows the mouseup
  // event that the selection/movement handler depends on.
  if (e.button !== 0) e.preventDefault();
});

let _roadPainting = false;
let _lastRoadTx = -1, _lastRoadTy = -1;
canvas.addEventListener('mousedown', e=>{ if (e.button===0 && placingType===8) _roadPainting=true; });
canvas.addEventListener('mouseup',   e=>{ _roadPainting=false; _lastRoadTx=-1; _lastRoadTy=-1; });

addEventListener('mousemove', e=>{
  msx=e.clientX; msy=e.clientY;
  // Paint roads while dragging
  if (_roadPainting && placingType===8) {
    const sz=TILE_SZ*zoom;
    const tx=Math.floor((e.clientX+camX)/sz);
    const ty=Math.floor((e.clientY+camY)/sz);
    if (tx !== _lastRoadTx || ty !== _lastRoadTy) {
      _lastRoadTx = tx; _lastRoadTy = ty;
      netSend({ type: 'place_building', tx, ty, buildingType: 8 });
    }
  }
});

canvas.addEventListener('contextmenu', e=>e.preventDefault());

canvas.addEventListener('wheel', e=>{ e.preventDefault(); },{passive:false});

// Minimap click → smooth pan camera
mmCanvas.addEventListener('click', e=>{
  const rect=mmCanvas.getBoundingClientRect();
  const mx=(e.clientX-rect.left)/mmCanvas.width;
  const my=(e.clientY-rect.top) /mmCanvas.height;
  const sz=TILE_SZ*zoom;
  camTargetX=Math.max(0,Math.min(MAP_W*sz-canvas.width,  mx*MAP_W*sz - canvas.width/2));
  camTargetY=Math.max(0,Math.min(MAP_H*sz-canvas.height, my*MAP_H*sz - canvas.height/2));
  cameraFollow=false;
});

// Villager selection / movement via left-click
let _lbX=0, _lbY=0;
canvas.addEventListener('mousedown', e=>{
  if (e.button===0) { _lbX=e.clientX; _lbY=e.clientY; }
});
canvas.addEventListener('mouseup', e=>{
  if (e.button!==0) return;
  const moved=Math.hypot(e.clientX-_lbX, e.clientY-_lbY);
  if (moved>5) return; // was a drag — ignore
  handleCanvasClick(e.clientX, e.clientY);
});

function handleCanvasClick(cx, cy) {
  const sz=TILE_SZ*zoom;
  const wx=(cx+camX)/sz, wy=(cy+camY)/sz;
  const tx=Math.floor(wx), ty=Math.floor(wy);

  // Town center placement mode
  if (placingTownCenter) {
    if (canSettleAt(tx,ty)) {
      placingTownCenter = false;
      // Optimistic local placement — server confirms on next broadcast
      townCenter     = { tx, ty, hp: TC_HP_MAX, maxHp: TC_HP_MAX };
      settled        = true;
      _pendingSettle = true;
      netSend({ type: 'place_town_center', tx, ty });
    }
    return;
  }

  // Build placement mode
  if (placingType!==null) {
    netSend({ type: 'place_building', tx, ty, buildingType: placingType });
    return; // stay in placement mode
  }

  // Find nearest villager within 0.6 tiles
  let best=null, bestDist=0.6;
  for (const v of villagers) {
    const d=Math.hypot(v.x-wx, v.y-wy);
    if (d<bestDist) { bestDist=d; best=v; }
  }

  if (best) {
    // Clicking any villager clears active group
    if (activeGroup !== null) { for (const v of villagers) v.selected=false; activeGroup=null; }
    const wasSelected=best.selected;
    for (const v of villagers) v.selected=false;
    selectedVillager=wasSelected?null:best;
    if (selectedVillager) selectedVillager.selected=true;
    cameraFollow=false;
    closeBuildingPanel();
    updateVillagerPanel();
    return;
  }

  // Check for building click (upgradeable buildings only)
  if (!selectedVillager && activeGroup === null) {
    const clickedBldg = buildings.find(b =>
      b.complete && tx >= b.tx && tx < b.tx + (b.w||1) && ty >= b.ty && ty < b.ty + (b.h||1)
    );
    if (clickedBldg) {
      showBuildingPanel(clickedBldg);
      return;
    } else {
      closeBuildingPanel();
    }
  }

  if (activeGroup !== null) {
    const members = villagers.filter(v => knightGroups[activeGroup].has(v.id));
    const offs = _groupOffsets(members.length);
    members.forEach((v, i) => netSend({ type:'move_villager', villagerId:v.id, tx:tx+offs[i][0], ty:ty+offs[i][1] }));
    cameraFollow=false;
    return;
  }

  if (selectedVillager) {
    netSend({ type: 'move_villager', villagerId: selectedVillager.id, tx, ty });
    cameraFollow=false;
    return;
  }

  cameraFollow=true;
}

// Formation offsets — spirals outward from centre so groups cluster tightly
function _groupOffsets(n) {
  const ring = [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],
                [2,0],[-2,0],[0,2],[0,-2],[2,1],[-2,1],[2,-1],[-2,-1],[2,2],[-2,2],[2,-2]];
  return ring.slice(0, n);
}

// ── Touch support ──────────────────────────────────────
let _touch1 = null, _touch2 = null;
let _touchMoved = false;
let _longPressTimer = null;
const LONG_PRESS_MS   = 450;
const TAP_MOVE_THRESH = 8;

function simulateRightClick(sx, sy) {
  const sz = TILE_SZ * zoom;
  const wx = (sx + camX) / sz, wy = (sy + camY) / sz;
  if (possessedVillager) {
    const target = findCombatTarget(wx, wy);
    if (target) directKnightAttack(possessedVillager, target);
  } else if (activeGroup !== null) {
    const target = findCombatTarget(wx, wy);
    if (target) villagers.filter(v=>knightGroups[activeGroup].has(v.id)).forEach(v=>directKnightAttack(v,target));
  } else if (selectedVillager?.role === VROLE.KNIGHT) {
    const target = findCombatTarget(wx, wy);
    if (target) directKnightAttack(selectedVillager, target);
  }
}

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (e.touches.length === 1) {
    const t = e.touches[0];
    _touch1 = { x: t.clientX, y: t.clientY };
    _touch2 = null;
    _touchMoved = false;
    _longPressTimer = setTimeout(() => {
      if (!_touchMoved) simulateRightClick(_touch1.x, _touch1.y);
      _longPressTimer = null;
    }, LONG_PRESS_MS);
  } else if (e.touches.length === 2) {
    clearTimeout(_longPressTimer); _longPressTimer = null;
    const a = e.touches[0], b = e.touches[1];
    _touch1 = { x: a.clientX, y: a.clientY };
    _touch2 = { x: b.clientX, y: b.clientY };
    _touchMoved = true;
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (e.touches.length === 1 && _touch1) {
    const t = e.touches[0];
    const dx = t.clientX - _touch1.x;
    const dy = t.clientY - _touch1.y;
    if (Math.hypot(dx, dy) > TAP_MOVE_THRESH) {
      _touchMoved = true;
      clearTimeout(_longPressTimer); _longPressTimer = null;
    }
    if (placingType === 8) {
      // Road drag: paint tiles instead of panning
      const sz = TILE_SZ * zoom;
      const tx = Math.floor((t.clientX + camX) / sz);
      const ty = Math.floor((t.clientY + camY) / sz);
      if (tx !== _lastRoadTx || ty !== _lastRoadTy) {
        _lastRoadTx = tx; _lastRoadTy = ty;
        netSend({ type: 'place_building', tx, ty, buildingType: 8 });
      }
    } else {
      cameraFollow = false;
      camTargetX = null; camTargetY = null;
      camX -= dx; camY -= dy;
      clamp();
    }
    _touch1.x = t.clientX; _touch1.y = t.clientY;
  } else if (e.touches.length === 2 && _touch1 && _touch2) {
    const a = e.touches[0], b = e.touches[1];
    const midX = (a.clientX + b.clientX) / 2;
    const midY = (a.clientY + b.clientY) / 2;
    const prevMidX = (_touch1.x + _touch2.x) / 2;
    const prevMidY = (_touch1.y + _touch2.y) / 2;
    camX -= midX - prevMidX; camY -= midY - prevMidY;
    clamp();
    _touch1.x = a.clientX; _touch1.y = a.clientY;
    _touch2.x = b.clientX; _touch2.y = b.clientY;
  }
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  clearTimeout(_longPressTimer); _longPressTimer = null;
  if (!_touchMoved && _touch1) handleCanvasClick(_touch1.x, _touch1.y);
  if (e.touches.length === 0) {
    _lastRoadTx = -1; _lastRoadTy = -1;
    _touch1 = null; _touch2 = null;
  } else if (e.touches.length === 1) {
    // Re-anchor so the next touchmove delta is computed from the correct position
    _touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    _touch2 = null;
  }
}, { passive: false });
// D-pad wiring: set keys[] so possessed knight movement works
;(function wireDpad() {
  const map = { 'dp-up':'w', 'dp-down':'s', 'dp-left':'a', 'dp-right':'d' };
  for (const [id, key] of Object.entries(map)) {
    const btn = document.getElementById(id);
    btn.addEventListener('touchstart', e => { e.preventDefault(); keys[key]=true;  }, { passive:false });
    btn.addEventListener('touchend',   e => { e.preventDefault(); keys[key]=false; }, { passive:false });
    btn.addEventListener('touchcancel',e => { keys[key]=false; });
    btn.addEventListener('mousedown',  () => keys[key]=true);
    btn.addEventListener('mouseup',    () => keys[key]=false);
    btn.addEventListener('mouseleave', () => keys[key]=false);
  }
})();
// ── End touch support ───────────────────────────────────

function possessKnight(v) {
  if (possessedVillager) releasePossession();
  possessedVillager = v;
  v.path = []; v.state = 'idle';
  cameraFollow = false;
  document.getElementById('possess-bar').classList.remove('hidden');
  document.getElementById('possess-name').textContent = v.name;
  document.getElementById('dpad').classList.remove('hidden');
  notify(`Possessing ${v.name} — WASD to move, click to attack, ESC to release`);
}

function releasePossession() {
  if (!possessedVillager) return;
  notify(`Released ${possessedVillager.name}`);
  possessedVillager.state = 'idle';
  possessedVillager.idleTimer = 1;
  possessedVillager = null;
  document.getElementById('possess-bar').classList.add('hidden');
  document.getElementById('dpad').classList.add('hidden');
  cameraFollow = true;
}

function clamp() {
  const sz=TILE_SZ*zoom;
  const maxX=Math.max(0, MAP_W*sz-canvas.width);
  const maxY=Math.max(0, MAP_H*sz-canvas.height);
  camX=Math.max(0,Math.min(maxX,camX));
  camY=Math.max(0,Math.min(maxY,camY));
}

// ═══════════════════════════════════════════════════
//  GAME LOOP
// ═══════════════════════════════════════════════════
function update(dt) {
  // zoom is now fixed — no scroll handler changes it

  // ── Smooth minimap pan ──
  if (camTargetX!==null) {
    const alpha=1-Math.pow(0.5,dt*15);
    camX+=(camTargetX-camX)*alpha;
    camY+=(camTargetY-camY)*alpha;
    clamp();
    if (Math.abs(camX-camTargetX)<0.5&&Math.abs(camY-camTargetY)<0.5) {
      camX=camTargetX; camY=camTargetY;
      camTargetX=null; camTargetY=null;
    }
  }

  // ── WASD / arrow keys: move possessed knight, selected villager, or pan camera ──
  const PAN_ACCEL = 1800;
  const PAN_FRIC  = 10;
  let inputX = 0, inputY = 0;
  if (keys['a'] || keys['arrowleft'])  inputX -= 1;
  if (keys['d'] || keys['arrowright']) inputX += 1;
  if (keys['w'] || keys['arrowup'])    inputY -= 1;
  if (keys['s'] || keys['arrowdown'])  inputY += 1;

  if (possessedVillager && !possessedVillager._despawn) {
    // WASD moves the possessed knight — send to server
    const pv = possessedVillager;
    if ((inputX !== 0 || inputY !== 0) && (pv.pathLen === 0) && pv.state !== 'fighting') {
      const ntx = pv.tx + inputX, nty = pv.ty + inputY;
      if (ntx >= 0 && ntx < MAP_W && nty >= 0 && nty < MAP_H
          && WALKABLE_TILES.has(mapTiles[nty][ntx])
          && !villagerBlocked[nty*MAP_W+ntx]) {
        netSend({ type: 'move_villager', villagerId: pv.id, tx: ntx, ty: nty });
      }
    }
    // Camera tightly follows possessed knight
    const sz = TILE_SZ * zoom;
    const alpha = 1 - Math.pow(0.5, dt * 14);
    camX += (pv.x * sz - canvas.width  / 2 - camX) * alpha;
    camY += (pv.y * sz - canvas.height / 2 - camY) * alpha;
    clamp();
    camVX = 0; camVY = 0;
  } else {
    if (inputX !== 0 || inputY !== 0) {
      const len = Math.sqrt(inputX*inputX + inputY*inputY);
      camVX += (inputX/len) * PAN_ACCEL * dt;
      camVY += (inputY/len) * PAN_ACCEL * dt;
      const spd = Math.sqrt(camVX*camVX + camVY*camVY);
      if (spd > PAN_PX) { camVX = camVX/spd*PAN_PX; camVY = camVY/spd*PAN_PX; }
      cameraFollow = false; camTargetX = null;
    } else {
      const decay = Math.pow(0.001, dt * PAN_FRIC / 10);
      camVX *= decay; camVY *= decay;
      if (Math.abs(camVX) < 0.5 && Math.abs(camVY) < 0.5) { camVX = 0; camVY = 0; }
    }
    if (camVX !== 0 || camVY !== 0) { camX += camVX*dt; camY += camVY*dt; clamp(); }
  }

  updateCameraFollow(dt);
  updateCombatVisuals(dt);
  updateHUD();
  checkQuests(dt);
  time+=dt;
}

let lastT=0, frameCount=0;
function loop(ts) {
  const dt=Math.min((ts-lastT)/1000, 0.05); lastT=ts; frameCount++;
  update(dt);
  advanceInterp(); // slide entity x/y toward server targets before rendering
  render();
  if (frameCount % 3 === 0) drawMinimap();
  requestAnimationFrame(loop);
}

// ═══════════════════════════════════════════════════
//  INIT / LOADING
// ═══════════════════════════════════════════════════
let _settledUiDone  = false;
let _pendingSettle  = false; // true while awaiting server confirmation of place_town_center
let _playerName = 'Wanderer';

async function init(playerName) {
  if (playerName) _playerName = playerName;
  const loading=document.getElementById('loading');
  const bar=document.getElementById('loading-bar-fill');
  loading.style.opacity='1';
  loading.style.pointerEvents='all';
  loading.style.display='flex';
  // Build panel (idempotent — only populate buttons once)
  if (!document.querySelector('.build-btn')) {
    const btns = document.getElementById('build-btns');
    const tip  = document.getElementById('build-tooltip');
    const STRUCT_DESC = [
      'Raises your villager cap.',
      'Villagers bring crops here to bake food.',
      'A stone barrier that slows enemy advances.',
      'Shoots arrows at nearby enemies.',
      'Villagers grow crops here.',
      'Extracts stone from adjacent hills.',
      'Trains soldiers for your army.',
      'Smelts iron ore into iron.',
      'Drag to paint. Villagers move faster on roads.',
      'Expands your territory and extends vision.',
      'A passable opening in your walls. Units and visitors enter here.',
    ];
    const BUILD_CATEGORIES = [
      { label: 'Population', indices: [0] },
      { label: 'Food Chain', indices: [4, 1] },
      { label: 'Industry',   indices: [5, 7] },
      { label: 'Defence',    indices: [6, 2, 3, 10] },
      { label: 'Expansion',  indices: [9, 8] },
    ];
    for (const cat of BUILD_CATEGORIES) {
      const section = document.createElement('div');
      section.className = 'build-section';
      const label = document.createElement('div');
      label.className = 'build-section-label';
      label.textContent = cat.label;
      section.appendChild(label);
      for (const i of cat.indices) {
        const name = STRUCT_NAME[i];
        const cost = STRUCT_COST[i] || {};
        const costStr = Object.entries(cost).map(([r,n])=>`${n}${r[0].toUpperCase()}`).join(' ');
        const btn = document.createElement('button');
        btn.className = 'build-btn'; btn.id = `bbtn-${i}`;
        btn.innerHTML = `<span class="build-btn-icon">${STRUCT_ICON[i]}</span><span class="build-btn-name">${name}</span><span class="build-btn-cost">${costStr}</span>`;
        btn.addEventListener('click', ()=>selectBuildType(i));
        btn.addEventListener('mouseenter', ()=>{ tip.textContent = STRUCT_DESC[i]; tip.classList.add('visible'); });
        btn.addEventListener('mouseleave', ()=>tip.classList.remove('visible'));
        section.appendChild(btn);
      }
      btns.appendChild(section);
    }
  }
  // Settle button wiring (idempotent)
  if (!document.getElementById('settle-btn')._wired) {
    document.getElementById('settle-btn').addEventListener('click',()=>{
      if (settled) return;
      placingTownCenter=!placingTownCenter;
      const btn=document.getElementById('settle-btn');
      btn.classList.toggle('placing',placingTownCenter);
      btn.textContent=placingTownCenter?'Click to place…':'Settle Here';
    });
    document.getElementById('settle-btn')._wired=true;
  }

  document.getElementById('loading-sub').textContent='Connecting to server…';
  bar.style.width='0%';

  // Connect to server — net.js updates the bar via 'loading' messages
  const seed = await netConnect(_playerName);
  SEED = seed;

  document.getElementById('loading-sub').textContent=`Forging realm #${SEED}…`;
  bar.style.width='80%';
  await new Promise(r => requestAnimationFrame(r));

  // Generate map locally with the server's seed (deterministic — no spawnVillagers)
  await generate(SEED, pct => { bar.style.width = (80 + pct * 0.2).toFixed(0) + '%'; });
  buildMinimap();
  buildTileColorCache();
  cameraFollow=true;
  bar.style.width='100%';

  // Reset settle button UI
  _settledUiDone = false;
  _pendingSettle = false;
  const sb=document.getElementById('settle-btn');
  sb.classList.remove('hidden','placing');
  sb.textContent='Settle Here';
  document.getElementById('build-fab-wrap').classList.add('hidden');
  document.getElementById('dpad').classList.add('hidden');
  // Initial hint
  const hint=document.getElementById('hint');
  hint.innerHTML='Roam freely &nbsp;·&nbsp; Find a good spot &nbsp;·&nbsp; <b>Settle</b> to found your kingdom';
  hint.classList.remove('hidden');

  // Centre camera on map centre (villagers arrive via server state)
  {
    const sz=TILE_SZ*zoom;
    camX=MAP_W/2*sz - canvas.width/2;
    camY=MAP_H/2*sz - canvas.height/2;
  }
  clamp();

  await new Promise(r => requestAnimationFrame(r));
  loading.style.opacity='0';
  loading.style.pointerEvents='none';
  setTimeout(()=>loading.style.display='none', 700);

  requestAnimationFrame(loop);
}

// ── Name entry screen ─────────────────────────────────────────────
{
  const nameScreen = document.getElementById('name-screen');
  const nameInput  = document.getElementById('name-input');
  const nameBtn    = document.getElementById('name-btn');
  const goBtn      = document.getElementById('go-btn');

  // ── Demo soaring view ──────────────────────────────────────────
  let _demoRafId   = null;
  let _demoPanVX   = 0;
  let _demoPanVY   = 0;
  let _demoLastT   = 0;
  let _demoRunning = false;

  async function _startDemoView() {
    const demoSeed = Math.floor(Math.random() * 1_000_000);
    await generate(demoSeed, () => {});
    generateTrees(demoSeed);
    buildTileColorCache();

    fogVisible.fill(1);
    fogExplored.fill(1);

    const sz = TILE_SZ * zoom;
    const maxX = MAP_W * sz - canvas.width;
    const maxY = MAP_H * sz - canvas.height;

    // Start at a random interior position
    camX = maxX * (0.2 + Math.random() * 0.6);
    camY = maxY * (0.2 + Math.random() * 0.6);

    // Random slow-pan direction
    const ang = Math.random() * Math.PI * 2;
    const spd = 2.2 + Math.random() * 1.0; // tiles/sec
    _demoPanVX = Math.cos(ang) * spd;
    _demoPanVY = Math.sin(ang) * spd;
    _demoLastT = performance.now();
    _demoRunning = true;
    _demoFrame();
  }

  function _demoFrame() {
    if (!_demoRunning) return;
    const now = performance.now();
    const dt  = Math.min((now - _demoLastT) / 1000, 0.05);
    _demoLastT = now;

    const sz  = TILE_SZ * zoom;
    const maxX = MAP_W * sz - canvas.width;
    const maxY = MAP_H * sz - canvas.height;

    camX += _demoPanVX * sz * dt;
    camY += _demoPanVY * sz * dt;

    if (camX >= maxX || camX <= 0) { _demoPanVX *= -1; camX = Math.max(0, Math.min(maxX, camX)); }
    if (camY >= maxY || camY <= 0) { _demoPanVY *= -1; camY = Math.max(0, Math.min(maxY, camY)); }

    render();
    _demoRafId = requestAnimationFrame(_demoFrame);
  }

  function _stopDemoView() {
    _demoRunning = false;
    if (_demoRafId) { cancelAnimationFrame(_demoRafId); _demoRafId = null; }
    fogVisible.fill(0);
    fogExplored.fill(0);
  }

  function _joinGame() {
    _stopDemoView();
    const name = nameInput.value.trim().slice(0, 18) || 'Wanderer';
    nameScreen.classList.add('hidden');
    init(name);
  }

  nameBtn.addEventListener('click', _joinGame);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') _joinGame(); });

  // Continue from save
  const continueBtn = document.getElementById('continue-btn');
  if (continueBtn) {
    const saveInfo = typeof getSavedGameInfo === 'function' ? getSavedGameInfo() : null;
    if (saveInfo) {
      continueBtn.textContent = `Continue · Day ${saveInfo.day} · ${saveInfo.playerName}`;
      continueBtn.classList.remove('hidden');
    }
    continueBtn.addEventListener('click', () => {
      _stopDemoView();
      if (typeof queueSaveLoad === 'function') queueSaveLoad();
      nameScreen.classList.add('hidden');
      init(null);
    });
  }

  // Play Again: clean disconnect then return to name entry
  goBtn.addEventListener('click', () => {
    netDisconnect();
    document.getElementById('gameover').classList.add('go-hidden');
    nameScreen.classList.remove('hidden');
    nameInput.focus();
    _startDemoView();
  });

  // Fade out initial loading screen, start demo view
  const _initLoading = document.getElementById('loading');
  _initLoading.style.opacity = '0';
  _initLoading.style.pointerEvents = 'none';
  setTimeout(() => { _initLoading.style.display = 'none'; }, 700);

  initIcons();
  initQuestPanel();
  _startDemoView();
  _refreshAccountUI();
  nameInput.focus();
}
