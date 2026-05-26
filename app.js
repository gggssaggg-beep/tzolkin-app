import {
  dreamspellKin, kinToToneSeal, kinFromToneSeal, oracle, wavespell, castle,
  isDayOutOfTime, SEAL_COLORS, COLOR_RU, CASTLE_NAMES, CASTLE_HINTS,
  getMoon, yearBearer, pulsar,
} from './tzolkin.js';

let sealsData, tonesData, kinsData;
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
    <div class="seal-badge ${color} c-${color}" style="width:64px;height:64px;margin:0 auto 6px">
      ${sealImg(seal, 52, true)}
    </div>
    <div style="margin-bottom:4px">${toneImg(tone, 28)}</div>
    <div class="kin-num c-${color}" style="font-size:24px">${kin}${gap ? '<span class="gap-badge">ГАП</span>' : ''}</div>
    <div class="display" style="font-size:11px;margin-top:4px">${info?.title || ''}</div>`;
  if (roleInfo) {
    html += `<div class="eyebrow" style="margin-top:6px;color:var(--n-cyan)">${roleInfo.name}</div>
      <div style="font-size:11px;color:var(--ink-faint);margin-top:2px;font-style:italic">${roleInfo.desc}</div>`;
  }
  html += `</div>
    <div class="hr"></div>
    <div style="font-size:12px;line-height:1.7;color:var(--ink-dim)">
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
function haptic(strength = 'light') {
  const ms = { light: 50, medium: 100, heavy: 150, selection: 30 }[strength] ?? 50;
  try { navigator.vibrate?.(ms); } catch (_) {}
  try {
    const hf = window.Telegram?.WebApp?.HapticFeedback;
    if (hf) {
      if (strength === 'selection') hf.selectionChanged();
      else hf.impactOccurred(strength);
    }
  } catch (_) {}
}

/* ── Vibration diagnostics toast ── */
let _toastTimer = null;
function showVibToast(msg) {
  let el = document.getElementById('vib-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'vib-toast';
    el.className = 'vib-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

function testVibration() {
  const tg = window.Telegram?.WebApp;
  const hasTgData = !!tg?.initData;
  const platform = tg?.platform || '—';
  const hasVibApi = 'vibrate' in navigator;
  // fire strong pattern: on-off-on
  let vibResult = false;
  try { vibResult = navigator.vibrate?.([150, 80, 150]) ?? false; } catch (_) {}
  try { tg?.HapticFeedback?.impactOccurred('heavy'); } catch (_) {}
  showVibToast(
    `vibrate API: ${hasVibApi ? 'есть' : 'нет'}\n` +
    `vibrate() → ${vibResult}\n` +
    `Telegram: ${hasTgData ? 'да' : 'нет'} · ${platform}`
  );
}

/* ── Ambient music ── */
let audioCtx = null;
let musicPlaying = false;
let musicGain = null;

function startAmbient() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const master = audioCtx.createGain();
  master.gain.value = 0;
  const comp = audioCtx.createDynamicsCompressor();
  master.connect(comp);
  comp.connect(audioCtx.destination);
  musicGain = master;
  // Solfeggio 174 Hz drone + harmonics
  [[174, 0.45], [261, 0.11], [348, 0.07], [87, 0.18]].forEach(([f, v]) => {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    const g = audioCtx.createGain();
    g.gain.value = v;
    osc.connect(g);
    g.connect(master);
    osc.start();
  });
}

function toggleMusic() {
  const btn = document.getElementById('music-btn');
  if (!audioCtx) startAmbient();
  if (!musicPlaying) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, audioCtx.currentTime);
    musicGain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 2.5);
    musicPlaying = true;
    btn.classList.add('playing');
    btn.textContent = '♪';
  } else {
    musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, audioCtx.currentTime);
    musicGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
    musicPlaying = false;
    btn.classList.remove('playing');
    btn.textContent = '♫';
  }
}

/* ── Data loading ── */
async function loadData() {
  const [s, t, k] = await Promise.all([
    fetch('data/seals.json').then(r => r.json()),
    fetch('data/tones.json').then(r => r.json()),
    fetch('data/kin_descriptions.json').then(r => r.json()),
  ]);
  sealsData = {};
  for (const [id, val] of Object.entries(s.seals)) sealsData[+id] = val;
  tonesData = {};
  for (const [id, val] of Object.entries(t.tones)) tonesData[+id] = val;
  kinsData = k.kins;
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
  render();
}

