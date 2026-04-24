'use strict';

// ── icons.js — pixel-art icon system ─────────────────────────────────────────
// Each icon is a 12×12 stamp rendered to an offscreen canvas.
// initIcons()                          — call once after DOM ready
// drawIcon(ctx, name, cx, cy, size)    — draw centered on canvas context
// iconHTML(name, size[, alt])          — <img> HTML string for innerHTML
// setIconEl(el, name, size)            — set element innerHTML to icon img
// bodyWithIcons(text)                  — replace emoji in text with icon imgs

const _ICONS = {
  gold: {
    pal: {'.':null,'G':'#ffd700','g':'#b8860b','h':'#fff4b0','c':'#8b6914'},
    rows: [
      '..GGGGGGG...',
      '.GGGGGGGGg..',
      'GGhGGGGGGGg.',
      'GGGGGGGGGGgg',
      'GGGGcGGGGGgg',
      'GGGcccGGGGgg',
      'GGGGcGGGGGgg',
      'GGGGGGGGGGgg',
      'GGhGGGGGGGg.',
      '.GGGGGGGGg..',
      '..GGGGGGg...',
      '....GGg.....',
    ],
  },
  wood: {
    pal: {'.':null,'B':'#8b5a2b','b':'#4a2810','r':'#3a1808'},
    rows: [
      '....BBBB....',
      '..BBBBBBBb..',
      '.BBBrBrBBBb.',
      'BBBBrBrBBBbb',
      'BBBrrrrrBBbb',
      'BBBrBBBrBBbb',
      'BBBrBBBrBBbb',
      'BBBrrrrrBBbb',
      '.BBBBBBBBBb.',
      '..BBBBBBBb..',
      '....BBBB....',
      '............',
    ],
  },
  stone: {
    pal: {'.':null,'S':'#909090','s':'#555555','h':'#b8b8b8'},
    rows: [
      '....SSSS....',
      '..SShSSSSs..',
      '.SShSSSSSss.',
      'SSSSSSSSSSss',
      'SSSSSSSSSSss',
      'SSSSSSSSSSss',
      'SSSSSSSSSSss',
      '.SSSSSSSSSs.',
      '..SSSSSSss..',
      '...SSSSs....',
      '....SSs.....',
      '.....s......',
    ],
  },
  iron: {
    pal: {'.':null,'I':'#a8a8a8','o':'#303030'},
    rows: [
      '....II.II...',
      '....II.II...',
      'IIIIIIIIIIII',
      'IIIIIoIIIIII',
      'IIIIooooIIII',
      'II..oooo..II',
      'IIIIooooIIII',
      'IIIIIoIIIIII',
      'IIIIIIIIIIII',
      '....II.II...',
      '....II.II...',
      '............',
    ],
  },
  food: {
    pal: {'.':null,'F':'#c07040','f':'#8b4513','h':'#e8a050','e':'#5c2808'},
    rows: [
      '....ffff....',
      '..ffhhhhhff.',
      '.ffhhhhhhhhf',
      'ffhhhhhhhhhf',
      'ffhhhhhhhhhf',
      'fFFFFFFFFFf.',
      'fFFFFFFFFFf.',
      'fFFFFFFFFFf.',
      'fFFFFFFFFFf.',
      '.fFFFFFFFff.',
      '..ffffffee..',
      '............',
    ],
  },
  crops: {
    pal: {'.':null,'Y':'#d4a020','C':'#507030'},
    rows: [
      '...Y...Y....',
      '..YYY.YYY...',
      '...Y...Y....',
      '...C...C....',
      '...CC..C....',
      '....CC.C....',
      '....CCCC....',
      '.....CCC....',
      '.....CC.....',
      '.....C......',
      '.....C......',
      '............',
    ],
  },
  hammer: {
    pal: {'.':null,'M':'#a8a8a8','m':'#585858','h':'#8b5a2b','H':'#5c3317'},
    rows: [
      '.MMMMMM.....',
      '.MmmmmM.....',
      'MMMMMMMM....',
      'MmmmmmmM....',
      '.MMMMMM.....',
      '...hh.......',
      '...hh.......',
      '...hh.......',
      '...hh.......',
      '...HH.......',
      '...HH.......',
      '............',
    ],
  },
  sword: {
    pal: {'.':null,'B':'#c8c8c8','G':'#d4a020','h':'#8b5a2b'},
    rows: [
      '....B.......',
      '....B.......',
      '....B.......',
      '....B.......',
      '....B.......',
      '...GBG......',
      '....h.......',
      '....h.......',
      '....h.......',
      '....h.......',
      '....h.......',
      '............',
    ],
  },
  dagger: {
    pal: {'.':null,'B':'#c8c8c8','G':'#d4a020','h':'#8b5a2b'},
    rows: [
      '....B.......',
      '...BBB......',
      '....B.......',
      '....B.......',
      '....B.......',
      '...GGG......',
      '....h.......',
      '....h.......',
      '............',
      '............',
      '............',
      '............',
    ],
  },
  cart: {
    pal: {'.':null,'W':'#c8a060','w':'#8b5a20','R':'#707070','r':'#404040'},
    rows: [
      '.wwwwwwwwww.',
      '.wWWWWWWWWw.',
      '.wWWWWWWWWw.',
      '.wWWWWWWWWw.',
      '.wWWWWWWWWw.',
      'wwwwwwwwwwww',
      '............',
      '.RRR....RRR.',
      'RRRRR..RRRRR',
      '.RrRR..RRrR.',
      '.RRR....RRR.',
      '............',
    ],
  },
  skull: {
    pal: {'.':null,'W':'#e0e0d8','w':'#b0b0a8','D':'#282010'},
    rows: [
      '...WWWWWW...',
      '..WWWWWWWWW.',
      '.WWWWWWWWWW.',
      'WWWWWWWWWWWW',
      'WWWDwwwDWWWW',
      'WWWDwwwDWWWW',
      'WWWWWWWWWWWW',
      '.WWWWWWWWWW.',
      '..WwDwDwWW..',
      '...WwwwwW...',
      '..WW.WW.WW..',
      '............',
    ],
  },
  compass: {
    pal: {'.':null,'C':'#d8c060','c':'#a89030','R':'#c03020','B':'#3050a0'},
    rows: [
      '....CCCC....',
      '..cCCCCCCc..',
      '.cCCCRCCCCc.',
      'cCCCRRRCCCCc',
      'cCCRRCBBCCCc',
      'cCCRCCCBCCCc',
      'cCCCBBBCCCCc',
      '.cCCBBCCCCc.',
      '..cCCCCCCc..',
      '....CCCC....',
      '............',
      '............',
    ],
  },
  person: {
    pal: {'.':null,'P':'#d4a060','p':'#a07030'},
    rows: [
      '....PPP.....',
      '...PPPPP....',
      '...PPPPP....',
      '....PPP.....',
      '..PPPPPPP...',
      '.PPPPPPPPP..',
      '..PPPPPPP...',
      '...PP.PP....',
      '...PP.PP....',
      '...PP.PP....',
      '............',
      '............',
    ],
  },
  pickaxe: {
    pal: {'.':null,'M':'#a8a8a8','m':'#585858','h':'#8b5a2b'},
    rows: [
      '..........MM',
      '.........MMm',
      'MMMMMMM.MMm.',
      'MmmmmmmMMm..',
      'MMMMMMM.Mm..',
      '........M...',
      '.......Mh...',
      '......Mhh...',
      '.....Mhhh...',
      '....Mhhhh...',
      '....hhhh....',
      '............',
    ],
  },
  leaf: {
    pal: {'.':null,'G':'#40a040','g':'#287028','v':'#60c060','c':'#507030'},
    rows: [
      '.......G....',
      '.....GGGGg..',
      '....GGvGGGg.',
      '...GGGvGGGg.',
      '..GGGGGGGGg.',
      '.GGGGGGGGgg.',
      '..GGGGGGGg..',
      '...GGGGGg...',
      '....cccc....',
      '.....cc.....',
      '.....cc.....',
      '............',
    ],
  },
  pine: {
    pal: {'.':null,'G':'#2a7030','g':'#1a4820','t':'#6b3510'},
    rows: [
      '.....G......',
      '....GGG.....',
      '...GGGGG....',
      '..GGGGGGG...',
      '...GGGGG....',
      '..GGGGGGG...',
      '.GGGGGGGGG..',
      '..GGGGGGGg..',
      '.GGGGGGGGg..',
      '....ttt.....',
      '....ttt.....',
      '............',
    ],
  },
  drop: {
    pal: {'.':null,'B':'#4080c0','b':'#1a5090','h':'#80c0f0'},
    rows: [
      '.....B......',
      '....BBB.....',
      '....BBB.....',
      '...BBBBB....',
      '..BBBhBBB...',
      '..BBBhBBB...',
      '.BBBBBBBBb..',
      '.BBBBBBBBb..',
      '..BBBBBBb...',
      '...BBBBb....',
      '....BBb.....',
      '.....b......',
    ],
  },
};

