function addThousandsSep(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatPrice(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  return `${addThousandsSep(intPart)},${decPart}`;
}
