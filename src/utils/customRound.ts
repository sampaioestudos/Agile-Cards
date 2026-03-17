export function customRound(value: number): number {
  const integerPart = Math.floor(value);
  const decimalPart = value - integerPart;
  
  // Decimal <= 0.5 -> round down
  // Decimal >= 0.6 -> round up
  // Note: 0.51 to 0.59 would technically fall into >= 0.6 logic if we strictly follow the prompt,
  // but standard interpretation of ">= 0.6 up, <= 0.5 down" means we can just use decimalPart > 0.5.
  // Let's be precise: if decimal <= 0.5 return integerPart, else return integerPart + 1.
  if (decimalPart <= 0.5) {
    return integerPart;
  } else {
    return integerPart + 1;
  }
}
