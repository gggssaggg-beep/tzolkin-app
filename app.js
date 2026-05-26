import {
  dreamspellKin, kinToToneSeal, kinFromToneSeal, oracle, wavespell, castle,
  isDayOutOfTime, SEAL_COLORS, COLOR_RU, CASTLE_NAMES, CASTLE_HINTS,
  getMoon, yearBearer, pulsar,
} from './tzolkin.js';

let sealsData, tonesData, kinsData;
let currentDate = new Date();
let currentTab = 'main';

/* ── Expanded panel tracking ── */
let expandedPanel = null; // 'seal' | 'tone' | 'castle' | null

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

/* ── Helpers: images ── */
function sealImg(sealId, size = 48) {
  return `<img src="img/sticker_${String(sealId).padStart(2, '0')}.png" width="${size}" height="${size}" class="seal-img round" alt="">`;
}
function toneImg(toneId, size = 32) {
  return `<img src="img/tone_${String(toneId).padStart(2, '0')}.png" width="${size}" height="${size}" class="tone-img" alt="">`;
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
function sealColor(seal) { return COLOR_RU[SEAL_COLORS[seal]]; }

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
  // But we want next occurrence from today for wave view — actually let's just
  // calculate forward/backward precisely
  return addDays(currentDate, diff);
}

/* ── Navigation ── */
function renderNav() {
  const el = document.getElementById('date-display');
  const today = new Date();
  const isToday = currentDate.toDateString() === today.toDateString();
  el.innerHTML = `
    <div class="day">${isToday ? 'Сегодня' : DAYS_RU[currentDate.getDay()]}</div>
    <div class="full">${formatDateRu(currentDate)}</div>`;
}

function navigateToDate(d) {
  currentDate = d;
  expandedPanel = null;
  render();
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  currentTab = tab;
  expandedPanel = null;
  render();
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
    html += `<div class="doot-banner">⏳ День вне Времени</div>`;

  if (tone === 1)
    html += `<div class="wave-banner"><div class="emoji">🌀</div>
      <div class="text">Начинается Волна ${wave} — ${sealInfo.name_ru}</div></div>`;

  html += `<div class="kin-card">
    <div class="kin-header">
      <div class="seal-badge ${color}">${sealImg(seal, 80)}</div>
      <div class="kin-number" style="color:var(--${color})">${kin}${gap ? '<span class="gap-badge">ГАП</span>' : ''}</div>
      <div class="kin-title">${info.title}</div>
      <div class="kin-subtitle">${sealInfo.name_maya} · ${toneImg(tone, 18)} Тон ${tone} — ${toneInfo.name_ru}</div>
    </div>
    <div class="info-grid">
      <div class="info-item" data-action="expand-seal">
        <div class="info-label">Печать</div>
        <div class="info-value">${sealImg(seal, 20)} ${sealInfo.name_ru}</div>
      </div>
      <div class="info-item" data-action="expand-tone">
        <div class="info-label">Тон</div>
        <div class="info-value">${toneImg(tone, 18)} ${tone} — ${toneInfo.name_ru}</div>
      </div>
      <div class="info-item" data-action="goto-wave">
        <div class="info-label">Волна</div>
        <div class="info-value">${sealImg(waveSeal, 20)} ${wave} — ${sealsData[waveSeal].name_ru}</div>
      </div>
      <div class="info-item" data-action="expand-castle">
        <div class="info-label">Замок</div>
        <div class="info-value">${CASTLE_NAMES[cast]?.split(' ')[0] || cast}</div>
      </div>
    </div>
  </div>`;

  // Expandable seal panel
  html += `<div class="expand-panel${expandedPanel === 'seal' ? ' open' : ''}" id="panel-seal">
    <h3>${sealImg(seal, 24)} Печать: ${sealInfo.name_ru}</h3>
    <p><b>Сущность:</b> ${sealInfo.essence_ru}<br>
    <b>Сила:</b> ${sealInfo.power_ru} · <b>Действие:</b> ${sealInfo.action_ru}<br>
    <b>Направление:</b> ${sealInfo.direction_action_ru}<br>
    <b>Семья Земли:</b> ${sealInfo.earth_family_action_ru}<br>
    <b>Чакра:</b> ${sealInfo.chakra_ru}</p>
    ${sealInfo.description_ru ? `<p style="margin-top:8px;color:var(--muted);font-style:italic">${sealInfo.description_ru}</p>` : ''}
    <button class="expand-close" data-close="seal">✕ Свернуть</button>
  </div>`;

  // Expandable tone panel
  html += `<div class="expand-panel${expandedPanel === 'tone' ? ' open' : ''}" id="panel-tone">
    <h3>${toneImg(tone, 24)} Тон ${tone} — ${toneInfo.name_ru}</h3>
    <p><b>Функция:</b> ${toneInfo.function_ru || ''}<br>
    <b>Действие:</b> ${toneInfo.action_ru}<br>
    <b>Творческая сила:</b> ${toneInfo.creative_power_ru}</p>
    ${toneInfo.description_ru ? `<p style="margin-top:8px;color:var(--muted);font-style:italic">${toneInfo.description_ru}</p>` : ''}
    <button class="expand-close" data-close="tone">✕ Свернуть</button>
  </div>`;

  // Castle popup is handled via modal, no inline expand

  html += `<div class="affirmation">
    <div class="label">🌀 Девиз дня</div>${info.affirmation}</div>`;

  const summary = info.summary || '';
  if (summary)
    html += `<div class="detail-section"><h3>📜 Описание</h3><p>${summary}</p></div>`;

  if (toneInfo.question_ru)
    html += `<div class="question-block"><div class="q">❓ ${toneInfo.question_ru}</div></div>`;

  return html;
}

