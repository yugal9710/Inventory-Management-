/**
 * Converts numeric NPR amounts to Words in English and Nepali (Devanagari)
 * Conforming to South Asian numbering (Crores, Lakhs, Thousands, Hundreds, Rupees, Paisa).
 */

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const NP_ONES = ['', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ', 'दश',
  'एघार', 'बाह्र', 'तेह्र', 'चौध', 'पन्ध्र', 'सोह्र', 'सत्र', 'अठार', 'उन्नाइस', 'बीस',
  'एक्काइस', 'बाइस', 'तेइस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताइस', 'अट्ठाइस', 'उनन्तीस', 'तीस',
  'इकत्तिस', 'बत्तीस', 'तेत्तिस', 'चौँतीस', 'पैँतीस', 'छत्तीस', 'सैँतीस', 'अठतीस', 'उनन्चालीस', 'चालीस',
  'एकचालीस', 'बयालीस', 'त्रिचालीस', 'चवालीस', 'पैँतालीस', 'छयालीस', 'सत्तालीस', 'अठचालीस', 'उनन्पचास', 'पचास',
  'एकाउन्न', 'बाउन्न', 'त्रिपन्न', 'चवन्न', 'पचपन्न', 'छपन्न', 'सन्ताउन्न', 'अन्ठाउन्न', 'उनन्साठी', 'साठी',
  'एकसट्ठी', 'बासट्ठी', 'त्रिसट्ठी', 'चौंसट्ठी', 'पैंसट्ठी', 'छयसट्ठी', 'सतसट्ठी', 'अठसट्ठी', 'उनन्सत्तरी', 'सत्तरी',
  'एकहत्तर', 'बहत्तर', 'त्रिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छयहत्तर', 'सतहत्तर', 'अठहत्तर', 'उनासी', 'असी',
  'एकासी', 'बयासी', 'त्रियासी', 'चौरासी', 'पचासी', 'छयासी', 'सतासी', 'अठासी', 'उनान्नब्बे', 'नब्बे',
  'एकान्नब्बे', 'बयानब्बे', 'त्रियान्नब्बे', 'चौरानब्बे', 'पञ्चानब्बे', 'छयान्नब्बे', 'सन्तानब्बे', 'अन्ठानब्बे', 'उनान्सय', 'सय'];

function convertUnderThousandEn(n) {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + ' ';
    n %= 10;
  }
  if (n > 0) {
    str += ONES[n] + ' ';
  }
  return str.trim();
}

function numberToWordsEn(amount) {
  if (isNaN(amount) || amount === 0) return 'Zero Rupees Only';
  
  let num = Math.floor(Math.abs(amount));
  let paisa = Math.round((Math.abs(amount) - num) * 100);

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = num;

  let result = '';
  if (crore > 0) result += convertUnderThousandEn(crore) + ' Crore ';
  if (lakh > 0) result += convertUnderThousandEn(lakh) + ' Lakh ';
  if (thousand > 0) result += convertUnderThousandEn(thousand) + ' Thousand ';
  if (remainder > 0) result += convertUnderThousandEn(remainder) + ' ';

  result = result.trim() + ' Rupees';

  if (paisa > 0) {
    result += ' and ' + convertUnderThousandEn(paisa) + ' Paisa';
  }

  return result + ' Only';
}

function numberToWordsNp(amount) {
  if (isNaN(amount) || amount === 0) return 'शून्य रुपैयाँ मात्र';

  let num = Math.floor(Math.abs(amount));
  let paisa = Math.round((Math.abs(amount) - num) * 100);

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  const remainder = num % 100;

  let result = '';
  if (crore > 0) {
    result += (NP_ONES[crore] || crore) + ' करोड ';
  }
  if (lakh > 0) {
    result += (NP_ONES[lakh] || lakh) + ' लाख ';
  }
  if (thousand > 0) {
    result += (NP_ONES[thousand] || thousand) + ' हजार ';
  }
  if (hundred > 0) {
    result += (NP_ONES[hundred] || hundred) + ' सय ';
  }
  if (remainder > 0) {
    result += (NP_ONES[remainder] || remainder) + ' ';
  }

  result = result.trim() + ' रुपैयाँ';
  if (paisa > 0) {
    result += ' ' + (NP_ONES[paisa] || paisa) + ' पैसा';
  }

  return result + ' मात्र';
}

/**
 * Format currency in Nepali style (Lakhs & Crores grouping)
 * e.g., 12,34,567.89
 */
function formatNpr(amount, includeSymbol = true) {
  if (amount === undefined || amount === null || isNaN(amount)) return includeSymbol ? 'Rs. 0.00' : '0.00';
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const fixed = absAmount.toFixed(2);
  const [intPart, decPart] = fixed.split('.');

  let lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const formatted = (isNegative ? '-' : '') + formattedInt + '.' + decPart;
  return includeSymbol ? `Rs. ${formatted}` : formatted;
}

module.exports = {
  numberToWordsEn,
  numberToWordsNp,
  formatNpr
};
