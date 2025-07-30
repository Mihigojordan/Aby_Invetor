export function generateSKU(productName: string): string {
  const timestamp = Date.now().toString().slice(-5); // Last 5 digits of timestamp
  const initials = productName
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
  return `${initials}-${timestamp}`;
}