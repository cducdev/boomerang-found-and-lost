import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Palette,
  Printer,
  RotateCcw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { Button, Dialog } from './components.jsx';
import { api } from './lib.js';
import { renderQrLabel } from './qr-label.js';
import {
  DEFAULT_QR_DESIGN,
  QR_COLOR_PATTERN,
  QR_PRESETS,
  contrastRatio,
  getQrDesignError,
  normalizeQrDesign,
} from '../shared/qr-design.js';

function ColorField({ id, label, value, onChange }) {
  return (
    <div className="qr-color-field">
      <label htmlFor={id}>{label}</label>
      <div className="qr-color-input">
        <input
          type="color"
          aria-label={`Bảng chọn ${label.toLowerCase()}`}
          value={QR_COLOR_PATTERN.test(value) ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}

export default function QRDialog({ item, onClose, onSaved }) {
  const [design, setDesign] = useState(() => normalizeQrDesign(item.qrDesign));
  const [savedDesign, setSavedDesign] = useState(() => normalizeQrDesign(item.qrDesign));
  const [rendered, setRendered] = useState({ image: '', key: '' });
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const validation = getQrDesignError(design);
  const key = JSON.stringify({ url, name: item.name, design });
  const dirty = JSON.stringify(design) !== JSON.stringify(savedDesign);
  const ready = !validation && Boolean(rendered.image) && rendered.key === key;
  useEffect(() => {
    let cancelled = false;
    api('/config')
      .then((config) => {
        if (!cancelled)
          setUrl(
            `${config.publicUrl?.replace(/\/$/, '') || window.location.origin}/q/${item.token}`,
          );
      })
      .catch(() => {
        if (!cancelled) setError('Chưa thể mở nhãn QR. Vui lòng đóng và thử lại.');
      });
    return () => {
      cancelled = true;
    };
  }, [item.token]);
  useEffect(() => {
    if (!url || validation) return;
    let cancelled = false;
    renderQrLabel({ url, name: item.name, design })
      .then((image) => {
        if (!cancelled) {
          setRendered({ image, key });
          setError('');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Chưa thể tạo nhãn. Hãy đổi mẫu màu hoặc mở lại để thử.');
      });
    return () => {
      cancelled = true;
    };
  }, [url, item.name, design, key, validation]);
  function change(patch) {
    setDesign((current) => ({ ...current, ...patch }));
    setSaveMessage('');
    setError('');
  }
  async function save() {
    if (!ready || !dirty || saving) return;
    setSaving(true);
    setError('');
    try {
      const updated = await api(`/items/${item.id}`, {
        method: 'PATCH',
        body: { qrDesign: design },
      });
      const persisted = normalizeQrDesign(updated.qrDesign);
      setDesign(persisted);
      setSavedDesign(persisted);
      setSaveMessage('Đã lưu thiết kế');
      onSaved?.(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  function download() {
    if (!ready) return;
    const link = document.createElement('a');
    link.download = `Boomerang-${item.name.replace(/[^\p{L}\p{N} -]/gu, '').slice(0, 60)}.png`;
    link.href = rendered.image;
    link.click();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Hãy sao chép đường dẫn trong ô bên dưới.');
    }
  }
  const localOnly = url && /localhost|127\.0\.0\.1/.test(new URL(url).hostname);
  return (
    <Dialog title="Nhãn QR của bạn" onClose={onClose} className="qr-dialog">
      <p className="muted">Một chiếc nhãn theo cách của bạn. Đường dẫn QR luôn giữ nguyên.</p>
      <div className="qr-editor">
        <div className="qr-editor-controls">
          <div className="qr-section-title">
            <Palette size={17} />
            <h3>Tùy chỉnh nhãn</h3>
          </div>
          <fieldset disabled={saving} className="qr-design-fields">
            <legend className="sr-only">Thiết kế nhãn QR</legend>
            <div className="qr-presets" role="group" aria-label="Mẫu màu QR">
              {QR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  className={`qr-preset ${design.foreground === preset.design.foreground && design.background === preset.design.background ? 'selected' : ''}`}
                  aria-label={`Mẫu ${preset.name}`}
                  aria-pressed={
                    design.foreground === preset.design.foreground &&
                    design.background === preset.design.background
                  }
                  onClick={() => change(preset.design)}
                >
                  <span
                    style={{
                      backgroundColor: preset.design.background,
                      color: preset.design.foreground,
                    }}
                  >
                    ▦
                  </span>
                  {preset.name}
                </button>
              ))}
            </div>
            <div className="qr-colors">
              <ColorField
                id="qr-foreground"
                label="Màu mã QR"
                value={design.foreground}
                onChange={(foreground) => change({ foreground })}
              />
              <ColorField
                id="qr-background"
                label="Màu nền nhãn"
                value={design.background}
                onChange={(background) => change({ background })}
              />
            </div>
            <label className="qr-message-field" htmlFor="qr-message">
              Lời nhắn trên nhãn
              <textarea
                id="qr-message"
                rows={3}
                maxLength={80}
                value={design.message}
                onChange={(e) => change({ message: e.target.value })}
              />
              <small>{design.message.length}/80 ký tự</small>
            </label>
            <label className="checkbox-label qr-brand-toggle">
              <input
                type="checkbox"
                checked={design.showBrand}
                onChange={(e) => change({ showBrand: e.target.checked })}
              />
              Hiện logo Boomerang
            </label>
          </fieldset>
          {validation ? (
            <p className="form-error" role="alert">
              {validation}
            </p>
          ) : (
            <p className="qr-contrast-note">
              <ShieldCheck size={15} />
              Tương phản {contrastRatio(design.foreground, design.background).toFixed(1)}:1 · Nên
              quét thử sau khi in.
            </p>
          )}
          <div className="qr-save-row">
            <Button onClick={save} disabled={!ready || !dirty || saving}>
              <Save size={16} />
              {saving ? 'Đang lưu…' : 'Lưu thiết kế'}
            </Button>
            <button
              className="text-button"
              disabled={saving}
              onClick={() => change({ ...DEFAULT_QR_DESIGN })}
            >
              <RotateCcw size={14} />
              Mặc định
            </button>
          </div>
          <p className={`qr-save-status ${dirty ? 'unsaved' : ''}`} role="status">
            {saveMessage || (dirty ? 'Chưa lưu thay đổi' : 'Thiết kế đã lưu cho món đồ này')}
          </p>
        </div>
        <div className="qr-editor-preview">
          <span className="qr-preview-title">XEM TRƯỚC NHÃN</span>
          <div className="print-label">
            {rendered.image ? (
              <img src={rendered.image} alt={`Mã QR cho ${item.name}`} width="720" height="880" />
            ) : (
              <div className="qr-loading" role="status">
                Đang tạo nhãn QR…
              </div>
            )}
          </div>
          <p className="qr-preview-note">
            {validation
              ? 'Bản xem trước giữ mẫu hợp lệ gần nhất.'
              : !ready && !error
                ? 'Đang cập nhật nhãn…'
                : 'Nhãn PNG và bản in giống bản xem trước.'}
          </p>
        </div>
      </div>
      <div className="qr-actions">
        <Button disabled={!ready || saving} onClick={download}>
          <Download size={17} />
          Tải nhãn PNG
        </Button>
        <Button variant="secondary" disabled={!ready || saving} onClick={() => window.print()}>
          <Printer size={17} />
          In nhãn
        </Button>
      </div>
      <label className="link-label">
        Đường dẫn của nhãn
        <div className="copy-field">
          <input data-testid="qr-link" readOnly value={url} onFocus={(e) => e.target.select()} />
          <button
            className="icon-button"
            onClick={copy}
            aria-label="Sao chép đường dẫn"
            disabled={!url}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </label>
      <a href={url || undefined} target="_blank" rel="noreferrer" className="preview-link">
        Xem trang người nhặt <ExternalLink size={14} />
      </a>
      {localOnly && (
        <p className="local-note">
          QR này đang dùng localhost. Để quét bằng điện thoại, mở web qua IP nội bộ hoặc cấu hình
          PUBLIC_URL khi đưa web lên mạng rồi tải lại nhãn.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
