// ── renderer-units.js ──

function drawTreeObj(tree, sz) {
  const treeSz = tree.scale * sz;
  if (treeSz < 3) return;
  const bx = tree.tx * sz + tree.ox * sz - camX;
  const by = tree.ty * sz + tree.oy * sz - camY;
  const wobble = _choppingIds.has(tree.id) ? Math.sin(time * 24) * treeSz * 0.09 : 0;
  const cx = bx + treeSz * 0.5 + wobble;
  const fi = tree.ty * MAP_W + tree.tx;
  const inFog = !fogVisible[fi];

  if (inFog) ctx.globalAlpha = 0.35;

  // Ground shadow ellipse under trunk
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, by + treeSz * 0.84, treeSz * 0.22, treeSz * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pick sprite based on tile biome
  const tile = mapTiles[tree.ty]?.[tree.tx];
  let sprite, pal;
  if (tile === T.TUNDRA) {
    sprite = STAMP.tundra_tree;
    pal    = STAMP_PAL.tundra_tree;
  } else if (tile === T.DESERT) {
    sprite = STAMP.cactus;
    pal    = STAMP_PAL.cactus;
  } else {
    sprite = STAMP.tree;
    pal    = TREE_SEASON_PAL[season] ?? STAMP_PAL.tree;
  }

  drawSprite(sprite, pal, Math.floor(bx + wobble), Math.floor(by), treeSz);

  if (inFog) ctx.globalAlpha = 1.0;
}

// ── Health bar helper ────────────────────────────────────────────
function drawHealthBar(x, y, hp, maxHp, w) {
  const pct = hp / maxHp;
  const bh  = Math.max(2, w * 0.07);
  const by  = y - bh - 1;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(Math.floor(x), Math.floor(by), Math.ceil(w), Math.ceil(bh));
  const r = cl(220 - pct*100), g = cl(pct*210);
  ctx.fillStyle = `rgb(${r},${g},20)`;
  ctx.fillRect(Math.floor(x), Math.floor(by), Math.ceil(w*pct), Math.ceil(bh));
}

// ── Connected wall rendering ──────────────────────────────────────
function isWallAt(tx, ty) {
  return buildings.some(b => b.type === 2 && b.complete && b.tx === tx && b.ty === ty);
}

function drawConnectedWall(b, sx, sy, sz, enemyTint) {
  const tx = b.tx, ty = b.ty;
  const hasN = isWallAt(tx, ty - 1);
  const hasS = isWallAt(tx, ty + 1);
  const hasE = isWallAt(tx + 1, ty);
  const hasW = isWallAt(tx - 1, ty);

  const w = Math.ceil(sz), h = Math.ceil(sz);
  // Merlon thickness and dimensions
  const mT  = Math.max(2, Math.floor(sz * 0.20)); // merlon depth (inset band)
  const mW  = Math.max(3, Math.floor(sz * 0.24)); // merlon block width
  const gap = Math.max(1, Math.floor(sz * 0.12)); // gap between merlons

  // 1. Outer stone border (merlons band area)
  ctx.fillStyle = '#706858';
  ctx.fillRect(sx, sy, w, h);

  // 2. Inner walkway surface
  const iX = sx + (hasW ? 0 : mT);
  const iY = sy + (hasN ? 0 : mT);
  const iW = w - (hasW ? 0 : mT) - (hasE ? 0 : mT);
  const iH = h - (hasN ? 0 : mT) - (hasS ? 0 : mT);
  ctx.fillStyle = '#9c9080';
  ctx.fillRect(iX, iY, iW, iH);

  // 3. Mortar lines on walkway
  const blk = Math.max(4, Math.floor(sz * 0.27));
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let row = 0, yy = iY; yy < iY + iH; yy += blk, row++) {
    ctx.fillRect(iX, yy, iW, 1); // horizontal mortar
    const off = (row % 2) ? Math.floor(blk * 0.5) : 0;
    for (let xx = iX - off; xx < iX + iW + blk; xx += blk) {
      if (xx >= iX && xx < iX + iW) ctx.fillRect(xx, yy, 1, blk); // vertical mortar
    }
  }

  // 4. Highlight / shadow edges on walkway
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(iX, iY, iW, 1);
  ctx.fillRect(iX, iY, 1, iH);
  ctx.fillStyle = 'rgba(0,0,0,0.20)';
  ctx.fillRect(iX, iY + iH - 1, iW, 1);
  ctx.fillRect(iX + iW - 1, iY, 1, iH);

  // 5. Merlons (battlements) on exposed edges
  function drawMerlonsH(ex, ey, totalW, vertical) {
    // Draw merlon blocks along a horizontal or vertical band
    ctx.fillStyle = '#5a5048';
    const step = mW + gap;
    const count = Math.max(1, Math.floor((totalW - gap) / step));
    const offset = Math.floor((totalW - count * step + gap) / 2);
    for (let i = 0; i < count; i++) {
      const pos = offset + i * step;
      if (vertical) {
        ctx.fillRect(ex, ey + pos, mT, mW);
        ctx.fillStyle = '#7a6e62'; ctx.fillRect(ex, ey + pos, 1, mW); // left highlight
        ctx.fillRect(ex, ey + pos, mT, 1);                             // top highlight
        ctx.fillStyle = '#3e3830'; ctx.fillRect(ex + mT - 1, ey + pos, 1, mW); // right shadow
        ctx.fillStyle = '#5a5048';
      } else {
        ctx.fillRect(ex + pos, ey, mW, mT);
        ctx.fillStyle = '#7a6e62'; ctx.fillRect(ex + pos, ey, mW, 1); // top highlight
        ctx.fillRect(ex + pos, ey, 1, mT);                             // left highlight
        ctx.fillStyle = '#3e3830'; ctx.fillRect(ex + pos, ey + mT - 1, mW, 1); // bottom shadow
        ctx.fillStyle = '#5a5048';
      }
    }
  }

  if (!hasN) drawMerlonsH(sx,         sy,         w, false);
  if (!hasS) drawMerlonsH(sx,         sy + h - mT, w, false);
  if (!hasW) drawMerlonsH(sx,         sy,          h, true);
  if (!hasE) drawMerlonsH(sx + w - mT, sy,         h, true);

  if (enemyTint) {
    ctx.fillStyle = 'rgba(180,20,20,0.28)';
    ctx.fillRect(sx, sy, w, h);
  }
}

