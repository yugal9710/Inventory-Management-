/**
 * Frontend Nepali Calendar (Bikram Sambat) converter & utilities.
 */

export const BS_MONTH_DAYS: Record<number, number[]> = {
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

const REF_BS_YEAR = 2075;
const REF_BS_MONTH = 1;
const REF_BS_DAY = 1;
const REF_AD_DATE = new Date(Date.UTC(2018, 3, 14)); // April 14, 2018

export const BS_MONTH_NAMES_EN = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

export const BS_MONTH_NAMES_NP = [
  'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भाद्र', 'आश्विन',
  'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'
];

export const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function toDevanagariDigits(num: number | string): string {
  return String(num).replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[parseInt(d, 10)]);
}

export function adToBs(dateInput?: string | Date): string {
  let adDate: Date;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('T')[0].split('-');
    adDate = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
  } else if (dateInput instanceof Date) {
    adDate = new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate()));
  } else {
    adDate = new Date();
  }

  const msDiff = adDate.getTime() - REF_AD_DATE.getTime();
  let daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) return '2075-01-01';

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

export function formatBsDate(bsDateStr: string, lang: 'en' | 'np' = 'en'): string {
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

export function getTodayBs(): string {
  return adToBs(new Date());
}
