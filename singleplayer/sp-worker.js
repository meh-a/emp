// ── Singleplayer Web Worker ──────────────────────────────────────

// Polyfill Node.js Buffer for server game files
globalThis.Buffer = {
  from(v) {
    if (typeof v === 'string') return v;
    return new TextDecoder().decode(v);
  }
};

let room = null;
let _playerKingdom = null;

const fakeWs = {
  send(data) { self.postMessage(data); },
  close() {},
  readyState: 1,
};

self.onmessage = async (e) => {
  const msg = e.data;

  // Save request — serialize current state and send back
  if (msg && msg._save && room && _playerKingdom) {
    try {
      const saveData = _serializeRoom(room, _playerKingdom);
      self.postMessage(JSON.stringify({ type: 'save_data', saveData }));
    } catch (err) {
      self.postMessage(JSON.stringify({ type: 'save_error', message: err.message }));
    }
    return;
  }

  if (!msg || !msg._init) {
    if (room) room.handleMessage(fakeWs, JSON.stringify(msg));
    return;
  }

  const playerName = msg.playerName || 'Wanderer';

  // Signal that the worker script itself loaded fine
  self.postMessage(JSON.stringify({ type: '_workerReady' }));

  try {
    const mods = [
      '../server/game/constants.js',
      '../server/game/accounts.js',
      '../server/game/sprites.js',
      '../server/game/world.js',
      '../server/game/Kingdom.js',
      '../server/game/buildings.js',
      '../server/game/villager-targets.js',
      '../server/game/villager-ai.js',
      '../server/game/combat.js',
      '../server/game/npcs.js',
      '../server/game/GameRoom.js',
    ];

    // First pass: fetch each file to verify HTTP status and MIME type
    for (const m of mods) {
      const url = new URL(m, import.meta.url).href;
      const r = await fetch(url);
      const ct = r.headers.get('content-type') || 'none';
      self.postMessage(JSON.stringify({
        type: '_workerImported',
        mod: `${m.split('/').pop()} → ${r.status} ${ct.split(';')[0]}`,
      }));
      if (!r.ok) throw new Error(`${m} HTTP ${r.status}`);
    }

    // Second pass: import (v param busts module cache on redeploy)
    const _v = `?v=20250503c`;
    for (const m of mods) {
      await import(new URL(m, import.meta.url).href + _v);
    }
    const { GameRoom } = await import(new URL('../server/game/GameRoom.js', import.meta.url).href + _v);
    const { Kingdom }  = await import(new URL('../server/game/Kingdom.js',  import.meta.url).href + _v);
    const { rebuildNavBlocked } = await import(new URL('../server/game/buildings.js', import.meta.url).href + _v);
    const { generate } = await import(new URL('../server/game/world.js', import.meta.url).href + _v);

    room = new GameRoom('sp');
    room._broadcastRaw = (str) => {
      try {
        const parsed = JSON.parse(str);
        if (parsed.type === 'ready') return;
      } catch {}
      self.postMessage(str);
    };

    let kingdom;

    if (msg.saveData) {
      // ── Restore from save ─────────────────────────────────────
      const sd = msg.saveData;
      room.seed = sd.seed;

      // Regenerate deterministic terrain arrays (mapTiles, mapHeight, etc.)
      await generate(room, sd.seed, pct => {
        self.postMessage(JSON.stringify({ type: 'loading', pct }));
      });

      // Overlay saved room-level state
      room.day              = sd.day;
      room.dayTime          = sd.dayTime;
      room._botsInitialised = sd._botsInitialised || false;
      room._totalBotWaves   = sd._totalBotWaves   || 0;
      room._nextBotTimer    = sd._nextBotTimer     || 0;
      room._ekId            = sd._ekId    || 0;
      room._ekBldId         = sd._ekBldId || -100;
      room._ekVilId         = sd._ekVilId || -200;
      room._treeId          = sd._treeId  || 0;
      if (sd.trees)              room.trees              = sd.trees.map(_deserializeTree);
      if (sd.regrowthQueue)      room.regrowthQueue      = sd.regrowthQueue;
      if (sd.resourceNodes)      room.resourceNodes      = sd.resourceNodes;
      if (sd.enemyKingdomSites)  room.enemyKingdomSites  = sd.enemyKingdomSites;

      // Restore bot kingdoms
      room.botKingdoms = (sd.botKingdoms || []).map(ek => _deserializeBotKingdom(ek));

      // Restore player kingdom
      const sk = sd.kingdom;
      kingdom = new Kingdom(room, sk.id);
      kingdom.ws   = fakeWs;
      kingdom.name = sk.name;
      _restoreKingdom(kingdom, sk, rebuildNavBlocked);
      room.kingdoms.push(kingdom);
      room._kidCounter = sk.id + 1;

    } else {
      // ── Fresh game ────────────────────────────────────────────
      await room.init();
      room.clients.add(fakeWs);
      kingdom = room.addPlayer(fakeWs, playerName, true);
    }

    _playerKingdom = kingdom;

    const initMsg = {
      type:        'init',
      seed:        room.seed,
      myKingdomId: kingdom.id,
      trees:       room.trees,
      settled:     kingdom.settled,
      townCenter:  kingdom.townCenter ? { ...kingdom.townCenter } : null,
    };

    // Send explored fog back to client so the map stays uncovered after load
    if (msg.saveData && kingdom.fogExplored) {
      initMsg.fogExplored = _encodeUint8(kingdom.fogExplored);
    }

    self.postMessage(JSON.stringify(initMsg));

    room.start();
  } catch (err) {
    self.postMessage(JSON.stringify({ type: '_error', message: err.message, stack: err.stack }));
    console.error('[sp-worker]', err);
  }
};

