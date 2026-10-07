const PRESETS = {
  beginner: { w: 9, h: 9, mines: 10 },
  intermediate: { w: 16, h: 16, mines: 40 },
  expert: { w: 30, h: 16, mines: 99 },
};
const SETTINGS_KEY = 'minesSettings';
const BEST_KEY = 'minesBest';
const STATS_KEY = 'minesStats';
const LONG_PRESS_MS = 400;
const RESTART_MS = 800;
const GAP = 2;
const BOARD_PAD = 8;

const $ = id => document.getElementById(id);
const containerEl = $('container');
const boardEl = $('board');
const minesEl = $('minesLeft');
const timeEl = $('time');
const bestEl = $('best');
const overlayEl = $('overlay');
const overlayMsg = $('overlayMsg');
const diffSelect = $('diffSelect');
const customBox = $('customBox');
const flagModeBtn = $('flagMode');
const aiToggle = $('aiToggle');
const aiStatus = $('aiStatus');
const statsEl = $('stats');
const t = I18N.t;

function loadJSON(key, fallback) {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return { ...fallback }; }
}

function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 無法存取 localStorage 時忽略 */ }
}

const DEFAULT_SETTINGS = {
  diff: 'beginner',
  custom: { w: 20, h: 12, mines: 40 },
  delay: 50,
  autoRestart: false,
  showProb: false,
};
const settings = loadJSON(SETTINGS_KEY, DEFAULT_SETTINGS);
const bestTimes = loadJSON(BEST_KEY, {});
const stats = loadJSON(STATS_KEY, {});

let W, H, MINES, N, nb;
// 每格狀態：mine 是否為雷、opened 是否已翻開、flagged 是否插旗、count 周圍雷數
let mine, opened, flagged, count;
let started, over, won, openCount, flagCount, boomIdx;
let startTime = 0, endTime = 0, timerId = null;
// humanPlayed / aiPlayed：本局是否有玩家或 AI 操作，用來決定要記錄最佳時間還是 AI 戰績
let humanPlayed, aiPlayed, actingAi = false;
let analysis = null;
let hintIdx = -1;
let flagMode = false;
let cellEls = [];

function config() {
  if (settings.diff === 'custom') return settings.custom;
  return PRESETS[settings.diff] || PRESETS.beginner;
}

function diffKey() {
  const c = config();
  return settings.diff === 'custom' ? `custom-${c.w}x${c.h}-${c.mines}` : settings.diff;
}

function newGame(keepAi = false) {
  if (!keepAi) stopAi();
  stopTimer();
  ({ w: W, h: H, mines: MINES } = config());
  N = W * H;
  nb = Solver.getNeighbors(W, H);
  mine = new Uint8Array(N);
  opened = new Uint8Array(N);
  flagged = new Uint8Array(N);
  count = new Int8Array(N);
  started = false;
  over = false;
  won = false;
  openCount = 0;
  flagCount = 0;
  boomIdx = -1;
  humanPlayed = false;
  aiPlayed = false;
  analysis = null;
  hintIdx = -1;
  aiQueue = [];
  overlayEl.classList.remove('show');
  buildBoard();
  render();
  updateCounters();
  updateStats();
}

function buildBoard() {
  boardEl.innerHTML = '';
  boardEl.style.setProperty('--cols', W);
  const frag = document.createDocumentFragment();
  cellEls = [];
  for (let i = 0; i < N; i++) {
    const el = document.createElement('div');
    el.className = 'cell';
    el.dataset.i = i;
    frag.appendChild(el);
    cellEls.push(el);
  }
  boardEl.appendChild(frag);
  fitBoard();
}

// 依視窗寬度決定格子大小；太寬時棋盤區域可水平捲動
function fitBoard() {
  const avail = Math.min(window.innerWidth - 32, 960) - BOARD_PAD * 2;
  const size = Math.max(22, Math.min(36, Math.floor((avail - (W - 1) * GAP) / W)));
  boardEl.style.setProperty('--cell', size + 'px');
  const boardPx = W * size + (W - 1) * GAP + BOARD_PAD * 2;
  containerEl.style.width = Math.max(480, boardPx) + 'px';
}

// ---------- 遊戲規則 ----------

