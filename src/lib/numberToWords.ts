const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

function convertLessThanThousand(num: number): string {
  if (num === 0) return '';
  
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  }
  
  return ones[Math.floor(num / 100)] + ' hundred' + (num % 100 !== 0 ? ' ' + convertLessThanThousand(num % 100) : '');
}

export function numberToWords(num: number): string {
  if (num === 0) return 'zero';
  
  const euros = Math.floor(num);
  const cents = Math.round((num - euros) * 100);
  
  let result = '';
  
  if (euros >= 1000000) {
    result += convertLessThanThousand(Math.floor(euros / 1000000)) + ' million ';
    result += convertLessThanThousand(Math.floor((euros % 1000000) / 1000));
    if ((euros % 1000000) / 1000 > 0) result += ' thousand ';
    result += convertLessThanThousand(euros % 1000);
  } else if (euros >= 1000) {
    result += convertLessThanThousand(Math.floor(euros / 1000)) + ' thousand ';
    result += convertLessThanThousand(euros % 1000);
  } else {
    result += convertLessThanThousand(euros);
  }
  
  result = result.trim() + ' euro';
  if (euros !== 1) result += 's';
  
  if (cents > 0) {
    result += ' and ' + convertLessThanThousand(cents) + ' cent';
    if (cents !== 1) result += 's';
  }
  
  return result.charAt(0).toUpperCase() + result.slice(1);
}
