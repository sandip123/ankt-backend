const MONTH_FORMAT = /^([0-9]{4})-([0-9]{1,2})$/;
const US_MONTH_FORMAT = /^([0-9]{1,2})\/([0-9]{4})$/;
const NAME_MONTH_FORMAT = /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+([0-9]{4})$/i;

function normalizeMonth(value) {
  const input = String(value || '').trim();
  let match;

  if ((match = input.match(MONTH_FORMAT))) {
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) {
      return `${match[1]}-${String(month).padStart(2, '0')}`;
    }
  }

  if ((match = input.match(US_MONTH_FORMAT))) {
    const month = Number(match[1]);
    const year = Number(match[2]);
    if (month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
  }

  if ((match = input.match(NAME_MONTH_FORMAT))) {
    const monthNames = [
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ];
    const month = monthNames.indexOf(match[1].slice(0, 3).toLowerCase()) + 1;
    if (month >= 1 && month <= 12) {
      return `${match[2]}-${String(month).padStart(2, '0')}`;
    }
  }

  return '';
}

module.exports = {
  normalizeMonth
};
