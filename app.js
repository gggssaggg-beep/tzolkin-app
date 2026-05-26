import {
  dreamspellKin, kinToToneSeal, oracle,
  wavespell, castle, harmonic, isDayOutOfTime,
  SEAL_COLORS, COLOR_RU, CASTLE_NAMES
} from './tzolkin.js';

let sealsData, tonesData, kinsData;
let currentDate = new Date();
let currentTab = 'main';

const MONTHS_RU = [
  'января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря'
];
const DAYS_RU = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];

const SEAL_EMOJI = [
  '','🐉','💨','🌙','🌱','🐍','💀','✋','⭐','🌊','🐕',
  '🐒','🧑','🏠','🔮','🦅','⚔️','🌏','🔪','🌧️','☀️'
];

const ORACLE_ROLES = [
  {key:'guide',    arrow:'↑', name:'Управитель'},
  {key:'antipode', arrow:'←', name:'Антипод'},
  {key:'analog',   arrow:'→', name:'Аналог'},
  {key:'hidden',   arrow:'↓', name:'Оккультный учитель'},
];

async function loadData() {
  const base = '../data/';
  const [s, t, k] = await Promise.all([
    fetch(base + 'seals.json').then(r => r.json()),
    fetch(base + 'tones.json').then(r => r.json()),
    fetch(base + 'kin_descriptions.json').then(r => r.json()),
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

function renderNav() {
  const el = document.getElementById('date-display');
  const today = new Date();
  const isToday = currentDate.toDateString() === today.toDateString();
  el.innerHTML = `
    <div class="day">${isToday ? 'Сегодня' : DAYS_RU[currentDate.getDay()]}</div>
    <div class="full">${formatDateRu(currentDate)}</div>
  `;
}

function renderMain(kin, tone, seal) {
  const info = kinsData[String(kin)];
  const sealInfo = sealsData[seal];
  const toneInfo = tonesData[tone];
  const color = COLOR_RU[SEAL_COLORS[seal]];
  const wave = wavespell(kin);
  const cast = castle(kin);
  const harm = harmonic(kin);
  const waveSeal = kinToToneSeal((wave - 1) * 13 + 1).seal;

  let html = '';

  if (isDayOutOfTime(currentDate)) {
    html += `<div class="doot-banner">⏳ День вне Времени</div>`;
  }

  if (tone === 1) {
    html += `<div class="wave-banner">
      <div class="emoji">🌀</div>
      <div class="text">Начинается Волна ${wave} — ${sealInfo.name_ru}</div>
    </div>`;
  }

  html += `<div class="kin-card">
    <div class="kin-header">
      <div class="seal-badge ${color}">${SEAL_EMOJI[seal]}</div>
      <div class="kin-number" style="color:var(--${color})">${kin}</div>
      <div class="kin-title">${info.title}</div>
      <div class="kin-subtitle">${sealInfo.name_maya} · Тон ${tone}</div>
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
    <div class="label">🌀 Девиз дня</div>
    ${info.affirmation}
  </div>`;

  const question = toneInfo.question_ru;
  if (question) {
    html += `<div class="question-block">
      <div class="q">❓ ${question}</div>
    </div>`;
  }

  return html;
}

function renderOracle(kin) {
  const o = oracle(kin);
  const mainTS = kinToToneSeal(kin);
  const mainColor = COLOR_RU[SEAL_COLORS[mainTS.seal]];

  function cell(k, role, area) {
    const {seal} = kinToToneSeal(k);
    const c = COLOR_RU[SEAL_COLORS[seal]];
    const title = kinsData[String(k)]?.title || '';
    return `<div class="oracle-cell ${area === 'main' ? 'main' : ''}" style="grid-area:${area}">
      <div class="seal-icon">${SEAL_EMOJI[seal]}</div>
      <div class="kin-num" style="color:var(--${c})">${k}</div>
      <div class="role">${role}</div>
    </div>`;
  }

  let html = `<div class="kin-card"><h3 style="text-align:center;margin-bottom:12px">🔮 Оракул</h3>
    <div class="oracle-cross">
      ${cell(o.guide, 'Управитель', 'guide')}
      ${cell(o.antipode, 'Антипод', 'anti')}
      ${cell(kin, 'Кин дня', 'main')}
      ${cell(o.analog, 'Аналог', 'analog')}
      ${cell(o.hidden, 'Оккультный', 'hidden')}
    </div>
    <div class="oracle-list">`;

  for (const r of ORACLE_ROLES) {
    const k = o[r.key];
    const title = kinsData[String(k)]?.title || '';
    const {seal: rSeal} = kinToToneSeal(k);
    const rSealInfo = sealsData[rSeal];
    const sealDesc = rSealInfo.description_ru ? rSealInfo.description_ru.split('.')[0] + '.' : `${rSealInfo.power_ru} · ${rSealInfo.action_ru}`;
    html += `<div class="oracle-row">
      <div class="oracle-arrow">${r.arrow}</div>
      <div class="oracle-info">
        <div class="oracle-role">${r.name}</div>
        <div class="oracle-name">Кин ${k} — ${title}</div>
        <div class="oracle-role" style="margin-top:2px">${sealDesc}</div>
      </div>
    </div>`;
  }

  html += `</div></div>`;
  return html;
}

function renderDetails(kin, tone, seal) {
  const sealInfo = sealsData[seal];
  const toneInfo = tonesData[tone];
  const wave = wavespell(kin);
  const cast = castle(kin);
  const info = kinsData[String(kin)];

  let html = '';

  html += `<div class="detail-section">
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

  html += `<div class="detail-section">
    <h3>🏰 Замок ${cast}</h3>
    <p>${CASTLE_NAMES[cast]}</p>
  </div>`;

  const summary = info?.summary;
  if (summary) {
    html += `<div class="detail-section">
      <h3>📜 Описание</h3>
      <p>${summary}</p>
    </div>`;
  }

  return html;
}

function render() {
  const kin = dreamspellKin(currentDate);
  const {tone, seal} = kinToToneSeal(kin);
  const card = document.getElementById('card');

  renderNav();

  if (currentTab === 'main') {
    card.innerHTML = renderMain(kin, tone, seal);
  } else if (currentTab === 'oracle') {
    card.innerHTML = renderOracle(kin);
  } else {
    card.innerHTML = renderDetails(kin, tone, seal);
  }
}

function setupEvents() {
  document.getElementById('prev').addEventListener('click', () => {
    currentDate = addDays(currentDate, -1);
    render();
  });
  document.getElementById('next').addEventListener('click', () => {
    currentDate = addDays(currentDate, 1);
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

  // Swipe
  let startX = 0;
  const card = document.getElementById('card');
  card.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, {passive: true});
  card.addEventListener('touchend', e => {
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 60) {
      currentDate = addDays(currentDate, diff > 0 ? -1 : 1);
      render();
    }
  }, {passive: true});

  // Telegram theme
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
  }
}

async function init() {
  await loadData();
  setupEvents();
  render();
}

init();
