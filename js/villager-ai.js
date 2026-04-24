// ── villager-ai.js ──
// UI helpers used by game.js HUD — all simulation runs server-side.

const TOOL_ROLES = new Set([VROLE.WOODCUTTER, VROLE.BUILDER, VROLE.STONE_MINER]);
const HOUSE_CAP  = 4;
const TRAIN_TIME = 25;

const UPGRADE_PREREQ = {
  [VROLE.KNIGHT]:      6,  // Barracks
  [VROLE.ARCHER]:      3,  // Tower
  [VROLE.BAKER]:       1,  // Bakery
  [VROLE.STONE_MINER]: 5,  // Mine
  [VROLE.TOOLSMITH]:   7,  // Forge
  [VROLE.FARMER]:      4,  // Farmland
};

function hasPrereq(newRole) {
  const reqType = UPGRADE_PREREQ[newRole];
  if (reqType === undefined) return true;
  return buildings.some(b => b.type === reqType && b.complete);
}

function getPopCap() {
  let cap = 0;
  for (const b of buildings) {
    if (b.type !== 0 || !b.complete) continue;
    const t = b.tier || 1;
    cap += t === 3 ? 9 : t === 2 ? 6 : HOUSE_CAP;
  }
  return cap;
}
