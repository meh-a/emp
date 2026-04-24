// ── Singleplayer Web Worker ──────────────────────────────────────

// Polyfill Node.js Buffer for server game files
globalThis.Buffer = {
  from(v) {
    if (typeof v === 'string') return v;
    return new TextDecoder().decode(v);
  }
};

let room = null;

const fakeWs = {
  send(data) { self.postMessage(data); },
  close() {},
  readyState: 1,
};

self.onmessage = async (e) => {
  const msg = e.data;
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

    // Second pass: import
    for (const m of mods) {
      await import(new URL(m, import.meta.url).href);
    }
    const { GameRoom } = await import(new URL('../server/game/GameRoom.js', import.meta.url).href);

    room = new GameRoom('sp');
    room._broadcastRaw = (str) => {
      try {
        const parsed = JSON.parse(str);
        if (parsed.type === 'ready') return;
      } catch {}
      self.postMessage(str);
    };

    await room.init();

    room.clients.add(fakeWs);
    const kingdom = room.addPlayer(fakeWs, playerName, true);

    self.postMessage(JSON.stringify({
      type:        'init',
      seed:        room.seed,
      myKingdomId: kingdom.id,
      trees:       room.trees,
    }));

    room.start();
  } catch (err) {
    self.postMessage(JSON.stringify({ type: '_error', message: err.message, stack: err.stack }));
    console.error('[sp-worker]', err);
  }
};