// 第一下點擊後才佈雷，保證點擊處（以及周圍 3×3，若雷數允許）沒有雷
function placeMines(first) {
  const safeZone = new Set([first]);
  if (N - 9 >= MINES) nb[first].forEach(j => safeZone.add(j));
  const pool = [];
  for (let i = 0; i < N; i++) if (!safeZone.has(i)) pool.push(i);
  for (let k = 0; k < MINES; k++) {
    const r = k + Math.floor(Math.random() * (pool.length - k));
    [pool[k], pool[r]] = [pool[r], pool[k]];
    mine[pool[k]] = 1;
  }
  for (let i = 0; i < N; i++) {
    let c = 0;
    for (const j of nb[i]) c += mine[j];
    count[i] = c;
  }
}

function markActor() {
  if (actingAi) aiPlayed = true;
  else humanPlayed = true;
}

function reveal(i) {
  if (over || opened[i] || flagged[i]) return;
  markActor();
  if (!started) {
    placeMines(i);
    started = true;
    startTimer();
  }
  if (mine[i]) {
    lose(i);
    return;
  }
  // 翻到 0 時自動往外擴散
  const stack = [i];
  while (stack.length) {
    const j = stack.pop();
    if (opened[j] || flagged[j]) continue;
    opened[j] = 1;
    openCount++;
    if (count[j] === 0) {
      for (const k of nb[j]) if (!opened[k] && !flagged[k]) stack.push(k);
    }
  }
  if (openCount === N - MINES) win();
}

function toggleFlag(i) {
  if (over || opened[i]) return;
  markActor();
  flagged[i] ^= 1;
  flagCount += flagged[i] ? 1 : -1;
}

// 點已翻開的數字：周圍旗子數等於數字時，翻開其餘鄰格
function chord(i) {
  if (over || !opened[i] || !count[i]) return;
  let f = 0;
  for (const j of nb[i]) f += flagged[j];
  if (f !== count[i]) return;
  for (const j of nb[i]) if (!opened[j] && !flagged[j]) reveal(j);
}

function lose(i) {
  over = true;
  boomIdx = i;
  finishGame(false);
}

function win() {
  over = true;
  won = true;
  for (let i = 0; i < N; i++) {
    if (mine[i] && !flagged[i]) {
      flagged[i] = 1;
      flagCount++;
    }
  }
  finishGame(true);
}

function finishGame(isWin) {
  stopTimer();
  const key = diffKey();
  if (aiPlayed && !humanPlayed) {
    const s = stats[key] || (stats[key] = { played: 0, won: 0 });
    s.played++;
    if (isWin) s.won++;
    saveJSON(STATS_KEY, stats);
  }
  if (isWin && humanPlayed && !aiPlayed) {
    const time = Math.round(elapsed() * 10) / 10;
    if (!bestTimes[key] || time < bestTimes[key]) {
      bestTimes[key] = time;
      saveJSON(BEST_KEY, bestTimes);
    }
  }
  overlayMsg.textContent = t(isWin ? 'win' : 'lose');
  overlayEl.className = 'overlay show ' + (isWin ? 'win' : 'lose');
  updateStats();
}

// 執行一次操作並重繪；byAi 用來區分是玩家還是 AI 的操作
function act(fn, byAi = false) {
  if (over) return;
  actingAi = byAi;
  fn();
  actingAi = false;
  analysis = null;
  hintIdx = -1;
  render();
  updateCounters();
}

// ---------- 計時與顯示 ----------

function startTimer() {
  startTime = performance.now();
  timerId = setInterval(updateTime, 100);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
    endTime = performance.now();
  }
}

function elapsed() {
  if (!started) return 0;
  return ((timerId ? performance.now() : endTime) - startTime) / 1000;
}

function updateTime() {
  timeEl.textContent = elapsed().toFixed(1);
}

function updateCounters() {
  minesEl.textContent = MINES - flagCount;
  updateTime();
  const best = bestTimes[diffKey()];
  bestEl.textContent = best ? best.toFixed(1) : '—';
}

function updateStats() {
  const s = stats[diffKey()];
  statsEl.textContent = s && s.played
    ? t('stats', { w: s.won, n: s.played, r: (s.won / s.played * 100).toFixed(1) })
    : t('statsNone');
}

function boardView() {
  const cells = new Int8Array(N);
  for (let i = 0; i < N; i++) {
    cells[i] = opened[i] ? count[i] : flagged[i] ? Solver.FLAG : Solver.UNKNOWN;
  }
  return { w: W, h: H, mines: MINES, cells };
}

