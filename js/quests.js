'use strict';

// ── quests.js — short-term objectives with resource rewards ─────────────────
// checkQuests()     — call every second from update(); checks all conditions
// initQuestPanel()  — wire up collapse toggle; call after DOM ready

const QUESTS = [
  { id:'q_wood',     title:'Woodcutters Ready', desc:'Stockpile 200 wood',       type:'resource',      resource:'wood',  target:200, reward:{gold:50}   },
  { id:'q_houses',   title:'Room to Grow',      desc:'Build 3 Houses',           type:'build_count',   buildingType:0,   target:3,   reward:{wood:40}   },
  { id:'q_bakery',   title:'Daily Bread',       desc:'Build a Bakery',           type:'build_count',   buildingType:1,   target:1,   reward:{food:30}   },
  { id:'q_food',     title:'Well Stocked',      desc:'Store 100 food',           type:'resource',      resource:'food',  target:100, reward:{gold:80}   },
  { id:'q_pop',      title:'Growing Kingdom',   desc:'Reach 10 villagers',       type:'population',    target:10,                    reward:{gold:60}   },
  { id:'q_stone',    title:'Quarry Master',     desc:'Stockpile 80 stone',       type:'resource',      resource:'stone', target:80,  reward:{iron:2}    },
  { id:'q_walls',    title:'Fortified',         desc:'Build 5 Walls',            type:'build_count',   buildingType:2,   target:5,   reward:{stone:60}  },
  { id:'q_knights',  title:'Standing Army',     desc:'Train 3 Knights',          type:'villager_role', role:'Knight',    target:3,   reward:{gold:150}  },
  { id:'q_days',     title:'A Decade Passes',   desc:'Survive 10 days',          type:'survive_days',  target:10,                    reward:{gold:100}  },
  { id:'q_industry', title:'Industrial Age',    desc:'Build a Mine and a Forge', type:'build_any',     buildingTypes:[5,7],          reward:{iron:3}    },
  { id:'q_raid',     title:'Tested by Fire',    desc:'Survive an enemy raid',    type:'raid_survived',                               reward:{gold:200}  },
  { id:'q_gold',     title:'Wealthy Kingdom',   desc:'Accumulate 500 gold',      type:'resource',      resource:'gold',  target:500, reward:{gold:100}  },
];

const _state = {}; // id → { done, claimSent }
for (const q of QUESTS) _state[q.id] = { done: false, claimSent: false };

let _prevEnemyLen  = 0;
let _raidsSurvived = 0;
let _collapsed     = false;
let _questTimer    = 0; // throttle: check every 1s

// ── Progress helpers ────────────────────────────────────────────────────────

function _progress(q) {
  switch (q.type) {
    case 'resource': {
      const v = ({ gold, wood, stone, iron, food, crops })[q.resource] || 0;
      return { val: Math.min(v, q.target), max: q.target };
    }
    case 'build_count': {
      const n = buildings.filter(b => b.type === q.buildingType && b.complete).length;
      return { val: Math.min(n, q.target), max: q.target };
    }
    case 'build_any': {
      const n = q.buildingTypes.filter(t => buildings.some(b => b.type === t && b.complete)).length;
      return { val: n, max: q.buildingTypes.length };
    }
    case 'population':
      return { val: Math.min(villagers.length, q.target), max: q.target };
    case 'survive_days':
      return { val: Math.min(day, q.target), max: q.target };
    case 'villager_role': {
      const n = villagers.filter(v => v.role === q.role).length;
      return { val: Math.min(n, q.target), max: q.target };
    }
    case 'raid_survived':
      return { val: _raidsSurvived > 0 ? 1 : 0, max: 1 };
    default:
      return { val: 0, max: 1 };
  }
}

function _rewardText(reward) {
  return Object.entries(reward)
    .map(([r, n]) => `+${n} ${r}`)
    .join(', ');
}

function _rewardHTML(reward) {
  return Object.entries(reward)
    .map(([r, n]) => `+${n}\u00a0${iconHTML(r, 10)}`)
    .join('  ');
}

