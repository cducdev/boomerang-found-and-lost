import QRCode from 'qrcode';
import { getQrDesignError } from '../shared/qr-design.js';

let brandImage;
function loadBrand() {
  if (!brandImage) {
    brandImage = (async () => {
      const image = new Image();
      image.src = '/brand/boomerang-wordmark.png';
      await image.decode();
      return image;
    })().catch((error) => {
      brandImage = undefined;
      throw error;
    });
  }
  return brandImage;
}

export async function renderQrLabel({ url, name, design }) {
  const error = getQrDesignError(design);
  if (error) throw new Error(error);
  const dataUrl = await QRCode.toDataURL(url, {
    width: 600,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: design.foreground, light: design.background },
  });
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 880;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = design.background;
  ctx.fillRect(0, 0, 720, 880);
  ctx.drawImage(image, 60, 100, 600, 600);
  if (design.showBrand) {
    const logo = await loadBrand();
    const width = 290;
    ctx.drawImage(logo, (720 - width) / 2, 22, width, (logo.height / logo.width) * width);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = design.foreground;
  ctx.font = '600 26px "Be Vietnam Pro", sans-serif';
  ctx.fillText(name, 360, 741, 640);
  ctx.font = '22px "Be Vietnam Pro", sans-serif';
  const lines = [];
  let line = '';
  for (const word of design.message.trim().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > 640 && lines.length === 0) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  lines.forEach((value, index) => ctx.fillText(value, 360, 785 + index * 31, 640));
  ctx.font = '17px "Be Vietnam Pro", sans-serif';
  ctx.fillText('Xin cảm ơn sự tử tế của bạn.', 360, 856, 640);
  return canvas.toDataURL('image/png');
}