function drawBuildingObj(b, sz) {
  const sx  = Math.floor(b.tx * sz - camX);
  const tsy = Math.floor(b.ty * sz - camY);   // tile-top y
  const bw  = sz * b.w;
  const hm  = BLDG_HEIGHT[b.type] ?? 1.0;
  const bh  = bw * hm;                        // visual height
  const sy  = tsy - (bh - bw);                // shift up so bottom aligns with tile bottom

  if (!b.complete) {
    ctx.globalAlpha = 0.25 + b.progress * 0.75;
    drawSpriteH(BSTAMP[b.type], BSTAMP_PAL[b.type], sx, sy, bw, bh);
    ctx.globalAlpha = 1.0;
    const dot = Math.max(1, Math.floor(bw / 10));
    ctx.fillStyle = 'rgba(180,140,60,0.45)';
    for (let dy2 = 0; dy2 < bh; dy2 += dot * 4)
      for (let dx2 = 0; dx2 < bw; dx2 += dot * 4)
        ctx.fillRect(Math.floor(sx + dx2), Math.floor(sy + dy2), dot, dot);
    const ph = Math.max(3, Math.floor(bw * 0.05));
    const pw = Math.floor(bw * 0.82);
    const px2 = Math.floor(sx + (bw - pw) / 2);
    const py2 = Math.floor(sy - ph - Math.max(2, bw * 0.03));
    ctx.fillStyle = 'rgba(0,0,0,0.60)';
    ctx.fillRect(px2, py2, pw, ph);
    ctx.fillStyle = `rgb(${cl(60+180*b.progress)},${cl(200-100*b.progress)},40)`;
    ctx.fillRect(px2, py2, Math.floor(pw * b.progress), ph);
  } else {
    if (b.type === 2) {
      drawConnectedWall(b, sx, tsy, bw, false);
    } else {
      drawSpriteH(BSTAMP[b.type], BSTAMP_PAL[b.type], sx, sy, bw, bh);
    }
    // Warm window glow on occupied houses at night
    if (b.type === 0 && getNightAlpha() > 0.1) {
      const sleepers = villagers.filter(v => v.state === 'sleeping' && v.tx === b.tx && v.ty === b.ty).length;
      if (sleepers > 0) {
        const na = getNightAlpha();
        const pulse = 0.55 + 0.12*Math.sin(time*1.8 + b.id);
        const glow = na * pulse;
        const gx = sx + bw * 0.5, gy = sy + bh * 0.62;
        const grad = ctx.createRadialGradient(gx, gy, 1, gx, gy, bw * 0.7);
        grad.addColorStop(0, `rgba(255,210,80,${glow * 0.7})`);
        grad.addColorStop(1, 'rgba(255,140,30,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(sx - bw*0.2, sy, bw*1.4, bh*1.1);
      }
    }
    if (b.hp < b.maxHp) drawHealthBar(sx, sy, b.hp, b.maxHp, bw);
    // Tier badge for T2/T3 buildings
    const tier = b.tier || 1;
    if (tier >= 2 && sz >= 16) {
      const label = tier === 3 ? 'III' : 'II';
      const fs = Math.max(6, Math.floor(sz * 0.14));
      ctx.font = `bold ${fs}px 'Silkscreen',monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const bx = Math.floor(sx + bw - fs * 0.1);
      const by = Math.floor(sy + fs * 0.1);
      const tw = ctx.measureText(label).width;
      const pad = Math.max(2, Math.floor(fs * 0.3));
      const rw = tw + pad * 2, rh = fs + pad;
      const rx = bx - rw + pad * 0.5, ry = by - rh * 0.5;
      ctx.fillStyle = tier === 3 ? 'rgba(120,60,180,0.88)' : 'rgba(180,120,20,0.88)';
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, Math.floor(rh * 0.35));
      ctx.fill();
      ctx.fillStyle = tier === 3 ? '#e0b8ff' : '#ffe090';
      ctx.fillText(label, rx + rw * 0.5, ry + rh * 0.5);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
  }
}

function drawTCSprite(tc, sz) {
  const sx  = Math.floor(tc.tx * sz - camX);
  const tsy = Math.floor(tc.ty * sz - camY);
  const th  = sz * TC_HEIGHT;
  const sy  = tsy - (th - sz);
  drawSpriteH(TC_STAMP, TC_PAL, sx, sy, sz, th);
  if (tc.hp !== undefined && tc.hp < tc.maxHp) drawHealthBar(sx, sy, tc.hp, tc.maxHp, sz);
  if (sz >= 22) {
    const ly = sy - Math.max(4, sz * 0.14) - (tc.hp < tc.maxHp ? sz*0.10 : 0);
    ctx.font = `bold ${Math.max(8, Math.floor(sz * 0.13))}px 'Silkscreen',monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText('Town Center', sx + sz / 2, ly);
    ctx.fillStyle = '#c8922a';
    ctx.fillText('Town Center', sx + sz / 2, ly);
  }
}

function drawEnemyBuildingObj(b, sz) {
  const sx  = Math.floor(b.tx * sz - camX);
  const tsy = Math.floor(b.ty * sz - camY);
  const hm  = BLDG_HEIGHT[b.type] ?? 1.0;
  const bh  = sz * hm;
  const sy  = tsy - (bh - sz);
  if (b.type === 2) {
    drawConnectedWall(b, sx, tsy, sz, true);
  } else {
    drawSpriteH(BSTAMP[b.type], BSTAMP_PAL[b.type], sx, sy, sz, bh);
  }
  if (b.hp < b.maxHp) drawHealthBar(sx, sy, b.hp, b.maxHp, sz);
}

function drawEnemyVillagerChar(ev, px, py, sz, ekIsPlayer, ekId) {
  const sprSz = Math.max(6, sz * 1.15);
  const sprX  = px - sprSz * 0.5;
  const sprY  = py - sprSz * 0.88;
  const dotColor = ekIsPlayer ? _kingdomColor(ekId) : 'rgba(220,60,60,0.9)';
  if (sprSz < 8) {
    ctx.fillStyle = dotColor;
    ctx.fillRect(Math.floor(sprX), Math.floor(sprY), Math.ceil(sprSz), Math.ceil(sprSz));
    return;
  }
  const shW = Math.ceil(sprSz*0.55);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(Math.floor(px-shW*0.5), Math.floor(py+sprSz*0.10), shW, Math.ceil(sprSz*0.10));
  const sprites = VSPRITE[ev.role] || VSPRITE.Basic;
  const pal     = VPAL[ev.role]    || VPAL.Basic;
  const moving  = ev.state === 'moving' || ev.state === 'roaming' || ev.state === 'patrolling';
  const frame   = (moving && Math.floor(time * 5 + ev.id * 0.61) % 2 === 1) ? 1 : 0;
  drawSprite(sprites[frame], pal, sprX, sprY, sprSz);
  // Colored dot above head to mark kingdom
  const dotR = Math.max(2, sz * 0.08);
  ctx.fillStyle = dotColor;
  ctx.beginPath();
  ctx.arc(Math.floor(px), Math.floor(sprY - dotR*1.2), dotR, 0, Math.PI*2);
  ctx.fill();
  if (ev.hp !== undefined && ev.maxHp && ev.hp < ev.maxHp) {
    drawHealthBar(sprX, sprY, ev.hp, ev.maxHp, sprSz);
  }
}

function drawEnemyTC(ek, sz) {
  const sx = Math.floor(ek.tx * sz - camX);
  const sy = Math.floor(ek.ty * sz - camY);
  const fi = ek.ty * MAP_W + ek.tx;
  if (!fogExplored[fi]) return; // hidden in fog
  const col = ek.isPlayer ? _kingdomColor(ek.id) : null;
  ctx.save();
  drawSprite(TC_STAMP, TC_PAL, sx, sy, sz);
  // Tint overlay — kingdom color for players, red for bots
  if (col) {
    const r = parseInt(col.slice(1,3),16), g = parseInt(col.slice(3,5),16), b = parseInt(col.slice(5,7),16);
    ctx.fillStyle = `rgba(${r},${g},${b},0.38)`;
  } else {
    ctx.fillStyle = 'rgba(160,20,20,0.42)';
  }
  ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(sz), Math.ceil(sz));
  ctx.restore();
  if (ek.hp < ek.maxHp) drawHealthBar(sx, sy, ek.hp, ek.maxHp, sz);
  if (sz >= 22) {
    const ly = sy - Math.max(4, sz*0.14) - (ek.hp < ek.maxHp ? sz*0.10 : 0);
    ctx.font = `bold ${Math.max(8, Math.floor(sz*0.13))}px 'Silkscreen',monospace`;
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,0.85)';
    ctx.strokeText(ek.name || 'Enemy Keep', sx+sz/2, ly);
    ctx.fillStyle = col || '#e06060';
    ctx.fillText(ek.name || 'Enemy Keep', sx+sz/2, ly);
  }
}

