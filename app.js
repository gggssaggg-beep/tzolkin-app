import {
  dreamspellKin, kinToToneSeal, kinFromToneSeal, oracle, wavespell, castle,
  isDayOutOfTime, SEAL_COLORS, COLOR_RU, CASTLE_NAMES, CASTLE_HINTS,
  getMoon, yearBearer, pulsar,
} from './tzolkin.js';

const APP_VER = '46';
let sealsData, tonesData, kinsData, mayaData, dsTexts;
let currentDate = new Date();
let currentTab = 'main';

/* ── Cycles tab state ── */
let cyclesKin = null; // lazy init on first render
let dragUnit = 0;     // unit of currently dragged strip, 0 = not dragging

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
  2: 'Белый Северный Замок Перехода — пространство рафинирования. Четыре белые волны отделяют суть от шелухи, устраняют лишнее и проясняют путь.',
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
  html += `</div>
    <div class="hr"></div>
    <div style="font-size:12px;line-height:1.7;color:var(--ink)">
      <p>${sealImg(seal, 16)} <b>${si.name_ru}</b> (${si.name_maya})</p>
      <p>Сущность: ${si.essence_ru}</p>
      <p>Сила: ${si.power_ru} · Действие: ${si.action_ru}</p>
      <p style="margin-top:6px">${toneImg(tone, 14)} <b>Тон ${tone} — ${ti.name_ru}</b></p>
      <p>Функция: ${ti.action_ru}</p>
    </div>`;
  if (info?.summary)
    html += `<div class="hr"></div><p style="font-size:12px;color:var(--ink-faint);line-height:1.5">${info.summary}</p>`;
  html += `<button class="popup-close-btn">✕ ЗАКРЫТЬ</button>`;

  const popup = document.getElementById('kin-popup-content');
  popup.innerHTML = html;
  document.getElementById('kin-popup').style.display = 'flex';
  popup.querySelector('.popup-close-btn').addEventListener('click', closeKinPopup);
}

function closeKinPopup() {
  document.getElementById('kin-popup').style.display = 'none';
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
  popup.querySelector('.popup-close-btn').addEventListener('click', closeKinPopup);
}

/* ── Haptic feedback ── */
// Use _vibrate captured before telegram-web-app.js could override navigator.vibrate
const _vib = window._vibrate ?? navigator.vibrate?.bind(navigator) ?? null;

function haptic(strength = 'light') {
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
  // Visual pulse — confirms haptic is firing regardless of physical vibration support
  const app = document.getElementById('app');
  if (app) {
    app.classList.remove('haptic-flash');
    void app.offsetWidth; // force reflow to restart animation
    app.classList.add('haptic-flash');
    setTimeout(() => app.classList.remove('haptic-flash'), 150);
  }
}

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

  if (result === false) {
    showVibToast(
      '⚠ Вибрация заблокирована браузером.\n\n' +
      'Chrome → ⋮ → Настройки сайта →\nВибрация → Разрешить для этого сайта\n\n' +
      'Нажмите чтобы скрыть',
      12000
    );
  }
  // result === true: вибрация должна работать, ничего не показываем
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
    btn.textContent = '♪';
  } else {
    musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, audioCtx.currentTime);
    musicGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
    setTimeout(() => _audioEl && _audioEl.pause(), 1600);
    musicPlaying = false;
    btn.classList.remove('playing');
    btn.textContent = '♫';
  }
}

/* ── Data loading ── */
async function loadData() {
  const [s, t, k, m, dt] = await Promise.all([
    fetch('data/seals.json').then(r => r.json()),
    fetch('data/tones.json').then(r => r.json()),
    fetch('data/kin_descriptions.json').then(r => r.json()),
    fetch('data/maya_classic.json').then(r => r.json()),
    fetch('data/dreamspell_texts.json').then(r => r.json()),
  ]);
  sealsData = {};
  for (const [id, val] of Object.entries(s.seals)) sealsData[+id] = val;
  tonesData = {};
  for (const [id, val] of Object.entries(t.tones)) tonesData[+id] = val;
  kinsData = k.kins;
  mayaData = m;
  dsTexts = dt;
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
  currentDate = d;
  const card = document.getElementById('card');
  card.classList.add('tab-fade');
  setTimeout(() => {
    render();
    requestAnimationFrame(() => card.classList.remove('tab-fade'));
  }, 150);
}

