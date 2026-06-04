import {
  dreamspellKin, kinToToneSeal, kinFromToneSeal, oracle, wavespell, castle,
  isDayOutOfTime, SEAL_COLORS, COLOR_RU, CASTLE_NAMES, CASTLE_HINTS,
  getMoon, yearBearer, pulsar,
} from './tzolkin.js';

const APP_VER = '72';
let sealsData, tonesData, kinsData, mayaData, dsTexts;
let currentDate = new Date();
let currentTab = 'main';
let displayMode = localStorage.getItem('displayMode') || 'base';
function isPro() { return displayMode === 'pro'; }

/* ── Cycles tab state ── */
let cyclesKin = null; // lazy init on first render
let dragUnit = 0;     // unit of currently dragged strip, 0 = not dragging

/* ── Authentic Maya mode (Tzolk'in · Chol Q'ij) ── */
let mayaMode = localStorage.getItem('mayaMode') === '1';
let mayaSelectedSign = null;  // catalog/sign-card: position 1..20, null = grid view
let mayaTaleOpen = null;      // tales: episode index, null = list view
let mayaGridOffset = 0;       // Чоль-К'их grid: window shift in days (arrows page past/future)
let mayaCatalogScrollY = 0;  // scroll position in the grid+catalog view before opening a sign card
let navStack = [];           // history of view snapshots for the global «← НАЗАД» button
let DREAM_TABS_HTML = null;   // captured static Dreamspell tab bar, restored on mode off
const MAYA_TABS = [
  ['maya-today', 'СЕГОДНЯ'], ['maya-self', 'МОЙ'], ['maya-grid', 'СЕТКА·ЗНАКИ'],
  ['maya-tales', 'СКАЗАНИЯ'], ['maya-med', 'МЕДИЦИНА'],
];
const MAYA_TAB_SET = new Set(MAYA_TABS.map(t => t[0]));
// Inline icons so the authentic-mode tab bar matches the Dreamspell one
// (icon-over-label structure), unifying the two bottom menus.
const MAYA_TAB_ICONS = {
  'maya-today':   '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><g stroke-linecap="round"><path d="M12 2.5v2.5"/><path d="M12 19v2.5"/><path d="M2.5 12h2.5"/><path d="M19 12h2.5"/><path d="M5.2 5.2l1.8 1.8"/><path d="M17 17l1.8 1.8"/><path d="M18.8 5.2l-1.8 1.8"/><path d="M7 17l-1.8 1.8"/></g></svg>',
  'maya-self':    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" stroke-linecap="round"/></svg>',
  'maya-grid':    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17"/></svg>',
  'maya-tales':   '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5C10.5 4.3 8.4 4 5.5 4H4v14h1.5c2.9 0 5 .3 6.5 1.5" stroke-linejoin="round"/><path d="M12 5.5C13.5 4.3 15.6 4 18.5 4H20v14h-1.5c-2.9 0-5 .3-6.5 1.5" stroke-linejoin="round"/></svg>',
  'maya-med':     '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c-.5-7 4-13 14-13.5C19.5 12.5 14.5 19.5 5 19z" stroke-linejoin="round"/><path d="M9.5 15.5c1.5-2.8 3.8-4.8 6.5-6" stroke-linecap="round"/></svg>',
};
const DREAM_TAB_SET = new Set(['main', 'cycles', 'tzolkin', 'personal']);

const MONTHS_RU = [
  'января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря',
];
const DAYS_RU = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];

const ORACLE_ROLES = [
  {key:'guide',    arrow:'↑', name:'Управитель',        desc:'Направляет и усиливает энергию дня.'},
  {key:'antipode', arrow:'←', name:'Антипод',            desc:'Вызов и противоположная сила — источник роста.'},
  {key:'analog',   arrow:'→', name:'Аналог',             desc:'Союзник, дополняющий основную энергию.'},
  {key:'hidden',   arrow:'↓', name:'Оккультный учитель', desc:'Скрытая сила, раскрывающаяся через принятие тени.'},
];

const CASTLE_SUB = ['ЗАЧАТИЕ','ОЧИЩЕНИЕ','ПЕРЕХОД','ДАРЕНИЕ','ПРОСВЕТЛЕНИЕ'];

const CASTLE_DESCRIPTIONS = {
  1: 'Красный Восточный Замок Поворота открывает новый Цолькин. Четыре красные волны сеют семена, ставят намерение и запускают импульс следующих 260 дней.',
  2: 'Белый Северный Замок Перехода — пространство утончения. Четыре белые волны отделяют суть от шелухи, устраняют лишнее и проясняют путь.',
  3: 'Синий Западный Замок Сжигания — пространство преобразования. Четыре синие волны углубляют и перерабатывают накопленный опыт через внутренний огонь.',
  4: 'Жёлтый Южный Замок Дарения — пространство созревания. Четыре жёлтые волны приносят плоды, раскрывают мудрость и наполняют зрелостью.',
  5: 'Зелёный Центральный Замок Очарования — место силы и синтеза. Четыре волны в самом центре Цолькина замыкают цикл и рождают галактическую синхронизацию.',
};

/* ── Neon color mapping: White→cyan, Yellow→amber ── */
const NEON_MAP = { red:'red', white:'cyan', blue:'blue', yellow:'amber' };
function sealColor(seal) { return NEON_MAP[COLOR_RU[SEAL_COLORS[seal]]]; }

/* ── Helpers: images ── */
function sealImg(sealId, size = 48, glow = false) {
  const glowCls = glow ? ' glow' : '';
  return `<img src="img/seal_${String(sealId).padStart(2, '0')}.png" width="${size}" height="${size}" class="seal-img round${glowCls}" style="${glow ? 'filter:drop-shadow(0 0 calc(8px * var(--glow)) currentColor)' : ''}" alt="">`;
}
function toneImg(toneId, size = 32) {
  return `<img src="img/tone_${String(toneId).padStart(2, '0')}.png" width="${size}" height="${size}" class="tone-img" alt="">`;
}

/* ── Kin popup ── */
function showKinPopup(kin, roleInfo) {
  haptic('medium');
  const { tone, seal } = kinToToneSeal(kin);
  const info = kinsData[String(kin)];
  const si = sealsData[seal];
  const ti = tonesData[tone];
  const color = sealColor(seal);
  const gap = isGap(kin);

  let html = `<div style="text-align:center;margin-bottom:12px">
    <div style="margin-bottom:6px">${toneImg(tone, 28)}</div>
    <div class="seal-badge ${color} c-${color}" style="width:64px;height:64px;margin:0 auto 6px">
      ${sealImg(seal, 52, true)}
    </div>
    <div class="kin-num c-${color}" style="font-size:24px">${kin}${gap ? '<span class="gap-badge">ГАП</span>' : ''}</div>
    <div class="display" style="font-size:11px;margin-top:4px">${info?.title || ''}</div>`;
  if (roleInfo) {
    html += `<div class="eyebrow" style="margin-top:6px;color:var(--n-cyan)">${roleInfo.name}</div>
      <div style="font-size:11px;color:var(--ink-faint);margin-top:2px;font-style:italic">${roleInfo.desc}</div>`;
  }
  // Unified popup body — same .pp-props / .pp-main styling as the ВОЛНА popup
  // (the project's etalon), so the main text is large and readable everywhere.
  html += `</div>
    <div class="pp-props">▸ ПЕЧАТЬ: ${si.name_ru} (${si.name_maya})<br>▸ СУЩНОСТЬ: ${si.essence_ru}<br>▸ СИЛА: ${si.power_ru} · ДЕЙСТВИЕ: ${si.action_ru}<br>▸ ТОН ${tone} — ${ti.name_ru}<br>▸ ФУНКЦИЯ ТОНА: ${ti.action_ru}</div>`;
  if (info?.summary)
    html += `<p class="pp-main">${info.summary}</p>`;
  html += `<button class="popup-goto-btn" id="popup-goto">ПЕРЕЙТИ К ЭТОМУ ДНЮ →</button>`;
  html += `<button class="popup-close-btn">✕ ЗАКРЫТЬ</button>`;

  const popup = document.getElementById('kin-popup-content');
  popup.innerHTML = html;
  document.getElementById('kin-popup').style.display = 'flex';
  syncScrollLock();
  popup.querySelector('.popup-close-btn').addEventListener('click', closeKinPopup);
  popup.querySelector('#popup-goto').addEventListener('click', () => {
    haptic('medium');
    currentDate = dateForKin(kin);
    cyclesKin = null;
    closeKinPopup();
    // Jump to the day on the main "Кин" tab so the navigation is visible.
    if (DREAM_TAB_SET.has(currentTab) && currentTab !== 'main') switchTab('main');
    else render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function closeKinPopup() {
  document.getElementById('kin-popup').style.display = 'none';
  syncScrollLock();
}

/* Freeze the page behind an open overlay so touch-drags scroll the panel, not
   the background. Driven by whichever overlay is currently visible. */
function syncScrollLock() {
  const open = document.getElementById('settings-modal')?.style.display !== 'none'
    || document.getElementById('kin-popup')?.style.display !== 'none';
  document.body.classList.toggle('modal-open', open);
}

/* ── Generic info popup (wave/castle/moon) ── */
function showInfoPopup(title, bodyHtml) {
  haptic('medium');
  const popup = document.getElementById('kin-popup-content');
  popup.innerHTML = `
    <h3 class="card-title" style="margin-bottom:12px">
      <span class="dot" style="background:var(--n-cyan);box-shadow:0 0 8px var(--n-cyan)"></span>
      ${title}
    </h3>
    ${bodyHtml}
    <button class="popup-close-btn">✕ ЗАКРЫТЬ</button>`;
  document.getElementById('kin-popup').style.display = 'flex';
  syncScrollLock();
  popup.querySelector('.popup-close-btn').addEventListener('click', closeKinPopup);
}

/* ── Haptic feedback ── */
// Use _vibrate captured before telegram-web-app.js could override navigator.vibrate
const _vib = window._vibrate ?? navigator.vibrate?.bind(navigator) ?? null;

// The buzz must be felt the instant the finger LANDS, not at click-time: on touch
// screens `click` fires after release (+disambiguation delay), which is exactly the
// "vibration is late" feeling. A single delegated pointerdown (installed in
// setupEvents) fires the press buzz globally; any haptic() called later in the SAME
// gesture is suppressed so a tap never double-buzzes (e.g. handler + showInfoPopup).
let _hapticGesture = false;
let _hapticGestureTimer = 0;
function _markHapticGesture() {
  _hapticGesture = true;
  clearTimeout(_hapticGestureTimer);
  _hapticGestureTimer = setTimeout(() => { _hapticGesture = false; }, 500);
}

function _emitHaptic(strength = 'light') {
  const ms = { light: 50, medium: 100, heavy: 150, selection: 30 }[strength] ?? 50;
  // Physical vibration
  try { _vib?.(ms); } catch (_) {}
  // Telegram native haptics
  try {
    const hf = window.Telegram?.WebApp?.HapticFeedback;
    if (hf) {
      if (strength === 'selection') hf.selectionChanged();
      else hf.impactOccurred(strength);
    }
  } catch (_) {}
  // NOTE: the old full-screen box-shadow "visual pulse" was removed — animating
  // box-shadow on #app plus a forced reflow (void offsetWidth) ran on EVERY tap
  // and was a major source of perceived input lag on budget Android devices.
}

// Called from click handlers throughout the app. If a tap already buzzed this
// element on pointerdown, stay silent (instant feedback already given).
function haptic(strength = 'light') {
  if (_hapticGesture) return;
  _emitHaptic(strength);
}

// Press feedback fired on pointerdown — buzz now and mark the gesture.
function pressHaptic(strength = 'selection') {
  _emitHaptic(strength);
  _markHapticGesture();
}

// Anything the user can tap. Used by the global pointerdown haptic delegate.
const HAPTIC_TAP_SEL = 'button, a, [data-action], [class*="-btn"], [data-tab],'
  + ' [data-maya-sign], [data-maya-date], [data-maya-tale], [data-maya-open-tale],'
  + ' [data-maya-grid], [data-cruz-pos], [data-cruz-goto], [data-tz-kin],'
  + ' .info-item, .moon-clickable, .date-tap, .maya-grid-cell, .maya-cat-cell,'
  + ' .cruz-cell, .maya-tale-item, .maya-myth-ref, .fav-star, [role="button"]';

/* ── Vibration toast ── */
let _toastTimer = null;
function showVibToast(msg, duration = 6000) {
  let el = document.getElementById('vib-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'vib-toast';
    el.className = 'vib-toast';
    el.addEventListener('click', () => el.classList.remove('show'));
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ── Auto vibration self-test on first gesture ── */
function runVibSelfTest() {
  if (localStorage.getItem('vibTested')) return;
  localStorage.setItem('vibTested', '1');

  const hasApi = 'vibrate' in navigator;
  if (!hasApi) return; // desktop или старый браузер — молчим

  let result;
  try { result = _vib?.([100, 60, 100]); } catch (_) { result = false; }

  try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch (_) {}

  // No first-run toast: the "вибрация заблокирована" banner confused users on
  // first open. The vibration is still attempted silently above; the full
  // diagnostic remains available via long-press on the ♫ button.
}

/* ── Long-press ♫ → extended diagnostic ── */
function testVibration() {
  const tg = window.Telegram?.WebApp;
  let result;
  try { result = _vib?.([150, 80, 150]); } catch (_) {}
  try { tg?.HapticFeedback?.impactOccurred('heavy'); } catch (_) {}
  const ctx = tg?.initData ? `Telegram · ${tg.platform}` : 'PWA (автономный)';
  showVibToast(
    `_vibrate захвачен: ${window._vibrate ? 'да' : 'нет'}\n` +
    `vibrate() → ${result ?? '—'}\n` +
    `Контекст: ${ctx}\n\n` +
    (result === false
      ? 'Chrome → ⋮ → Настройки сайта → Вибрация → Разрешить'
      : result === true
        ? 'API ОК. Если не чувствуете — проверьте режим тишины'
        : 'API недоступен'),
    8000
  );
}

/* ── Ambient music ── */
let audioCtx = null;
let musicPlaying = false;
let musicGain = null;
let _audioEl = null;

function startAmbient() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const master = audioCtx.createGain();
  master.gain.value = 0;
  const comp = audioCtx.createDynamicsCompressor();
  master.connect(comp);
  comp.connect(audioCtx.destination);
  musicGain = master;

  _audioEl = new Audio('music/ambient.mp3');
  _audioEl.loop = true;
  _audioEl.crossOrigin = 'anonymous';
  const src = audioCtx.createMediaElementSource(_audioEl);
  src.connect(master);
}

function toggleMusic() {
  const btn = document.getElementById('music-btn');
  if (!audioCtx) startAmbient();
  if (!musicPlaying) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    _audioEl.play().catch(() => {});
    musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, audioCtx.currentTime);
    musicGain.gain.linearRampToValueAtTime(0.55, audioCtx.currentTime + 2.5);
    musicPlaying = true;
    btn.classList.add('playing');
  } else {
    musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, audioCtx.currentTime);
    musicGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
    setTimeout(() => _audioEl && _audioEl.pause(), 1600);
    musicPlaying = false;
    btn.classList.remove('playing');
  }
}

/* ── Data loading ── */
async function loadData() {
  const f = (url) => fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); });
  const [s, t, k, m] = await Promise.all([f('data/seals.json'), f('data/tones.json'), f('data/kin_descriptions.json'), f('data/maya_classic.json')]);
  // Object keys are always strings, so the JSON maps ("1".."20") are already
  // keyed identically to a numeric lookup like sealsData[seal] — no rebuild loop
  // needed; assign the parsed maps directly.
  sealsData = s.seals;
  tonesData = t.tones;
  kinsData = k.kins;
  mayaData = m;
  try { dsTexts = await f('data/dreamspell_texts.json'); } catch (_) { dsTexts = {}; }
}

/* ── Share card generator ── */
const NEON_HEX = { red: '#e8453c', cyan: '#7ddfef', blue: '#6b7fff', amber: '#efc94c', violet: '#c07dff' };

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function shareKin() {
  const kin = dreamspellKin(currentDate);
  const { tone, seal } = kinToToneSeal(kin);
  const info = kinsData[String(kin)];
  const si = sealsData[seal];
  const ti = tonesData[tone];
  const color = sealColor(seal);
  const hex = NEON_HEX[color];
  const gap = isGap(kin);
  const dateStr = formatDateRu(currentDate).toUpperCase();

  const W = 640, H = 480;
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  const c = cvs.getContext('2d');

  // Background gradient
  const bg = c.createRadialGradient(W * 0.3, H * 0.15, 0, W * 0.5, H * 0.5, W * 0.7);
  bg.addColorStop(0, '#1a0a40');
  bg.addColorStop(1, '#050010');
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);

  // Subtle grid lines
  c.strokeStyle = 'rgba(180,160,255,0.06)';
  c.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = 0; y < H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

  // Load seal and tone images
  let sealImage, toneImage;
  try {
    [sealImage, toneImage] = await Promise.all([
      loadImage(`img/seal_${String(seal).padStart(2, '0')}.png`),
      loadImage(`img/tone_${String(tone).padStart(2, '0')}.png`),
    ]);
  } catch (_) {}

  // Seal circle with glow
  const cx = 180, cy = 200;
  c.save();
  c.shadowColor = hex;
  c.shadowBlur = 30;
  c.beginPath();
  c.arc(cx, cy, 70, 0, Math.PI * 2);
  c.fillStyle = 'rgba(20,10,50,0.7)';
  c.fill();
  c.strokeStyle = hex;
  c.lineWidth = 2;
  c.stroke();
  c.restore();

  if (sealImage) c.drawImage(sealImage, cx - 50, cy - 50, 100, 100);

  // Tone image above seal
  if (toneImage) c.drawImage(toneImage, cx - 20, cy - 100, 40, 40);

  // Right side text
  const tx = 310;
  c.fillStyle = 'rgba(232,226,255,0.4)';
  c.font = '500 11px "Space Grotesk", sans-serif';
  c.letterSpacing = '3px';
  c.fillText(dateStr, tx, 80);
  c.letterSpacing = '0px';

  // Kin number with glow
  c.save();
  c.shadowColor = hex;
  c.shadowBlur = 20;
  c.fillStyle = hex;
  c.font = '700 72px "JetBrains Mono", monospace';
  c.fillText(String(kin), tx, 155);
  c.restore();

  if (gap) {
    const kinW = c.measureText(String(kin)).width;
    c.fillStyle = '#4ade80';
    c.font = '700 14px "JetBrains Mono", monospace';
    c.fillText('GAP', tx + kinW + 10, 138);
  }

  // Title
  c.fillStyle = '#e8e2ff';
  c.font = '600 18px "Space Grotesk", sans-serif';
  const title = info?.title || '';
  c.fillText(title, tx, 185);

  // Seal + Tone info
  c.fillStyle = 'rgba(232,226,255,0.55)';
  c.font = '500 13px "JetBrains Mono", monospace';
  c.fillText(`${si.name_ru.toUpperCase()} · ${si.name_maya}`, tx, 220);
  c.fillText(`TOH ${tone} — ${ti.name_ru.toUpperCase()}`, tx, 242);

  // Affirmation
  const aff = (info?.affirmation || '').split('\n').filter(l => l.trim());
  if (aff.length) {
    c.fillStyle = 'rgba(125,223,239,0.15)';
    c.fillRect(tx - 10, 270, W - tx - 20, aff.length * 22 + 20);
    c.strokeStyle = 'rgba(125,223,239,0.3)';
    c.strokeRect(tx - 10, 270, W - tx - 20, aff.length * 22 + 20);

    c.fillStyle = 'rgba(125,223,239,0.7)';
    c.font = '12px "Space Grotesk", sans-serif';
    aff.forEach((line, i) => {
      const txt = line.trim();
      if (txt.length > 42) c.fillText(txt.slice(0, 42) + '…', tx, 292 + i * 22);
      else c.fillText(txt, tx, 292 + i * 22);
    });
  }

  // Footer
  c.fillStyle = 'rgba(180,160,255,0.25)';
  c.font = '10px "JetBrains Mono", monospace';
  c.letterSpacing = '2px';
  c.fillText('TZOLKIN · DREAMSPELL', 24, H - 20);
  c.letterSpacing = '0px';

  // Convert to blob and share
  cvs.toBlob(async (blob) => {
    const file = new File([blob], `kin-${kin}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Кин ${kin} — ${title}`, text: `${dateStr} · ${title}` });
        return;
      } catch (_) {}
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kin-${kin}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}

/* ── Date utilities ── */
function formatDateRu(d) {
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
}
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isGap(kin) {
  const info = kinsData[String(kin)];
  return info ? !!info.is_gap : false;
}

/** Parse a YYYY-MM-DD string into a real local Date, or null if invalid/partial.
 * Guards the whole app from Invalid Date poisoning currentDate (the freeze bug). */
