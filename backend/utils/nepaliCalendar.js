/**
 * Nepali Calendar (Bikram Sambat) bidirectional converter and utility library.
 * Supports BS 2075 through 2090 with exact official calendar month day mappings.
 */

// Days in each month for BS years from 2075 to 2090
// Format: [Baisakh, Jestha, Ashadh, Shrawan, Bhadra, Ashwin, Kartik, Mangsir, Poush, Magh, Falgun, Chaitra]
const BS_MONTH_DAYS = {
  2075: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 29, 31],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2083: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2086: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2088: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2089: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
};

// Reference starting point: 2075-01-01 BS = 2018-04-14 AD
const REF_BS_YEAR = 2075;
const REF_BS_MONTH = 1;
const REF_BS_DAY = 1;
const REF_AD_DATE = new Date(Date.UTC(2018, 3, 14)); // April 14, 2018

const BS_MONTH_NAMES_EN = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const BS_MONTH_NAMES_NP = [
  'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भाद्र', 'आश्विन',
  'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'
];

const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

function toDevanagariDigits(num) {
  return String(num).replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[d]);
}

/**
 * Converts AD Date to BS date string: 'YYYY-MM-DD'
 */
function adToBs(dateInput) {
  let adDate;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('T')[0].split('-');
    adDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
  } else if (dateInput instanceof Date) {
    adDate = new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate()));
  } else {
    adDate = new Date();
  }

  const msDiff = adDate.getTime() - REF_AD_DATE.getTime();
  let daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    // Before reference, fallback
    return '2075-01-01';
  }

  let curYear = REF_BS_YEAR;
  let curMonth = REF_BS_MONTH;
  let curDay = REF_BS_DAY;

  while (daysDiff > 0) {
    const monthDaysList = BS_MONTH_DAYS[curYear] || BS_MONTH_DAYS[2081];
    const daysInCurMonth = monthDaysList[curMonth - 1];

    const daysRemainingInMonth = daysInCurMonth - curDay;

    if (daysDiff > daysRemainingInMonth) {
      daysDiff -= (daysRemainingInMonth + 1);
      curDay = 1;
      curMonth++;
      if (curMonth > 12) {
        curMonth = 1;
        curYear++;
      }
    } else {
      curDay += daysDiff;
      daysDiff = 0;
    }
  }

  const yStr = String(curYear);
  const mStr = String(curMonth).padStart(2, '0');
  const dStr = String(curDay).padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
}

/**
 * Converts BS date string 'YYYY-MM-DD' to AD Date object and 'YYYY-MM-DD' string
 */
function bsToAd(bsDateStr) {
  if (!bsDateStr) return { adDate: new Date(), adDateStr: new Date().toISOString().split('T')[0] };
  const parts = bsDateStr.split('-').map(Number);
  const bsYear = parts[0];
  const bsMonth = parts[1];
  const bsDay = parts[2];

  let totalDays = 0;

  // Add days for completed years
  for (let y = REF_BS_YEAR; y < bsYear; y++) {
    const daysList = BS_MONTH_DAYS[y] || BS_MONTH_DAYS[2081];
    for (let m = 0; m < 12; m++) {
      totalDays += daysList[m];
    }
  }

  // Add days for completed months in target year
  const targetYearList = BS_MONTH_DAYS[bsYear] || BS_MONTH_DAYS[2081];
  for (let m = 1; m < bsMonth; m++) {
    totalDays += targetYearList[m - 1];
  }

  // Add days in target month
  totalDays += (bsDay - 1);

  const adTime = REF_AD_DATE.getTime() + totalDays * (1000 * 60 * 60 * 24);
  const adDate = new Date(adTime);
  const yStr = adDate.getUTCFullYear();
  const mStr = String(adDate.getUTCMonth() + 1).padStart(2, '0');
  const dStr = String(adDate.getUTCDate()).padStart(2, '0');

  return {
    adDate,
    adDateStr: `${yStr}-${mStr}-${dStr}`
  };
}

/**
 * Formats a BS date string into a friendly localized display
 * e.g., "14 Kartik 2081" or "१४ कार्तिक २०८१"
 */
function formatBsDate(bsDateStr, lang = 'en') {
  if (!bsDateStr) return '';
  const [y, m, d] = bsDateStr.split('-').map(Number);
  if (!y || !m || !d) return bsDateStr;

  const monthIdx = m - 1;
  if (lang === 'np') {
    const mName = BS_MONTH_NAMES_NP[monthIdx] || '';
    return `${toDevanagariDigits(d)} ${mName} ${toDevanagariDigits(y)}`;
  } else {
    const mName = BS_MONTH_NAMES_EN[monthIdx] || '';
    return `${d} ${mName} ${y}`;
  }
}

/**
 * Calculates current active fiscal year from a BS date string
 * In Nepal, Fiscal Year starts on 1st Shrawan (Month 4).
 * If date is in Baisakh (1), Jestha (2), Ashadh (3), it belongs to (Year-1)/Year (e.g. 2081 Ashadh is in 2080/81).
 * If date is in Shrawan (4) to Chaitra (12), it belongs to Year/(Year+1) (e.g. 2081 Shrawan is in 2081/82).
 */
function getFiscalYearFromBs(bsDateStr) {
  if (!bsDateStr) return '2081/82';
  const [y, m] = bsDateStr.split('-').map(Number);
  if (m >= 4) {
    const nextY = (y + 1).toString().slice(-2);
    return `${y}/${nextY}`;
  } else {
    const prevY = y - 1;
    const curYShort = y.toString().slice(-2);
    return `${prevY}/${curYShort}`;
  }
}

/**
 * Current today in BS
 */
function getTodayBs() {
  return adToBs(new Date());
}

module.exports = {
  BS_MONTH_DAYS,
  BS_MONTH_NAMES_EN,
  BS_MONTH_NAMES_NP,
  toDevanagariDigits,
  adToBs,
  bsToAd,
  formatBsDate,
  getFiscalYearFromBs,
  getTodayBs,
};
