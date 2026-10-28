import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_QR_DESIGN,
  QR_PRESETS,
  contrastRatio,
  getQrDesignError,
  normalizeQrDesign,
} from '../shared/qr-design.js';

test('accepts all suggested palettes and rejects low contrast or inverted QR colors', () => {
  for (const preset of QR_PRESETS)
    assert.equal(getQrDesignError({ ...DEFAULT_QR_DESIGN, ...preset.design }), '');
  assert.ok(QR_PRESETS.some((preset) => preset.design.foreground === '#1075b4'));
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.match(getQrDesignError({ ...DEFAULT_QR_DESIGN, foreground: '#eeeeee' }), /tương phản/);
  assert.match(
    getQrDesignError({ ...DEFAULT_QR_DESIGN, foreground: '#ffffff', background: '#000000' }),
    /tương phản/,
  );
});

test('handles legacy or malformed saved designs and validates label input', () => {
  assert.deepEqual(normalizeQrDesign('{}'), DEFAULT_QR_DESIGN);
  assert.deepEqual(normalizeQrDesign('broken json'), DEFAULT_QR_DESIGN);
  assert.deepEqual(
    normalizeQrDesign({ foreground: 'url(https://example.com)' }),
    DEFAULT_QR_DESIGN,
  );
  assert.ok(getQrDesignError({ ...DEFAULT_QR_DESIGN, message: '' }));
  assert.ok(getQrDesignError({ ...DEFAULT_QR_DESIGN, message: 'x'.repeat(81) }));
  const custom = {
    ...DEFAULT_QR_DESIGN,
    foreground: '#2110b4',
    message: 'Bạn nhặt được? Giúp mình nhé!',
    showBrand: false,
  };
  assert.deepEqual(normalizeQrDesign(JSON.stringify(custom)), custom);
  const legacy = { ...custom, foreground: '#0a3566' };
  assert.deepEqual(normalizeQrDesign(JSON.stringify(legacy)), legacy);
});