// ── Serialization ─────────────────────────────────────────────────

function _serializeRoom(room, kingdom) {
  return {
    version:    1,
    timestamp:  Date.now(),
    playerName: kingdom.name,
    seed:       room.seed,
    day:        room.day,
    dayTime:    room.dayTime,
    _botsInitialised: room._botsInitialised,
    _totalBotWaves:   room._totalBotWaves,
    _nextBotTimer:    room._nextBotTimer,
    _ekId:    room._ekId,
    _ekBldId: room._ekBldId,
    _ekVilId: room._ekVilId,
    _treeId:  room._treeId,
    trees:            room.trees.map(_serializeTree),
    regrowthQueue:    room.regrowthQueue ? room.regrowthQueue.map(r => ({ ...r })) : [],
    resourceNodes:    room.resourceNodes ? room.resourceNodes.map(n => ({ ...n })) : [],
    enemyKingdomSites: room.enemyKingdomSites ? [...room.enemyKingdomSites] : [],
    botKingdoms:      room.botKingdoms.map(_serializeBotKingdom),
    kingdom:          _serializeKingdom(kingdom),
  };
}

function _serializeTree(t) {
  return { id: t.id, tx: t.tx, ty: t.ty, ox: t.ox, oy: t.oy, scale: t.scale };
}

function _deserializeTree(t) {
  return { id: t.id, tx: t.tx, ty: t.ty, ox: t.ox ?? 0, oy: t.oy ?? 0, scale: t.scale ?? 0.88 };
}

function _serializeBotKingdom(ek) {
  return {
    id:         ek.id,
    difficulty: ek.difficulty,
    tx:         ek.tx,
    ty:         ek.ty,
    hp:         ek.hp,
    maxHp:      ek.maxHp,
    name:       ek.name,
    raidTimer:   ek.raidTimer,
    raidInterval: ek.raidInterval,
    _guardRespawnTimer: ek._guardRespawnTimer || 0,
    _scoutTimer: ek._scoutTimer || 0,
    buildings: (ek.buildings || []).map(b => ({ ...b })),
    villagers: (ek.villagers || []).map(_serializeBotUnit),
    guards:    (ek.guards    || []).map(_serializeBotUnit),
    scouts:    (ek.scouts    || []).map(_serializeBotUnit),
  };
}