function getAnalysis() {
  if (!analysis) analysis = Solver.analyze(boardView());
  return analysis;
}

function render() {
  const probs = settings.showProb && started && !over ? getAnalysis().prob : null;
  for (let i = 0; i < N; i++) {
    const el = cellEls[i];
    let cls = 'cell';
    let text = '';
    let p = null;
    if (opened[i]) {
      cls += ' open';
      if (count[i]) {
        cls += ' n' + count[i];
        text = String(count[i]);
      }
    } else if (flagged[i]) {
      cls += ' flag';
      text = '🚩';
      if (over && !mine[i]) {
        cls += ' wrong';
        text = '❌';
      }
    } else if (over && mine[i]) {
      cls += ' open mine';
      if (i === boomIdx) cls += ' boom';
      text = '💣';
    } else if (probs) {
      p = probs[i];
      cls += ' prob';
      text = String(Math.round(p * 100));
    }
    if (i === hintIdx) cls += ' hint';
    if (el.className !== cls) el.className = cls;
    if (el.textContent !== text) el.textContent = text;
    if (p !== null) el.style.setProperty('--p', p);
    else if (el.style.length) el.style.removeProperty('--p');
  }
}

// ---------- 滑鼠 / 觸控操作 ----------

let pressTimer = null;
let longPressed = false;
let lastPointer = 'mouse';

function cellIndex(e) {
  const el = e.target.closest('.cell');
  return el ? Number(el.dataset.i) : -1;
}

boardEl.addEventListener('pointerdown', e => {
  lastPointer = e.pointerType;
  const i = cellIndex(e);
  if (i < 0) return;
  if (e.pointerType === 'touch') {
    longPressed = false;
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      longPressed = true;
      act(() => toggleFlag(i));
      if (navigator.vibrate) navigator.vibrate(30);
    }, LONG_PRESS_MS);
  } else if (e.button === 1) {
    e.preventDefault();
    act(() => chord(i));
  }
});

for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
  boardEl.addEventListener(type, () => clearTimeout(pressTimer));
}

boardEl.addEventListener('click', e => {
  const i = cellIndex(e);
  if (i < 0) return;
  if (longPressed) {
    longPressed = false;
    return;
  }
  act(() => {
    if (opened[i]) chord(i);
    else if (flagMode) toggleFlag(i);
    else reveal(i);
  });
});

boardEl.addEventListener('contextmenu', e => {
  e.preventDefault();
  // 觸控長按已由 pointerdown 計時處理，避免重複切換旗子
  if (lastPointer === 'touch') return;
  const i = cellIndex(e);
  if (i >= 0) act(() => toggleFlag(i));
});

document.addEventListener('keydown', e => {
  if (e.key === 'F2') {
    e.preventDefault();
    newGame();
  }
});

flagModeBtn.addEventListener('click', () => {
  flagMode = !flagMode;
  flagModeBtn.classList.toggle('active', flagMode);
});

$('newGame').addEventListener('click', () => newGame());
$('retryBtn').addEventListener('click', () => newGame());
window.addEventListener('resize', fitBoard);

// ---------- 難度 ----------

function buildDiffSelect() {
  diffSelect.innerHTML = '';
  for (const key of [...Object.keys(PRESETS), 'custom']) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = t('diff_' + key);
    diffSelect.appendChild(opt);
  }
  diffSelect.value = settings.diff;
  customBox.classList.toggle('show', settings.diff === 'custom');
}

diffSelect.addEventListener('change', () => {
  settings.diff = diffSelect.value;
  saveJSON(SETTINGS_KEY, settings);
  customBox.classList.toggle('show', settings.diff === 'custom');
  newGame();
});

function clampInt(value, min, max) {
  const v = Math.round(Number(value));
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min;
}

function fillCustomInputs() {
  $('customW').value = settings.custom.w;
  $('customH').value = settings.custom.h;
  $('customM').value = settings.custom.mines;
}

$('applyCustom').addEventListener('click', () => {
  const w = clampInt($('customW').value, 5, 50);
  const h = clampInt($('customH').value, 5, 30);
  const mines = clampInt($('customM').value, 1, w * h - 1);
  settings.custom = { w, h, mines };
  saveJSON(SETTINGS_KEY, settings);
  fillCustomInputs();
  newGame();
});