// ═══════════════════════════════════════════════════
//  KING RENDERING
// ═══════════════════════════════════════════════════
function drawKing(king, sz) {
  if (!king) return;
  const px = king.x * sz - camX;
  const py = king.y * sz - camY;

  if (king._dead) {
    // Ghost translucent with respawn timer
    const sprSz = Math.max(6, sz * 1.15);
    const sprX  = px - sprSz * 0.5;
    const sprY  = py - sprSz * 0.88;
    ctx.globalAlpha = 0.3 + 0.15 * Math.sin(time * 3);
    drawSprite(VSPRITE.Knight[0], VPAL.Knight, sprX, sprY, sprSz);
    ctx.globalAlpha = 1.0;
    if (sz >= 18) {
      const secs = Math.ceil(king._respawnTimer);
      const ly = Math.floor(sprY - 4);
      ctx.font = `bold ${Math.max(8, sz * 0.13)}px 'Silkscreen',monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(`${secs}s`, px, ly);
      ctx.fillStyle = 'rgba(180,180,255,0.9)';
      ctx.fillText(`${secs}s`, px, ly);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
    return;
  }

  const sprSz = Math.max(6, sz * 1.25); // slightly larger than villagers
  const sprX  = px - sprSz * 0.5;
  const sprY  = py - sprSz * 0.88;

  // Walking animation — alternate frame while moving or attacking
  const moving = king.state === 'moving' || king.state === 'attacking';
  const frame  = (moving && Math.floor(time * 5) % 2 === 1) ? 1 : 0;

  // Golden glow beneath king
  const glowR = Math.max(6, sz * 0.9);
  const ggrad = ctx.createRadialGradient(px, py, 0, px, py, glowR);
  ggrad.addColorStop(0, 'rgba(255,200,50,0.28)');
  ggrad.addColorStop(1, 'rgba(255,200,50,0)');
  ctx.fillStyle = ggrad;
  ctx.beginPath(); ctx.arc(px, py, glowR, 0, Math.PI * 2); ctx.fill();

  // Shadow
  const shW = Math.ceil(sprSz * 0.55);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(Math.floor(px - shW * 0.5), Math.floor(py + sprSz * 0.10), shW, Math.ceil(sprSz * 0.10));

  // Knight sprite with walking animation
  drawSprite(VSPRITE.Knight[frame], VPAL.Knight, sprX, sprY, sprSz);

  // Gold crown above head
  let crownTop = sprY; // track topmost element for stacking HP bar and name above it
  if (sz >= 12) {
    const crownY = Math.floor(sprY - sprSz * 0.08);
    const crownW = Math.max(4, Math.floor(sprSz * 0.52));
    const crownH = Math.max(3, Math.floor(sprSz * 0.22));
    const crownX = Math.floor(px - crownW * 0.5);
    ctx.fillStyle = '#f5c842';
    ctx.fillRect(crownX, crownY - crownH * 0.5 | 0, crownW, crownH * 0.5 | 0);
    const pts = 3, ptW = Math.floor(crownW / pts);
    for (let i = 0; i < pts; i++) {
      const bx2 = crownX + i * ptW;
      ctx.beginPath();
      ctx.moveTo(bx2, crownY - crownH * 0.5 | 0);
      ctx.lineTo(bx2 + ptW * 0.5, crownY - crownH);
      ctx.lineTo(bx2 + ptW, crownY - crownH * 0.5 | 0);
      ctx.fill();
    }
    ctx.fillStyle = '#e04040';
    const gemR = Math.max(1, Math.floor(sprSz * 0.04));
    ctx.beginPath();
    ctx.arc(px, crownY - crownH * 0.85 | 0, gemR, 0, Math.PI * 2);
    ctx.fill();
    crownTop = crownY - crownH - 2;
  }

  // HP bar above the crown
  const barH   = Math.max(2, sprSz * 0.07);
  const barY   = crownTop - barH - 2;
  const barPct = king.hp / king.maxHp;
  const r = cl(220 - barPct * 100), g = cl(barPct * 210);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(Math.floor(sprX), Math.floor(barY), Math.ceil(sprSz), Math.ceil(barH));
  ctx.fillStyle = `rgb(${r},${g},20)`;
  ctx.fillRect(Math.floor(sprX), Math.floor(barY), Math.ceil(sprSz * barPct), Math.ceil(barH));

  // Kingdom name above HP bar
  if (sz >= 16 && king.name) {
    const fs  = Math.max(7, Math.floor(sz * 0.13));
    const ly  = Math.floor(barY - 2);
    ctx.font  = `bold ${fs}px 'Silkscreen',monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(king.name, px, ly);
    ctx.fillStyle = 'rgba(255,210,60,0.98)';
    ctx.fillText(king.name, px, ly);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
}

function drawObjects() {
  const sz = TILE_SZ * zoom;

  // ── TC background effects (glow + territory ring) drawn before sort ──
  if (townCenter) {
    const sx = Math.floor(townCenter.tx * sz - camX);
    const sy = Math.floor(townCenter.ty * sz - camY);
    const grad = ctx.createRadialGradient(sx+sz/2, sy+sz/2, 0, sx+sz/2, sy+sz/2, sz*2.2);
    grad.addColorStop(0, 'rgba(200,146,42,0.22)');
    grad.addColorStop(1, 'rgba(200,146,42,0)');
    ctx.fillStyle = grad; ctx.fillRect(sx-sz, sy-sz, sz*3, sz*3);
    const rcx = townCenter.tx*sz+sz/2-camX, rcy = townCenter.ty*sz+sz/2-camY;
    ctx.strokeStyle = 'rgba(200,146,42,0.15)';
    ctx.lineWidth = Math.max(1, sz*0.12);
    ctx.setLineDash([Math.floor(sz*0.35), Math.floor(sz*0.18)]);
    ctx.beginPath(); ctx.arc(rcx, rcy, getTerritoryRadius()*sz, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Destination marker (below objects) ──
  if (selectedVillager && (selectedVillager.pathLen ?? 0) > 0 && selectedVillager.dest) {
    const last = selectedVillager.dest;
    const mx = (last.x+0.5)*sz-camX, my = (last.y+0.5)*sz-camY;
    const pr = Math.max(5, Math.floor(sz*0.18));
    const lw = Math.max(1, Math.round(pr*0.22));
    ctx.fillStyle = 'rgba(255,215,40,0.92)';
    ctx.fillRect(Math.floor(mx-pr), Math.floor(my-lw*0.5), pr*2, lw);
    ctx.fillRect(Math.floor(mx-lw*0.5), Math.floor(my-pr), lw, pr*2);
    ctx.fillStyle = 'rgba(255,215,40,0.50)';
    for (const [ox,oy] of [[-1,-1],[1,-1],[-1,1],[1,1]])
      ctx.fillRect(Math.floor(mx+ox*pr*0.62), Math.floor(my+oy*pr*0.62), lw, lw);
  }

  // ── Collect visible objects ──
  const c0 = Math.max(0, Math.floor(camX/sz) - 1);
  const r0 = Math.max(0, Math.floor(camY/sz) - 2);
  const c1 = Math.min(MAP_W-1, Math.ceil((camX+canvas.width)/sz) + 1);
  const r1 = Math.min(MAP_H-1, Math.ceil((camY+canvas.height)/sz) + 2);

  // Update chopping-tree set for wobble (rebuild only every 6 frames)
  if (frameCount % 6 === 0) {
    _choppingIds.clear();
    for (const v of villagers) { if (v.state==='chopping'&&v.chopTarget) _choppingIds.add(v.chopTarget.id); }
  }

  const objs = [];

  for (const tree of trees) {
    if (tree.tx < c0 || tree.tx > c1 || tree.ty < r0 || tree.ty > r1) continue;
    const tfi = tree.ty * MAP_W + tree.tx;
    if (!fogExplored[tfi]) continue; // never seen — hidden
    objs.push({k:0, sortY: tree.ty + tree.oy + tree.scale*0.85, d: tree});
  }
  for (const b of buildings) {
    if (b.type === 4 || b.type === 5) continue; // drawn in tile pass as ground layer
    if (b.tx < c0 || b.tx > c1 || b.ty < r0 || b.ty > r1) continue;
    objs.push({k:1, sortY: b.ty + b.h, d: b});
  }
  if (townCenter && townCenter.tx>=c0 && townCenter.tx<=c1 && townCenter.ty>=r0 && townCenter.ty<=r1) {
    objs.push({k:2, sortY: townCenter.ty + 1.0, d: townCenter});
  }
  for (const v of villagers) {
    if (v.state === 'sleeping') continue; // hidden inside house
    if (v.x < c0-1 || v.x > c1+1 || v.y < r0-1 || v.y > r1+1) continue;
    objs.push({k:3, sortY: v.y, d: v});
  }
  for (const n of npcs) {
    if (n.state==='raiding'||n.state==='gone'||n._despawn) continue;
    if (n.x < c0-1 || n.x > c1+1 || n.y < r0-1 || n.y > r1+1) continue;
    objs.push({k:4, sortY: n.y, d: n});
  }
  for (const b of bandits) {
    if (b._despawn) continue;
    if (b.x < c0-1 || b.x > c1+1 || b.y < r0-1 || b.y > r1+1) continue;
    if (!fogExplored[Math.floor(b.y)*MAP_W+Math.floor(b.x)]) continue;
    objs.push({k:9, sortY: b.y, d: b});
  }
  for (const camp of banditCamps) {
    if (camp.destroyed) continue;
    if (camp.tx < c0 || camp.tx > c1 || camp.ty < r0 || camp.ty > r1) continue;
    if (!fogExplored[camp.ty * MAP_W + camp.tx]) continue;
    objs.push({k:10, sortY: camp.ty + 1.0, d: camp});
  }
  for (const ruin of ruins) {
    if (ruin.cleared || !ruin.discovered) continue;
    if (ruin.tx < c0 || ruin.tx > c1 || ruin.ty < r0 || ruin.ty > r1) continue;
    if (!fogExplored[ruin.ty * MAP_W + ruin.tx]) continue;
    objs.push({k:11, sortY: ruin.ty + 1.0, d: ruin});
  }
  for (const eu of enemyUnits) {
    if (eu._despawn) continue;
    const fi = Math.floor(eu.y)*MAP_W + Math.floor(eu.x);
    if (!fogExplored[fi]) continue;
    if (eu.x < c0-1 || eu.x > c1+1 || eu.y < r0-1 || eu.y > r1+1) continue;
    objs.push({k:5, sortY: eu.y, d: eu});
  }
  // King
  if (typeof kingData !== 'undefined' && kingData) {
    const kx = kingData._dead ? (kingData.tx ?? Math.floor(kingData.x)) : kingData.x;
    const ky = kingData._dead ? (kingData.ty ?? Math.floor(kingData.y)) : kingData.y;
    if (kx >= c0-1 && kx <= c1+1 && ky >= r0-1 && ky <= r1+1) {
      objs.push({k:12, sortY: ky + 0.001, d: kingData}); // slightly in front of villagers
    }
  }

  for (const ek of enemyKingdoms) {
    if (ek.hp > 0) {
      const fi = ek.ty*MAP_W + ek.tx;
      if (fogExplored[fi] && ek.tx>=c0 && ek.tx<=c1 && ek.ty>=r0 && ek.ty<=r1)
        objs.push({k:6, sortY: ek.ty+1.0, d: ek});
    }
    for (const b of ek.buildings) {
      if (b.tx < c0 || b.tx > c1 || b.ty < r0 || b.ty > r1) continue;
      if (!fogExplored[b.ty*MAP_W+b.tx]) continue;
      objs.push({k:7, sortY: b.ty+1.0, d: b});
    }
    for (const ev of ek.villagers) {
      if (ev.x < c0-1 || ev.x > c1+1 || ev.y < r0-1 || ev.y > r1+1) continue;
      if (!fogExplored[Math.floor(ev.y)*MAP_W+Math.floor(ev.x)]) continue;
      objs.push({k:8, sortY: ev.y, d: ev, ekId: ek.id, ekIsPlayer: !!ek.isPlayer});
    }
  }

  // ── Sort by Y ascending (objects higher on screen drawn first / behind) ──
  objs.sort((a,b) => a.sortY - b.sortY);

  // ── Draw in order ──
  for (const obj of objs) {
    const {k, d} = obj;
    if      (k===0) drawTreeObj(d, sz);
    else if (k===1) drawBuildingObj(d, sz);
    else if (k===2) drawTCSprite(d, sz);
    else if (k===3) drawVillagerChar(d, d.x*sz-camX, d.y*sz-camY, sz);
    else if (k===4) drawNPCChar(d, d.x*sz-camX, d.y*sz-camY, sz);
    else if (k===5) drawEnemyUnitChar(d, d.x*sz-camX, d.y*sz-camY, sz);
    else if (k===9)  drawBanditChar(d, d.x*sz-camX, d.y*sz-camY, sz);
    else if (k===10) drawBanditCamp(d, d.tx*sz-camX, d.ty*sz-camY, sz);
    else if (k===11) drawRuin(d, d.tx*sz-camX, d.ty*sz-camY, sz);
    else if (k===6)  drawEnemyTC(d, sz);
    else if (k===7)  drawEnemyBuildingObj(d, sz);
    else if (k===12) drawKing(d, sz);
    else             drawEnemyVillagerChar(d, d.x*sz-camX, d.y*sz-camY, sz, obj.ekIsPlayer, obj.ekId);
  }
}

function drawEnemyUnitChar(eu, px, py, sz) {
  const moving = eu.path.length > 0;
  const frame  = (moving && Math.floor(time*5+eu.id*0.83)%2===1) ? 1 : 0;
  const sprSz  = Math.max(6, sz*1.15);
  const sprX   = px - sprSz*0.5;
  const sprY   = py - sprSz*0.88;

  if (sprSz < 8) {
    ctx.fillStyle = '#c02020';
    ctx.fillRect(Math.floor(sprX), Math.floor(sprY), Math.ceil(sprSz), Math.ceil(sprSz));
    return;
  }

  // Shadow
  const shW = Math.ceil(sprSz*0.55);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(Math.floor(px-shW*0.5), Math.floor(py+sprSz*0.10), shW, Math.ceil(sprSz*0.10));

  const sprite = eu.role==='archer' ? VSPRITE.Archer[frame] : VSPRITE.Knight[frame];
  const pal    = eu.role==='archer' ? VPAL.Archer            : VPAL.Knight;
  drawSprite(sprite, pal, sprX, sprY, sprSz);

  // Hit flash
  if (eu._hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = eu._hitFlash * 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.floor(sprX), Math.floor(sprY), Math.ceil(sprSz), Math.ceil(sprSz));
    ctx.restore();
  }

  // Enemy infantry sword swing
  if (eu.role !== 'archer' && eu.attackAnim > 0) {
    const a = eu.attackAnim;
    const cx2 = px, cy2 = py - sprSz * 0.35;
    const bladeLen = sz * 0.52;
    const swing = (1 - a) * Math.PI * 0.85 - Math.PI * 0.1;
    ctx.save();
    ctx.translate(cx2, cy2);
    ctx.rotate(swing);
    ctx.beginPath();
    ctx.arc(0, 0, bladeLen * 0.6, -Math.PI * 0.1, (1-a) * Math.PI * 0.85, false);
    ctx.strokeStyle = `rgba(255,120,120,${a * 0.35})`;
    ctx.lineWidth = Math.max(1, sz * 0.045);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bladeLen, 0);
    ctx.strokeStyle = '#e08080';
    ctx.lineWidth = Math.max(1, sz * 0.04);
    ctx.stroke();
    if (a > 0.6) {
      ctx.beginPath();
      ctx.arc(bladeLen, 0, Math.max(1.5, sz * 0.055), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,180,180,${(a-0.6)*2.5})`;
      ctx.fill();
    }
    ctx.restore();
  }

  if (eu.hp < eu.maxHp) drawHealthBar(sprX, sprY, eu.hp, eu.maxHp, sprSz);
}

function drawNPCChar(npc, px, py, sz) {
  const moving = npc.path?.length > 0;
  const frame  = (moving && Math.floor(time*5+npc.id*0.7)%2===1) ? 1 : 0;
  const sprSz  = Math.max(6, sz*1.15);
  const sprX   = px - sprSz*0.5;
  const sprY   = py - sprSz*0.88;

  if (sprSz < 8) {
    ctx.fillStyle = npc.type==='trader' ? '#c07820' : '#c84040';
    ctx.fillRect(Math.floor(sprX), Math.floor(sprY), Math.ceil(sprSz), Math.ceil(sprSz));
    return;
  }

  // Shadow
  const shW = Math.ceil(sprSz*0.55);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(Math.floor(px-shW*0.5), Math.floor(py+sprSz*0.10), shW, Math.ceil(sprSz*0.10));

  // Arrived indicator — small pulsing dot above head
  if (npc.state==='arrived') {
    const pulse = 0.55 + 0.45*Math.sin(time*4);
    const dotR  = Math.max(2, sz*0.09);
    ctx.fillStyle = npc.type==='trader' ? `rgba(200,180,40,${pulse})` : `rgba(220,80,80,${pulse})`;
    ctx.beginPath();
    ctx.arc(Math.floor(px), Math.floor(sprY - dotR*1.5), dotR, 0, Math.PI*2);
    ctx.fill();
  }

  if (npc.type==='trader') {
    if (npc.caravan) drawCaravanCart(px, py, sz);
    drawSprite(VSPRITE.Basic[frame], NPC_TRADER_PAL, sprX, sprY, sprSz);
  } else {
    drawSprite(VSPRITE.Knight[frame], NPC_WKNIGHT_PAL, sprX, sprY, sprSz);
  }

  // Name at high zoom
  if (sz >= 42) {
    const ny = Math.floor(sprY + sprSz + 3);
    const fs = Math.max(9, sz * 0.12);
    const iconSz = Math.round(fs * 1.1);
    const iconName = npc.type === 'trader' ? (npc.caravan ? 'cart' : 'gold') : 'sword';
    ctx.font = `bold ${fs}px 'Silkscreen',monospace`;
    const nameWidth = ctx.measureText(npc.name).width;
    const totalW = iconSz + 3 + nameWidth;
    const startX = px - totalW / 2;
    drawIcon(ctx, iconName, startX + iconSz / 2, ny + iconSz / 2, iconSz);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.80)';
    ctx.strokeText(npc.name, startX + iconSz + 3, ny);
    ctx.fillStyle = npc.type === 'trader' ? 'rgba(220,190,80,0.95)' : 'rgba(220,100,100,0.95)';
    ctx.fillText(npc.name, startX + iconSz + 3, ny);
    ctx.textAlign = 'center';
  }
}

function drawBanditChar(b, px, py, sz) {
  const moving = b.path.length > 0;
  const frame  = (moving && Math.floor(time*6+b.id*1.3)%2===1) ? 1 : 0;
  const sprSz  = Math.max(6, sz * 1.1);
  const sprX   = px - sprSz * 0.5;
  const sprY   = py - sprSz * 0.88;

  if (sprSz < 8) {
    ctx.fillStyle = '#1a0a18';
    ctx.fillRect(Math.floor(sprX), Math.floor(sprY), Math.ceil(sprSz), Math.ceil(sprSz));
    return;
  }

  // Ominous red flicker beneath the sprite
  const flicker = 0.3 + 0.2 * Math.sin(time * 7 + b.id * 2.1);
  const auraR = Math.max(4, sz * 0.55);
  const grad = ctx.createRadialGradient(px, py, 0, px, py, auraR);
  grad.addColorStop(0,   `rgba(180,40,0,${flicker})`);
  grad.addColorStop(1,   'rgba(180,40,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(Math.floor(px - auraR), Math.floor(py - auraR), Math.ceil(auraR*2), Math.ceil(auraR*2));

  drawSprite(VSPRITE.Basic[frame], BANDIT_PAL, sprX, sprY, sprSz);

  if (sz >= 42) {
    const ny = Math.floor(sprY + sprSz + 3);
    const fs = Math.max(9, sz * 0.11);
    const iconSz = Math.round(fs * 1.1);
    const label = 'Rogue';
    ctx.font = `bold ${fs}px 'Silkscreen',monospace`;
    const nameWidth = ctx.measureText(label).width;
    const totalW = iconSz + 3 + nameWidth;
    const startX = px - totalW / 2;
    drawIcon(ctx, 'dagger', startX + iconSz / 2, ny + iconSz / 2, iconSz);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(label, startX + iconSz + 3, ny);
    ctx.fillStyle = 'rgba(220,80,40,0.95)';
    ctx.fillText(label, startX + iconSz + 3, ny);
    ctx.textAlign = 'center';
  }
}

// ═══════════════════════════════════════════════════
//  VILLAGER RENDERING
// ═══════════════════════════════════════════════════
function drawVillagerChar(v, px, py, sz) {
  // Possession aura — drawn before the sprite so it sits underneath
  if (v === possessedVillager) {
    const pulse = 0.55 + 0.45 * Math.sin(time * 5.0);
    const auraR = Math.max(8, sz * 0.82);
    const grad  = ctx.createRadialGradient(px, py, auraR * 0.1, px, py, auraR);
    grad.addColorStop(0, `rgba(255,80,80,${0.55 * pulse})`);
    grad.addColorStop(0.5, `rgba(220,40,40,${0.30 * pulse})`);
    grad.addColorStop(1,   'rgba(160,20,20,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(px, py - sz * 0.2, auraR, 0, Math.PI * 2); ctx.fill();
  }

  const moving = (v.pathLen ?? (v.path && v.path.length)) > 0;
  const frame  = (moving && Math.floor(time * 5 + v.id * 0.61) % 2 === 1) ? 1 : 0;

  // 3/4 view: sprite is taller than a tile; feet anchor at the character's world pos
  const sprSz = Math.max(6, sz * 1.15);
  const sprX  = px - sprSz * 0.5;
  const sprY  = py - sprSz * 0.88; // head rises above world pos; feet near py+sprSz*0.12

  if (sprSz < 8) {
    const [cr,cg,cb] = ROLE_COLOR[v.role];
    ctx.fillStyle = v.selected ? 'rgba(255,215,0,1)' : `rgb(${cr},${cg},${cb})`;
    ctx.fillRect(Math.floor(sprX), Math.floor(sprY), Math.ceil(sprSz), Math.ceil(sprSz));
    return;
  }

  // Ground shadow under feet
  const shW = Math.ceil(sprSz * 0.55);
  const shH = Math.ceil(sprSz * 0.10);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(
    Math.floor(px - shW * 0.5),
    Math.floor(py + sprSz * 0.10),
    shW, shH
  );

  // Selection: bright pixel border
  if (v.selected) {
    const pad = Math.max(2, Math.floor(sz * 0.07));
    const bw  = Math.max(1, Math.floor(pad * 0.55));
    const x0  = Math.floor(sprX - pad), y0 = Math.floor(sprY - pad);
    const ww  = Math.ceil(sprSz + pad * 2);
    ctx.fillStyle = 'rgba(255,215,0,0.92)';
    ctx.fillRect(x0, y0, ww, bw);
    ctx.fillRect(x0, y0 + ww - bw, ww, bw);
    ctx.fillRect(x0, y0, bw, ww);
    ctx.fillRect(x0 + ww - bw, y0, bw, ww);
  }

  // Pixel-art sprite
  const sprites = VSPRITE[v.role] || VSPRITE.Basic;
  const pal     = VPAL[v.role]    || VPAL.Basic;
  drawSprite(sprites[frame], pal, sprX, sprY, sprSz);

  // Hit flash
  if (v._hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = v._hitFlash * 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.floor(sprX), Math.floor(sprY), Math.ceil(sprSz), Math.ceil(sprSz));
    ctx.restore();
  }

  // Knight/Archer sword/bow attack animation
  if ((v.role === VROLE.KNIGHT || v.role === VROLE.ARCHER) && v.attackAnim > 0) {
    const a = v.attackAnim; // 1→0
    const cx2 = px, cy2 = py - sprSz * 0.35;
    // tier-based blade color and length
    const tierProps = [
      { col: '#c8c8c8', len: 0.55 },
      { col: '#e0e8f0', len: 0.65 },
      { col: '#a0d8ff', len: 0.80 },
    ];
    const tp = tierProps[Math.min(2, (v.tier||1)-1)];
    // tool tier controls blade width
    const toolW = [1.0, 1.35, 1.75][(v.toolTier||0)];
    const bladeLen = sz * tp.len;
    const swing = (1 - a) * Math.PI * 0.9 - Math.PI * 0.1;
    ctx.save();
    ctx.translate(cx2, cy2);
    ctx.rotate(swing);
    // sweep arc
    ctx.beginPath();
    ctx.arc(0, 0, bladeLen * 0.6, -Math.PI * 0.1, (1-a) * Math.PI * 0.9, false);
    ctx.strokeStyle = `rgba(220,220,255,${a * 0.35})`;
    ctx.lineWidth = Math.max(1, sz * 0.05 * toolW);
    ctx.stroke();
    // blade line
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bladeLen, 0);
    ctx.strokeStyle = tp.col;
    ctx.lineWidth = Math.max(1, sz * 0.045 * toolW);
    ctx.stroke();
    // tip flash
    if (a > 0.6) {
      ctx.beginPath();
      ctx.arc(bladeLen, 0, Math.max(1.5, sz * 0.06 * toolW), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,200,${(a-0.6)*2.5})`;
      ctx.fill();
    }
    ctx.restore();
  }

  // Health bar when damaged
  if (v.hp !== undefined && v.hp < v.maxHp) {
    drawHealthBar(sprX, sprY, v.hp, v.maxHp, sprSz);
  }

  // Group badge — small number tile in the bottom-right corner of the sprite
  if (v.role === VROLE.KNIGHT && sz >= 10) {
    for (let g = 1; g <= 9; g++) {
      if (!knightGroups[g].has(v.id)) continue;
      const bsz = Math.max(8, Math.floor(sz * 0.28));
      const bx  = Math.floor(sprX + sprSz - bsz + 1);
      const by  = Math.floor(sprY + sprSz - bsz + 1);
      ctx.fillStyle = activeGroup === g ? 'rgba(255,215,0,0.95)' : 'rgba(30,50,80,0.88)';
      ctx.fillRect(bx, by, bsz, bsz);
      ctx.font = `bold ${Math.max(6, Math.floor(bsz * 0.72))}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = activeGroup === g ? '#1a0a00' : '#b8ccec';
      ctx.fillText(String(g), bx + bsz * 0.5, by + bsz * 0.5);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      break;
    }
  }

  // Name label (high zoom only)
  if (sz >= 42) {
    const ny = Math.floor(sprY + sprSz + 3);
    ctx.font = `bold ${Math.max(9, sz * 0.135)}px 'Silkscreen',monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.80)';
    ctx.strokeText(v.name, px, ny);
    ctx.fillStyle = 'rgba(255,238,188,0.96)';
    ctx.fillText(v.name, px, ny);
  }
}

// ═══════════════════════════════════════════════════
//  BANDIT CAMP
// ═══════════════════════════════════════════════════
function drawBanditCamp(camp, px, py, sz) {
  const w = sz * 1.8;
  const h = sz * 1.4;
  const x = px + sz * 0.5 - w * 0.5;
  const y = py - h * 0.15;

  const inFog = !fogVisible[camp.ty * MAP_W + camp.tx];
  if (inFog) ctx.globalAlpha = 0.4;

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.20)';
  ctx.beginPath();
  ctx.ellipse(px + sz * 0.5, py + sz * 0.92, w * 0.45, sz * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Palisade base (dark log wall)
  ctx.fillStyle = '#3d2810';
  ctx.fillRect(Math.floor(x), Math.floor(y + h * 0.35), Math.ceil(w), Math.ceil(h * 0.62));

  // Log texture — horizontal planks
  ctx.fillStyle = '#5a3c18';
  for (let i = 0; i < 3; i++) {
    const ly = Math.floor(y + h * 0.40 + i * h * 0.18);
    ctx.fillRect(Math.floor(x + 2), ly, Math.ceil(w - 4), Math.max(2, Math.floor(h * 0.14)));
  }

  // Pointed stakes along top
  ctx.fillStyle = '#2c1c08';
  const stakeCount = Math.max(3, Math.floor(w / (sz * 0.22)));
  const stakeW = w / stakeCount;
  for (let i = 0; i < stakeCount; i++) {
    const sx = x + i * stakeW + stakeW * 0.15;
    const sy = y + h * 0.35;
    const sw = stakeW * 0.7;
    const sh = h * 0.28;
    ctx.beginPath();
    ctx.moveTo(Math.floor(sx), Math.floor(sy + sh));
    ctx.lineTo(Math.floor(sx + sw * 0.5), Math.floor(sy));
    ctx.lineTo(Math.floor(sx + sw), Math.floor(sy + sh));
    ctx.fill();
  }

  // Fire glow in center
  const pulse = 0.7 + 0.3 * Math.sin(time * 4.5 + camp.id * 1.3);
  const fireX = px + sz * 0.5;
  const fireY = py + sz * 0.55;
  const fireR = sz * 0.3 * pulse;
  const grad = ctx.createRadialGradient(fireX, fireY, 0, fireX, fireY, fireR);
  grad.addColorStop(0,   `rgba(255,220,60,${0.85 * pulse})`);
  grad.addColorStop(0.4, `rgba(255,100,20,${0.55 * pulse})`);
  grad.addColorStop(1,   'rgba(200,40,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(fireX, fireY, fireR, fireR * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // HP bar
  if (camp.hp < camp.maxHp) {
    drawHealthBar(Math.floor(x), Math.floor(y + h * 0.35) - 5, camp.hp, camp.maxHp, w);
  }

  // Label at high zoom
  if (sz >= 36) {
    const ly = Math.floor(y + h + 3);
    ctx.font = `bold ${Math.max(8, sz * 0.13)}px 'Silkscreen',monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText('Bandit Camp', px + sz * 0.5, ly);
    ctx.fillStyle = 'rgba(220,80,40,0.95)';
    ctx.fillText('Bandit Camp', px + sz * 0.5, ly);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  if (inFog) ctx.globalAlpha = 1.0;
}

// ═══════════════════════════════════════════════════
//  RUIN
// ═══════════════════════════════════════════════════
function drawRuin(ruin, px, py, sz) {
  const w = sz * 1.6;
  const h = sz * 1.2;
  const x = px + sz * 0.5 - w * 0.5;
  const y = py - h * 0.05;

  const inFog = !fogVisible[ruin.ty * MAP_W + ruin.tx];
  if (inFog) ctx.globalAlpha = 0.4;

  // Ground moss / base
  ctx.fillStyle = 'rgba(50,70,30,0.45)';
  ctx.beginPath();
  ctx.ellipse(px + sz * 0.5, py + sz * 0.9, w * 0.5, sz * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Broken stone walls — draw as irregular stone blocks
  const blocks = [
    {rx: 0.0, ry: 0.25, rw: 0.28, rh: 0.55},
    {rx: 0.72, ry: 0.30, rw: 0.28, rh: 0.50},
    {rx: 0.18, ry: 0.20, rw: 0.55, rh: 0.22},
  ];
  ctx.fillStyle = '#7a7060';
  for (const b of blocks) {
    ctx.fillRect(
      Math.floor(x + b.rx * w), Math.floor(y + b.ry * h),
      Math.ceil(b.rw * w), Math.ceil(b.rh * h)
    );
  }
  // Stone highlight
  ctx.fillStyle = '#a09880';
  for (const b of blocks) {
    ctx.fillRect(
      Math.floor(x + b.rx * w + 1), Math.floor(y + b.ry * h + 1),
      Math.ceil(b.rw * w * 0.45), Math.ceil(b.rh * h * 0.22)
    );
  }
  // Dark cracks
  ctx.fillStyle = '#4a4438';
  for (const b of blocks) {
    const cx2 = Math.floor(x + (b.rx + b.rw * 0.5) * w);
    const cy2 = Math.floor(y + (b.ry + b.rh * 0.5) * h);
    ctx.fillRect(cx2, Math.floor(y + b.ry * h), 1, Math.ceil(b.rh * h));
  }

  // Scattered rubble dots
  ctx.fillStyle = '#6a6058';
  const rubbleSeed = ruin.id * 7919;
  for (let i = 0; i < 5; i++) {
    const rx = ((rubbleSeed * (i + 1) * 1301) % 1000) / 1000;
    const ry = ((rubbleSeed * (i + 1) * 997)  % 1000) / 1000;
    const rs = Math.max(1, sz * 0.07);
    ctx.fillRect(Math.floor(x + rx * w), Math.floor(y + h * 0.6 + ry * h * 0.35), Math.ceil(rs), Math.ceil(rs));
  }

  // Glint / reward indicator
  const glint = 0.5 + 0.5 * Math.sin(time * 2.8 + ruin.id * 2.1);
  ctx.fillStyle = `rgba(255,230,100,${0.4 * glint})`;
  ctx.beginPath();
  ctx.arc(px + sz * 0.5, py + sz * 0.45, sz * 0.15 * (0.8 + 0.2 * glint), 0, Math.PI * 2);
  ctx.fill();

  // Label at high zoom
  if (sz >= 36) {
    const ly = Math.floor(y + h + 3);
    ctx.font = `bold ${Math.max(8, sz * 0.13)}px 'Silkscreen',monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText('Ancient Ruins', px + sz * 0.5, ly);
    ctx.fillStyle = 'rgba(200,185,100,0.95)';
    ctx.fillText('Ancient Ruins', px + sz * 0.5, ly);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  if (inFog) ctx.globalAlpha = 1.0;
}