function _serializeBotUnit(u) {
  return {
    id:    u.id,
    role:  u.role,
    x:     u.x,
    y:     u.y,
    tx:    u.tx ?? Math.floor(u.x),
    ty:    u.ty ?? Math.floor(u.y),
    state: u.state || 'idle',
    hp:    u.hp,
    maxHp: u.maxHp,
    attackTimer:  u.attackTimer  || 0,
    home:         u.home,
    patrolAngle:  u.patrolAngle,
    _despawn:     u._despawn || false,
  };
}

function _serializeKingdom(k) {
  return {
    id:   k.id,
    name: k.name,
    gold:  k.gold,  wood:  k.wood,  food:  k.food,
    crops: k.crops, stone: k.stone, iron:  k.iron,
    toolStock:   Array.from(k.toolStock),
    buildCounts: Array.from(k.buildCounts || []),
    settled:    k.settled,
    townCenter: k.townCenter ? { ...k.townCenter } : null,
    villagers:  k.villagers.map(_serializeVillager),
    buildings:  k.buildings.map(b => ({ ...b })),
    roadTiles:  Array.from(k.roadTiles),
    spawnTimer: k.spawnTimer,
    goldTimer:  k.goldTimer,
    feedTimer:  k.feedTimer,
    _vid:       k._vid,
    _bid:       k._bid,
    _npcId:     k._npcId,
    _banditId:  k._banditId,
    _banditSpawnTimer: k._banditSpawnTimer,
    _usedNames:    Array.from(k._usedNames),
    gameState:     k.gameState,
    claimedQuests: Array.from(k.claimedQuests),
    tier4Slots:    k.tier4Slots,
    tier5Slots:    k.tier5Slots,
    fogExplored:   _encodeUint8(k.fogExplored),
    npcs:    (k.npcs    || []).map(_serializeNPC),
    bandits: (k.bandits || []).map(_serializeBotUnit),
    npcVisitTimer:      k.npcVisitTimer,
    alertMode:          k.alertMode,
    _eid: k._eid,
    _pid: k._pid,
  };
}

function _serializeVillager(v) {
  return {
    id:    v.id,
    role:  v.role,
    name:  v.name,
    x:     v.x,
    y:     v.y,
    tx:    v.tx,
    ty:    v.ty,
    state:     v.state,
    idleTimer: v.idleTimer || 0,
    hunger: v.hunger,
    tired:  v.tired,
    hp:     v.hp,
    maxHp:  v.maxHp,
    tier:     v.tier,
    xp:       v.xp,
    toolTier: v.toolTier || 0,
    upgradeTimer:   v.upgradeTimer,
    _trainingRole:  v._trainingRole  || null,
    _trainingTimer: v._trainingTimer || null,
    patrolAngle:    v.patrolAngle || 0,
    _goingSleep:    v._goingSleep || false,
  };
}

function _serializeNPC(n) {
  return {
    id:    n.id,
    type:  n.type,
    name:  n.name,
    x:     n.x,
    y:     n.y,
    state: n.state,
    waitTimer: n.waitTimer,
    offers:   n.offers,
    strength: n.strength,
    caravan:  n.caravan || false,
  };
}

