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
    // Dynamic import so module load errors are catchable
    const { GameRoom } = await import('../server/game/GameRoom.js');

    self.postMessage(JSON.stringify({ type: '_workerImported' }));

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
