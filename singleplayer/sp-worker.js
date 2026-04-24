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
    ];
    for (const m of mods) {
      await import(m);
      self.postMessage(JSON.stringify({ type: '_workerImported', mod: m }));
    }

    // Fetch-diagnose GameRoom.js before trying to import it
    const grUrl = new URL('../server/game/GameRoom.js', import.meta.url).href;
    const grResp = await fetch(grUrl);
    self.postMessage(JSON.stringify({
      type: '_workerImported',
      mod: `fetch GameRoom.js → ${grResp.status} ${grResp.headers.get('content-type')}`,
    }));
    if (!grResp.ok) throw new Error(`GameRoom.js fetch ${grResp.status}`);

    const { GameRoom } = await import(grUrl);

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