function parseInputDate(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  // reject overflow like 2026-02-31 (JS would silently roll it over)
  if (isNaN(dt.getTime()) || dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

/** True if a day's kin resonates with the birth kin (same kin/seal/tone or an
 * oracle relation). Used to hop between personally-significant days. */
function dayResonatesWithBirth(dayKin, bKin) {
  if (dayKin === bKin) return true;
  const a = kinToToneSeal(dayKin), b = kinToToneSeal(bKin);
  if (a.seal === b.seal || a.tone === b.tone) return true;
  const bo = oracle(bKin);
  if (dayKin === bo.guide || dayKin === bo.analog || dayKin === bo.antipode || dayKin === bo.hidden) return true;
  const ao = oracle(dayKin);
  if (bKin === ao.guide || bKin === ao.analog || bKin === ao.antipode || bKin === ao.hidden) return true;
  return false;
}

/** Nearest resonant day from `from` in direction dir (+1/-1), or null. */
function findResonantDay(from, dir, bKin) {
  let d = from;
  for (let i = 0; i < 260; i++) {
    d = addDays(d, dir);
    if (dayResonatesWithBirth(dreamspellKin(d), bKin)) return d;
  }
  return null;
}

/** The user's stored birth date as a real local Date, or null if unset/invalid.
 * Single source of truth for the ~7 places that need the birth date — all reuse
 * parseInputDate's validation instead of re-implementing the split/parse. */
function storedBirthDate() { return parseInputDate(localStorage.getItem('birthDate')); }

function birthKinOrNull() {
  const d = storedBirthDate();
  return d ? dreamspellKin(d) : null;
}

/** Resolve an ISO YYYY-MM-DD birth date from a <input type=date> value and/or a
 * free-text "26.07.1990" field. Returns ISO string or null. Shared by the
 * personal-tab form and the settings-modal form. */
function birthDateFromInputs(dateVal, textVal) {
  let v = dateVal;
  if ((!v || v === '1990-01-01') && textVal && textVal.trim()) {
    const raw = textVal.trim().replace(/\//g, '.').replace(/-/g, '.');
    const parts = raw.split('.');
    if (parts.length === 3) {
      const [a, b, c] = parts.map(Number);
      const iso = c > 100 ? `${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`
                          : `${a}-${String(b).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
      if (!isNaN(new Date(iso).getTime())) v = iso;
    }
  }
  return v || null;
}

/** Unified date stepper for arrows + swipe. On the personal tab it hops to the
 * next/prev resonant day; elsewhere it's ±1 day. */
function stepDate(dir) {
  // Haptic is fired by the caller at PRESS time (pointerdown / swipe start),
  // not here — so the buzz lands the instant you touch, not on release.
  mayaGridOffset = 0;  // moving the day recentres the Чоль-К'их grid on it
  if (currentTab === 'personal') {
    const bKin = birthKinOrNull();
    if (bKin != null) {
      const found = findResonantDay(currentDate, dir, bKin);
      currentDate = found || addDays(currentDate, dir);
    } else {
      currentDate = addDays(currentDate, dir);
    }
    cyclesKin = null;
  } else {
    currentDate = addDays(currentDate, dir);
    cyclesKin = (currentTab === 'cycles') ? dreamspellKin(currentDate) : null;
  }
  render();
}

/**
 * Calculate the date for a given kin number relative to a reference date/kin.
 * We find the nearest occurrence (past or future within +-260 days).
 */
function dateForKin(targetKin) {
  const todayKin = dreamspellKin(currentDate);
  let diff = targetKin - todayKin;
  // Normalize to range [-130, +129] so we get the nearest occurrence
  while (diff < -130) diff += 260;
  while (diff > 129) diff += -260;
  return addDays(currentDate, diff);
}

/* ── Retention engine (Scenario 3): journal + streak + favorites ──
 * The app was a "single-session brochure": look up your kin once, leave forever.
 * These give a daily reason to return — all client-side localStorage, no backend:
 *   • day notes — a private diary entry tied to each day's kin
 *   • streak    — consecutive days opened, the dopamine loop
 *   • favorites — star resonant days to revisit
 */
function dateKey(d) {
  // local Y-M-D, stable regardless of timezone/clock
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const NOTE_PREFIX = 'note:';
function getNote(d) { return localStorage.getItem(NOTE_PREFIX + dateKey(d)) || ''; }
function setNote(d, text) {
  const k = NOTE_PREFIX + dateKey(d);
  if (text.trim()) localStorage.setItem(k, text);
  else localStorage.removeItem(k);
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem('favorites') || '[]'); }
  catch (_) { return []; }
}
function isFavorite(d) { return getFavorites().includes(dateKey(d)); }
function toggleFavorite(d) {
  const key = dateKey(d);
  const favs = getFavorites();
  const i = favs.indexOf(key);
  if (i >= 0) favs.splice(i, 1); else favs.push(key);
  localStorage.setItem('favorites', JSON.stringify(favs));
  return i < 0; // true if now favorited
}

/** Update the open-streak. Call once per session against the REAL today. */
function updateStreak() {
  let s;
  try { s = JSON.parse(localStorage.getItem('streak') || '{}'); } catch (_) { s = {}; }
  const today = dateKey(new Date());
  if (s.last === today) return s;            // already counted today
  const yesterday = dateKey(addDays(new Date(), -1));
  s.count = (s.last === yesterday) ? (s.count || 0) + 1 : 1;
  s.best = Math.max(s.best || 0, s.count);
  s.last = today;
  localStorage.setItem('streak', JSON.stringify(s));
  return s;
}
function getStreak() {
  try { return JSON.parse(localStorage.getItem('streak') || '{}').count || 0; }
  catch (_) { return 0; }
}

const SVG_FLAME = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12 2c1.5 3 .5 4.5-1 6.5C9 11 8 12.5 8 15a4 4 0 0 0 8 0c0-1.6-.6-2.8-1.3-3.8.9.4 1.8 1.3 2.3 2.6.7-1 1-2.2 1-3.3 0-3.2-2.2-5.6-3.5-7 .2 1.8-.7 3-2 3.4C12 6 13 4 12 2z"/></svg>';
const SVG_STAR_OUTLINE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.2l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg>';
const SVG_STAR_FILL = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 3.2l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg>';

/** Journal card for the main tab: streak chip, favorite star, day note. */
function renderJournal() {
  const streak = getStreak();
  const fav = isFavorite(currentDate);
  const note = getNote(currentDate);
  const streakChip = streak > 1
    ? `<span class="streak-chip" title="Дней подряд в приложении">${SVG_FLAME} ${streak}</span>`
    : '';
  return `<div class="kin-card journal-card">
    <h3 class="card-title">
      <span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span>
      ДНЕВНИК ДНЯ ${streakChip}
      <button class="fav-star ${fav ? 'on' : ''}" data-action="toggle-fav" aria-label="Отметить день" style="margin-left:auto">${fav ? SVG_STAR_FILL : SVG_STAR_OUTLINE}</button>
    </h3>
    <p class="section-intro" style="border:none;padding:0;margin:0 0 8px">Личная заметка к энергии этого Кина. Хранится только на вашем устройстве.</p>
    <textarea id="day-note" class="day-note" rows="3" maxlength="2000"
      placeholder="Что произошло? Что почувствовали? Как откликнулась энергия дня…">${escapeHtml(note)}</textarea>
    <div class="note-status" id="note-status"></div>
  </div>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ── Navigation ── */
function renderNav() {
  const el = document.getElementById('date-display');
  const today = new Date();
  const isToday = currentDate.toDateString() === today.toDateString();
  el.innerHTML = `
    <div class="day">${isToday ? 'СЕГОДНЯ' : DAYS_RU[currentDate.getDay()].toUpperCase()}</div>
    <div class="full">${formatDateRu(currentDate).toUpperCase()}</div>`;
}

function navigateToDate(d) {
  // Render synchronously — no setTimeout fade. The 150ms delay made every date
  // change feel like the app "responded late". Cards still fade in via their
  // own CSS animation, so the transition stays smooth but is now instant.
  currentDate = d;
  render();
}

function switchTab(tab) {
  if (tab === currentTab) return;
  pushNav();                // remember where we came from for «← НАЗАД»
  currentTab = tab;
  mayaSelectedSign = null;  // tab click always returns to list/grid, never a stale card
  mayaTaleOpen = null;
  mayaGridOffset = 0;       // re-enter the Чоль-К'их grid centred on today
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  render();                 // instant, no artificial delay
  window.scrollTo({ top: 0 });
}

/* Build the bottom tab bar for the active mode. Dreamspell bar is the static
   markup from index.html (captured once); Maya bar is generated text labels. */
function renderTabs() {
  const el = document.getElementById('tabs');
  if (DREAM_TABS_HTML === null) DREAM_TABS_HTML = el.innerHTML;
  if (mayaMode) {
    el.classList.add('tabs-maya');
    el.innerHTML = MAYA_TABS.map(([t, l]) =>
      `<button class="tab${t === currentTab ? ' active' : ''}" data-tab="${t}"><span class="tab-icon">${MAYA_TAB_ICONS[t] || ''}</span>${l}</button>`).join('');
  } else {
    el.classList.remove('tabs-maya');
    el.innerHTML = DREAM_TABS_HTML;
    el.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === currentTab));
  }
}

/* Open a sign's full card in the grid tab from anywhere (today/grid/tales). */
function openMayaSign(pos) {
  if (currentTab === 'maya-grid' && !mayaSelectedSign) mayaCatalogScrollY = window.scrollY;
  mayaSelectedSign = pos;
  mayaTaleOpen = null;
  if (currentTab !== 'maya-grid') { currentTab = 'maya-grid'; renderTabs(); }
  render();
  window.scrollTo({ top: 0 });
}

function setMayaMode(on) {
  mayaMode = on;
  localStorage.setItem('mayaMode', on ? '1' : '0');
  currentTab = on ? 'maya-today' : 'main';
  mayaSelectedSign = null;
  mayaTaleOpen = null;
  cyclesKin = null;
  navStack = [];            // mode switch is a fresh start — drop back history
  renderTabs();
  render();
}

/* ── Global back-navigation history ──────────────────────────────────────
   Snapshot the whole view (which tab/sub-view + scroll) so a single «← НАЗАД»
   button can return to EXACTLY where the user came from, no matter the path
   (myth from a sign card, sign card from the grid, a different tab, …).
   pushNav() is called by every navigation action BEFORE it mutates state, so
   it captures the FROM-view and the live scroll position. */
function captureView() {
  return {
    currentTab, mayaMode, mayaSelectedSign, mayaTaleOpen, mayaGridOffset,
    cyclesKin, currentDate: new Date(currentDate), scrollY: window.scrollY
  };
}
function pushNav() {
  navStack.push(captureView());
}
function goBack() {
  if (!navStack.length) return;
  const s = navStack.pop();
  currentTab = s.currentTab;
  mayaMode = s.mayaMode;
  mayaSelectedSign = s.mayaSelectedSign;
  mayaTaleOpen = s.mayaTaleOpen;
  mayaGridOffset = s.mayaGridOffset;
  cyclesKin = s.cyclesKin;
  currentDate = s.currentDate;
  renderTabs();
  render();
  requestAnimationFrame(() => window.scrollTo({ top: s.scrollY }));
}


/* ── WaveBar component ── */
function renderWaveBar(tone, colorCls) {
  let cells = '';
  for (let i = 1; i <= 13; i++) {
    let cls = 'wave-bar-cell';
    if (i === tone) cls += ' active';
    else if (i < tone) cls += ' passed';
    cells += `<div class="${cls}"></div>`;
  }
  return `<div class="wave-bar ${colorCls}">
    <div class="wave-bar-label">
      <span>ВОЛНА · ПОЗИЦИЯ ${tone}/13</span>
    </div>
    <div class="wave-bar-strip">${cells}</div>
  </div>`;
}

/* ── Tab: Main (Кин) ── */
function renderMain(kin, tone, seal) {
  const info = kinsData[String(kin)];
  const sealInfo = sealsData[seal];
  const toneInfo = tonesData[tone];
  const color = sealColor(seal);
  const wave = wavespell(kin);
  const cast = castle(kin);
  const waveSeal = kinToToneSeal((wave - 1) * 13 + 1).seal;
  const gap = isGap(kin);

  let html = '';

  if (isDayOutOfTime(currentDate))
    html += `<div class="doot-banner">⏳ ДЕНЬ ВНЕ ВРЕМЕНИ</div>`;

  if (tone === 1)
    html += `<div class="wave-banner"><div class="emoji">🌀</div>
      <div class="text">Начинается Волна ${wave} — ${sealInfo.name_ru}</div></div>`;

  html += `<div class="kin-card">
    <div class="kin-header">
      <div class="tone-above">${toneImg(tone, 36)}</div>
      <div class="seal-badge ${color} c-${color}">${sealImg(seal, 80, true)}</div>
      <div class="kin-number c-${color}">${kin}${gap ? '<span class="gap-badge gap-info-btn" data-action="gap-info">ГАП</span>' : ''}</div>
      <div class="kin-title">${info.title}</div>
      <div class="kin-subtitle">${sealInfo.name_maya} · ${toneImg(tone, 18)} ТОН ${tone} — ${toneInfo.name_ru}</div>
    </div>`;

  // WaveBar
  html += renderWaveBar(tone, 'c-' + color);

  html += `<div class="info-grid" style="grid-template-columns:1fr 1fr">
      <div class="info-item" data-action="wave-popup">
        <div class="info-label">ВОЛНА ▸</div>
        <div class="info-value">${sealImg(waveSeal, 22)} ${wave} — ${sealsData[waveSeal].name_ru}</div>
        <div class="info-sub">Позиция ${(kin - 1) % 13 + 1} из 13</div>
      </div>
      <div class="info-item" data-action="castle-popup">
        <div class="info-label">ЗАМОК ▸</div>
        <div class="info-value">${CASTLE_NAMES[cast]?.split(' ')[0] || cast}</div>
        <div class="info-sub">${CASTLE_HINTS[cast]?.split('—')[0]?.trim() || ''}</div>
      </div>
    </div>`;

  // Compact status badges. The ГАП marker now lives only on the kin number
  // (red badge, tappable) — the separate green pill here was a duplicate in an
  // off-palette colour, so it's gone.
  const badges = [];
  if (isPro()) {
    if (tone === 1) badges.push(`<span class="status-badge gate-bg" data-action="gate-info">МАГНИТНЫЕ ВРАТА</span>`);
    const spKins = dsTexts?.tzolkin_legend?.spectral_polar?.kins || [];
    if (spKins.includes(kin)) badges.push(`<span class="status-badge sp-bg" data-action="sp-info">СПЕКТРАЛЬНЫЙ ПОЛЯРНЫЙ</span>`);
  }
  if (badges.length) html += `<div class="status-badges">${badges.join('')}</div>`;

  html += `<button class="share-btn" data-action="share-kin">ПОДЕЛИТЬСЯ</button>
  </div>`;

  // Seal, Tone, Earth Family — PRO only (collapsible)
  if (isPro()) {
    const tp = dsTexts?.tone_profiles?.[String(tone)];
    const ef = dsTexts?.earth_families?.families?.find(f => f.seal_ids.includes(seal));

    html += `<div class="detail-section collapsible" data-collapse="seal">
      <h3 class="collapsible-header"><span class="dot" style="background:var(--n-${color});box-shadow:0 0 8px var(--n-${color})"></span>
        ПЕЧАТЬ — ${sealImg(seal, 20)} ${sealInfo.name_ru}</h3>
      <div class="collapsible-body">
        <div class="pp-props">▸ СУТЬ: ${sealInfo.essence_ru}<br>▸ СИЛА: ${sealInfo.power_ru}<br>▸ ДЕЙСТВИЕ: ${sealInfo.action_ru}${sealInfo.chakra_ru ? `<br>▸ ЧАКРА: ${sealInfo.chakra_ru}` : ''}</div>
        ${sealInfo.description_ru ? `<p class="pp-main">${sealInfo.description_ru}</p>` : ''}
      </div>
    </div>`;

    html += `<div class="detail-section collapsible" data-collapse="tone">
      <h3 class="collapsible-header"><span class="dot" style="background:var(--n-cyan);box-shadow:0 0 8px var(--n-cyan)"></span>
        ТОН ${tone} — ${toneImg(tone, 20)} ${toneInfo.name_ru}</h3>
      <div class="collapsible-body">
        <div class="pp-props">${[toneInfo.function_ru ? `▸ ФУНКЦИЯ: ${toneInfo.function_ru}` : '', toneInfo.creative_power_ru ? `▸ ТВОРЧЕСКАЯ СИЛА: ${toneInfo.creative_power_ru}` : '', toneInfo.action_ru ? `▸ ДЕЙСТВИЕ: ${toneInfo.action_ru}` : ''].filter(Boolean).join('<br>')}</div>
        ${toneInfo.description_ru ? `<p class="pp-main">${toneInfo.description_ru}</p>` : ''}
        ${tp?.wave_role ? `<p class="pp-main" style="margin-top:10px"><b>Роль в Волне:</b> ${tp.wave_role}</p>` : ''}
        ${tp?.character ? `<p class="pp-main" style="margin-top:10px"><b>Характер Тона:</b> ${tp.character}</p>` : ''}
        ${toneInfo.question_ru ? `<div class="question-block" style="margin-top:12px"><div class="q">❓ ${toneInfo.question_ru}</div></div>` : ''}
      </div>
    </div>`;

    if (ef) {
      html += `<div class="detail-section collapsible" data-collapse="family">
        <h3 class="collapsible-header"><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span>
          ЗЕМНАЯ СЕМЬЯ — ${ef.name.toUpperCase()}</h3>
        <div class="collapsible-body">
          <div class="pp-props">▸ ЧАКРА: ${ef.chakra}<br>▸ ФУНКЦИЯ: ${ef.function}<br>▸ ПЕЧАТИ: ${ef.seals.join(', ')}</div>
          <p class="pp-main">${ef.description}</p>
        </div>
      </div>`;
    }
  }

  // Affirmation with bracket frame
  const affLines = (info.affirmation || '').split('\n').filter(l => l.trim());
  html += `<div class="affirmation bracket-frame c-cyan">
    <div class="br-tr"></div><div class="br-bl"></div>
    <div class="aff-header">
      <span class="eyebrow c-cyan">▸ ДЕВИЗ ДНЯ</span>
      <span class="eyebrow muted">КИН · ${kin}</span>
    </div>
    <p class="section-intro" style="border:none;padding:0;margin:0 0 8px">Аффирмация — ключевая фраза Кина, объединяющая Печать и Тон.</p>
    <div class="aff-body">`;
  for (const line of affLines) {
    html += `<div><span class="aff-prefix">&gt; </span><span class="aff-line">${line.trim()}</span></div>`;
  }
  html += `<div class="aff-prefix">&gt; <span class="blink">_</span></div>
    </div>
  </div>`;

  const summary = info.summary || '';
  if (isPro() && summary)
    html += `<div class="detail-section collapsible" data-collapse="archetype"><h3 class="collapsible-header"><span class="dot" style="background:var(--n-amber);box-shadow:0 0 8px var(--n-amber)"></span> АРХЕТИП</h3><div class="collapsible-body"><p class="pp-main">${summary}</p></div></div>`;

  return html;
}

/* ── Tab: Oracle ── */
function renderOracle(kin) {
  const o = oracle(kin);
  function cell(k, role, area) {
    const { tone: kt, seal } = kinToToneSeal(k);
    const c = sealColor(seal);
    const isBig = area === 'main';
    const bsz = isBig ? 56 : 40;
    const isz = isBig ? 46 : 32;
    return `<div class="oracle-cell c-${c} ${isBig ? 'main' : ''}" style="grid-area:${area}" data-popup-kin="${k}" data-popup-area="${area}">
      <div class="role">${role}</div>
      <div style="margin:2px 0">${toneImg(kt, 16)}</div>
      <div class="seal-badge ${c}" style="width:${bsz}px;height:${bsz}px;margin:2px auto">${sealImg(seal, isz, true)}</div>
      <div class="kin-num-cell">${k}</div>
    </div>`;
  }

  let html = `<div class="kin-card">
    <h3 class="card-title"><span class="dot"></span> КРЕСТ СУДЬБЫ · ORACLE</h3>
    <p class="section-intro">Четыре энергии, окружающие Кин дня. Вместе образуют «крест судьбы».</p>
    <div class="oracle-cross">
      ${cell(o.guide, 'УПРАВИТЕЛЬ', 'guide')}
      ${cell(o.antipode, 'АНТИПОД', 'anti')}
      ${cell(kin, 'КИН ДНЯ', 'main')}
      ${cell(o.analog, 'АНАЛОГ', 'analog')}
      ${cell(o.hidden, 'ОККУЛЬТНЫЙ УЧИТЕЛЬ', 'hidden')}
    </div><div class="oracle-list">`;

  for (const r of ORACLE_ROLES) {
    const k = o[r.key];
    const { seal } = kinToToneSeal(k);
    const si = sealsData[seal];
    const c = sealColor(seal);
    const title = kinsData[String(k)]?.title || '';
    const sealDesc = si.description_ru ? si.description_ru.split('.')[0] + '.' : `${si.power_ru} · ${si.action_ru}`;
    html += `<div class="oracle-row" data-popup-kin="${k}" data-popup-area="${r.key}">
      <div class="oracle-arrow">${r.arrow}</div>
      <div class="oracle-seal-img c-${c}">${sealImg(seal, 32, true)}</div>
      <div class="oracle-info">
        <div class="oracle-role">${r.name}</div>
        <div class="oracle-name">КИН ${k} — ${title}</div>
        <div class="oracle-hint">${r.desc}</div>
        <div class="oracle-seal-desc">${sealDesc}</div>
        <div class="oracle-nav-hint">нажмите для подробностей</div>
      </div></div>`;
  }
  html += `</div></div>`;
  return html;
}

/* ── Tab: Moon ── */
function renderMoon() {
  const m = getMoon(currentDate);
  if (m.isOot) return `<div class="doot-banner">⏳ ДЕНЬ ВНЕ ВРЕМЕНИ<br>25 ИЮЛЯ — ДЕНЬ МЕЖДУ ГОДАМИ 13-ЛУННОГО КАЛЕНДАРЯ</div>`;

  const yb = yearBearer(currentDate);
  const ybTitle = kinsData[String(yb.kin)]?.title || '';
  const ybTS = kinToToneSeal(yb.kin);

  return `<div class="kin-card">
    <h3 class="card-title"><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span> 13-ЛУННЫЙ КАЛЕНДАРЬ</h3>
    <p class="section-intro">Год из 13 лун по 28 дней. Каждая луна = 4 недели. Начало года — 26 июля. ${m.moonName}</p>
    <div class="info-grid" style="margin-top:12px">
      <div class="info-item moon-clickable" data-action="moon-popup" data-moon-type="luna">
        <div class="info-label">ЛУНА ▸</div>
        <div class="info-value">${m.moonNumber} ИЗ 13</div></div>
      <div class="info-item moon-clickable" data-action="moon-popup" data-moon-type="day">
        <div class="info-label">ДЕНЬ ▸</div>
        <div class="info-value">${m.moonDay} ИЗ 28</div></div>
      <div class="info-item moon-clickable" data-action="moon-popup" data-moon-type="week">
        <div class="info-label">НЕДЕЛЯ ▸</div>
        <div class="info-value">${m.heptad} — ${m.heptadColor}</div></div>
      <div class="info-item moon-clickable" data-action="moon-popup" data-moon-type="plasma">
        <div class="info-label">ПЛАЗМА ▸</div>
        <div class="info-value">${m.plasma.name}</div></div>
    </div>
  </div>
  <div class="detail-section moon-clickable" data-action="year-bearer-nav">
    <h3><span class="dot" style="background:var(--n-amber);box-shadow:0 0 8px var(--n-amber)"></span> ГОД: ${sealImg(ybTS.seal, 20)} ${ybTitle}</h3>
    <p class="section-intro">Каждый год носит имя Кина, выпадающего на 26 июля. Нажмите, чтобы перейти к 26 июля.</p>
    <div class="pp-props">▸ КИН: ${yb.kin}<br>▸ ПЕРИОД: ${yb.yearStart.getDate()}.${String(yb.yearStart.getMonth() + 1).padStart(2, '0')}.${yb.yearStart.getFullYear()} — 24.07.${yb.yearStart.getFullYear() + 1}</div>
  </div>`;
}

/* ── Tab: Wave ── */
function renderWave(kin, tone) {
  const wave = wavespell(kin);
  const cast = castle(kin);
  const waveFirst = (wave - 1) * 13 + 1;
  const { seal: waveSeal } = kinToToneSeal(waveFirst);
  const wsi = sealsData[waveSeal];
  const pos = (kin - 1) % 13 + 1;
  const p = pulsar(tone);

  const ws = dsTexts?.wavespell;
  const cd = dsTexts?.castles?.list?.find(c => c.id === cast);
  const pulsarData = dsTexts?.pulsars?.list?.find(pl => pl.tones.includes(tone));

  let html = `<div class="kin-card">
    <h3 class="card-title"><span class="dot"></span> ВОЛНА ${wave} — ${sealImg(waveSeal, 22)} ${wsi.name_ru}</h3>
    <p class="section-intro">${ws?.intro || 'Волна — 13-дневный цикл с единой темой. Всего 20 волн.'}</p>
    <div class="pp-props">▸ СИЛА: ${wsi.power_ru}<br>▸ ДЕЙСТВИЕ: ${wsi.action_ru}<br>▸ СЕГОДНЯ ДЕНЬ ${pos} ИЗ 13</div>
    ${ws?.structure ? `<p class="pp-main">${ws.structure}</p>` : ''}
  </div>
  <div class="detail-section">
    <h3><span class="dot" style="background:var(--n-amber);box-shadow:0 0 8px var(--n-amber)"></span> ЗАМОК ${cast} — ${CASTLE_NAMES[cast]}</h3>
    <p class="section-intro">${dsTexts?.castles?.mechanic || 'Замок — 52-дневный цикл из 4 волн. Всего 5 замков.'}</p>
    <div class="pp-props">▸ ФУНКЦИЯ: ${cd?.function || CASTLE_HINTS[cast]}<br>▸ КИНЫ: ${cd?.kins || ''}<br>▸ ЗАМОК ${cast} ИЗ 5 · ВОЛНЫ ${(cast - 1) * 4 + 1}–${cast * 4}</div>
    ${cd?.description ? `<p class="pp-main">${cd.description}</p>` : ''}
    ${cd?.metaphor ? `<p class="pp-main" style="margin-top:10px;font-style:italic">${cd.metaphor}</p>` : ''}
  </div>
  <div class="detail-section">
    <h3><span class="dot" style="background:var(--n-red);box-shadow:0 0 8px var(--n-red)"></span> ПУЛЬСАР: ${p.name}${pulsarData ? ` (${pulsarData.dimension})` : ''}</h3>
    <p class="section-intro">${dsTexts?.pulsars?.intro || 'Пульсар — ритм внутри волны: какое измерение активно сегодня.'}</p>
    <p class="pp-main">${pulsarData?.description || p.hint}</p>
  </div>`;

  // Pulsar geometry visualization
  html += `<div class="kin-card" style="padding:14px 10px">
    <h3 class="card-title" style="font-size:11px"><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span> ГЕОМЕТРИЯ ПУЛЬСАРОВ</h3>
    <p class="section-intro">Нажмите на тон, чтобы увидеть его пульсар. Линии показывают нелинейные связи внутри Волны.</p>
    <canvas id="pulsar-canvas" width="600" height="280" style="width:100%;border-radius:12px;cursor:pointer"></canvas>
  </div>`;

  // 13 kins of wave
  html += `<div class="kin-card"><h3 class="card-title"><span class="dot"></span> КИНЫ ВОЛНЫ</h3><p class="section-intro">13 кинов текущей волны. Нажмите на кин, чтобы перейти к этому дню.</p><div style="margin-top:8px">`;
  for (let i = 0; i < 13; i++) {
    const wk = waveFirst + i;
    const { seal: ws } = kinToToneSeal(wk);
    const isCurrent = wk === kin;
    const gap = isGap(wk);
    const title = kinsData[String(wk)]?.title || '';
    html += `<div class="wave-kin-row${isCurrent ? ' current' : ''}" data-wave-kin="${wk}">
      <span class="wave-kin-marker">${isCurrent ? '✦' : ''}</span>
      <span class="wave-kin-img">${sealImg(ws, 28)}</span>
      <span class="wave-kin-text">${title}${gap ? '<span class="gap-badge gap-info-btn" data-action="gap-info" title="Портал Галактической Активации — нажмите для пояснения">ГАП</span>' : ''}</span>
      <span class="wave-kin-num">${wk}</span>
    </div>`;
  }
  html += `</div></div>`;
  return html;
}

/* ── Tab: Cycles ── */
function updateCyclesActive() {
  const kin = cyclesKin;
  const { tone, seal } = kinToToneSeal(kin);
  const sealInfo = sealsData[seal];
  const toneInfo = tonesData[tone];
  const color = sealColor(seal);
  const castIdx = castle(kin) - 1;
  const waveInCastle = Math.floor(((kin - 1) % 52) / 13);
  const castleColors = ['red','cyan','blue','amber','violet'];
  const waveColors = ['red','cyan','blue','amber'];

  // freeze only the bottom (tone) strip when dragging castle
  const toneActive = dragUnit !== 52;

  // Update castle cells + counter
  const castleCells = document.querySelectorAll('[data-cycle="castle"] .cycle-cell');
  castleCells.forEach((c, i) => c.classList.toggle('active', i === castIdx));
  const castNum = document.getElementById('cyc-castle-num');
  if (castNum) castNum.textContent = `${castIdx + 1} / 5 · 52 ДНЯ`;

  // Update wave cells + counter (always — cascades from castle drag too)
  const waveCells = document.querySelectorAll('[data-cycle="wave"] .cycle-cell');
  waveCells.forEach((c, i) => c.classList.toggle('active', i === waveInCastle));
  const waveNum = document.getElementById('cyc-wave-num');
  if (waveNum) waveNum.textContent = `${waveInCastle + 1} / 4 · 13 КИНОВ`;

  // Update tone cells + counter (skip when dragging castle)
  if (toneActive) {
    const toneCells = document.querySelectorAll('[data-cycle="tone"] .cycle-cell');
    toneCells.forEach((c, i) => c.classList.toggle('active', i === tone - 1));
    const toneName = document.getElementById('cyc-tone-name');
    if (toneName) toneName.textContent = toneInfo.name_ru.toUpperCase();
  }

  // Update strip colors
  const strips = document.querySelectorAll('.cycle-strip');
  if (strips[0]) strips[0].className = `cycle-strip c-${castleColors[castIdx]}`;
  if (strips[1]) strips[1].className = `cycle-strip c-${waveColors[waveInCastle]}`;
  if (toneActive && strips[2]) strips[2].className = `cycle-strip c-${waveColors[waveInCastle]}`;

  // Update info card
  const infoCard = document.querySelector('.cycle-info-card');
  if (infoCard) {
    infoCard.innerHTML = `
    <div class="row">
      <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center">
        <div style="margin-bottom:4px">${toneImg(tone, 28)}</div>
        <div class="seal-badge ${color}" style="width:80px;height:80px">
          ${sealImg(seal, 68, true)}
        </div>
      </div>
      <div style="flex:1;min-width:0">
        <div class="eyebrow">КИН · ${kin} / 260</div>
        <div class="kin-num c-${color}" style="font-size:44px;margin-top:0;cursor:pointer" data-action="cycles-kin-popup">${kin}</div>
        <div class="display" style="font-size:10px;margin-top:6px;opacity:0.85">
          ЗАМОК ${castIdx + 1} · ВОЛНА ${waveInCastle + 1} · ТОН ${tone}
        </div>
      </div>
    </div>
    <div class="hr"></div>
    <div class="dim" style="font-size:12px;line-height:1.5;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.06em">
      260 ДНЕЙ = 5 ЗАМКОВ × 4 ВОЛНЫ × 13 ТОНОВ.<br>
      КАЖДЫЙ ТОН ВНУТРИ ВОЛНЫ, ВОЛНА ВНУТРИ ЗАМКА.
    </div>`;
  }

  // Move smooth markers (skip tone strip when dragging castle)
  document.querySelectorAll('.cycle-strip-grid[data-cycle]').forEach(grid => {
    const gridUnit = +grid.dataset.unit;
    if (dragUnit === 52 && gridUnit === 1) return;
    const marker = grid.querySelector('.cycle-marker');
    const activeCell = grid.querySelector('.cycle-cell.active');
    if (!marker || !activeCell) return;
    const gr = grid.getBoundingClientRect();
    const cr = activeCell.getBoundingClientRect();
    marker.style.top = (cr.top - gr.top) + 'px';
    marker.style.left = (cr.left - gr.left) + 'px';
    marker.style.width = cr.width + 'px';
    marker.style.height = cr.height + 'px';
  });

  // Update pulsar canvas when tone changes
  drawPulsarCanvas(tone);

  // Sync wave kin list highlight
  document.querySelectorAll('.wave-kin-row').forEach(r => {
    r.classList.toggle('current', +r.dataset.waveKin === kin);
  });
}

function positionCycleMarkers() {
  document.querySelectorAll('.cycle-strip-grid[data-cycle]').forEach(grid => {
    const marker = grid.querySelector('.cycle-marker');
    const activeCell = grid.querySelector('.cycle-cell.active');
    if (!marker || !activeCell) return;
    const gr = grid.getBoundingClientRect();
    const cr = activeCell.getBoundingClientRect();
    // disable transition for initial placement
    marker.style.transition = 'none';
    marker.style.top = (cr.top - gr.top) + 'px';
    marker.style.left = (cr.left - gr.left) + 'px';
    marker.style.width = cr.width + 'px';
    marker.style.height = cr.height + 'px';
    requestAnimationFrame(() => { marker.style.transition = ''; });
  });
}

function renderCycles(kin) {
  const { tone, seal } = kinToToneSeal(kin);
  const info = kinsData[String(kin)];
  const sealInfo = sealsData[seal];
  const toneInfo = tonesData[tone];
  const color = sealColor(seal);
  const castIdx = castle(kin) - 1; // 0-based for cells
  const castNum = castIdx + 1;
  const wave = wavespell(kin);
  const waveFirst = (wave - 1) * 13 + 1;
  // Wave index within castle (0-3)
  const waveInCastle = Math.floor(((kin - 1) % 52) / 13);
  // Castle color mapping
  const castleColors = ['red','cyan','blue','amber','violet'];

  let html = '';

  html += `<div style="text-align:center;margin:8px 0 4px">
    <div class="eyebrow">ВЛОЖЕННЫЕ ЦИКЛЫ</div>
    <p class="section-intro" style="text-align:center;border:none;padding:0;margin:6px 0 0">260 дней Цолькина делятся на замки, волны и тоны. Свайпайте полоски, чтобы перемещаться по циклам.</p>
  </div>`;

  // Castle strip (5 cells)
  html += `<div class="cycle-strip c-${castleColors[castIdx]}">
    <div class="cycle-strip-header" data-action="cycles-castle-popup" style="cursor:pointer">
      <span class="eyebrow">ЗАМОК ▸</span>
      <span class="eyebrow muted" id="cyc-castle-num">${castNum} / 5 · 52 ДНЯ</span>
    </div>
    <div class="cycle-strip-grid" style="grid-template-columns:repeat(5,1fr)" data-cycle="castle" data-unit="52">`;
  for (let i = 0; i < 5; i++) {
    const active = i === castIdx;
    html += `<div class="cycle-cell c-${castleColors[i]}${active ? ' active' : ''}">
      <div class="cell-num">${i + 1}</div>
      <div class="cell-label">${CASTLE_SUB[i]}</div>
    </div>`;
  }
  html += `<div class="cycle-marker"></div></div></div>`;

  // Wave strip (4 cells within castle)
  const waveColors = ['red','cyan','blue','amber'];
  html += `<div class="cycle-strip c-${waveColors[waveInCastle]}" style="margin-left:14px">
    <div class="cycle-strip-header" data-action="cycles-wave-popup" style="cursor:pointer">
      <span class="eyebrow">ВОЛНА ▸</span>
      <span class="eyebrow muted" id="cyc-wave-num">${waveInCastle + 1} / 4 · 13 КИНОВ</span>
    </div>
    <div class="cycle-strip-grid" style="grid-template-columns:repeat(4,1fr)" data-cycle="wave" data-unit="13">`;
  for (let i = 0; i < 4; i++) {
    const active = i === waveInCastle;
    const startKin = castIdx * 52 + i * 13 + 1;
    html += `<div class="cycle-cell c-${waveColors[i]}${active ? ' active' : ''}">
      <div class="cell-num">W${i + 1}</div>
      <div class="cell-label">${startKin}–${startKin + 12}</div>
    </div>`;
  }
  html += `<div class="cycle-marker"></div></div></div>`;

  // Tone strip (13 cells)
  html += `<div class="cycle-strip c-${waveColors[waveInCastle]}" style="margin-left:28px">
    <div class="cycle-strip-header" data-action="cycles-pulsar-popup" style="cursor:pointer">
      <span class="eyebrow">ПУЛЬСАР · ТОН ▸</span>
      <span class="eyebrow muted" id="cyc-tone-name">${toneInfo.name_ru.toUpperCase()}</span>
    </div>
    <div class="cycle-strip-grid" style="grid-template-columns:repeat(13,1fr)" data-cycle="tone" data-unit="1">`;
  for (let i = 0; i < 13; i++) {
    const active = i === tone - 1;
    html += `<div class="cycle-cell c-${waveColors[waveInCastle]}${active ? ' active' : ''}" style="min-height:40px">
      <div class="cell-num" style="font-size:12px">${i + 1}</div>
    </div>`;
  }
  html += `<div class="cycle-marker"></div></div></div>`;

  // Info card
  html += `<div class="cycle-info-card">
    <div class="row">
      <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center">
        <div style="margin-bottom:4px">${toneImg(tone, 28)}</div>
        <div class="seal-badge ${color}" style="width:80px;height:80px">
          ${sealImg(seal, 68, true)}
        </div>
      </div>
      <div style="flex:1;min-width:0">
        <div class="eyebrow">КИН · ${kin} / 260</div>
        <div class="kin-num c-${color}" style="font-size:44px;margin-top:0;cursor:pointer" data-action="cycles-kin-popup">${kin}</div>
        <div class="display" style="font-size:10px;margin-top:4px;opacity:0.85">
          ЗАМОК ${castNum} · ВОЛНА ${waveInCastle + 1} · ТОН ${tone} · ${info?.title || ''}
        </div>
      </div>
    </div>
    <div class="hr"></div>
    <div class="dim" style="font-size:12px;line-height:1.5;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.06em">
      260 ДНЕЙ = 5 ЗАМКОВ × 4 ВОЛНЫ × 13 ТОНОВ.<br>
      КАЖДЫЙ ТОН ВНУТРИ ВОЛНЫ, ВОЛНА ВНУТРИ ЗАМКА.
    </div>
  </div>`;

  // Wave kins with harmonic grouping
  const { seal: waveSeal2 } = kinToToneSeal(waveFirst);
  const wsi2 = sealsData[waveSeal2];
  const p = pulsar(tone);
  const pulsarData = dsTexts?.pulsars?.list?.find(pl => pl.tones.includes(tone));

  html += `<div class="kin-card">
    <h3 class="card-title"><span class="dot"></span> ВОЛНА ${wave} — ${sealImg(waveSeal2, 22)} ${wsi2.name_ru}</h3>
    <div style="margin-top:8px">`;
  for (let i = 0; i < 13; i++) {
    const wk = waveFirst + i;
    const { seal: ws } = kinToToneSeal(wk);
    const isCurrent = wk === kin;
    const wgap = isGap(wk);
    const title = kinsData[String(wk)]?.title || '';
    const harmIdx = (wk - 1) % 4;
    const harmFirst = harmIdx === 0;
    const harmLast = harmIdx === 3;
    let rowCls = 'wave-kin-row';
    if (isCurrent) rowCls += ' current';
    if (harmFirst) rowCls += ' harm-first';
    if (harmLast) rowCls += ' harm-last';
    if (i === 0 && harmIdx > 0) rowCls += ' harm-open-top';
    if (i === 12 && harmIdx < 3) rowCls += ' harm-open-bottom';
    html += `<div class="${rowCls}" data-wave-kin="${wk}">
      <span class="wave-kin-marker">${isCurrent ? '✦' : ''}</span>
      <span class="wave-kin-img">${sealImg(ws, 28)}</span>
      <span class="wave-kin-text">${title}${wgap ? '<span class="gap-badge gap-info-btn" data-action="gap-info" title="Портал Галактической Активации — нажмите для пояснения">ГАП</span>' : ''}</span>
      <span class="wave-kin-num">${wk}</span>
    </div>`;
  }
  html += `</div></div>`;

  // Pulsar info
  html += `<div class="kin-card" style="padding:14px 10px">
    <h3 class="card-title" style="font-size:11px"><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span> ПУЛЬСАР: ${p.name}</h3>
    <p class="pp-main" style="font-size:12px">${pulsarData?.description || p.hint}</p>
    <canvas id="pulsar-canvas" width="600" height="280" style="width:100%;border-radius:12px;cursor:pointer;margin-top:10px"></canvas>
  </div>`;

  return html;
}

/* ── Maya tone dots ── */
function mayaDots(tone) {
  const bars = Math.floor(tone / 5);
  const dots = tone % 5;
  let s = '';
  if (dots > 0) {
    s += '<span class="maya-dots">';
    for (let i = 0; i < dots; i++) s += '<span class="maya-dot"></span>';
    s += '</span>';
  }
  for (let i = 0; i < bars; i++) s += '<span class="maya-bar"></span>';
  return `<span class="maya-num">${s}</span>`;
}

/* GAP portals now read from kinsData.is_gap (canonical 52 in kin_descriptions.json) */

/* ── Tab: Tzolkin calendar grid ── */
function renderTzolkin(currentKin) {
  const birthKin = birthKinOrNull();

  const html = `<div class="kin-card" style="padding:10px">
    <h3 class="card-title" style="font-size:12px"><span class="dot"></span> ЦОЛЬКИН — 260-ДНЕВНЫЙ ЦИКЛ</h3>
    <div class="tzolkin-legend">
      <span data-action="gap-info"><span class="legend-swatch" style="background:oklch(0.66 0.16 158)"></span>ГАП <span class="legend-hint">ⓘ</span></span>
      <span data-action="mystic-info"><span class="legend-swatch" style="background:oklch(0.62 0.10 295)"></span>Мистич. <span class="legend-hint">ⓘ</span></span>
      ${isPro() ? `<span data-action="gate-info"><span class="legend-swatch legend-ring" style="border-color:rgba(255,255,255,0.85)"></span>Врата <span class="legend-hint">ⓘ</span></span>
      <span data-action="sp-info"><span class="legend-swatch legend-ring" style="border-color:var(--n-violet)"></span>Спектр. <span class="legend-hint">ⓘ</span></span>` : ''}
    </div>
  </div>`
    + tzolkinGlyphGrid(currentKin, birthKin);

  return html;
}

/* Build the Tzolk'in-style 260-kin matrix: dark tiles, large seal glyph in the
   sign's neon color, tone number below. No separate row-header column — the
   glyph IS the row identifier. All marker logic (GAP / current / birth /
   mag-gate / spectral-polar) lives here once. */
function tzolkinGlyphGrid(currentKin, birthKin) {
  const kin1Date = addDays(currentDate, -(currentKin - 1));
  let html = `<div class="tzolkin-grid-wrapper tglyph-wrapper"><div class="tglyph-grid">`;

  for (let seal = 1; seal <= 20; seal++) {
    const colorKey = COLOR_RU[SEAL_COLORS[seal]];   // 'red'|'white'|'blue'|'yellow'
    const glyph = `img/seal_${String(seal).padStart(2, '0')}.png`;
    for (let col = 0; col < 13; col++) {
      const k = seal + col * 20;
      const tone = (k - 1) % 13 + 1;
      const gap = isGap(k);
      const isMystic = col === 6;
      const isMagGate = tone === 1;
      const isSpectralPolar = k === 50 || k === 115 || k === 180 || k === 245;

      let cls = 'tglyph-cell';
      if (gap)             cls += ' tgc-gap';
      else if (isMystic)   cls += ' tgc-mystic';
      else                 cls += ` tgc-${colorKey}`;
      if (k === currentKin) cls += ' current-kin';
      if (k === birthKin)   cls += ' birth-kin';
      if (isMagGate)        cls += ' mag-gate';
      if (isSpectralPolar)  cls += ' spectral-polar';

      const d = addDays(kin1Date, k - 1);
      let title = `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()} · Кин ${k} · Тон ${tone}`;
      if (isSpectralPolar) title = `Кин ${k} · Спектральный Полярный`;
      else if (isMagGate)  title = `Кин ${k} · Магнитные Врата — открывает Волну ${Math.ceil(k / 13)}`;
      else if (gap)        title += ' · ГАП';

      html += `<div class="${cls}" data-tz-kin="${k}" title="${title}">`
        + `<img src="${glyph}" class="tgc-glyph" width="34" height="34" alt="" loading="lazy">`
        + `<span class="tgc-tone">${tone}</span></div>`;
    }
  }
  return html + `</div></div>`;
}

/** Birth-date entry form (date picker + free-text fallback). Identical on the
 * Dreamspell and Maya personal tabs — extracted to remove the copy-paste. */
function birthInputForm() {
  const todayStr = new Date().toISOString().slice(0, 10);
  return `<div class="birth-input-group">
        <input type="date" id="birth-date-input" value="1990-01-01" min="1900-01-01" max="${todayStr}">
        <button id="birth-save-btn">OK</button>
      </div>
      <p style="font-size:11px;color:var(--ink-faint);margin-top:8px;text-align:center">Или введите текстом: <input type="text" id="birth-text-input" placeholder="26.07.1990" style="background:rgba(255,255,255,0.06);border:1px solid var(--hairline-2);border-radius:8px;color:var(--ink);padding:4px 8px;font-family:var(--font-mono);font-size:12px;width:100px;text-align:center"></p>`;
}

/* ── Tab: Personal (Мой Кин) ── */
function renderPersonal() {
  const birthDateStr = localStorage.getItem('birthDate');

  if (!birthDateStr) {
    return `<div class="kin-card">
      <h3 class="card-title"><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span> МОЙ КИН СУДЬБЫ</h3>
      <p style="color:var(--ink-faint);margin-bottom:12px;font-size:13px;line-height:1.5">У каждого человека есть свой Кин Судьбы — энергия дня рождения в цикле Цолькин. Он определяет вашу печать, тон и крест судьбы. Укажите дату рождения.</p>
      ${birthInputForm()}
    </div>`;
  }

  const birthD = storedBirthDate();
  const bKin = dreamspellKin(birthD);
  const { tone: bTone, seal: bSeal } = kinToToneSeal(bKin);
  const bInfo = kinsData[String(bKin)];
  const bSealInfo = sealsData[bSeal];
  const bToneInfo = tonesData[bTone];
  const bColor = sealColor(bSeal);
  const bWave = wavespell(bKin);
  const bCastle = castle(bKin);
  const bOracle = oracle(bKin);
  const bGap = isGap(bKin);

  // Today's info
  const todayKin = dreamspellKin(currentDate);
  const { tone: tTone, seal: tSeal } = kinToToneSeal(todayKin);
  const tWave = wavespell(todayKin);
  const tCastle = castle(todayKin);
  const tOracle = oracle(todayKin);

  // Find connections
  const connections = [];

  if (bKin === todayKin) {
    connections.push({ icon: '✨', text: 'Совпадение кинов! Ваш личный день Кина.' });
  }
  if (bSeal === tSeal) {
    connections.push({ icon: '🎭', text: `Одна Печать — ${bSealInfo.name_ru}. Энергии совпадают.` });
  }
  if (bTone === tTone) {
    connections.push({ icon: '🎵', text: `Один Тон — ${bToneInfo.name_ru}. Резонанс ритма.` });
  }
  if (bWave === tWave) {
    const tPos = (todayKin - 1) % 13 + 1;
    const wFirstSeal = kinToToneSeal((bWave - 1) * 13 + 1).seal;
    connections.push({ icon: '🌀', text: `Ваша Волна — ${sealsData[wFirstSeal].name_ru} (день ${tPos} из 13). Вся волна резонирует с вашим Кином.` });
  }
  // Today's wave is led by the same seal as an oracle kin
  const tWaveLeaderSeal = kinToToneSeal((tWave - 1) * 13 + 1).seal;
  const oracleWaveChecks = [
    { kin: bOracle.guide,    label: 'Управителя' },
    { kin: bOracle.analog,   label: 'Аналога' },
    { kin: bOracle.antipode, label: 'Антипода' },
    { kin: bOracle.hidden,   label: 'Оккультного Учителя' },
  ];
  for (const ow of oracleWaveChecks) {
    const owSeal = kinToToneSeal(ow.kin).seal;
    if (tWaveLeaderSeal === owSeal && tWave !== bWave && owSeal !== bSeal) {
      connections.push({ icon: '🌀', text: `Волна ${sealsData[owSeal].name_ru} — волна вашего ${ow.label}.` });
      break;
    }
  }
  // Today's wave is led by the user's birth seal
  const tWaveFirstSeal = kinToToneSeal((tWave - 1) * 13 + 1).seal;
  if (tWaveFirstSeal === bSeal && bWave !== tWave) {
    connections.push({ icon: '🌀', text: `Сейчас Волна ${bSealInfo.name_ru} — волна вашей Печати.` });
  }
  if (bCastle === tCastle) {
    connections.push({ icon: '🏰', text: `Один Замок — ${CASTLE_NAMES[bCastle]?.split(' ')[0]}. Общий 52-дневный цикл.` });
  }
  // Oracle relationships — exact kin match
  if (todayKin === bOracle.guide || bKin === tOracle.guide) {
    connections.push({ icon: '↑', text: 'Связь Управителя — направляющая энергия.' });
  }
  if (todayKin === bOracle.analog || bKin === tOracle.analog) {
    connections.push({ icon: '→', text: 'Связь Аналога — поддержка и дополнение.' });
  }
  if (todayKin === bOracle.antipode || bKin === tOracle.antipode) {
    connections.push({ icon: '←', text: 'Связь Антипода — вызов для роста.' });
  }
  if (todayKin === bOracle.hidden || bKin === tOracle.hidden) {
    connections.push({ icon: '↓', text: 'Связь Оккультного учителя — скрытая сила.' });
  }

  if (connections.length === 0) {
    connections.push({ icon: '·', text: 'Прямых связей с этим днём не найдено.' });
  }

  return `<div class="kin-card">
    <h3 class="card-title" style="font-size:11px"><span class="dot" style="background:var(--n-cyan);box-shadow:0 0 8px var(--n-cyan)"></span> СВЯЗЬ С ДНЁМ · КИН ${todayKin}</h3>
    <div class="spread" style="margin-bottom:8px">
      <span class="display c-cyan" style="font-size:13px">${formatDateRu(currentDate).toUpperCase()}</span>
      <span class="eyebrow muted">${kinsData[String(todayKin)]?.title || ''}</span>
    </div>
    <div class="connection-list">
      ${connections.map(c => `<div class="connection-item"><span class="connection-icon">${c.icon}</span><span class="connection-text">${c.text}</span></div>`).join('')}
    </div>
    <p class="section-intro" style="margin-top:12px;border:none;padding:0">Стрелки ◀ ▶ и свайп листают к ближайшим дням, резонирующим с вашим Кином.</p>
  </div>
  <div class="kin-card">
    <h3 class="card-title"><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span> МОЙ КИН</h3>
    <div style="text-align:center;margin-bottom:14px">
      <div style="margin-bottom:6px">${toneImg(bTone, 32)}</div>
      <div class="seal-badge ${bColor} c-${bColor}" style="width:80px;height:80px;margin:0 auto 8px">
        ${sealImg(bSeal, 68, true)}
      </div>
      <div class="kin-num c-${bColor}" style="font-size:36px">${bKin}${bGap ? '<span class="gap-badge gap-info-btn" data-action="gap-info">ГАП</span>' : ''}</div>
      <div class="display" style="font-size:14px;margin-top:6px">${bInfo?.title || ''}</div>
      <div class="eyebrow muted" style="margin-top:4px">${formatDateRu(birthD).toUpperCase()}</div>
    </div>
    ${bGap ? `<div class="gap-personal-note">
      <span class="gap-badge" style="font-size:11px;vertical-align:middle;margin-right:6px">ГАП</span>
      Ваш Кин Судьбы — <b>Портал Галактической Активации</b>. Это один из 52 особых кинов в сетке Цолькина, образующих паттерн двойной спирали. Люди с ГАП-кином острее чувствуют энергетические перепады, чаще оказываются в нужном месте в нужное время и живут в режиме повышенной синхронности. <span class="gap-info-btn" data-action="gap-info" style="cursor:pointer;color:var(--n-cyan);font-family:var(--font-mono);font-size:11px">Подробнее →</span>
    </div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--hairline-2);border-radius:12px;padding:10px">
        <div class="eyebrow">ПЕЧАТЬ</div>
        <div class="display" style="font-size:11px;margin-top:4px">${sealImg(bSeal, 16)} ${bSealInfo.name_ru}</div>
      </div>
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--hairline-2);border-radius:12px;padding:10px">
        <div class="eyebrow">ТОН</div>
        <div class="display" style="font-size:11px;margin-top:4px">${toneImg(bTone, 14)} ${bTone} ${bToneInfo.name_ru}</div>
      </div>
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--hairline-2);border-radius:12px;padding:10px">
        <div class="eyebrow">ВОЛНА</div>
        <div class="display" style="font-size:11px;margin-top:4px">${bWave}</div>
      </div>
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--hairline-2);border-radius:12px;padding:10px">
        <div class="eyebrow">ЗАМОК</div>
        <div class="display" style="font-size:11px;margin-top:4px">${CASTLE_NAMES[bCastle]?.split(' ')[0] || bCastle}</div>
      </div>
    </div>
  </div>
  ${isPro() ? `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-${bColor});box-shadow:0 0 8px var(--n-${bColor})"></span>
      ПЕЧАТЬ — ${sealImg(bSeal, 20)} ${bSealInfo.name_ru}</h3>
    <div class="pp-props">▸ СУТЬ: ${bSealInfo.essence_ru}<br>▸ СИЛА: ${bSealInfo.power_ru}<br>▸ ДЕЙСТВИЕ: ${bSealInfo.action_ru}</div>
    ${bSealInfo.description_ru ? `<p class="pp-main">${bSealInfo.description_ru}</p>` : ''}
  </div>
  <div class="detail-section">
    <h3><span class="dot" style="background:var(--n-cyan);box-shadow:0 0 8px var(--n-cyan)"></span>
      ТОН ${bTone} — ${toneImg(bTone, 20)} ${bToneInfo.name_ru}</h3>
    <div class="pp-props">${[bToneInfo.function_ru ? `▸ ФУНКЦИЯ: ${bToneInfo.function_ru}` : '', bToneInfo.creative_power_ru ? `▸ ТВОРЧЕСКАЯ СИЛА: ${bToneInfo.creative_power_ru}` : '', bToneInfo.action_ru ? `▸ ДЕЙСТВИЕ: ${bToneInfo.action_ru}` : ''].filter(Boolean).join('<br>')}</div>
    ${bToneInfo.description_ru ? `<p class="pp-main">${bToneInfo.description_ru}</p>` : ''}
  </div>` : ''}
  <div class="kin-card">
    <h3 class="card-title" style="font-size:11px"><span class="dot" style="background:var(--n-red);box-shadow:0 0 8px var(--n-red)"></span> КРЕСТ СУДЬБЫ</h3>
    <p class="section-intro" style="margin-bottom:8px">Четыре энергии вашего Кина. Нажмите на элемент для подробностей.</p>
    <div class="oracle-cross" style="margin:0 0 14px;gap:6px">
      ${(() => {
        function mcell(k, role, area) {
          const { tone: t, seal: s } = kinToToneSeal(k);
          const c = sealColor(s);
          const isBig = area === 'main';
          return '<div class="oracle-cell c-' + c + (isBig ? ' main' : '') + '" style="grid-area:' + area + ';padding:8px 2px" data-popup-kin="' + k + '" data-popup-area="' + area + '"><div class="role">' + role + '</div><div style="margin:2px 0">' + toneImg(t, isBig ? 16 : 12) + '</div><div class="seal-icon">' + sealImg(s, isBig ? 36 : 24, true) + '</div><div class="kin-num-cell" style="font-size:' + (isBig ? 15 : 12) + 'px">' + k + '</div></div>';
        }
        return mcell(bOracle.guide, 'УПРАВИТЕЛЬ', 'guide')
          + mcell(bOracle.antipode, 'АНТИПОД', 'anti')
          + mcell(bKin, 'МОЙ КИН', 'main')
          + mcell(bOracle.analog, 'АНАЛОГ', 'analog')
          + mcell(bOracle.hidden, 'ОККУЛЬТНЫЙ УЧИТЕЛЬ', 'hidden');
      })()}
    </div>
    ${isPro() ? `<div class="oracle-list">${(() => {
      const roles = [
        { key: 'guide', kin: bOracle.guide, name: 'Управитель', desc: 'Высшая направляющая сила.' },
        { key: 'analog', kin: bOracle.analog, name: 'Аналог', desc: 'Союзник и поддержка.' },
        { key: 'antipode', kin: bOracle.antipode, name: 'Антипод', desc: 'Вызов и рост.' },
        { key: 'hidden', kin: bOracle.hidden, name: 'Оккультный учитель', desc: 'Скрытая сила.' },
      ];
      return roles.map(r => {
        const { seal: rs } = kinToToneSeal(r.kin);
        const rsi = sealsData[rs];
        const rc = sealColor(rs);
        const rTitle = kinsData[String(r.kin)]?.title || '';
        return `<div class="oracle-row" data-popup-kin="${r.kin}" data-popup-area="${r.key}">
          <div class="oracle-seal-img c-${rc}">${sealImg(rs, 32, true)}</div>
          <div class="oracle-info">
            <div class="oracle-role">${r.name}</div>
            <div class="oracle-name">КИН ${r.kin} — ${rTitle}</div>
            <div style="font-size:11px;color:var(--ink-faint);margin-top:2px">${rsi.essence_ru} · ${rsi.power_ru}</div>
          </div></div>`;
      }).join('');
    })()}</div>` : ''}
  </div>
  <div style="display:flex;gap:8px;margin-bottom:12px">
    <button class="birth-nav-btn" id="personal-goto-kin" style="flex:1;padding:12px;border:1px solid var(--hairline);border-radius:12px;background:rgba(120,60,220,0.15);color:var(--ink);font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:0.1em;cursor:pointer">◉ ПОДРОБНЕЕ О КИНЕ ${bKin}</button>
    <button class="birth-clear-btn" id="birth-clear-btn" style="padding:12px 16px;border:1px solid var(--hairline);border-radius:12px;background:rgba(255,255,255,0.03);color:var(--ink-faint);font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer">СБРОСИТЬ</button>
  </div>`;
}

/* ── Classical Maya calendar (GMT-584283 correlation) ── */
function gregToJDN(date) {
  const Y = date.getFullYear(), M = date.getMonth() + 1, D = date.getDate();
  const a = Math.floor((14 - M) / 12);
  const y = Y + 4800 - a, m = M + 12 * a - 3;
  return D + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function classicMayaDate(date) {
  const jdn = gregToJDN(date);
  const dc = jdn - 584283; // days since Long Count 0.0.0.0.0 = 4 Ajaw 8 Kumk'u

  // Tzolk'in: creation = 4 Ajaw (sign 20, num 4)
  const tzolkinNum  = ((dc % 13) + 3 + 1300) % 13 + 1;
  const tzolkinSign = ((dc % 20) + 19 + 2000) % 20 + 1;

  // Haab: creation = 8 Kumk'u = position 348 in 365-day cycle
  const haabPos = ((dc + 348) % 365 + 365) % 365;
  const monthIdx   = haabPos < 360 ? Math.floor(haabPos / 20) : 18; // 0-17 = Pop..Kumk'u, 18 = Wayeb
  const dayInMonth = haabPos < 360 ? haabPos % 20 : haabPos - 360;  // 0-based

  // Long Count
  const baktun = Math.floor(dc / 144000);
  const r1 = dc % 144000;
  const katun = Math.floor(r1 / 7200);
  const r2 = r1 % 7200;
  const tun = Math.floor(r2 / 360);
  const r3 = r2 % 360;
  const winal = Math.floor(r3 / 20);
  const kin = r3 % 20;

  return { dc, tzolkinNum, tzolkinSign, monthIdx, dayInMonth, baktun, katun, tun, winal, kin };
}

function renderMayaClassic() {
  if (!mayaData) return '<div class="kin-card"><p>Загрузка данных…</p></div>';

  const md = classicMayaDate(currentDate);
  const signData  = mayaData.tzolkin.day_signs[md.tzolkinSign - 1];
  const numData   = mayaData.tzolkin.numbers.list[md.tzolkinNum - 1];
  const monthData = mayaData.haab.months[md.monthIdx];

  const longCount = `${md.baktun}.${md.katun}.${md.tun}.${md.winal}.${md.kin}`;

  const dirColor = { 'Восток': 'red', 'Север': 'cyan', 'Запад': 'blue', 'Юг': 'amber' };
  const color = dirColor[signData.direction] || 'cyan';

  let html = '';

  // ── Main card ──
  html += `<div class="kin-card">
    <div class="eyebrow" style="text-align:center;margin-bottom:10px;letter-spacing:0.18em">КЛАССИЧЕСКИЙ МАЙЯ · GMT 584283</div>
    <p class="section-intro" style="text-align:center;border:none;padding:0;margin:0 0 10px">Живой счёт К'иче'-майя Гватемалы. Непрерывная традиция, сохранённая с доколумбовых времён.</p>
    <div style="text-align:center;margin-bottom:8px"><span class="maya-num-hero c-${color}">${mayaDots(md.tzolkinNum)}</span></div>
    <div style="text-align:center"><div class="seal-badge ${color} c-${color}" style="width:84px;height:84px;margin-bottom:8px">${sealImg(md.tzolkinSign, 72, true)}</div></div>
    <div class="kin-title" style="font-size:22px;text-align:center;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">${signData.name_yucatec}</div>
    <div class="kin-subtitle" style="text-align:center;margin-bottom:12px">${signData.meaning_ru}</div>
    <div style="font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-dim)">
      <p>▸ К'ИЧЕ': ${md.tzolkinNum} ${signData.name_kiche}</p>
      <p>▸ НАХУАТЛЬ: ${md.tzolkinNum} ${signData.name_nahuatl}</p>
      <p>▸ КЛАССИЧЕСКОЕ: ${signData.name_classic_proto}</p>
    </div>
    <div class="maya-cal-tap" data-action="maya-lc-popup" style="font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-dim);margin-top:10px;cursor:pointer">
      <p>▸ ХААБ: ${md.dayInMonth} ${monthData.name} (${monthData.name_ru})</p>
      <p>▸ ДОЛГИЙ СЧЁТ: ${longCount} <span class="lc-hint">ⓘ</span></p>
      <p>▸ КРУГ КАЛЕНДАРЯ: ${md.tzolkinNum} ${signData.name_yucatec} ${md.dayInMonth} ${monthData.name}</p>
      <p class="maya-cal-tap-hint">нажмите — что такое длинный счёт и круг календаря</p>
    </div>
  </div>`;

  // In base mode the day-augury / medicine blocks sit right under the main
  // card (no legend exists in base) — keep them visible there too.
  if (!isPro()) return html + mayaDayProperties(md.tzolkinSign);

  // ── Sign block ──
  html += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-${color});box-shadow:0 0 8px var(--n-${color})"></span>
      ЗНАК ${md.tzolkinSign} · ${signData.name_yucatec}</h3>
    <div style="margin-top:12px;font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-dim)">
      <p>▸ СУТЬ: ${signData.meaning_ru}</p>
      <p>▸ НАПРАВЛЕНИЕ: ${signData.direction}</p>
      <p>▸ ЭЛЕМЕНТ: ${signData.element}</p>
      <p>▸ ПОКРОВИТЕЛЬ: ${signData.patron_deity}</p>
      <p>▸ ГЛИФ: ${signData.glyph_description}</p>
    </div>
    <p style="margin-top:10px">${signData.qualities_ru}</p>
    ${signData.notes_scholarly ? `<p style="font-size:11px;color:var(--ink-faint);margin-top:8px;font-style:italic">${signData.notes_scholarly}</p>` : ''}
  </div>`;

  // ── Legend from primary sources ──
  if (signData.legend_ru) html += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-${color});box-shadow:0 0 8px var(--n-${color})"></span>ЛЕГЕНДА · ${signData.name_yucatec}</h3>
    <p style="line-height:1.7">${signData.legend_ru}</p>
    ${signData.legend_source ? `<p style="font-size:10px;color:var(--ink-faint);margin-top:10px;font-style:italic;line-height:1.5">📖 ${signData.legend_source}</p>` : ''}
  </div>`;

  // ── Day augury + medicine — placed right after the legend (user request) ──
  html += mayaDayProperties(md.tzolkinSign);

  // ── Shadow ──
  if (signData.shadow_ru) html += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-amber);box-shadow:0 0 8px var(--n-amber)"></span>ТЕНЬ ЗНАКА</h3>
    <p>${signData.shadow_ru}</p>
  </div>`;

  // ── Number block ──
  html += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-cyan);box-shadow:0 0 8px var(--n-cyan)"></span>
      ЧИСЛО ${md.tzolkinNum} — ${numData.name_ru}</h3>
    <div style="margin-top:12px;font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-dim)">
      <p>▸ К'ИЧЕ': ${numData.name_kiche}</p>
      <p>▸ НАХУАТЛЬ: ${numData.name_nahuatl}</p>
      <p>▸ КАЧЕСТВО: ${numData.quality_ru}</p>
    </div>
  </div>`;

  // ── Haab month block ──
  html += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-amber);box-shadow:0 0 8px var(--n-amber)"></span>
      ХААБ: ${monthData.name} (${monthData.name_ru})</h3>
    <div style="margin-top:12px;font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-dim)">
      <p>▸ ДЕНЬ ${md.dayInMonth} ИЗ ${monthData.is_wayeb ? 4 : 19} В МЕСЯЦЕ</p>
      <p>▸ МЕСЯЦ ${md.monthIdx + 1} ИЗ 19</p>
      <p>▸ ЗНАЧЕНИЕ: ${monthData.meaning_ru}</p>
    </div>
    <p style="margin-top:10px">Хааб — 365-дневный гражданский год майя: 18 месяцев по 20 дней + 5-дневный Вайеб.</p>
  </div>`;

  // ── vs Dreamspell ──
  const dsKin = dreamspellKin(currentDate);
  const { tone: dsT, seal: dsS } = kinToToneSeal(dsKin);
  const dsSeal = sealsData[dsS];
  const dsTone = tonesData[dsT];
  // Both counts advance +1/day and wrap at 260, so their phase offset is a fixed
  // constant (44) — compute it instead of the old wrong, year-stamped "≈57 (2026)".
  const classicKin = kinFromToneSeal(md.tzolkinNum, md.tzolkinSign);
  const countShift = ((dsKin - classicKin) % 260 + 260) % 260;
  html += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span>VS ДРИМСПЕЛЛ</h3>
    <div style="margin-top:12px;font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-dim)">
      <p>▸ КЛАССИЧЕСКИЙ МАЙЯ: ${md.tzolkinNum} ${signData.name_yucatec}</p>
      <p>▸ ДРИМСПЕЛЛ: КИН ${dsKin} · ТОН ${dsT} ${dsTone.name_ru} · ${dsSeal.name_ru}</p>
      <p>▸ СДВИГ СЧЁТА: ${countShift} ДН. (ДРИМСПЕЛЛ ВПЕРЕДИ)</p>
    </div>
    <p style="font-size:11px;color:var(--ink-faint);margin-top:8px">Дримспелл (Х. Аргуэльес, 1992) — авторская New Age-интерпретация, не классический счёт. Живая традиция К'иче'-майя Гватемалы сохранила непрерывный счёт, совпадающий с корреляцией GMT.</p>
  </div>`;

  // Длинный счёт и астрономия больше не висят инлайном:
  //  · длинный счёт открывается попапом по тапу на блок Хааб/Долгий счёт/Круг (см. mayaLongCountPopupHtml);
  //  · астрономические корреляции переехали во вкладку СЕТКА·ЗНАКИ (см. mayaAstroHtml).
  return html;
}

/* Длинный счёт + круг календаря — содержимое попапа (тап на главной майя). */
function mayaLongCountPopupHtml(md) {
  const longCount = `${md.baktun}.${md.katun}.${md.tun}.${md.winal}.${md.kin}`;
  const signData = mayaData.tzolkin.day_signs[md.tzolkinSign - 1];
  const monthData = mayaData.haab.months[md.monthIdx];
  let html = `<div class="pp-props">▸ СЕГОДНЯ · ДЛИННЫЙ СЧЁТ: ${longCount}<br>▸ КРУГ КАЛЕНДАРЯ: ${md.tzolkinNum} ${signData.name_yucatec} ${md.dayInMonth} ${monthData.name}</div>
    <p class="pp-main">Длинный счёт — линейный счёт дней от даты Создания (11 авг. 3114 до н.э.). Позиционная запись похожа на наши числа, только в основе — система 20 (виджесимальная), с одним исключением: Виналь×18, чтобы приблизить Тун к солнечному году.</p>`;
  if (mayaData.long_count) {
    const lc = mayaData.long_count;
    const fmt = (n) => n >= 1e9 ? (n / 1e9).toFixed(2) + ' млрд' : n >= 1e6 ? (n / 1e6).toFixed(2) + ' млн' : n.toLocaleString('ru-RU');
    html += `<div class="maya-lc-table" style="margin:14px 0">`;
    for (const u of lc.units) {
      const highlight = ['K\'in','Tun','K\'atun','B\'ak\'tun'].includes(u.name);
      html += `<div class="maya-lc-row${highlight ? ' lc-highlight' : ''}">
        <span class="lc-name">${u.name}</span>
        <span class="lc-days">${fmt(u.days)} дн.</span>
        <span class="lc-years">${u.years_approx ? '≈' + (u.years_approx >= 1e6 ? (u.years_approx/1e6).toFixed(1)+'М' : u.years_approx >= 1000 ? Math.round(u.years_approx/1000)+'К' : u.years_approx) + ' лет' : '—'}</span>
        <span class="lc-note">${u.note}</span>
      </div>`;
    }
    const gc = lc.great_cycle;
    html += `</div>
    <div class="maya-great-cycle" style="margin-top:12px;padding:10px 12px;background:rgba(255,190,0,0.06);border-left:2px solid var(--n-amber);border-radius:4px">
      <div style="font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--n-amber)">▸ ВЕЛИКИЙ ЦИКЛ</div>
      <div style="font-family:var(--font-mono);font-size:13px;color:var(--ink-mid);margin-top:4px">13 Б'АКТ'УНОВ = 1 872 000 ДНЕЙ ≈ 5 125 ЛЕТ</div>
      <p style="margin-top:6px;font-size:13px">${gc.note}</p>
    </div>
    <p style="font-size:11px;color:var(--ink-faint);margin-top:8px">Единицы Пиктун и выше (7885+ лет) использовались в мифологических надписях — например, в Паленке, где рождение бога-покровителя записано за миллионы лет до наших дней.</p>`;
  }
  html += `<p class="pp-main" style="margin-top:14px"><b>Круг календаря (Calendar Round).</b> Сочетание дня Цолькина (260 дней) и даты Хааба (365 дней) повторяется лишь раз в 52 года — это «век» майя. Поэтому запись «число + знак + день месяца» однозначно задаёт день внутри 52-летнего цикла.</p>`;
  return html;
}

/* Астрономические корреляции — отдельный блок (живёт во вкладке СЕТКА·ЗНАКИ). */
function mayaAstroHtml() {
  if (!mayaData || !mayaData.astronomical_cycles) return '';
  const ac = mayaData.astronomical_cycles;
  const bodyIcons = { 'Венера': '♀', 'Марс': '♂', 'Луна': '☽', 'Юпитер и Сатурн': '♃', 'Солнце': '☉', 'Плеяды': '✦' };
  const bodyColors = { 'Венера': 'cyan', 'Марс': 'red', 'Луна': 'violet', 'Юпитер и Сатурн': 'amber', 'Солнце': 'amber', 'Плеяды': 'cyan' };
  let html = `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-cyan);box-shadow:0 0 8px var(--n-cyan)"></span>АСТРОНОМИЧЕСКИЕ КОРРЕЛЯЦИИ</h3>
    <p>${ac.description}</p>`;
  for (const cycle of ac.cycles) {
    const icon = bodyIcons[cycle.body] || '●';
    const c = bodyColors[cycle.body] || 'cyan';
    html += `<div style="margin-top:14px;padding:10px 12px;background:rgba(0,0,0,0.2);border-left:2px solid var(--n-${c});border-radius:4px">
        <div style="font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--n-${c})">${icon} ${cycle.body}</div>`;
    if (cycle.synodic_period_days || cycle.synodic_period_days_jupiter) {
      const period = cycle.synodic_period_days
        ? `синодический период: ${cycle.synodic_period_days} дн.${cycle.maya_approximation ? ' → майя: ' + cycle.maya_approximation + ' дн.' : ''}`
        : `Юпитер: ${cycle.synodic_period_days_jupiter} дн. · Сатурн: ${cycle.synodic_period_days_saturn} дн.`;
      html += `<div style="font-size:11px;color:var(--ink-faint);margin-top:3px">${period}</div>`;
    }
    html += `<ul style="margin:8px 0 0 0;padding-left:16px;font-size:13px;color:var(--ink-mid)">`;
    for (const cor of cycle.correlations) {
      html += `<li style="margin-bottom:4px">${cor}</li>`;
    }
    html += `</ul>`;
    if (cycle.codex_reference) {
      html += `<div style="font-size:11px;color:var(--ink-faint);margin-top:6px;font-style:italic">📖 ${cycle.codex_reference}</div>`;
    }
    if (cycle.note_ru) {
      html += `<p style="font-size:11px;color:var(--ink-faint);margin-top:6px">${cycle.note_ru}</p>`;
    }
    html += `</div>`;
  }
  html += `<div style="margin-top:12px;font-size:11px;color:var(--ink-faint);line-height:1.5">
      Источники: ${ac.sources.join(' · ')}
    </div>
  </div>`;
  return html;
}

/* ══ Authentic Maya renderers (Tzolk'in · Chol Q'ij) ══════════════════ */
const MAYA_DIR_COLOR = { 'Восток': 'red', 'Север': 'cyan', 'Запад': 'blue', 'Юг': 'amber' };
function mayaSignColor(s) { return MAYA_DIR_COLOR[s.direction] || 'cyan'; }

function mayaBrandHeader(sub) {
  return `<div class="maya-brand">
    <div class="maya-brand-title">TZOLK'IN · ЧОЛЬ-К'ИХ</div>
    <div class="maya-brand-sub">${sub || "подлинный календарь майя · живой счёт К'иче'"}</div>
  </div>`;
}

/* Full encyclopedic card for one of the 20 day-signs (independent of number). */
function mayaSignCardHtml(pos) {
  const s = mayaData.tzolkin.day_signs[pos - 1];
  const prof = mayaData.sign_profiles[String(pos)] || {};
  const med = prof.medicine || {};
  const color = mayaSignColor(s);
  let h = `<div class="kin-card">
    <div style="display:flex;gap:14px;align-items:center">
      <div class="seal-badge ${color} c-${color}" style="width:72px;height:72px;flex:0 0 auto">${sealImg(pos, 60, true)}</div>
      <div>
        <div class="kin-title" style="font-size:20px;text-transform:uppercase;letter-spacing:0.08em">${s.name_yucatec}</div>
        <div class="kin-subtitle">${s.meaning_ru}</div>
        <div class="eyebrow muted" style="margin-top:4px">ЗНАК ${pos} ИЗ 20</div>
      </div>
    </div>
    <div style="margin-top:12px;font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-dim)">
      <p>▸ К'ИЧЕ': ${s.name_kiche}</p>
      <p>▸ НАХУАТЛЬ: ${s.name_nahuatl}</p>
      <p>▸ КЛАССИЧЕСКОЕ: ${s.name_classic_proto}</p>
      <p>▸ НАПРАВЛЕНИЕ: ${s.direction} · СТИХИЯ: ${s.element}</p>
      <p>▸ ПОКРОВИТЕЛЬ: ${s.patron_deity}</p>
    </div>
  </div>`;
  h += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-${color});box-shadow:0 0 8px var(--n-${color})"></span>ГЛИФ</h3>
    <p>${s.glyph_description}</p>
    ${s.notes_scholarly ? `<p style="margin-top:8px">${s.notes_scholarly}</p>` : ''}
    <p style="font-size:10px;color:var(--ink-faint);margin-top:8px">Изображение — стилизованная печать; подлинный глиф Классического периода описан выше текстом.</p>
  </div>`;
  if (s.legend_ru) h += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-${color});box-shadow:0 0 8px var(--n-${color})"></span>ЛЕГЕНДА</h3>
    <p style="line-height:1.7">${s.legend_ru}</p>
    ${s.legend_source ? `<p style="font-size:10px;color:var(--ink-faint);margin-top:10px;font-style:italic;line-height:1.5">📖 ${s.legend_source}</p>` : ''}
  </div>`;
  if (prof.character_ru) h += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span>ХАРАКТЕР · НАВ'АЛЬ</h3>
    <p>${prof.character_ru}</p>
    ${s.qualities_ru ? `<p style="margin-top:8px"><b>Качества:</b> ${s.qualities_ru}</p>` : ''}
    <p style="font-size:10px;color:var(--ink-faint);margin-top:8px;font-style:italic">Толкование живой традиции дневальных К'иче' (Tedlock 1982; Johnson, Jaguar Wisdom).</p>
  </div>`;

  // Психологический профиль: светлые и теневые качества + совет
  const psy = prof.psychology;
  if (psy && (psy.light?.length || psy.shadow?.length)) {
    h += `<div class="detail-section">
      <h3><span class="dot" style="background:var(--n-cyan);box-shadow:0 0 8px var(--n-cyan)"></span>ПСИХОЛОГИЧЕСКИЙ ПРОФИЛЬ</h3>
      <p style="font-size:11px;color:var(--ink-faint);margin-bottom:10px">Как энергия нав'аля проявляется в характере человека, рождённого в этот день.</p>`;
    if (psy.light?.length) {
      h += `<div class="psy-block psy-light">
        <div class="psy-head">◇ Светлые качества</div>
        <ul class="psy-list">${psy.light.map(q => `<li>${q}</li>`).join('')}</ul>
      </div>`;
    }
    if (psy.shadow?.length) {
      h += `<div class="psy-block psy-shadow">
        <div class="psy-head">◆ Теневые качества</div>
        <ul class="psy-list">${psy.shadow.map(q => `<li>${q}</li>`).join('')}</ul>
      </div>`;
    }
    if (psy.advice) {
      h += `<div class="psy-advice">${psy.advice}</div>`;
    }
    h += `</div>`;
  }
  if (s.shadow_ru) h += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-amber);box-shadow:0 0 8px var(--n-amber)"></span>ТЕНЬ</h3>
    <p>${s.shadow_ru}</p>
  </div>`;
  if (med.body_system_ru) h += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-red);box-shadow:0 0 8px var(--n-red)"></span>МЕДИЦИНА</h3>
    <div style="font-family:var(--font-mono);font-size:13px;letter-spacing:0.04em;color:var(--ink-dim)">
      <p>▸ ТЕЛО/СИСТЕМА: ${med.body_system_ru}</p>
      <p>▸ ПО ЖИЗНИ: ${med.watch_life_ru}</p>
      <p>▸ В ДЕНЬ ЗНАКА: ${med.today_ru}</p>
      <p>▸ ЦЕЛИТЕЛЬСКИЙ ДАР: ${med.healer_gift_ru}</p>
    </div>
  </div>`;

  // Майянский Крест (Cruz Cósmica Maya) для этого знака
  const cruz = cruzMaya(pos);
  const cruzSigns = mayaData.tzolkin.day_signs;
  const topSign = cruzSigns[cruz.top_conception - 1];
  const bottomSign = cruzSigns[cruz.bottom_destiny - 1];
  const rightSign = cruzSigns[cruz.right_material - 1];
  const leftSign = cruzSigns[cruz.left_spiritual - 1];

  h += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span>МАЙЯНСКИЙ КРЕСТ · CRUZ CÓSMICA MAYA</h3>
    <div class="cruz-maya">
      <div class="cruz-cell top" data-cruz-pos="top" data-cruz-sign="${cruz.top_conception}">
        <div class="cruz-label">Зачатие</div>
        <div class="cruz-label" style="font-size:9px;color:var(--ink-dim)">Прошлое</div>
        ${sealImg(cruz.top_conception, 32)}
        <div class="cruz-nawal-name">${topSign.name_yucatec}</div>
        <div class="cruz-nawal-name" style="font-size:10px;color:var(--ink-faint)">${cruz.top_conception}</div>
      </div>
      <div class="cruz-cell center" data-cruz-pos="center" data-cruz-sign="${pos}">
        <div class="cruz-label cruz-center-label">Сердце</div>
        <div class="cruz-label cruz-center-label" style="font-size:9px">Суть</div>
        ${sealImg(pos, 44)}
        <div class="cruz-nawal-name">${s.name_yucatec}</div>
        <div class="cruz-nawal-name" style="font-size:10px;color:var(--ink-faint)">${pos}</div>
      </div>
      <div class="cruz-cell bottom" data-cruz-pos="bottom" data-cruz-sign="${cruz.bottom_destiny}">
        <div class="cruz-label">Судьба</div>
        <div class="cruz-label" style="font-size:9px;color:var(--ink-dim)">Зрелость</div>
        ${sealImg(cruz.bottom_destiny, 32)}
        <div class="cruz-nawal-name">${bottomSign.name_yucatec}</div>
        <div class="cruz-nawal-name" style="font-size:10px;color:var(--ink-faint)">${cruz.bottom_destiny}</div>
      </div>
      <div class="cruz-cell left" data-cruz-pos="left" data-cruz-sign="${cruz.left_spiritual}">
        <div class="cruz-label">Левая рука</div>
        <div class="cruz-label" style="font-size:9px;color:var(--ink-dim)">Дух</div>
        ${sealImg(cruz.left_spiritual, 32)}
        <div class="cruz-nawal-name">${leftSign.name_yucatec}</div>
        <div class="cruz-nawal-name" style="font-size:10px;color:var(--ink-faint)">${cruz.left_spiritual}</div>
      </div>
      <div class="cruz-cell right" data-cruz-pos="right" data-cruz-sign="${cruz.right_material}">
        <div class="cruz-label">Правая рука</div>
        <div class="cruz-label" style="font-size:9px;color:var(--ink-dim)">Материя</div>
        ${sealImg(cruz.right_material, 32)}
        <div class="cruz-nawal-name">${rightSign.name_yucatec}</div>
        <div class="cruz-nawal-name" style="font-size:10px;color:var(--ink-faint)">${cruz.right_material}</div>
      </div>
    </div>
    <div class="cruz-notice">⚠ Внимание: данный Майянский Крест рассчитан по аутентичной системе гватемальских жрецов (Aj Q'ij). Он отражает путь развития вашей души и не совпадает с популярными в интернете западными нью-эйдж-оракулами (Dreamspell).</div>
  </div>`;

  // Знак в мифах Попол-Вух: сначала пробуем сюжетные роли (myth_roles, текст
  // под конкретный знак), иначе откатываемся к общему превью эпизода.
  if (mayaData.popol_vuh_narrative) {
    const episodes = mayaData.popol_vuh_narrative.episodes;
    const roles = prof.myth_roles || [];
    let items;
    if (roles.length) {
      items = roles
        .filter(r => episodes[r.ep])
        .map(r => ({ i: r.ep, ep: episodes[r.ep], text: r.role }));
    } else {
      items = episodes
        .map((ep, i) => ({ i, ep }))
        .filter(({ ep }) => (ep.day_sign_refs || []).includes(pos))
        .map(o => ({ ...o, text: o.ep.text_ru.replace(/<[^>]+>/g, '').slice(0, 120).trimEnd() + '…' }));
    }
    if (items.length) {
      h += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-amber);box-shadow:0 0 8px var(--n-amber)"></span>ЗНАК В МИФАХ ПОПОЛЬ-ВУХ</h3>
    <p style="font-size:11px;color:var(--ink-faint);margin-bottom:10px">Сказания, в которых живёт энергия нав'аля ${s.name_yucatec}. Нажмите, чтобы прочитать полный текст.</p>`;
      for (const { i, ep, text } of items) {
        h += `<button class="maya-myth-ref" data-maya-open-tale="${i}">
      <div class="mmr-title">${ep.title_ru}</div>
      <div class="mmr-preview">${text}</div>
      <div class="mmr-source">${ep.source}</div>
    </button>`;
      }
      h += `</div>`;
    }
  }

  return h;
}