function switchTab(tab) {
  if (tab === currentTab) return;
  currentTab = tab;
  const card = document.getElementById('card');
  card.classList.add('tab-fade');
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  setTimeout(() => {
    render();
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => card.classList.remove('tab-fade'));
  }, 150);
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

  let html = `<p class="section-intro" style="text-align:center;margin:0 0 10px;border:none;padding:0">Кин дня — энергия сегодняшнего дня в 260-дневном цикле Цолькин. Печать определяет качество, Тон — способ действия.</p>`;

  if (isDayOutOfTime(currentDate))
    html += `<div class="doot-banner">⏳ ДЕНЬ ВНЕ ВРЕМЕНИ</div>`;

  if (tone === 1)
    html += `<div class="wave-banner"><div class="emoji">🌀</div>
      <div class="text">Начинается Волна ${wave} — ${sealInfo.name_ru}</div></div>`;

  html += `<div class="kin-card">
    <div class="kin-header">
      <div class="tone-above">${toneImg(tone, 36)}</div>
      <div class="seal-badge ${color} c-${color}">${sealImg(seal, 80, true)}</div>
      <div class="kin-number c-${color}">${kin}${gap ? '<span class="gap-badge">ГАП</span>' : ''}</div>
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

  // Compact status badges
  const harmonic = Math.ceil(kin / 4);
  const harmonicPhase = dsTexts?.harmonics?.phases?.[(kin - 1) % 4] || '';
  const badges = [];
  if (gap) badges.push(`<span class="status-badge gap-bg" data-action="gap-info">ГАП</span>`);
  if (tone === 1) badges.push(`<span class="status-badge gate-bg" data-action="gate-info">МАГНИТНЫЕ ВРАТА</span>`);
  const spKins = dsTexts?.tzolkin_legend?.spectral_polar?.kins || [];
  if (spKins.includes(kin)) badges.push(`<span class="status-badge sp-bg" data-action="sp-info">СПЕКТРАЛЬНЫЙ ПОЛЯРНЫЙ</span>`);
  badges.push(`<span class="status-badge harm-bg" data-action="harm-info">ГАРМОНИКА ${harmonic} · ${harmonicPhase}</span>`);
  html += `<div class="status-badges">${badges.join('')}</div>`;

  html += `<button class="share-btn" data-action="share-kin">ПОДЕЛИТЬСЯ</button>
  </div>`;

  // Seal detail block
  html += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-${color});box-shadow:0 0 8px var(--n-${color})"></span>
      ПЕЧАТЬ — ${sealImg(seal, 20)} ${sealInfo.name_ru} · ${sealInfo.name_maya}</h3>
    <p class="section-intro">Один из 20 архетипов Цолькина. Суть, сила и направление действия.</p>
    <div class="pp-props">▸ СУТЬ: ${sealInfo.essence_ru}<br>▸ СИЛА: ${sealInfo.power_ru}<br>▸ ДЕЙСТВИЕ: ${sealInfo.action_ru}${sealInfo.chakra_ru ? `<br>▸ ЧАКРА: ${sealInfo.chakra_ru}` : ''}${sealInfo.direction_action_ru ? `<br>▸ ${sealInfo.direction_action_ru}` : ''}${sealInfo.earth_family_action_ru ? `<br>▸ ${sealInfo.earth_family_action_ru}` : ''}</div>
    ${sealInfo.keywords?.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">
      ${sealInfo.keywords.map(kw => `<span style="font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:0.08em;padding:3px 9px;border:1px solid var(--hairline-2);border-radius:20px;color:var(--ink-dim)">${kw}</span>`).join('')}
    </div>` : ''}
    ${sealInfo.description_ru ? `<p class="pp-main">${sealInfo.description_ru}</p>` : ''}
  </div>`;

  // Tone detail block
  const tp = dsTexts?.tone_profiles?.[String(tone)];
  html += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-cyan);box-shadow:0 0 8px var(--n-cyan)"></span>
      ТОН ${tone} — ${toneImg(tone, 20)} ${toneInfo.name_ru}</h3>
    <p class="section-intro">Числовой импульс от 1 до 13. Задаёт ритм и способ действия Кина.</p>
    <div class="pp-props">${[toneInfo.function_ru ? `▸ ФУНКЦИЯ: ${toneInfo.function_ru}` : '', toneInfo.creative_power_ru ? `▸ ТВОРЧЕСКАЯ СИЛА: ${toneInfo.creative_power_ru}` : '', toneInfo.action_ru ? `▸ ДЕЙСТВИЕ: ${toneInfo.action_ru}` : ''].filter(Boolean).join('<br>')}</div>
    ${toneInfo.description_ru ? `<p class="pp-main">${toneInfo.description_ru}</p>` : ''}
    ${tp?.wave_role ? `<p class="pp-main" style="margin-top:10px"><b>Роль в Волне:</b> ${tp.wave_role}</p>` : ''}
    ${tp?.character ? `<p class="pp-main" style="margin-top:10px"><b>Характер Тона:</b> ${tp.character}</p>` : ''}
    ${toneInfo.question_ru ? `<div class="question-block" style="margin-top:12px"><div class="q">❓ ${toneInfo.question_ru}</div></div>` : ''}
  </div>`;

  // Earth Family block
  const ef = dsTexts?.earth_families?.families?.find(f => f.seal_ids.includes(seal));
  if (ef) {
    html += `<div class="detail-section">
      <h3><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span>
        ЗЕМНАЯ СЕМЬЯ — ${ef.name.toUpperCase()}</h3>
      <p class="section-intro">${dsTexts.earth_families.intro.split('.').slice(0, 2).join('.') + '.'}</p>
      <div class="pp-props">▸ СЕМЬЯ: ${ef.name}<br>▸ ЧАКРА: ${ef.chakra}<br>▸ ФУНКЦИЯ: ${ef.function}<br>▸ ПЕЧАТИ: ${ef.seals.join(', ')}</div>
      <p class="pp-main">${ef.description}</p>
      <p class="pp-main" style="margin-top:10px"><b>Люди этой семьи:</b> ${ef.people}</p>
    </div>`;
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
  if (summary)
    html += `<div class="detail-section"><h3><span class="dot" style="background:var(--n-amber);box-shadow:0 0 8px var(--n-amber)"></span> АРХЕТИП</h3><p class="section-intro">Обобщённый образ Кина — соединение Печати и Тона в единый смысл.</p><p class="pp-main">${summary}</p></div>`;

  // Kin search
  html += `<div class="kin-card kin-search-card">
    <div class="eyebrow" style="margin-bottom:8px">ПЕРЕЙТИ К КИНУ</div>
    <div class="kin-search-row">
      <input type="number" id="kin-search-input" min="1" max="260" placeholder="1–260" class="kin-search-input">
      <button id="kin-search-go" class="kin-search-go">→</button>
    </div>
  </div>`;

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
    return `<div class="oracle-cell c-${c} ${isBig ? 'main' : ''}" style="grid-area:${area}" data-oracle-role="${area}">
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

  const roleAreaMap = { guide: 'guide', antipode: 'anti', analog: 'analog', hidden: 'hidden' };

  for (const r of ORACLE_ROLES) {
    const k = o[r.key];
    const { seal } = kinToToneSeal(k);
    const si = sealsData[seal];
    const c = sealColor(seal);
    const title = kinsData[String(k)]?.title || '';
    const sealDesc = si.description_ru ? si.description_ru.split('.')[0] + '.' : `${si.power_ru} · ${si.action_ru}`;
    html += `<div class="oracle-row" data-oracle-row="${roleAreaMap[r.key]}" data-oracle-kin="${k}">
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
    const { tone: wt, seal: ws } = kinToToneSeal(wk);
    const isCurrent = wk === kin;
    const gap = isGap(wk);
    const title = kinsData[String(wk)]?.title || '';
    html += `<div class="wave-kin-row${isCurrent ? ' current' : ''}" data-wave-kin="${wk}">
      <span class="wave-kin-marker">${isCurrent ? '✦' : ''}</span>
      <span class="wave-kin-img">${sealImg(ws, 28)}</span>
      <span class="wave-kin-text">${title}${gap ? '<span class="gap-badge">ГАП</span>' : ''}</span>
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

  return html;
}

/* ── Maya tone dots ── */
function mayaDots(tone) {
  const bars = Math.floor((tone - 1) / 5);
  const dots = (tone - 1) % 5;
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
  const birthDateStr = localStorage.getItem('birthDate');
  let birthKin = null;
  if (birthDateStr) {
    const [y, m, d] = birthDateStr.split('-').map(Number);
    birthKin = dreamspellKin(new Date(y, m - 1, d));
  }

  // Neon legend colors
  let html = `<div class="kin-card" style="padding:10px">
    <h3 class="card-title" style="font-size:12px"><span class="dot"></span> ЦОЛЬКИН — 260-ДНЕВНЫЙ ЦИКЛ</h3>
    <div class="tzolkin-legend">
      <span><span class="legend-swatch" style="background:oklch(0.45 0.15 22)"></span>Красный</span>
      <span><span class="legend-swatch" style="background:oklch(0.75 0.08 195)"></span>Белый</span>
      <span><span class="legend-swatch" style="background:oklch(0.40 0.16 265)"></span>Синий</span>
      <span><span class="legend-swatch" style="background:oklch(0.72 0.12 85)"></span>Жёлтый</span>
      <span title="${dsTexts?.gap_portals?.description || ''}"><span class="legend-swatch" style="background:oklch(0.55 0.14 155)"></span>ГАП <span class="legend-hint">ⓘ</span></span>
      <span title="Мистическая колонка — 7-й столбец Цолькина (тон 7). 20 дней зеркальной симметрии."><span class="legend-swatch" style="background:rgba(120,100,160,0.4)"></span>Мист. <span class="legend-hint">ⓘ</span></span>
      <span title="${dsTexts?.tzolkin_legend?.magnetic_gates?.legend || ''}"><span class="legend-swatch" style="background:transparent;border:2px solid #fff;border-radius:2px"></span>Врата <span class="legend-hint">ⓘ</span></span>
      <span title="${dsTexts?.tzolkin_legend?.spectral_polar?.legend || ''}"><span class="legend-swatch" style="background:transparent;border:2px solid var(--n-violet);border-radius:50%"></span>Спектр. <span class="legend-hint">ⓘ</span></span>
    </div>
    <p class="section-intro" style="margin-top:8px">Полная таблица 260 кинов. 20 строк — печати, 13 столбцов — тоны. Нажмите на ячейку для перехода.</p>
  </div>`;

  html += `<div class="tzolkin-grid-wrapper"><div class="tzolkin-grid">`;

  const kin1Date = addDays(currentDate, -(currentKin - 1));

  for (let seal = 1; seal <= 20; seal++) {
    html += `<div class="tzolkin-row-header">${sealImg(seal, 22)}</div>`;
    for (let col = 0; col < 13; col++) {
      const k = seal + col * 20;
      const tone = (k - 1) % 13 + 1;
      const gap = isGap(k);
      const isMystic = col === 6;
      const isCurrent = k === currentKin;
      const isBirth = k === birthKin;
      let colorCls;
      if (gap) colorCls = 'color-gap';
      else if (isMystic) colorCls = 'color-mystic';
      else colorCls = 'color-' + sealColor(seal);
      const isMagGate = tone === 1;
      const isSpectralPolar = [50, 115, 180, 245].includes(k);
      let cls = `tzolkin-cell ${colorCls}`;
      if (isCurrent) cls += ' current-kin';
      if (isBirth) cls += ' birth-kin';
      if (isMagGate) cls += ' mag-gate';
      if (isSpectralPolar) cls += ' spectral-polar';
      const d = addDays(kin1Date, k - 1);
      const titleStr = `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()} · Кин ${k}`;
      html += `<div class="${cls}" data-tz-kin="${k}" title="${titleStr}">${mayaDots(tone)}<span class="tz-kin-num">${k}</span></div>`;
    }
  }

  html += `</div></div>`;
  return html;
}

/* ── Tab: Personal (Мой Кин) ── */
function renderPersonal() {
  const birthDateStr = localStorage.getItem('birthDate');

  if (!birthDateStr) {
    const todayStr = new Date().toISOString().slice(0, 10);
    return `<div class="kin-card">
      <h3 class="card-title"><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span> МОЙ КИН СУДЬБЫ</h3>
      <p style="color:var(--ink-faint);margin-bottom:12px;font-size:13px;line-height:1.5">У каждого человека есть свой Кин Судьбы — энергия дня рождения в цикле Цолькин. Он определяет вашу печать, тон и крест судьбы. Укажите дату рождения.</p>
      <div class="birth-input-group">
        <input type="date" id="birth-date-input" value="1990-01-01" min="1900-01-01" max="${todayStr}">
        <button id="birth-save-btn">OK</button>
      </div>
      <p style="font-size:11px;color:var(--ink-faint);margin-top:8px;text-align:center">Или введите текстом: <input type="text" id="birth-text-input" placeholder="26.07.1990" style="background:rgba(255,255,255,0.06);border:1px solid var(--hairline-2);border-radius:8px;color:var(--ink);padding:4px 8px;font-family:var(--font-mono);font-size:12px;width:100px;text-align:center"></p>
    </div>`;
  }

  const [y, m, d] = birthDateStr.split('-').map(Number);
  const birthD = new Date(y, m - 1, d);
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
    connections.push({ icon: '·', text: 'Прямых связей с текущим днём не найдено.' });
  }

  // Next personal kin date
  let nextDate = addDays(currentDate, 1);
  let nextKin = dreamspellKin(nextDate);
  let safety = 0;
  while (nextKin !== bKin && safety < 270) {
    nextDate = addDays(nextDate, 1);
    nextKin = dreamspellKin(nextDate);
    safety++;
  }

  return `<div class="kin-card">
    <h3 class="card-title"><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span> МОЙ КИН</h3>
    <div style="text-align:center;margin-bottom:14px">
      <div style="margin-bottom:6px">${toneImg(bTone, 32)}</div>
      <div class="seal-badge ${bColor} c-${bColor}" style="width:80px;height:80px;margin:0 auto 8px">
        ${sealImg(bSeal, 68, true)}
      </div>
      <div class="kin-num c-${bColor}" style="font-size:36px">${bKin}${bGap ? '<span class="gap-badge">ГАП</span>' : ''}</div>
      <div class="display" style="font-size:14px;margin-top:6px">${bInfo?.title || ''}</div>
      <div class="eyebrow muted" style="margin-top:4px">${formatDateRu(birthD).toUpperCase()}</div>
    </div>
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
  <div class="detail-section">
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
  </div>
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
    <div class="oracle-list">${(() => {
      const roles = [
        { key: 'guide', kin: bOracle.guide, name: 'Управитель', desc: 'Высшая направляющая сила. Определяет, откуда приходит вдохновение и интуиция.' },
        { key: 'analog', kin: bOracle.analog, name: 'Аналог', desc: 'Союзник и поддержка. Энергия, которая дополняет и усиливает вашу природу.' },
        { key: 'antipode', kin: bOracle.antipode, name: 'Антипод', desc: 'Вызов и рост. Противоположная сила, через принятие которой раскрывается мудрость.' },
        { key: 'hidden', kin: bOracle.hidden, name: 'Оккультный учитель', desc: 'Скрытая сила. Неочевидный дар, который раскрывается через внутреннюю работу.' },
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
            <div class="oracle-hint">${r.desc}</div>
            <div style="font-size:11px;color:var(--ink-faint);margin-top:2px">${rsi.essence_ru} · ${rsi.power_ru}</div>
          </div></div>`;
      }).join('');
    })()}</div>
  </div>
  <div class="kin-card">
    <h3 class="card-title" style="font-size:11px"><span class="dot" style="background:var(--n-cyan);box-shadow:0 0 8px var(--n-cyan)"></span> СВЯЗЬ С ТЕКУЩИМ ДНЁМ</h3>
    <div class="connection-list">
      ${connections.map(c => `<div class="connection-item"><span class="connection-icon">${c.icon}</span><span class="connection-text">${c.text}</span></div>`).join('')}
    </div>
    <div class="spread" style="margin-top:14px">
      <span class="eyebrow">СЛЕДУЮЩИЙ ВАШ КИН</span>
      <span class="display" style="font-size:12px">${formatDateRu(nextDate).toUpperCase()}</span>
    </div>
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
    <div style="text-align:center;margin-bottom:6px">${mayaDots(md.tzolkinNum)}</div>
    <div style="text-align:center;margin-bottom:4px">${toneImg(md.tzolkinNum, 36)}</div>
    <div class="kin-number c-${color}" style="font-size:52px;text-align:center;margin-bottom:4px">${md.tzolkinNum}</div>
    <div class="kin-title" style="font-size:22px;text-align:center;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">${signData.name_yucatec}</div>
    <div class="kin-subtitle" style="text-align:center;margin-bottom:12px">${signData.meaning_ru}</div>
    <div style="font-family:var(--font-mono);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-dim)">
      <p>▸ К'ИЧЕ': ${md.tzolkinNum} ${signData.name_kiche}</p>
      <p>▸ НАХУАТЛЬ: ${md.tzolkinNum} ${signData.name_nahuatl}</p>
      <p>▸ КЛАССИЧЕСКОЕ: ${signData.name_classic_proto}</p>
      <p style="margin-top:10px">▸ ХААБ: ${md.dayInMonth} ${monthData.name} (${monthData.name_ru})</p>
      <p>▸ ДОЛГИЙ СЧЁТ: ${longCount}</p>
      <p>▸ КРУГ КАЛЕНДАРЯ: ${md.tzolkinNum} ${signData.name_yucatec} ${md.dayInMonth} ${monthData.name}</p>
    </div>
  </div>`;

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
  html += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span>VS ДРИМСПЕЛЛ</h3>
    <div style="margin-top:12px;font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-dim)">
      <p>▸ КЛАССИЧЕСКИЙ МАЙЯ: ${md.tzolkinNum} ${signData.name_yucatec}</p>
      <p>▸ ДРИМСПЕЛЛ: КИН ${dsKin} · ТОН ${dsT} ${dsTone.name_ru} · ${dsSeal.name_ru}</p>
      <p>▸ РАЗНИЦА: ≈57 ДНЕЙ (2026)</p>
    </div>
    <p style="font-size:11px;color:var(--ink-faint);margin-top:8px">Дримспелл (Х. Аргуэльес, 1992) — авторская New Age-интерпретация, не классический счёт. Живая традиция К'иче'-майя Гватемалы сохранила непрерывный счёт, совпадающий с корреляцией GMT.</p>
  </div>`;

  // ── Long Count cycles ──
  if (mayaData.long_count) {
    const lc = mayaData.long_count;
    html += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-amber);box-shadow:0 0 8px var(--n-amber)"></span>ДЛИННЫЙ СЧЁТ — ЦИКЛЫ ВРЕМЕНИ</h3>
    <p>Длинный счёт — линейный счёт дней от даты Создания (11 авг. 3114 до н.э.). Позиционная запись похожа на наши числа, только в основе — система 20 (виджесимальная), с одним исключением: Виналь×18, чтобы приблизить Тун к солнечному году.</p>
    <div class="maya-lc-table" style="margin:14px 0">`;

    const fmt = (n) => n >= 1e9 ? (n / 1e9).toFixed(2) + ' млрд' : n >= 1e6 ? (n / 1e6).toFixed(2) + ' млн' : n.toLocaleString('ru-RU');
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
      <div style="font-family:var(--font-mono);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:var(--n-amber)">▸ ВЕЛИКИЙ ЦИКЛ</div>
      <div style="font-family:var(--font-mono);font-size:13px;color:var(--ink-mid);margin-top:4px">13 Б'АКТ'УНОВ = 1 872 000 ДНЕЙ ≈ 5 125 ЛЕТ</div>
      <p style="margin-top:6px;font-size:12px">${gc.note}</p>
    </div>
    <p style="font-size:11px;color:var(--ink-faint);margin-top:8px">Единицы Пиктун и выше (7885+ лет) использовались в мифологических надписях — например, в Паленке, где рождение бога-покровителя записано за миллионы лет до наших дней.</p>
  </div>`;
  }

  // ── Astronomical correlations ──
  if (mayaData.astronomical_cycles) {
    const ac = mayaData.astronomical_cycles;
    const bodyIcons = { 'Венера': '♀', 'Марс': '♂', 'Луна': '☽', 'Юпитер и Сатурн': '♃', 'Солнце': '☉', 'Плеяды': '✦' };
    const bodyColors = { 'Венера': 'cyan', 'Марс': 'red', 'Луна': 'violet', 'Юпитер и Сатурн': 'amber', 'Солнце': 'amber', 'Плеяды': 'cyan' };

    html += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-cyan);box-shadow:0 0 8px var(--n-cyan)"></span>АСТРОНОМИЧЕСКИЕ КОРРЕЛЯЦИИ</h3>
    <p>${ac.description}</p>`;

    for (const cycle of ac.cycles) {
      const icon = bodyIcons[cycle.body] || '●';
      const c = bodyColors[cycle.body] || 'cyan';
      html += `<div style="margin-top:14px;padding:10px 12px;background:rgba(0,0,0,0.2);border-left:2px solid var(--n-${c});border-radius:4px">
        <div style="font-family:var(--font-mono);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:var(--n-${c})">${icon} ${cycle.body}</div>`;
      if (cycle.synodic_period_days || cycle.synodic_period_days_jupiter) {
        const period = cycle.synodic_period_days
          ? `синодический период: ${cycle.synodic_period_days} дн.${cycle.maya_approximation ? ' → майя: ' + cycle.maya_approximation + ' дн.' : ''}`
          : `Юпитер: ${cycle.synodic_period_days_jupiter} дн. · Сатурн: ${cycle.synodic_period_days_saturn} дн.`;
        html += `<div style="font-size:11px;color:var(--ink-faint);margin-top:3px">${period}</div>`;
      }
      html += `<ul style="margin:8px 0 0 0;padding-left:16px;font-size:12px;color:var(--ink-mid)">`;
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

    html += `<div style="margin-top:12px;font-size:10px;color:var(--ink-faint);line-height:1.5">
      Источники: ${ac.sources.join(' · ')}
    </div>
  </div>`;
  }

  return html;
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
  const kin = dreamspellKin(currentDate);
  const { tone, seal } = kinToToneSeal(kin);
  const card = document.getElementById('card');
  renderNav();

  switch (currentTab) {
    case 'main':
      card.innerHTML = renderMain(kin, tone, seal)
        + renderOracle(kin)
        + renderWave(kin, tone)
        + renderMoon();
      break;
    case 'cycles':
      if (cyclesKin === null) cyclesKin = kin;
      card.innerHTML = renderCycles(cyclesKin);
      requestAnimationFrame(positionCycleMarkers);
      break;
    case 'tzolkin': card.innerHTML = renderTzolkin(kin); break;
    case 'personal': card.innerHTML = renderPersonal(); break;
    case 'maya': card.innerHTML = renderMayaClassic(); break;
  }

  // Bind dynamic events after render
  bindCardEvents(kin, tone, seal);

  // Draw pulsar canvas (wave tab)
  if (currentTab === 'main') {
    requestAnimationFrame(() => drawPulsarCanvas(tone));
  }
}

/* ── Dynamic event binding ── */
function bindCardEvents(kin, tone, seal) {
  const card = document.getElementById('card');

  // Share button
  card.querySelectorAll('[data-action="share-kin"]').forEach(el => {
    el.addEventListener('click', () => { haptic('medium'); shareKin(); });
  });

  // Status badge popups
  card.querySelectorAll('[data-action="gap-info"]').forEach(el => {
    el.addEventListener('click', () => showInfoPopup('ПОРТАЛЫ ГАП', `<p class="pp-intro">${dsTexts?.gap_portals?.description || ''}</p>`));
  });
  card.querySelectorAll('[data-action="gate-info"]').forEach(el => {
    el.addEventListener('click', () => showInfoPopup('МАГНИТНЫЕ ВРАТА', `<p class="pp-intro">${dsTexts?.tzolkin_legend?.magnetic_gates?.popup || ''}</p>`));
  });
  card.querySelectorAll('[data-action="sp-info"]').forEach(el => {
    el.addEventListener('click', () => showInfoPopup('СПЕКТРАЛЬНЫЙ ПОЛЯРНЫЙ КИН', `<p class="pp-intro">${dsTexts?.tzolkin_legend?.spectral_polar?.popup || ''}</p>`));
  });
  card.querySelectorAll('[data-action="harm-info"]').forEach(el => {
    el.addEventListener('click', () => {
      const h = dsTexts?.harmonics;
      showInfoPopup('ГАРМОНИКИ', `<p class="pp-intro">${h?.intro || ''}</p><div class="pp-props">${(h?.phases || []).map((p, i) => `▸ ДЕНЬ ${i+1}: ${p}`).join('<br>')}</div>`);
    });
  });

  // Kin search
  const searchInput = document.getElementById('kin-search-input');
  const searchGo = document.getElementById('kin-search-go');
  if (searchInput && searchGo) {
    const goToKin = () => {
      const n = parseInt(searchInput.value, 10);
      if (n >= 1 && n <= 260) {
        haptic('light');
        navigateToDate(dateForKin(n));
      }
    };
    searchGo.addEventListener('click', goToKin);
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') goToKin(); });
  }

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

  // Personal tab: cross cell & row clicks show popup
  const personalRoles = { guide: 0, analog: 2, antipode: 1, hidden: 3 };
  card.querySelectorAll('[data-popup-kin]').forEach(el => {
    el.addEventListener('click', () => {
      const k = +el.dataset.popupKin;
      const area = el.dataset.popupArea;
      if (area === 'main') return;
      const ri = personalRoles[area] ?? personalRoles[area === 'anti' ? 'antipode' : area];
      showKinPopup(k, ri !== undefined ? ORACLE_ROLES[ri] : null);
    });
  });

  // Oracle: cross cell clicks show popup
  const roleAreaMap = { guide: 0, anti: 1, analog: 2, hidden: 3 };
  card.querySelectorAll('.oracle-cell[data-oracle-role]').forEach(el => {
    el.addEventListener('click', () => {
      const area = el.dataset.oracleRole;
      if (area === 'main') return;
      const curKin = dreamspellKin(currentDate);
      const o = oracle(curKin);
      const kinMap = { guide: o.guide, anti: o.antipode, analog: o.analog, hidden: o.hidden };
      showKinPopup(kinMap[area], ORACLE_ROLES[roleAreaMap[area]]);
    });
  });

  // Oracle: row clicks show popup
  card.querySelectorAll('.oracle-row[data-oracle-kin]').forEach(el => {
    el.addEventListener('click', () => {
      const targetKin = +el.dataset.oracleKin;
      const area = el.dataset.oracleRow;
      showKinPopup(targetKin, ORACLE_ROLES[roleAreaMap[area]]);
    });
  });

  // Wave tab: kin row clicks — navigate and scroll to top
  card.querySelectorAll('.wave-kin-row[data-wave-kin]').forEach(el => {
    el.addEventListener('click', () => {
      const targetKin = +el.dataset.waveKin;
      const d = dateForKin(targetKin);
      navigateToDate(d);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Tzolkin tab: cell clicks
  card.querySelectorAll('.tzolkin-cell[data-tz-kin]').forEach(el => {
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
      try { strip.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });

    strip.addEventListener('pointermove', (e) => {
      if (!cellW) return;
      const dx = e.clientX - startX;
      const rawDelta = Math.round((dx / cellW) * unit);
      let newKin = ((startKin + rawDelta - 1) % 260 + 260) % 260 + 1;
      if (newKin !== cyclesKin) {
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
        if (unit !== 1) haptic('medium');
        updateCyclesActive(); // full update with all strips
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
      const dateInput = document.getElementById('birth-date-input');
      const textInput = document.getElementById('birth-text-input');
      let dateVal = dateInput?.value;
      if ((!dateVal || dateVal === '1990-01-01') && textInput?.value.trim()) {
        const raw = textInput.value.trim().replace(/\//g, '.').replace(/-/g, '.');
        const parts = raw.split('.');
        if (parts.length === 3) {
          let [a, b, c] = parts.map(Number);
          const iso = c > 100 ? `${c}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`
                              : `${a}-${String(b).padStart(2,'0')}-${String(c).padStart(2,'0')}`;
          const parsed = new Date(iso);
          if (!isNaN(parsed.getTime())) dateVal = iso;
        }
      }
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
      const bDateStr = localStorage.getItem('birthDate');
      if (bDateStr) {
        const [y, m, d] = bDateStr.split('-').map(Number);
        const bKin = dreamspellKin(new Date(y, m - 1, d));
        const d2 = dateForKin(bKin);
        navigateToDate(d2);
        switchTab('main');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  // Personal tab: oracle cross popup handlers
  const roleMap = { guide: 0, anti: 1, analog: 2, hidden: 3 };
  card.querySelectorAll('[data-popup-kin]').forEach(el => {
    el.addEventListener('click', () => {
      const area = el.dataset.popupArea;
      if (area === 'main') return;
      const targetKin = +el.dataset.popupKin;
      showKinPopup(targetKin, ORACLE_ROLES[roleMap[area]]);
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
      <h3><span class="dot" style="background:var(--n-amber);box-shadow:0 0 8px var(--n-amber)"></span>ДАННЫЕ</h3>
      <div style="margin-top:10px;font-family:var(--font-mono);font-size:12px;letter-spacing:0.06em;color:var(--ink-dim)">
        ${birthDate ? `<p>▸ ДАТА РОЖДЕНИЯ: ${birthDate}</p>` : '<p>▸ ДАТА РОЖДЕНИЯ: не задана</p>'}
      </div>
      ${birthDate ? `<button id="stg-clear-birth" style="margin-top:10px;font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;padding:6px 14px;border:1px solid var(--hairline-2);border-radius:20px;background:none;color:var(--ink-faint);cursor:pointer">🗑 СБРОСИТЬ ДАТУ РОЖДЕНИЯ</button>` : ''}
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
      renderSettings();
    });
  }
}

function showSettingsModal() {
  haptic('selection');
  document.getElementById('settings-modal').style.display = 'flex';
  renderSettings();
}

function closeSettingsModal() {
  document.getElementById('settings-modal').style.display = 'none';
}

/* ── Setup permanent events ── */
function setupEvents() {
  // Run vibration self-test once on first user gesture
  document.addEventListener('pointerdown', runVibSelfTest, { once: true });

  document.getElementById('today-btn').addEventListener('click', () => {
    currentDate = new Date();
    cyclesKin = null;
    if (currentTab !== 'main') switchTab('main');
    else render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.getElementById('prev').addEventListener('click', () => {
    haptic('light');
    currentDate = addDays(currentDate, -1);
    cyclesKin = (currentTab === 'cycles') ? dreamspellKin(currentDate) : null;
    render();
  });
  document.getElementById('next').addEventListener('click', () => {
    haptic('light');
    currentDate = addDays(currentDate, 1);
    cyclesKin = (currentTab === 'cycles') ? dreamspellKin(currentDate) : null;
    render();
  });

  const datePicker = document.getElementById('date-picker');
  document.getElementById('date-display').addEventListener('click', () => {
    datePicker.value = currentDate.toISOString().slice(0, 10);
    datePicker.showPicker?.() || datePicker.click();
  });
  datePicker.addEventListener('change', () => {
    if (datePicker.value) {
      const [y, m, d] = datePicker.value.split('-').map(Number);
      currentDate = new Date(y, m - 1, d);
      cyclesKin = null;
      render();
    }
  });

  // Tab buttons
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => { haptic('selection'); switchTab(btn.dataset.tab); });
  });

  // My Kin button (header) → switch to personal tab
  document.getElementById('my-kin-btn').addEventListener('click', () => switchTab('personal'));

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', showSettingsModal);
  document.getElementById('settings-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('settings-modal')) closeSettingsModal();
  });

  // Music button: click = toggle, long press (600ms) = vibration test
  const musicBtn = document.getElementById('music-btn');
  let musicLongTimer = null;
  musicBtn.addEventListener('pointerdown', () => {
    musicLongTimer = setTimeout(() => { musicLongTimer = null; testVibration(); }, 600);
  });
  musicBtn.addEventListener('pointerup', () => {
    if (musicLongTimer) { clearTimeout(musicLongTimer); musicLongTimer = null; toggleMusic(); }
  });
  musicBtn.addEventListener('pointercancel', () => { clearTimeout(musicLongTimer); musicLongTimer = null; });

  // Close popup on overlay click or ESC
  document.getElementById('kin-popup').addEventListener('click', (e) => {
    if (e.target === document.getElementById('kin-popup')) closeKinPopup();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('kin-popup').style.display !== 'none') closeKinPopup();
    else if (document.getElementById('settings-modal').style.display !== 'none') closeSettingsModal();
  });

  // Swipe navigation
  const card = document.getElementById('card');
  let startX = 0;
  card.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  card.addEventListener('touchend', e => {
    if (currentTab === 'tzolkin' || currentTab === 'cycles') return;
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 60) { haptic('light'); currentDate = addDays(currentDate, diff > 0 ? -1 : 1); cyclesKin = null; render(); }
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

  const dots = Array.from({ length: 65 }, () => ({
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

/* ── Init ── */
async function init() {
  initParticles();
  await loadData();
  setupEvents();
  render();
}

init();
