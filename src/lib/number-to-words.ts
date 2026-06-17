const NUMBER_TO_WORDS = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];

const TENS_WORDS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

export function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const numStr = num.toFixed(2);
  const [rupees, paise] = numStr.split(".");
  const rupeesNum = parseInt(rupees);
  const paiseNum = parseInt(paise);

  function convert(n: number): string {
    if (n < 20) return NUMBER_TO_WORDS[n];
    if (n < 100) return TENS_WORDS[Math.floor(n / 10)] + (n % 10 ? " " + NUMBER_TO_WORDS[n % 10] : "");
    if (n < 1000) return NUMBER_TO_WORDS[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
  }

  let result = convert(rupeesNum) + " Rupees";
  if (paiseNum > 0) result += " and " + convert(paiseNum) + " Paise";
  return result + " Only";
}