/* Свойства дня (благоприятно / с осторожностью) + медицина дня (можно / не стоит).
   Данные — distilled из живой традиции дневальных К'иче' (см. day_augury/medicine). */
function mayaDayProperties(pos) {
  const s = mayaData.tzolkin.day_signs[pos - 1];
  const prof = mayaData.sign_profiles[String(pos)] || {};
  const aug = prof.day_augury || {};
  const med = prof.medicine || {};
  const color = mayaSignColor(s);
  let h = '';
  if (aug.favorable || aug.caution) {
    h += `<div class="detail-section">
      <h3><span class="dot" style="background:var(--n-${color});box-shadow:0 0 8px var(--n-${color})"></span>СВОЙСТВА ДНЯ</h3>
      <p style="font-size:11px;color:var(--ink-faint);margin-bottom:8px">Энергия дня под знаком ${s.name_yucatec} — на что она настраивает.</p>`;
    if (aug.favorable) h += `<div class="day-prop good"><span class="dp-h">✓ Благоприятно</span><span class="dp-t">${aug.favorable}</span></div>`;
    if (aug.caution)   h += `<div class="day-prop care"><span class="dp-h">△ С осторожностью</span><span class="dp-t">${aug.caution}</span></div>`;
    h += `<p class="dp-note">Толкование по живой традиции дневальных К'иче' (Aj Q'ij; Tedlock; Johnson) — ориентир, а не предписание.</p>
    </div>`;
  }
  if (med.today_ru || med.avoid_ru) {
    h += `<div class="detail-section">
      <h3><span class="dot" style="background:var(--n-red);box-shadow:0 0 8px var(--n-red)"></span>МЕДИЦИНА ДНЯ</h3>`;
    if (med.today_ru) h += `<div class="day-prop good"><span class="dp-h">✓ Можно</span><span class="dp-t">${med.today_ru}</span></div>`;
    if (med.avoid_ru) h += `<div class="day-prop care"><span class="dp-h">△ Не стоит</span><span class="dp-t">${med.avoid_ru}</span></div>`;
    h += `<p class="dp-note">⚠ Народная традиция майя; не заменяет консультацию врача.</p>
    </div>`;
  }
  return h;
}

