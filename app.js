import {
  dreamspellKin, kinToToneSeal, oracle, wavespell, castle,
  isDayOutOfTime, SEAL_COLORS, COLOR_RU, CASTLE_NAMES, CASTLE_HINTS,
  getMoon, yearBearer, pulsar,
} from './tzolkin.js';

let sealsData, tonesData, kinsData;
let currentDate = new Date();
let currentTab = 'main';
let birthDate = null;

const MONTHS_RU = [
  'января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря',
];
const DAYS_RU = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];

const SEAL_EMOJI = [
  '','🐉','💨','🌙','🌱','🐍','💀','✋','⭐','🌊','🐕',
  '🐒','🧑','🏠','🔮','🦅','⚔️','🌏','🔪','🌧️','☀️',
];

const ORACLE_ROLES = [
  {key:'guide',    arrow:'↑', name:'Управитель',        desc:'Направляет и усиливает энергию дня.'},
  {key:'antipode', arrow:'←', name:'Антипод',            desc:'Вызов и противоположная сила — источник роста.'},
  {key:'analog',   arrow:'→', name:'Аналог',             desc:'Союзник, дополняющий основную энергию.'},
  {key:'hidden',   arrow:'↓', name:'Оккультный учитель', desc:'Скрытая сила, раскрывающаяся через принятие тени.'},
];

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

