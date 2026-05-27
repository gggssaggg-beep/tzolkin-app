/* Tzolkin Dreamspell core calculations — port of Python core.py + oracle.py + wavespell.py */

const REF_DATE = new Date(1987, 6, 26); // July 26, 1987
const REF_KIN  = 34;

function isLeap(y) { return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0); }

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

function countSkipped(start, end) {
  let count = 0;
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    if (isLeap(y)) {
      const feb29 = new Date(y, 1, 29);
      if (feb29 > start && feb29 <= end) count++;
    }
  }
  return count;
}

function dreamspellKin(d) {
  let dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dt.getMonth() === 1 && dt.getDate() === 29) {
    dt = new Date(dt.getFullYear(), 1, 28);
  }
  let dreamDays;
  if (dt >= REF_DATE) {
    const delta = daysBetween(REF_DATE, dt);
    dreamDays = delta - countSkipped(REF_DATE, dt);
  } else {
    const delta = daysBetween(dt, REF_DATE);
    dreamDays = -(delta - countSkipped(dt, REF_DATE));
  }
  return ((REF_KIN - 1 + dreamDays) % 260 + 260) % 260 + 1;
}

function kinToToneSeal(kin) {
  return { tone: (kin - 1) % 13 + 1, seal: (kin - 1) % 20 + 1 };
}

function kinFromToneSeal(tone, seal) {
  return (40 * (tone - 1) + 221 * (seal - 1)) % 260 + 1;
}

const GUIDE_OFFSET = {1:0,2:12,3:4,4:16,5:8,6:0,7:12,8:4,9:16,10:8,11:0,12:12,13:4};

function oracle(kin) {
  const {tone, seal} = kinToToneSeal(kin);
  const guideSeal = ((seal - 1 + GUIDE_OFFSET[tone]) % 20) + 1;
  const analogSeal = ((18 - seal) % 20) + 1;
  return {
    guide:    kinFromToneSeal(tone, guideSeal),
    hidden:   261 - kin,
    antipode: (kin + 130) % 260 || 260,
    analog:   kinFromToneSeal(tone, analogSeal),
  };
}

function wavespell(kin) { return Math.floor((kin - 1) / 13) + 1; }
function castle(kin)    { return Math.floor((kin - 1) / 52) + 1; }
function harmonic(kin)  { return Math.floor((kin - 1) / 4) + 1; }

function isDayOutOfTime(d) { return d.getMonth() === 6 && d.getDate() === 25; }

const SEAL_COLORS = {
  1:'Red',2:'White',3:'Blue',4:'Yellow',5:'Red',6:'White',7:'Blue',8:'Yellow',
  9:'Red',10:'White',11:'Blue',12:'Yellow',13:'Red',14:'White',15:'Blue',16:'Yellow',
  17:'Red',18:'White',19:'Blue',20:'Yellow'
};

const COLOR_RU = {Red:'red',White:'white',Blue:'blue',Yellow:'yellow'};

const CASTLE_NAMES = {
  1:'Красный Восточный Замок Поворота',
  2:'Белый Северный Замок Перехода',
  3:'Синий Западный Замок Сжигания',
  4:'Жёлтый Южный Замок Дарения',
  5:'Зелёный Центральный Замок Очарования',
};

const MOON_NAMES = [
  'Магнитная Луна Цели','Лунная Луна Вызова','Электрическая Луна Служения',
  'Самосущная Луна Формы','Обертонная Луна Сияния','Ритмическая Луна Равенства',
  'Резонансная Луна Настройки','Галактическая Луна Целостности','Солнечная Луна Намерения',
  'Планетарная Луна Манифестации','Спектральная Луна Освобождения',
  'Кристаллическая Луна Сотрудничества','Космическая Луна Присутствия',
];

const PLASMAS = [
  {name:'Дали',  chakra:'Коронная чакра',      hint:'Фокусируй намерение. Точка внимания — макушка.'},
  {name:'Сели',  chakra:'Корневая чакра',       hint:'Позволь энергии течь. Заземление через основание.'},
  {name:'Гамма', chakra:'Третий глаз',          hint:'Внутренний покой. Точка — межбровье.'},
  {name:'Кали',  chakra:'Сакральная чакра',     hint:'Закрепляй основу. Центр жизненной силы — низ живота.'},
  {name:'Альфа', chakra:'Горловая чакра',       hint:'Отпускай и выражай. Центр речи и творчества.'},
  {name:'Лими',  chakra:'Солнечное сплетение',  hint:'Очищай от лишнего. Центр воли — область живота.'},
  {name:'Силио', chakra:'Сердечная чакра',      hint:'Разряжай накопленное в сердце. День синтеза недели.'},
];

const WEEK_COLORS = ['Красная','Белая','Синяя','Жёлтая'];

function getMoon(d) {
  let dt = new Date(d);
  if (isLeap(dt.getFullYear()) && dt.getMonth() === 1 && dt.getDate() === 29)
    dt = new Date(dt.getFullYear(), 1, 28);
  if (dt.getMonth() === 6 && dt.getDate() === 25)
    return {isOot: true};
  let ys;
  if (dt.getMonth() > 6 || (dt.getMonth() === 6 && dt.getDate() >= 26))
    ys = new Date(dt.getFullYear(), 6, 26);
  else
    ys = new Date(dt.getFullYear() - 1, 6, 26);
  let dp = daysBetween(ys, dt);
  const ny = ys.getFullYear() + 1;
  if (isLeap(ny) && dt >= new Date(ny, 2, 1)) dp--;
  const mn = Math.floor(dp / 28) + 1;
  const md = dp % 28 + 1;
  const pi = (md - 1) % 7;
  const hep = Math.floor((md - 1) / 7) + 1;
  return {isOot:false, moonNumber:mn, moonDay:md, moonName:MOON_NAMES[mn-1],
          plasma:PLASMAS[pi], heptad:hep, heptadColor:WEEK_COLORS[hep-1]};
}

function yearBearer(d) {
  let dt = new Date(d);
  let ys;
  if (dt.getMonth() > 6 || (dt.getMonth() === 6 && dt.getDate() >= 26))
    ys = new Date(dt.getFullYear(), 6, 26);
  else
    ys = new Date(dt.getFullYear() - 1, 6, 26);
  const kin = dreamspellKin(ys);
  return {kin, yearStart: ys};
}

const PULSAR_DATA = {
  1: {name:'Время (4D)',   hint:'Цель, намерение, трансценденция — магистральная ось Волны.'},
  2: {name:'Жизнь (1D)',   hint:'Физическое измерение — вызов, ритм, проявление результата.'},
  3: {name:'Чувства (2D)', hint:'Сенсорное измерение — служение, настройка, освобождение.'},
  0: {name:'Разум (3D)',   hint:'Ментальное измерение — форма, целостность, сотрудничество.'},
};

function pulsar(tone) { return PULSAR_DATA[tone % 4]; }

const CASTLE_HINTS = {
  1:'Начало и посев — энергия запуска новых процессов',
  2:'Очищение и переосмысление — отсеивание лишнего',
  3:'Трансформация — глубокое преобразование изнутри',
  4:'Созревание — время собирать плоды и делиться',
  5:'Магия и синхронизация — всё сходится воедино',
};

export {
  dreamspellKin, kinToToneSeal, kinFromToneSeal, oracle,
  wavespell, castle, harmonic, isDayOutOfTime,
  SEAL_COLORS, COLOR_RU, CASTLE_NAMES, CASTLE_HINTS,
  getMoon, yearBearer, pulsar, MOON_NAMES, PLASMAS,
};