function renderMayaToday() {
  if (!mayaData) return '<div class="kin-card"><p>Загрузка данных…</p></div>';
  const md = classicMayaDate(currentDate);
  const s = mayaData.tzolkin.day_signs[md.tzolkinSign - 1];
  return mayaBrandHeader()
    + `<div class="kin-card" style="padding:10px 12px"><p class="section-intro" style="border:none;padding:0;margin:0">Знак сегодняшнего дня на языке К'иче' — это <b>нав'аль</b> (nawal), дух-покровитель дня. Ниже — число, печать, Хааб и Длинный счёт.</p></div>`
    + renderMayaClassic() // свойства/медицина дня теперь внутри, сразу после легенды
    + `<button class="maya-fullcard-btn" data-maya-sign="${md.tzolkinSign}">◉ ПОЛНАЯ КАРТОЧКА ЗНАКА — ${s.name_yucatec}</button>`;
}

function renderMayaPersonal() {
  if (!mayaData) return '<div class="kin-card"><p>Загрузка данных…</p></div>';
  const birthDateStr = localStorage.getItem('birthDate');
  if (!birthDateStr) {
    return mayaBrandHeader('мой нав\'аль')
      + `<div class="kin-card">
      <h3 class="card-title"><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span> МОЙ НАВ'АЛЬ</h3>
      <p style="color:var(--ink-faint);margin-bottom:12px;font-size:13px;line-height:1.5">В традиции К'иче' знак вашего дня рождения называется <b>нав'аль (nawal)</b> — личный дух-покровитель, определяющий характер и судьбу. Укажите дату рождения, чтобы вычислить его по живому счёту майя (корреляция GMT-584283).</p>
      ${birthInputForm()}
    </div>`;
  }
  const birthD = storedBirthDate();
  const md = classicMayaDate(birthD);
  const s = mayaData.tzolkin.day_signs[md.tzolkinSign - 1];
  const numData = mayaData.tzolkin.numbers.list[md.tzolkinNum - 1];
  const monthData = mayaData.haab.months[md.monthIdx];
  const color = mayaSignColor(s);
  const longCount = `${md.baktun}.${md.katun}.${md.tun}.${md.winal}.${md.kin}`;
  let h = mayaBrandHeader('мой нав\'аль');
  h += `<div class="kin-card">
    <div class="eyebrow" style="text-align:center;letter-spacing:0.18em;margin-bottom:8px">МОЙ НАВ'АЛЬ · ${formatDateRu(birthD).toUpperCase()}</div>
    <div style="text-align:center;margin-bottom:8px"><span class="maya-num-hero c-${color}">${mayaDots(md.tzolkinNum)}</span></div>
    <div style="text-align:center"><div class="seal-badge ${color} c-${color}" style="width:84px;height:84px;margin-bottom:8px">${sealImg(md.tzolkinSign, 72, true)}</div></div>
    <div class="kin-title" style="font-size:22px;text-align:center;text-transform:uppercase;letter-spacing:0.1em">${s.name_yucatec}</div>
    <div class="kin-subtitle" style="text-align:center;margin-bottom:10px">${s.meaning_ru}</div>
    <div style="font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-dim)">
      <p>▸ К'ИЧЕ': ${md.tzolkinNum} ${s.name_kiche} (${numData.name_kiche})</p>
      <p>▸ НАХУАТЛЬ: ${md.tzolkinNum} ${s.name_nahuatl}</p>
      <p>▸ ХААБ РОЖДЕНИЯ: ${md.dayInMonth} ${monthData.name} (${monthData.name_ru})</p>
      <p>▸ ДЛИННЫЙ СЧЁТ: ${longCount}</p>
      <p>▸ КРУГ КАЛЕНДАРЯ: ${md.tzolkinNum} ${s.name_yucatec} ${md.dayInMonth} ${monthData.name}</p>
    </div>
    <p class="section-intro" style="margin-top:10px;border:none;padding:0">Нав'аль — знак дня рождения по непрерывному счёту К'иче' (не по Дримспелл). Полная карточка ниже.</p>
  </div>`;
  h += mayaSignCardHtml(md.tzolkinSign);
  h += `<button class="birth-clear-btn" id="birth-clear-btn" style="width:100%;margin-top:4px;padding:12px;border:1px solid var(--hairline);border-radius:12px;background:rgba(255,255,255,0.03);color:var(--ink-faint);font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer">СБРОСИТЬ ДАТУ РОЖДЕНИЯ</button>`;
  return h;
}

