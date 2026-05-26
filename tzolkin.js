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
  let dt = new Date(d);
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

export {
  dreamspellKin, kinToToneSeal, kinFromToneSeal, oracle,
  wavespell, castle, harmonic, isDayOutOfTime,
  SEAL_COLORS, COLOR_RU, CASTLE_NAMES
};
