// ── buildings.js ──

// ═══════════════════════════════════════════════════
//  BUILDINGS
// ═══════════════════════════════════════════════════
function canBuildAt(tx, ty, type) {
  const [w, h] = STRUCT_SIZE[type] || [1, 1];
  if (tx<0||tx+w>MAP_W||ty<0||ty+h>MAP_H) return false;
  // Road: check tile validity and not already a road
  if (type === 8) {
    if (!STRUCT_VALID[8].has(mapTiles[ty][tx])) return false;
    if (roadTiles.has(ty*MAP_W+tx)) return false;
    return true;
  }
  // Outpost: explored tile, distance restrictions
  if (type === 9) {
    if (!fogExplored[ty*MAP_W+tx]) return false;
    if (townCenter && Math.hypot(townCenter.tx-tx, townCenter.ty-ty) < 20) return false;
    if (buildings.some(b=>b.type===9 && Math.hypot(b.tx-tx, b.ty-ty)<15)) return false;
  }
  // Gate: must be placed adjacent to a completed wall
  if (type === 10) {
    const hasWall = buildings.some(b =>
      b.type === 2 && b.complete && Math.abs(b.tx - tx) + Math.abs(b.ty - ty) === 1
    );
    if (!hasWall) return false;
  }
  for (let dy=0; dy<h; dy++) for (let dx=0; dx<w; dx++) {
    if (!STRUCT_VALID[type].has(mapTiles[ty+dy][tx+dx])) return false;
    if (buildings.some(b=>tx+dx>=b.tx&&tx+dx<b.tx+b.w&&ty+dy>=b.ty&&ty+dy<b.ty+b.h)) return false;
  }
  return true;
}

function scaledCost(type) {
  const base = STRUCT_COST[type];
  if (!base) return {};
  const n = buildCounts[type] || 0;
  const add = Math.floor(n / 3); // +1 per resource per 3 buildings of this type
  const result = {};
  for (const [r, v] of Object.entries(base)) result[r] = v + add;
  return result;
}

// Solid building types block both villagers and enemies; Walls block enemies only
const SOLID_TYPES = new Set([0,1,3,6,7,9]); // House, Bakery, Tower, Barracks, Forge, Outpost

function rebuildNavBlocked() {
  navBlocked.fill(0);
  villagerBlocked.fill(0);
  for (const b of buildings) {
    if (!b.complete) continue;
    if (b.type === 2) {  // Wall: blocks enemies and villagers/NPCs
      for (let dy=0; dy<b.h; dy++) for (let dx=0; dx<b.w; dx++) {
        const i = (b.ty+dy)*MAP_W+(b.tx+dx);
        navBlocked[i] = 1;
        villagerBlocked[i] = 1;
      }
    }
    if (SOLID_TYPES.has(b.type)) {  // Solid: blocks both
      for (let dy=0; dy<b.h; dy++) for (let dx=0; dx<b.w; dx++) {
        const i = (b.ty+dy)*MAP_W+(b.tx+dx);
        navBlocked[i] = 1;
        villagerBlocked[i] = 1;
      }
    }
  }
  // Trees block villager pathfinding
  for (const t of trees) {
    villagerBlocked[t.ty * MAP_W + t.tx] = 1;
  }
}

function canAffordBuilding(i) {
  const cost = scaledCost(i);
  if (!cost) return true;
  const res = {wood, stone, iron, gold, food, crops};
  return Object.entries(cost).every(([r, v]) => (res[r] || 0) >= v);
}

function refreshBuildCosts() {
  let affordableCount = 0;
  STRUCT_COST.forEach((_, i) => {
    const btn = document.getElementById(`bbtn-${i}`);
    if (!btn) return;
    const can = canAffordBuilding(i);
    btn.style.opacity = can ? '' : '0.35';
    btn.style.cursor  = can ? '' : 'default';
    if (can) affordableCount++;
  });

  const fab = document.getElementById('build-fab');
  fab.title     = affordableCount > 0 ? '' : 'Nothing to build';
  fab.innerHTML = affordableCount > 0 ? iconHTML('hammer', 22) : '×';
}

function toggleBuildPanel() {
  if (!settled) return;
  buildMode = !buildMode;
  if (!buildMode) {
    placingType = null;
    document.getElementById('build-tooltip').classList.remove('visible');
    const s = document.getElementById('build-search');
    if (s) { s.value = ''; document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('hidden')); }
  }
  document.getElementById('build-menu').classList.toggle('open', buildMode);
  document.getElementById('build-fab').classList.toggle('open', buildMode);
  document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('active'));
  if (buildMode) {
    refreshBuildCosts();
    requestAnimationFrame(() => { const s = document.getElementById('build-search'); if (s) s.focus(); });
  }
}

function selectBuildType(type) {
  placingType=(placingType===type)?null:type;
  document.querySelectorAll('.build-btn').forEach(b => b.classList.toggle('active', b.id === `bbtn-${placingType}`));
}

