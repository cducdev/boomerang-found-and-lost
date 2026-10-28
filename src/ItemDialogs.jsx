import { useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { Button, Dialog } from './components.jsx';
import { api } from './lib.js';

export function AddItemDialog({ onClose, onCreated }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const item = await api('/items', {
        method: 'POST',
        body: { ...Object.fromEntries(form), publicPhone: form.get('publicPhone') === 'on' },
      });
      onCreated(item);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="Thêm một món đồ" onClose={onClose}>
      <p className="muted">Bắt đầu bằng món đồ bạn muốn an tâm hơn mỗi ngày.</p>
      <form className="form-stack" onSubmit={submit}>
        <label>
          Tên đồ vật
          <input name="name" required maxLength={80} placeholder="Ví dụ: Balo đi học" autoFocus />
        </label>
        <label>
          Loại đồ vật
          <select name="category">
            <option>Balo</option>
            <option>Chìa khóa</option>
            <option>Ví</option>
            <option>Thiết bị</option>
            <option>Khác</option>
          </select>
        </label>
        <label>
          Đặc điểm nhận dạng <span className="optional">· tùy chọn</span>
          <textarea
            name="description"
            maxLength={400}
            rows={2}
            placeholder="Màu sắc, đặc điểm giúp nhận ra món đồ…"
          />
        </label>
        <label>
          Số điện thoại <span className="optional">· tùy chọn</span>
          <input
            name="phone"
            type="tel"
            maxLength={24}
            pattern="[+0-9 ().\-]*"
            placeholder="Số để người nhặt liên hệ"
          />
        </label>
        <label className="checkbox-label">
          <input name="publicPhone" type="checkbox" />
          <span>Hiển thị số điện thoại trên trang QR</span>
        </label>
        <div className="privacy-note">
          <ShieldCheck size={18} />
          <span>
            Tên của bạn sẽ hiển thị. Email luôn được giữ riêng tư. Người nhặt vẫn gửi được lời nhắn
            khi bạn ẩn số điện thoại.
          </span>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? 'Đang tạo…' : 'Tạo nhãn QR'}
          <Plus size={18} />
        </Button>
      </form>
    </Dialog>
  );
}

export { default as QRDialog } from './QRDialog.jsx';