function renderMayaGrid() {
  if (!mayaData) return '<div class="kin-card"><p>Загрузка данных…</p></div>';

  // Sign card view (when a sign is selected from catalog or grid)
  if (mayaSelectedSign) {
    return mayaBrandHeader('20 знаков · карточка')
      + mayaSignCardHtml(mayaSelectedSign);
  }

  // Calendar centred on the SELECTED day instead of an old round-start: rows are
  // trecenas (numbers 1–13 across the columns), today's row sits in the middle,
  // and the arrows page into the past/future. Starting the window on a number-1
  // day keeps the column = trecena-number alignment intact.
  const ROWS = 21;                                    // 273 days shown, today centred
  const center = addDays(currentDate, mayaGridOffset);
  const centerNum = classicMayaDate(center).tzolkinNum;          // 1..13
  const centerTrecenaStart = addDays(center, -(centerNum - 1));  // back to the day with number 1
  const startDate = addDays(centerTrecenaStart, -13 * Math.floor(ROWS / 2));
  const total = 13 * ROWS;

  let bSign = null;
  const birthDateStr = localStorage.getItem('birthDate');
  if (birthDateStr) bSign = classicMayaDate(storedBirthDate());
  const curKey = dateKey(currentDate);

  let h = mayaBrandHeader('круг Чоль-К\'их · навигатор')
    + `<div class="kin-card" style="padding:10px">
      <h3 class="card-title" style="font-size:12px"><span class="dot"></span> ЧОЛЬ-К'ИХ · КАЛЕНДАРЬ ДНЕЙ</h3>
      <p class="section-intro" style="border:none;padding:0;margin:0 0 8px">Дни идут сверху вниз, числа 1–13 — по столбцам. Сегодня — в рамке${bSign ? ", нав'аль рождения — пунктиром" : ''}. Нажмите день, чтобы перейти к нему; стрелками листайте в прошлое и будущее.</p>
      <div class="maya-grid-nav">
        <button class="mgn-btn" data-maya-grid="-91">◀ РАНЬШЕ</button>
        <button class="mgn-btn mgn-now" data-maya-grid="now">⊙ К СЕГОДНЯ</button>
        <button class="mgn-btn" data-maya-grid="91">ПОЗЖЕ ▶</button>
      </div>
      <div class="maya-grid-range">${formatDateRu(startDate)} — ${formatDateRu(addDays(startDate, total - 1))}</div>
    </div>`;
  h += `<div class="maya-grid-wrap"><div class="maya-grid">`;
  for (let n = 0; n < total; n++) {
    const dd = addDays(startDate, n);
    const md = classicMayaDate(dd);
    const s = mayaData.tzolkin.day_signs[md.tzolkinSign - 1];
    const color = mayaSignColor(s);
    const isToday = dateKey(dd) === curKey;
    const isBirth = bSign && md.tzolkinSign === bSign.tzolkinSign && md.tzolkinNum === bSign.tzolkinNum;
    h += `<button class="maya-grid-cell color-${color}${isToday ? ' current' : ''}${isBirth ? ' birth' : ''}" data-maya-date="${dateKey(dd)}" title="${md.tzolkinNum} ${s.name_yucatec} — ${dd.getDate()} ${MONTHS_RU[dd.getMonth()]} ${dd.getFullYear()}">${sealImg(md.tzolkinSign, 18)}<span class="mg-num">${md.tzolkinNum}</span></button>`;
  }
  h += `</div></div>`;

  // ── Catalog section below the grid ──
  h += `<div class="kin-card" style="padding:10px;margin-top:8px"><p class="section-intro" style="border:none;padding:0;margin:0">Двадцать нав'алей (печатей) — основа Цолькина. Нажмите на знак, чтобы открыть полную карточку: глиф, бог, легенда, характер, тень, медицина.</p></div>`;
  h += `<div class="maya-catalog-grid">`;
  for (let pos = 1; pos <= 20; pos++) {
    const s = mayaData.tzolkin.day_signs[pos - 1];
    const color = mayaSignColor(s);
    h += `<button class="maya-cat-cell color-${color}" data-maya-sign="${pos}">${sealImg(pos, 38)}<span class="mc-name">${s.name_yucatec}</span><span class="mc-pos">${pos}</span></button>`;
  }
  h += `</div>`;
  h += `<div class="detail-section"><h3><span class="dot" style="background:var(--n-cyan);box-shadow:0 0 8px var(--n-cyan)"></span>13 ЧИСЕЛ (ТРЕЦЕНА)</h3>`;
  const numbers = mayaData.tzolkin.numbers.list;
  for (let i = 1; i <= 13; i++) {
    const n = numbers[i - 1];
    const long = mayaData.numbers_long[String(i)] || '';
    h += `<div class="maya-num-row"><div class="maya-num-dots">${mayaDots(i)}<span class="mnr-num">${i}</span></div><div class="maya-num-text"><b>${n.name_kiche}</b> — ${long}</div></div>`;
  }
  h += `</div>`;

  // Астрономические корреляции — логичный дом рядом со структурой календаря.
  h += mayaAstroHtml();

  return h;
}

