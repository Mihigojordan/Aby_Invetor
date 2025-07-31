export function generateSKU(productName: string): string {
  const timestamp = Date.now().toString().slice(-5); // Last 5 digits of timestamp
  const initials = productName
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
  return `${initials}-${timestamp}`;
}


export function generateStockSKU(companyName: string, userName: string): string {
  const companyPart = companyName.substring(0, 2).toUpperCase();
  const userPart = userName.substring(0, 2).toUpperCase();
  const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5 random digits
  return `${companyPart}${userPart}${randomDigits}`;
}

export function generateSixDigitNumber(): number {
  return Math.floor(100000 + Math.random() * 900000);
}