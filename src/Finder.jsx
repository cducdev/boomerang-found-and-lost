import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Heart,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Button, categoryIcons, Logo } from './components.jsx';
import { api } from './lib.js';

export default function Finder({ token }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [position, setPosition] = useState(null);
  const [locationStatus, setLocationStatus] = useState('');
  const [locating, setLocating] = useState(false);
  useEffect(() => {
    let cancelled = false;
    api('/public/' + token)
      .then((data) => {
        if (cancelled) return;
        setItem(data);
        setLoading(false);
        // Dedupe reloads in this tab for 30 minutes; still subject to server rate limits.
        const key = `unitag-scan-${token}`;
        let shouldScan = true;
        try {
          shouldScan = Date.now() - Number(sessionStorage.getItem(key) || 0) > 1800000;
          if (shouldScan) sessionStorage.setItem(key, String(Date.now()));
        } catch {
          /* Browsers can disable storage. */
        }
        if (shouldScan)
          api(`/public/${token}/scan`, { method: 'POST', body: {} }).catch(() => {
            try {
              sessionStorage.removeItem(key);
            } catch {
              /* best effort */
            }
          });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await api(`/public/${token}/messages`, {
        method: 'POST',
        body: { ...Object.fromEntries(new FormData(e.currentTarget)), ...(position || {}) },
      });
      setSent(true);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }
  function locate() {
    if (!navigator.geolocation) {
      setLocationStatus('Trình duyệt chưa hỗ trợ. Bạn có thể nhập nơi nhặt bên trên.');
      return;
    }
    setLocating(true);
    setLocationStatus('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
        setLocationStatus('Đã đính kèm vị trí hiện tại.');
      },
      () => {
        setLocating(false);
        setLocationStatus('Không lấy được vị trí. Bạn vẫn có thể gửi lời nhắn bình thường.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }
  const Icon = categoryIcons[item?.category] || categoryIcons['Khác'];
  return (
    <div className="finder-page">
      <header className="finder-header">
        <Logo />
        <span>
          <ShieldCheck size={15} /> Kết nối an toàn
        </span>
      </header>
      <main className="finder-main">
        {loading ? (
          <div className="finder-card loading-state" role="status">
            Đang mở nhãn QR…
          </div>
        ) : loadError ? (
          <div className="finder-card error-card">
            <span className="empty-icon">
              <MapPin size={32} />
            </span>
            <h1>Không tìm thấy nhãn này</h1>
            <p>{loadError}</p>
            <a href="/" className="button secondary">
              <ArrowLeft size={17} />
              Về trang chủ
            </a>
          </div>
        ) : sent ? (
          <div className="finder-card success-card">
            <span className="success-icon">
              <CheckCircle2 size={38} />
            </span>
            <span className="eyebrow">MỘT HÀNH ĐỘNG NHỎ, MỘT NGÀY TỐT HƠN</span>
            <h1>Lời nhắn đã được gửi!</h1>
            <p>
              <strong>{item.ownerName}</strong> sẽ thấy lời nhắn khi mở tài khoản Boomerang Lost &
              Found. Cảm ơn bạn đã giúp <strong>{item.name}</strong> có thêm cơ hội tìm về.
            </p>
            <div className="success-note">
              <Heart size={18} /> Sự tử tế của bạn thật đáng quý.
            </div>
            <a className="button secondary" href="/">
              Tìm hiểu về Boomerang Lost & Found <ArrowUpRight size={17} />
            </a>
          </div>
        ) : (
          <>
            <div className="finder-intro">
              <span className="eyebrow">
                <span className="live-dot" /> CẢM ƠN BẠN ĐÃ DỪNG LẠI
              </span>
              <h1>
                Bạn tìm thấy
                <br />
                <span>món đồ của ai đó?</span>
              </h1>
              <p>Một lời nhắn của bạn có thể giúp món đồ trở về.</p>
            </div>
            <div className="finder-card">
              <div className="found-item">
                <span className="found-icon">
                  <Icon size={34} strokeWidth={1.5} />
                </span>
                <div>
                  <small>{item.category}</small>
                  <h2>{item.name}</h2>
                  <p>
                    Chủ đồ: <strong>{item.ownerName}</strong>
                  </p>
                </div>
                {item.status === 'lost' && (
                  <span className="status-badge lost">
                    <span />
                    Đang tìm
                  </span>
                )}
              </div>
              {item.description && <p className="found-description">{item.description}</p>}
              {item.phone && (
                <a className="phone-link" href={`tel:${item.phone}`}>
                  <Phone size={17} /> Gọi chủ đồ: {item.phone}
                  <ArrowUpRight size={16} />
                </a>
              )}
              <div className="finder-form-heading">
                <h2>Giúp món đồ tìm đường về</h2>
                <p>Không cần tài khoản. Chỉ cần một chút tử tế.</p>
              </div>
              <form className="form-stack" onSubmit={submit}>
                <label>
                  Lời nhắn cho chủ đồ
                  <textarea
                    name="message"
                    required
                    minLength={3}
                    maxLength={1000}
                    rows={3}
                    placeholder="Mình tìm thấy món đồ của bạn…"
                  />
                </label>
                <label>
                  Bạn nhặt được ở đâu? <span className="optional">· tùy chọn</span>
                  <input
                    name="location"
                    maxLength={200}
                    placeholder="Ví dụ: Thư viện, quầy bảo vệ khu A"
                  />
                </label>
                <div className="share-location">
                  <button
                    className={`text-button ${position ? 'location-attached' : ''}`}
                    type="button"
                    onClick={
                      position
                        ? () => {
                            setPosition(null);
                            setLocationStatus('Đã bỏ vị trí đính kèm.');
                          }
                        : locate
                    }
                    disabled={locating}
                  >
                    {position ? <Check size={16} /> : <MapPin size={16} />}
                    {locating
                      ? 'Đang lấy vị trí…'
                      : position
                        ? 'Đã đính kèm vị trí · Bỏ chọn'
                        : 'Đính kèm vị trí hiện tại của tôi'}
                  </button>
                  <small>Chỉ chia sẻ với chủ đồ khi bạn bấm gửi.</small>
                  {locationStatus && <p role="status">{locationStatus}</p>}
                </div>
                <label>
                  Tên của bạn <span className="optional">· tùy chọn</span>
                  <input
                    name="finderName"
                    autoComplete="name"
                    maxLength={80}
                    placeholder="Bạn muốn chủ đồ gọi mình là gì?"
                  />
                </label>
                <label>
                  Cách liên hệ với bạn <span className="optional">· tùy chọn</span>
                  <input
                    name="contact"
                    maxLength={120}
                    placeholder="Số điện thoại hoặc cách liên hệ khác"
                  />
                </label>
                <p className="privacy-note">
                  <ShieldCheck size={18} />
                  <span>
                    Lời nhắn và thông tin bạn gửi chỉ hiển thị cho chủ đồ. Đừng cung cấp mật khẩu
                    hay thông tin ngân hàng.
                  </span>
                </p>
                {formError && (
                  <p className="form-error" role="alert">
                    {formError}
                  </p>
                )}
                <Button type="submit" disabled={busy}>
                  {busy ? 'Đang gửi…' : 'Gửi tin cho chủ đồ'}
                  <Send size={17} />
                </Button>
              </form>
            </div>
          </>
        )}
        <p className="finder-footer">
          Một chiếc nhãn nhỏ. Một kết nối tử tế. <Heart size={13} />
        </p>
      </main>
    </div>
  );
}