function renderMayaTales() {
  if (!mayaData || !mayaData.popol_vuh_narrative) return '<div class="kin-card"><p>Загрузка данных…</p></div>';
  const pv = mayaData.popol_vuh_narrative;
  if (mayaTaleOpen !== null && pv.episodes[mayaTaleOpen]) {
    const e = pv.episodes[mayaTaleOpen];
    let h = mayaBrandHeader('сказания · Пополь-Вух')
      + `<div class="kin-card"><h3 class="card-title"><span class="dot" style="background:var(--n-amber);box-shadow:0 0 8px var(--n-amber)"></span> ${e.title_ru.toUpperCase()}</h3><p style="line-height:1.75;margin-top:8px">${e.text_ru}</p>`;
    if (e.day_sign_refs && e.day_sign_refs.length) {
      h += `<div class="maya-tale-refs"><div class="eyebrow" style="margin-bottom:6px">ЗНАКИ ЭТОГО СКАЗАНИЯ</div><div class="mtr-row">`;
      for (const r of e.day_sign_refs) {
        const s = mayaData.tzolkin.day_signs[r - 1];
        h += `<button class="mtr-chip" data-maya-sign="${r}">${sealImg(r, 24)}<span>${s.name_yucatec}</span></button>`;
      }
      h += `</div></div>`;
    }
    h += `<p style="font-size:10px;color:var(--ink-faint);margin-top:10px;font-style:italic">📖 ${e.source}</p></div>`;
    return h;
  }
  let h = mayaBrandHeader('сказания · Пополь-Вух')
    + `<div class="kin-card"><h3 class="card-title"><span class="dot" style="background:var(--n-amber);box-shadow:0 0 8px var(--n-amber)"></span> ${pv.title.toUpperCase()}</h3><p style="line-height:1.6;margin-top:6px">${pv.intro}</p><p style="font-size:10px;color:var(--ink-faint);margin-top:8px;font-style:italic">📖 ${pv.source}</p></div>`;
  h += `<div class="maya-tales-list">`;
  pv.episodes.forEach((e, i) => {
    h += `<button class="maya-tale-item" data-maya-tale="${i}"><span class="mti-n">${i + 1}</span><span class="mti-t">${e.title_ru}</span><span class="mti-arrow">→</span></button>`;
  });
  h += `</div>`;
  return h;
}

/* ── Майянский Крест (Cruz Cósmica Maya) — аутентичная система киче ── */
function cruzMaya(nawalIndex) {
  const calc = (offset) => ((nawalIndex - 1 + offset + 40) % 20) + 1;
  return {
    center: nawalIndex,
    top_conception: calc(-8),    // 9 знаков назад (инклюзивно)
    bottom_destiny: calc(8),      // 9 знаков вперёд (инклюзивно)
    right_material: calc(-6),     // 7 знаков назад (инклюзивно)
    left_spiritual: calc(6)       // 7 знаков вперёд (инклюзивно)
  };
}

/* Значение каждого места в Майянском Кресте — общая трактовка по традиции
   жрецов К'иче' (Aj Q'ij), без персональных «предсказаний». */
const CRUZ_POS = {
  top:    { title: "ЗАЧАТИЕ · ПРОШЛОЕ", caption: "верхний знак · зачатие, прошлое",
            text: "Нав'аль зачатия — корни рода и то, что человек приносит из прошлого: наследие предков, врождённые задатки и уроки, начатые ещё до рождения. Это опора, на которую опирается вся судьба." },
  bottom: { title: "СУДЬБА · БУДУЩЕЕ", caption: "нижний знак · судьба, зрелость",
            text: "Нав'аль судьбы и зрелости — куда ведёт жизненный путь, какие плоды человек призван принести к зрелым годам и в чём раскрывается предназначение." },
  right:  { title: "ПРАВАЯ РУКА · МАТЕРИЯ", caption: "правый знак · материя, дело",
            text: "Материальная сторона жизни: труд, дело, тело, деньги и практические действия — деятельная, мужская энергия, через которую замыслы воплощаются в мире." },
  left:   { title: "ЛЕВАЯ РУКА · ДУХ", caption: "левый знак · дух, интуиция",
            text: "Духовная сторона жизни: интуиция, сны, связь с предками и сакральным — воспринимающая, женская энергия, питающая внутреннюю жизнь." },
  center: { title: "СЕРДЦЕ · СУТЬ", caption: "центр креста · ваша суть",
            text: "Главный нав'аль — сердцевина характера и судьбы, вокруг которой собираются остальные четыре направления креста." }
};

/* Попап о значении места в кресте + нав'аль, который там стоит. */
function showCruzPopup(posKey, signPos) {
  const p = CRUZ_POS[posKey];
  if (!p) return;
  const s = mayaData.tzolkin.day_signs[signPos - 1];
  const color = mayaSignColor(s);
  const body = `<div style="text-align:center;margin-bottom:10px">
      <div class="seal-badge ${color} c-${color}" style="width:60px;height:60px;margin:0 auto 6px">${sealImg(signPos, 48, true)}</div>
      <div class="kin-title" style="font-size:18px;text-transform:uppercase;letter-spacing:0.08em">${s.name_yucatec}</div>
      <div class="eyebrow muted" style="margin-top:2px">${p.caption}</div>
    </div>
    <p class="pp-main">${p.text}</p>
    <p class="pp-main" style="margin-top:10px"><b>Здесь стоит нав'аль ${s.name_yucatec}</b> — ${s.meaning_ru}.${s.qualities_ru ? ' ' + s.qualities_ru : ''}</p>
    <p style="font-size:11px;color:var(--ink-faint);margin-top:10px">Это общее значение места в кресте по живой традиции жрецов К'иче' (Aj Q'ij), а не персональное предсказание.</p>
    <button class="popup-goto-btn" data-cruz-goto="${signPos}">ОТКРЫТЬ КАРТОЧКУ ЗНАКА →</button>`;
  showInfoPopup(p.title, body);
  const btn = document.querySelector('#kin-popup-content [data-cruz-goto]');
  if (btn) btn.addEventListener('click', () => {
    haptic('selection');
    closeKinPopup();
    pushNav();
    openMayaSign(signPos);
  });
}

function renderMayaMedicine() {
  if (!mayaData || !mayaData.medicine_intro) return '<div class="kin-card"><p>Загрузка данных…</p></div>';
  const mi = mayaData.medicine_intro;
  const todayMd = classicMayaDate(currentDate);
  const todayS = mayaData.tzolkin.day_signs[todayMd.tzolkinSign - 1];
  const todayMed = (mayaData.sign_profiles[String(todayMd.tzolkinSign)] || {}).medicine || {};
  let h = mayaBrandHeader('медицина майя');
  // СЕГОДНЯ — практическое толкование дня подняли наверх (по просьбе).
  const tc = mayaSignColor(todayS);
  h += `<div class="detail-section"><h3><span class="dot" style="background:var(--n-${tc});box-shadow:0 0 8px var(--n-${tc})"></span>СЕГОДНЯ · ${todayMd.tzolkinNum} ${todayS.name_yucatec}</h3>
    <div style="display:flex;gap:10px;align-items:center;margin:8px 0">${sealImg(todayMd.tzolkinSign, 40)}<div class="eyebrow muted">${formatDateRu(currentDate).toUpperCase()}</div></div>
    <div style="font-family:var(--font-mono);font-size:13px;letter-spacing:0.04em;color:var(--ink-dim)">
      <p>▸ ТЕЛО/СИСТЕМА: ${todayMed.body_system_ru || '—'}</p>
      <p>▸ БЛАГОПРИЯТНО: ${todayMed.today_ru || '—'}</p>
    </div></div>`;
  // ПО ЖИЗНИ — сразу под сегодняшним днём.
  const birthDateStr = localStorage.getItem('birthDate');
  if (birthDateStr) {
    const bMd = classicMayaDate(storedBirthDate());
    const bS = mayaData.tzolkin.day_signs[bMd.tzolkinSign - 1];
    const bMed = (mayaData.sign_profiles[String(bMd.tzolkinSign)] || {}).medicine || {};
    const bc = mayaSignColor(bS);
    h += `<div class="detail-section"><h3><span class="dot" style="background:var(--n-${bc});box-shadow:0 0 8px var(--n-${bc})"></span>ПО ЖИЗНИ · НАВ'АЛЬ ${bS.name_yucatec}</h3>
      <div style="display:flex;gap:10px;align-items:center;margin:8px 0">${sealImg(bMd.tzolkinSign, 40)}<div class="eyebrow muted">знак рождения · на что обращать внимание по жизни</div></div>
      <div style="font-family:var(--font-mono);font-size:13px;letter-spacing:0.04em;color:var(--ink-dim)">
        <p>▸ ТЕЛО/СИСТЕМА: ${bMed.body_system_ru || '—'}</p>
        <p>▸ ВНИМАНИЕ: ${bMed.watch_life_ru || '—'}</p>
        <p>▸ ВАШ ДАР: ${bMed.healer_gift_ru || '—'}</p>
      </div></div>`;
  } else {
    h += `<div class="detail-section"><h3><span class="dot"></span>ПО ЖИЗНИ</h3><p style="color:var(--ink-faint)">Укажите дату рождения во вкладке «МОЙ», чтобы увидеть телесные соответствия вашего нав'аля.</p></div>`;
  }
  // Общий рассказ о медицине майя (Иш-Чель и т.д.) — ниже практических блоков.
  h += `<div class="kin-card"><h3 class="card-title"><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span> ${mi.title.toUpperCase()}</h3>
    <p style="line-height:1.65;margin-top:8px"><b>Иш-Чель.</b> ${mi.ix_chel}</p>
    <p style="line-height:1.65;margin-top:8px"><b>Целители.</b> ${mi.healers}</p>
    <p style="line-height:1.65;margin-top:8px"><b>Тело-календарь.</b> ${mi.body_map}</p>
    <p style="line-height:1.6;margin-top:8px;color:var(--ink-dim)">${mi.usage}</p></div>`;
  h += `<div class="detail-section"><h3><span class="dot"></span>ИСТОЧНИКИ</h3>
    <div style="font-size:10px;color:var(--ink-faint);line-height:1.5">${mi.sources.join('<br>')}</div>
    <p style="font-size:11px;color:var(--n-amber);margin-top:10px;line-height:1.5">⚠ ${mi.disclaimer}</p></div>`;
  return h;
}

function bindMayaEvents() {
  const card = document.getElementById('card');
  // Open sign card from catalog grid, cross, or tale refs
  card.querySelectorAll('[data-maya-sign]').forEach(el => {
    el.addEventListener('click', () => { haptic('selection'); pushNav(); openMayaSign(+el.dataset.mayaSign); });
  });
  // Крест судьбы: тап по месту → попап о значении этого места (без галлюцинаций)
  card.querySelectorAll('[data-cruz-pos]').forEach(el => {
    el.addEventListener('click', () => { haptic('selection'); showCruzPopup(el.dataset.cruzPos, +el.dataset.cruzSign); });
  });
  card.querySelectorAll('[data-maya-date]').forEach(el => {
    el.addEventListener('click', () => {
      haptic('selection');
      const d = parseInputDate(el.dataset.mayaDate);
      if (d) {
        // Tapping a day in the Чоль-К'их grid jumps straight to that sign's full
        // card (the short "today" view was redundant). currentDate is set so
        // date-dependent sections (медицина «сегодня») reflect the chosen day.
        pushNav();
        currentDate = d;
        openMayaSign(classicMayaDate(d).tzolkinSign);
      }
    });
  });
  card.querySelectorAll('[data-maya-tale]').forEach(el => {
    el.addEventListener('click', () => { haptic('selection'); pushNav(); mayaTaleOpen = +el.dataset.mayaTale; render(); window.scrollTo({ top: 0 }); });
  });
  // Open a tale from a sign card and navigate to the tales tab
  card.querySelectorAll('[data-maya-open-tale]').forEach(el => {
    el.addEventListener('click', () => {
      haptic('selection');
      pushNav();
      mayaTaleOpen = +el.dataset.mayaOpenTale;
      mayaSelectedSign = null;
      currentTab = 'maya-tales';
      renderTabs();
      render();
      window.scrollTo({ top: 0 });
    });
  });
  // Тап на блок Хааб/Долгий счёт/Круг → попап с длинным счётом и кругом календаря
  card.querySelectorAll('[data-action="maya-lc-popup"]').forEach(el => {
    el.addEventListener('click', () => {
      haptic('selection');
      showInfoPopup('ДЛИННЫЙ СЧЁТ · КРУГ КАЛЕНДАРЯ', mayaLongCountPopupHtml(classicMayaDate(currentDate)));
    });
  });
  // Чоль-К'их grid paging arrows
  card.querySelectorAll('[data-maya-grid]').forEach(el => {
    el.addEventListener('click', () => {
      haptic('selection');
      const v = el.dataset.mayaGrid;
      if (v === 'now') mayaGridOffset = 0;
      else mayaGridOffset += parseInt(v, 10);
      render();
    });
  });
  // On a centred view, scroll so today's cell sits in the middle of the screen.
  if (currentTab === 'maya-grid' && mayaGridOffset === 0) {
    const cur = card.querySelector('.maya-grid-cell.current');
    if (cur) requestAnimationFrame(() => cur.scrollIntoView({ block: 'center' }));
  }
}

