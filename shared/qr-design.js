export const DEFAULT_QR_DESIGN = Object.freeze({
  foreground: '#083860',
  background: '#ffffff',
  message: 'Nhặt được đồ? Quét mã giúp mình nhé!',
  showBrand: true,
});

export const QR_PRESETS = [
  { name: 'Navy', design: { foreground: '#083860', background: '#ffffff' } },
  { name: 'Xanh dương', design: { foreground: '#1075b4', background: '#ffffff' } },
  { name: 'Tím', design: { foreground: '#2110b4', background: '#f1f4fd' } },
  { name: 'Xanh lá', design: { foreground: '#087a1b', background: '#f0fdf4' } },
  { name: 'Tối giản', design: { foreground: '#1e293b', background: '#ffffff' } },
];

export const QR_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
function luminance(color) {
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export function contrastRatio(first, second) {
  if (!QR_COLOR_PATTERN.test(first) || !QR_COLOR_PATTERN.test(second)) return 0;
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
export function getQrDesignError(design) {
  if (
    !design ||
    !QR_COLOR_PATTERN.test(design.foreground) ||
    !QR_COLOR_PATTERN.test(design.background)
  )
    return 'Màu cần có dạng #RRGGBB.';
  // Conservative product guard, not a guarantee that every camera can decode a print.
  if (
    luminance(design.foreground) >= luminance(design.background) ||
    contrastRatio(design.foreground, design.background) < 4.5
  )
    return 'Màu mã cần tối hơn nền và có độ tương phản ít nhất 4.5:1. Hãy chọn mã đậm, nền sáng.';
  if (typeof design.message !== 'string' || !design.message.trim() || design.message.length > 80)
    return 'Lời nhắn cần từ 1 đến 80 ký tự.';
  if (typeof design.showBrand !== 'boolean') return 'Lựa chọn logo chưa hợp lệ.';
  return '';
}
export function normalizeQrDesign(value) {
  try {
    const saved = typeof value === 'string' ? JSON.parse(value) : value;
    const design = Object.fromEntries(
      Object.keys(DEFAULT_QR_DESIGN).map((key) => [key, saved?.[key] ?? DEFAULT_QR_DESIGN[key]]),
    );
    return getQrDesignError(design) ? { ...DEFAULT_QR_DESIGN } : design;
  } catch {
    return { ...DEFAULT_QR_DESIGN };
  }
}