function formatDateRu(d) {
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function sealColor(seal) { return COLOR_RU[SEAL_COLORS[seal]]; }

function renderNav() {
  const el = document.getElementById('date-display');
  const today = new Date();
  const isToday = currentDate.toDateString() === today.toDateString();
  el.innerHTML = `
    <div class="day">${isToday ? 'Сегодня' : DAYS_RU[currentDate.getDay()]}</div>
    <div class="full">${formatDateRu(currentDate)}</div>`;
}

// ── Tab: Main ──
function renderMain(kin, tone, seal) {
  const info = kinsData[String(kin)];
  const sealInfo = sealsData[seal];
  const toneInfo = tonesData[tone];
  const color = sealColor(seal);
  const wave = wavespell(kin);
  const cast = castle(kin);
  const waveSeal = kinToToneSeal((wave - 1) * 13 + 1).seal;

  let html = '';

  if (isDayOutOfTime(currentDate))
    html += `<div class="doot-banner">⏳ День вне Времени</div>`;

  if (tone === 1)
    html += `<div class="wave-banner"><div class="emoji">🌀</div>
      <div class="text">Начинается Волна ${wave} — ${sealInfo.name_ru}</div></div>`;

  html += `<div class="kin-card">
    <div class="kin-header">
      <div class="seal-badge ${color}">${SEAL_EMOJI[seal]}</div>
      <div class="kin-number" style="color:var(--${color})">${kin}</div>
      <div class="kin-title">${info.title}</div>
      <div class="kin-subtitle">${sealInfo.name_maya} · Тон ${tone} — ${toneInfo.name_ru}</div>
    </div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Печать</div>
        <div class="info-value">${sealInfo.name_ru}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Тон</div>
        <div class="info-value">${tone} — ${toneInfo.name_ru}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Волна</div>
        <div class="info-value">${wave} — ${sealsData[waveSeal].name_ru}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Замок</div>
        <div class="info-value">${CASTLE_NAMES[cast]?.split(' ')[0] || cast}</div>
      </div>
    </div>
  </div>`;

  html += `<div class="affirmation">
    <div class="label">🌀 Девиз дня</div>${info.affirmation}</div>`;

  if (toneInfo.question_ru)
    html += `<div class="question-block"><div class="q">❓ ${toneInfo.question_ru}</div></div>`;

  return html;
}

// ── Tab: Oracle ──
function renderOracle(kin) {
  const o = oracle(kin);
  function cell(k, role, area) {
    const {seal} = kinToToneSeal(k);
    const c = sealColor(seal);
    return `<div class="oracle-cell ${area === 'main' ? 'main' : ''}" style="grid-area:${area}">
      <div class="seal-icon">${SEAL_EMOJI[seal]}</div>
      <div class="kin-num" style="color:var(--${c})">${k}</div>
      <div class="role">${role}</div></div>`;
  }

  let html = `<div class="kin-card">
    <h3 style="text-align:center;margin-bottom:4px">🔮 Оракул дня</h3>
    <p class="section-intro">Четыре энергии, окружающие Кин дня. Вместе образуют «крест судьбы».</p>
    <div class="oracle-cross">
      ${cell(o.guide, 'Управитель', 'guide')}
      ${cell(o.antipode, 'Антипод', 'anti')}
      ${cell(kin, 'Кин дня', 'main')}
      ${cell(o.analog, 'Аналог', 'analog')}
      ${cell(o.hidden, 'Оккультный', 'hidden')}
    </div><div class="oracle-list">`;

  for (const r of ORACLE_ROLES) {
    const k = o[r.key];
    const {seal} = kinToToneSeal(k);
    const si = sealsData[seal];
    const title = kinsData[String(k)]?.title || '';
    const sealDesc = si.description_ru ? si.description_ru.split('.')[0] + '.' : `${si.power_ru} · ${si.action_ru}`;
    html += `<div class="oracle-row">
      <div class="oracle-arrow">${r.arrow}</div>
      <div class="oracle-info">
        <div class="oracle-role">${r.name}</div>
        <div class="oracle-name">Кин ${k} — ${title}</div>
        <div class="oracle-hint">${r.desc}</div>
        <div class="oracle-seal-desc">${sealDesc}</div>
      </div></div>`;
  }
  html += `</div></div>`;
  return html;
}

// ── Tab: Moon ──
function renderMoon() {
  const m = getMoon(currentDate);
  if (m.isOot) return `<div class="doot-banner">⏳ День вне Времени<br>25 июля — день между годами 13-Лунного календаря</div>`;

  const yb = yearBearer(currentDate);
  const ybTitle = kinsData[String(yb.kin)]?.title || '';

  return `<div class="kin-card">
    <h3>🌙 13-Лунный календарь</h3>
    <p class="section-intro">Год из 13 лун по 28 дней. Каждая луна = 4 недели. Начало года — 26 июля.</p>
    <div class="info-grid" style="margin-top:12px">
      <div class="info-item"><div class="info-label">Луна</div>
        <div class="info-value">${m.moonNumber} из 13</div></div>
      <div class="info-item"><div class="info-label">День</div>
        <div class="info-value">${m.moonDay} из 28</div></div>
      <div class="info-item"><div class="info-label">Неделя</div>
        <div class="info-value">${m.heptad} — ${m.heptadColor}</div></div>
      <div class="info-item"><div class="info-label">Плазма</div>
        <div class="info-value">${m.plasma.name}</div></div>
    </div>
    <p style="margin-top:12px"><b>${m.moonName}</b></p>
  </div>
  <div class="detail-section">
    <h3>🔥 Плазма: ${m.plasma.name}</h3>
    <p>${m.plasma.hint}</p>
    <p style="color:var(--muted);margin-top:4px">Чакра: ${m.plasma.chakra}</p>
    <p class="section-intro">Плазма — ежедневная энергетическая практика. 7 плазм повторяются каждую неделю.</p>
  </div>
  <div class="detail-section">
    <h3>📅 Год: ${ybTitle}</h3>
    <p>Кин ${yb.kin} · ${yb.yearStart.getDate()}.${String(yb.yearStart.getMonth()+1).padStart(2,'0')}.${yb.yearStart.getFullYear()} — 24.07.${yb.yearStart.getFullYear()+1}</p>
    <p class="section-intro">Каждый год носит имя Кина, выпадающего на 26 июля.</p>
  </div>`;
}

// ── Tab: Wave ──
function renderWave(kin, tone) {
  const wave = wavespell(kin);
  const cast = castle(kin);
  const waveFirst = (wave - 1) * 13 + 1;
  const {seal: waveSeal} = kinToToneSeal(waveFirst);
  const wsi = sealsData[waveSeal];
  const pos = (kin - 1) % 13 + 1;
  const p = pulsar(tone);

  let html = `<div class="kin-card">
    <h3>🌀 Волна ${wave} — ${wsi.name_ru}</h3>
    <p class="section-intro">Волна — 13-дневный цикл с единой темой. Всего 20 волн.</p>
    <div style="margin-top:12px">
      <p>▸ Сила: ${wsi.power_ru}</p>
      <p>▸ Действие: ${wsi.action_ru}</p>
      <p style="margin-top:8px">Сегодня день <b>${pos}</b> из 13</p>
    </div>
  </div>
  <div class="detail-section">
    <h3>🏰 Замок ${cast} — ${CASTLE_NAMES[cast]}</h3>
    <p>${CASTLE_HINTS[cast]}</p>
    <p class="section-intro">Замок — большой 52-дневный цикл из 4 волн. Всего 5 замков.</p>
  </div>
  <div class="detail-section">
    <h3>⚡ Пульсар: ${p.name}</h3>
    <p>${p.hint}</p>
    <p class="section-intro">Пульсар — ритм внутри волны: какое измерение активно сегодня.</p>
  </div>`;

  // 13 kins of wave
  html += `<div class="kin-card"><h3>Кины волны</h3><div style="margin-top:8px">`;
  for (let i = 0; i < 13; i++) {
    const wk = waveFirst + i;
    const {seal: ws} = kinToToneSeal(wk);
    const c = sealColor(ws);
    const isCurrent = wk === kin;
    html += `<div style="padding:4px 0;${isCurrent ? 'font-weight:bold' : 'color:var(--muted)'}">
      ${isCurrent ? '✦ ' : '   '}${SEAL_EMOJI[ws]} ${wk} — ${kinsData[String(wk)]?.title || ''}</div>`;
  }
  html += `</div></div>`;
  return html;
}

// ── Tab: Details ──
function renderDetails(kin, tone, seal) {
  const sealInfo = sealsData[seal];
  const toneInfo = tonesData[tone];
  const info = kinsData[String(kin)];

  let html = `<div class="detail-section">
    <h3>📋 Печать: ${sealInfo.name_ru}</h3>
    <p><b>Сущность:</b> ${sealInfo.essence_ru}<br>
    <b>Сила:</b> ${sealInfo.power_ru} · <b>Действие:</b> ${sealInfo.action_ru}<br>
    <b>Направление:</b> ${sealInfo.direction_action_ru}<br>
    <b>Семья Земли:</b> ${sealInfo.earth_family_action_ru}<br>
    <b>Чакра:</b> ${sealInfo.chakra_ru}</p>
    ${sealInfo.description_ru ? `<p style="margin-top:8px;color:var(--muted);font-style:italic">${sealInfo.description_ru}</p>` : ''}
  </div>`;

  html += `<div class="detail-section">
    <h3>🎵 Тон ${tone} — ${toneInfo.name_ru}</h3>
    <p><b>Функция:</b> ${toneInfo.function_ru || ''}<br>
    <b>Действие:</b> ${toneInfo.action_ru}<br>
    <b>Творческая сила:</b> ${toneInfo.creative_power_ru}</p>
    ${toneInfo.description_ru ? `<p style="margin-top:8px;color:var(--muted);font-style:italic">${toneInfo.description_ru}</p>` : ''}
  </div>`;

  const summary = info?.summary;
  if (summary)
    html += `<div class="detail-section"><h3>📜 Описание</h3><p>${summary}</p></div>`;

  return html;
}

// ── Render ──
function render() {
  const kin = dreamspellKin(currentDate);
  const {tone, seal} = kinToToneSeal(kin);
  const card = document.getElementById('card');
  renderNav();

  switch (currentTab) {
    case 'main':    card.innerHTML = renderMain(kin, tone, seal); break;
    case 'oracle':  card.innerHTML = renderOracle(kin); break;
    case 'moon':    card.innerHTML = renderMoon(); break;
    case 'wave':    card.innerHTML = renderWave(kin, tone); break;
    case 'details': card.innerHTML = renderDetails(kin, tone, seal); break;
  }
}

function setupEvents() {
  document.getElementById('prev').addEventListener('click', () => { currentDate = addDays(currentDate, -1); render(); });
  document.getElementById('next').addEventListener('click', () => { currentDate = addDays(currentDate, 1); render(); });

  const datePicker = document.getElementById('date-picker');
  document.getElementById('date-display').addEventListener('click', () => {
    datePicker.value = currentDate.toISOString().slice(0, 10);
    datePicker.showPicker?.() || datePicker.click();
  });
  datePicker.addEventListener('change', () => {
    if (datePicker.value) {
      const [y, m, d] = datePicker.value.split('-').map(Number);
      currentDate = new Date(y, m - 1, d);
      render();
    }
  });

  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      render();
    });
  });

  const card = document.getElementById('card');
  let startX = 0;
  card.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, {passive: true});
  card.addEventListener('touchend', e => {
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 60) { currentDate = addDays(currentDate, diff > 0 ? -1 : 1); render(); }
  }, {passive: true});

  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    const r = document.documentElement;
    if (tg.themeParams.bg_color) r.style.setProperty('--bg', tg.themeParams.bg_color);
    if (tg.themeParams.secondary_bg_color) r.style.setProperty('--card-bg', tg.themeParams.secondary_bg_color);
    if (tg.themeParams.text_color) r.style.setProperty('--text', tg.themeParams.text_color);
    if (tg.themeParams.hint_color) r.style.setProperty('--muted', tg.themeParams.hint_color);
    if (tg.themeParams.button_color) r.style.setProperty('--accent', tg.themeParams.button_color);
  }
}

async function init() {
  await loadData();
  setupEvents();
  render();
}

init();
