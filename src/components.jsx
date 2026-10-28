import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Backpack,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  KeyRound,
  Laptop,
  LogOut,
  Plus,
  QrCode,
  ScanLine,
  ShieldCheck,
  Wallet,
  X,
  Box,
} from 'lucide-react';
import { api, initials } from './lib.js';

export const categoryIcons = {
  Balo: Backpack,
  'Chìa khóa': KeyRound,
  Ví: Wallet,
  'Thiết bị': Laptop,
  Khác: Box,
};
export function Logo({ onClick }) {
  return (
    <a href="/" className="brand" onClick={onClick} aria-label="Boomerang Lost & Found — Trang chủ">
      <img
        className="brand-symbol"
        src="/brand/boomerang-symbol.png"
        alt=""
        width="43"
        height="50"
      />
      <img
        className="brand-wordmark"
        src="/brand/boomerang-wordmark.png"
        alt="Boomerang Lost & Found"
        width="184"
        height="37"
      />
    </a>
  );
}
export function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Dialog({ title, children, onClose, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current && e.clientX !== 0) {
          const rect = ref.current.getBoundingClientRect();
          if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
          )
            onClose();
        }
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-heading">
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-button" aria-label="Đóng" onClick={onClose}>
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function AuthDialog({ mode: initialMode, onClose, onSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'register';
  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await api(`/auth/${mode}`, {
        method: 'POST',
        body: Object.fromEntries(new FormData(e.currentTarget)),
      });
      onSuccess(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={signup ? 'Một chiếc nhãn. Thêm an tâm.' : 'Chào bạn trở lại.'}
      onClose={onClose}
      className="auth-dialog"
    >
      <p className="muted">
        {signup
          ? 'Tạo tài khoản miễn phí để bắt đầu bảo vệ những món đồ của bạn.'
          : 'Đăng nhập để quản lý đồ vật và xem lời nhắn.'}
      </p>
      <form onSubmit={submit} className="form-stack">
        {signup && (
          <label>
            Tên của bạn
            <input
              name="name"
              autoComplete="name"
              maxLength={80}
              required
              placeholder="Tên hiển thị với người nhặt"
            />
          </label>
        )}
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="ban@example.com"
          />
        </label>
        <label>
          Mật khẩu
          <input
            name="password"
            type="password"
            autoComplete={signup ? 'new-password' : 'current-password'}
            required
            minLength={8}
            maxLength={128}
            placeholder="Ít nhất 8 ký tự"
          />
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Button disabled={busy} type="submit">
          {busy ? 'Đang xử lý…' : signup ? 'Tạo tài khoản' : 'Đăng nhập'}
          <ArrowUpRight size={18} />
        </Button>
      </form>
      <p className="auth-switch">
        {signup ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
        <button
          className="text-button"
          onClick={() => {
            setMode(signup ? 'login' : 'register');
            setError('');
          }}
        >
          {signup ? 'Đăng nhập' : 'Đăng ký miễn phí'}
        </button>
      </p>
    </Dialog>
  );
}
export function Sidebar({ user, page, onPage, onAdd, onLogout, unread }) {
  return (
    <aside className="sidebar">
      <Logo
        onClick={(e) => {
          e.preventDefault();
          onPage('items');
        }}
      />
      <div className="workspace-label">GÓC AN TÂM CỦA BẠN</div>
      <nav aria-label="Điều hướng chính">
        {[
          ['items', Backpack, 'Đồ vật của tôi'],
          ['events', Bell, 'Thông báo'],
          ['guide', CircleHelp, 'Cách sử dụng'],
        ].map(([key, Icon, label]) => (
          <button
            key={key}
            className={`nav-item ${page === key ? 'active' : ''}`}
            onClick={() => onPage(key)}
          >
            <Icon size={19} />
            {label}
            {key === 'events' && unread > 0 && <span className="count">{unread}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-note">
        <span className="little-spark">✳</span>
        <strong>
          Một lần dán,
          <br />
          thêm một cách tìm về.
        </strong>
        <p>Tạo nhãn QR cho món đồ bạn mang theo mỗi ngày.</p>
        <button className="text-button" onClick={onAdd}>
          Thêm đồ vật <Plus size={16} />
        </button>
      </div>
      <div className="sidebar-bottom">
        <div className="user-summary">
          <span className="avatar">{initials(user.name)}</span>
          <div>
            <strong>{user.name}</strong>
            <small>Tài khoản cá nhân</small>
          </div>
          <button className="icon-button" aria-label="Đăng xuất" onClick={onLogout}>
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}
export function TagArt({ compact = false }) {
  return (
    <div className={`tag-art ${compact ? 'compact' : ''}`} aria-hidden="true">
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <span className="art-spark spark-one">✳</span>
      <span className="art-spark spark-two">+</span>
      <div className="tag-string" />
      <div className="art-tag">
        <div className="tag-hole" />
        <div className="art-tag-brand">
          <img src="/brand/boomerang-wordmark.png" alt="" width="148" height="30" />
        </div>
        <div className="art-qr">
          <QrCode strokeWidth={1.4} />
        </div>
        <strong>Quét mã. Kết nối. Trở về.</strong>
        <span>THIS LITTLE TAG BRINGS ME HOME</span>
      </div>
      <div className="art-notification">
        <span className="notification-check">
          <Check size={18} />
        </span>
        <div>
          <strong>Đồ của bạn có tin mới!</strong>
          <small>Một kết nối nhỏ, một niềm vui lớn.</small>
        </div>
      </div>
      <div className="art-caption">
        <ShieldCheck size={15} /> Không pin · Không cần cài app
      </div>
    </div>
  );
}
export function Steps({ full = false }) {
  return (
    <div className={`steps ${full ? 'full' : ''}`}>
      {[
        ['01', Plus, 'Thêm đồ vật', 'Đặt tên và chọn thông tin bạn muốn người nhặt nhìn thấy.'],
        ['02', QrCode, 'In và dán QR', 'Tải nhãn QR, in ra và dán chắc lên món đồ của bạn.'],
        [
          '03',
          ScanLine,
          'Quét mã, kết nối',
          'Người nhặt quét mã và gửi lời nhắn. Bạn nhận tin ngay trên web.',
        ],
      ].map(([num, Icon, title, description]) => (
        <div className="step" key={num}>
          <div className="step-top">
            <span>{num}</span>
            <Icon size={23} />
          </div>
          <h3>{title}</h3>
          <p>{description}</p>
          {!full && <ChevronRight className="step-arrow" size={18} />}
        </div>
      ))}
    </div>
  );
}