// ── Quest panel rendering ────────────────────────────────────────────────────

function _render() {
  const panel = document.getElementById('quest-panel');
  if (!panel) return;

  const incomplete = QUESTS.filter(q => !_state[q.id].done);
  const doneCount  = QUESTS.length - incomplete.length;

  // Header badge
  const badge = document.getElementById('quest-badge');
  if (badge) badge.textContent = `${doneCount}/${QUESTS.length}`;

  const itemsEl = document.getElementById('quest-items');
  if (!itemsEl) return;
  itemsEl.innerHTML = '';

  if (_collapsed || !settled) return;

  const active = incomplete.slice(0, 3);
  if (active.length === 0) {
    const fin = document.createElement('div');
    fin.className = 'quest-item';
    fin.innerHTML = '<div class="quest-title" style="color:#70d070">All quests complete!</div>';
    itemsEl.appendChild(fin);
    return;
  }

  for (const q of active) {
    const { val, max } = _progress(q);
    const pct = Math.round((val / max) * 100);
    const progText = max === 1 ? '' : `${val}/${max}`;

    const div = document.createElement('div');
    div.className = 'quest-item';
    div.innerHTML = `
      <div class="quest-title">${q.title}</div>
      <div class="quest-desc">${q.desc}${progText ? ' <span class="quest-prog-text">(' + progText + ')</span>' : ''}</div>
      <div class="quest-prog-outer"><div class="quest-prog-inner" style="width:${pct}%"></div></div>
      <div class="quest-reward-row">Reward: ${_rewardHTML(q.reward)}</div>
    `;
    itemsEl.appendChild(div);
  }
}

// Briefly flash a completion card before the next active quest appears
function _showComplete(q) {
  const itemsEl = document.getElementById('quest-items');
  if (!itemsEl || _collapsed) return;
  const div = document.createElement('div');
  div.className = 'quest-item quest-done';
  div.innerHTML = `
    <div class="quest-title">&#10003; ${q.title}</div>
    <div class="quest-reward-row">${_rewardHTML(q.reward)}</div>
  `;
  itemsEl.insertBefore(div, itemsEl.firstChild);
  setTimeout(() => { div.remove(); _render(); }, 3500);
}

// ── Main check (called every second) ────────────────────────────────────────

function checkQuests(dt) {
  _questTimer += dt;
  if (_questTimer < 1.0) return;
  _questTimer = 0;

  if (!settled) { _render(); return; }

  // Raid-survived detection: enemy count drops from significant to zero
  const curLen = (enemyUnits || []).length;
  if (_prevEnemyLen >= 4 && curLen === 0) _raidsSurvived++;
  _prevEnemyLen = curLen;

  let anyNew = false;
  for (const q of QUESTS) {
    const st = _state[q.id];
    if (st.done) continue;
    const { val, max } = _progress(q);
    if (val >= max) {
      st.done = true;
      anyNew = true;
      if (!st.claimSent) {
        st.claimSent = true;
        netSend({ type: 'quest_reward', questId: q.id, reward: q.reward });
        notify('Quest complete: ' + q.title + ' — ' + _rewardText(q.reward), 'success');
        _showComplete(q);
      }
    }
  }

  if (!anyNew) _render(); // just refresh progress bars
}

// ── Sync claimed quests from server state (called on reconnect) ───────────────
function syncClaimedQuests(claimedIds) {
  for (const id of claimedIds) {
    if (_state[id]) {
      _state[id].done = true;
      _state[id].claimSent = true;
    }
  }
  _render();
}

// ── Init ─────────────────────────────────────────────────────────────────────

function initQuestPanel() {
  const header = document.getElementById('quest-header');
  if (!header) return;
  header.addEventListener('click', () => {
    _collapsed = !_collapsed;
    const arrow = document.getElementById('quest-arrow');
    if (arrow) arrow.textContent = _collapsed ? '▼' : '▲';
    _render();
  });
  _render();
}
