// ── npcs.js ──
// NPC and bandit simulation runs server-side.
// Palette constants are used by renderer-units.js.

const NPC_TRADER_PAL = {
  '.':null,
  'H':'#8b5e1a', 'h':'#5a3c08',
  's':'#d4a060', 'e':'#180800',
  't':'#c07820', 'T':'#804a08',
  'b':'#5a3010',
};

const NPC_WKNIGHT_PAL = {
  '.':null,
  'K':'#c84040', 'k':'#601818',
  'V':'#0a0608',
  'A':'#a03030',
  'L':'#e05858',
};

const BANDIT_PAL = {
  '.':null,
  'H':'#1a1014', 'h':'#0c080e',
  's':'#2a1e14', 'e':'#d06818',
  't':'#181018', 'T':'#100c14',
  'b':'#120e0e',
};

let npcModal = null;
let npcs     = [];

// Draw a merchant cart to the right of the given screen position
function drawCaravanCart(px, py, sz) {
  if (sz < 10) return;

  // Cart sits offset right and slightly lower than the trader
  const cx = Math.floor(px + sz * 0.90);
  const cy = Math.floor(py - sz * 0.12);

  const bw = Math.floor(sz * 0.88); // body width
  const bh = Math.floor(sz * 0.28); // body height
  const bx = cx - Math.floor(bw / 2);
  const by = cy - Math.floor(bh / 2);

  // Cart body
  ctx.fillStyle = '#7a5020';
  ctx.fillRect(bx, by, bw, bh);

  // Top rail (darker)
  ctx.fillStyle = '#4a2c0c';
  ctx.fillRect(bx, by, bw, Math.max(2, Math.floor(sz * 0.05)));

  // Side planks
  ctx.fillStyle = '#5a3810';
  ctx.fillRect(bx, by, Math.max(2, Math.floor(sz * 0.05)), bh);
  ctx.fillRect(bx + bw - Math.max(2, Math.floor(sz * 0.05)), by, Math.max(2, Math.floor(sz * 0.05)), bh);

  // Cargo sacks
  const skW = Math.floor(bw * 0.36), skH = Math.floor(sz * 0.20);
  ctx.fillStyle = '#c8a050';
  ctx.fillRect(bx + Math.floor(bw * 0.06), by - skH + Math.floor(skH * 0.35), skW, skH);
  ctx.fillRect(bx + Math.floor(bw * 0.46), by - skH + Math.floor(skH * 0.45), Math.floor(skW * 0.85), Math.floor(skH * 0.85));
  // Sack shadow line
  ctx.fillStyle = '#9a7830';
  ctx.fillRect(bx + Math.floor(bw * 0.06), by - skH + Math.floor(skH * 0.35), skW, Math.max(1, Math.floor(skH * 0.18)));

  // Wheels
  const wR  = Math.max(3, Math.floor(sz * 0.14));
  const wY  = by + bh + Math.floor(sz * 0.02);
  const wLX = cx - Math.floor(bw * 0.28);
  const wRX = cx + Math.floor(bw * 0.28);

  ctx.fillStyle = '#3a2010';
  ctx.beginPath(); ctx.arc(wLX, wY, wR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(wRX, wY, wR, 0, Math.PI * 2); ctx.fill();

  // Wheel hub
  const hubR = Math.max(1, Math.floor(wR * 0.38));
  ctx.fillStyle = '#7a5030';
  ctx.beginPath(); ctx.arc(wLX, wY, hubR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(wRX, wY, hubR, 0, Math.PI * 2); ctx.fill();

  // Spokes at higher zoom
  if (sz >= 26) {
    ctx.strokeStyle = '#5a3818';
    ctx.lineWidth = Math.max(1, Math.floor(sz * 0.025));
    for (const wx of [wLX, wRX]) {
      for (let a = 0; a < 4; a++) {
        const ang = (a / 4) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(wx + Math.cos(ang) * hubR, wY + Math.sin(ang) * hubR);
        ctx.lineTo(wx + Math.cos(ang) * wR,   wY + Math.sin(ang) * wR);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(wx - Math.cos(ang) * hubR, wY - Math.sin(ang) * hubR);
        ctx.lineTo(wx - Math.cos(ang) * wR,   wY - Math.sin(ang) * wR);
        ctx.stroke();
      }
    }
  }
}