// ---------- AI ----------

let aiRunning = false;
let aiRunId = 0;
let aiTimer = null;
let aiMoves = 0;
let aiGuesses = 0;
let aiQueue = [];

function updateAiToggle() {
  aiToggle.textContent = t(aiRunning ? 'aiStop' : 'aiStart');
  aiToggle.classList.toggle('running', aiRunning);
}

function setAiStatus() {
  aiStatus.textContent = t('aiStatus', { n: aiMoves, g: aiGuesses });
}

function startAi() {
  if (over) newGame();
  aiRunning = true;
  aiRunId++;
  aiMoves = 0;
  aiGuesses = 0;
  updateAiToggle();
  setAiStatus();
  scheduleAi(aiRunId, 0);
}

function stopAi() {
  aiRunning = false;
  aiRunId++;
  clearTimeout(aiTimer);
  updateAiToggle();
}

function scheduleAi(runId, ms) {
  clearTimeout(aiTimer);
  aiTimer = setTimeout(() => aiStep(runId), ms);
}

// 下一個要執行的動作：先消化上次推理出的確定動作，用完才重新分析；都不確定時猜一格
function nextAiAction() {
  while (aiQueue.length) {
    const action = aiQueue.shift();
    if (opened[action.i] || flagged[action.i]) continue;
    return action;
  }
  const a = getAnalysis();
  aiQueue = [
    ...a.mines.map(i => ({ type: 'flag', i })),
    ...a.safe.map(i => ({ type: 'reveal', i })),
  ];
  if (aiQueue.length) return aiQueue.shift();
  return { type: 'reveal', i: a.best, guess: !a.first };
}

// 每一步只做一個動作（插一面旗或翻一格），方便觀看 AI 的推理過程
function aiStep(runId) {
  if (runId !== aiRunId) return;
  if (over) {
    newGame(true);
    aiMoves = 0;
    aiGuesses = 0;
    setAiStatus();
    scheduleAi(runId, settings.delay);
    return;
  }
  const action = nextAiAction();
  if (action.guess) aiGuesses++;
  act(() => (action.type === 'flag' ? toggleFlag(action.i) : reveal(action.i)), true);
  aiMoves++;
  setAiStatus();
  if (over && !settings.autoRestart) {
    stopAi();
    return;
  }
  scheduleAi(runId, over ? Math.max(RESTART_MS, settings.delay) : settings.delay);
}

aiToggle.addEventListener('click', () => (aiRunning ? stopAi() : startAi()));

$('hintBtn').addEventListener('click', () => {
  if (over) return;
  const a = getAnalysis();
  hintIdx = a.best;
  render();
  aiStatus.textContent = a.first
    ? t('hintFirst')
    : a.safe.length
      ? t('hintSafe')
      : t('hintGuess', { p: (a.bestProb * 100).toFixed(1) });
});

$('resetStats').addEventListener('click', () => {
  delete stats[diffKey()];
  saveJSON(STATS_KEY, stats);
  updateStats();
});

// ---------- AI 參數 ----------

const delayInput = $('delay');
const delayVal = $('delayVal');
delayInput.value = settings.delay;
delayVal.textContent = settings.delay;
delayInput.addEventListener('input', () => {
  settings.delay = Number(delayInput.value);
  delayVal.textContent = settings.delay;
  saveJSON(SETTINGS_KEY, settings);
});

for (const id of ['autoRestart', 'showProb']) {
  const input = $(id);
  input.checked = settings[id];
  input.addEventListener('change', () => {
    settings[id] = input.checked;
    saveJSON(SETTINGS_KEY, settings);
    if (id === 'showProb') render();
  });
}

// ---------- 語言 ----------

const langSelect = $('langSelect');

function buildLangSelect() {
  for (const [code, name] of Object.entries(I18N.NAMES)) {
    langSelect.add(new Option(name, code));
  }
  langSelect.value = I18N.getLang();
  langSelect.addEventListener('change', () => I18N.setLang(langSelect.value));
}

I18N.onChange(() => {
  buildDiffSelect();
  updateAiToggle();
  updateStats();
  if (over) overlayMsg.textContent = t(won ? 'win' : 'lose');
  aiStatus.textContent = '';
});

I18N.apply();
buildLangSelect();
buildDiffSelect();
fillCustomInputs();
updateAiToggle();
newGame();