/* ── Tab: Oracle ── */
function renderOracle(kin) {
  const o = oracle(kin);
  function cell(k, role, area) {
    const { seal } = kinToToneSeal(k);
    const c = sealColor(seal);
    return `<div class="oracle-cell ${area === 'main' ? 'main' : ''}" style="grid-area:${area}" data-oracle-role="${area}">
      <div class="seal-icon">${sealImg(seal, 36)}</div>
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

  const roleAreaMap = { guide: 'guide', antipode: 'anti', analog: 'analog', hidden: 'hidden' };

  for (const r of ORACLE_ROLES) {
    const k = o[r.key];
    const { seal } = kinToToneSeal(k);
    const si = sealsData[seal];
    const title = kinsData[String(k)]?.title || '';
    const sealDesc = si.description_ru ? si.description_ru.split('.')[0] + '.' : `${si.power_ru} · ${si.action_ru}`;
    html += `<div class="oracle-row" data-oracle-row="${roleAreaMap[r.key]}">
      <div class="oracle-arrow">${r.arrow}</div>
      <div class="oracle-seal-img">${sealImg(seal, 28)}</div>
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

/* ── Tab: Moon ── */
function renderMoon() {
  const m = getMoon(currentDate);
  if (m.isOot) return `<div class="doot-banner">⏳ День вне Времени<br>25 июля — день между годами 13-Лунного календаря</div>`;

  const yb = yearBearer(currentDate);
  const ybTitle = kinsData[String(yb.kin)]?.title || '';
  const ybTS = kinToToneSeal(yb.kin);

  return `<div class="kin-card">
    <h3>🌙 13-Лунный календарь</h3>
    <p class="section-intro">Год из 13 лун по 28 дней. Каждая луна = 4 недели. Начало года — 26 июля.</p>
    <div class="info-grid" style="margin-top:12px">
      <div class="info-item" style="cursor:default"><div class="info-label">Луна</div>
        <div class="info-value">${m.moonNumber} из 13</div></div>
      <div class="info-item" style="cursor:default"><div class="info-label">День</div>
        <div class="info-value">${m.moonDay} из 28</div></div>
      <div class="info-item" style="cursor:default"><div class="info-label">Неделя</div>
        <div class="info-value">${m.heptad} — ${m.heptadColor}</div></div>
      <div class="info-item moon-clickable" data-action="plasma-expand"><div class="info-label">Плазма</div>
        <div class="info-value">${m.plasma.name}</div></div>
    </div>
    <p style="margin-top:12px"><b>${m.moonName}</b></p>
  </div>
  <div class="detail-section" id="plasma-section">
    <h3>🔥 Плазма: ${m.plasma.name}</h3>
    <p>${m.plasma.hint}</p>
    <p style="color:var(--muted);margin-top:4px">Чакра: ${m.plasma.chakra}</p>
    <p class="section-intro">Плазма — ежедневная энергетическая практика. 7 плазм повторяются каждую неделю.</p>
  </div>
  <div class="detail-section moon-clickable" data-action="year-bearer-nav">
    <h3>📅 Год: ${sealImg(ybTS.seal, 20)} ${ybTitle}</h3>
    <p>Кин ${yb.kin} · ${yb.yearStart.getDate()}.${String(yb.yearStart.getMonth() + 1).padStart(2, '0')}.${yb.yearStart.getFullYear()} — 24.07.${yb.yearStart.getFullYear() + 1}</p>
    <p class="section-intro">Каждый год носит имя Кина, выпадающего на 26 июля. Нажмите, чтобы перейти к 26 июля.</p>
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
    <h3>🌀 Волна ${wave} — ${sealImg(waveSeal, 24)} ${wsi.name_ru}</h3>
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

/* ── Tab: Tzolkin calendar grid ── */
function renderTzolkin(currentKin) {
  const birthDateStr = localStorage.getItem('birthDate');
  let birthKin = null;
  if (birthDateStr) {
    const [y, m, d] = birthDateStr.split('-').map(Number);
    birthKin = dreamspellKin(new Date(y, m - 1, d));
  }

  let html = `<div class="kin-card" style="padding:12px">
    <h3 style="text-align:center;margin-bottom:8px">📅 Цолькин — 260-дневный цикл</h3>
    <p class="section-intro" style="text-align:center;margin-bottom:8px">20 печатей × 13 тонов. Нажмите ячейку, чтобы перейти к дню.</p>
    <div class="tzolkin-legend">
      <span><span class="legend-swatch" style="background:rgba(233,69,96,.5)"></span>Красный</span>
      <span><span class="legend-swatch" style="background:rgba(240,240,240,.4)"></span>Белый</span>
      <span><span class="legend-swatch" style="background:rgba(74,155,217,.5)"></span>Синий</span>
      <span><span class="legend-swatch" style="background:rgba(245,197,24,.5)"></span>Жёлтый</span>
      <span><span class="legend-swatch" style="border:2px dashed var(--accent);width:10px;height:10px"></span>ГАП</span>
    </div>
  </div>`;

  html += `<div class="tzolkin-grid-wrapper"><div class="tzolkin-grid">`;

  // Corner cell
  html += `<div class="tzolkin-corner"></div>`;

  // Column headers (tones 1-13)
  for (let t = 1; t <= 13; t++) {
    html += `<div class="tzolkin-header-cell">${t}</div>`;
  }

  // Rows (seals 1-20)
  for (let s = 1; s <= 20; s++) {
    // Row header: small seal image
    html += `<div class="tzolkin-row-header">${sealImg(s, 24)}</div>`;

    for (let t = 1; t <= 13; t++) {
      const k = kinFromToneSeal(t, s);
      const colorClass = 'color-' + sealColor(s);
      const gap = isGap(k);
      const isCurrent = k === currentKin;
      const isBirth = k === birthKin;
      let cls = `tzolkin-cell ${colorClass}`;
      if (gap) cls += ' gap-cell';
      if (isCurrent) cls += ' current-kin';
      if (isBirth) cls += ' birth-kin';
      html += `<div class="${cls}" data-tz-kin="${k}" title="Кин ${k}">${k}</div>`;
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
      <h3>👤 Мой кин</h3>
      <p style="color:var(--muted);margin-bottom:8px">Укажите дату рождения, чтобы узнать свой Кин Судьбы и связь с текущим днём.</p>
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
    <h3>👤 Мой кин</h3>
    <div style="text-align:center;margin-bottom:12px">
      <div class="seal-badge ${bColor}" style="width:64px;height:64px;line-height:64px;margin:0 auto 8px">
        ${sealImg(bSeal, 56)}
      </div>
      <div style="font-size:28px;font-weight:800;color:var(--${bColor})">${bKin}${bGap ? '<span class="gap-badge">ГАП</span>' : ''}</div>
      <div style="font-size:16px;font-weight:600">${bInfo?.title || ''}</div>
      <div style="font-size:12px;color:var(--muted)">${formatDateRu(birthD)}</div>
    </div>
    <div style="font-size:13px;margin-bottom:8px">
      <p>${sealImg(bSeal, 16)} Печать: ${bSealInfo.name_ru} · ${toneImg(bTone, 14)} Тон: ${bTone} ${bToneInfo.name_ru}</p>
      <p>Волна: ${bWave} · Замок: ${CASTLE_NAMES[bCastle]?.split(' ')[0] || bCastle}</p>
    </div>
    <h3 style="font-size:13px;color:var(--muted);margin-top:12px">Связь с текущим днём</h3>
    <div class="connection-list">
      ${connections.map(c => `<div class="connection-item"><span class="connection-icon">${c.icon}</span><span class="connection-text">${c.text}</span></div>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--muted);margin-top:12px">Следующий ваш Кин: <b>${formatDateRu(nextDate)}</b></p>
    <button class="birth-clear-btn" id="birth-clear-btn">Сбросить дату рождения</button>
    <br>
    <button class="modal-close" id="my-kin-close">✕ Закрыть</button>`;
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
    closeBtn.addEventListener('click', () => {
      document.getElementById('my-kin-modal').style.display = 'none';
    });
  }
  const clearBtn = document.getElementById('birth-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      localStorage.removeItem('birthDate');
      renderMyKinContent();
      setTimeout(() => bindMyKinEvents(), 0);
    });
  }
}

/* ── Castle popup ── */
function showCastlePopup(kin) {
  const cast = castle(kin);
  const div = document.createElement('div');
  div.className = 'castle-popup';
  div.innerHTML = `<div class="castle-popup-inner">
    <h3>🏰 Замок ${cast}</h3>
    <p style="font-size:16px;font-weight:600;margin-bottom:8px">${CASTLE_NAMES[cast]}</p>
    <p style="font-size:14px;line-height:1.5">${CASTLE_HINTS[cast]}</p>
    <p class="section-intro" style="margin-top:8px">Замок — большой 52-дневный цикл из 4 волн. Всего 5 замков.</p>
    <button class="modal-close" style="margin-top:16px">✕ Закрыть</button>
  </div>`;
  document.body.appendChild(div);
  div.addEventListener('click', (e) => {
    if (e.target === div || e.target.classList.contains('modal-close')) {
      div.remove();
    }
  });
}

/* ── Render dispatcher ── */
function render() {
  const kin = dreamspellKin(currentDate);
  const { tone, seal } = kinToToneSeal(kin);
  const card = document.getElementById('card');
  renderNav();

  switch (currentTab) {
    case 'main':    card.innerHTML = renderMain(kin, tone, seal); break;
    case 'oracle':  card.innerHTML = renderOracle(kin); break;
    case 'moon':    card.innerHTML = renderMoon(); break;
    case 'wave':    card.innerHTML = renderWave(kin, tone); break;
    case 'tzolkin': card.innerHTML = renderTzolkin(kin); break;
  }

  // Bind dynamic events after render
  bindCardEvents(kin, tone, seal);
}

/* ── Dynamic event binding ── */
function bindCardEvents(kin, tone, seal) {
  const card = document.getElementById('card');

  // Main tab: info grid clicks
  card.querySelectorAll('[data-action="expand-seal"]').forEach(el => {
    el.addEventListener('click', () => {
      expandedPanel = expandedPanel === 'seal' ? null : 'seal';
      render();
      if (expandedPanel === 'seal') {
        setTimeout(() => document.getElementById('panel-seal')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
      }
    });
  });

  card.querySelectorAll('[data-action="expand-tone"]').forEach(el => {
    el.addEventListener('click', () => {
      expandedPanel = expandedPanel === 'tone' ? null : 'tone';
      render();
      if (expandedPanel === 'tone') {
        setTimeout(() => document.getElementById('panel-tone')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
      }
    });
  });

  card.querySelectorAll('[data-action="goto-wave"]').forEach(el => {
    el.addEventListener('click', () => switchTab('wave'));
  });

  card.querySelectorAll('[data-action="expand-castle"]').forEach(el => {
    el.addEventListener('click', () => showCastlePopup(kin));
  });

  // Close expand panels
  card.querySelectorAll('.expand-close').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      expandedPanel = null;
      render();
    });
  });

  // Oracle tab: cross cell clicks highlight description
  card.querySelectorAll('.oracle-cell[data-oracle-role]').forEach(el => {
    el.addEventListener('click', () => {
      const role = el.dataset.oracleRole;
      if (role === 'main') return;
      // Highlight matching row
      card.querySelectorAll('.oracle-row').forEach(r => r.classList.remove('highlighted'));
      const row = card.querySelector(`.oracle-row[data-oracle-row="${role}"]`);
      if (row) {
        row.classList.add('highlighted');
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });

  // Oracle tab: row clicks also toggle highlight
  card.querySelectorAll('.oracle-row[data-oracle-row]').forEach(el => {
    el.addEventListener('click', () => {
      const wasHighlighted = el.classList.contains('highlighted');
      card.querySelectorAll('.oracle-row').forEach(r => r.classList.remove('highlighted'));
      if (!wasHighlighted) el.classList.add('highlighted');
    });
  });

  // Wave tab: kin row clicks
  card.querySelectorAll('.wave-kin-row[data-wave-kin]').forEach(el => {
    el.addEventListener('click', () => {
      const targetKin = +el.dataset.waveKin;
      const d = dateForKin(targetKin);
      navigateToDate(d);
    });
  });

  // Moon tab: year bearer navigation
  card.querySelectorAll('[data-action="year-bearer-nav"]').forEach(el => {
    el.addEventListener('click', () => {
      const yb = yearBearer(currentDate);
      navigateToDate(yb.yearStart);
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
}

/* ── Setup permanent events ── */
function setupEvents() {
  document.getElementById('prev').addEventListener('click', () => { currentDate = addDays(currentDate, -1); expandedPanel = null; render(); });
  document.getElementById('next').addEventListener('click', () => { currentDate = addDays(currentDate, 1); expandedPanel = null; render(); });

  const datePicker = document.getElementById('date-picker');
  document.getElementById('date-display').addEventListener('click', () => {
    datePicker.value = currentDate.toISOString().slice(0, 10);
    datePicker.showPicker?.() || datePicker.click();
  });
  datePicker.addEventListener('change', () => {
    if (datePicker.value) {
      const [y, m, d] = datePicker.value.split('-').map(Number);
      currentDate = new Date(y, m - 1, d);
      expandedPanel = null;
      render();
    }
  });

  // Tab buttons
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // My Kin button
  document.getElementById('my-kin-btn').addEventListener('click', showMyKinModal);

  // Close modal on overlay click
  document.getElementById('my-kin-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('my-kin-modal')) {
      document.getElementById('my-kin-modal').style.display = 'none';
    }
  });

  // Swipe navigation
  const card = document.getElementById('card');
  let startX = 0;
  card.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  card.addEventListener('touchend', e => {
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 60) { currentDate = addDays(currentDate, diff > 0 ? -1 : 1); expandedPanel = null; render(); }
  }, { passive: true });

  // Telegram WebApp integration
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

/* ── Init ── */
async function init() {
  await loadData();
  setupEvents();
  render();
}

init();