function _encodeUint8(arr) {
  if (!arr || !arr.length) return null;
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

// ── Deserialization ───────────────────────────────────────────────

function _deserializeBotKingdom(ek) {
  return {
    id:         ek.id,
    difficulty: ek.difficulty,
    tx:         ek.tx,
    ty:         ek.ty,
    hp:         ek.hp,
    maxHp:      ek.maxHp,
    name:       ek.name,
    raidTimer:   ek.raidTimer,
    raidInterval: ek.raidInterval,
    _guardRespawnTimer: ek._guardRespawnTimer || 0,
    _scoutTimer: ek._scoutTimer || 0,
    buildings: (ek.buildings || []).map(b => ({ ...b })),
    villagers: (ek.villagers || []).map(_deserializeBotUnit),
    guards:    (ek.guards    || []).map(_deserializeBotUnit),
    scouts:    (ek.scouts    || []).map(_deserializeBotUnit),
  };
}

function _deserializeBotUnit(u) {
  return {
    ...u,
    path:         [],
    attackTarget: null,
    attackAnim:   0,
    _hitFlash:    0,
  };
}

function _restoreKingdom(k, sk, rebuildNavBlocked) {
  k.gold  = sk.gold  || 0;
  k.wood  = sk.wood  || 0;
  k.food  = sk.food  || 0;
  k.crops = sk.crops || 0;
  k.stone = sk.stone || 0;
  k.iron  = sk.iron  || 0;
  k.toolStock   = sk.toolStock   ? [...sk.toolStock]   : [999, 0, 0];
  k.buildCounts = sk.buildCounts ? [...sk.buildCounts] : new Array(10).fill(0);
  k.settled    = sk.settled    || false;
  k.townCenter = sk.townCenter ? { ...sk.townCenter } : null;
  k.roadTiles  = new Set(sk.roadTiles || []);
  k.spawnTimer = sk.spawnTimer || 0;
  k.goldTimer  = sk.goldTimer  || 0;
  k.feedTimer  = sk.feedTimer  || 0;
  k._vid       = sk._vid       || 0;
  k._bid       = sk._bid       || 0;
  k._npcId     = sk._npcId     || 0;
  k._banditId  = sk._banditId  || 0;
  k._banditSpawnTimer = sk._banditSpawnTimer || 0;
  k._usedNames    = new Set(sk._usedNames || []);
  k.gameState     = sk.gameState     || 'playing';
  k.claimedQuests = new Set(sk.claimedQuests || []);
  k.tier4Slots    = sk.tier4Slots    || 0;
  k.tier5Slots    = sk.tier5Slots    || 0;
  k.npcVisitTimer = sk.npcVisitTimer || 0;
  k.alertMode     = sk.alertMode     || false;
  k._eid          = sk._eid || 0;
  k._pid          = sk._pid || 0;

  // Restore fog-explored map
  if (sk.fogExplored) {
    const decoded = _decodeUint8(sk.fogExplored);
    if (decoded && decoded.length === k.fogExplored.length) {
      k.fogExplored.set(decoded);
    }
  }

  // Restore villagers with cleared transient state
  k.villagers = (sk.villagers || []).map(_deserializeVillager);

  // Assign stagger slots for pathfinding
  k._pfCounter = 0;
  for (const v of k.villagers) v._pfSlot = k._pfCounter++;

  k.buildings = (sk.buildings || []).map(b => ({ ...b }));
  k.npcs      = (sk.npcs    || []).map(n => ({ ...n, path: [] }));
  k.bandits   = (sk.bandits || []).map(_deserializeBotUnit);

  rebuildNavBlocked(k);
}

function _deserializeVillager(v) {
  return {
    ...v,
    path:         [],
    selected:     false,
    buildTarget:  null,
    chopTarget:   null,  chopTimer:   0,
    farmTarget:   null,  farmTimer:   0,
    bakeryTarget: null,  bakeTimer:   0,
    mineTarget:   null,  mineTimer:   0,
    forgeTarget:  null,  forgeTimer:  0,
    repairTarget: null,  repairTimer: 0,
    attackTarget: null,  attackTimer: 0,
    attackAnim:   0,
    _hitFlash:    0,
    _sleepTarget: null,
    _despawn:     false,
    _pfSlot:      0,
    _pfVersion:   -1,
    _pathCacheTx: -1,
    _pathCacheTy: -1,
  };
}

function _decodeUint8(b64) {
  try {
    const binary = atob(b64);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return arr;
  } catch { return null; }
}