// Cache: icon name → offscreen HTMLCanvasElement (12×12)
const _CACHE  = {};
const _DURLS  = {}; // data URL cache

function _renderStamp(name) {
  const def = _ICONS[name];
  if (!def) return null;
  const { pal, rows } = def;
  const h = rows.length;
  const w = rows[0].length;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  for (let r = 0; r < h; r++) {
    for (let col = 0; col < rows[r].length; col++) {
      const color = pal[rows[r][col]];
      if (!color) continue;
      c.fillStyle = color;
      c.fillRect(col, r, 1, 1);
    }
  }
  return cv;
}

// Must be called once after DOM is ready
function initIcons() {
  for (const name of Object.keys(_ICONS)) {
    _CACHE[name] = _renderStamp(name);
  }
  // Auto-populate any [data-icon] elements already in the DOM
  for (const el of document.querySelectorAll('[data-icon]')) {
    const name = el.dataset.icon;
    const size = parseInt(el.dataset.iconSize) || 14;
    el.innerHTML = iconHTML(name, size);
  }
  // Draw a pixel-art arrow cursor and set as page cursor
  const S = 2; // px per pixel
  const arrow = [
    '1.............',
    '11............',
    '121...........',
    '1221..........',
    '12221.........',
    '122221........',
    '1222221.......',
    '12222221......',
    '122222221.....',
    '1222222221....',
    '12222221......',
    '1221.1221.....',
    '121..1221.....',
    '1....11221....',
    '.....1221.....',
    '.....121......',
  ];
  const W = arrow[0].length * S, H = arrow.length * S;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  for (let r = 0; r < arrow.length; r++) {
    for (let col = 0; col < arrow[r].length; col++) {
      const ch = arrow[r][col];
      if (ch === '1') { c.fillStyle = '#000'; c.fillRect(col*S, r*S, S, S); }
      else if (ch === '2') { c.fillStyle = '#fff'; c.fillRect(col*S, r*S, S, S); }
    }
  }
  const url = cv.toDataURL();
  document.documentElement.style.cursor = `url("${url}") 0 0, default`;
}

