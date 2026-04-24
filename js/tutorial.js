// ── tutorial.js ──

const TUT_KEY = 'empires_tutorial_done';

const TUT_STEPS = [
  {
    title:     'Your Kingdom Begins',
    body:      'Your villagers automatically gather wood from nearby forests. You\'ve been given 5 extra wood to help you get started.\n\nClick any villager to inspect them.',
    highlight: null,
  },
  {
    title:     'Build a House First',
    body:      'Your population is capped by housing — without more houses, no new villagers will come.\n\nPress ⚒ (bottom-left) to open the build menu, then place a House on a grass tile.',
    highlight: 'build-fab',
  },
  {
    title:     'The Food Supply Chain',
    body:      '🌾 Farmland — Farmers grow Crops here\n🍞 Bakery — Bakers bake Crops into Food\n\nFood keeps your villagers alive. Without it they will starve and leave. Stock up before Winter — crops stop growing in the cold.',
    highlight: 'food-chip',
  },
  {
    title:     'You\'re Ready to Rule',
    body:      'Merchants and wandering knights will visit over time. Raids will grow stronger as your kingdom expands. Build walls, place a Gate, and keep your people fed.\n\nGood luck!',
    highlight: null,
    last:      true,
  },
];

let _tutStep = -1;

function tutorialIsNew() {
  try { return !localStorage.getItem(TUT_KEY); } catch(_) { return false; }
}

// Called from game.js when the player first settles
function tutorialOnSettled() {
  if (!tutorialIsNew() || _tutStep >= 0) return;
  _tutStep = 0;
  _tutShow();
}

function tutorialAdvance() {
  _tutClearHighlight();
  _tutStep++;
  if (_tutStep >= TUT_STEPS.length) { _tutDone(); return; }
  _tutShow();
}

function tutorialSkip() {
  _tutClearHighlight();
  _tutDone();
}

function _tutShow() {
  const step = TUT_STEPS[_tutStep];
  if (!step) return;

  document.getElementById('tut-title').textContent = step.title;
  document.getElementById('tut-body').innerHTML    = bodyWithIcons(step.body, 13);
  document.getElementById('tut-btn').textContent      = step.last ? "Let's go! →" : 'Got it →';
  document.getElementById('tut-progress').textContent = `${_tutStep + 1} / ${TUT_STEPS.length}`;

  _tutClearHighlight();
  let targetEl = null;
  if (step.highlight) {
    targetEl = document.getElementById(step.highlight);
    if (targetEl) targetEl.classList.add('tut-highlight');
  }

  // Position panel near the target element (or default to bottom-centre)
  _tutPosition(targetEl);

  document.getElementById('tut-panel').classList.add('tut-visible');
}

function _tutPosition(el) {
  const panel = document.getElementById('tut-panel');
  const PW = Math.min(300, window.innerWidth * 0.88);
  const PH = 150; // approximate panel height
  const GAP = 14;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left, top;

  if (!el) {
    left = (vw - PW) / 2;
    top = vh - 90 - PH;
  } else {
    const rect = el.getBoundingClientRect();
    // Horizontally centre on the element, clamped to viewport
    left = Math.max(8, Math.min(vw - PW - 8, rect.left + rect.width / 2 - PW / 2));
    // Prefer placing above; fall back to below if not enough room
    if (rect.top >= PH + GAP + 10) {
      top = rect.top - PH - GAP;
    } else {
      top = rect.bottom + GAP;
    }
    top = Math.max(8, Math.min(vh - PH - 8, top));
  }

  panel.style.left      = `${left}px`;
  panel.style.top       = `${top}px`;
  panel.style.bottom    = '';
  panel.style.transform = 'none';
}

function _tutDone() {
  try { localStorage.setItem(TUT_KEY, '1'); } catch(_) {}
  document.getElementById('tut-panel').classList.remove('tut-visible');
  _tutStep = -1;
}

function _tutClearHighlight() {
  document.querySelectorAll('.tut-highlight').forEach(el => el.classList.remove('tut-highlight'));
}