let previousTab = 'main';

function switchTab(tab) {
  if (currentTab !== 'personal') previousTab = currentTab;
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  currentTab = tab;
  render();
}

function closeMyKinModal() {
  document.getElementById('my-kin-modal').style.display = 'none';
  if (currentTab === 'personal') switchTab(previousTab);
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
      <div class="seal-badge ${color} c-${color}">${sealImg(seal, 80, true)}</div>
      <div class="tone-above">${toneImg(tone, 36)}</div>
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
    </div>
  </div>`;

  // Seal detail block
  html += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-${color});box-shadow:0 0 8px var(--n-${color})"></span>
      ПЕЧАТЬ — ${sealImg(seal, 20)} ${sealInfo.name_ru} · ${sealInfo.name_maya}</h3>
    <div style="margin-top:12px;font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-dim)">
      <p>▸ СУТЬ: ${sealInfo.essence_ru}</p>
      <p>▸ СИЛА: ${sealInfo.power_ru}</p>
      <p>▸ ДЕЙСТВИЕ: ${sealInfo.action_ru}</p>
      ${sealInfo.chakra_ru ? `<p>▸ ЧАКРА: ${sealInfo.chakra_ru}</p>` : ''}
      ${sealInfo.direction_action_ru ? `<p>▸ ${sealInfo.direction_action_ru}</p>` : ''}
      ${sealInfo.earth_family_action_ru ? `<p>▸ ${sealInfo.earth_family_action_ru}</p>` : ''}
    </div>
    ${sealInfo.keywords?.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">
      ${sealInfo.keywords.map(kw => `<span style="font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:0.08em;padding:3px 9px;border:1px solid var(--hairline-2);border-radius:20px;color:var(--ink-dim)">${kw}</span>`).join('')}
    </div>` : ''}
    ${sealInfo.description_ru ? `<p>${sealInfo.description_ru}</p>` : ''}
  </div>`;

  // Tone detail block
  html += `<div class="detail-section">
    <h3><span class="dot" style="background:var(--n-cyan);box-shadow:0 0 8px var(--n-cyan)"></span>
      ТОН ${tone} — ${toneImg(tone, 20)} ${toneInfo.name_ru}</h3>
    <div style="margin-top:12px;font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-dim)">
      ${toneInfo.function_ru ? `<p>▸ ФУНКЦИЯ: ${toneInfo.function_ru}</p>` : ''}
      ${toneInfo.creative_power_ru ? `<p>▸ ТВОРЧЕСКАЯ СИЛА: ${toneInfo.creative_power_ru}</p>` : ''}
      ${toneInfo.action_ru ? `<p>▸ ДЕЙСТВИЕ: ${toneInfo.action_ru}</p>` : ''}
    </div>
    ${toneInfo.description_ru ? `<p>${toneInfo.description_ru}</p>` : ''}
    ${toneInfo.question_ru ? `<div class="question-block" style="margin-top:12px"><div class="q">❓ ${toneInfo.question_ru}</div></div>` : ''}
  </div>`;

  // Affirmation with bracket frame
  const affLines = (info.affirmation || '').split('\n').filter(l => l.trim());
  html += `<div class="affirmation bracket-frame c-cyan">
    <div class="br-tr"></div><div class="br-bl"></div>
    <div class="aff-header">
      <span class="eyebrow c-cyan">▸ ДЕВИЗ ДНЯ</span>
      <span class="eyebrow muted">КИН · ${kin}</span>
    </div>
    <div class="aff-body">`;
  for (const line of affLines) {
    html += `<div><span class="aff-prefix">&gt; </span><span class="aff-line">${line.trim()}</span></div>`;
  }
  html += `<div class="aff-prefix">&gt; <span class="blink">_</span></div>
    </div>
  </div>`;

  const summary = info.summary || '';
  if (summary)
    html += `<div class="detail-section"><h3><span class="dot" style="background:var(--n-amber);box-shadow:0 0 8px var(--n-amber)"></span> АРХЕТИП</h3><p>${summary}</p></div>`;

  return html;
}

/* ── Tab: Oracle ── */
function renderOracle(kin) {
  const o = oracle(kin);
  function cell(k, role, area) {
    const { seal } = kinToToneSeal(k);
    const c = sealColor(seal);
    const isBig = area === 'main';
    return `<div class="oracle-cell c-${c} ${isBig ? 'main' : ''}" style="grid-area:${area}" data-oracle-role="${area}">
      <div class="role">${role}</div>
      <div class="seal-icon">${sealImg(seal, isBig ? 48 : 32, true)}</div>
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
      ${cell(o.hidden, 'ОККУЛЬТНЫЙ', 'hidden')}
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
    <p class="section-intro">Год из 13 лун по 28 дней. Каждая луна = 4 недели. Начало года — 26 июля.</p>
    <p class="section-intro">${m.moonName}</p>
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
    <p>Кин ${yb.kin} · ${yb.yearStart.getDate()}.${String(yb.yearStart.getMonth() + 1).padStart(2, '0')}.${yb.yearStart.getFullYear()} — 24.07.${yb.yearStart.getFullYear() + 1}</p>
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

  let html = `<div class="kin-card">
    <h3 class="card-title"><span class="dot"></span> ВОЛНА ${wave} — ${sealImg(waveSeal, 22)} ${wsi.name_ru}</h3>
    <div style="margin-top:12px;font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-dim)">
      <p>▸ СИЛА: ${wsi.power_ru}</p>
      <p>▸ ДЕЙСТВИЕ: ${wsi.action_ru}</p>
      <p>▸ СЕГОДНЯ ДЕНЬ ${pos} ИЗ 13</p>
    </div>
    <p>Волна — 13-дневный цикл с единой темой. Всего 20 волн.</p>
  </div>
  <div class="detail-section">
    <h3><span class="dot" style="background:var(--n-amber);box-shadow:0 0 8px var(--n-amber)"></span> ЗАМОК ${cast} — ${CASTLE_NAMES[cast]}</h3>
    <div style="margin-top:12px;font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-dim)">
      <p>▸ ${CASTLE_HINTS[cast].replace(' — ', '</p><p>▸ ')}</p>
      <p>▸ ЗАМОК ${cast} ИЗ 5 · ВОЛНЫ ${(cast - 1) * 4 + 1}–${cast * 4}</p>
    </div>
    <p>Замок — большой 52-дневный цикл из 4 волн. Всего 5 замков.</p>
  </div>
  <div class="detail-section">
    <h3><span class="dot" style="background:var(--n-red);box-shadow:0 0 8px var(--n-red)"></span> ПУЛЬСАР: ${p.name}</h3>
    <div style="margin-top:12px;font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-dim)">
      <p>▸ ${p.hint}</p>
    </div>
    <p>Пульсар — ритм внутри волны: какое измерение активно сегодня.</p>
  </div>`;

  // 13 kins of wave
  html += `<div class="kin-card"><h3 class="card-title"><span class="dot"></span> КИНЫ ВОЛНЫ</h3><div style="margin-top:8px">`;
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
      <div class="c-${color}" style="width:80px;height:80px;flex-shrink:0;display:grid;place-items:center">
        ${sealImg(seal, 72, true)}
      </div>
      <div style="flex:1;min-width:0">
        <div class="eyebrow">КИН · ${kin} / 260</div>
        <div class="kin-num c-${color}" style="font-size:44px;margin-top:2px">${kin}</div>
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
    <div style="font-family:var(--font-mono);font-size:9px;color:var(--ink-faint);letter-spacing:0.24em;margin-top:8px;text-transform:uppercase">← СВАЙПНИ ЛЮБУЮ ПОЛОСУ →</div>
  </div>`;

  // Castle strip (5 cells)
  html += `<div class="cycle-strip c-${castleColors[castIdx]}">
    <div class="cycle-strip-header">
      <span class="eyebrow">ЗАМОК</span>
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
    <div class="cycle-strip-header">
      <span class="eyebrow">ВОЛНА</span>
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
    <div class="cycle-strip-header">
      <span class="eyebrow">ПУЛЬСАР · ТОН</span>
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
      <div class="c-${color}" style="width:80px;height:80px;flex-shrink:0;display:grid;place-items:center">
        ${sealImg(seal, 72, true)}
      </div>
      <div style="flex:1;min-width:0">
        <div class="eyebrow">КИН · ${kin} / 260</div>
        <div class="kin-num c-${color}" style="font-size:44px;margin-top:2px">${kin}</div>
        <div class="display" style="font-size:10px;margin-top:6px;opacity:0.85">
          ЗАМОК ${castNum} · ВОЛНА ${waveInCastle + 1} · ТОН ${tone}
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
      <span title="Galactic Activation Portal — день усиленной галактической энергии. 52 дня из 260."><span class="legend-swatch" style="background:oklch(0.55 0.14 155)"></span>ГАП <span class="legend-hint">ⓘ</span></span>
      <span title="Мистическая колонка — 7-й столбец Цолькина (тон 7). 20 дней зеркальной симметрии."><span class="legend-swatch" style="background:rgba(120,100,160,0.4)"></span>Мист. <span class="legend-hint">ⓘ</span></span>
    </div>
    <p class="section-intro" style="margin-top:8px">ГАП (Galactic Activation Portal) — 52 дня усиленной галактической энергии. Мист. — Мистическая колонка, 7-й столбец Цолькина: 20 дней зеркальной симметрии.</p>
  </div>`;

  html += `<div class="tzolkin-grid-wrapper"><div class="tzolkin-grid">`;

  for (let seal = 1; seal <= 20; seal++) {
    html += `<div class="tzolkin-row-header">${sealImg(seal, 18)}</div>`;
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
      let cls = `tzolkin-cell ${colorCls}`;
      if (isCurrent) cls += ' current-kin';
      if (isBirth) cls += ' birth-kin';
      html += `<div class="${cls}" data-tz-kin="${k}" title="Кин ${k}">${mayaDots(tone)}<span class="tz-kin-num">${k}</span></div>`;
    }
  }

  html += `</div></div>`;
  return html;
}

/* ── Personal kin modal ── */
function renderMyKinContent() {
  const modal = document.getElementById('my-kin-content');
  const birthDateStr = localStorage.getItem('birthDate');

  if (!birthDateStr) {
    modal.innerHTML = `
      <h3 class="card-title"><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span> МОЙ КИН СУДЬБЫ</h3>
      <p style="color:var(--ink-faint);margin-bottom:12px;font-size:13px;line-height:1.5">Укажите дату рождения, чтобы узнать свой Кин Судьбы и связь с текущим днём.</p>
      <div class="birth-input-group">
        <input type="date" id="birth-date-input">
        <button id="birth-save-btn">OK</button>
      </div>`;
    return;
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
    connections.push({ icon: '🌀', text: `Одна Волна — ${bWave}. Общая 13-дневная тема.` });
  }
  if (bCastle === tCastle) {
    connections.push({ icon: '🏰', text: `Один Замок — ${CASTLE_NAMES[bCastle]?.split(' ')[0]}. Общий 52-дневный цикл.` });
  }
  // Oracle relationships
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

  modal.innerHTML = `
    <h3 class="card-title"><span class="dot" style="background:var(--n-violet);box-shadow:0 0 8px var(--n-violet)"></span> МОЙ КИН</h3>
    <div style="text-align:center;margin-bottom:14px">
      <div class="seal-badge ${bColor} c-${bColor}" style="width:80px;height:80px;margin:0 auto 8px">
        ${sealImg(bSeal, 68, true)}
      </div>
      <div style="margin-bottom:4px">${toneImg(bTone, 32)}</div>
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
    <h3 class="card-title" style="font-size:11px"><span class="dot" style="background:var(--n-red);box-shadow:0 0 8px var(--n-red)"></span> КРЕСТ СУДЬБЫ</h3>
    <p class="section-intro" style="margin-bottom:8px">Четыре энергии вашего Кина. Нажмите на элемент для подробностей.</p>
    <div class="oracle-cross" style="margin:0 0 14px;gap:6px">
      ${(() => {
        function mcell(k, role, area) {
          const { seal: s } = kinToToneSeal(k);
          const c = sealColor(s);
          const isBig = area === 'main';
          return '<div class="oracle-cell c-' + c + (isBig ? ' main' : '') + '" style="grid-area:' + area + ';padding:8px 2px" data-popup-kin="' + k + '" data-popup-area="' + area + '"><div class="role">' + role + '</div><div class="seal-icon">' + sealImg(s, isBig ? 36 : 24, true) + '</div><div class="kin-num-cell" style="font-size:' + (isBig ? 15 : 12) + 'px">' + k + '</div></div>';
        }
        return mcell(bOracle.guide, 'УПРАВИТЕЛЬ', 'guide')
          + mcell(bOracle.antipode, 'АНТИПОД', 'anti')
          + mcell(bKin, 'МОЙ КИН', 'main')
          + mcell(bOracle.analog, 'АНАЛОГ', 'analog')
          + mcell(bOracle.hidden, 'ОККУЛЬТНЫЙ', 'hidden');
      })()}
    </div>
    <h3 class="card-title" style="font-size:11px"><span class="dot" style="background:var(--n-cyan);box-shadow:0 0 8px var(--n-cyan)"></span> СВЯЗЬ С ТЕКУЩИМ ДНЁМ</h3>
    <div class="connection-list">
      ${connections.map(c => `<div class="connection-item"><span class="connection-icon">${c.icon}</span><span class="connection-text">${c.text}</span></div>`).join('')}
    </div>
    <div class="spread" style="margin-top:14px">
      <span class="eyebrow">СЛЕДУЮЩИЙ ВАШ КИН</span>
      <span class="display" style="font-size:12px">${formatDateRu(nextDate).toUpperCase()}</span>
    </div>
    <button class="birth-clear-btn" id="birth-clear-btn">СБРОСИТЬ ДАТУ РОЖДЕНИЯ</button>
    <br>
    <button class="modal-close" id="my-kin-close">✕ ЗАКРЫТЬ</button>`;
}

function showMyKinModal() {
  const modal = document.getElementById('my-kin-modal');
  modal.style.display = 'flex';
  renderMyKinContent();

  // Defer event binding
  setTimeout(() => {
    const saveBtn = document.getElementById('birth-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const input = document.getElementById('birth-date-input');
        if (input.value) {
          localStorage.setItem('birthDate', input.value);
          renderMyKinContent();
          // Re-bind after re-render
          setTimeout(() => bindMyKinEvents(), 0);
        }
      });
    }
    bindMyKinEvents();
  }, 0);
}

function bindMyKinEvents() {
  const closeBtn = document.getElementById('my-kin-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeMyKinModal);
  }
  const clearBtn = document.getElementById('birth-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      localStorage.removeItem('birthDate');
      renderMyKinContent();
      setTimeout(() => bindMyKinEvents(), 0);
    });
  }
  // Destiny cross popup handlers
  const roleMap = { guide: 0, anti: 1, analog: 2, hidden: 3 };
  document.querySelectorAll('#my-kin-content [data-popup-kin]').forEach(el => {
    el.addEventListener('click', () => {
      const area = el.dataset.popupArea;
      if (area === 'main') return;
      const targetKin = +el.dataset.popupKin;
      showKinPopup(targetKin, ORACLE_ROLES[roleMap[area]]);
    });
  });
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
    case 'personal': showMyKinModal(); card.innerHTML = ''; break;
  }

  // Bind dynamic events after render
  bindCardEvents(kin, tone, seal);
}

/* ── Dynamic event binding ── */
function bindCardEvents(kin, tone, seal) {
  const card = document.getElementById('card');

  // Main tab: ВОЛНА popup
  card.querySelectorAll('[data-action="wave-popup"]').forEach(el => {
    el.addEventListener('click', () => {
      const curKin = dreamspellKin(currentDate);
      const { tone: curTone } = kinToToneSeal(curKin);
      const wave = wavespell(curKin);
      const waveFirst = (wave - 1) * 13 + 1;
      const { seal: waveSeal } = kinToToneSeal(waveFirst);
      const wsi = sealsData[waveSeal];
      const pos = (curKin - 1) % 13 + 1;
      const p = pulsar(curTone);
      showInfoPopup(`ВОЛНА ${wave} — ${wsi.name_ru}`,
        `<div style="font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;line-height:2;color:var(--ink-dim)">
          <p class="section-intro" style="text-transform:none">Волна — 13-дневный цикл с единой темой. Всего 20 волн в цикле Цолькин.</p>
          <p style="margin-top:8px">▸ СИЛА: ${wsi.power_ru}</p>
          <p>▸ ДЕЙСТВИЕ: ${wsi.action_ru}</p>
          <p>▸ ПОЗИЦИЯ: ДЕНЬ ${pos} ИЗ 13</p>
          <p>▸ ПУЛЬСАР: ${p.name} — ${p.hint}</p>
        </div>`);
    });
  });

  // Main tab: ЗАМОК popup
  card.querySelectorAll('[data-action="castle-popup"]').forEach(el => {
    el.addEventListener('click', () => {
      const curKin = dreamspellKin(currentDate);
      const cast = castle(curKin);
      showInfoPopup(`ЗАМОК ${cast} — ${CASTLE_NAMES[cast]}`,
        `<div style="font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.06em;line-height:2;color:var(--ink-dim)">
          <p class="section-intro" style="text-transform:none">Замок — большой 52-дневный цикл из 4 волн. Всего 5 замков.</p>
          <p style="margin-top:8px">▸ ${CASTLE_HINTS[cast].replace(' — ', '</p><p>▸ ')}</p>
          <p>▸ ЗАМОК ${cast} ИЗ 5 · ВОЛНЫ ${(cast - 1) * 4 + 1}–${cast * 4}</p>
        </div>`);
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
        body = `<div style="font-family:var(--font-mono);font-size:13px;letter-spacing:0.06em;line-height:1.8;color:var(--ink-dim)">
          <p class="section-intro" style="text-transform:none;font-family:var(--font-body)">13-лунный год: 13 лун по 28 дней. Год начинается 26 июля.</p>
          <p style="margin-top:10px;text-transform:uppercase">▸ ЛУНА ${m.moonNumber} ИЗ 13</p>
          <p style="text-transform:none;font-size:12px;color:var(--ink-faint);margin-top:4px">${m.moonName}</p>
        </div>`;
      } else if (type === 'day') {
        title = `ДЕНЬ ${m.moonDay} ЛУННОГО МЕСЯЦА`;
        body = `<div style="font-family:var(--font-mono);font-size:13px;letter-spacing:0.06em;line-height:1.8;color:var(--ink-dim)">
          <p class="section-intro" style="text-transform:none;font-family:var(--font-body)">Каждая луна — 28 дней, 4 недели по 7 дней.</p>
          <p style="margin-top:10px;text-transform:uppercase">▸ ДЕНЬ ${m.moonDay} ИЗ 28</p>
          <p style="text-transform:uppercase">▸ НЕДЕЛЯ ${m.heptad} — ${m.heptadColor}</p>
        </div>`;
      } else if (type === 'week') {
        title = `ГЕПТАДА ${m.heptad} — ${m.heptadColor}`;
        body = `<div style="font-family:var(--font-mono);font-size:13px;letter-spacing:0.06em;line-height:1.8;color:var(--ink-dim)">
          <p class="section-intro" style="text-transform:none;font-family:var(--font-body)">Гептада — 7-дневная неделя внутри луны. 4 гептады в каждой луне.</p>
          <p style="margin-top:10px;text-transform:uppercase">▸ ГЕПТАДА ${m.heptad} ИЗ 4</p>
          <p style="text-transform:uppercase">▸ ЦВЕТ НЕДЕЛИ: ${m.heptadColor}</p>
        </div>`;
      } else if (type === 'plasma') {
        title = `ПЛАЗМА: ${m.plasma.name}`;
        body = `<div style="font-family:var(--font-mono);font-size:13px;letter-spacing:0.06em;line-height:1.8;color:var(--ink-dim)">
          <p class="section-intro" style="text-transform:none;font-family:var(--font-body)">Плазма — ежедневная энергетическая практика. 7 плазм чередуются каждую неделю.</p>
          <p style="margin-top:10px;text-transform:uppercase">▸ ЧАКРА: ${m.plasma.chakra}</p>
          <p style="text-transform:none;font-size:12px;color:var(--ink-faint);margin-top:6px">${m.plasma.hint}</p>
        </div>`;
      }
      if (title && body) showInfoPopup(title, body);
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
}

/* ── Setup permanent events ── */
function setupEvents() {
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

  // My Kin button
  document.getElementById('my-kin-btn').addEventListener('click', showMyKinModal);

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

  // Close modal/popup on overlay click or ESC
  document.getElementById('my-kin-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('my-kin-modal')) closeMyKinModal();
  });
  document.getElementById('kin-popup').addEventListener('click', (e) => {
    if (e.target === document.getElementById('kin-popup')) closeKinPopup();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('kin-popup').style.display !== 'none') closeKinPopup();
    else if (document.getElementById('my-kin-modal').style.display !== 'none') closeMyKinModal();
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
