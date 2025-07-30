import * as bwipjs from 'bwip-js';
import * as fs from 'fs';
import * as path from 'path';

export async function generateAndSaveBarcodeImage(
  sku: string,
): Promise<string> {
  const pngBuffer = await bwipjs.toBuffer({
    bcid: 'code128',
    text: sku,
    scale: 3,
    height: 10,
    includetext: true,
    backgroundcolor: 'FFFFFF', // White background
  });

  //   const uploadsDir = path.join(__dirname, '../../uploads/barcodes');
  const uploadsDir = path.resolve(process.cwd(), 'uploads/barcodes');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, `${sku}.png`);
  fs.writeFileSync(filePath, pngBuffer);

  // Return relative URL for client use
  return `/uploads/barcodes/${sku}.png`;
}