/* ── Pulsar geometry canvas ── */
function drawPulsarCanvas(activeTone) {
  const cvs = document.getElementById('pulsar-canvas');
  if (!cvs) return;
  const c = cvs.getContext('2d');
  const W = cvs.width, H = cvs.height;
  c.clearRect(0, 0, W, H);

  // Background
  c.fillStyle = '#08001a';
  c.fillRect(0, 0, W, H);

  // Tone positions: zigzag wave pattern
  const pad = 30, usableW = W - pad * 2;
  const pts = [];
  for (let i = 0; i < 13; i++) {
    const x = pad + (i / 12) * usableW;
    const y = H / 2 + Math.sin(i * 0.5) * 55 * (i % 2 === 0 ? -1 : 1);
    pts.push({ x, y });
  }

  const groups = dsTexts?.pulsar_visual?.groups || [
    {name:'Магнитный',tones:[1,5,9,13],color:'#c07dff'},
    {name:'Лунный',tones:[2,6,10],color:'#e8453c'},
    {name:'Электрический',tones:[3,7,11],color:'#6b7fff'},
    {name:'Разумный',tones:[4,8,12],color:'#efc94c'},
  ];

  // Find which pulsar the active tone belongs to
  let activeGroup = null;
  if (activeTone) {
    activeGroup = groups.find(g => g.tones.includes(activeTone));
  }

  // Draw pulsar lines
  for (const g of groups) {
    const isActive = !activeGroup || g === activeGroup;
    const alpha = isActive ? 0.8 : 0.12;
    c.strokeStyle = g.color;
    c.lineWidth = isActive ? 2.5 : 1;
    c.globalAlpha = alpha;
    c.beginPath();
    g.tones.forEach((t, i) => {
      const p = pts[t - 1];
      if (i === 0) c.moveTo(p.x, p.y);
      else c.lineTo(p.x, p.y);
    });
    c.stroke();

    // Glow
    if (isActive && !activeGroup) {
      c.globalAlpha = 0.15;
      c.lineWidth = 8;
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  // Draw tone dots
  for (let i = 0; i < 13; i++) {
    const t = i + 1;
    const p = pts[i];
    const myGroup = groups.find(g => g.tones.includes(t));
    const isHighlighted = !activeGroup || myGroup === activeGroup;
    const isCurrent = t === activeTone;

    // Dot
    c.beginPath();
    c.arc(p.x, p.y, isCurrent ? 12 : 8, 0, Math.PI * 2);
    c.fillStyle = isHighlighted ? (myGroup?.color || '#aaa') : 'rgba(100,80,140,0.3)';
    c.globalAlpha = isHighlighted ? 1 : 0.3;
    c.fill();

    // Glow on current
    if (isCurrent) {
      c.beginPath();
      c.arc(p.x, p.y, 18, 0, Math.PI * 2);
      c.fillStyle = myGroup?.color || '#fff';
      c.globalAlpha = 0.2;
      c.fill();
    }
    c.globalAlpha = 1;

    // Tone number
    c.fillStyle = isHighlighted ? '#fff' : 'rgba(255,255,255,0.25)';
    c.font = `bold ${isCurrent ? 11 : 9}px "JetBrains Mono", monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(t), p.x, p.y);
  }

  // Legend at bottom
  c.font = '9px "JetBrains Mono", monospace';
  c.textBaseline = 'bottom';
  let lx = pad;
  for (const g of groups) {
    const isActive = !activeGroup || g === activeGroup;
    c.globalAlpha = isActive ? 1 : 0.3;
    c.fillStyle = g.color;
    c.fillRect(lx, H - 16, 8, 8);
    c.fillStyle = isActive ? '#e8e2ff' : 'rgba(232,226,255,0.3)';
    c.textAlign = 'left';
    c.fillText(g.name, lx + 12, H - 8);
    lx += c.measureText(g.name).width + 28;
  }
  c.globalAlpha = 1;

  // Click handler: detect closest tone
  if (!cvs._pulsarBound) {
    cvs._pulsarBound = true;
    cvs._pts = pts;
    cvs.addEventListener('click', (e) => {
      const rect = cvs.getBoundingClientRect();
      const sx = (e.clientX - rect.left) * (W / rect.width);
      const sy = (e.clientY - rect.top) * (H / rect.height);
      let closest = null, minD = Infinity;
      for (let i = 0; i < 13; i++) {
        const dx = cvs._pts[i].x - sx, dy = cvs._pts[i].y - sy;
        const d = dx * dx + dy * dy;
        if (d < minD) { minD = d; closest = i + 1; }
      }
      if (minD < 900) {
        haptic('selection');
        cvs._activeTone = cvs._activeTone === closest ? null : closest;
        drawPulsarCanvas(cvs._activeTone);
      }
    });
  }
}

/* ── Render dispatcher ── */
function render() {
  // Defense-in-depth: an Invalid Date here would throw in renderNav and freeze
  // every subsequent render. Never let that happen — fall back to today.
  if (!(currentDate instanceof Date) || isNaN(currentDate.getTime())) currentDate = new Date();
  const kin = dreamspellKin(currentDate);
  const { tone, seal } = kinToToneSeal(kin);
  const card = document.getElementById('card');
  renderNav();

  switch (currentTab) {
    case 'main':
      card.innerHTML = renderMain(kin, tone, seal)
        + renderOracle(kin)
        + renderMoon()
        + renderJournal();
      break;
    case 'cycles':
      if (cyclesKin === null) cyclesKin = kin;
      card.innerHTML = renderCycles(cyclesKin);
      requestAnimationFrame(positionCycleMarkers);
      break;
    case 'tzolkin': card.innerHTML = renderTzolkin(kin); break;
    case 'personal': card.innerHTML = renderPersonal(); break;
    case 'maya-today':   card.innerHTML = renderMayaToday(); break;
    case 'maya-self':    card.innerHTML = renderMayaPersonal(); break;
    case 'maya-grid':    card.innerHTML = renderMayaGrid(); break;
    case 'maya-tales':   card.innerHTML = renderMayaTales(); break;
    case 'maya-med':     card.innerHTML = renderMayaMedicine(); break;
  }

  // Global «← НАЗАД»: shown on every screen except the first one after launch
  // (whenever there is somewhere to go back to). Restores tab/sub-view/scroll.
  if (navStack.length) {
    card.insertAdjacentHTML('afterbegin', '<button class="app-back-btn" id="app-back">← НАЗАД</button>');
    document.getElementById('app-back').addEventListener('click', () => { haptic('selection'); goBack(); });
  }

  // Bind dynamic events after render
  bindCardEvents(kin, tone, seal);
  if (currentTab.startsWith('maya-')) bindMayaEvents();

  // Draw pulsar canvas (cycles tab)
  if (currentTab === 'cycles') {
    const ct = cyclesKin ? kinToToneSeal(cyclesKin).tone : tone;
    requestAnimationFrame(() => drawPulsarCanvas(ct));
  }
}

/* ── Dynamic event binding ── */
function bindCardEvents(kin, tone, seal) {
  const card = document.getElementById('card');

  // Collapsible sections
  card.querySelectorAll('.collapsible-header').forEach(el => {
    el.addEventListener('click', () => {
      haptic('selection');
      el.closest('.collapsible').classList.toggle('open');
    });
  });

  // Wave banner → Magnetic Gates popup
  card.querySelectorAll('.wave-banner').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => showInfoPopup('МАГНИТНЫЕ ВРАТА', `<p class="pp-intro">${dsTexts?.tzolkin_legend?.magnetic_gates?.popup || ''}</p>`));
  });

  // Share button
  card.querySelectorAll('[data-action="share-kin"]').forEach(el => {
    el.addEventListener('click', () => { haptic('medium'); shareKin(); });
  });

  // Journal: day note (debounced autosave) + favorite star
  const noteEl = document.getElementById('day-note');
  if (noteEl) {
    const status = document.getElementById('note-status');
    let saveTimer = null;
    const noteDate = new Date(currentDate); // capture: currentDate may change before timer fires
    noteEl.addEventListener('input', () => {
      if (status) status.textContent = 'сохраняю…';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        setNote(noteDate, noteEl.value);
        if (status) {
          status.textContent = '✓ сохранено';
          setTimeout(() => { if (status) status.textContent = ''; }, 1500);
        }
      }, 500);
    });
  }
  card.querySelectorAll('[data-action="toggle-fav"]').forEach(el => {
    el.addEventListener('click', () => {
      haptic('medium');
      const now = toggleFavorite(currentDate);
      el.classList.toggle('on', now);
      el.innerHTML = now ? SVG_STAR_FILL : SVG_STAR_OUTLINE;
    });
  });

  // Status badge popups
  card.querySelectorAll('[data-action="gap-info"]').forEach(el => {
    el.addEventListener('click', () => showInfoPopup('ПОРТАЛЫ ГАП', `
      <p class="pp-intro" style="margin-bottom:12px">${dsTexts?.gap_portals?.description || ''}</p>
      <div class="hr"></div>
      <div style="font-size:12px;line-height:1.65;color:var(--ink-mid)">
        <p style="margin-bottom:8px"><b>ГАП</b> расшифровывается как <b>Galactic Activation Portal</b> — Портал Галактической Активации.</p>
        <p style="margin-bottom:8px">Таких порталов в Цолькине <b>52</b> из 260 кинов (~20%). Они расположены симметрично в сетке по паттерну двойной спирали, напоминающему ДНК.</p>
        <p>В дни ГАП интенсивность восприятия выше: события ощущаются острее, совпадения — значимее. Это не «опасные» дни, а дни повышенного внимания и готовности к переменам.</p>
      </div>
      <div class="hr"></div>
      <p style="font-size:11px;color:var(--ink-faint);font-style:italic">По системе Дримспелл (Хосе Аргуэльес). Классический майянский календарь этой концепции не содержит.</p>
    `));
  });
  card.querySelectorAll('[data-action="gate-info"]').forEach(el => {
    el.addEventListener('click', () => showInfoPopup('МАГНИТНЫЕ ВРАТА', `<p class="pp-intro">${dsTexts?.tzolkin_legend?.magnetic_gates?.popup || ''}</p>`));
  });
  card.querySelectorAll('[data-action="sp-info"]').forEach(el => {
    el.addEventListener('click', () => showInfoPopup('СПЕКТРАЛЬНЫЙ ПОЛЯРНЫЙ КИН', `<p class="pp-intro">${dsTexts?.tzolkin_legend?.spectral_polar?.popup || ''}</p>`));
  });
  card.querySelectorAll('[data-action="mystic-info"]').forEach(el => {
    el.addEventListener('click', () => showInfoPopup('МИСТИЧЕСКАЯ КОЛОННА', `
      <p class="pp-intro" style="margin-bottom:12px">7-й столбец Цолькина — кины с Тоном 7, серединой каждой волны.</p>
      <div style="font-size:12px;line-height:1.65;color:var(--ink-mid)">
        <p style="margin-bottom:8px">20 кинов мистической колонны образуют ось зеркальной симметрии: вокруг неё весь 260-дневный узор отражается сам в себя.</p>
        <p>Тон 7 (Резонансный) — точка равновесия и настройки волны. Эти дни связывают с интуицией, синхронностью и «настройкой канала».</p>
      </div>`));
  });
  card.querySelectorAll('[data-action="harm-info"]').forEach(el => {
    el.addEventListener('click', () => {
      const h = dsTexts?.harmonics;
      showInfoPopup('ГАРМОНИКИ', `<p class="pp-intro">${h?.intro || ''}</p><div class="pp-props">${(h?.phases || []).map((p, i) => `▸ ДЕНЬ ${i+1}: ${p}`).join('<br>')}</div>`);
    });
  });

  // Shared: build wave popup content for a given kin
  function _wavePopupHtml(k) {
    const { tone: t } = kinToToneSeal(k);
    const wave = wavespell(k);
    const waveFirst = (wave - 1) * 13 + 1;
    const { seal: waveSeal } = kinToToneSeal(waveFirst);
    const wsi = sealsData[waveSeal];
    const pos = (k - 1) % 13 + 1;
    const p = pulsar(t);
    const ws = dsTexts?.wavespell;
    const pulsarData = dsTexts?.pulsars?.list?.find(pl => pl.tones.includes(t));
    return {
      title: `ВОЛНА ${wave} — ${wsi.name_ru}`,
      body: `<p class="pp-intro">${ws?.intro || 'Волновое заклинание — 13-дневный цикл с единой темой.'}</p>
      <div class="pp-props">▸ ВОЛНА: ${wave} ИЗ 20<br>▸ СИЛА ВОЛНЫ: ${wsi.power_ru}<br>▸ ДЕЙСТВИЕ: ${wsi.action_ru}<br>▸ ПОЗИЦИЯ: ДЕНЬ ${pos} ИЗ 13<br>▸ ПУЛЬСАР: ${p.name}${pulsarData ? ` (${pulsarData.dimension})` : ''}</div>
      <p class="pp-main">${p.hint}</p>
      ${pulsarData ? `<p class="pp-main" style="margin-top:10px">${pulsarData.description}</p>` : ''}
      ${wsi.description_ru ? `<p class="pp-main" style="margin-top:10px">${wsi.description_ru}</p>` : ''}
      ${ws?.metaphor ? `<p class="pp-main" style="margin-top:10px;font-style:italic">${ws.metaphor}</p>` : ''}`
    };
  }

  // Shared: build castle popup content for a given kin
  function _castlePopupHtml(k) {
    const cast = castle(k);
    const cd = dsTexts?.castles?.list?.find(c => c.id === cast);
    return {
      title: `ЗАМОК ${cast} — ${CASTLE_NAMES[cast]}`,
      body: `<p class="pp-intro">${dsTexts?.castles?.intro || 'Замок — 52-дневный сверхцикл из 4 волн.'}</p>
      <div class="pp-props">▸ ЗАМОК: ${cast} ИЗ 5<br>▸ ФУНКЦИЯ: ${cd?.function || CASTLE_HINTS[cast]}<br>▸ КИНЫ: ${cd?.kins || ''}<br>▸ ВОЛНЫ: ${(cast - 1) * 4 + 1}–${cast * 4}</div>
      <p class="pp-main">${cd?.description || CASTLE_DESCRIPTIONS[cast]}</p>
      ${cd?.metaphor ? `<p class="pp-main" style="margin-top:10px;font-style:italic">${cd.metaphor}</p>` : ''}`
    };
  }

  // Main tab: ВОЛНА popup
  card.querySelectorAll('[data-action="wave-popup"]').forEach(el => {
    el.addEventListener('click', () => {
      const r = _wavePopupHtml(dreamspellKin(currentDate));
      showInfoPopup(r.title, r.body);
    });
  });

  // Main tab: ЗАМОК popup
  card.querySelectorAll('[data-action="castle-popup"]').forEach(el => {
    el.addEventListener('click', () => {
      const r = _castlePopupHtml(dreamspellKin(currentDate));
      showInfoPopup(r.title, r.body);
    });
  });

  // Cycles tab: ВОЛНА popup (uses cyclesKin)
  card.querySelectorAll('[data-action="cycles-wave-popup"]').forEach(el => {
    el.addEventListener('click', () => {
      const r = _wavePopupHtml(cyclesKin ?? dreamspellKin(currentDate));
      showInfoPopup(r.title, r.body);
    });
  });

  // Cycles tab: ЗАМОК popup (uses cyclesKin)
  card.querySelectorAll('[data-action="cycles-castle-popup"]').forEach(el => {
    el.addEventListener('click', () => {
      const r = _castlePopupHtml(cyclesKin ?? dreamspellKin(currentDate));
      showInfoPopup(r.title, r.body);
    });
  });

  // Cycles tab: ПУЛЬСАР popup (uses cyclesKin)
  card.querySelectorAll('[data-action="cycles-pulsar-popup"]').forEach(el => {
    el.addEventListener('click', () => {
      const k = cyclesKin ?? dreamspellKin(currentDate);
      const { tone: t } = kinToToneSeal(k);
      const p = pulsar(t);
      const wave = wavespell(k);
      const pos = (k - 1) % 13 + 1;
      showInfoPopup(`ТОН ${t} — ПУЛЬСАР ${p.name}`,
        `<p class="pp-intro">Пульсар — ритмическая группа тонов внутри волны, определяющая «измерение» активности: физическое, ментальное, эмоциональное или духовное. Четыре пульсара охватывают всю волну из 13 тонов.</p>
        <div class="pp-props">▸ ТОН: ${t} ИЗ 13<br>▸ ПУЛЬСАР: ${p.name}<br>▸ ПОЗИЦИЯ В ВОЛНЕ: ДЕНЬ ${pos}<br>▸ ВОЛНА: ${wave}</div>
        <p class="pp-main">${p.hint}</p>`);
    });
  });

  // Cycles tab: KIN click → show kin popup
  card.querySelectorAll('[data-action="cycles-kin-popup"]').forEach(el => {
    el.addEventListener('click', () => {
      showKinPopup(cyclesKin ?? dreamspellKin(currentDate), null);
    });
  });

  // Moon tab: popups for lunar data
  card.querySelectorAll('[data-action="moon-popup"]').forEach(el => {
    el.addEventListener('click', () => {
      const m = getMoon(currentDate);
      const type = el.dataset.moonType;
      let title, body;
      if (type === 'luna') {
        title = `ЛУНА ${m.moonNumber} — ${m.moonName}`;
        body = `<p class="pp-intro">13-лунный год состоит из 13 лун по 28 дней. Каждая луна — полный 28-дневный цикл с именем. Год начинается 26 июля.</p>
          <div class="pp-props">▸ ЛУНА: ${m.moonNumber} ИЗ 13</div>
          <p class="pp-main">${m.moonName}</p>`;
      } else if (type === 'day') {
        title = `ДЕНЬ ${m.moonDay} ЛУННОГО МЕСЯЦА`;
        body = `<p class="pp-intro">Каждая луна — 28 дней, разделённых на 4 недели-гептады по 7 дней.</p>
          <div class="pp-props">▸ ДЕНЬ: ${m.moonDay} ИЗ 28<br>▸ НЕДЕЛЯ (ГЕПТАДА): ${m.heptad} ИЗ 4<br>▸ ЦВЕТ НЕДЕЛИ: ${m.heptadColor}</div>`;
      } else if (type === 'week') {
        title = `ГЕПТАДА ${m.heptad} — ${m.heptadColor}`;
        body = `<p class="pp-intro">Гептада — 7-дневная неделя внутри луны. В каждой луне 4 гептады. Цвет недели чередуется: Красный, Белый, Синий, Жёлтый.</p>
          <div class="pp-props">▸ ГЕПТАДА: ${m.heptad} ИЗ 4<br>▸ ЦВЕТ НЕДЕЛИ: ${m.heptadColor}<br>▸ ЛУНА: ${m.moonNumber} ИЗ 13</div>`;
      } else if (type === 'plasma') {
        const pd = dsTexts?.plasmas?.list?.[m.plasma.name];
        title = `ПЛАЗМА: ${m.plasma.name}`;
        body = `<p class="pp-intro">${dsTexts?.plasmas?.intro || 'Плазма — ежедневная радиально-плазматическая практика.'}</p>
          <div class="pp-props">▸ ПЛАЗМА: ${m.plasma.name}<br>▸ ЧАКРА: ${pd?.chakra || m.plasma.chakra}<br>▸ ТИП: ${pd?.type || ''}<br>▸ ДЕЙСТВИЕ: ${pd?.action || ''}</div>
          <p class="pp-main">${pd?.description || m.plasma.hint}</p>`;
      }
      if (title && body) showInfoPopup(title, body);
    });
  });

  // Wave kin row clicks — update cyclesKin + scroll to tone strip
  card.querySelectorAll('.wave-kin-row[data-wave-kin]').forEach(el => {
    el.addEventListener('click', () => {
      const targetKin = +el.dataset.waveKin;
      if (currentTab === 'cycles') {
        cyclesKin = targetKin;
        haptic('light');
        updateCyclesActive();
      } else {
        navigateToDate(dateForKin(targetKin));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  // Moon tab: year bearer navigation
  card.querySelectorAll('[data-action="year-bearer-nav"]').forEach(el => {
    el.addEventListener('click', () => {
      const yb = yearBearer(currentDate);
      navigateToDate(yb.yearStart);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Tzolkin tab: cell clicks (glyph grid cells carry data-tz-kin)
  card.querySelectorAll('[data-tz-kin]').forEach(el => {
    el.addEventListener('click', () => {
      const targetKin = +el.dataset.tzKin;
      const d = dateForKin(targetKin);
      navigateToDate(d);
      switchTab('main');
    });
  });

  // Cycles tab: swipeable strips — continuous kin update, snap on release
  card.querySelectorAll('.cycle-strip-grid[data-cycle]').forEach(strip => {
    let startX = 0;
    let cellW = 0;
    let startKin = 0;
    const unit = +strip.dataset.unit;

    strip.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      const cellCount = strip.querySelectorAll('.cycle-cell').length;
      cellW = strip.getBoundingClientRect().width / cellCount;
      startX = e.clientX;
      startKin = cyclesKin;
      dragUnit = unit;
      haptic('selection'); // instant buzz the moment finger touches
      try { strip.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });

    strip.addEventListener('pointermove', (e) => {
      if (!cellW) return;
      const dx = e.clientX - startX;
      // Continuous delta — no rounding so every pixel moves the display
      const rawDelta = (dx / cellW) * unit;
      const stepped = Math.round(rawDelta);
      let newKin = ((startKin + stepped - 1) % 260 + 260) % 260 + 1;
      if (newKin !== cyclesKin) {
        // Buzz only when crossing a meaningful boundary (castle/wave change)
        if (unit === 52 && castle(newKin) !== castle(cyclesKin)) haptic('light');
        else if (unit === 13 && wavespell(newKin) !== wavespell(cyclesKin)) haptic('selection');
        cyclesKin = newKin;
        updateCyclesActive();
      }
    });

    strip.addEventListener('pointerup', () => {
      if (cellW) {
        // snap to nearest whole-cell boundary relative to startKin
        let diff = cyclesKin - startKin;
        while (diff < -130) diff += 260;
        while (diff > 129) diff -= 260;
        const snapped = ((startKin + Math.round(diff / unit) * unit - 1) % 260 + 260) % 260 + 1;
        dragUnit = 0; // clear before final full update
        if (snapped !== cyclesKin) {
          cyclesKin = snapped;
        }
        updateCyclesActive();
        // Re-render wave kin list when wave/castle changes
        if (unit === 13 || unit === 52) {
          render();
          requestAnimationFrame(positionCycleMarkers);
        }
      } else {
        dragUnit = 0;
      }
      cellW = 0;
    });

    strip.addEventListener('pointercancel', () => { dragUnit = 0; cellW = 0; });
  });

  // Personal tab: save birth date
  const saveBtn = document.getElementById('birth-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const dateVal = birthDateFromInputs(
        document.getElementById('birth-date-input')?.value,
        document.getElementById('birth-text-input')?.value
      );
      if (dateVal) {
        localStorage.setItem('birthDate', dateVal);
        haptic('medium');
        render();
      }
    });
  }

  // Personal tab: clear birth date
  const clearBtn = document.getElementById('birth-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      localStorage.removeItem('birthDate');
      render();
    });
  }

  // Personal tab: go to kin in main view
  const gotoBtn = document.getElementById('personal-goto-kin');
  if (gotoBtn) {
    gotoBtn.addEventListener('click', () => {
      const bKin = birthKinOrNull();
      if (bKin != null) {
        navigateToDate(dateForKin(bKin));
        switchTab('main');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  // Unified крест-судьбы handler (main + personal cross cells AND list rows):
  // tap → kin details popup, which itself offers "Перейти к этому дню". One
  // consistent behavior everywhere — no more "jump here / popup there" split.
  const roleMap = { guide: 0, anti: 1, antipode: 1, analog: 2, hidden: 3 };
  card.querySelectorAll('[data-popup-kin]').forEach(el => {
    el.addEventListener('click', () => {
      const area = el.dataset.popupArea;
      const targetKin = +el.dataset.popupKin;
      const ri = roleMap[area];                 // undefined for the central "main" kin
      showKinPopup(targetKin, ri != null ? ORACLE_ROLES[ri] : null);
    });
  });
}

/* ── Settings modal ── */
function renderSettings() {
  const birthDate = localStorage.getItem('birthDate');
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzOffset = -new Date().getTimezoneOffset();
  const tzSign = tzOffset >= 0 ? '+' : '-';
  const tzHours = Math.floor(Math.abs(tzOffset) / 60);
  const tzMins  = Math.abs(tzOffset) % 60;
  const tzLabel = `UTC${tzSign}${tzHours}${tzMins ? ':' + String(tzMins).padStart(2,'0') : ''} — ${tz}`;

  const modal = document.getElementById('settings-content');
  modal.innerHTML = `
    <h3 class="card-title"><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span> НАСТРОЙКИ</h3>

    <div class="detail-section" style="margin-top:12px">
      <h3><span class="dot" style="background:var(--n-cyan);box-shadow:0 0 8px var(--n-cyan)"></span>ЧАСОВОЙ ПОЯС</h3>
      <div style="margin-top:10px;font-family:var(--font-mono);font-size:12px;letter-spacing:0.06em;color:var(--ink-dim)">
        <p>▸ ${tzLabel}</p>
        <p style="font-size:10px;margin-top:6px;color:var(--ink-faint)">Определяется автоматически из системы. Дата в приложении всегда использует часовой пояс вашего устройства.</p>
      </div>
    </div>

    <div class="detail-section">
      <h3><span class="dot" style="background:var(--n-red);box-shadow:0 0 8px var(--n-red)"></span>РАССЫЛКА И РЕЖИМ</h3>
      <p style="margin-top:10px;font-size:12px;color:var(--ink-dim)">Настройки ежедневной рассылки, режима (Дримспелл / Классический) и часового пояса доступны в боте через кнопку <b>⚙️ Настройки</b>.</p>
    </div>

    <div class="detail-section">
      <h3><span class="dot" style="background:var(--n-amber);box-shadow:0 0 8px var(--n-amber)"></span>ДАТА РОЖДЕНИЯ</h3>
      <div style="margin-top:10px;font-family:var(--font-mono);font-size:12px;letter-spacing:0.06em;color:var(--ink-dim)">
        ${birthDate ? `<p>▸ ${birthDate}</p>` : '<p>▸ не задана</p>'}
      </div>
      ${birthDate
        ? `<button id="stg-clear-birth" style="margin-top:10px;font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;padding:6px 14px;border:1px solid var(--hairline-2);border-radius:20px;background:none;color:var(--ink-faint);cursor:pointer">🗑 СБРОСИТЬ ДАТУ РОЖДЕНИЯ</button>`
        : `<p style="font-size:11px;color:var(--ink-faint);margin:10px 0 8px">Укажите дату рождения, чтобы вычислить ваш Кин Судьбы и нав'аль.</p>
        <div class="birth-input-group">
          <input type="date" id="stg-birth-date" value="1990-01-01" min="1900-01-01" max="${new Date().toISOString().slice(0, 10)}">
          <button id="stg-birth-save">OK</button>
        </div>
        <p style="font-size:11px;color:var(--ink-faint);margin-top:8px">Или введите текстом: <input type="text" id="stg-birth-text" placeholder="26.07.1990" style="background:rgba(255,255,255,0.06);border:1px solid var(--hairline-2);border-radius:8px;color:var(--ink);padding:4px 8px;font-family:var(--font-mono);font-size:12px;width:100px;text-align:center"></p>`
      }
    </div>

    <div class="detail-section">
      <h3><span class="dot" style="background:var(--n-cyan);box-shadow:0 0 8px var(--n-cyan)"></span>РЕЖИМ ОТОБРАЖЕНИЯ</h3>
      <p style="margin-top:8px;font-size:11px;color:var(--ink-faint)">БАЗА — компактный вид для ежедневного использования. ПРОФИ — полная информация со сворачиваемыми блоками.</p>
      <div class="mode-toggle" style="margin-top:10px;display:flex;gap:0;border:1px solid var(--hairline);border-radius:10px;overflow:hidden">
        <button class="mode-btn${displayMode === 'base' ? ' active' : ''}" data-mode="base" style="flex:1;padding:10px;border:none;background:${displayMode === 'base' ? 'rgba(125,223,239,0.15)' : 'transparent'};color:${displayMode === 'base' ? 'var(--n-cyan)' : 'var(--ink-faint)'};font-family:var(--font-mono);font-size:12px;font-weight:600;letter-spacing:0.1em;cursor:pointer">БАЗА</button>
        <button class="mode-btn${displayMode === 'pro' ? ' active' : ''}" data-mode="pro" style="flex:1;padding:10px;border:none;border-left:1px solid var(--hairline);background:${displayMode === 'pro' ? 'rgba(192,125,255,0.15)' : 'transparent'};color:${displayMode === 'pro' ? 'var(--n-violet)' : 'var(--ink-faint)'};font-family:var(--font-mono);font-size:12px;font-weight:600;letter-spacing:0.1em;cursor:pointer">ПРОФИ</button>
      </div>
    </div>

    <div class="detail-section">
      <h3><span class="dot" style="background:var(--n-amber);box-shadow:0 0 8px var(--n-amber)"></span>ПОДЛИННЫЙ КАЛЕНДАРЬ МАЙЯ</h3>
      <p style="margin-top:8px;font-size:11px;color:var(--ink-faint)">Tzolk'in · Чоль-К'их — живой счёт К'иче'-майя (корреляция GMT-584283): знаки-нав'али, число, Хааб, Длинный счёт, сказания Пополь-Вух и медицина майя. При включении приложение переходит в режим майя, Дримспелл скрывается.</p>
      <div class="mode-toggle" style="margin-top:10px;display:flex;gap:0;border:1px solid var(--hairline);border-radius:10px;overflow:hidden">
        <button class="maya-mode-btn" data-maya="off" style="flex:1;padding:10px;border:none;background:${!mayaMode ? 'rgba(125,223,239,0.15)' : 'transparent'};color:${!mayaMode ? 'var(--n-cyan)' : 'var(--ink-faint)'};font-family:var(--font-mono);font-size:12px;font-weight:600;letter-spacing:0.06em;cursor:pointer">ДРИМСПЕЛЛ</button>
        <button class="maya-mode-btn" data-maya="on" style="flex:1;padding:10px;border:none;border-left:1px solid var(--hairline);background:${mayaMode ? 'rgba(255,190,0,0.15)' : 'transparent'};color:${mayaMode ? 'var(--n-amber)' : 'var(--ink-faint)'};font-family:var(--font-mono);font-size:12px;font-weight:600;letter-spacing:0.06em;cursor:pointer">МАЙЯ · TZOLK'IN</button>
      </div>
    </div>

    <div class="detail-section">
      <h3><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span>ОБРАТНАЯ СВЯЗЬ</h3>
      <p style="margin-top:10px">
        <a href="https://t.me/U314159" style="color:var(--n-cyan);font-family:var(--font-mono);font-size:13px;text-decoration:none">💬 @U314159</a>
      </p>
      <p style="font-size:11px;color:var(--ink-faint);margin-top:6px">Вопросы, предложения, ошибки — пишите напрямую.</p>
      <p style="margin-top:10px">
        <a href="https://t.me/portalawekening" style="color:var(--n-violet);font-family:var(--font-mono);font-size:13px;text-decoration:none">♫ @portalawekening</a>
      </p>
      <p style="font-size:11px;color:var(--ink-faint);margin-top:4px">Фоновая музыка.</p>
    </div>

    <div class="detail-section">
      <h3><span class="dot"></span>О ПРИЛОЖЕНИИ</h3>
      <div style="margin-top:10px;font-family:var(--font-mono);font-size:12px;letter-spacing:0.06em;color:var(--ink-dim)">
        <p>▸ ВЕРСИЯ: v${APP_VER || '34'}</p>
        <p>▸ ЦОЛЬКИН (ДРИМСПЕЛЛ): корреляция Аргуэльеса</p>
        <p>▸ КЛАССИЧЕСКИЙ МАЙЯ: GMT-584283 (Гудман–Томпсон)</p>
        <p>▸ ИСТОЧНИКИ: lawoftime.org, tortuga1320.com, Maya Decipherment (Стюарт)</p>
        <p>▸ МУЗЫКА: <a href="https://t.me/portalawekening" style="color:var(--n-violet);text-decoration:none">@portalawekening</a></p>
      </div>
    </div>

    <button class="modal-close" id="settings-close">✕ ЗАКРЫТЬ</button>`;

  document.getElementById('settings-close').addEventListener('click', closeSettingsModal);
  const clearBirthBtn = document.getElementById('stg-clear-birth');
  if (clearBirthBtn) {
    clearBirthBtn.addEventListener('click', () => {
      localStorage.removeItem('birthDate');
      haptic('medium');
      renderSettings();   // re-render → the input form appears in place of the date
    });
  }
  // Settings: save birth date entered right here (after a reset, or first time)
  const stgBirthSave = document.getElementById('stg-birth-save');
  if (stgBirthSave) {
    stgBirthSave.addEventListener('click', () => {
      const dateVal = birthDateFromInputs(
        document.getElementById('stg-birth-date')?.value,
        document.getElementById('stg-birth-text')?.value
      );
      if (dateVal) {
        localStorage.setItem('birthDate', dateVal);
        haptic('medium');
        renderSettings();
        render();          // refresh personal/maya tabs behind the modal
      }
    });
  }
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      displayMode = btn.dataset.mode;
      localStorage.setItem('displayMode', displayMode);
      haptic('medium');
      renderSettings();
      render();
    });
  });
  document.querySelectorAll('.maya-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const on = btn.dataset.maya === 'on';
      if (on === mayaMode) return;
      haptic('medium');
      setMayaMode(on);
      closeSettingsModal();
    });
  });
}

function showSettingsModal() {
  haptic('selection');
  document.getElementById('settings-modal').style.display = 'flex';
  syncScrollLock();
  renderSettings();
}

function closeSettingsModal() {
  document.getElementById('settings-modal').style.display = 'none';
  syncScrollLock();
}

/* ── Setup permanent events ── */
function setupEvents() {
  // Run vibration self-test once on first user gesture
  document.addEventListener('pointerdown', runVibSelfTest, { once: true });

  // ── Global press-haptic (whole app) ──────────────────────────────────
  // One capture-phase listener buzzes the instant a finger lands on ANY tappable
  // element — card content, popups, header, tabs — instead of waiting for click.
  // This is the single source of tap feedback; per-handler haptic() calls within
  // the same gesture are suppressed (see haptic()). Fixes the "vibration is late"
  // feel everywhere, including dynamically re-rendered card buttons.
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest?.(HAPTIC_TAP_SEL)) pressHaptic('selection');
  }, true);

  // Buttons fire their haptic on pointerdown (the instant of PRESS) so the buzz
  // is felt immediately, not on release. The actual action runs on click.
  const todayBtn = document.getElementById('today-btn');
  todayBtn.addEventListener('pointerdown', () => haptic('selection'));
  todayBtn.addEventListener('click', () => {
    currentDate = new Date();
    cyclesKin = null;
    // "Today" must stay within the active mode: in authentic-Maya mode jump to
    // maya-today, never to the Dreamspell 'main' tab (that was the bug — pressing
    // СЕГ from a Maya tab threw the user into Dreamspell).
    const homeTab = mayaMode ? 'maya-today' : 'main';
    if (currentTab !== homeTab) switchTab(homeTab);
    else render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  prevBtn.addEventListener('pointerdown', () => haptic('light'));
  nextBtn.addEventListener('pointerdown', () => haptic('light'));
  prevBtn.addEventListener('click', () => stepDate(-1));
  nextBtn.addEventListener('click', () => stepDate(1));

  const dateDisplay = document.getElementById('date-display');
  dateDisplay.addEventListener('pointerdown', () => haptic('light'));
  dateDisplay.addEventListener('click', () => {
    const curKin = dreamspellKin(currentDate);
    showInfoPopup('НАВИГАЦИЯ', `
      <div style="margin-bottom:14px">
        <div class="eyebrow" style="margin-bottom:6px">ПЕРЕЙТИ К ДАТЕ</div>
        <input type="date" id="nav-date-input" value="${dateKey(currentDate)}" min="1900-01-01" max="2099-12-31" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid var(--hairline-2);border-radius:10px;color:var(--ink);font-family:var(--font-mono);font-size:14px;padding:10px;outline:none">
      </div>
      <div style="margin-bottom:12px">
        <div class="eyebrow" style="margin-bottom:6px">ПЕРЕЙТИ К КИНУ (1–260)</div>
        <input type="number" id="nav-kin-input" min="1" max="260" value="${curKin}" placeholder="1–260" style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid var(--hairline-2);border-radius:10px;color:var(--ink);font-family:var(--font-mono);font-size:14px;padding:10px;outline:none;-moz-appearance:textfield">
      </div>
      <div id="nav-error" class="nav-error"></div>
      <button id="nav-go" class="nav-go-btn">ПЕРЕЙТИ</button>`);
    setTimeout(() => {
      const dateEl = document.getElementById('nav-date-input');
      const kinEl = document.getElementById('nav-kin-input');
      const errEl = document.getElementById('nav-error');
      // Track which field the user last edited — that one wins (the other clears),
      // so "дата + кин" is never ambiguous.
      let lastEdited = 'date';
      const showErr = (msg) => { if (errEl) errEl.textContent = msg; };
      dateEl?.addEventListener('input', () => { lastEdited = 'date'; if (kinEl) kinEl.value = ''; showErr(''); });
      kinEl?.addEventListener('input', () => { lastEdited = 'kin'; if (dateEl) dateEl.value = ''; showErr(''); });

      const go = () => {
        if (lastEdited === 'kin') {
          const n = parseInt(kinEl?.value, 10);
          if (!Number.isInteger(n) || n < 1 || n > 260) {
            showErr('Кин должен быть числом от 1 до 260'); // #4: 0 / 287 не ломают, а подсвечиваются
            return;
          }
          currentDate = dateForKin(n);
        } else {
          const dt = parseInputDate(dateEl?.value);
          if (!dt) { showErr('Введите корректную дату'); return; } // #2: Invalid Date больше не доходит до render
          currentDate = dt;
        }
        cyclesKin = null;
        closeKinPopup();
        render();
      };
      document.getElementById('nav-go')?.addEventListener('click', go);
      dateEl?.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      kinEl?.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    }, 50);
  });

  // Tab buttons — delegated so the bar can be rebuilt per mode without rebinding.
  // Haptic on pointerdown (press), switch on click.
  const tabsEl = document.getElementById('tabs');
  tabsEl.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.tab');
    if (btn && btn.dataset.tab) haptic('selection');
  });
  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn || !btn.dataset.tab) return;
    switchTab(btn.dataset.tab);
  });

  // My Kin button (header) → personal tab (mode-aware)
  const myKinBtn = document.getElementById('my-kin-btn');
  myKinBtn.addEventListener('pointerdown', () => haptic('selection'));
  myKinBtn.addEventListener('click', () => switchTab(mayaMode ? 'maya-self' : 'personal'));

  // Settings button
  const settingsBtn = document.getElementById('settings-btn');
  settingsBtn.addEventListener('pointerdown', () => haptic('light'));
  settingsBtn.addEventListener('click', showSettingsModal);
  document.getElementById('settings-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('settings-modal')) closeSettingsModal();
  });

  // Music button: click = toggle, long press (600ms) = vibration test
  const musicBtn = document.getElementById('music-btn');
  let musicLongTimer = null;
  musicBtn.addEventListener('pointerdown', () => {
    haptic('light'); // press feedback the instant you touch
    musicLongTimer = setTimeout(() => { musicLongTimer = null; testVibration(); }, 600);
  });
  musicBtn.addEventListener('pointerup', () => {
    if (musicLongTimer) { clearTimeout(musicLongTimer); musicLongTimer = null; toggleMusic(); }
  });
  musicBtn.addEventListener('pointercancel', () => { clearTimeout(musicLongTimer); musicLongTimer = null; });

  // Close on the FIRST tap of the dark overlay. Uses click (fires on release,
  // so no click-through to content behind) but with NO artificial delay — the
  // old 1-second immunity was the "needs a second tap" annoyance, now removed.
  document.getElementById('kin-popup').addEventListener('click', (e) => {
    if (e.target === document.getElementById('kin-popup')) closeKinPopup();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('kin-popup').style.display !== 'none') closeKinPopup();
    else if (document.getElementById('settings-modal').style.display !== 'none') closeSettingsModal();
  });

  // Swipe navigation — horizontal swipe = ±1 day. Guards against vertical
  // scroll (only fires when the gesture is clearly horizontal) and against
  // multi-touch (pinch/zoom). Disabled on tabs with their own gestures.
  const card = document.getElementById('card');
  let sx = 0, sy = 0, swipeable = false;
  card.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { swipeable = false; return; }
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    swipeable = !['tzolkin', 'cycles', 'maya-grid', 'maya-catalog', 'maya-tales', 'maya-self'].includes(currentTab);
  }, { passive: true });
  card.addEventListener('touchend', e => {
    if (!swipeable || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    // horizontal intent: far enough sideways AND mostly horizontal
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      haptic('light');
      stepDate(dx > 0 ? -1 : 1); // personal tab → resonant hop; else ±1 day
    }
  }, { passive: true });

  // Telegram WebApp integration — do NOT override our neon theme colors
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
  }
}

/* ── Particles ── */
function initParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COLORS = [
    [255, 255, 255],
    [180, 220, 255],
    [220, 180, 255],
    [255, 220, 180],
    [180, 255, 220],
  ];

  // Fewer particles + bail out entirely under prefers-reduced-motion: the
  // constant rAF redraw competed with touch handling on low-end devices.
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const COUNT = reduceMotion ? 0 : 36;
  const dots = Array.from({ length: COUNT }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.8 + 0.6,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.2 - 0.1,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    phase: Math.random() * Math.PI * 2,
  }));

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    for (const d of dots) {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < -10) d.x = W + 10;
      if (d.x > W + 10) d.x = -10;
      if (d.y < -10) d.y = H + 10;
      if (d.y > H + 10) d.y = -10;

      const pulse = 0.5 + 0.5 * Math.sin(t * 0.001 + d.phase);
      const alpha = 0.25 + 0.55 * pulse;
      const [r, g, b] = d.color;

      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fill();

      if (d.r > 1) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.15})`;
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ── Welcome popup (once) ── */
function showWelcome() {
  const key = 'welcomeVer';
  if (localStorage.getItem(key) === APP_VER) return;
  localStorage.setItem(key, APP_VER);
  setTimeout(() => {
    showInfoPopup('ЦОЛЬКИН', `
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:36px;margin-bottom:8px">✦</div>
        <div style="font-family:var(--font-mono);font-size:11px;letter-spacing:0.2em;color:var(--ink-faint)">КИН ДНЯ · DREAMSPELL</div>
      </div>
      <p style="font-size:14px;line-height:1.6;color:var(--ink);margin-bottom:14px">Каждый день несёт уникальную энергию в 260-дневном цикле Цолькин. Листайте дни, изучайте печати и тоны.</p>
      <p style="font-size:13px;line-height:1.5;color:var(--ink-dim);margin-bottom:14px">Сейчас включён режим <b style="color:var(--n-cyan)">БАЗА</b> — компактный вид для ежедневного использования.</p>
      <p style="font-size:13px;line-height:1.5;color:var(--ink-dim)">Для полной информации (печать, тон, земная семья, архетип) переключите на <b style="color:var(--n-violet)">ПРОФИ</b> в настройках <span style="font-size:16px">⚙</span></p>`);
  }, 600);
}

/* ── Init ── */
async function init() {
  initParticles();
  try {
    await loadData();
    updateStreak();
    setupEvents();
    if (mayaMode) currentTab = 'maya-today';
    renderTabs();
    render();
    showWelcome();
  } catch (e) {
    const card = document.getElementById('card');
    if (card) card.innerHTML = `<div class="kin-card" style="padding:20px"><h3 style="color:#e8e2ff">Ошибка</h3><p style="color:#aaa;margin:10px 0;word-break:break-all">${e.message}<br><br>${(e.stack||'').split('\n').slice(0,3).join('<br>')}</p><button onclick="location.reload()" style="margin-top:12px;padding:10px 20px;border:1px solid rgba(180,160,255,0.3);border-radius:10px;background:rgba(125,223,239,0.1);color:#7ddfef;cursor:pointer;font-size:14px">Перезагрузить</button></div>`;
  }
}

init();