// Draw an icon centered at (cx, cy) on the given canvas context
function drawIcon(ctx, name, cx, cy, size) {
  const cv = _CACHE[name];
  if (!cv) return;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, Math.round(cx - size / 2), Math.round(cy - size / 2), size, size);
  ctx.imageSmoothingEnabled = prev;
}

// Returns a data URL for the named icon
function iconDataURL(name) {
  if (!_DURLS[name]) {
    const cv = _CACHE[name];
    if (!cv) return '';
    _DURLS[name] = cv.toDataURL();
  }
  return _DURLS[name];
}

// Returns an <img> HTML string suitable for innerHTML
function iconHTML(name, size, alt) {
  const url = iconDataURL(name);
  if (!url) return alt != null ? alt : '';
  const a = alt != null ? alt : name;
  return `<img src="${url}" width="${size}" height="${size}" alt="${a}" style="image-rendering:pixelated;vertical-align:middle">`;
}

// Sets an element's innerHTML to an icon image
function setIconEl(el, name, size) {
  if (!el) return;
  el.innerHTML = iconHTML(name, size);
}

// Map of emoji → icon name (for bodyWithIcons)
const _EMOJI_MAP = {
  '⚜': 'gold',
  '🪵': 'wood',
  '🪨': 'stone',
  '⚙': 'iron',
  '🍞': 'food',
  '🌾': 'crops',
  '⚒': 'hammer',
  '⚔': 'sword',
  '🗡': 'dagger',
  '🛒': 'cart',
  '☠': 'skull',
  '🧭': 'compass',
  '👤': 'person',
  '⛏': 'pickaxe',
  '🔩': 'iron',
  '🌿': 'leaf',
  '🌲': 'pine',
  '💧': 'drop',
};

// Replace known emoji in plain text with pixel-art icon imgs; HTML-escape the rest
// Newlines become <br>
function bodyWithIcons(text, size) {
  size = size || 14;
  let result = '';
  for (const ch of text) {
    if (_EMOJI_MAP[ch]) {
      result += iconHTML(_EMOJI_MAP[ch], size);
    } else if (ch === '\n') {
      result += '<br>';
    } else {
      result += ch === '&' ? '&amp;'
              : ch === '<' ? '&lt;'
              : ch === '>' ? '&gt;'
              : ch;
    }
  }
  return result;
}