// ═══════════════════════════════════════════════════
//  BUILDING UPGRADE PANEL
// ═══════════════════════════════════════════════════
const BLDG_TIER_NAMES = [
  ['House','Manor','Estate'],
  ['Bakery','Mill','Granary'],
  null,
  ['Tower','Watchtower','Fortress'],
  null,
  ['Mine','Deep Mine','Iron Works'],
  ['Barracks','War Camp','Citadel'],
  ['Forge','Smithy','Foundry'],
  null, null, null,
];
const BLDG_TIER_COSTS = [
  [{wood:30,stone:20},        {wood:50,stone:30,gold:20}],
  [{wood:20,stone:10,iron:10},{iron:20,gold:30}],
  null,
  [{stone:40,iron:20},        {stone:60,iron:40}],
  null,
  [{wood:20,iron:20},         {iron:40,stone:20}],
  [{iron:30,gold:20},         {iron:60,gold:40}],
  [{iron:10,stone:30},        {iron:80,gold:60}],
  null, null, null,
];
const BLDG_TIER_EFFECTS = [
  ['4 pop per house','6 pop per house','9 pop per house'],
  ['Standard baking','1.8× food output','2.5× food output'],
  null,
  ['Standard range','1.5× range & damage','2× range & damage'],
  null,
  ['Standard yield','1.5× stone, +1 iron','2× stone, +3 iron'],
  ['Standard knights','Knights deal +25% dmg','Knights deal +50% dmg'],
  ['Unlocks nothing','Unlocks Tier 2 upgrades','Unlocks Tier 3 upgrades'],
  null, null, null,
];
// RES_ICON replaced by iconHTML() calls

let _bldgPanelBuilding = null;

function showBuildingPanel(b) {
  if (!BLDG_TIER_NAMES[b.type] && b.complete) return; // not upgradeable
  _bldgPanelBuilding = b;
  _refreshBuildingPanel();
  document.getElementById('bldg-panel').classList.add('visible');
}

function closeBuildingPanel() {
  _bldgPanelBuilding = null;
  document.getElementById('bldg-panel').classList.remove('visible');
}

function _refreshBuildingPanel() {
  const b = _bldgPanelBuilding;
  if (!b) return;
  const tier = b.tier || 1;
  const names = BLDG_TIER_NAMES[b.type];
  const effects = BLDG_TIER_EFFECTS[b.type];
  const costs = BLDG_TIER_COSTS[b.type];

  const deleteBtn = document.getElementById('bldg-panel-delete-btn');
  deleteBtn.style.display = !b.complete ? 'block' : 'none';

  if (!names) {
    // No upgrade info, just show name and delete button for under-construction buildings
    document.getElementById('bldg-panel-name').textContent = 'Under Construction';
    document.getElementById('bldg-panel-tier-badge').textContent = '';
    document.getElementById('bldg-panel-effect').textContent = '';
    document.getElementById('bldg-panel-upgrade-row').style.display = 'none';
    document.getElementById('bldg-panel-req').textContent = '';
    return;
  }

  document.getElementById('bldg-panel-name').textContent = names[tier - 1];
  document.getElementById('bldg-panel-tier-badge').textContent = `TIER ${tier}`;
  document.getElementById('bldg-panel-effect').textContent = effects ? effects[tier - 1] : '';

  const upgradeRow = document.getElementById('bldg-panel-upgrade-row');
  const reqEl = document.getElementById('bldg-panel-req');
  const btn = document.getElementById('bldg-panel-upgrade-btn');
  const costEl = document.getElementById('bldg-panel-cost');

  if (!b.complete) {
    upgradeRow.style.display = 'none';
    reqEl.textContent = 'Under construction…';
    return;
  }

  if (tier >= 3) {
    upgradeRow.style.display = 'none';
    reqEl.textContent = 'Fully upgraded';
    return;
  }

  upgradeRow.style.display = 'flex';
  const cost = costs[tier - 1];
  const costStr = Object.entries(cost).map(([r,v])=>`${v}${iconHTML(r,11)}`).join(' ');
  costEl.innerHTML = costStr;
  btn.textContent = `Upgrade → ${names[tier]}`;

  // Check Forge requirement
  let reqMet = true;
  let reqText = '';
  if (b.type !== 7) {
    const neededForgeTier = tier + 1;
    const neededForgeName = BLDG_TIER_NAMES[7][neededForgeTier - 1];
    const bestForgeTier = buildings
      .filter(fb => fb.type === 7 && fb.complete)
      .reduce((best, fb) => Math.max(best, fb.tier || 1), 0);
    if (bestForgeTier < neededForgeTier) {
      reqMet = false;
      reqText = `Requires ${neededForgeName}`;
    }
  }

  // Check resources
  const res = {wood, stone, iron, gold, food, crops};
  const canAfford = Object.entries(cost).every(([r,v]) => (res[r]||0) >= v);

  btn.disabled = !reqMet || !canAfford;
  reqEl.textContent = !reqMet ? reqText : (!canAfford ? 'Not enough resources' : '');
}

function requestBuildingUpgrade() {
  if (!_bldgPanelBuilding) return;
  netSend({ type: 'upgrade_building', buildingId: _bldgPanelBuilding.id });
}

function requestDeleteBuilding() {
  if (!_bldgPanelBuilding || _bldgPanelBuilding.complete) return;
  netSend({ type: 'delete_building', buildingId: _bldgPanelBuilding.id });
  closeBuildingPanel();
}

function refreshBuildingPanelIfOpen() {
  if (!_bldgPanelBuilding) return;
  // Find the updated building from the latest state
  const updated = buildings.find(b => b.id === _bldgPanelBuilding.id);
  if (!updated) { closeBuildingPanel(); return; }
  _bldgPanelBuilding = updated;
  _refreshBuildingPanel();
}
